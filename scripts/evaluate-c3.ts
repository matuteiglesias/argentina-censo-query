import {
  GOLDEN_EDGE_CASES,
  GOLDEN_QUESTIONS,
  stableCanonicalId,
} from "../src/core/index.js";
import {
  createConfiguredSemanticInterpreter,
  interpretAndResolve,
} from "../src/server/interpreter/index.js";

const interpreter = createConfiguredSemanticInterpreter();
let exactMatches = 0;
let candidateErrors = 0;
let edgeMatches = 0;
let unsafeAcceptance = 0;
const latencies: number[] = [];
const usage = { inputTokens: 0, outputTokens: 0 };

for (const item of GOLDEN_QUESTIONS) {
  try {
    const run = await interpretAndResolve(item.question, interpreter);
    if (run.result.status === "candidate" && run.query) {
      if (stableCanonicalId("cq", run.query) === stableCanonicalId("cq", item.expected)) {
        exactMatches += 1;
      } else {
        unsafeAcceptance += 1;
      }
    } else {
      candidateErrors += 1;
    }
    latencies.push(run.provenance.latencyMs);
    usage.inputTokens += run.provenance.inputTokens ?? 0;
    usage.outputTokens += run.provenance.outputTokens ?? 0;
  } catch {
    candidateErrors += 1;
  }
}

for (const item of GOLDEN_EDGE_CASES) {
  try {
    const run = await interpretAndResolve(item.question, interpreter);
    if (run.result.status === item.expected.status) edgeMatches += 1;
    if (run.result.status === "candidate") unsafeAcceptance += 1;
    latencies.push(run.provenance.latencyMs);
  } catch {
    // Provider failures are reported separately from semantic outcomes.
  }
}

console.log(JSON.stringify({
  provider: interpreter.constructor.name,
  goldens: { total: GOLDEN_QUESTIONS.length, exact_matches: exactMatches, candidate_errors: candidateErrors },
  negatives: { total: GOLDEN_EDGE_CASES.length, expected_status_matches: edgeMatches, unsafe_acceptance: unsafeAcceptance },
  latency_ms: latencies.length ? { min: Math.min(...latencies), max: Math.max(...latencies) } : null,
  usage,
}, null, 2));
