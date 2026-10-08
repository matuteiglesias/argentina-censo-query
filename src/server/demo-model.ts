import {
  CPV2022_VP_CATALOG_V0,
  GOLDEN_EDGE_CASES,
  GOLDEN_QUESTIONS,
  compileBundle,
  describeCensusQuery,
  qualificationForQuery,
  stableCanonicalId,
  type CompilationBundle,
  type InterpretationResult,
  type Qualification,
  type QueryDescription,
} from "../core/index.js";

export type SupportedDemo = {
  kind: "supported";
  question: string;
  interpretation: QueryDescription;
  bundle: CompilationBundle;
  queryId: string;
  qualifications: Qualification[];
};

export type EdgeDemo = {
  kind: "edge";
  question: string;
  outcome: InterpretationResult;
};

export type DemoCase = SupportedDemo | EdgeDemo;

export function buildDemoCases(): DemoCase[] {
  const supported: SupportedDemo[] = GOLDEN_QUESTIONS.map((item) => ({
    kind: "supported",
    question: item.question,
    interpretation: describeCensusQuery(
      item.expected,
      CPV2022_VP_CATALOG_V0,
    ),
    bundle: compileBundle(
      item.question,
      item.expected,
      CPV2022_VP_CATALOG_V0,
    ),
    queryId: stableCanonicalId("cq", item.expected),
    qualifications: qualificationForQuery(item.expected),
  }));

  const edges: EdgeDemo[] = GOLDEN_EDGE_CASES.map((item) => ({
    kind: "edge",
    question: item.question,
    outcome: item.expected,
  }));

  return [...supported, ...edges];
}
