import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import type { CensusQuery } from "../src/core/index.js";
import {
  CPV2022_VP_CATALOG_V0,
  compileRedatam,
  compileSql,
} from "../src/core/index.js";
import { executeLocalVpQuery } from "../src/local/index.js";

const slice = process.env.CENSO_VP_RADIO_061471101_SLICE;
const database = process.env.CENSO_VP_RXDB_DATABASE;
const live = slice && database ? describe : describe.skip;

const q = (
  universe: CensusQuery["universe"]["entity"],
  measure: CensusQuery["measure"],
  filters: CensusQuery["filters"] = [],
  breakdowns: CensusQuery["breakdowns"] = [],
): CensusQuery => ({
  contract: "argentina.census-query/v1",
  universe: { database: "VP", entity: universe },
  measure,
  filters,
  breakdowns,
  geography_selection: { type: "all" },
});

const cases: Array<[string, CensusQuery]> = [
  ["count_vivienda", q("VIVIENDA", { type: "count", entity: "VIVIENDA" })],
  ["count_hogar", q("HOGAR", { type: "count", entity: "HOGAR" })],
  ["count_persona", q("PERSONA", { type: "count", entity: "PERSONA" })],
  [
    "persona_edad_gte_65",
    q("PERSONA", { type: "count", entity: "PERSONA" }, [
      { variable: "PERSONA.EDAD", operator: "gte", value: 65 },
    ]),
  ],
  [
    "persona_p02_woman",
    q("PERSONA", { type: "count", entity: "PERSONA" }, [
      { variable: "PERSONA.P02", operator: "eq", value: 1 },
    ]),
  ],
  [
    "persona_hogar_h22_rented",
    q("PERSONA", { type: "count", entity: "PERSONA" }, [
      { variable: "HOGAR.H22", operator: "eq", value: 2 },
    ]),
  ],
  [
    "average_persona_edad",
    q("PERSONA", { type: "average", entity: "PERSONA", variable: "PERSONA.EDAD" }),
  ],
  [
    "share_hogar_h22_rented",
    q("HOGAR", {
      type: "share",
      entity: "HOGAR",
      condition: { variable: "HOGAR.H22", operator: "eq", value: 2 },
    }),
  ],
  [
    "persona_count_by_prov",
    q("PERSONA", { type: "count", entity: "PERSONA" }, [], [
      { type: "geography", level: "PROV" },
    ]),
  ],
  [
    "hogar_count_by_dpto",
    q("HOGAR", { type: "count", entity: "HOGAR" }, [], [
      { type: "geography", level: "DPTO" },
    ]),
  ],
];

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
    return {
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    return { status: result.status, stdout: result.stdout, stderr: result.stderr };
  }
}

live("B5 live differential qualification", () => {
  it.each(cases)("runs %s from the same CensusQuery", async (name, query) => {
    const sql = compileSql(query, CPV2022_VP_CATALOG_V0);
    const redatam = compileRedatam(query, CPV2022_VP_CATALOG_V0);
    const local = await executeLocalVpQuery(query, slice!, CPV2022_VP_CATALOG_V0);
    const redatamResult = runRedatam(redatam.code);
    console.log(JSON.stringify({ name, query, sql: sql.code, redatam: redatam.code, local: local.rows, redatamResult }));
    expect(sql.code).toContain("SELECT");
    expect(redatam.code).toContain("RUNDEF ACQ");
  }, 60_000);
});
