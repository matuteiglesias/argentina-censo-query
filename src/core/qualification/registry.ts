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
const B7_EVIDENCE = "docs/qualification/B7_CANONICAL_EQUIVALENCE.md";
const B4_SPEC = "docs/spec/LOCAL_EXECUTION.md";

function hasVariableBreakdown(query: CensusQuery): boolean {
  return query.breakdowns.some((item) => item.type === "variable");
}

function hasGeoBreakdown(
  query: CensusQuery,
  level?: "PROV" | "DPTO",
): boolean {
  return query.breakdowns.some(
    (item) =>
      item.type === "geography" && (level === undefined || item.level === level),
  );
}

function noBreakdown(query: CensusQuery): boolean {
  return query.breakdowns.length === 0;
}

function isExactQualifiedCase(query: CensusQuery): boolean {
  if (query.geography_selection.type !== "all") return false;

  if (
    query.measure.type === "count" &&
    query.filters.length === 0 &&
    noBreakdown(query)
  ) {
    return true;
  }

  if (
    query.measure.type === "count" &&
    query.universe.entity === "PERSONA" &&
    noBreakdown(query) &&
    query.filters.length === 1
  ) {
    const filter = query.filters[0]!;
    return (
      (filter.variable === "PERSONA.EDAD" &&
        filter.operator === "gte" &&
        filter.value === 65) ||
      (filter.variable === "PERSONA.P02" &&
        filter.operator === "eq" &&
        filter.value === 1) ||
      (filter.variable === "HOGAR.H22" &&
        filter.operator === "eq" &&
        filter.value === 2)
    );
  }

  if (
    query.measure.type === "average" &&
    query.universe.entity === "PERSONA" &&
    query.measure.variable === "PERSONA.EDAD" &&
    query.filters.length === 0 &&
    noBreakdown(query)
  ) {
    return true;
  }

  if (
    query.measure.type === "count" &&
    query.filters.length === 0 &&
    query.universe.entity === "PERSONA" &&
    hasGeoBreakdown(query, "PROV")
  ) {
    return true;
  }

  if (
    query.measure.type === "count" &&
    query.filters.length === 0 &&
    query.universe.entity === "HOGAR" &&
    hasGeoBreakdown(query, "DPTO")
  ) {
    return true;
  }

  return false;
}

function isCompositionOfQualifiedPrimitives(query: CensusQuery): boolean {
  if (query.geography_selection.type !== "all") return false;
  if (hasVariableBreakdown(query)) return false;

  if (query.measure.type === "share") {
    return true;
  }

  if (
    query.measure.type === "average" &&
    query.measure.variable === "PERSONA.EDAD"
  ) {
    return true;
  }

  if (query.measure.type !== "count") return false;

  const supportedFilter = query.filters.every((filter) =>
    ["PERSONA.EDAD", "PERSONA.P02", "HOGAR.H22"].includes(filter.variable),
  );
  const supportedBreakdown =
    noBreakdown(query) || query.breakdowns.every((item) => item.type === "geography");

  return supportedFilter && supportedBreakdown;
}

function qualificationFromEvidence(
  target: "sql_local" | "redatam",
  query: CensusQuery,
): Qualification {
  const targetLabel = target === "sql_local" ? "SQL local" : "Redatam";
  const baseEvidence =
    target === "sql_local"
      ? [B4_SPEC, B5_EVIDENCE, B7_EVIDENCE]
      : [B5_EVIDENCE, B7_EVIDENCE];
  const scope =
    target === "sql_local"
      ? "April-2025 VP · RADIO 061471101"
      : "RedEngine 1.1.0-final · redatamx 1.1.3 · RADIO 061471101";

  if (isExactQualifiedCase(query)) {
    return {
      target,
      status: "radio_qualified",
      label: "Calificado en RADIO",
      claim:
        targetLabel +
        ": esta forma exacta integra el conjunto de equivalencia preservado sobre el RADIO permanente.",
      scope,
      evidence: baseEvidence,
    };
  }

  if (isCompositionOfQualifiedPrimitives(query)) {
    return {
      target,
      status: "derived_from_radio_qualified",
      label: "Derivado de evidencia RADIO",
      claim:
        targetLabel +
        ": la consulta combina primitivas que tienen evidencia sobre el RADIO permanente, pero esta forma exacta no fue ejecutada como un único caso preservado.",
      scope,
      evidence: baseEvidence,
    };
  }

  return {
    target,
    status: "compiler_tested",
    label: "Compilador probado",
    claim:
      targetLabel +
      ": la forma está cubierta por validación/compilación y regresiones, pero no tiene evidencia empírica específica preservada sobre el RADIO permanente.",
    scope: target === "sql_local" ? "duckdb-census-logical/v1" : "redatam-process/v1",
    evidence: baseEvidence,
  };
}

export function qualificationForTarget(
  query: CensusQuery,
  target: QualificationTarget,
): Qualification {
  if (target === "sql_local" || target === "redatam") {
    return qualificationFromEvidence(target, query);
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
