import type { InterpretationResult } from "../contracts/interpretation.js";

type EdgeOutcome = Exclude<InterpretationResult, { status: "candidate" }>;

export type GoldenEdgeCase = {
  question: string;
  expected: EdgeOutcome;
};

export const GOLDEN_EDGE_CASES: GoldenEdgeCase[] = [
  {
    question: "¿Cuántos universitarios hay?",
    expected: {
      status: "needs_clarification",
      original_question: "¿Cuántos universitarios hay?",
      reason_code: "ambiguous_concept",
      prompt:
        "¿Te referís a personas que actualmente cursan nivel universitario o a otra definición de universitario?",
      options: [
        {
          id: "currently-attending-university",
          label: "Actualmente cursan nivel universitario",
        },
        {
          id: "other-university-definition",
          label: "Otra definición",
          description:
            "La versión actual no modela todavía todas las nociones de nivel máximo alcanzado.",
        },
      ],
    },
  },
  {
    question: "Compará este censo con el Censo 2010",
    expected: {
      status: "unsupported",
      original_question: "Compará este censo con el Censo 2010",
      reason_code: "outside_grammar",
      message: "La versión actual sólo modela Censo 2022 VP.",
    },
  },
  {
    question: "Hacé una regresión entre edad y educación",
    expected: {
      status: "unsupported",
      original_question: "Hacé una regresión entre edad y educación",
      reason_code: "outside_grammar",
      message: "Los modelos estadísticos están fuera de la gramática v1.",
    },
  },
  {
    question: "Explicame por qué una provincia tiene más hogares alquilados",
    expected: {
      status: "unsupported",
      original_question:
        "Explicame por qué una provincia tiene más hogares alquilados",
      reason_code: "requires_results_analysis",
      message:
        "La interpretación narrativa de resultados está fuera del producto v1.",
    },
  },
];

function normalizeQuestion(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("es")
    .replace(/\s+/g, " ");
}

export function findGoldenEdgeCase(question: string) {
  const normalized = normalizeQuestion(question);
  return GOLDEN_EDGE_CASES.find(
    (item) => normalizeQuestion(item.question) === normalized,
  );
}
