import type { CensusCatalog } from "../contracts/catalog.js";
import { CensusQuerySchema, type CensusQuery } from "../contracts/census-query.js";
import type { Predicate, ScalarValue } from "../contracts/common.js";
import { validateCensusQuery } from "../validation/query-validator.js";

export class CompilationError extends Error {
  readonly issues: string[];

  constructor(message: string, issues: string[] = []) {
    super(message);
    this.name = "CompilationError";
    this.issues = issues;
  }
}

export function assertCompilableQuery(
  input: unknown,
  catalog: CensusCatalog,
): CensusQuery {
  const parsed = CensusQuerySchema.safeParse(input);
  if (!parsed.success) {
    throw new CompilationError(
      "CensusQuery is structurally invalid",
      parsed.error.issues.map(
        (item) => `${item.path.join(".")}: ${item.message}`,
      ),
    );
  }

  const validation = validateCensusQuery(parsed.data, catalog);
  if (!validation.valid) {
    throw new CompilationError(
      "CensusQuery failed semantic validation",
      validation.issues.map(
        (item) => `[${item.code}] ${item.path}: ${item.message}`,
      ),
    );
  }

  return parsed.data;
}

export function variableSourceIdentifier(ref: string): string {
  const parts = ref.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new CompilationError(`invalid variable reference: ${ref}`);
  }
  return parts[1];
}

export function variableEntity(ref: string): "VIVIENDA" | "HOGAR" | "PERSONA" {
  const entity = ref.split(".")[0];
  if (entity === "VIVIENDA" || entity === "HOGAR" || entity === "PERSONA") {
    return entity;
  }
  throw new CompilationError(`invalid variable entity: ${ref}`);
}

export function scalarSql(value: ScalarValue): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new CompilationError("cannot compile non-finite numeric literal");
    }
    return String(value);
  }
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return "'" + value.replaceAll("'", "''") + "'";
}

export function scalarRedatam(value: ScalarValue): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new CompilationError("cannot compile non-finite numeric literal");
    }
    return String(value);
  }
  if (typeof value === "boolean") return value ? "1" : "0";
  return '"' + value.replaceAll('"', '""') + '"';
}

export function renderPredicate(
  predicate: Predicate,
  renderVariable: (ref: string) => string,
  renderScalar: (value: ScalarValue) => string,
  operators: { neq: string; and: string; or: string },
): string {
  const variable = renderVariable(predicate.variable);
  switch (predicate.operator) {
    case "eq":
      return `${variable} = ${renderScalar(predicate.value)}`;
    case "neq":
      return `${variable} ${operators.neq} ${renderScalar(predicate.value)}`;
    case "gt":
      return `${variable} > ${renderScalar(predicate.value)}`;
    case "gte":
      return `${variable} >= ${renderScalar(predicate.value)}`;
    case "lt":
      return `${variable} < ${renderScalar(predicate.value)}`;
    case "lte":
      return `${variable} <= ${renderScalar(predicate.value)}`;
    case "between":
      return `(${variable} >= ${renderScalar(predicate.value[0])} ${operators.and} ${variable} <= ${renderScalar(predicate.value[1])})`;
    case "in":
      return (
        "(" +
        predicate.value
          .map((value) => `${variable} = ${renderScalar(value)}`)
          .join(` ${operators.or} `) +
        ")"
      );
  }
}

export function categoryLabel(
  catalog: CensusCatalog,
  variable: string,
  value: ScalarValue,
): string | undefined {
  return catalog.categories.find(
    (item) => item.variable === variable && Object.is(item.code, value),
  )?.label;
}

export function variableLabel(
  catalog: CensusCatalog,
  variable: string,
): string {
  const found = catalog.variables.find((item) => item.id === variable);
  if (!found) throw new CompilationError(`unknown catalog variable: ${variable}`);
  return found.label;
}
