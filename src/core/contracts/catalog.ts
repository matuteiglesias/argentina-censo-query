import { z } from "zod";
import {
  ConceptIdSchema,
  DatabaseSchema,
  EntitySchema,
  GeographyLevelSchema,
  OperatorSchema,
  ScalarValueSchema,
  VariableRefSchema,
} from "./common.js";

const ConceptsSchema = z.array(ConceptIdSchema).min(1);
const AliasesSchema = z.array(z.string().trim().min(1)).default([]);
const EvidenceIdsSchema = z.array(ConceptIdSchema).min(1);

export const CatalogEvidenceSchema = z
  .object({
    id: ConceptIdSchema,
    kind: z.enum([
      "official_web_dictionary",
      "official_definitions",
      "project_schema",
      "project_contract",
    ]),
    locator: z.string().trim().min(1),
    note: z.string().trim().min(1).optional(),
  })
  .strict();

export const CatalogUniverseSchema = z
  .object({
    id: ConceptIdSchema,
    database: DatabaseSchema,
    label: z.string().trim().min(1),
    concepts: ConceptsSchema,
    aliases: AliasesSchema,
    description: z.string().trim().min(1),
    evidence_ids: EvidenceIdsSchema,
  })
  .strict();

export const CatalogEntitySchema = z
  .object({
    id: EntitySchema,
    universe_id: ConceptIdSchema,
    label: z.string().trim().min(1),
    concepts: ConceptsSchema,
    aliases: AliasesSchema,
    supports_count: z.boolean(),
    evidence_ids: EvidenceIdsSchema,
  })
  .strict();

export const CatalogRelationshipSchema = z
  .object({
    child: EntitySchema,
    parent: EntitySchema,
    kind: z.literal("belongs_to"),
    evidence_ids: EvidenceIdsSchema,
  })
  .strict();

export const NumericRangeSchema = z
  .object({
    min: z.number().finite(),
    max: z.number().finite(),
  })
  .strict()
  .refine((value) => value.min <= value.max, "range min must be <= max");

export const CatalogVariableSchema = z
  .object({
    id: VariableRefSchema,
    source_identifier: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
    source_alias: z.string().trim().min(1).nullable().default(null),
    entity: EntitySchema,
    universe_id: ConceptIdSchema,
    label: z.string().trim().min(1),
    value_type: z.enum(["integer", "number", "categorical", "string", "boolean"]),
    range: NumericRangeSchema.nullable().default(null),
    concepts: ConceptsSchema,
    aliases: AliasesSchema,
    allowed_operators: z.array(OperatorSchema),
    supports_average: z.boolean().default(false),
    supports_breakdown: z.boolean().default(false),
    status: z.enum(["supported", "blocked", "experimental"]),
    category_coverage: z.enum(["none", "partial", "complete"]).default("none"),
    anomaly: z.string().trim().min(1).nullable().default(null),
    evidence_ids: EvidenceIdsSchema,
  })
  .strict();

export const CatalogCategorySchema = z
  .object({
    variable: VariableRefSchema,
    code: ScalarValueSchema,
    label: z.string().trim().min(1),
    concepts: ConceptsSchema,
    aliases: AliasesSchema,
    evidence_ids: EvidenceIdsSchema,
  })
  .strict();

export const CatalogGeographyMemberSchema = z
  .object({
    code: z.string().trim().min(1),
    label: z.string().trim().min(1),
    aliases: AliasesSchema,
  })
  .strict();

export const CatalogGeographySchema = z
  .object({
    level: GeographyLevelSchema,
    source_identifier: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
    label: z.string().trim().min(1),
    concepts: ConceptsSchema,
    aliases: AliasesSchema,
    supports_breakdown: z.boolean(),
    member_coverage: z.enum(["none", "partial", "complete"]).default("none"),
    members: z.array(CatalogGeographyMemberSchema).default([]),
    evidence_ids: EvidenceIdsSchema,
  })
  .strict();

export const CensusCatalogSchema = z
  .object({
    contract: z.literal("argentina.census-catalog/v1"),
    catalog_id: z.string().trim().min(1),
    census_vintage: z.literal(2022),
    database: DatabaseSchema,
    source_release_label: z.string().trim().min(1),
    official_redatam_base: z.literal("CPV2022"),
    universe: CatalogUniverseSchema,
    evidence: z.array(CatalogEvidenceSchema).min(1),
    entities: z.array(CatalogEntitySchema).min(1),
    relationships: z.array(CatalogRelationshipSchema).default([]),
    variables: z.array(CatalogVariableSchema).default([]),
    categories: z.array(CatalogCategorySchema).default([]),
    geographies: z.array(CatalogGeographySchema).default([]),
  })
  .strict();

export type CensusCatalog = z.infer<typeof CensusCatalogSchema>;
export type CatalogVariable = z.infer<typeof CatalogVariableSchema>;
export type CatalogCategory = z.infer<typeof CatalogCategorySchema>;
export type CatalogEntity = z.infer<typeof CatalogEntitySchema>;
export type CatalogGeography = z.infer<typeof CatalogGeographySchema>;
