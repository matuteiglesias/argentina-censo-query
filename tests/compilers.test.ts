import { describe, expect, it } from "vitest";
import {
  CPV2022_VP_CATALOG_V0,
  CompilationBundleSchema,
  CompilationError,
  compileBundle,
  compileIndecWebRecipe,
  compileRedatam,
  compileSql,
} from "../src/core/index.js";
import { GOLDEN_QUESTIONS } from "./golden-questions.js";

function golden(fragment: string) {
  const item = GOLDEN_QUESTIONS.find((candidate) =>
    candidate.question.includes(fragment),
  );
  if (!item) throw new Error("missing golden question: " + fragment);
  return item;
}

describe("B4-B6 deterministic compilers", () => {
  it.each(GOLDEN_QUESTIONS)(
    "compiles all three targets for: $question",
    ({ question, expected }) => {
      const bundle = compileBundle(
        question,
        expected,
        CPV2022_VP_CATALOG_V0,
      );
      expect(() => CompilationBundleSchema.parse(bundle)).not.toThrow();
      expect(bundle.query).toEqual(expected);
      expect(bundle.targets.sql.code).toMatch(/^SELECT /);
      expect(bundle.targets.redatam_process.code).toContain("RUNDEF ACQ");
      expect(bundle.targets.indec_web.steps.length).toBeGreaterThan(2);
    },
  );

  it("compiles a person count with filters and province breakdown to logical DuckDB SQL", () => {
    const item = golden("mujeres de 20 a 29");
    const sql = compileSql(item.expected, CPV2022_VP_CATALOG_V0).code;

    expect(sql).toContain('COUNT(*) AS "value"');
    expect(sql).toContain('FROM censo.persona AS p');
    expect(sql).toContain('p."P02" = 1');
    expect(sql).toContain('p."EDAD" >= 20');
    expect(sql).toContain('p."EDAD" <= 29');
    expect(sql).toContain('p."__prov_code" AS "breakdown"');
    expect(sql).toContain('GROUP BY p."__prov_code"');
  });

  it("joins only the validated ancestor table needed by a cross-grain filter", () => {
    const item = golden("viven en hogares que alquilan");
    const sql = compileSql(item.expected, CPV2022_VP_CATALOG_V0).code;

    expect(sql).toContain(
      'JOIN censo.hogar AS h ON p."hogar_key" = h."hogar_key"',
    );
    expect(sql).toContain('h."H22" = 2');
    expect(sql).not.toContain("JOIN censo.vivienda");
  });

  it("compiles averages and shares without changing the measure grain", () => {
    const average = compileSql(
      golden("edad promedio").expected,
      CPV2022_VP_CATALOG_V0,
    ).code;
    expect(average).toContain('AVG(CAST(p."EDAD" AS DOUBLE)) AS "value"');

    const share = compileSql(
      golden("porcentaje de hogares alquila").expected,
      CPV2022_VP_CATALOG_V0,
    ).code;
    expect(share).toContain(
      'AVG(CASE WHEN h."H22" = 2 THEN 1.0 ELSE 0.0 END) AS "value"',
    );
  });

  it("compiles Redatam COUNT to a one-valued record marker", () => {
    const code = compileRedatam(
      golden("mujeres de 20 a 29").expected,
      CPV2022_VP_CATALOG_V0,
    ).code;

    expect(code).toContain("RUNDEF ACQ");
    expect(code).toContain("SELECTION ALL");
    expect(code).toContain("UNIVERSE");
    expect(code).toContain("PERSONA.P02 = 1");
    expect(code).toContain("DEFINE PERSONA.ZZACQCOUNT");
    expect(code).toContain("AS CROSSTABS");
    expect(code).toContain(
      "OF PERSONA.ZZACQCOUNT BY PROV.IDPROV",
    );
  });

  it("compiles Redatam SHARE as a deterministic 0/1 indicator average", () => {
    const code = compileRedatam(
      golden("porcentaje de hogares alquila").expected,
      CPV2022_VP_CATALOG_V0,
    ).code;

    expect(code).toContain("DEFINE HOGAR.ZZACQSHARE");
    expect(code).toContain("AS SWITCH");
    expect(code).toContain("INCASE (HOGAR.H22 = 2)\n  ASSIGN 1");
    expect(code).toContain("OPTIONS DEFAULT 0");
    expect(code).not.toContain("ELSE 0");
    expect(code).toContain("AS AVERAGE");
    expect(code).toContain("OF HOGAR.ZZACQSHARE BY DPTO.IDPTO");
  });

  it("maps standard INDEC WebServer surfaces for the golden subset", () => {
    const countRecipe = compileIndecWebRecipe(
      golden("mujeres de 20 a 29").expected,
      CPV2022_VP_CATALOG_V0,
    );
    expect(countRecipe.steps.join("\n")).toContain("CONTEOSPPART");
    expect(countRecipe.area_breakdown).toBe("Provincia");

    const variableBreakdown = compileIndecWebRecipe(
      golden("por sexo registrado").expected,
      CPV2022_VP_CATALOG_V0,
    );
    expect(variableBreakdown.steps.join("\n")).toContain("FREQPOBPART");
    expect(variableBreakdown.steps.join("\n")).toContain(
      'En "Corte de área", elegí: País.',
    );

    const averageRecipe = compileIndecWebRecipe(
      golden("edad promedio").expected,
      CPV2022_VP_CATALOG_V0,
    );
    expect(averageRecipe.steps.join("\n")).toContain("PROGVIVPART");
    expect(averageRecipe.steps.join("\n")).not.toContain("PROMEDIOSPART");

    const shareRecipe = compileIndecWebRecipe(
      golden("porcentaje de hogares alquila").expected,
      CPV2022_VP_CATALOG_V0,
    );
    expect(shareRecipe.steps.join("\n")).toContain("CONTEOHOG");
    expect(shareRecipe.steps.join("\n")).toContain("/argbin/");
    expect(shareRecipe.output).toContain("Seleccionado / Total");
  });

  it("fails closed if a source catalog collides with a Redatam private marker", () => {
    const catalog = structuredClone(CPV2022_VP_CATALOG_V0);
    catalog.variables.push({
      id: "PERSONA.ZZACQCOUNT",
      source_identifier: "ZZACQCOUNT",
      source_alias: null,
      entity: "PERSONA",
      universe_id: "vp",
      label: "Collision fixture",
      value_type: "integer",
      range: { min: 0, max: 1 },
      concepts: ["collision-fixture"],
      aliases: [],
      allowed_operators: ["eq"],
      supports_average: false,
      supports_breakdown: false,
      status: "supported",
      category_coverage: "none",
      anomaly: null,
      evidence_ids: ["project-relational-schema"],
    });

    expect(() =>
      compileRedatam(
        golden("mujeres de 20 a 29").expected,
        catalog,
      ),
    ).toThrow(/compiler-private variable collides/);
  });

  it("fails before compilation when a plausible query violates B3", () => {
    expect(() =>
      compileSql(
        {
          contract: "argentina.census-query/v1",
          universe: { database: "VP", entity: "PERSONA" },
          measure: { type: "count", entity: "PERSONA" },
          filters: [
            { variable: "PERSONA.P02", operator: "eq", value: 3 },
          ],
          breakdowns: [],
          geography_selection: { type: "all" },
        },
        CPV2022_VP_CATALOG_V0,
      ),
    ).toThrow(CompilationError);
  });

  it("is deterministic for the same canonical query and question", () => {
    const item = golden("hogares tienen internet");
    const left = compileBundle(
      item.question,
      item.expected,
      CPV2022_VP_CATALOG_V0,
    );
    const right = compileBundle(
      item.question,
      item.expected,
      CPV2022_VP_CATALOG_V0,
    );
    expect(left).toEqual(right);
  });
});
