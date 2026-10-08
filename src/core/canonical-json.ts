import { createHash } from "node:crypto";

type JsonPrimitive = null | boolean | number | string;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

function normalize(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("canonical JSON does not support non-finite numbers");
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(normalize);
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const entries = Object.entries(record)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, normalize(item)] as const);
    return Object.fromEntries(entries) as { [key: string]: JsonValue };
  }

  throw new TypeError("unsupported canonical JSON value: " + typeof value);
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(normalize(value));
}

export function sha256Canonical(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}


export function stableCanonicalId(
  prefix: string,
  value: unknown,
  hashLength = 20,
): string {
  if (!/^[a-z][a-z0-9-]*$/.test(prefix)) {
    throw new TypeError("stable ID prefix must be a canonical lowercase slug");
  }
  if (!Number.isInteger(hashLength) || hashLength < 12 || hashLength > 64) {
    throw new RangeError("stable ID hash length must be an integer from 12 to 64");
  }
  return prefix + "-" + sha256Canonical(value).slice(0, hashLength);
}
