import { describe, expect, it } from "vitest";
import {
  qualificationForQuery,
  qualificationForTarget,
} from "../src/core/index.js";
import { GOLDEN_QUESTIONS } from "./golden-questions.js";

function golden(fragment: string) {
  const item = GOLDEN_QUESTIONS.find((candidate) =>
    candidate.question.includes(fragment),
  );
  if (!item) throw new Error("missing golden: " + fragment);
  return item.expected;
}

describe("C0 qualification registry", () => {
  it("does not overclaim Redatam SHARE", () => {
    expect(
      qualificationForTarget(
        golden("porcentaje de hogares alquila"),
        "redatam",
      ).status,
    ).toBe("derived_from_radio_qualified");
  });

  it("marks representative Redatam count/average as radio-qualified", () => {
    expect(
      qualificationForTarget(golden("mujeres de 20 a 29"), "redatam").status,
    ).toBe("radio_qualified");
    expect(
      qualificationForTarget(golden("edad promedio"), "redatam").status,
    ).toBe("radio_qualified");
  });

  it("keeps variable-breakdown empirical claims bounded", () => {
    expect(
      qualificationForTarget(golden("por sexo registrado"), "redatam").status,
    ).toBe("compiler_tested");
  });

  it("reports all three targets for every golden query", () => {
    for (const item of GOLDEN_QUESTIONS) {
      const targets = qualificationForQuery(item.expected);
      expect(targets.map((entry) => entry.target)).toEqual([
        "sql_local",
        "redatam",
        "indec_web",
      ]);
    }
  });
});
