import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { sha256Canonical } from "../core/canonical-json.js";

const ENTITIES = ["VIVIENDA", "HOGAR", "PERSONA"] as const;
const FILE_BY_ENTITY = {
  VIVIENDA: "vivienda.parquet",
  HOGAR: "hogar.parquet",
  PERSONA: "persona.parquet",
} as const;

export class LocalSliceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LocalSliceError";
  }
}

async function sha256File(path: string): Promise<string> {
  const digest = createHash("sha256");
  for await (const chunk of createReadStream(path)) {
    digest.update(chunk);
  }
  return digest.digest("hex");
}

async function jsonObject(path: string): Promise<Record<string, unknown>> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(path, "utf8"));
  } catch {
    throw new LocalSliceError("missing_or_invalid_json:" + path);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new LocalSliceError("invalid_json_object:" + path);
  }
  return parsed as Record<string, unknown>;
}

function objectField(
  value: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const field = value[key];
  if (!field || typeof field !== "object" || Array.isArray(field)) {
    throw new LocalSliceError("invalid_manifest_field:" + key);
  }
  return field as Record<string, unknown>;
}

export type VerifiedLocalSlice = {
  root: string;
  paths: {
    vivienda: string;
    hogar: string;
    persona: string;
  };
  manifest_semantic_hash: string;
  radio_code: string;
};

export async function verifyLocalVpSlice(
  rootInput: string,
): Promise<VerifiedLocalSlice> {
  const root = resolve(rootInput);
  const validationPath = resolve(root, "validation.json");
  const manifestPath = resolve(root, "dataset-manifest.json");

  const validation = await jsonObject(validationPath);
  if (validation.status !== "pass") {
    throw new LocalSliceError("vp_slice_validation_not_pass");
  }

  const manifest = await jsonObject(manifestPath);
  if (manifest.manifest_version !== "1") {
    throw new LocalSliceError("unsupported_dataset_manifest_version");
  }
  if (manifest.validation_status !== "pass") {
    throw new LocalSliceError("dataset_manifest_validation_not_pass");
  }

  const selection = objectField(manifest, "selection");
  if (selection.entity !== "RADIO") {
    throw new LocalSliceError("local_executor_requires_RADIO_slice");
  }
  if (typeof selection.code !== "string" || !/^[0-9]{9}$/.test(selection.code)) {
    throw new LocalSliceError("invalid_local_RADIO_code");
  }
  if (manifest.identity_scope !== "RADIO" || manifest.scope_field !== "XRADIO") {
    throw new LocalSliceError("unsupported_local_identity_contract");
  }

  const semanticHash = manifest.semantic_hash;
  if (typeof semanticHash !== "string" || semanticHash.length !== 64) {
    throw new LocalSliceError("invalid_manifest_semantic_hash");
  }
  const manifestWithoutHash = { ...manifest };
  delete manifestWithoutHash.semantic_hash;
  if (sha256Canonical(manifestWithoutHash) !== semanticHash) {
    throw new LocalSliceError("dataset_manifest_semantic_hash_mismatch");
  }

  const entities = objectField(manifest, "entities");
  const paths = {
    vivienda: resolve(root, FILE_BY_ENTITY.VIVIENDA),
    hogar: resolve(root, FILE_BY_ENTITY.HOGAR),
    persona: resolve(root, FILE_BY_ENTITY.PERSONA),
  };

  for (const entity of ENTITIES) {
    const entityEntry = objectField(entities, entity);
    const artifact = objectField(entityEntry, "artifact");
    const expectedPath = FILE_BY_ENTITY[entity];
    if (artifact.path !== expectedPath) {
      throw new LocalSliceError(
        `unexpected_artifact_path:${entity}:${String(artifact.path)}`,
      );
    }

    const actualPath =
      entity === "VIVIENDA"
        ? paths.vivienda
        : entity === "HOGAR"
          ? paths.hogar
          : paths.persona;
    const info = await stat(actualPath).catch(() => null);
    if (!info?.isFile()) {
      throw new LocalSliceError("missing_parquet:" + expectedPath);
    }

    if (typeof artifact.sha256 !== "string" || artifact.sha256.length !== 64) {
      throw new LocalSliceError("invalid_artifact_sha256:" + entity);
    }
    const actualHash = await sha256File(actualPath);
    if (actualHash !== artifact.sha256) {
      throw new LocalSliceError("artifact_hash_mismatch:" + entity);
    }
  }

  return {
    root,
    paths,
    manifest_semantic_hash: semanticHash,
    radio_code: selection.code,
  };
}
