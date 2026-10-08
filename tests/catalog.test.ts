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

  it("keeps AESC visible but non-queryable until Ignorado semantics are modeled", () => {
    const variable = CPV2022_VP_CATALOG_V0.variables.find(
      (item) => item.id === "PERSONA.AESC",
    );
    expect(variable?.status).toBe("experimental");
    expect(variable?.allowed_operators).toEqual([]);
    expect(variable?.supports_average).toBe(false);
    expect(variable?.anomaly).toMatch(/99.*Ignorado/i);
  });

  it("rejects ambiguous category aliases inside one variable", () => {
    const broken = structuredClone(CPV2022_VP_CATALOG_V0);
    const man = broken.categories.find(
      (item) => item.variable === "PERSONA.P02" && item.code === 2,
    );
    man!.aliases.push("mujer");
    expect(checkCatalog(broken).issues.map((item) => item.code)).toContain(
      "ambiguous_category_term",
    );
  });

  it("rejects multiple parents for one entity", () => {
    const broken = structuredClone(CPV2022_VP_CATALOG_V0);
    broken.relationships.push({
      child: "PERSONA",
      parent: "VIVIENDA",
      kind: "belongs_to",
      evidence_ids: ["adapter-vp-contract"],
    });
    expect(checkCatalog(broken).issues.map((item) => item.code)).toContain(
      "multiple_entity_parents",
    );
  });

  it("rejects ambiguous variable aliases", () => {
    const broken = structuredClone(CPV2022_VP_CATALOG_V0);
    broken.variables[1]!.aliases.push("edad");
    expect(checkCatalog(broken).issues.map((item) => item.code)).toContain(
      "ambiguous_variable_term",
    );
  });
});
