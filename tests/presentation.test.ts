import { describe, expect, it } from "vitest";
import {
  CPV2022_VP_CATALOG_V0,
  describeCensusQuery,
} from "../src/core/index.js";
import { GOLDEN_QUESTIONS } from "./golden-questions.js";

describe("deterministic query presentation", () => {
  it("renders the canonical women-age query without a free semantic channel", () => {
    const query = GOLDEN_QUESTIONS[0]!.expected;
    const description = describeCensusQuery(query, CPV2022_VP_CATALOG_V0);
    expect(description.universe).toContain("VP");
    expect(description.measure).toMatch(/cantidad/i);
    expect(description.filters.join("\n")).toMatch(/Sexo registrado al nacer = Mujer/);
    expect(description.filters.join("\n")).toMatch(/Edad entre 20 y 29/);
    expect(description.breakdown).toBe("Provincia");
  });
});
