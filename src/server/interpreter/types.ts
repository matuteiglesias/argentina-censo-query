import type { CensusCatalog } from "../../core/index.js";
import type { InterpretationResult } from "../../core/index.js";

export type InterpreterContext = {
  catalog: CensusCatalog;
  lexicon: SemanticLexicon;
};

export type InterpreterProvenance = {
  provider: "golden" | "google-genai";
  requestedModel?: string;
  servedModel?: string;
  promptVersion: string;
  adapterVersion: string;
  schemaDigest: string;
  requestId?: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
};

export type InterpreterRun = {
  result: InterpretationResult;
  provenance: InterpreterProvenance;
};

export interface SemanticInterpreter {
  interpret(question: string, context: InterpreterContext): Promise<InterpreterRun>;
}

export type SemanticLexiconEntry = {
  concepts: string[];
  label: string;
  aliases: string[];
};

export type SemanticLexiconVariable = SemanticLexiconEntry & {
  value_type: "integer" | "number" | "categorical" | "string" | "boolean";
  allowed_operators: string[];
  categories: SemanticLexiconEntry[];
};

export type SemanticLexicon = {
  contract: "argentina.census-semantic-lexicon/v1";
  grammar: {
    measures: ["count", "average", "share"];
    operators: ["eq", "neq", "gt", "gte", "lt", "lte", "between", "in"];
    breakdowns: ["geography", "variable"];
  };
  universe: SemanticLexiconEntry;
  entities: SemanticLexiconEntry[];
  variables: SemanticLexiconVariable[];
  geographies: SemanticLexiconEntry[];
  clarification_option_ids: string[];
  digest: string;
};

export type ResolvedInterpreterRun = InterpreterRun & {
  query?: import("../../core/index.js").CensusQuery;
};

export type InterpreterFailureKind =
  | "configuration"
  | "provider_transport"
  | "provider_timeout"
  | "provider_refusal"
  | "malformed_output"
  | "semantic_validation";

export class InterpreterError extends Error {
  constructor(
    readonly kind: InterpreterFailureKind,
    message: string,
  ) {
    super(message);
    this.name = "InterpreterError";
  }
}
