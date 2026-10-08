import { GoogleGenAI } from "@google/genai";
import {
  CPV2022_VP_CATALOG_V0,
  sha256Canonical,
} from "../../core/index.js";
import { ProviderInterpretationJsonSchema } from "./contract.js";
import { semanticLexiconPrompt } from "./lexicon.js";
import { normalizeProviderEnvelope } from "./normalize.js";
import {
  InterpreterError,
  type InterpreterContext,
  type InterpreterRun,
  type SemanticInterpreter,
} from "./types.js";

const MAX_QUESTION_CHARS = 1_000;
const MAX_PROMPT_CHARS = 32_000;
const MAX_OUTPUT_TOKENS = 700;
const DEFAULT_TIMEOUT_MS = 15_000;
const PROMPT_VERSION = "c3-semantic-interpreter/v1";
const ADAPTER_VERSION = "google-genai/v1";

type GoogleResponse = {
  text?: string;
  responseId?: string;
  modelVersion?: string;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
};

type GoogleClient = {
  models: {
    generateContent(parameters: {
      model: string;
      contents: string;
      config: Record<string, unknown>;
    }): Promise<GoogleResponse>;
  };
};

export type GoogleGenAIInterpreterConfig = {
  apiKey: string;
  model: string;
  timeoutMs?: number;
};

function promptFor(question: string, context: InterpreterContext): string {
  const prompt = [
    "Interpretá una sola pregunta del Censo 2022 VP según la gramática provista.",
    "Respondé únicamente un objeto JSON con la clave raíz interpretation.",
    "No inventes conceptos. Usá solamente concepts, aliases y opciones presentes en el lexicón.",
    "No devuelvas identificadores censales, códigos, SQL, Redatam, filtros ejecutables ni texto adicional.",
    "Si hay ambigüedad material, devolvé needs_clarification. Si está fuera de alcance, devolvé unsupported.",
    `LEXICON=${semanticLexiconPrompt(context.lexicon)}`,
    `QUESTION=${question}`,
  ].join("\n");
  if (prompt.length > MAX_PROMPT_CHARS) {
    throw new InterpreterError("configuration", "semantic interpreter prompt exceeds its input limit");
  }
  return prompt;
}

function providerError(error: unknown, timeoutMs: number): InterpreterError {
  const message = String(error);
  if (/abort|timeout|timed out/i.test(message)) {
    return new InterpreterError("provider_timeout", `Google GenAI request exceeded ${timeoutMs}ms`);
  }
  return new InterpreterError("provider_transport", "Google GenAI request failed");
}

export class GoogleGenAIInterpreter implements SemanticInterpreter {
  private readonly client: GoogleClient;
  private readonly timeoutMs: number;

  constructor(
    private readonly config: GoogleGenAIInterpreterConfig,
    client?: GoogleClient,
  ) {
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.client = client ?? (new GoogleGenAI({ apiKey: config.apiKey }) as unknown as GoogleClient);
  }

  async interpret(question: string, context: InterpreterContext): Promise<InterpreterRun> {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || trimmedQuestion.length > MAX_QUESTION_CHARS) {
      throw new InterpreterError("configuration", "question is empty or exceeds its input limit");
    }

    const started = Date.now();
    const abortController = new AbortController();
    const timer = setTimeout(() => abortController.abort(), this.timeoutMs);
    let response: GoogleResponse;
    try {
      response = await this.client.models.generateContent({
        model: this.config.model,
        contents: promptFor(trimmedQuestion, context),
        config: {
          abortSignal: abortController.signal,
          candidateCount: 1,
          temperature: 0,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          responseMimeType: "application/json",
          responseJsonSchema: ProviderInterpretationJsonSchema,
          httpOptions: {
            timeout: this.timeoutMs,
            retryOptions: { attempts: 2, initialDelay: 0.1, maxDelay: 0.5, jitter: 0 },
          },
        },
      });
    } catch (error) {
      throw providerError(error, this.timeoutMs);
    } finally {
      clearTimeout(timer);
    }

    if (!response.text) {
      throw new InterpreterError("provider_refusal", "Google GenAI returned no structured text");
    }

    let raw: unknown;
    try {
      raw = JSON.parse(response.text);
    } catch {
      throw new InterpreterError("malformed_output", "Google GenAI returned invalid JSON");
    }

    const result = normalizeProviderEnvelope(
      raw,
      trimmedQuestion,
      context.catalog,
      context.lexicon,
    );
    const provenance = {
      provider: "google-genai" as const,
      requestedModel: this.config.model,
      promptVersion: PROMPT_VERSION,
      adapterVersion: ADAPTER_VERSION,
      schemaDigest: sha256Canonical(ProviderInterpretationJsonSchema),
      latencyMs: Date.now() - started,
      ...(response.modelVersion ? { servedModel: response.modelVersion } : {}),
      ...(response.responseId ? { requestId: response.responseId } : {}),
      ...(response.usageMetadata?.promptTokenCount !== undefined
        ? { inputTokens: response.usageMetadata.promptTokenCount }
        : {}),
      ...(response.usageMetadata?.candidatesTokenCount !== undefined
        ? { outputTokens: response.usageMetadata.candidatesTokenCount }
        : {}),
    };
    return {
      result,
      provenance,
    };
  }
}

export const GOOGLE_GENAI_DEFAULT_MODEL = "gemini-2.5-flash-lite";

export function googleGenAIConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): GoogleGenAIInterpreterConfig | undefined {
  if (env.C3_INTERPRETER_PROVIDER !== "google") return undefined;
  const apiKey = env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new InterpreterError(
      "configuration",
      "C3_INTERPRETER_PROVIDER=google requires GEMINI_API_KEY",
    );
  }
  return {
    apiKey,
    model: env.GEMINI_MODEL?.trim() || GOOGLE_GENAI_DEFAULT_MODEL,
    timeoutMs: Number(env.C3_INTERPRETER_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS,
  };
}
