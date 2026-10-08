import { z } from "zod";

export const CanonicalResultRowSchema = z
  .object({
    breakdown: z.string().nullable(),
    value: z.number().finite(),
  })
  .strict();

export const CanonicalResultSchema = z
  .object({
    contract: z.literal("argentina.census-canonical-result/v1"),
    query_id: z.string().regex(/^cq-[0-9a-f]{20}$/),
    measure: z.enum(["count", "average", "share"]),
    rows: z.array(CanonicalResultRowSchema),
  })
  .strict()
  .superRefine((result, ctx) => {
    for (const [index, row] of result.rows.entries()) {
      if (result.measure === "count" && (!Number.isInteger(row.value) || row.value < 0)) {
        ctx.addIssue({
          code: "custom",
          path: ["rows", index, "value"],
          message: "count results must be non-negative integers",
        });
      }
      if (result.measure === "share" && (row.value < 0 || row.value > 1)) {
        ctx.addIssue({
          code: "custom",
          path: ["rows", index, "value"],
          message: "share results must be in [0, 1]",
        });
      }
    }
  });

export type CanonicalResultRow = z.infer<typeof CanonicalResultRowSchema>;
export type CanonicalResult = z.infer<typeof CanonicalResultSchema>;
