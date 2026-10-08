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

function redatamPredicate(predicate: Predicate): string {
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

function universeExpression(query: CensusQuery): string | undefined {
  const parts = query.filters.map(redatamPredicate);
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
  return parts.length > 0 ? parts.map((part) => `(${part})`).join(" AND ") : undefined;
}

export function compileRedatam(
  input: unknown,
  catalog: CensusCatalog,
): RedatamArtifact {
  const query = assertCompilableQuery(input, catalog);
  const universe = universeExpression(query);
  const breakdown = breakdownVariable(query);
  const lines = ["RUNDEF ACQ", "  SELECTION ALL"];
  if (universe) lines.push("  UNIVERSE " + universe);

  if (query.measure.type === "count") {
    const marker = `${query.measure.entity}.ZZACQCOUNT`;
    assertPrivateMarkerAvailable(catalog, marker);
    lines.push(
      "",
      `DEFINE ${marker}`,
      "  AS 1",
      "  TYPE INTEGER",
      "  RANGE 1-1",
      "",
      "TABLE ACQ_RESULT",
    );
    if (breakdown) {
      lines.push(
        "  AS CROSSTABS",
        `  OF ${marker} BY ${breakdown}`,
      );
    } else {
      lines.push("  AS FREQUENCY", `  OF ${marker}`);
    }
  } else if (query.measure.type === "average") {
    lines.push("", "TABLE ACQ_RESULT", "  AS AVERAGE");
    lines.push(
      breakdown
        ? `  OF ${query.measure.variable} BY ${breakdown}`
        : `  OF ${query.measure.variable}`,
    );
  } else {
    const marker = `${query.measure.entity}.ZZACQSHARE`;
    assertPrivateMarkerAvailable(catalog, marker);
    lines.push(
      "",
      `DEFINE ${marker}`,
      "  AS SWITCH",
      `  INCASE (${redatamPredicate(query.measure.condition)})`,
      "  ASSIGN 1",
      "  OPTIONS DEFAULT 0",
      "  TYPE INTEGER",
      "  RANGE 0-1",
      "",
      "TABLE ACQ_RESULT",
      "  AS AVERAGE",
      breakdown
        ? `  OF ${marker} BY ${breakdown}`
        : `  OF ${marker}`,
    );
  }

  return {
    target: "redatam_process",
    dialect: "redatam-process/v1",
    code: lines.join("\n"),
  };
}
