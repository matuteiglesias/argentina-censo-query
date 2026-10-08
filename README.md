# argentina-censo-query

Contract-first semantic query compiler for Argentina's 2022 Census.

The product turns a natural-language statistical question into an explicit, inspectable interpretation and then compiles one canonical CensusQuery into three copyable artifacts:

1. SQL targeting a documented logical relational schema;
2. Redatam Process code;
3. an INDEC Redatam WebServer reproduction recipe.

**The v1 product does not execute SQL, execute Redatam, connect to Census microdata, or return statistical results.**

## Architectural invariant

~~~text
human question
     ↓
SemanticIntent          ← future LLM output, concepts only
     ↓
catalog resolution
     ↓
CensusQuery             ← only authoritative statistical interpretation
     ↓
semantic validation
     ↓
deterministic compilers
  ┌──────┼──────────────┐
  ↓      ↓              ↓
 SQL  Redatam      INDEC Web recipe
copy    copy             copy
~~~

The model may propose semantic intent. It may not write or modify target-language SQL, Redatam code, Census identifiers, joins, or category codes directly.

## Current development status

Implemented:

- A0 product contract;
- A1 claim boundaries;
- A2 supported grammar;
- B1 typed contract spine + fixture/schema stability gates;
- B2 evidence-backed CensusCatalog v0 + deterministic resolver;
- B3 semantic query validator.

Catalog v0 intentionally covers a small cross-target semantic core, not the full Census dictionary.

Not implemented yet:

- SQL compiler;
- Redatam analytical compiler;
- INDEC Web recipe compiler;
- LLM interpreter;
- Next.js UI;
- any query execution.

See docs/spec.

## Core development

~~~bash
npm install
npm run check
~~~

The core is deliberately framework-independent. Next.js and model-provider code must remain outside src/core.
