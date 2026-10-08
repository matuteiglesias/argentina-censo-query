import { z } from "zod";
import { sha256Canonical } from "./canonical-json.js";
import { SemanticIntentSchema } from "./contracts/semantic-intent.js";
import { ClarificationSchema, InterpretationResultSchema } from "./contracts/interpretation.js";
import { CensusQuerySchema } from "./contracts/census-query.js";
import { CensusCatalogSchema } from "./contracts/catalog.js";
import {
  CompilationContextSchema,
  CompilationBundleSchema,
  CompilationTargetSchema,
} from "./contracts/compilation.js";
import { QueryValidationResultSchema } from "./contracts/validation.js";

export const CONTRACT_SCHEMA_REGISTRY = {
  CensusCatalog: CensusCatalogSchema,
  CensusQuery: CensusQuerySchema,
  Clarification: ClarificationSchema,
  CompilationBundle: CompilationBundleSchema,
  CompilationContext: CompilationContextSchema,
  CompilationTarget: CompilationTargetSchema,
  InterpretationResult: InterpretationResultSchema,
  QueryValidationResult: QueryValidationResultSchema,
  SemanticIntent: SemanticIntentSchema,
} as const;

export function contractJsonSchemas(): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(CONTRACT_SCHEMA_REGISTRY).map(([name, schema]) => [
      name,
      z.toJSONSchema(schema),
    ]),
  );
}

export function contractSchemaDigests(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(contractJsonSchemas()).map(([name, schema]) => [
      name,
      sha256Canonical(schema),
    ]),
  );
}
