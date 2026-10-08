import {
  GOLDEN_EDGE_CASES,
  sha256Canonical,
  type CensusCatalog,
  type CatalogCategory,
  type CatalogVariable,
} from "../../core/index.js";
import type {
  SemanticLexicon,
  SemanticLexiconEntry,
  SemanticLexiconVariable,
} from "./types.js";

const CENSUS_IDENTIFIER = /^(?:VIVIENDA|HOGAR|PERSONA|PROV|DPTO)(?:\.|_)/;

function lexicalValues(values: string[]): string[] {
  return [...new Set(values)]
    .filter((value) => value.length > 0 && !CENSUS_IDENTIFIER.test(value))
    .sort();
}

function entry(values: { concepts: string[]; label: string; aliases: string[] }): SemanticLexiconEntry {
  return {
    concepts: lexicalValues(values.concepts),
    label: values.label,
    aliases: lexicalValues(values.aliases),
  };
}

function categoryEntry(category: CatalogCategory): SemanticLexiconEntry {
  return entry(category);
}

function variableEntry(
  variable: CatalogVariable,
  categories: CatalogCategory[],
): SemanticLexiconVariable {
  return {
    ...entry(variable),
    value_type: variable.value_type,
    allowed_operators: [...variable.allowed_operators].sort(),
    categories: categories
      .filter((category) => category.variable === variable.id)
      .map(categoryEntry)
      .sort((left, right) => left.label.localeCompare(right.label)),
  };
}

export function buildSemanticLexicon(catalog: CensusCatalog): SemanticLexicon {
  const base = {
    contract: "argentina.census-semantic-lexicon/v1" as const,
    grammar: {
      measures: ["count", "average", "share"] as ["count", "average", "share"],
      operators: ["eq", "neq", "gt", "gte", "lt", "lte", "between", "in"] as [
        "eq",
        "neq",
        "gt",
        "gte",
        "lt",
        "lte",
        "between",
        "in",
      ],
      breakdowns: ["geography", "variable"] as ["geography", "variable"],
    },
    universe: entry(catalog.universe),
    entities: catalog.entities
      .filter((entity) => entity.supports_count)
      .map(entry)
      .sort((left, right) => left.label.localeCompare(right.label)),
    variables: catalog.variables
      .filter((variable) => variable.status === "supported")
      .map((variable) => variableEntry(variable, catalog.categories))
      .sort((left, right) => left.label.localeCompare(right.label)),
    geographies: catalog.geographies
      .filter((geography) => geography.supports_breakdown)
      .map(entry)
      .sort((left, right) => left.label.localeCompare(right.label)),
    clarification_option_ids: [
      ...new Set(
        GOLDEN_EDGE_CASES.flatMap((item) =>
          item.expected.status === "needs_clarification"
            ? item.expected.options.map((option) => option.id)
            : [],
        ),
      ),
    ].sort(),
  };

  return {
    ...base,
    digest: sha256Canonical(base),
  };
}

export function semanticLexiconPrompt(lexicon: SemanticLexicon): string {
  const { digest, ...publicLexicon } = lexicon;
  return JSON.stringify({ ...publicLexicon, lexicon_digest: digest });
}
