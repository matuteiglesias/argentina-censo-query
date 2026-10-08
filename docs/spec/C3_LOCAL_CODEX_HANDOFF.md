# C3 local Codex completion handoff

Work on branch feat/c3-interpreter-contract; read AGENTS.md and docs/spec/C3_SEMANTIC_INTERPRETER.md first. Inspect current src/core contracts, catalog, resolver, B8 corpus, src/server, Next.js UI and tests before editing. Preserve all existing contracts and C0/C1 behavior.

1. Identify the actual GoldenInterpreter and orchestration entrypoints. Add a small server-only SemanticInterpreter interface and model policy. Reuse existing InterpretationResult and SemanticIntent, do not create duplicate product contracts.
2. Add deterministic semantic lexicon generator from queryable catalog entries; exclude source variable IDs and codes. Unit-test exclusions and stable digest.
3. Add strict, provider-portable structured-output envelope with local Zod validation and explicit normalization. Reject unknown keys, identifiers, invalid categories and fabricated concepts; model errors must be separate from clarification.
4. Implement one direct Google GenAI adapter (no ADK, no Azure, no new service), opt-in via server environment variables. Set input, timeout and output ceilings; capture bounded provenance without storing prompts. Keep GoldenInterpreter as default if unconfigured.
5. Integrate into existing server orchestration with explicit provider selection; never let provider types leak into src/core or client. Do not enable local execution in public preview.
6. Add deterministic unit tests and an opt-in live evaluation CLI reusing B8. Exact-match final CensusQuery; report negative cases, failure rates, latency, usage. Do not hard-code a vendor/model winner.
7. Run npm ci and npm run check; run live eval only if credentials are available; never print secrets. Record tested commit, checks and remaining limitations in PR. Open PR for review, do not merge automatically.

Acceptance: compile-only preview works with no API key; 20 goldens remain exact in fixture mode; unknown concepts fail closed; explicit ambiguity never becomes confident query; no SQL/Redatam/INDEC generation by model; provider failure does not corrupt canonical state. Do not claim live validation unless actually measured.
