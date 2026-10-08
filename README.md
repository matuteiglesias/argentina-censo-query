# argentina-censo-query

Contract-first semantic query compiler for Argentina's 2022 Census.

The product turns a natural-language statistical question into an explicit, inspectable interpretation and then projects one canonical CensusQuery into:

1. SQL targeting a documented logical relational schema;
2. Redatam Process code;
3. an INDEC Redatam WebServer reproduction recipe.

The public product remains compilation-first. A separate local-development executor can run the compiler-generated SQL against an explicitly supplied, verified VP RADIO Parquet slice for scientific qualification.

## Architectural invariant

~~~text
human question
     ↓
SemanticIntent          ← future LLM output, concepts only
     ↓
catalog resolution
     ↓
CensusQuery             ← sole authoritative statistical interpretation
     ↓
semantic validation
     ↓
deterministic projections
  ┌──────────┼──────────────┐
  ↓          ↓              ↓
 SQL      Redatam      INDEC Web recipe
  │         copy             copy
  │
  └─ optional local B4 qualification
     verified RADIO Parquet → in-memory DuckDB
~~~

The model may propose semantic intent. It may not write or modify target-language SQL, Redatam code, Census identifiers, joins, or category codes directly.

## Current development status

Implemented:

- A0 product contract;
- A1 claim boundaries;
- A2 supported grammar;
- B1 typed contract spine + fixture/schema stability gates;
- B2 evidence-backed CensusCatalog v0 + deterministic resolver;
- B3 semantic query validator;
- B4 deterministic SQL compiler plus read-only local VP RADIO executor;
- B5 deterministic Redatam Process compiler;
- B6 deterministic INDEC WebServer recipe compiler.

Cloud CI qualifies B4 against synthetic real Parquet and compiles all current golden CensusQueries through B5/B6.

Still requiring the authorized local environment before stronger empirical claims:

- B4 against permanent real RADIO 061471101;
- B5 live RedEngine execution/equivalence against the same RADIO;
- B6 bounded manual WebServer reproduction smoke.

Not implemented yet:

- LLM interpreter;
- Next.js UI;
- hosted/national Census query execution;
- remote Redatam/INDEC submission.

See docs/spec.

## Core development

~~~bash
npm install
npm run check
~~~

The semantic core under src/core is framework-independent. DuckDB/local-filesystem code lives under src/local.

## Real RADIO qualification

When an authorized validated slice for permanent RADIO 061471101 is available locally:

~~~bash
export CENSO_VP_RADIO_061471101_SLICE=/absolute/path/to/the/slice
npm test -- tests/local-real-radio.test.ts
~~~

Expected qualified counts are 73 VIVIENDA, 56 HOGAR, and 137 PERSONA. See docs/spec/LOCAL_CODEX_HANDOFF.md for the complete B4/B5/B6 local gate.
