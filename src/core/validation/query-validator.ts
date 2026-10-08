import type { CensusCatalog, CatalogVariable } from "../contracts/catalog.js";
import { CensusQuerySchema, type CensusQuery } from "../contracts/census-query.js";
import type { Predicate } from "../contracts/common.js";
import type {
  QueryValidationIssue,
  QueryValidationResult,
} from "../contracts/validation.js";
import { checkCatalog } from "../catalog/catalog-check.js";

function issue(
  issues: QueryValidationIssue[],
  code: QueryValidationIssue["code"],
  path: string,
  message: string,
): void {
  issues.push({ code, path, message });
}

function valuesOf(predicate: Predicate): Array<string | number | boolean> {
  return Array.isArray(predicate.value) ? [...predicate.value] : [predicate.value];
}

function isAccessibleEntity(
  catalog: CensusCatalog,
  grain: string,
  target: string,
): boolean {
  if (grain === target) return true;
  let current = grain;
  const visited = new Set<string>();
  while (!visited.has(current)) {
    visited.add(current);
    const relationship = catalog.relationships.find(
      (item) => item.child === current,
    );
    if (!relationship) return false;
    if (relationship.parent === target) return true;
    current = relationship.parent;
  }
  return false;
}

function validatePredicate(
  predicate: Predicate,
  catalog: CensusCatalog,
  grain: CensusQuery["universe"]["entity"],
  path: string,
  issues: QueryValidationIssue[],
): void {
  const variable = catalog.variables.find((item) => item.id === predicate.variable);
  if (!variable) {
    issue(issues, "unknown_variable", path + ".variable", `unknown variable ${predicate.variable}`);
    return;
  }
  if (variable.status !== "supported") {
    issue(
      issues,
      "variable_not_supported",
      path + ".variable",
      `${variable.id} has status ${variable.status}`,
    );
    return;
  }
  if (!isAccessibleEntity(catalog, grain, variable.entity)) {
    issue(
      issues,
      "invalid_relationship_path",
      path + ".variable",
      `${variable.id} is not on the same grain or an ancestor of ${grain}`,
    );
  }
  if (!variable.allowed_operators.includes(predicate.operator)) {
    issue(
      issues,
      "operator_not_allowed",
      path + ".operator",
      `${predicate.operator} is not allowed for ${variable.id}`,
    );
  }
  validateValues(variable, valuesOf(predicate), catalog, path + ".value", issues);

  if (
    predicate.operator === "between" &&
    typeof predicate.value[0] === "number" &&
    typeof predicate.value[1] === "number" &&
    predicate.value[0] > predicate.value[1]
  ) {
    issue(
      issues,
      "invalid_range_order",
      path + ".value",
      "between lower bound must be <= upper bound",
    );
  }
}

function validateValues(
  variable: CatalogVariable,
  values: Array<string | number | boolean>,
  catalog: CensusCatalog,
  path: string,
  issues: QueryValidationIssue[],
): void {
  for (const value of values) {
    if (variable.value_type === "integer" || variable.value_type === "number") {
      if (typeof value !== "number" || (variable.value_type === "integer" && !Number.isInteger(value))) {
        issue(issues, "invalid_value_type", path, `${variable.id} requires numeric values`);
        continue;
      }
      if (
        variable.range &&
        (value < variable.range.min || value > variable.range.max)
      ) {
        issue(
          issues,
          "value_out_of_range",
          path,
          `${value} is outside ${variable.id} range ${variable.range.min}..${variable.range.max}`,
        );
      }
      continue;
    }

    if (variable.value_type === "categorical") {
      const known = catalog.categories.some(
        (category) =>
          category.variable === variable.id &&
          Object.is(category.code, value),
      );
      if (!known) {
        issue(
          issues,
          "unknown_category_code",
          path,
          `${JSON.stringify(value)} is not a curated category for ${variable.id}`,
        );
      }
      continue;
    }

    if (variable.value_type === "boolean" && typeof value !== "boolean") {
      issue(issues, "invalid_value_type", path, `${variable.id} requires boolean values`);
    }
    if (variable.value_type === "string" && typeof value !== "string") {
      issue(issues, "invalid_value_type", path, `${variable.id} requires string values`);
    }
  }
}

