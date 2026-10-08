# B1 — Typed contract spine

B1 closes the versioned structural contracts used by later phases and adds explicit stability gates.

## Contracts

### SemanticIntent

Concept-level representation intended for a future structured-output model.

It contains semantic concept IDs, literal values and operators, but no raw Census variable identifiers or category codes.

### Clarification and InterpretationResult

Clarification is a public contract with a bounded reason code, a user-facing prompt and 2–5 explicit options.

InterpretationResult is a discriminated union:

- candidate;
- needs_clarification;
- unsupported.

Ambiguity and unsupported requests are first-class states.

### CensusQuery

Resolved canonical statistical AST.

It contains Census identifiers and is the sole authority from which targets and UI interpretation views may be derived.

### CensusCatalog

Typed semantic/evidence contract containing:

- source/release basis;
- evidence references;
- universe;
- entities and validated relationships;
- variables and support state;
- categories;
- geographies.

### CompilationContext

Names the catalog and source/release assumptions used for compilation. It is intentionally not an execution context because v1 executes nothing.

### CompilationTarget

An explicit discriminated union of exactly three copy targets:

- SQL;
- Redatam Process;
- INDEC Web recipe.

It contains no execution/result variant.

### CompilationBundle

Contains:

- original question;
- canonical CensusQuery;
- compilation context;
- SQL artifact;
- Redatam Process artifact;
- INDEC Web recipe.

The bundle deliberately does not store an independent free-text interpretation summary. A later UI description must be rendered deterministically from CensusQuery.

### QueryValidationResult

A fail-closed semantic validation result. Future compilers must consume only queries for which this contract reports valid=true.

## Stability gates

B1 adds three mechanical gates:

1. persisted valid fixtures must parse;
2. persisted invalid fixtures must fail closed;
3. JSON-schema digests for all public contracts must remain stable unless deliberately updated with the contract change.

## Determinism

canonicalJson() recursively sorts object keys while preserving array order.

sha256Canonical() supplies stable query, bundle and schema-digest primitives.

stableCanonicalId(prefix, value) derives a deterministic prefixed ID from canonical content. IDs therefore remain stable across object-key order and do not depend on timestamps or process state.

## Deliberately outside B1

B1 does not let a model resolve Census concepts. B2 owns the curated catalog/resolver and B3 owns semantic validation.
