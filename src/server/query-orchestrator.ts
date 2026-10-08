import {
  CPV2022_VP_CATALOG_V0,
  compileBundle,
  describeCensusQuery,
  qualificationForQuery,
  stableCanonicalId,
  type CensusCatalog,
  type CensusQuery,
  type CompilationBundle,
  type InterpretationResult,
  type Qualification,
  type QueryDescription,
} from "../core/index.js";
import {
  createConfiguredSemanticInterpreter,
  interpretAndResolve,
} from "./interpreter/orchestration.js";
import type {
  InterpreterProvenance,
  SemanticInterpreter,
} from "./interpreter/types.js";
import {
  localExecutionAvailability,
  type ExecutionAvailability,
} from "./local-execution-policy.js";

export type QuerySubmission =
  | {
      status: "ready";
      interpretation: Extract<InterpretationResult, { status: "candidate" }>;
      query: CensusQuery;
      queryId: string;
      description: QueryDescription;
      bundle: CompilationBundle;
      qualifications: Qualification[];
      provenance: InterpreterProvenance;
      execution: ExecutionAvailability;
    }
  | {
      status: "needs_clarification" | "unsupported";
      interpretation: Exclude<InterpretationResult, { status: "candidate" }>;
      provenance: InterpreterProvenance;
      execution: ExecutionAvailability;
    };

export async function submitQuestion(
  question: string,
  interpreter: SemanticInterpreter = createConfiguredSemanticInterpreter(),
  catalog: CensusCatalog = CPV2022_VP_CATALOG_V0,
  env: NodeJS.ProcessEnv = process.env,
): Promise<QuerySubmission> {
  const run = await interpretAndResolve(question, interpreter, catalog);
  const execution = localExecutionAvailability(env);
  if (run.result.status !== "candidate") {
    return {
      status: run.result.status,
      interpretation: run.result,
      provenance: run.provenance,
      execution,
    };
  }

  if (!run.query) {
    throw new Error("candidate passed resolver without CensusQuery");
  }
  const query = run.query;
  return {
    status: "ready",
    interpretation: run.result,
    query,
    queryId: stableCanonicalId("cq", query),
    description: describeCensusQuery(query, catalog),
    bundle: compileBundle(question, query, catalog),
    qualifications: qualificationForQuery(query),
    provenance: run.provenance,
    execution,
  };
}