export function validateCensusQuery(
  input: unknown,
  catalogInput: unknown,
): QueryValidationResult {
  const queryParsed = CensusQuerySchema.safeParse(input);
  if (!queryParsed.success) {
    return {
      valid: false,
      issues: queryParsed.error.issues.map((item) => ({
        code: "structural_invalid" as const,
        path: item.path.join("."),
        message: item.message,
      })),
    };
  }

  const checkedCatalog = checkCatalog(catalogInput);
  if (!checkedCatalog.catalog || checkedCatalog.issues.length > 0) {
    return {
      valid: false,
      issues: checkedCatalog.issues.map((item) => ({
        code: "catalog_invalid" as const,
        path: item.path,
        message: `[${item.code}] ${item.message}`,
      })),
    };
  }

  const query = queryParsed.data;
  const catalog = checkedCatalog.catalog;
  const issues: QueryValidationIssue[] = [];

  if (query.universe.database !== catalog.database) {
    issue(
      issues,
      "universe_database_mismatch",
      "universe.database",
      `query database ${query.universe.database} does not match catalog ${catalog.database}`,
    );
  }

  const entity = catalog.entities.find((item) => item.id === query.universe.entity);
  if (!entity) {
    issue(
      issues,
      "unknown_universe_entity",
      "universe.entity",
      `entity ${query.universe.entity} is absent from catalog`,
    );
  }

  const measure = query.measure;

  if (measure.entity !== query.universe.entity) {
    issue(
      issues,
      "measure_entity_mismatch",
      "measure.entity",
      "measure grain must equal universe entity in v1",
    );
  }

  if (measure.type === "count") {
    if (entity && !entity.supports_count) {
      issue(
        issues,
        "count_not_supported",
        "measure",
        `count is not supported for ${entity.id}`,
      );
    }
  } else if (measure.type === "average") {
    const variable = catalog.variables.find(
      (item) => item.id === measure.variable,
    );
    if (!variable) {
      issue(
        issues,
        "unknown_variable",
        "measure.variable",
        `unknown variable ${measure.variable}`,
      );
    } else if (variable.status !== "supported") {
      issue(
        issues,
        "variable_not_supported",
        "measure.variable",
        `${variable.id} has status ${variable.status}`,
      );
    } else {
      if (variable.entity !== measure.entity) {
        issue(
          issues,
          "average_wrong_grain",
          "measure.variable",
          "average variables must belong to the measure grain in v1",
        );
      }
      if (!variable.supports_average) {
        issue(
          issues,
          "average_not_supported",
          "measure.variable",
          `average is not supported for ${variable.id}`,
        );
      }
    }
  } else {
    validatePredicate(
      measure.condition,
      catalog,
      measure.entity,
      "measure.condition",
      issues,
    );
  }

  query.filters.forEach((filter, index) =>
    validatePredicate(filter, catalog, query.universe.entity, `filters.${index}`, issues),
  );

  query.breakdowns.forEach((breakdown, index) => {
    if (breakdown.type === "geography") {
      const geography = catalog.geographies.find(
        (item) => item.level === breakdown.level,
      );
      if (!geography) {
        issue(
          issues,
          "unknown_geography_level",
          `breakdowns.${index}.level`,
          `unknown geography ${breakdown.level}`,
        );
      } else if (!geography.supports_breakdown) {
        issue(
          issues,
          "breakdown_not_supported",
          `breakdowns.${index}`,
          `${breakdown.level} cannot be used as a breakdown`,
        );
      }
      return;
    }

    const variable = catalog.variables.find(
      (item) => item.id === breakdown.variable,
    );
    if (!variable) {
      issue(
        issues,
        "unknown_variable",
        `breakdowns.${index}.variable`,
        `unknown variable ${breakdown.variable}`,
      );
      return;
    }
    if (
      variable.status !== "supported" ||
      !variable.supports_breakdown
    ) {
      issue(
        issues,
        "breakdown_not_supported",
        `breakdowns.${index}`,
        `${variable.id} cannot be used as a breakdown`,
      );
    }
    if (!isAccessibleEntity(catalog, query.universe.entity, variable.entity)) {
      issue(
        issues,
        "invalid_relationship_path",
        `breakdowns.${index}.variable`,
        `${variable.id} is not accessible from ${query.universe.entity}`,
      );
    }
  });

  const geographySelection = query.geography_selection;
  if (geographySelection.type === "include") {
    const geography = catalog.geographies.find(
      (item) => item.level === geographySelection.level,
    );
    if (!geography) {
      issue(
        issues,
        "unknown_geography_level",
        "geography_selection.level",
        `unknown geography ${geographySelection.level}`,
      );
    } else if (geography.member_coverage === "none") {
      issue(
        issues,
        "geography_member_catalog_unavailable",
        "geography_selection.codes",
        `catalog v0 has no enumerated ${geography.level} members; explicit code selection fails closed`,
      );
    } else {
      const knownCodes = new Set(geography.members.map((member) => member.code));
      for (const code of geographySelection.codes) {
        if (!knownCodes.has(code)) {
          issue(
            issues,
            "unknown_geography_code",
            "geography_selection.codes",
            `unknown ${geography.level} code ${code}`,
          );
        }
      }
    }
  }

  return issues.length === 0 ? { valid: true } : { valid: false, issues };
}
