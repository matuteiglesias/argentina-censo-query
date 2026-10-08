import {
  InterpretationResultSchema,
  resolveSemanticIntent,
  type CensusCatalog,
  type InterpretationResult,
  type SemanticIntent,
} from "../../core/index.js";
import { ProviderInterpretationEnvelopeSchema } from "./contract.js";
import type { SemanticLexicon } from "./types.js";
import { InterpreterError } from "./types.js";

function invalid(message: string): never {
  throw new InterpreterError("semantic_validation", message);
}

function variableForConcept(lexicon: SemanticLexicon, concept: string) {
  return lexicon.variables.find((variable) =>
    [...variable.concepts, ...variable.aliases].includes(concept),
  );
}

function assertIntentUsesLexicon(intent: SemanticIntent, lexicon: SemanticLexicon): void {
  if (![...lexicon.universe.concepts, ...lexicon.universe.aliases].includes(intent.universe_concept)) {
    invalid("model returned an unknown universe concept");
  }

  const entityConcepts = new Set(
    lexicon.entities.flatMap((entity) => [...entity.concepts, ...entity.aliases]),
  );
  if (!entityConcepts.has(intent.measure.entity_concept)) {
    invalid("model returned an unknown entity concept");
  }

  const assertPredicate = (predicate: {
    variable_concept: string;
    value:
      | { kind: "literal"; value: string | number | boolean }
      | { kind: "concept"; concept: string }
      | Array<
          | { kind: "literal"; value: string | number | boolean }
          | { kind: "concept"; concept: string }
        >;
  }) => {
    const variable = variableForConcept(lexicon, predicate.variable_concept);
    if (!variable) invalid("model returned an unknown variable concept");
    const atoms = Array.isArray(predicate.value) ? predicate.value : [predicate.value];
    for (const atom of atoms) {
      if (atom.kind === "concept" && !variable.categories.some((category) =>
        [...category.concepts, ...category.aliases].includes(atom.concept),
      )) {
        invalid("model returned an unknown category concept");
      }
    }
  };

  if (intent.measure.type === "average") {
    if (!variableForConcept(lexicon, intent.measure.variable_concept)) {
      invalid("model returned an unknown average variable concept");
    }
  }
  if (intent.measure.type === "share") {
    assertPredicate(intent.measure.condition);
  }
  for (const predicate of intent.filters) assertPredicate(predicate);

  if (intent.breakdown?.type === "geography") {
    if (!lexicon.geographies.some((geography) =>
      [...geography.concepts, ...geography.aliases].includes(intent.breakdown?.concept ?? ""),
    )) {
      invalid("model returned an unknown geography concept");
    }
  } else if (intent.breakdown?.type === "variable") {
    if (!variableForConcept(lexicon, intent.breakdown.concept)) {
      invalid("model returned an unknown breakdown variable concept");
    }
  }
}

export function normalizeProviderEnvelope(
  raw: unknown,
  question: string,
  catalog: CensusCatalog,
  lexicon: SemanticLexicon,
): InterpretationResult {
  let parsed;
  try {
    parsed = ProviderInterpretationEnvelopeSchema.parse(raw);
  } catch (error) {
    throw new InterpreterError(
      "malformed_output",
      "provider output failed the strict envelope schema",
    );
  }

  const result = InterpretationResultSchema.parse(parsed.interpretation);
  const originalQuestion =
    result.status === "candidate"
      ? result.intent.original_question
      : result.original_question;
  if (originalQuestion !== question.trim()) {
    invalid("model returned a different original question");
  }

  if (result.status === "candidate") {
    assertIntentUsesLexicon(result.intent, lexicon);
    const resolved = resolveSemanticIntent(result.intent, catalog);
    if (resolved.status !== "resolved") {
      invalid("model candidate failed deterministic catalog resolution or validation");
    }
  } else if (result.status === "needs_clarification") {
    const allowed = new Set(lexicon.clarification_option_ids);
    if (result.options.some((option) => !allowed.has(option.id))) {
      invalid("model returned an unregistered clarification option");
    }
  }

  return result;
}
