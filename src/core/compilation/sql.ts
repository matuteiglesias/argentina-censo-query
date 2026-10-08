import type { CensusCatalog } from "../contracts/catalog.js";
import type { CensusQuery } from "../contracts/census-query.js";
import type { Predicate } from "../contracts/common.js";
import type { SqlArtifactSchema } from "../contracts/compilation.js";
import type { z } from "zod";
import {
  assertCompilableQuery,
  renderPredicate,
  scalarSql,
  variableEntity,
  variableSourceIdentifier,
} from "./shared.js";

export type SqlArtifact = z.infer<typeof SqlArtifactSchema>;

const ALIAS = {
  VIVIENDA: "v",
  HOGAR: "h",
  PERSONA: "p",
} as const;

const TABLE = {
  VIVIENDA: "censo.vivienda",
  HOGAR: "censo.hogar",
  PERSONA: "censo.persona",
} as const;

function sqlVariable(ref: string): string {
  const entity = variableEntity(ref);
  const field = variableSourceIdentifier(ref);
  return `${ALIAS[entity]}."${field}"`;
}

function sqlPredicate(predicate: Predicate): string {
  return renderPredicate(
    predicate,
    sqlVariable,
    scalarSql,
    { neq: "<>", and: "AND", or: "OR" },
  );
}

function referencedEntities(query: CensusQuery): Set<string> {
  const refs: string[] = [];
  if (query.measure.type === "average") refs.push(query.measure.variable);
  if (query.measure.type === "share") refs.push(query.measure.condition.variable);
  refs.push(...query.filters.map((item) => item.variable));
  for (const breakdown of query.breakdowns) {
    if (breakdown.type === "variable") refs.push(breakdown.variable);
  }
  return new Set(refs.map(variableEntity));
}

function joinsFor(query: CensusQuery): string[] {
  const grain = query.universe.entity;
  const refs = referencedEntities(query);
  const joins: string[] = [];

  if (grain === "PERSONA") {
    if (refs.has("HOGAR")) {
      joins.push(
        'JOIN censo.hogar AS h ON p."hogar_key" = h."hogar_key"',
      );
    }
    if (refs.has("VIVIENDA")) {
      joins.push(
        'JOIN censo.vivienda AS v ON p."vivienda_key" = v."vivienda_key"',
      );
    }
  } else if (grain === "HOGAR" && refs.has("VIVIENDA")) {
    joins.push(
      'JOIN censo.vivienda AS v ON h."vivienda_key" = v."vivienda_key"',
    );
  }

  return joins;
}

function geographyExpression(
  query: CensusQuery,
  level: "PROV" | "DPTO",
): string {
  const alias = ALIAS[query.universe.entity];
  return level === "PROV"
    ? `${alias}."__prov_code"`
    : `${alias}."__dpto_code"`;
}

function breakdownExpression(query: CensusQuery): string | undefined {
  const breakdown = query.breakdowns[0];
  if (!breakdown) return undefined;
  return breakdown.type === "geography"
    ? geographyExpression(query, breakdown.level)
    : sqlVariable(breakdown.variable);
}

function geographySelectionPredicate(query: CensusQuery): string | undefined {
  if (query.geography_selection.type === "all") return undefined;
  const expression = geographyExpression(query, query.geography_selection.level);
  return (
    "(" +
    query.geography_selection.codes
      .map((code) => `${expression} = ${scalarSql(code)}`)
      .join(" OR ") +
    ")"
  );
}

export function compileSql(
  input: unknown,
  catalog: CensusCatalog,
): SqlArtifact {
  const query = assertCompilableQuery(input, catalog);
  const grain = query.universe.entity;
  const breakdown = breakdownExpression(query);

  let valueExpression: string;
  if (query.measure.type === "count") {
    valueExpression = 'COUNT(*) AS "value"';
  } else if (query.measure.type === "average") {
    valueExpression = `AVG(CAST(${sqlVariable(query.measure.variable)} AS DOUBLE)) AS "value"`;
  } else {
    valueExpression =
      `AVG(CASE WHEN ${sqlPredicate(query.measure.condition)} THEN 1.0 ELSE 0.0 END) AS "value"`;
  }

  const select = breakdown
    ? `SELECT ${breakdown} AS "breakdown",\n       ${valueExpression}`
    : `SELECT ${valueExpression}`;

  const whereParts = query.filters.map(sqlPredicate);
  const geographySelection = geographySelectionPredicate(query);
  if (geographySelection) whereParts.push(geographySelection);

  const lines = [
    select,
    `FROM ${TABLE[grain]} AS ${ALIAS[grain]}`,
    ...joinsFor(query),
  ];

  if (whereParts.length > 0) {
    lines.push("WHERE " + whereParts.join("\n  AND "));
  }
  if (breakdown) {
    lines.push(`GROUP BY ${breakdown}`);
    lines.push('ORDER BY "breakdown"');
  }

  return {
    target: "sql",
    dialect: "duckdb-census-logical/v1",
    logical_schema: "argentina.censo2022-relational/v1",
    code: lines.join("\n") + ";",
  };
}
