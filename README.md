# argentina-censo-query

Contract-first semantic query product for Argentina's 2022 Census.

One canonical CensusQuery drives:

1. DuckDB-compatible SQL;
2. Redatam Process;
3. INDEC Redatam WebServer reproduction instructions.

The repository now also contains the first Next.js product shell. The free-form LLM interpreter is intentionally not connected yet.

## Architecture

~~~text
human question
     │
     ▼
SemanticIntent         ← future LLM output; concepts only
     │
     ▼
catalog resolution
     │
     ▼
CensusQuery            ← sole statistical authority
     │
     ▼
semantic validation
     │
     ├──────────────┬────────────────┐
     ▼              ▼                ▼
    SQL          Redatam        INDEC recipe
     │              │
     ▼              ▼
 B4 local      B7 canonical
 execution      equivalence
     └──────────────┘
             │
             ▼
     CanonicalResult
~~~

## Current state

Implemented:

- A0–A2 — product/claim/grammar contract;
- B1 — typed contract spine and schema snapshots;
- B2 — evidence-backed VP semantic catalog;
- B3 — fail-closed query validator;
- B4 — deterministic SQL compiler + verified local RADIO executor;
- B5 — deterministic Redatam compiler;
- B6 — deterministic current-INDEC recipe compiler;
- B7 — CanonicalResult/equivalence layer; SHARE is selected/total COUNT composition;
- B8 — 20 supported golden questions + ambiguity/unsupported edge corpus;
- C0 — query-sensitive capability/evidence registry;
- C1 — Next.js App Router shell using B8 as a deterministic temporary interpreter.

### Evidence boundaries

Preserved real-source evidence on April-2025 VP, RADIO 061471101:

- B4 baseline: 73 VIVIENDA / 56 HOGAR / 137 PERSONA;
- Redatam ↔ SQL: COUNT, representative filters, ancestor HOGAR predicate, AVERAGE and PROV/DPTO breakdowns passed;
- the original SHARE-via-SWITCH path failed on RedEngine 1.1 and is retired;
- SHARE now composes two COUNT results and is labelled `derived_from_radio_qualified` until that composed artifact is rerun live;
- INDEC WebServer page/control compatibility is surface-checked; no remote execution/API claim is made.

See:

- `docs/qualification/B5_REDATAM_EQUIVALENCE.md`
- `docs/qualification/B6_INDEC_WEBSERVER.md`
- `docs/qualification/B7_CANONICAL_EQUIVALENCE.md`

## Run the C1 shell

~~~bash
npm install
npm run dev
~~~

C1 recognizes only the product golden corpus. Unknown questions fail visibly instead of being guessed.

The web Results panel deliberately does not execute Census microdata. B4 remains a local verified-slice scientific surface.

## Quality gate

~~~bash
npm run check
~~~

The gate includes:

- strict TypeScript;
- Vitest core/regression suite;
- Next.js production build.

## Still deferred

- free-form structured LLM interpreter;
- hosted/national Census execution;
- accounts/history;
- maps/charts;
- remote Redatam/INDEC submission;
- PO_A_IG / VC_PSC / cross-census composition.
