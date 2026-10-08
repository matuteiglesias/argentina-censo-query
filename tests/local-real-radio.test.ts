import { describe, expect, it } from "vitest";
import { CPV2022_VP_CATALOG_V0, type CensusQuery } from "../src/core/index.js";
import { executeLocalVpQuery, verifyLocalVpSlice } from "../src/local/index.js";

const REAL_SLICE = process.env.CENSO_VP_RADIO_061471101_SLICE;
const describeReal = REAL_SLICE ? describe : describe.skip;

function countQuery(entity: "VIVIENDA" | "HOGAR" | "PERSONA"): CensusQuery {
  return {
    contract: "argentina.census-query/v1",
    universe: { database: "VP", entity },
    measure: { type: "count", entity },
    filters: [],
    breakdowns: [],
    geography_selection: { type: "all" },
  };
}

describeReal("local qualification — permanent RADIO 061471101", () => {
  it("verifies the real extractor slice custody chain", async () => {
    const verified = await verifyLocalVpSlice(REAL_SLICE!);
    expect(verified.manifest_semantic_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it.each([
    ["VIVIENDA", 73],
    ["HOGAR", 56],
    ["PERSONA", 137],
  ] as const)("reproduces the qualified %s row count", async (entity, expected) => {
    const result = await executeLocalVpQuery(
      countQuery(entity),
      REAL_SLICE!,
      CPV2022_VP_CATALOG_V0,
    );
    expect(result.rows).toHaveLength(1);
    expect(Number(result.rows[0]?.value)).toBe(expected);
  });
});
