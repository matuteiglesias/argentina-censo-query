import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import type { CensusQuery } from "../src/core/index.js";
import {
  CPV2022_VP_CATALOG_V0,
  compileRedatam,
} from "../src/core/index.js";
import { executeLocalVpQuery } from "../src/local/index.js";

const slice = process.env.CENSO_VP_RADIO_061471101_SLICE;
const database = process.env.CENSO_VP_RXDB_DATABASE;
const live = slice && database ? describe : describe.skip;

const SHARE_QUERY: CensusQuery = {
  contract: "argentina.census-query/v1",
  universe: { database: "VP", entity: "HOGAR" },
  measure: {
    type: "share",
    entity: "HOGAR",
    condition: { variable: "HOGAR.H22", operator: "eq", value: 2 },
  },
  filters: [],
  breakdowns: [],
  geography_selection: { type: "all" },
};

function runRedatam(code: string): unknown {
  const script = [
    "suppressPackageStartupMessages(library(redatamx))",
    "args <- commandArgs(trailingOnly=TRUE)",
    "d <- redatam_open(args[[1]])",
    "on.exit(redatam_close(d), add=TRUE)",
    "code <- sub('^RUNDEF ACQ', 'RUNDEF ACQ\\nSELECTION RADIO == \\\"061471101\\\"', args[[2]])",
    "x <- redatam_internal_query(d, code)",
    "jsonlite::write_json(x, stdout(), auto_unbox=TRUE, dataframe=\"rows\", digits=NA)",
  ].join("; ");

  const result = spawnSync("Rscript", ["-e", script, database!, code], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });

  if (result.status !== 0) {
    throw new Error(
      "RedEngine process failed: " + result.status + "\n" + result.stderr,
    );
  }

  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(
      "RedEngine returned non-JSON output:\n" +
        result.stdout +
        "\n" +
        result.stderr,
    );
  }
}

function finiteNumbers(value: unknown): number[] {
  if (typeof value === "number" && Number.isFinite(value)) return [value];
  if (Array.isArray(value)) return value.flatMap(finiteNumbers);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap(finiteNumbers);
  }
  return [];
}

live("B7 SHARE composition closure gate", () => {
  it("matches B4 SHARE using Redatam selected and total counts", async () => {
    const local = await executeLocalVpQuery(
      SHARE_QUERY,
      slice!,
      CPV2022_VP_CATALOG_V0,
    );
    const expected = Number(local.rows[0]?.value);
    expect(expected).toBeCloseTo(1 / 56, 14);

    const redatam = compileRedatam(
      SHARE_QUERY,
      CPV2022_VP_CATALOG_V0,
    );
    expect(redatam.code).toContain("TABLE ACQ_TOTAL");
    expect(redatam.code).toContain("TABLE ACQ_SELECTED");
    expect(redatam.code).toContain("FILTER (HOGAR.H22 = 2)");
    expect(redatam.code).not.toContain("AS SWITCH");

    const result = runRedatam(redatam.code);
    const numbers = finiteNumbers(result);
    expect(numbers).toContain(56);
    expect(numbers).toContain(1);
    expect(1 / 56).toBeCloseTo(expected, 14);
  }, 60_000);
});
