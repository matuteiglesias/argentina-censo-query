# B5 RedEngine equivalence qualification

Status: **BLOCKERS** — the tested subset is not qualified as a complete B5 surface.

Date: 2026-10-07

## Scope and identity

- Repository baseline: `27f73f6` (`main`); tested qualification commit: `c53ed23` on branch `fix/b5-redatam-qualification`.
- Qualification scope: permanent VP RADIO `061471101`; no national-equivalence claim.
- Source release: April 2025 Argentina Censo 2022 VP RXDB.
- RXDB SHA-256: `abcc06e8903083bd1a19b4fde2d989e8a190976633f5a3f64a77df3015edb246`.
- Validated slice semantic hash: `84ba4720a91208bd638fb6623c510b04acb3bf910c85f6f60b9234d525caa2f6`.
- Slice validation status: `pass`; rows are VIVIENDA 73, HOGAR 56, PERSONA 137.
- Parquet artifact hashes are retained in the private local `dataset-manifest.json`; no private filesystem paths or source bytes are included here.

## Runtime

Bridge: `rxdb-extractor/bridges/redatamx_bridge.R`, using the supported JSON/`redatamx` boundary and `redatam_internal_query`. No TABLE VIEW and no binary/source-byte modification were used.

- RedEngine: `1.1.0-final` (Linux build dated 2025-04-27)
- redatamx: `1.1.3`
- selection: true
- number: true
- inherited_define: true
- freq: true
- cmpcode: false
- table_view: false

The Redatam execution harness applied the exact selection `RADIO == "061471101"` around each compiler program so the engine universe matched the validated Parquet RADIO. This is an execution-scope wrapper, not a change to CensusQuery meaning.

## Bounded compiler correction

The initial compiler output did not execute on this runtime: `SELECTION ALL`, `UNIVERSE <predicate>`, and marker `RANGE 1-1` were rejected. The smallest correction tested was:

- omit `SELECTION ALL`;
- emit base filters as table-level `FILTER <expression>`;
- omit private marker `RANGE` clauses, which are unnecessary for these one-valued markers.

The correction has regression coverage in `tests/compilers.test.ts`. `npm run check` passes after the correction.

## Differential cases

All SQL and Redatam artifacts below were compiled from the same validated CensusQuery. SQL values are normalized from DuckDB JSON; Redatam values are normalized from table rows by removing margin cells. A selected-radio DPTO value of `147` is normalized to the full `06147` code using the selected RADIO's province prefix.

### 1–3. Base counts

| Case | CensusQuery | SQL | SQL result | Redatam normalized result | Status |
|---|---|---|---:|---:|---|
| `count_vivienda` | `COUNT VIVIENDA` | `SELECT COUNT(*) AS "value" FROM censo.vivienda AS v;` | 73 | 73 | PASS |
| `count_hogar` | `COUNT HOGAR` | `SELECT COUNT(*) AS "value" FROM censo.hogar AS h;` | 56 | 56 | PASS |
| `count_persona` | `COUNT PERSONA` | `SELECT COUNT(*) AS "value" FROM censo.persona AS p;` | 137 | 137 | PASS |

Generated Redatam form for all three count cases:

```text
RUNDEF ACQ

DEFINE <ENTITY>.ZZACQCOUNT
  AS 1
  TYPE INTEGER

TABLE ACQ_RESULT
  AS FREQUENCY
  OF <ENTITY>.ZZACQCOUNT
```

### 4–6. Predicates and ancestor path

| Case | CensusQuery | SQL | SQL result | Redatam normalized result | Status |
|---|---|---|---:|---:|---|
| `persona_edad_gte_65` | `COUNT PERSONA WHERE PERSONA.EDAD >= 65` | `SELECT COUNT(*) AS "value" FROM censo.persona AS p WHERE p."EDAD" >= 65;` | 31 | 31 | PASS |
| `persona_p02_woman` | `COUNT PERSONA WHERE PERSONA.P02 = 1` | `SELECT COUNT(*) AS "value" FROM censo.persona AS p WHERE p."P02" = 1;` | 74 | 74 | PASS |
| `persona_hogar_h22_rented` | `COUNT PERSONA WHERE HOGAR.H22 = 2` | `SELECT COUNT(*) AS "value" FROM censo.persona AS p JOIN censo.hogar AS h ON p."hogar_key" = h."hogar_key" WHERE h."H22" = 2;` | 3 | 3 | PASS |

