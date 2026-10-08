# AGENTS.md

## Purpose

This repository owns the semantic-query product layer for Argentina's 2022 Census.

It consumes facts/contracts from the Census adapter and generic RXDB extractor, but it does not own extraction mechanics or Census-source custody.

## Non-negotiable invariants

1. CensusQuery is the sole authoritative representation of statistical meaning.
2. A future LLM may emit SemanticIntent; it must not emit executable SQL, Redatam Process code, joins, Census variable identifiers, or category codes.
3. Census identifiers are introduced only by deterministic catalog resolution.
4. SQL, Redatam Process, and INDEC Web recipes are deterministic projections of the same validated CensusQuery.
5. v1 performs no SQL execution, no Redatam execution, no remote INDEC submission, and returns no statistical result.
6. Ambiguity is an explicit product state. Do not force every question into a query.
7. Unsupported questions fail closed.
8. The core under src/core must not depend on Next.js, React, an AI SDK, or a model provider.
9. Do not present target/future behavior as implemented.
10. Do not imply INDEC endorsement or official validation.

## Contract changes

Changes to versioned schemas under src/core/contracts are product-contract changes.

Before changing them:

- update the relevant document under docs/spec;
- add or update fixtures/tests;
- prefer additive evolution or a new contract version over silent semantic reinterpretation.

## Development boundary

The commissioned vertical currently ends at copyable compilation artifacts. Do not introduce databases, query executors, microdata storage, result tables, charts, maps, accounts, or query history without an explicit later decision.
