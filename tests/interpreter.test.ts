import { describe, expect, it } from "vitest";
import {
  CPV2022_VP_CATALOG_V0,
  GOLDEN_EDGE_CASES,
  GOLDEN_QUESTIONS,
  stableCanonicalId,
} from "../src/core/index.js";
import {
  buildSemanticLexicon,
  GoldenInterpreter,
  GoogleGenAIInterpreter,
  InterpreterError,
  ProviderInterpretationEnvelopeSchema,
  createConfiguredSemanticInterpreter,
  interpretAndResolve,
  normalizeProviderEnvelope,
  semanticLexiconPrompt,
} from "../src/server/interpreter/index.js";

describe("C3 semantic interpreter contract", () => {
  const first = GOLDEN_QUESTIONS[0]!;

  it("generates a stable lexicon without Census identifiers or category codes", () => {
    const left = buildSemanticLexicon(CPV2022_VP_CATALOG_V0);
    const right = buildSemanticLexicon(structuredClone(CPV2022_VP_CATALOG_V0));
    const promptLexicon = semanticLexiconPrompt(left);

    expect(left.digest).toBe(right.digest);
    expect(promptLexicon).not.toMatch(/(?:VIVIENDA|HOGAR|PERSONA|PROV|DPTO)\.[A-Z]/);
    expect(promptLexicon).not.toMatch(/"code"/);
    expect(promptLexicon).not.toContain('"value":1');
    expect(promptLexicon).toContain("sex-at-birth");
    expect(promptLexicon).toContain("Sexo registrado al nacer");
  });

  it("keeps the deterministic GoldenInterpreter as the default", async () => {
    const interpreter = createConfiguredSemanticInterpreter({
      NODE_ENV: "test",
      GEMINI_API_KEY: "present-but-not-opt-in",
    });
    expect(interpreter).toBeInstanceOf(GoldenInterpreter);

    const run = await interpretAndResolve(first.question, interpreter);
    expect(run.query && stableCanonicalId("cq", run.query)).toBe(
      stableCanonicalId("cq", first.expected),
    );
  });

  it("preserves all golden candidates and edge outcomes", async () => {
    const interpreter = new GoldenInterpreter();
    for (const item of GOLDEN_QUESTIONS) {
      const run = await interpretAndResolve(item.question, interpreter);
      expect(run.query && stableCanonicalId("cq", run.query)).toBe(
        stableCanonicalId("cq", item.expected),
      );
    }
    for (const item of GOLDEN_EDGE_CASES) {
      const run = await interpretAndResolve(item.question, interpreter);
      expect(run.result.status).toBe(item.expected.status);
    }
  });

  it("normalizes strictly and rejects model identifiers, fabricated concepts, and extra keys", () => {
    const lexicon = buildSemanticLexicon(CPV2022_VP_CATALOG_V0);
    const item = first;
    const valid = { interpretation: { status: "candidate", intent: item.intent } };

    expect(normalizeProviderEnvelope(
      valid,
      item.question,
      CPV2022_VP_CATALOG_V0,
      lexicon,
    ).status).toBe("candidate");

    expect(() => normalizeProviderEnvelope(
      { interpretation: { ...valid.interpretation, extra: true } },
      item.question,
      CPV2022_VP_CATALOG_V0,
      lexicon,
    )).toThrowError(InterpreterError);

    const identifierIntent = structuredClone(item.intent);
    identifierIntent.measure.entity_concept = "persona.p02";
    expect(() => normalizeProviderEnvelope(
      { interpretation: { status: "candidate", intent: identifierIntent } },
      item.question,
      CPV2022_VP_CATALOG_V0,
      lexicon,
    )).toThrowError(InterpreterError);

    const fabricatedIntent = structuredClone(item.intent);
    fabricatedIntent.measure.entity_concept = "invented-entity";
    expect(() => normalizeProviderEnvelope(
      { interpretation: { status: "candidate", intent: fabricatedIntent } },
      item.question,
      CPV2022_VP_CATALOG_V0,
      lexicon,
    )).toThrowError(InterpreterError);
  });

  it("uses strict structured JSON with bounded provider settings", async () => {
    const item = first;
    let request: { contents: string; config: Record<string, unknown> } | undefined;
    const fakeClient = {
      models: {
        generateContent: async (parameters: {
          model: string;
          contents: string;
          config: Record<string, unknown>;
        }) => {
          request = parameters;
          return {
            text: JSON.stringify({
              interpretation: { status: "candidate", intent: item.intent },
            }),
            responseId: "request-test",
            modelVersion: "served-test",
            usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 34 },
          };
        },
      },
    };
    const interpreter = new GoogleGenAIInterpreter(
      { apiKey: "test-key", model: "test-model", timeoutMs: 1234 },
      fakeClient,
    );

    const run = await interpretAndResolve(item.question, interpreter);
    expect(run.result.status).toBe("candidate");
    expect(run.provenance.inputTokens).toBe(12);
    expect(request?.config).toMatchObject({
      candidateCount: 1,
      temperature: 0,
      maxOutputTokens: 700,
      responseMimeType: "application/json",
    });
    expect(request?.config.responseJsonSchema).toBeDefined();
    expect(request?.contents).not.toContain("PERSONA.P02");
    expect(request?.contents).not.toContain('"value":1');
  });

  it("classifies an aborted provider request as a timeout", async () => {
    const fakeClient = {
      models: {
        generateContent: async (parameters: {
          config: Record<string, unknown>;
        }) => new Promise<never>((_resolve, reject) => {
          const signal = parameters.config.abortSignal as AbortSignal;
          signal.addEventListener("abort", () => reject(new Error("aborted")), {
            once: true,
          });
        }),
      },
    };
    const interpreter = new GoogleGenAIInterpreter(
      { apiKey: "test-key", model: "test-model", timeoutMs: 5 },
      fakeClient,
    );

    await expect(
      interpreter.interpret(first.question, {
        catalog: CPV2022_VP_CATALOG_V0,
        lexicon: buildSemanticLexicon(CPV2022_VP_CATALOG_V0),
      }),
    ).rejects.toMatchObject({ kind: "provider_timeout" });
  });

  it("separates missing explicit provider configuration from clarification", () => {
    expect(() => createConfiguredSemanticInterpreter({
      NODE_ENV: "test",
      C3_INTERPRETER_PROVIDER: "google",
    })).toThrow(/GEMINI_API_KEY/);
    expect(() => ProviderInterpretationEnvelopeSchema.parse({
      interpretation: {
        status: "unsupported",
        original_question: "x",
        reason_code: "unknown_concept",
        message: "x",
      },
    })).not.toThrow();
  });
});
