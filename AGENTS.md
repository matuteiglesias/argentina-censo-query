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
