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
deterministic compilers
  ┌──────┼──────────────┐
  ↓      ↓              ↓
 SQL  Redatam      INDEC Web recipe
copy    copy             copy
~~~

The model may propose semantic intent. It may not write or modify target-language SQL, Redatam code, Census identifiers, joins, or category codes directly.

## Current development status

Implemented in the first contract slice:

- A0 product contract;
- A1 claim boundaries;
- A2 supported grammar;
- B0 typed contract spine using TypeScript + Zod.

Not implemented yet:

- semantic catalog contents;
- deterministic resolver/validator;
- SQL compiler;
- Redatam analytical compiler;
- INDEC Web recipe compiler;
- LLM interpreter;
- Next.js UI.

See docs/spec/PRODUCT.md.

## Core development

~~~bash
npm install
npm run check
~~~

The core is deliberately framework-independent. Next.js and model-provider code must remain outside src/core.
