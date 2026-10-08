import {
  CPV2022_VP_CATALOG_V0,
  GOLDEN_EDGE_CASES,
  GOLDEN_QUESTIONS,
  type InterpretationResult,
} from "../../core/index.js";
import { buildSemanticLexicon } from "./lexicon.js";
import type {
  InterpreterContext,
  InterpreterRun,
  SemanticInterpreter,
} from "./types.js";

function normalizeQuestion(value: string): string {
  return value.trim().toLocaleLowerCase("es").replace(/\s+/g, " ");
}

export class GoldenInterpreter implements SemanticInterpreter {
  async interpret(
    question: string,
    _context: InterpreterContext,
  ): Promise<InterpreterRun> {
    const normalized = normalizeQuestion(question);
    const supported = GOLDEN_QUESTIONS.find(
      (item) => normalizeQuestion(item.question) === normalized,
    );
    const edge = GOLDEN_EDGE_CASES.find(
      (item) => normalizeQuestion(item.question) === normalized,
    );
    const result: InterpretationResult = supported
      ? { status: "candidate", intent: supported.intent }
      : edge
        ? edge.expected
        : {
            status: "unsupported",
            original_question: question.trim(),
            reason_code: "unknown_concept",
            message: "La pregunta no coincide con una interpretación semántica calificada.",
          };

    return {
      result,
      provenance: {
        provider: "golden",
        promptVersion: "golden-corpus/v1",
        adapterVersion: "golden-interpreter/v1",
        schemaDigest: buildSemanticLexicon(CPV2022_VP_CATALOG_V0).digest,
        latencyMs: 0,
      },
    };
  }
}
