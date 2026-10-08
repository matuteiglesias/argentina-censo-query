import { z } from "zod";
import { ConceptIdSchema } from "./common.js";
import { SemanticIntentSchema } from "./semantic-intent.js";

export const CandidateInterpretationSchema = z
  .object({
    status: z.literal("candidate"),
    intent: SemanticIntentSchema,
  })
  .strict();

export const ClarificationOptionSchema = z
  .object({
    id: ConceptIdSchema,
    label: z.string().trim().min(1),
    description: z.string().trim().min(1).optional(),
  })
  .strict();

export const ClarificationSchema = z
  .object({
    status: z.literal("needs_clarification"),
    original_question: z.string().trim().min(1),
    reason_code: z.enum([
      "ambiguous_concept",
      "ambiguous_universe",
      "ambiguous_measure",
      "ambiguous_category",
    ]),
    prompt: z.string().trim().min(1),
    options: z.array(ClarificationOptionSchema).min(2).max(5),
  })
  .strict();

export const UnsupportedInterpretationSchema = z
  .object({
    status: z.literal("unsupported"),
    original_question: z.string().trim().min(1),
    reason_code: z.enum([
      "outside_grammar",
      "unsupported_universe",
      "requires_execution",
      "requires_results_analysis",
      "unknown_concept",
    ]),
    message: z.string().trim().min(1),
  })
  .strict();

export const InterpretationResultSchema = z.discriminatedUnion("status", [
  CandidateInterpretationSchema,
  ClarificationSchema,
  UnsupportedInterpretationSchema,
]);

export type InterpretationResult = z.infer<typeof InterpretationResultSchema>;
