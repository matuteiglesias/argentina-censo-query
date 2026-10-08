import { z } from "zod";

export const QueryValidationIssueCodeSchema = z.enum([
  "structural_invalid",
  "catalog_invalid",
  "universe_database_mismatch",
  "unknown_universe_entity",
  "measure_entity_mismatch",
  "count_not_supported",
  "unknown_variable",
  "variable_not_supported",
  "invalid_relationship_path",
  "operator_not_allowed",
  "invalid_value_type",
  "value_out_of_range",
  "unknown_category_code",
  "average_wrong_grain",
  "average_not_supported",
  "breakdown_not_supported",
  "unknown_geography_level",
  "geography_member_catalog_unavailable",
  "unknown_geography_code",
]);

export const QueryValidationIssueSchema = z
  .object({
    code: QueryValidationIssueCodeSchema,
    path: z.string(),
    message: z.string().min(1),
  })
  .strict();

export const QueryValidationResultSchema = z.discriminatedUnion("valid", [
  z.object({ valid: z.literal(true) }).strict(),
  z
    .object({
      valid: z.literal(false),
      issues: z.array(QueryValidationIssueSchema).min(1),
    })
    .strict(),
]);

export type QueryValidationIssue = z.infer<typeof QueryValidationIssueSchema>;
export type QueryValidationResult = z.infer<typeof QueryValidationResultSchema>;
