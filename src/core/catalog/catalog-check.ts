import type { CensusCatalog } from "../contracts/catalog.js";
import { CensusCatalogSchema } from "../contracts/catalog.js";
import { normalizeCatalogTerm } from "./normalization.js";

export type CatalogIssue = {
  code: string;
  path: string;
  message: string;
};

function duplicateValues(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

export function checkCatalog(input: unknown): {
  catalog?: CensusCatalog;
  issues: CatalogIssue[];
} {
  const parsed = CensusCatalogSchema.safeParse(input);
  if (!parsed.success) {
    return {
      issues: parsed.error.issues.map((issue) => ({
        code: "catalog_structural_invalid",
        path: issue.path.join("."),
        message: issue.message,
      })),
    };
  }

  const catalog = parsed.data;
  const issues: CatalogIssue[] = [];
  const evidenceIds = catalog.evidence.map((item) => item.id);
  for (const duplicate of duplicateValues(evidenceIds)) {
    issues.push({
      code: "duplicate_evidence_id",
      path: "evidence",
      message: `duplicate evidence id: ${duplicate}`,
    });
  }
  const evidenceSet = new Set(evidenceIds);

  const referenceEvidence = (ids: string[], path: string) => {
    for (const id of ids) {
      if (!evidenceSet.has(id)) {
        issues.push({
          code: "unknown_evidence_id",
          path,
          message: `unknown evidence id: ${id}`,
        });
      }
    }
  };

  referenceEvidence(catalog.universe.evidence_ids, "universe.evidence_ids");
  catalog.entities.forEach((entity, index) =>
    referenceEvidence(entity.evidence_ids, `entities.${index}.evidence_ids`),
  );
  catalog.relationships.forEach((relationship, index) =>
    referenceEvidence(
      relationship.evidence_ids,
      `relationships.${index}.evidence_ids`,
    ),
  );
  catalog.variables.forEach((variable, index) =>
    referenceEvidence(variable.evidence_ids, `variables.${index}.evidence_ids`),
  );
  catalog.categories.forEach((category, index) =>
    referenceEvidence(category.evidence_ids, `categories.${index}.evidence_ids`),
  );
  catalog.geographies.forEach((geography, index) =>
    referenceEvidence(
      geography.evidence_ids,
      `geographies.${index}.evidence_ids`,
    ),
  );

  const entityIds = catalog.entities.map((item) => item.id);
  for (const duplicate of duplicateValues(entityIds)) {
    issues.push({
      code: "duplicate_entity",
      path: "entities",
      message: `duplicate entity: ${duplicate}`,
    });
  }
  const entitySet = new Set(entityIds);

  const entityTerms = new Map<string, string>();
  for (const entity of catalog.entities) {
    for (const raw of [...entity.concepts, ...entity.aliases]) {
      const term = normalizeCatalogTerm(raw);
      const previous = entityTerms.get(term);
      if (previous && previous !== entity.id) {
        issues.push({
          code: "ambiguous_entity_term",
          path: "entities",
          message: `term "${raw}" resolves to both ${previous} and ${entity.id}`,
        });
      } else {
        entityTerms.set(term, entity.id);
      }
    }
  }

  for (const [index, entity] of catalog.entities.entries()) {
    if (entity.universe_id !== catalog.universe.id) {
      issues.push({
        code: "entity_universe_mismatch",
        path: `entities.${index}.universe_id`,
        message: `${entity.id} does not belong to catalog universe`,
      });
    }
  }

  const parentByChild = new Map<string, string>();
  for (const [index, relationship] of catalog.relationships.entries()) {
    const previousParent = parentByChild.get(relationship.child);
    if (previousParent && previousParent !== relationship.parent) {
      issues.push({
        code: "multiple_entity_parents",
        path: `relationships.${index}`,
        message: `${relationship.child} has parents ${previousParent} and ${relationship.parent}`,
      });
    } else {
      parentByChild.set(relationship.child, relationship.parent);
    }

    if (!entitySet.has(relationship.child) || !entitySet.has(relationship.parent)) {
      issues.push({
        code: "relationship_unknown_entity",
        path: `relationships.${index}`,
        message: "relationship references entity absent from catalog",
      });
    }
    if (relationship.child === relationship.parent) {
      issues.push({
        code: "relationship_self_cycle",
        path: `relationships.${index}`,
        message: "relationship child and parent must differ",
      });
    }
  }

  for (const start of entityIds) {
    const seen = new Set<string>();
    let current: string | undefined = start;
    while (current) {
      if (seen.has(current)) {
        issues.push({
          code: "relationship_cycle",
          path: "relationships",
          message: `entity relationship cycle reachable from ${start}`,
        });
        break;
      }
      seen.add(current);
      current = parentByChild.get(current);
    }
  }

  const variableIds = catalog.variables.map((item) => item.id);
  for (const duplicate of duplicateValues(variableIds)) {
    issues.push({
      code: "duplicate_variable",
      path: "variables",
      message: `duplicate variable: ${duplicate}`,
    });
  }
  const variableById = new Map(catalog.variables.map((item) => [item.id, item]));

  for (const [index, variable] of catalog.variables.entries()) {
    if (!entitySet.has(variable.entity)) {
      issues.push({
        code: "variable_unknown_entity",
        path: `variables.${index}.entity`,
        message: `${variable.id} references unknown entity ${variable.entity}`,
      });
    }
    if (!variable.id.startsWith(variable.entity + ".")) {
      issues.push({
        code: "variable_entity_prefix_mismatch",
        path: `variables.${index}.id`,
        message: `${variable.id} does not match entity ${variable.entity}`,
      });
    }
    if (variable.source_identifier !== variable.id.split(".")[1]) {
      issues.push({
        code: "source_identifier_mismatch",
        path: `variables.${index}.source_identifier`,
        message: `${variable.id} source identifier mismatch`,
      });
    }
    if (variable.universe_id !== catalog.universe.id) {
      issues.push({
        code: "variable_universe_mismatch",
        path: `variables.${index}.universe_id`,
        message: `${variable.id} does not belong to catalog universe`,
      });
    }
    if (variable.status === "blocked" && variable.allowed_operators.length > 0) {
      issues.push({
        code: "blocked_variable_has_operators",
        path: `variables.${index}.allowed_operators`,
        message: `${variable.id} is blocked but declares operators`,
      });
    }
  }

  const categoryKeys = new Set<string>();
  for (const [index, category] of catalog.categories.entries()) {
    const variable = variableById.get(category.variable);
    if (!variable) {
      issues.push({
        code: "category_unknown_variable",
        path: `categories.${index}.variable`,
        message: `unknown category variable: ${category.variable}`,
      });
      continue;
    }
    if (variable.value_type !== "categorical") {
      issues.push({
        code: "category_non_categorical_variable",
        path: `categories.${index}.variable`,
        message: `${category.variable} is not categorical`,
      });
    }
    const key = category.variable + ":" + JSON.stringify(category.code);
    if (categoryKeys.has(key)) {
      issues.push({
        code: "duplicate_category_code",
        path: `categories.${index}.code`,
        message: `duplicate category code for ${category.variable}`,
      });
    }
    categoryKeys.add(key);
  }

  const categoryTerms = new Map<string, string>();
  for (const category of catalog.categories) {
    for (const raw of [...category.concepts, ...category.aliases]) {
      const key = category.variable + ":" + normalizeCatalogTerm(raw);
      const categoryIdentity = JSON.stringify(category.code);
      const previous = categoryTerms.get(key);
      if (previous && previous !== categoryIdentity) {
        issues.push({
          code: "ambiguous_category_term",
          path: "categories",
          message: `term "${raw}" resolves to multiple codes for ${category.variable}`,
        });
      } else {
        categoryTerms.set(key, categoryIdentity);
      }
    }
  }

  for (const variable of catalog.variables) {
    if (
      variable.category_coverage === "complete" &&
      variable.range &&
      variable.value_type === "categorical" &&
      Number.isInteger(variable.range.min) &&
      Number.isInteger(variable.range.max)
    ) {
      const observed = new Set(
        catalog.categories
          .filter((category) => category.variable === variable.id)
          .map((category) => category.code)
          .filter((code): code is number => typeof code === "number"),
      );
      for (let code = variable.range.min; code <= variable.range.max; code += 1) {
        if (!observed.has(code)) {
          issues.push({
            code: "incomplete_category_coverage",
            path: "categories",
            message: `${variable.id} declares complete coverage but lacks code ${code}`,
          });
        }
      }
    }
  }

  const geographyTerms = new Map<string, string>();
  for (const geography of catalog.geographies) {
    for (const raw of [...geography.concepts, ...geography.aliases]) {
      const term = normalizeCatalogTerm(raw);
      const previous = geographyTerms.get(term);
      if (previous && previous !== geography.level) {
        issues.push({
          code: "ambiguous_geography_term",
          path: "geographies",
          message: `term "${raw}" resolves to both ${previous} and ${geography.level}`,
        });
      } else {
        geographyTerms.set(term, geography.level);
      }
    }
  }

  const variableTerms = new Map<string, string>();
  for (const variable of catalog.variables.filter((item) => item.status === "supported")) {
    for (const raw of [...variable.concepts, ...variable.aliases]) {
      const term = normalizeCatalogTerm(raw);
      const previous = variableTerms.get(term);
      if (previous && previous !== variable.id) {
        issues.push({
          code: "ambiguous_variable_term",
          path: "variables",
          message: `term "${raw}" resolves to both ${previous} and ${variable.id}`,
        });
      } else {
        variableTerms.set(term, variable.id);
      }
    }
  }

  return { catalog, issues };
}

export function assertCatalog(input: unknown): CensusCatalog {
  const checked = checkCatalog(input);
  if (!checked.catalog || checked.issues.length > 0) {
    throw new Error(
      "invalid census catalog:\n" +
        checked.issues
          .map((issue) => `- [${issue.code}] ${issue.path}: ${issue.message}`)
          .join("\n"),
    );
  }
  return checked.catalog;
}
