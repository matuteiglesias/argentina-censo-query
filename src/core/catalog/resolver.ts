import type {
  CatalogCategory,
  CatalogEntity,
  CatalogGeography,
  CatalogVariable,
  CensusCatalog,
} from "../contracts/catalog.js";
import type { SemanticIntent, IntentPredicate } from "../contracts/semantic-intent.js";
import type { CensusQuery } from "../contracts/census-query.js";
import type { Predicate } from "../contracts/common.js";
import { normalizeCatalogTerm } from "./normalization.js";
import { validateCensusQuery } from "../validation/query-validator.js";

export type ResolutionIssue = {
  code:
    | "unknown_entity_concept"
    | "unknown_variable_concept"
    | "unknown_category_concept"
    | "unknown_geography_concept"
    | "unsupported_variable"
    | "unsupported_universe"
    | "resolved_query_invalid";
  path: string;
  message: string;
};

export type ResolutionResult =
  | { status: "resolved"; query: CensusQuery }
  | { status: "unresolved"; issues: ResolutionIssue[] };

function termMatches(raw: string, concepts: string[], aliases: string[]): boolean {
  const target = normalizeCatalogTerm(raw);
  return [...concepts, ...aliases].some(
    (value) => normalizeCatalogTerm(value) === target,
  );
}

function uniqueMatch<T>(
  values: T[],
  predicate: (value: T) => boolean,
): T | undefined {
  const matches = values.filter(predicate);
  return matches.length === 1 ? matches[0] : undefined;
}

export function resolveEntityTerm(
  catalog: CensusCatalog,
  term: string,
): CatalogEntity | undefined {
  return uniqueMatch(catalog.entities, (entity) =>
    termMatches(term, entity.concepts, entity.aliases),
  );
}

export function resolveVariableTerm(
  catalog: CensusCatalog,
  term: string,
): CatalogVariable | undefined {
  return uniqueMatch(
    catalog.variables.filter((item) => item.status === "supported"),
    (variable) => termMatches(term, variable.concepts, variable.aliases),
  );
}

export function resolveCategoryTerm(
  catalog: CensusCatalog,
  variableId: string,
  term: string,
): CatalogCategory | undefined {
  return uniqueMatch(
    catalog.categories.filter((item) => item.variable === variableId),
    (category) => termMatches(term, category.concepts, category.aliases),
  );
}

export function resolveGeographyTerm(
  catalog: CensusCatalog,
  term: string,
): CatalogGeography | undefined {
  return uniqueMatch(catalog.geographies, (geography) =>
    termMatches(term, geography.concepts, geography.aliases),
  );
}

function resolveIntentPredicate(
  predicate: IntentPredicate,
  catalog: CensusCatalog,
  path: string,
  issues: ResolutionIssue[],
): Predicate | undefined {
  const variable = resolveVariableTerm(catalog, predicate.variable_concept);
  if (!variable) {
    issues.push({
      code: "unknown_variable_concept",
      path: path + ".variable_concept",
      message: `cannot resolve variable concept: ${predicate.variable_concept}`,
    });
    return undefined;
  }

  const resolveAtom = (
    atom: { kind: "literal"; value: string | number | boolean } | { kind: "concept"; concept: string },
    atomPath: string,
  ): string | number | boolean | undefined => {
    if (atom.kind === "literal") return atom.value;
    const category = resolveCategoryTerm(catalog, variable.id, atom.concept);
    if (!category) {
      issues.push({
        code: "unknown_category_concept",
        path: atomPath,
        message: `cannot resolve ${atom.concept} for ${variable.id}`,
      });
      return undefined;
    }
    return category.code;
  };

  if (predicate.operator === "between") {
    const left = resolveAtom(predicate.value[0], path + ".value.0");
    const right = resolveAtom(predicate.value[1], path + ".value.1");
    if (left === undefined || right === undefined) return undefined;
    return { variable: variable.id, operator: "between", value: [left, right] };
  }

  if (predicate.operator === "in") {
    const values = predicate.value.map((atom, index) =>
      resolveAtom(atom, path + ".value." + index),
    );
    if (values.some((value) => value === undefined)) return undefined;
    return {
      variable: variable.id,
      operator: "in",
      value: values as Array<string | number | boolean>,
    };
  }

  const value = resolveAtom(predicate.value, path + ".value");
  if (value === undefined) return undefined;
  return { variable: variable.id, operator: predicate.operator, value };
}

