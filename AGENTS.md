# AGENTS.md

## Purpose

This repository owns the semantic-query product layer for Argentina's 2022 Census.

It consumes facts/contracts from the Census adapter and generic RXDB extractor, but it does not own extraction mechanics or Census-source custody.

## Non-negotiable invariants

1. CensusQuery is the sole authoritative representation of statistical meaning.
2. A future LLM may emit SemanticIntent; it must not emit executable SQL, Redatam Process code, joins, Census variable identifiers, or category codes.
3. Census identifiers are introduced only by deterministic catalog resolution.
4. SQL, Redatam Process, and INDEC Web recipes are deterministic projections of the same validated CensusQuery.
5. B4 may execute compiler-generated SQL only against an explicitly supplied, locally verified VP RADIO slice. No arbitrary SQL, hosted Census database, Redatam execution, or remote INDEC submission is authorized.
6. B5 generates Redatam Process source only. B6 generates manual INDEC WebServer reproduction instructions only.
7. Ambiguity is an explicit product state. Do not force every question into a query.
8. Unsupported questions fail closed.
9. The core under src/core must not depend on Next.js, React, an AI SDK, a model provider, DuckDB, or local filesystem state.
10. Do not present cloud/synthetic qualification as real-source equivalence.
11. Do not imply INDEC endorsement or official validation.
12. CanonicalResult is the only cross-engine equality surface; compare normalized statistical values, not target-language strings.
13. Product/UI qualification badges must come from src/core/qualification/registry.ts. Do not hard-code a stronger claim in React or prose.
14. The C1 GoldenInterpreter is temporary deterministic scaffolding. It must never silently generalize unknown natural-language questions.

## Contract changes

Changes to versioned schemas under src/core/contracts are product-contract changes.

Before changing them:

- update the relevant document under docs/spec;
- add or update fixtures/tests;
- prefer additive evolution or a new contract version over silent semantic reinterpretation.

## Development boundary

The public product remains compilation-first: interpretation plus copyable SQL, Redatam Process, and INDEC Web instructions.

A separately owned local-development surface under src/local may:

- verify an existing rxdb-extractor VP RADIO slice;
- mount its Parquet files read-only into in-memory DuckDB;
- execute only SQL produced by the validated deterministic compiler;
- return bounded local results for qualification/equivalence work.

Do not introduce:

- a hosted Census database or microdata service;
- arbitrary user SQL execution;
- remote Redatam/INDEC execution;
- microdata uploads;
- persistent result storage/history;
- maps/charts/accounts;
- source extraction mechanics duplicated from rxdb-extractor.

## C4–C6 product boundary

- `POST /api/query` is the primary user-facing operation. Only the server may resolve, validate and compile; no SQL/code from browser or provider reaches B4.
- `POST /api/run` is a development-only loopback research surface requiring both `CENSO_EXECUTION_MODE=local_radio` and an absolute `CENSO_LOCAL_SLICE_ROOT`. It must be absent in production mode. Never forward an enabled local dev server to other machines.
- The run endpoint revalidates a canonical CensusQuery, rechecks slice custody and returns only a CanonicalResult + verified RADIO provenance, never source microdata or source paths.
- The interpretation response does not prove data execution. Qualification badges must continue to come from the query-sensitive registry.
