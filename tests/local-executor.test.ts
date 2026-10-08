import { createHash } from "node:crypto";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DuckDBInstance } from "@duckdb/node-api";
import { afterEach, describe, expect, it } from "vitest";
import {
  CPV2022_VP_CATALOG_V0,
  sha256Canonical,
} from "../src/core/index.js";
import {
  LocalSliceError,
  executeLocalVpQuery,
  verifyLocalVpSlice,
} from "../src/local/index.js";
import { GOLDEN_QUESTIONS } from "./golden-questions.js";

const roots: string[] = [];

function golden(fragment: string) {
  const item = GOLDEN_QUESTIONS.find((candidate) =>
    candidate.question.includes(fragment),
  );
  if (!item) throw new Error("missing golden question: " + fragment);
  return item;
}

function quote(value: string): string {
  return "'" + value.replaceAll("'", "''") + "'";
}

async function sha256(path: string): Promise<string> {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

async function makeSlice(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "arg-censo-query-"));
  roots.push(root);
  const instance = await DuckDBInstance.create(":memory:");
  const connection = await instance.connect();

  try {
    const vivienda = join(root, "vivienda.parquet");
    const hogar = join(root, "hogar.parquet");
    const persona = join(root, "persona.parquet");

    await connection.run(`
      COPY (
        SELECT * FROM (VALUES
          ('061471101', '061471101:1', 1, 1, 2),
          ('061471101', '061471101:2', 4, 1, 1)
        ) AS t("XRADIO", "vivienda_key", "V01", "V06", "TOTPOBV")
      ) TO ${quote(vivienda)} (FORMAT PARQUET)
    `);

    await connection.run(`
      COPY (
        SELECT * FROM (VALUES
          ('061471101', '061471101:1', '061471101:1', 2, 3, 2, 1, 2),
          ('061471101', '061471101:2', '061471101:2', 1, 2, 1, 2, 1)
        ) AS t("XRADIO", "hogar_key", "vivienda_key", "TOTPOBH", "H20", "H22", "H24A", "NBI_TOT")
      ) TO ${quote(hogar)} (FORMAT PARQUET)
    `);

    await connection.run(`
      COPY (
        SELECT * FROM (VALUES
          ('061471101', '061471101:1', '061471101:1', '061471101:1', 25, 1, 2, 4),
          ('061471101', '061471101:2', '061471101:1', '061471101:1', 70, 2, 2, 4),
          ('061471101', '061471101:3', '061471101:2', '061471101:2', 23, 1, 1, 6)
        ) AS t("XRADIO", "persona_key", "hogar_key", "vivienda_key", "EDAD", "P02", "P06", "P07")
      ) TO ${quote(persona)} (FORMAT PARQUET)
    `);

    const manifest: Record<string, unknown> = {
      manifest_version: "1",
      selection: { entity: "RADIO", code: "061471101" },
      identity_scope: "RADIO",
      scope_field: "XRADIO",
      validation_status: "pass",
      entities: {
        VIVIENDA: {
          artifact: { path: "vivienda.parquet", sha256: await sha256(vivienda) },
        },
        HOGAR: {
          artifact: { path: "hogar.parquet", sha256: await sha256(hogar) },
        },
        PERSONA: {
          artifact: { path: "persona.parquet", sha256: await sha256(persona) },
        },
      },
    };
    manifest.semantic_hash = sha256Canonical(manifest);
    await writeFile(
      join(root, "dataset-manifest.json"),
      JSON.stringify(manifest),
      "utf8",
    );
    await writeFile(
      join(root, "validation.json"),
      JSON.stringify({ status: "pass", checks: [] }),
      "utf8",
    );
    return root;
  } finally {
    connection.closeSync();
  }
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("B4 local DuckDB executor", () => {
  it("verifies extractor-style slice custody before mounting Parquet", async () => {
    const root = await makeSlice();
    const verified = await verifyLocalVpSlice(root);
    expect(verified.root).toBe(root);
    expect(verified.manifest_semantic_hash).toHaveLength(64);
  });

  it("executes the compiled SQL for a person count on synthetic radio Parquet", async () => {
    const root = await makeSlice();
    const item = golden("mujeres de 20 a 29");
    const result = await executeLocalVpQuery(
      item.expected,
      root,
      CPV2022_VP_CATALOG_V0,
    );

    expect(result.contract).toBe("argentina.census-local-execution/v1");
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.breakdown).toBe("06");
    expect(Number(result.rows[0]?.value)).toBe(2);
  });

  it("executes an ancestor HOGAR filter while keeping PERSONA as count grain", async () => {
    const root = await makeSlice();
    const item = golden("viven en hogares que alquilan");
    const result = await executeLocalVpQuery(
      item.expected,
      root,
      CPV2022_VP_CATALOG_V0,
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.breakdown).toBe("06");
    expect(Number(result.rows[0]?.value)).toBe(2);
  });

  it("executes SHARE with the same filtered-denominator semantics as the compiler", async () => {
    const root = await makeSlice();
    const item = golden("porcentaje de hogares alquila");
    const result = await executeLocalVpQuery(
      item.expected,
      root,
      CPV2022_VP_CATALOG_V0,
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.breakdown).toBe("06147");
    expect(Number(result.rows[0]?.value)).toBeCloseTo(0.5);
  });

  it("fails closed before DuckDB execution when a Parquet hash changes", async () => {
    const root = await makeSlice();
    await writeFile(join(root, "persona.parquet"), "tampered", "utf8");

    await expect(
      executeLocalVpQuery(
        golden("mujeres de 20 a 29").expected,
        root,
        CPV2022_VP_CATALOG_V0,
      ),
    ).rejects.toThrow("artifact_hash_mismatch:PERSONA");
  });

  it("fails closed on a non-passing extraction validation report", async () => {
    const root = await makeSlice();
    await writeFile(
      join(root, "validation.json"),
      JSON.stringify({ status: "fail" }),
      "utf8",
    );

    await expect(verifyLocalVpSlice(root)).rejects.toBeInstanceOf(
      LocalSliceError,
    );
  });
});
