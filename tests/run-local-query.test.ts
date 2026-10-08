import { describe, expect, it, vi } from "vitest";
import { GOLDEN_QUESTIONS, stableCanonicalId } from "../src/core/index.js";
import { runLocalQuery } from "../src/server/run-local-query.js";

vi.mock("../src/local/duckdb-executor.js", () => ({
  executeLocalVpQuery: vi.fn(async () => ({
    query_id: "mock",
    source_radio_code: "061471101",
    source_manifest_semantic_hash: "a".repeat(64),
    execution_id: "exec-mock",
    rows: [{ breakdown: "06", value: "2" }],
  })),
}));

describe("C5 local response normalization", () => {
  it("returns canonical aggregate values and verified-slice scope without SQL", async () => {
    const query = GOLDEN_QUESTIONS.find((item) =>
      item.question.includes("mujeres de 20 a 29"),
    )!.expected;
    const response = await runLocalQuery(query, "/fixture");
    expect(response.result.query_id).toBe(stableCanonicalId("cq", query));
    expect(response.result.rows).toEqual([{ breakdown: "06", value: 2 }]);
    expect(response.source.code).toBe("061471101");
    expect(response.source.manifestSemanticHash).toBe("a".repeat(64));
    expect(response).not.toHaveProperty("sql");
  });
});
