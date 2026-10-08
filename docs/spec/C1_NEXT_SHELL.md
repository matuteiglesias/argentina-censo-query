# C1 — Next.js shell

C1 creates the first real product surface without an LLM.

## Stack

- Next.js App Router;
- React + TypeScript strict;
- existing Zod/core contracts;
- no database;
- no auth;
- no persisted conversations.

## Temporary interpreter

C1 deliberately uses the B8 golden corpus as a deterministic interpreter.

If a question exactly matches one of the twenty supported golden questions, the application renders the real:

~~~text
CensusQuery
→ deterministic interpretation
→ SQL
→ Redatam
→ INDEC recipe
→ qualification/provenance
~~~

If it matches a golden ambiguity/unsupported case, the shell renders that outcome.

Any other question says that the free semantic interpreter is not connected yet.

This is intentional: C1 must prove the complete deterministic vertical before C3 introduces model uncertainty.

## Execution

The web shell does not mount Census microdata and does not pretend to return national results.

Its Results panel states that B4 remains a local, verified-slice execution surface. The Run button is disabled until an explicit later execution profile is commissioned.

## Gate

C1 passes when:

- strict TypeScript passes;
- core tests pass;
- Next production build passes;
- all 20 supported golden questions produce a UI-ready model;
- interpretation, result state, reproducibility and provenance are all visible without an LLM.
