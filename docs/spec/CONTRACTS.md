# B0 — Typed contract spine

B0 implements the versioned structural contracts used by later phases.

## Contracts

### SemanticIntent

Concept-level representation intended for a future structured-output model.

It contains semantic concept IDs, literal values and operators, but no raw Census variable identifiers or category codes.

### InterpretationResult

A discriminated union:

- candidate;
- needs_clarification;
- unsupported.

Ambiguity and unsupported requests are first-class states.

### CensusQuery

Resolved canonical statistical AST.

It contains Census identifiers and is the sole authority from which targets may be compiled.

### CensusCatalog

Typed shape for B1 catalog contents:

- entities;
- variables;
- categories;
- geographies;
- support/anomaly state.

B0 defines the shape; B1 supplies scientifically reviewed contents.

### CompilationContext

Names the catalog and source/release assumptions used for compilation. It is intentionally not an "execution context" because v1 executes nothing.

### CompilationBundle

Contains:

- original question;
- human-readable interpretation;
- canonical CensusQuery;
- compilation context;
- SQL artifact;
- Redatam Process artifact;
- INDEC Web recipe.

No timestamp is required in the core bundle so canonical serialization can remain deterministic.

## Determinism

canonicalJson() recursively sorts object keys while preserving array order.

sha256Canonical() gives later phases a stable primitive for query/bundle IDs and regression fixtures.

## Deliberately not implemented in B0

B0 does not decide whether a concept resolves to a specific Census variable, whether a relationship path is valid, or whether three compiled targets are semantically equivalent.

Those are B1/B2/compiler responsibilities.