export function resolveSemanticIntent(
  intent: SemanticIntent,
  catalog: CensusCatalog,
): ResolutionResult {
  const issues: ResolutionIssue[] = [];

  if (
    intent.universe_concept &&
    !termMatches(
      intent.universe_concept,
      catalog.universe.concepts,
      catalog.universe.aliases,
    ) &&
    normalizeCatalogTerm(intent.universe_concept) !==
      normalizeCatalogTerm(catalog.universe.id)
  ) {
    return {
      status: "unresolved",
      issues: [
        {
          code: "unsupported_universe",
          path: "universe_concept",
          message: `unsupported universe: ${intent.universe_concept}`,
        },
      ],
    };
  }

  const entity = resolveEntityTerm(catalog, intent.measure.entity_concept);
  if (!entity) {
    return {
      status: "unresolved",
      issues: [
        {
          code: "unknown_entity_concept",
          path: "measure.entity_concept",
          message: `cannot resolve entity concept: ${intent.measure.entity_concept}`,
        },
      ],
    };
  }

  let measure: CensusQuery["measure"] | undefined;
  if (intent.measure.type === "count") {
    measure = { type: "count", entity: entity.id };
  } else if (intent.measure.type === "average") {
    const variable = resolveVariableTerm(catalog, intent.measure.variable_concept);
    if (!variable) {
      issues.push({
        code: "unknown_variable_concept",
        path: "measure.variable_concept",
        message: `cannot resolve variable concept: ${intent.measure.variable_concept}`,
      });
    } else {
      measure = {
        type: "average",
        entity: entity.id,
        variable: variable.id,
      };
    }
  } else {
    const condition = resolveIntentPredicate(
      intent.measure.condition,
      catalog,
      "measure.condition",
      issues,
    );
    if (condition) {
      measure = { type: "share", entity: entity.id, condition };
    }
  }

  const filters = intent.filters
    .map((filter, index) =>
      resolveIntentPredicate(filter, catalog, "filters." + index, issues),
    )
    .filter((filter): filter is Predicate => filter !== undefined);

  let breakdowns: CensusQuery["breakdowns"] = [];
  if (intent.breakdown?.type === "geography") {
    const geography = resolveGeographyTerm(catalog, intent.breakdown.concept);
    if (!geography) {
      issues.push({
        code: "unknown_geography_concept",
        path: "breakdown.concept",
        message: `cannot resolve geography concept: ${intent.breakdown.concept}`,
      });
    } else {
      breakdowns = [{ type: "geography", level: geography.level }];
    }
  } else if (intent.breakdown?.type === "variable") {
    const variable = resolveVariableTerm(catalog, intent.breakdown.concept);
    if (!variable) {
      issues.push({
        code: "unknown_variable_concept",
        path: "breakdown.concept",
        message: `cannot resolve variable concept: ${intent.breakdown.concept}`,
      });
    } else {
      breakdowns = [{ type: "variable", variable: variable.id }];
    }
  }

  if (!measure || issues.length > 0) {
    return { status: "unresolved", issues };
  }

  const query: CensusQuery = {
    contract: "argentina.census-query/v1",
    universe: { database: catalog.database, entity: entity.id },
    measure,
    filters,
    breakdowns,
    geography_selection: { type: "all" },
  };

  const validation = validateCensusQuery(query, catalog);
  if (!validation.valid) {
    return {
      status: "unresolved",
      issues: validation.issues.map((issue) => ({
        code: "resolved_query_invalid" as const,
        path: issue.path,
        message: `[${issue.code}] ${issue.message}`,
      })),
    };
  }

  return { status: "resolved", query };
}
