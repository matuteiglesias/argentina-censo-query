import { describe, expect, it } from "vitest";
import {
  GOLDEN_EDGE_CASES,
  InterpretationResultSchema,
  findGoldenEdgeCase,
} from "../src/core/index.js";

describe("B8 semantic edge corpus", () => {
  it.each(GOLDEN_EDGE_CASES)("$question", ({ question, expected }) => {
    expect(() => InterpretationResultSchema.parse(expected)).not.toThrow();
    expect(findGoldenEdgeCase(question)?.expected).toEqual(expected);
  });

  it("specifies ambiguity separately from unsupported questions", () => {
    expect(
      GOLDEN_EDGE_CASES.some(
        (item) => item.expected.status === "needs_clarification",
      ),
    ).toBe(true);
    expect(
      GOLDEN_EDGE_CASES.some((item) => item.expected.status === "unsupported"),
    ).toBe(true);
  });
});
