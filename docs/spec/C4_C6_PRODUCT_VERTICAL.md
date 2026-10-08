# C4–C6 — Product orchestration, local execution, reproducibility

Status: implementation specification. Base: C3 branch feat/c3-interpreter-contract (PR #7).

## C4: one authoritative submission

The web client sends a question to POST /api/query. On the server:
1. Interpret through the configured SemanticInterpreter (Golden by default).
2. For candidates, resolve via catalog and B3; reject unresolved candidates.
3. Compile one CompilationBundle, describe the query, calculate its stable cq- ID, and get all qualification claims from the registry.
4. Return either ready, needs_clarification, or unsupported. Clarification/unsupported never return query, code, or result.
5. Treat provider failures as errors, not user ambiguity. No broad exception swallow.

POST /api/interpret remains available for C3 eval/diagnostics. Never allow the client to send arbitrary SQL.

## C5: explicit local-only experimental execution

- POST /api/run accepts only CensusQuery, revalidates/recompiles on the server, verifies dataset custody, and returns a CanonicalResult with provenance.
- Execution requires all: NODE_ENV=development, CENSO_EXECUTION_MODE=local_radio, absolute CENSO_LOCAL_SLICE_ROOT, and a loopback Host/Origin. Default and deployed production are disabled even if a slice root exists.
- Serve local mode with npm run dev -- --hostname 127.0.0.1. Do not forward this port or run the dev server on a public interface. Host/Origin checks are only defense-in-depth and cannot replace network isolation.
- Never accept SQL, a filesystem path, or a manifest from the request. No microdata rows leave the server; only bounded aggregates from compiler-generated SQL.
- Execution runs independently of interpretation, using an explicit validated CensusQuery. No automatic run on submit.
- Preserve B4's manifest and Parquet hash checks; distinguish availability/configuration from empirical qualification.
- Show a verified local RADIO code, not national coverage. Do not run with a public preview deployment.

## C6: reproducibility interface

- Present QueryDescription, SQL, Redatam Process and INDEC recipe from one server-compiled CensusQuery. Copy buttons consume the same artifacts.
- Qualification badges are populated ONLY by core qualificationForQuery.
- Show catalog, release, cq- identifier, interpreter provenance, and optional local-result manifest hash.
- Interpretive success is not evidence of source execution. Explicit empty/loading/error states.

## C7 / follow-on acceptance

- Golden deterministic flow: all 20 expected CensusQueries, supported bundles, 4 negative outcomes, unsafe acceptance zero.
- Test fail-closed API inputs and local execution policy; synthetic verified-slice run; tampered manifest; absent local configuration; production block.
- Run npm ci && npm run check, then E2E/browser smoke for golden, clarification, copy, preview-disabled execution and local RADIO result. Record actual results, do not claim tests that were not run.
- Model live eval remains separate C3 qualification pending credentials.
- Public preview deployment optional and compile-only; no new database, auth, history, agent framework, maps or national microdata hosting.
