import { describe, expect, it } from "vitest";
import { contractSchemaDigests } from "../src/core/index.js";

const EXPECTED_SCHEMA_DIGESTS = {
  CensusCatalog: "__PENDING__",
  CensusQuery: "__PENDING__",
  CompilationBundle: "__PENDING__",
  CompilationContext: "__PENDING__",
  InterpretationResult: "__PENDING__",
  QueryValidationResult: "__PENDING__",
  SemanticIntent: "__PENDING__",
};

describe("contract JSON schema snapshots", () => {
  it("remain stable until an explicit contract change", () => {
    const actual = contractSchemaDigests();
    console.log("SCHEMA_DIGESTS=" + JSON.stringify(actual));
    expect(actual).toEqual(EXPECTED_SCHEMA_DIGESTS);
  });
});
