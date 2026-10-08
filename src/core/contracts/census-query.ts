import { z } from "zod";
import {
  DatabaseSchema,
  EntitySchema,
  GeographyLevelSchema,
  PredicateSchema,
  VariableRefSchema,
} from "./common.js";

export const CountMeasureSchema = z
  .object({
    type: z.literal("count"),
    entity: EntitySchema,
  })
  .strict();

export const AverageMeasureSchema = z
  .object({
    type: z.literal("average"),
    entity: EntitySchema,
    variable: VariableRefSchema,
  })
  .strict();

export const ShareMeasureSchema = z
  .object({
    type: z.literal("share"),
    entity: EntitySchema,
    condition: PredicateSchema,
  })
  .strict();

export const MeasureSchema = z.discriminatedUnion("type", [
  CountMeasureSchema,
  AverageMeasureSchema,
  ShareMeasureSchema,
]);

export const BreakdownSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("geography"),
      level: GeographyLevelSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("variable"),
      variable: VariableRefSchema,
    })
    .strict(),
]);

export const GeographySelectionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("all") }).strict(),
  z
    .object({
      type: z.literal("include"),
      level: GeographyLevelSchema,
      codes: z.array(z.string().trim().min(1)).min(1),
    })
    .strict(),
]);

export const CensusQuerySchema = z
  .object({
    contract: z.literal("argentina.census-query/v1"),
    universe: z
      .object({
        database: DatabaseSchema,
        entity: EntitySchema,
      })
      .strict(),
    measure: MeasureSchema,
    filters: z.array(PredicateSchema).max(8).default([]),
    breakdowns: z.array(BreakdownSchema).max(1).default([]),
    geography_selection: GeographySelectionSchema.default({ type: "all" }),
  })
  .strict();

export type CensusQuery = z.infer<typeof CensusQuerySchema>;
