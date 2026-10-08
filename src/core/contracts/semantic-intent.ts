import { z } from "zod";
import { ConceptIdSchema, ScalarValueSchema } from "./common.js";

export const IntentAtomSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("literal"),
      value: ScalarValueSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("concept"),
      concept: ConceptIdSchema,
    })
    .strict(),
]);

const IntentScalarPredicateSchema = z
  .object({
    variable_concept: ConceptIdSchema,
    operator: z.enum(["eq", "neq", "gt", "gte", "lt", "lte"]),
    value: IntentAtomSchema,
  })
  .strict();

const IntentBetweenPredicateSchema = z
  .object({
    variable_concept: ConceptIdSchema,
    operator: z.literal("between"),
    value: z.tuple([IntentAtomSchema, IntentAtomSchema]),
  })
  .strict();

const IntentInPredicateSchema = z
  .object({
    variable_concept: ConceptIdSchema,
    operator: z.literal("in"),
    value: z.array(IntentAtomSchema).min(1),
  })
  .strict();

export const IntentPredicateSchema = z.discriminatedUnion("operator", [
  IntentScalarPredicateSchema,
  IntentBetweenPredicateSchema,
  IntentInPredicateSchema,
]);
export type IntentPredicate = z.infer<typeof IntentPredicateSchema>;

export const IntentMeasureSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("count"),
      entity_concept: ConceptIdSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("average"),
      entity_concept: ConceptIdSchema,
      variable_concept: ConceptIdSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("share"),
      entity_concept: ConceptIdSchema,
      condition: IntentPredicateSchema,
    })
    .strict(),
]);

export const IntentBreakdownSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("geography"),
      concept: ConceptIdSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("variable"),
      concept: ConceptIdSchema,
    })
    .strict(),
]);

export const SemanticIntentSchema = z
  .object({
    contract: z.literal("argentina.census-semantic-intent/v1"),
    original_question: z.string().trim().min(1),
    universe_concept: ConceptIdSchema.optional(),
    measure: IntentMeasureSchema,
    filters: z.array(IntentPredicateSchema).max(8).default([]),
    breakdown: IntentBreakdownSchema.optional(),
  })
  .strict();

export type SemanticIntent = z.infer<typeof SemanticIntentSchema>;
