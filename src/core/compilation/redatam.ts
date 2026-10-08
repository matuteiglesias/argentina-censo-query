import type { CensusCatalog } from "../contracts/catalog.js";
import type { CensusQuery } from "../contracts/census-query.js";
import type { Predicate } from "../contracts/common.js";
import type { RedatamArtifactSchema } from "../contracts/compilation.js";
import type { z } from "zod";
import {
  CompilationError,
  assertCompilableQuery,
  renderPredicate,
  scalarRedatam,
} from "./shared.js";

export type RedatamArtifact = z.infer<typeof RedatamArtifactSchema>;

function assertPrivateMarkerAvailable(
  catalog: CensusCatalog,
  marker: string,
): void {
  if (catalog.variables.some((variable) => variable.id === marker)) {
    throw new CompilationError(
      "Redatam compiler-private variable collides with catalog: " + marker,
    );
  }
}

function redatamVariable(ref: string): string {
  return ref;
}

export function renderRedatamPredicate(predicate: Predicate): string {
  return renderPredicate(
    predicate,
    redatamVariable,
    scalarRedatam,
    { neq: "<>", and: "AND", or: "OR" },
  );
}

function geographyVariable(level: "PROV" | "DPTO"): string {
  return level === "PROV" ? "PROV.IDPROV" : "DPTO.IDPTO";
}

function breakdownVariable(query: CensusQuery): string | undefined {
  const breakdown = query.breakdowns[0];
  if (!breakdown) return undefined;
  return breakdown.type === "geography"
    ? geographyVariable(breakdown.level)
    : breakdown.variable;
}

export function renderRedatamFilterExpression(
  query: CensusQuery,
): string | undefined {
  const parts = query.filters.map(renderRedatamPredicate);
  if (query.geography_selection.type === "include") {
    const variable = geographyVariable(query.geography_selection.level);
    parts.push(
      "(" +
        query.geography_selection.codes
          .map((code) => `${variable} = ${scalarRedatam(code)}`)
          .join(" OR ") +
        ")",
    );
  }
  return parts.length > 0
    ? parts.map((part) => `(${part})`).join(" AND ")
    : undefined;
}

function appendCountTable(
  lines: string[],
  tableName: string,
  marker: string,
  breakdown: string | undefined,
  filter: string | undefined,
): void {
  lines.push("", `TABLE ${tableName}`);
  if (breakdown) {
    lines.push("  AS CROSSTABS", `  OF ${marker} BY ${breakdown}`);
  } else {
    lines.push("  AS FREQUENCY", `  OF ${marker}`);
  }
  if (filter) lines.push("  FILTER " + filter);
}

function combineFilters(
  left: string | undefined,
  right: string,
): string {
  return left ? `(${left}) AND (${right})` : `(${right})`;
}

export function compileRedatam(
  input: unknown,
  catalog: CensusCatalog,
): RedatamArtifact {
  const query = assertCompilableQuery(input, catalog);
  const baseFilter = renderRedatamFilterExpression(query);
  const breakdown = breakdownVariable(query);
  const lines = ["RUNDEF ACQ"];

  if (query.measure.type === "count") {
    const marker = `${query.measure.entity}.ZZACQCOUNT`;
    assertPrivateMarkerAvailable(catalog, marker);
    lines.push("", `DEFINE ${marker}`, "  AS 1", "  TYPE INTEGER");
    appendCountTable(
      lines,
      "ACQ_RESULT",
      marker,
      breakdown,
      baseFilter,
    );
  } else if (query.measure.type === "average") {
    lines.push("", "TABLE ACQ_RESULT", "  AS AVERAGE");
    lines.push(
      breakdown
        ? `  OF ${query.measure.variable} BY ${breakdown}`
        : `  OF ${query.measure.variable}`,
    );
    if (baseFilter) lines.push("  FILTER " + baseFilter);
  } else {
    const marker = `${query.measure.entity}.ZZACQCOUNT`;
    assertPrivateMarkerAvailable(catalog, marker);
    lines.push("", `DEFINE ${marker}`, "  AS 1", "  TYPE INTEGER");

    appendCountTable(
      lines,
      "ACQ_TOTAL",
      marker,
      breakdown,
      baseFilter,
    );

    const selectedFilter = combineFilters(
      baseFilter,
      renderRedatamPredicate(query.measure.condition),
    );
    appendCountTable(
      lines,
      "ACQ_SELECTED",
      marker,
      breakdown,
      selectedFilter,
    );
  }

  return {
    target: "redatam_process",
    dialect: "redatam-process/v1",
    code: lines.join("\n"),
  };
}
