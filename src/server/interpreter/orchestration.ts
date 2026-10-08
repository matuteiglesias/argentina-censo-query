import {
  CPV2022_VP_CATALOG_V0,
  resolveSemanticIntent,
  type CensusCatalog,
  type CensusQuery,
} from "../../core/index.js";
import { buildSemanticLexicon } from "./lexicon.js";
import { GoldenInterpreter } from "./golden.js";
import { GoogleGenAIInterpreter, googleGenAIConfigFromEnv } from "./google-genai.js";
import { InterpreterError, type ResolvedInterpreterRun, type SemanticInterpreter } from "./types.js";

export function createConfiguredSemanticInterpreter(
  env: NodeJS.ProcessEnv = process.env,
): SemanticInterpreter {
  const provider = env.C3_INTERPRETER_PROVIDER?.trim() || "golden";
  if (provider === "golden") return new GoldenInterpreter();
  if (provider === "google") {
    const config = googleGenAIConfigFromEnv(env);
    if (!config) throw new InterpreterError("configuration", "Google GenAI configuration is missing");
    return new GoogleGenAIInterpreter(config);
  }
  throw new InterpreterError("configuration", `unsupported C3 interpreter provider: ${provider}`);
}

export async function interpretAndResolve(
  question: string,
  interpreter: SemanticInterpreter = createConfiguredSemanticInterpreter(),
  catalog: CensusCatalog = CPV2022_VP_CATALOG_V0,
): Promise<ResolvedInterpreterRun> {
  const context = { catalog, lexicon: buildSemanticLexicon(catalog) };
  const run = await interpreter.interpret(question, context);
  if (run.result.status !== "candidate") return run;

  const resolved = resolveSemanticIntent(run.result.intent, catalog);
  if (resolved.status !== "resolved") {
    throw new InterpreterError(
      "semantic_validation",
      "candidate did not resolve to a valid CensusQuery",
    );
  }
  return { ...run, query: resolved.query };
}

export type InterpretationResponse = {
  result: ResolvedInterpreterRun["result"];
  query?: CensusQuery;
  provenance: ResolvedInterpreterRun["provenance"];
};
