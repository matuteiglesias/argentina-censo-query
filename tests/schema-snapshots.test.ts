import { describe, expect, it } from "vitest";
import { contractSchemaDigests } from "../src/core/index.js";

const EXPECTED_SCHEMA_DIGESTS = {
  CensusCatalog: "cadf73cc14840f6993e81b930212beef55fad4624431e783234a28be31a14197",
  CensusQuery: "c70e61fae2268d69ddde49e194096ad9b100bed6b18cf609b26aa6545371628d",
  Clarification: "edeef0735f47b5adde5d619a4258f9675fbd7fe20f6db97bc9ec83f872345f45",
  CompilationBundle: "b9809397099144a5583edd7fc51566b31a14dc904fd89b655a5ba255e47e69d8",
  CompilationContext: "926f8d5d961311d0d2a6f20dabed154c48a8adf9ae1cc68bc8e42b4b0e8847ca",
  CompilationTarget: "9c7de0e071af0075a0b09f6a30ba15080d9b8dd811cbf316c21e4cb1562748a0",
  InterpretationResult: "130c608e4c9551246f212e885609f5dff0ce0bb6465dea1de8cd2a86d7a4166a",
  QueryValidationResult: "43bc42dd0049daef94304332d41c91b8d0b87a570764e51fe58a1a26e0e07a77",
  SemanticIntent: "864f3721501618466093fadff84c733aae0e632405060a0704934075b79f36cc",
};

describe("contract JSON schema snapshots", () => {
  it("remain stable until an explicit contract change", () => {
    expect(contractSchemaDigests()).toEqual(EXPECTED_SCHEMA_DIGESTS);
  });
});