Relevant generated Redatam excerpts:

```text
TABLE ACQ_RESULT
  AS FREQUENCY
  OF PERSONA.ZZACQCOUNT
  FILTER (PERSONA.EDAD >= 65)

TABLE ACQ_RESULT
  AS FREQUENCY
  OF PERSONA.ZZACQCOUNT
  FILTER (PERSONA.P02 = 1)

TABLE ACQ_RESULT
  AS FREQUENCY
  OF PERSONA.ZZACQCOUNT
  FILTER (HOGAR.H22 = 2)
```

### 7. Average

| Case | CensusQuery | SQL result | Redatam result | Tolerance | Status |
|---|---|---:|---:|---:|---|
| `average_persona_edad` | `AVERAGE PERSONA.EDAD` | `40.91240875912409` | `40.9124087591241` | `1e-12` absolute | PASS |

Generated Redatam:

```text
RUNDEF ACQ

TABLE ACQ_RESULT
  AS AVERAGE
  OF PERSONA.EDAD
```

The difference is approximately `7.1e-15`; no category or missing-state disagreement was hidden by the tolerance.

### 8. Share

| Case | CensusQuery | SQL result | Redatam result | Status |
|---|---|---:|---|---|
| `share_hogar_h22_rented` | `SHARE HOGAR WHERE HOGAR.H22 = 2` | `0.017857142857142856` | no table result; parser failure | BLOCKER |

SQL was generated as:

```sql
SELECT AVG(CASE WHEN h."H22" = 2 THEN 1.0 ELSE 0.0 END) AS "value"
FROM censo.hogar AS h;
```

Redatam was generated as:

```text
DEFINE HOGAR.ZZACQSHARE
  AS SWITCH
  INCASE (HOGAR.H22 = 2) ASSIGN 1
  ELSE 0
  TYPE INTEGER

TABLE ACQ_RESULT
  AS AVERAGE
  OF HOGAR.ZZACQSHARE
```

The recorded runtime emitted `SE_0001`/`SE_0004` parser errors at `INCASE`; `redatam_internal_query` returned no table. This is classified as **D — Redatam syntax/runtime limitation**, not papered over as a statistical match.

### 9–10. Geography

| Case | CensusQuery | SQL result | Redatam normalized result | Status |
|---|---|---|---|---|
| `persona_count_by_prov` | `COUNT PERSONA BY PROV` | `[{breakdown:"06", value:137}]` | `[{breakdown:"06", value:137}]` | PASS |
| `hogar_count_by_dpto` | `COUNT HOGAR BY DPTO` | `[{breakdown:"06147", value:56}]` | `[{breakdown:"06147", value:56}]` | PASS |

Generated Redatam forms:

```text
TABLE ACQ_RESULT
  AS CROSSTABS
  OF PERSONA.ZZACQCOUNT BY PROV.IDPROV

TABLE ACQ_RESULT
  AS CROSSTABS
  OF HOGAR.ZZACQCOUNT BY DPTO.IDPTO
```

Raw Redatam DPTO output was `147` under selected province `06`; normalization to `06147` is the documented Argentina RADIO-prefix geography rule used by the validated local slice.

## Qualification decision

B4 passed. The corrected compiler executes and agrees for 9 of 10 required cases, including COUNT, AVERAGE, cross-grain PERSONA ← HOGAR filtering, and PROV/DPTO geography. B5 remains **BLOCKED** because SHARE cannot execute under the recorded RedEngine 1.1.0/redatamx 1.1.3 runtime. The repository must not mark B5 qualified, update the README status, or open the requested qualification PR until a supported runtime path executes the generated SHARE program and its normalized result agrees.


## Closure candidate after initial qualification

A follow-up compiler correction changes SHARE from:

~~~text
INCASE (condition) ASSIGN 1
~~~

to the older-runtime-compatible statement pair:

~~~text
INCASE (condition)
ASSIGN 1
ELSE 0
~~~

The correction is covered by cloud tests and by the opt-in live gate `tests/b5-share-live.test.ts`.

This document remains **BLOCKERS** until that live gate runs successfully on the same RedEngine 1.1.0-final / redatamx 1.1.3 / RADIO 061471101 environment and records the expected B4 value `1/56 = 0.017857142857142856`. Do not reinterpret this note as qualification evidence by itself.
