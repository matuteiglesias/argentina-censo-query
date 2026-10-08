import type { CensusQuery } from "../contracts/census-query.js";

export type QualificationTarget = "sql_local" | "redatam" | "indec_web";

export type QualificationStatus =
  | "radio_qualified"
  | "derived_from_radio_qualified"
  | "surface_checked"
  | "compiler_tested";

export type Qualification = {
  target: QualificationTarget;
  status: QualificationStatus;
  label: string;
  claim: string;
  scope: string;
  evidence: string[];
};

const B5_EVIDENCE = "docs/qualification/B5_REDATAM_EQUIVALENCE.md";
const B6_EVIDENCE = "docs/qualification/B6_INDEC_WEBSERVER.md";
const B4_SPEC = "docs/spec/LOCAL_EXECUTION.md";

function hasVariableBreakdown(query: CensusQuery): boolean {
  return query.breakdowns.some((item) => item.type === "variable");
}

export function qualificationForTarget(
  query: CensusQuery,
  target: QualificationTarget,
): Qualification {
  if (target === "sql_local") {
    if (hasVariableBreakdown(query)) {
      return {
        target,
        status: "compiler_tested",
        label: "Compilador probado",
        claim:
          "La forma SQL está cubierta por regresiones; este breakdown por variable aún no tiene evidencia empírica preservada sobre el RADIO permanente.",
        scope: "duckdb-census-logical/v1",
        evidence: [B4_SPEC],
      };
    }
    return {
      target,
      status: "radio_qualified",
      label: "Calificado en RADIO",
      claim:
        "El executor SQL y este tipo de medida tienen evidencia sobre el laboratorio VP RADIO 061471101.",
      scope: "April-2025 VP · RADIO 061471101",
      evidence: [B4_SPEC, B5_EVIDENCE],
    };
  }

  if (target === "redatam") {
    if (query.measure.type === "share") {
      return {
        target,
        status: "derived_from_radio_qualified",
        label: "Derivado de COUNT calificado",
        claim:
          "SHARE se define como Seleccionado / Total usando dos COUNT Redatam. Los COUNT componentes están calificados en el RADIO permanente; la composición SHARE directa conserva un gate live separado.",
        scope: "RedEngine 1.1.0-final · redatamx 1.1.3 · RADIO 061471101",
        evidence: [B5_EVIDENCE],
      };
    }
    if (hasVariableBreakdown(query)) {
      return {
        target,
        status: "compiler_tested",
        label: "Compilador probado",
        claim:
          "La forma Redatam compila y está cubierta por regresiones, pero ese breakdown por variable no integra el conjunto empírico 9/10 preservado.",
        scope: "redatam-process/v1",
        evidence: [B5_EVIDENCE],
      };
    }
    return {
      target,
      status: "radio_qualified",
      label: "Calificado en RADIO",
      claim:
        "COUNT/AVERAGE y los paths representativos de filtros/geografía tienen equivalencia SQL ↔ RedEngine preservada sobre RADIO 061471101.",
      scope: "RedEngine 1.1.0-final · redatamx 1.1.3 · RADIO 061471101",
      evidence: [B5_EVIDENCE],
    };
  }

  return {
    target,
    status: "surface_checked",
    label: "Superficie verificada",
    claim:
      query.measure.type === "average"
        ? "La página Programa y su vocabulario fueron verificados; los promedios del catálogo hacen fallback explícito porque PROMEDIOSPART no expone esas variables."
        : "La familia WebServer y los controles necesarios fueron inspeccionados en modo read-only; no se afirma ejecución remota ni estabilidad de URL.",
    scope: "CPV2022 WebServer · snapshot 2026-10-07",
    evidence: [B6_EVIDENCE],
  };
}

export function qualificationForQuery(query: CensusQuery): Qualification[] {
  return [
    qualificationForTarget(query, "sql_local"),
    qualificationForTarget(query, "redatam"),
    qualificationForTarget(query, "indec_web"),
  ];
}
