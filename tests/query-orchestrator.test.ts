import { describe, expect, it } from "vitest";
import {
  CPV2022_VP_CATALOG_V0,
  GOLDEN_EDGE_CASES,
  GOLDEN_QUESTIONS,
  qualificationForQuery,
  stableCanonicalId,
} from "../src/core/index.js";
import { GoldenInterpreter } from "../src/server/interpreter/golden.js";
import { InterpreterError, type SemanticInterpreter } from "../src/server/interpreter/types.js";
import { submitQuestion } from "../src/server/query-orchestrator.js";

const previewEnv = { NODE_ENV: "production", CENSO_EXECUTION_MODE: "local_radio", CENSO_LOCAL_SLICE_ROOT: "/tmp/fixture" };

describe("C4 deterministic product orchestration", () => {
  it("carries all 20 golden questions through one canonical compilation path", async () => {
    for (const item of GOLDEN_QUESTIONS) {
      const result = await submitQuestion(
        item.question,
        new GoldenInterpreter(),
        CPV2022_VP_CATALOG_V0,
        previewEnv,
      );
      expect(result.status, item.question).toBe("ready");
      if (result.status !== "ready") continue;
      expect(result.query).toEqual(item.expected);
      expect(result.queryId).toBe(stableCanonicalId("cq", item.expected));
      expect(result.bundle.query).toEqual(item.expected);
      expect(result.bundle.targets.sql.code).toContain("SELECT");
      expect(result.bundle.targets.redatam_process.code).toContain("RUNDEF");
      expect(result.bundle.targets.indec_web.steps.length).toBeGreaterThan(0);
      expect(result.qualifications).toEqual(qualificationForQuery(item.expected));
      expect(result.execution.available).toBe(false);
      expect(result.description.universe).toContain("VP");
    }
  });

  it("returns clarification/unsupported without query, bundle or execution", async () => {
    for (const item of GOLDEN_EDGE_CASES) {
      const result = await submitQuestion(
        item.question,
        new GoldenInterpreter(),
        CPV2022_VP_CATALOG_V0,
        previewEnv,
      );
      expect(result.status).toBe(item.expected.status);
      expect(result).not.toHaveProperty("query");
      expect(result).not.toHaveProperty("bundle");
      expect(result).not.toHaveProperty("queryId");
    }
  });

  it("never compiles a candidate that fails catalog resolution/B3", async () => {
    const valid = GOLDEN_QUESTIONS[0]!;
    const invalid = structuredClone(valid.intent);
    invalid.measure.entity_concept = "made-up-census-entity";
    const fake: SemanticInterpreter = {
      async interpret() {
        return {
          result: { status: "candidate" as const, intent: invalid },
          provenance: {
            provider: "golden" as const,
            promptVersion: "test",
            adapterVersion: "test",
            schemaDigest: "test",
            latencyMs: 0,
          },
        };
      },
    };
    await expect(submitQuestion(valid.question, fake)).rejects.toMatchObject({
      kind: "semantic_validation",
    } satisfies Partial<InterpreterError>);
  });
});
