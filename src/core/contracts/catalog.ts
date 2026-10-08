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

export const CatalogEntitySchema = z
  .object({
    id: EntitySchema,
    label: z.string().trim().min(1),
    concepts: ConceptsSchema,
    description: z.string().trim().min(1).optional(),
  })
  .strict();

export const CatalogVariableSchema = z
  .object({
    id: VariableRefSchema,
    entity: EntitySchema,
    label: z.string().trim().min(1),
    value_type: z.enum(["integer", "number", "categorical", "string", "boolean"]),
    concepts: ConceptsSchema,
    allowed_operators: z.array(OperatorSchema).min(1),
    status: z.enum(["supported", "blocked", "experimental"]),
    anomaly: z.string().trim().min(1).optional(),
  })
  .strict();

export const CatalogCategorySchema = z
  .object({
    variable: VariableRefSchema,
    code: ScalarValueSchema,
    label: z.string().trim().min(1),
    concepts: ConceptsSchema,
  })
  .strict();

export const CatalogGeographySchema = z
  .object({
    level: GeographyLevelSchema,
    label: z.string().trim().min(1),
    concepts: ConceptsSchema,
  })
  .strict();

export const CensusCatalogSchema = z
  .object({
    contract: z.literal("argentina.census-catalog/v1"),
    catalog_id: z.string().trim().min(1),
    census_vintage: z.literal(2022),
    database: DatabaseSchema,
    source_release_label: z.string().trim().min(1),
    entities: z.array(CatalogEntitySchema).min(1),
    variables: z.array(CatalogVariableSchema).default([]),
    categories: z.array(CatalogCategorySchema).default([]),
    geographies: z.array(CatalogGeographySchema).default([]),
  })
  .strict();

export type CensusCatalog = z.infer<typeof CensusCatalogSchema>;
