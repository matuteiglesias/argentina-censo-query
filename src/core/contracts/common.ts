import { z } from "zod";

export const DatabaseSchema = z.literal("VP");
export type Database = z.infer<typeof DatabaseSchema>;

export const EntitySchema = z.enum(["VIVIENDA", "HOGAR", "PERSONA"]);
export type Entity = z.infer<typeof EntitySchema>;

export const GeographyLevelSchema = z.enum(["PROV", "DPTO"]);
export type GeographyLevel = z.infer<typeof GeographyLevelSchema>;

export const ScalarValueSchema = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
]);
export type ScalarValue = z.infer<typeof ScalarValueSchema>;

export const ConceptIdSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9][a-z0-9._-]*$/, "concept IDs must be canonical lowercase slugs");
export type ConceptId = z.infer<typeof ConceptIdSchema>;

export const VariableRefSchema = z
  .string()
  .regex(
    /^(VIVIENDA|HOGAR|PERSONA)\.[A-Z][A-Z0-9_]*$/,
    "variable refs must use ENTITY.VARIABLE",
  );
export type VariableRef = z.infer<typeof VariableRefSchema>;

export const OperatorSchema = z.enum([
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "between",
  "in",
]);
export type Operator = z.infer<typeof OperatorSchema>;

export const ScalarPredicateSchema = z
  .object({
    variable: VariableRefSchema,
    operator: z.enum(["eq", "neq", "gt", "gte", "lt", "lte"]),
    value: ScalarValueSchema,
  })
  .strict();

export const BetweenPredicateSchema = z
  .object({
    variable: VariableRefSchema,
    operator: z.literal("between"),
    value: z.tuple([ScalarValueSchema, ScalarValueSchema]),
  })
  .strict();

export const InPredicateSchema = z
  .object({
    variable: VariableRefSchema,
    operator: z.literal("in"),
    value: z.array(ScalarValueSchema).min(1),
  })
  .strict();

export const PredicateSchema = z.discriminatedUnion("operator", [
  ScalarPredicateSchema,
  BetweenPredicateSchema,
  InPredicateSchema,
]);
export type Predicate = z.infer<typeof PredicateSchema>;
