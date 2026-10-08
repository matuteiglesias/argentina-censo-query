import { z } from "zod";
import {
  ClarificationSchema,
  SemanticIntentSchema,
  UnsupportedInterpretationSchema,
} from "../../core/index.js";

export const ProviderInterpretationEnvelopeSchema = z
  .object({
    interpretation: z.discriminatedUnion("status", [
      z
        .object({
          status: z.literal("candidate"),
          intent: SemanticIntentSchema,
        })
        .strict(),
      ClarificationSchema,
      UnsupportedInterpretationSchema,
    ]),
  })
  .strict();

export type ProviderInterpretationEnvelope = z.infer<
  typeof ProviderInterpretationEnvelopeSchema
>;

export const ProviderInterpretationJsonSchema = z.toJSONSchema(
  ProviderInterpretationEnvelopeSchema,
);
