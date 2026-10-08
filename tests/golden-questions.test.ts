import { describe, expect, it } from "vitest";
import {
  CPV2022_VP_CATALOG_V0,
  resolveCategoryTerm,
  resolveEntityTerm,
  resolveGeographyTerm,
  resolveSemanticIntent,
  resolveVariableTerm,
  validateCensusQuery,
} from "../src/core/index.js";
import { GOLDEN_QUESTIONS } from "./golden-questions.js";

describe("CensusCatalog v0 golden questions", () => {
  it.each(GOLDEN_QUESTIONS)("$question", ({ question, intent, expected }) => {
    expect(intent.original_question).toBe(question);
    const resolved = resolveSemanticIntent(intent, CPV2022_VP_CATALOG_V0);
    expect(resolved.status).toBe("resolved");
    if (resolved.status !== "resolved") return;
    expect(resolved.query).toEqual(expected);
    expect(validateCensusQuery(resolved.query, CPV2022_VP_CATALOG_V0)).toEqual({
      valid: true,
    });
  });

  it("covers exactly twenty initial golden questions", () => {
    expect(GOLDEN_QUESTIONS).toHaveLength(20);
  });

  it("resolves representative Spanish terms by explicit aliases only", () => {
    expect(resolveEntityTerm(CPV2022_VP_CATALOG_V0, "personas")?.id).toBe("PERSONA");
    expect(resolveEntityTerm(CPV2022_VP_CATALOG_V0, "hogares")?.id).toBe("HOGAR");
    expect(resolveVariableTerm(CPV2022_VP_CATALOG_V0, "edad")?.id).toBe("PERSONA.EDAD");
    expect(resolveVariableTerm(CPV2022_VP_CATALOG_V0, "asistencia educativa")?.id).toBe("PERSONA.P06");
    expect(resolveVariableTerm(CPV2022_VP_CATALOG_V0, "tenencia de la vivienda")?.id).toBe("HOGAR.H22");
    expect(resolveVariableTerm(CPV2022_VP_CATALOG_V0, "tamaño del hogar")?.id).toBe("HOGAR.TOTPOBH");
    expect(resolveVariableTerm(CPV2022_VP_CATALOG_V0, "internet del hogar")?.id).toBe("HOGAR.H24A");
    expect(resolveVariableTerm(CPV2022_VP_CATALOG_V0, "tipo de vivienda")?.id).toBe("VIVIENDA.V01");
    expect(resolveCategoryTerm(CPV2022_VP_CATALOG_V0, "PERSONA.P02", "mujeres")?.code).toBe(1);
    expect(resolveCategoryTerm(CPV2022_VP_CATALOG_V0, "HOGAR.H22", "alquiler")?.code).toBe(2);
    expect(resolveCategoryTerm(CPV2022_VP_CATALOG_V0, "VIVIENDA.V01", "departamentos")?.code).toBe(4);
    expect(resolveGeographyTerm(CPV2022_VP_CATALOG_V0, "provincia")?.level).toBe("PROV");
    expect(resolveGeographyTerm(CPV2022_VP_CATALOG_V0, "partidos")?.level).toBe("DPTO");
  });
});
