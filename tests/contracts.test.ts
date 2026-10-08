import { describe, expect, it } from "vitest";
import {
  CensusCatalogSchema,
  CensusQuerySchema,
  CompilationBundleSchema,
  CompilationTargetSchema,
  CPV2022_VP_CATALOG_V0,
  InterpretationResultSchema,
  SemanticIntentSchema,
  canonicalJson,
  sha256Canonical,
  stableCanonicalId,
} from "../src/core/index.js";

describe("SemanticIntent", () => {
  it("accepts concepts and literals without Census identifiers", () => {
    const parsed = SemanticIntentSchema.parse({
      contract: "argentina.census-semantic-intent/v1",
      original_question: "¿Cuántas mujeres de 20 a 29 años hay por provincia?",
      universe_concept: "vp",
      measure: { type: "count", entity_concept: "person" },
      filters: [
        {
          variable_concept: "sex",
          operator: "eq",
          value: { kind: "concept", concept: "woman" },
        },
        {
          variable_concept: "age",
          operator: "between",
          value: [
            { kind: "literal", value: 20 },
            { kind: "literal", value: 29 },
          ],
        },
      ],
      breakdown: { type: "geography", concept: "province" },
    });

    expect(parsed.measure.type).toBe("count");
  });

  it("rejects Census identifiers as semantic concept IDs", () => {
    for (const rawConcept of ["PERSONA.P02", "persona.p02", "persona_p02"]) {
      expect(() =>
        SemanticIntentSchema.parse({
          contract: "argentina.census-semantic-intent/v1",
          original_question: "x",
          measure: { type: "count", entity_concept: rawConcept },
        }),
      ).toThrow();
    }
  });
});

describe("InterpretationResult", () => {
  it("treats clarification as a first-class outcome", () => {
    const parsed = InterpretationResultSchema.parse({
      status: "needs_clarification",
      original_question: "¿Cuántos universitarios hay?",
      reason_code: "ambiguous_concept",
      prompt: "¿Qué querés decir con universitarios?",
      options: [
        { id: "currently-attending-university", label: "Asisten actualmente" },
        { id: "highest-level-university", label: "Máximo nivel alcanzado" },
      ],
    });

    expect(parsed.status).toBe("needs_clarification");
  });
});

describe("CensusQuery", () => {
  const query = {
    contract: "argentina.census-query/v1",
    universe: { database: "VP", entity: "PERSONA" },
    measure: { type: "count", entity: "PERSONA" },
    filters: [
      { variable: "PERSONA.P02", operator: "eq", value: 2 },
      { variable: "PERSONA.EDAD", operator: "between", value: [20, 29] },
    ],
    breakdowns: [{ type: "geography", level: "PROV" }],
    geography_selection: { type: "all" },
  } as const;

  it("accepts a resolved women-age-province query", () => {
    expect(CensusQuerySchema.parse(query)).toEqual(query);
  });

  it("rejects more than one v1 breakdown", () => {
    expect(() =>
      CensusQuerySchema.parse({
        ...query,
        breakdowns: [
          { type: "geography", level: "PROV" },
          { type: "variable", variable: "PERSONA.P02" },
        ],
      }),
    ).toThrow();
  });

  it("rejects arbitrary variable expressions", () => {
    expect(() =>
      CensusQuerySchema.parse({
        ...query,
        filters: [{ variable: "DROP TABLE X", operator: "eq", value: 1 }],
      }),
    ).toThrow();
  });
});

describe("CensusCatalog", () => {
  it("parses the evidence-backed v0 catalog including visible anomalies", () => {
    const catalog = CensusCatalogSchema.parse(CPV2022_VP_CATALOG_V0);
    const hn = catalog.variables.find((item) => item.id === "PERSONA.HNVUA");
    expect(hn?.status).toBe("blocked");
    expect(hn?.anomaly).toMatch(/ambiguity/i);
  });
});

describe("CompilationTarget", () => {
  it("is an explicit three-target discriminated contract", () => {
    const sql = CompilationTargetSchema.parse({
      target: "sql",
      dialect: "duckdb-census-logical/v1",
      logical_schema: "argentina.censo2022-relational/v1",
      code: "SELECT 1;",
    });
    expect(sql.target).toBe("sql");

    expect(() =>
      CompilationTargetSchema.parse({
        target: "execution_result",
        rows: [],
      }),
    ).toThrow();
  });
});

describe("CompilationBundle", () => {
  const validBundle = {
    contract: "argentina.census-compilation/v1",
    original_question: "¿Cuántas personas hay?",
    query: {
      contract: "argentina.census-query/v1",
      universe: { database: "VP", entity: "PERSONA" },
      measure: { type: "count", entity: "PERSONA" },
      filters: [],
      breakdowns: [],
      geography_selection: { type: "all" },
    },
    context: {
      contract: "argentina.census-compilation-context/v1",
      catalog_id: "catalog-fixture",
      census_vintage: 2022,
      source_database: "VP",
      source_release_label: "fixture",
      logical_schema: "argentina.censo2022-relational/v1",
    },
    targets: {
      sql: {
        target: "sql",
        dialect: "duckdb-census-logical/v1",
        logical_schema: "argentina.censo2022-relational/v1",
        code: "SELECT COUNT(*) FROM censo.persona;",
      },
      redatam_process: {
        target: "redatam_process",
        dialect: "redatam-process/v1",
        code: "RUNDEF QUERY",
      },
      indec_web: {
        target: "indec_web_recipe",
        contract: "indec-redatam-web-recipe/v1",
        database: "Censo 2022",
        entity: "PERSONA",
        area: "Toda la base",
        area_breakdown: null,
        universe_filter: null,
        output: "Cantidad",
        steps: ["Seleccionar PERSONA"],
      },
    },
  };

  it("requires all three copy targets and contains no second semantic summary", () => {
    const bundle = CompilationBundleSchema.parse(validBundle);
    expect("result" in bundle).toBe(false);
    expect("interpretation_summary" in bundle).toBe(false);
  });

  it("rejects execution results or free semantic summaries", () => {
    expect(() =>
      CompilationBundleSchema.parse({
        ...validBundle,
        result: { rows: [] },
      }),
    ).toThrow();

    expect(() =>
      CompilationBundleSchema.parse({
        ...validBundle,
        interpretation_summary: "free text",
      }),
    ).toThrow();
  });
});

describe("canonical JSON", () => {
  it("is stable across object key order", () => {
    const left = { b: 2, a: { y: 2, x: 1 } };
    const right = { a: { x: 1, y: 2 }, b: 2 };
    expect(canonicalJson(left)).toBe(canonicalJson(right));
    expect(sha256Canonical(left)).toBe(sha256Canonical(right));
  });

  it("preserves array order", () => {
    expect(canonicalJson({ x: [2, 1] })).not.toBe(
      canonicalJson({ x: [1, 2] }),
    );
  });

  it("builds stable prefixed IDs from canonical content", () => {
    const left = stableCanonicalId("cq", { b: 2, a: 1 });
    const right = stableCanonicalId("cq", { a: 1, b: 2 });
    expect(left).toBe(right);
    expect(left).toMatch(/^cq-[0-9a-f]{20}$/);
  });

  it("rejects unsafe stable-ID prefixes and truncation", () => {
    expect(() => stableCanonicalId("Census Query", {})).toThrow();
    expect(() => stableCanonicalId("cq", {}, 8)).toThrow();
  });
});
