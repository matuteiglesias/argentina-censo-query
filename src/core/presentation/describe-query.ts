import type { CensusCatalog } from "../contracts/catalog.js";
import type { CensusQuery } from "../contracts/census-query.js";
import type { Predicate, ScalarValue } from "../contracts/common.js";

export type QueryDescription = {
  universe: string;
  measure: string;
  filters: string[];
  breakdown: string;
};

const OPERATOR_LABEL: Record<string, string> = {
  eq: "=",
  neq: "≠",
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  between: "entre",
  in: "en",
};

function variable(catalog: CensusCatalog, ref: string) {
  const item = catalog.variables.find((candidate) => candidate.id === ref);
  if (!item) throw new Error("unknown catalog variable: " + ref);
  return item;
}

function valueLabel(
  catalog: CensusCatalog,
  ref: string,
  value: ScalarValue,
): string {
  const category = catalog.categories.find(
    (item) => item.variable === ref && Object.is(item.code, value),
  );
  return category?.label ?? String(value);
}

function describePredicate(
  catalog: CensusCatalog,
  predicate: Predicate,
): string {
  const label = variable(catalog, predicate.variable).label;
  if (predicate.operator === "between") {
    return (
      label +
      " entre " +
      valueLabel(catalog, predicate.variable, predicate.value[0]) +
      " y " +
      valueLabel(catalog, predicate.variable, predicate.value[1])
    );
  }
  if (predicate.operator === "in") {
    return (
      label +
      " en " +
      predicate.value
        .map((value) => valueLabel(catalog, predicate.variable, value))
        .join(", ")
    );
  }
  return (
    label +
    " " +
    OPERATOR_LABEL[predicate.operator] +
    " " +
    valueLabel(catalog, predicate.variable, predicate.value)
  );
}

export function describeCensusQuery(
  query: CensusQuery,
  catalog: CensusCatalog,
): QueryDescription {
  const entity = catalog.entities.find(
    (item) => item.id === query.universe.entity,
  );
  if (!entity) throw new Error("unknown query entity");

  let measure: string;
  if (query.measure.type === "count") {
    measure = "Cantidad de " + entity.label.toLocaleLowerCase("es");
  } else if (query.measure.type === "average") {
    measure =
      "Promedio de " +
      variable(catalog, query.measure.variable).label.toLocaleLowerCase("es");
  } else {
    measure =
      "Proporción de " +
      entity.label.toLocaleLowerCase("es") +
      " que cumplen: " +
      describePredicate(catalog, query.measure.condition);
  }

  const breakdownItem = query.breakdowns[0];
  let breakdown = "Sin desglose";
  if (breakdownItem?.type === "geography") {
    breakdown =
      catalog.geographies.find((item) => item.level === breakdownItem.level)
        ?.label ?? breakdownItem.level;
  } else if (breakdownItem?.type === "variable") {
    breakdown = variable(catalog, breakdownItem.variable).label;
  }

  return {
    universe: entity.label + " · " + catalog.universe.label + " (VP)",
    measure,
    filters: query.filters.map((item) => describePredicate(catalog, item)),
    breakdown,
  };
}
