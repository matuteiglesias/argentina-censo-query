import { describe, expect, it } from "vitest";
import {
  CPV2022_VP_CATALOG_V0,
  validateCensusQuery,
} from "../src/core/index.js";

const base = {
  contract: "argentina.census-query/v1",
  universe: { database: "VP", entity: "PERSONA" },
  measure: { type: "count", entity: "PERSONA" },
  filters: [],
  breakdowns: [],
  geography_selection: { type: "all" },
} as const;

function issueCodes(query: unknown): string[] {
  const result = validateCensusQuery(query, CPV2022_VP_CATALOG_V0);
  return result.valid ? [] : result.issues.map((item) => item.code);
}

describe("query validator", () => {
  it("accepts a PERSONA query filtered by an ancestor HOGAR variable", () => {
    expect(
      validateCensusQuery(
        {
          ...base,
          filters: [{ variable: "HOGAR.H22", operator: "eq", value: 2 }],
        },
        CPV2022_VP_CATALOG_V0,
      ),
    ).toEqual({ valid: true });
  });

  it("rejects descendant filters", () => {
    expect(
      issueCodes({
        ...base,
        universe: { database: "VP", entity: "HOGAR" },
        measure: { type: "count", entity: "HOGAR" },
        filters: [{ variable: "PERSONA.EDAD", operator: "gt", value: 65 }],
      }),
    ).toContain("invalid_relationship_path");
  });

  it("rejects plausible but unknown variables", () => {
    expect(
      issueCodes({
        ...base,
        filters: [{ variable: "PERSONA.FOO", operator: "eq", value: 1 }],
      }),
    ).toContain("unknown_variable");
  });

  it("rejects blocked variables", () => {
    expect(
      issueCodes({
        ...base,
        filters: [{ variable: "PERSONA.HNVUA", operator: "eq", value: 1 }],
      }),
    ).toContain("variable_not_supported");
  });

  it("rejects category codes not explicitly curated", () => {
    expect(
      issueCodes({
        ...base,
        filters: [{ variable: "PERSONA.P02", operator: "eq", value: 3 }],
      }),
    ).toContain("unknown_category_code");
  });

  it("rejects operators not allowed for a variable", () => {
    expect(
      issueCodes({
        ...base,
        filters: [{ variable: "PERSONA.P02", operator: "gt", value: 1 }],
      }),
    ).toContain("operator_not_allowed");
  });

  it("rejects values outside curated numeric ranges", () => {
    expect(
      issueCodes({
        ...base,
        filters: [{ variable: "PERSONA.EDAD", operator: "gt", value: 200 }],
      }),
    ).toContain("value_out_of_range");
  });

  it("rejects reversed numeric ranges", () => {
    expect(
      issueCodes({
        ...base,
        filters: [
          { variable: "PERSONA.EDAD", operator: "between", value: [29, 20] },
        ],
      }),
    ).toContain("invalid_range_order");
  });

  it("fails closed on experimental variables with unresolved special codes", () => {
    expect(
      issueCodes({
        ...base,
        filters: [{ variable: "PERSONA.AESC", operator: "gte", value: 12 }],
      }),
    ).toContain("variable_not_supported");
  });

  it("rejects averaging an ancestor variable at person grain", () => {
    expect(
      issueCodes({
        ...base,
        measure: {
          type: "average",
          entity: "PERSONA",
          variable: "HOGAR.TOTPOBH",
        },
      }),
    ).toContain("average_wrong_grain");
  });

  it("rejects averaging categorical variables", () => {
    expect(
      issueCodes({
        ...base,
        measure: {
          type: "average",
          entity: "PERSONA",
          variable: "PERSONA.P02",
        },
      }),
    ).toContain("average_not_supported");
  });

  it("rejects measure/universe grain disagreement", () => {
    expect(
      issueCodes({
        ...base,
        measure: { type: "count", entity: "HOGAR" },
      }),
    ).toContain("measure_entity_mismatch");
  });

  it("fails closed on explicit geography members until catalogued", () => {
    expect(
      issueCodes({
        ...base,
        geography_selection: {
          type: "include",
          level: "PROV",
          codes: ["06"],
        },
      }),
    ).toContain("geography_member_catalog_unavailable");
  });
});
