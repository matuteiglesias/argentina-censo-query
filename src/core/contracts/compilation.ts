import { z } from "zod";
import { CensusQuerySchema } from "./census-query.js";
import { DatabaseSchema, EntitySchema } from "./common.js";

export const CompilationContextSchema = z
  .object({
    contract: z.literal("argentina.census-compilation-context/v1"),
    catalog_id: z.string().trim().min(1),
    census_vintage: z.literal(2022),
    source_database: DatabaseSchema,
    source_release_label: z.string().trim().min(1),
    logical_schema: z.literal("argentina.censo2022-relational/v1"),
  })
  .strict();

export const SqlArtifactSchema = z
  .object({
    target: z.literal("sql"),
    dialect: z.literal("duckdb-census-logical/v1"),
    logical_schema: z.literal("argentina.censo2022-relational/v1"),
    code: z.string().trim().min(1),
  })
  .strict();

export const RedatamArtifactSchema = z
  .object({
    target: z.literal("redatam_process"),
    dialect: z.literal("redatam-process/v1"),
    code: z.string().trim().min(1),
  })
  .strict();

export const IndecWebRecipeSchema = z
  .object({
    target: z.literal("indec_web_recipe"),
    contract: z.literal("indec-redatam-web-recipe/v1"),
    database: z.string().trim().min(1),
    entity: EntitySchema,
    area: z.string().trim().min(1),
    area_breakdown: z.string().trim().min(1).nullable(),
    universe_filter: z.string().trim().min(1).nullable(),
    output: z.string().trim().min(1),
    steps: z.array(z.string().trim().min(1)).min(1),
  })
  .strict();

export const CompilationBundleSchema = z
  .object({
    contract: z.literal("argentina.census-compilation/v1"),
    original_question: z.string().trim().min(1),
    query: CensusQuerySchema,
    context: CompilationContextSchema,
    targets: z
      .object({
        sql: SqlArtifactSchema,
        redatam_process: RedatamArtifactSchema,
        indec_web: IndecWebRecipeSchema,
      })
      .strict(),
  })
  .strict();

export type CompilationContext = z.infer<typeof CompilationContextSchema>;
export type CompilationBundle = z.infer<typeof CompilationBundleSchema>;
