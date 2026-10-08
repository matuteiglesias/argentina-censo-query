import { describe, expect, it } from "vitest";
import {
  canonicalizeDirectResult,
  canonicalizeShareFromCounts,
  compareCanonicalResults,
} from "../src/core/index.js";
import { GOLDEN_QUESTIONS } from "./golden-questions.js";

function golden(fragment: string) {
  const item = GOLDEN_QUESTIONS.find((candidate) =>
    candidate.question.includes(fragment),
  );
  if (!item) throw new Error("missing golden: " + fragment);
  return item;
}

describe("B7 canonical equivalence", () => {
  it("canonicalizes direct results independently of row order", () => {
    const query = golden("varones mayores de 65").expected;
    const result = canonicalizeDirectResult(query, [
      { breakdown: "10", value: 2 },
      { breakdown: "06", value: 8 },
    ]);
    expect(result.rows).toEqual([
      { breakdown: "06", value: 8 },
      { breakdown: "10", value: 2 },
    ]);
  });

  it("defines SHARE as selected / total", () => {
    const query = golden("porcentaje de hogares alquila").expected;
    const redatam = canonicalizeShareFromCounts(
      query,
      [
        { breakdown: "06147", value: 56 },
        { breakdown: "10001", value: 40 },
      ],
      [
        { breakdown: "06147", value: 1 },
        { breakdown: "10001", value: 10 },
      ],
    );
    const sql = canonicalizeDirectResult(query, [
      { breakdown: "06147", value: 1 / 56 },
      { breakdown: "10001", value: 0.25 },
    ]);
    expect(compareCanonicalResults(sql, redatam)).toEqual({
      equivalent: true,
      tolerance: 1e-12,
      differences: [],
    });
  });

  it("treats missing selected rows as zero but rejects impossible ratios", () => {
    const query = golden("porcentaje de hogares alquila").expected;
    const result = canonicalizeShareFromCounts(
      query,
      [{ breakdown: "06147", value: 56 }],
      [],
    );
    expect(result.rows).toEqual([{ breakdown: "06147", value: 0 }]);

    expect(() =>
      canonicalizeShareFromCounts(
        query,
        [{ breakdown: "06147", value: 1 }],
        [{ breakdown: "06147", value: 2 }],
      ),
    ).toThrow(/exceeds total/);
  });

  it("reports numerical drift instead of hiding it", () => {
    const query = golden("edad promedio").expected;
    const left = canonicalizeDirectResult(query, [
      { breakdown: "06", value: 40 },
    ]);
    const right = canonicalizeDirectResult(query, [
      { breakdown: "06", value: 40.01 },
    ]);
    const comparison = compareCanonicalResults(left, right, 1e-12);
    expect(comparison.equivalent).toBe(false);
    expect(comparison.differences.join("\n")).toMatch(/value differs/);
  });
});
