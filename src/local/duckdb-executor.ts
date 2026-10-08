import { DuckDBInstance } from "@duckdb/node-api";
import type { CensusCatalog } from "../core/contracts/catalog.js";
import { compileSql } from "../core/compilation/sql.js";
import { assertCompilableQuery } from "../core/compilation/shared.js";
import { stableCanonicalId } from "../core/canonical-json.js";
import { LocalSliceError, verifyLocalVpSlice } from "./slice-verifier.js";

export type LocalQueryRow = Record<string, unknown>;

export type LocalExecutionResult = {
  contract: "argentina.census-local-execution/v1";
  execution_id: string;
  query_id: string;
  source_manifest_semantic_hash: string;
  source_radio_code: string;
  sql: string;
  rows: LocalQueryRow[];
};

function sqlLiteral(value: string): string {
  return "'" + value.replaceAll("'", "''") + "'";
}

async function createLogicalSchema(
  connection: Awaited<ReturnType<DuckDBInstance["connect"]>>,
  paths: { vivienda: string; hogar: string; persona: string },
  expectedRadio: string,
): Promise<void> {
  await connection.run("CREATE SCHEMA censo");

  for (const [name, path] of Object.entries(paths)) {
    await connection.run(
      `CREATE VIEW censo.${name} AS
       SELECT *,
              substr(CAST("XRADIO" AS VARCHAR), 1, 2) AS "__prov_code",
              substr(CAST("XRADIO" AS VARCHAR), 1, 5) AS "__dpto_code"
       FROM read_parquet(${sqlLiteral(path)})`,
    );

    const check = await connection.runAndReadAll(
      `SELECT COUNT(*) AS bad
       FROM censo.${name}
       WHERE "XRADIO" IS NULL
          OR NOT regexp_matches(CAST("XRADIO" AS VARCHAR), '^[0-9]{9}
    );
    const rows = check.getRowObjectsJson() as Array<Record<string, unknown>>;
    if (Number(rows[0]?.bad ?? 0) !== 0) {
      throw new LocalSliceError(`invalid_XRADIO:${name}`);
    }
  }
}

export async function executeLocalVpQuery(
  queryInput: unknown,
  sliceRoot: string,
  catalog: CensusCatalog,
): Promise<LocalExecutionResult> {
  const verified = await verifyLocalVpSlice(sliceRoot);
  const query = assertCompilableQuery(queryInput, catalog);
  const sql = compileSql(query, catalog);
  const instance = await DuckDBInstance.create(":memory:", {
    threads: "1",
  });
  const connection = await instance.connect();

  try {
    await createLogicalSchema(connection, verified.paths, verified.radio_code);
    const reader = await connection.runAndReadAll(sql.code);
    const rows = reader.getRowObjectsJson() as LocalQueryRow[];
    if (rows.length > 10000) {
      throw new Error("local_result_row_limit_exceeded");
    }

    const queryId = stableCanonicalId("cq", query);
    return {
      contract: "argentina.census-local-execution/v1",
      execution_id: stableCanonicalId("exec", {
        query_id: queryId,
        source_manifest_semantic_hash: verified.manifest_semantic_hash,
      }),
      query_id: queryId,
      source_manifest_semantic_hash: verified.manifest_semantic_hash,
      source_radio_code: verified.radio_code,
      sql: sql.code,
      rows,
    };
  } finally {
    connection.closeSync();
  }
}
)
          OR CAST("XRADIO" AS VARCHAR) <> ${sqlLiteral(expectedRadio)}`,
    );
    const rows = check.getRowObjectsJson() as Array<Record<string, unknown>>;
    if (Number(rows[0]?.bad ?? 0) !== 0) {
      throw new LocalSliceError(`invalid_XRADIO:${name}`);
    }
  }
}

export async function executeLocalVpQuery(
  queryInput: unknown,
  sliceRoot: string,
  catalog: CensusCatalog,
): Promise<LocalExecutionResult> {
  const verified = await verifyLocalVpSlice(sliceRoot);
  const query = assertCompilableQuery(queryInput, catalog);
  const sql = compileSql(query, catalog);
  const instance = await DuckDBInstance.create(":memory:", {
    threads: "1",
  });
  const connection = await instance.connect();

  try {
    await createLogicalSchema(connection, verified.paths);
    const reader = await connection.runAndReadAll(sql.code);
    const rows = reader.getRowObjectsJson() as LocalQueryRow[];
    if (rows.length > 10000) {
      throw new Error("local_result_row_limit_exceeded");
    }

    const queryId = stableCanonicalId("cq", query);
    return {
      contract: "argentina.census-local-execution/v1",
      execution_id: stableCanonicalId("exec", {
        query_id: queryId,
        source_manifest_semantic_hash: verified.manifest_semantic_hash,
      }),
      query_id: queryId,
      source_manifest_semantic_hash: verified.manifest_semantic_hash,
      source_radio_code: verified.radio_code,
      sql: sql.code,
      rows,
    };
  } finally {
    connection.closeSync();
  }
}
