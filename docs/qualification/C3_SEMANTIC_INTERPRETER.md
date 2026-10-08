# C3 — Semantic Interpreter qualification

## Implemented scope

- Branch: `feat/c3-interpreter-contract`
- Base `main` reviewed: `690f386`
- PR updated: `#7`
- Server-only `SemanticInterpreter` interface and `InterpreterRun` provenance seam.
- Existing `InterpretationResult`, `SemanticIntent`, resolver, and B3 validator remain authoritative.
- Deterministic GoldenInterpreter remains the default when `C3_INTERPRETER_PROVIDER` is absent.
- Direct `@google/genai` adapter only; no ADK, Azure, tools, memory, RAG, database, or remote Census execution.
- Optional evaluator: `npm run eval:c3`.

## Trust-boundary checks

The catalog-derived prompt lexicon contains only semantic concepts, human labels, aliases, supported operators, grammar, and clarification option IDs. It omits source variable identifiers, geography identifiers, category codes, SQL, Redatam, and INDEC instructions. A stable SHA-256 digest is attached to the lexicon and provider provenance.

Provider output is a strict root envelope with `interpretation` and a tagged union. Local Zod parsing rejects unknown keys, malformed intent, identifiers, fabricated concepts, unregistered clarification options, and candidates that fail deterministic resolution/B3. Provider failures are typed separately from clarification and unsupported outcomes.

## Deterministic evidence

`npm run eval:c3` with the default GoldenInterpreter produced:

```text
20/20 exact final CensusQuery matches
0 candidate errors
4/4 expected clarification/unsupported statuses
0 unsafe acceptance
```

The unit suite covers lexicon stability/exclusions, default-provider policy, all 20 B8 candidates, all four negative cases, strict envelope normalization, identifier/fabricated-concept rejection, Google structured-output settings, and provider configuration boundaries.

## Repository checks

- `npm ci`: PASS with the committed lockfile.
- `npm run check`: PASS — TypeScript, 14 test files passed / 3 skipped, 118 tests passed / 15 skipped, and Next production build passed.
- `npm run eval:c3`: PASS in deterministic mode with the result above.
- Live provider evaluation: NOT RUN; neither `GEMINI_API_KEY` nor another Google credential was available.

## Google GenAI adapter

Google mode is activated only with:

```text
C3_INTERPRETER_PROVIDER=google
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash-lite   # optional
```

The adapter applies a 1,000-character question limit, 32,000-character prompt limit, 700 output-token ceiling, 15-second timeout, temperature zero, one candidate, JSON structured output, and at most one bounded transient retry. It records model/request/usage/latency metadata without storing prompts or credentials.

No Google credentials were available in this qualification environment, so no live provider call, latency, token, or model-accuracy claim is made. The public preview remains compile-only and the existing C1 UI remains GoldenInterpreter-backed.
