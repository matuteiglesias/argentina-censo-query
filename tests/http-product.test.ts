import { describe, expect, it } from "vitest";
import { GOLDEN_EDGE_CASES, GOLDEN_QUESTIONS } from "../src/core/index.js";
import { POST as queryPOST } from "../app/api/query/route.js";
import { POST as runPOST } from "../app/api/run/route.js";

function request(path: string, value: unknown) {
  return new Request("http://localhost:3000" + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", host: "localhost:3000" },
    body: JSON.stringify(value),
  });
}

describe("C7 HTTP contract smoke", () => {
  it("returns the same compiled query and provenance through the public question route", async () => {
    const res = await queryPOST(request("/api/query", { question: GOLDEN_QUESTIONS[0]!.question }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ready");
    expect(body.query).toEqual(GOLDEN_QUESTIONS[0]!.expected);
    expect(body.bundle.query).toEqual(body.query);
    expect(body.bundle.targets.sql.code).toContain("SELECT");
    expect(body.qualifications).toHaveLength(3);
    expect(body.queryId).toMatch(/^cq-[0-9a-f]{20}$/);
  });

  it("never attaches executable artifacts to clarification/unsupported response", async () => {
    for (const item of GOLDEN_EDGE_CASES) {
      const res = await queryPOST(request("/api/query", { question: item.question }));
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.status).toBe(item.expected.status);
      expect(body).not.toHaveProperty("query");
      expect(body).not.toHaveProperty("bundle");
    }
  });

  it("rejects invalid question envelopes and lengths without invoking interpreter", async () => {
    for (const value of [
      { question: "" },
      { question: "a".repeat(1001) },
      { question: GOLDEN_QUESTIONS[0]!.question, sql: "SELECT *" },
      { question: 12 },
      {},
    ]) {
      const response = await queryPOST(request("/api/query", value));
      expect(response.status).toBe(400);
    }
  });

  it("never exposes the local run endpoint in test/preview mode", async () => {
    const res = await runPOST(request("/api/run", {
      query: GOLDEN_QUESTIONS[0]!.expected,
    }));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "local_execution_disabled" });
  });
});
