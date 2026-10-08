# C3 — bounded semantic interpreter (implementation contract)

Status: implementation handoff. C0/C1/B8 are already merged; do not rewrite them.

## Scope
One bounded question-to-InterpretationResult operation. No agent framework, tools, RAG, chat history, SQL generation, Redatam generation, Census variable identifiers, database, or remote execution. Keep existing GoldenInterpreter available as deterministic fixture fallback.

## Trust boundaries
- Core CensusQuery, catalog, resolver, B3 validator and qualification registry remain authoritative and unchanged.
- Model sees only a deterministic semantic lexicon of *queryable* concepts, categories and grammar; no PERSONA.P02/HOGAR.H22/PROV.IDPROV or category numeric codes.
- A candidate must pass local envelope parsing, normalization to existing InterpretationResult, catalog resolution and B3. Invalid/unknown concepts fail closed. No fuzzy fallback, invented aliases, or hidden defaults.
- Distinguish successful clarification/unsupported from transport timeout, provider refusal, malformed structured output, and semantic validation failures.
- Public preview remains compile-only; never infer that interpretation means execution or INDEC endorsement.

## Minimal seam
Use a server-only SemanticInterpreter interface with interpret(question, context) -> InterpreterRun. InterpreterRun contains the existing InterpretationResult and optional provider provenance. Do not change versioned core contracts to accommodate provider JSON.
Provider metadata: provider, requestedModel, servedModel?, promptVersion, adapterVersion, schemaDigest, requestId?, inputTokens?, outputTokens?, latencyMs. Never log raw user questions or credentials.

## Transport
Root object with required interpretation field. Under it a tagged union: candidate, clarification, unsupported. Prefer required nullable fields rather than provider-specific optional fields. Keep schema in provider boundary, validate locally with Zod, normalize to existing core contract. If model response contains identifiers, executable source or extra fields, reject rather than ignore.

## Provider policy
First adapter: direct Google GenAI TypeScript SDK, no ADK. Pin SDK version and model by config; require an explicit API key server-side; use structured JSON output; set timeout, input character cap, output token cap; no retries on semantic failures, at most one bounded retry on transient errors; never expose key or provider objects to client. Missing credentials must leave GoldenInterpreter working. Azure is deferred until evaluation shows a reason.

## Evaluation
Run 20 B8 goldens and separate clarification/unsupported corpus through the same pipeline. Compare resolved canonical CensusQuery, not string or JSON shape alone. Include paraphrases and adversarial ambiguous Spanish prompts. Report exact match, unsafe acceptance, clarification/unsupported accuracy, schema failures, resolver failures, latency and token usage. Repeat ambiguous cases. No model-dependent CI gate requiring secrets; deterministic fixtures and contract tests must run in CI.

## Gate
npm run check; all 20 golden questions resolve to expected CensusQuery in deterministic mode; model mode never produces executable source or catalog IDs; unknown and ambiguous cases do not compile; no regression to compilation/provenance; document live eval evidence separately. Do not mark live provider validated without running with credentials.
