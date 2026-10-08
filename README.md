# argentina-censo-query

Contract-first semantic query product for Argentina's 2022 Census.

One canonical CensusQuery drives:

1. DuckDB-compatible SQL;
2. Redatam Process;
3. INDEC Redatam WebServer reproduction instructions.

The repository contains a server-backed Next.js query interface and a server-only C3 interpreter seam. GoldenInterpreter remains the default; Google GenAI is opt-in through explicit server configuration. Public preview compiles and explains reproducibility; only an explicitly configured local research server can execute verified RADIO aggregates.

## Architecture

~~~text
human question
     │
     ▼
SemanticIntent         ← Golden or opt-in LLM output; concepts only
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
- C3 — bounded SemanticInterpreter contract, catalog-derived lexicon, strict Google GenAI adapter, and optional B8 evaluator;
- C4 — one server-side query submission through interpretation, resolution, B3, compilation, qualification and provenance;
- C5 — opt-in development-only local RADIO aggregates from B4, normalized to CanonicalResult;
- C6 — server-backed question UI with SQL/Redatam/INDEC reproduction, evidence and local result view.

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

## Run the compile-only UI

~~~bash
npm ci
npm run dev
~~~

Open http://localhost:3000. With no model configuration, only the 20 B8 golden questions are recognized; unknown questions fail visibly instead of being guessed. The UI submits to POST /api/query, which compiles one validated CensusQuery into three reproducible targets. Execution remains disabled by default and always disabled in production builds.

## Opt-in local RADIO research mode

Use only on an authorized workstation with a prevalidated VP RADIO slice, and bind the dev server to the loopback interface (do not port-forward it):

~~~bash
export CENSO_EXECUTION_MODE=local_radio
export CENSO_LOCAL_SLICE_ROOT=/absolute/path/to/verified/vp/radio
npm run dev -- --hostname 127.0.0.1
~~~

The UI exposes a separate Run button only in this mode. POST /api/run takes a validated CensusQuery, never SQL or filesystem paths, and returns a CanonicalResult with verified RADIO identity and dataset-manifest hash. The local result is **not** a national estimate. Loopback Host/Origin checks are defense-in-depth; keep the development server inaccessible from other machines. See docs/spec/C4_C6_PRODUCT_VERTICAL.md.

## C3 server interpreter

The C3 HTTP seam is `POST /api/interpret` with `{ "question": "..." }`. It returns an existing `InterpretationResult`, a resolved `CensusQuery` for candidates, and bounded provenance. With no `C3_INTERPRETER_PROVIDER=google`, it uses the deterministic GoldenInterpreter. Google mode requires `GEMINI_API_KEY`; it never runs in the browser and the model sees only the semantic lexicon.

## Quality gate

~~~bash
npm run check
~~~

The gate includes:

- strict TypeScript;
- Vitest core/regression suite;
- Next.js production build.

## Still deferred

- live-provider C3 evaluation, browser E2E and production deployment;
- hosted/national Census execution;
- accounts/history;
- maps/charts;
- remote Redatam/INDEC submission;
- PO_A_IG / VC_PSC / cross-census composition.
