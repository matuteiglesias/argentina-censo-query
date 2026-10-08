import { describe, expect, it } from "vitest";
import {
  CPV2022_VP_CATALOG_V0,
  assertCatalog,
  checkCatalog,
} from "../src/core/index.js";

describe("CensusCatalog v0", () => {
  it("is internally consistent", () => {
    expect(checkCatalog(CPV2022_VP_CATALOG_V0).issues).toEqual([]);
    expect(assertCatalog(CPV2022_VP_CATALOG_V0).catalog_id).toBe(
      "arg-cpv2022-vp-semantic-v0",
    );
  });

  it("keeps current-web-only EDAD_EDU out of the shared v0 catalog", () => {
    expect(
      CPV2022_VP_CATALOG_V0.variables.some(
        (variable) => variable.id === "PERSONA.EDAD_EDU",
      ),
    ).toBe(false);
  });

  it("preserves HNVUA as a visible blocked anomaly", () => {
    const variable = CPV2022_VP_CATALOG_V0.variables.find(
      (item) => item.id === "PERSONA.HNVUA",
    );
    expect(variable?.status).toBe("blocked");
    expect(variable?.anomaly).toMatch(/ambiguity/i);
  });

  it("rejects ambiguous variable aliases", () => {
    const broken = structuredClone(CPV2022_VP_CATALOG_V0);
    broken.variables[1]!.aliases.push("edad");
    expect(checkCatalog(broken).issues.map((item) => item.code)).toContain(
      "ambiguous_variable_term",
    );
  });
});
