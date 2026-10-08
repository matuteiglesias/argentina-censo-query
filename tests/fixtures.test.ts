import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CensusQuerySchema,
  SemanticIntentSchema,
} from "../src/core/index.js";

const ROOT = new URL("./fixtures/", import.meta.url);

function readJson(path: URL): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

describe("persisted contract fixtures", () => {
  it("valid fixtures parse", () => {
    const validDir = new URL("valid/", ROOT);
    for (const name of readdirSync(validDir)) {
      const path = new URL(name, validDir);
      const payload = readJson(path);
      const schema = name.startsWith("semantic-intent")
        ? SemanticIntentSchema
        : CensusQuerySchema;
      expect(() => schema.parse(payload), basename(path.pathname)).not.toThrow();
    }
  });

  it("invalid fixtures fail closed", () => {
    const invalidDir = new URL("invalid/", ROOT);
    for (const name of readdirSync(invalidDir)) {
      const path = new URL(name, invalidDir);
      const payload = readJson(path);
      const schema = name.startsWith("semantic-intent")
        ? SemanticIntentSchema
        : CensusQuerySchema;
      expect(() => schema.parse(payload), basename(path.pathname)).toThrow();
    }
  });
});
