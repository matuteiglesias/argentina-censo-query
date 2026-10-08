# B4 — Local VP executor

B4 is a **development and scientific-qualification surface**, not a hosted Census database.

It executes only SQL generated from a validated `CensusQuery` against an explicitly supplied, local, validated VP **RADIO slice** produced by `rxdb-extractor`.

## Boundary

B4 may:

- read local `vivienda.parquet`, `hogar.parquet`, and `persona.parquet`;
- verify their hashes against `dataset-manifest.json`;
- require `validation.json.status = pass`;
- verify the dataset-manifest semantic hash;
- require the current qualified `RADIO → RADIO / XRADIO` identity contract;
- create in-memory DuckDB views;
- execute only SQL produced by the deterministic B4 SQL compiler;
- return the result to the caller for local testing/equivalence work.

B4 does **not**:

- accept arbitrary SQL;
- modify the Parquet source;
- upload microdata;
- create a hosted database;
- execute Redatam;
- submit anything to INDEC;
- claim that one RADIO result is national.

## Logical DuckDB schema

The SQL target is `duckdb-census-logical/v1`, not raw-Parquet SQL.

B4 mounts three read-only logical relations:

~~~text
censo.vivienda
censo.hogar
censo.persona
~~~

The source canonical keys are preserved:

~~~text
VIVIENDA  vivienda_key
HOGAR     hogar_key → vivienda_key
PERSONA   persona_key → hogar_key → vivienda_key
~~~

This lets the compiler add only the ancestor joins already authorized by B3.

## Geography

The current B4 path intentionally accepts only qualified RADIO slices with an exact nine-digit numeric `XRADIO`.

For local SQL projection it derives:

~~~text
__prov_code = first 2 digits of XRADIO
__dpto_code = first 5 digits of XRADIO
~~~

This is an Argentina-specific projection. It is not a generic RXDB rule.

The executor checks the nine-digit invariant before running the compiled analytical query.

## Custody before execution

The executor fails closed unless all of the following hold:

1. `validation.json` is present and says `pass`;
2. `dataset-manifest.json` is manifest version 1 and says validation `pass`;
3. selection entity is `RADIO`;
4. identity scope is `RADIO`;
5. scope field is `XRADIO`;
6. VIVIENDA/HOGAR/PERSONA artifact paths are the expected filenames;
7. every Parquet SHA-256 equals the hash recorded in the manifest;
8. the manifest's own semantic hash recomputes exactly.

This is stricter than merely opening any three Parquet files.

## Cloud qualification

CI creates a synthetic but real three-table Parquet RADIO slice using DuckDB and proves:

- custody verification;
- COUNT at PERSONA grain;
- a PERSONA query filtered by an ancestor HOGAR variable;
- SHARE semantics;
- geography projection;
- tamper detection;
- failure on a non-passing extraction report.

This proves the executor/compiler plumbing in cloud CI. It is not evidence about the actual Census bytes.

## Real-source qualification

The repository includes an opt-in test for the permanent relational laboratory RADIO `061471101`.

Set:

~~~bash
export CENSO_VP_RADIO_061471101_SLICE=/absolute/path/to/the/validated/slice
npm test -- tests/local-real-radio.test.ts
~~~

The test requires the same custody checks and then expects:

~~~text
VIVIENDA  73
HOGAR     56
PERSONA   137
~~~

That gate must be run on the authorized local source environment. It is intentionally skipped in cloud CI.
