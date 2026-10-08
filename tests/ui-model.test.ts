import { describe, expect, it } from "vitest";
import { buildDemoCases } from "../src/server/demo-model.js";

describe("C1 server demo model", () => {
  it("builds a UI-ready model from the real golden corpus without an LLM", () => {
    const cases = buildDemoCases();
    const supported = cases.filter((item) => item.kind === "supported");
    const edges = cases.filter((item) => item.kind === "edge");

    expect(supported).toHaveLength(20);
    expect(edges.length).toBeGreaterThanOrEqual(3);

    const first = supported[0];
    expect(first?.kind).toBe("supported");
    if (first?.kind !== "supported") return;

    expect(first.bundle.targets.sql.code).toContain("SELECT");
    expect(first.bundle.targets.redatam_process.code).toContain("RUNDEF");
    expect(first.bundle.targets.indec_web.steps.length).toBeGreaterThan(2);
    expect(first.qualifications).toHaveLength(3);
    expect(first.queryId).toMatch(/^cq-[0-9a-f]{20}$/);
  });
});
