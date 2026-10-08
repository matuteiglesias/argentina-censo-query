# A1 — Claim boundaries

These boundaries are part of the product contract.

## What the product may claim

For a successful compilation it may say:

- the question was resolved to an explicit CensusQuery;
- every Census identifier used by the resolved query exists in the selected semantic catalog;
- the query satisfies the supported grammar and structural validation rules;
- SQL, Redatam Process, and INDEC Web instructions were derived from the same canonical query;
- the compilation targets a named logical schema / Redatam dialect / Web recipe contract.

For B4 it may additionally say that a compiler-generated SQL query **executed against the explicitly named local slice** when the local executor returns successfully.

That statement is always scoped to those verified input bytes.

## What the product must not claim

### Local execution is not a national Census result

A result produced from one RADIO slice is a result for that supplied slice. It must not be presented as an Argentine national statistic.

Even a future national local corpus would require separate source-completeness/evidence gates before stronger language.

### Cloud B4 tests are not real-source qualification

Cloud CI exercises real Parquet/DuckDB mechanics using synthetic Census-shaped rows. This validates software plumbing, not actual Censo 2022 values.

The permanent real RADIO gate is separate.

### SQL target has a specific runtime contract

Copyable SQL targets `duckdb-census-logical/v1`.

It expects the logical relations/projection supplied by B4, including canonical keys and projected PROV/DPTO codes. It is not advertised as arbitrary-database SQL.

### Generated Redatam is not yet empirical equivalence

B5 code is generated from documented Redatam Process syntax and the canonical query.

Until representative programs have been executed on the authorized real source and compared to B4 over the same RADIO, the product must not say SQL and Redatam are empirically equivalent.

### No remote-Redatam execution claim

Generated Redatam Process is a compilation target. The repository does not itself submit or execute programs against INDEC.

### Recipe is not execution

The INDEC recipe describes how the same statistical intent maps to current WebServer concepts such as database, entity, area, universe/filter, breakdown and output.

It is not proof that the user executed the recipe, and current-page compatibility is separate from statistical equivalence.

### VP is not automatically the whole Census

The initial catalog supports VP. Questions whose ordinary-language universe could include populations represented outside VP require clarification or an unsupported outcome.

### No official endorsement

The project is independent. It must not imply endorsement, certification, authorship or operational support by INDEC, CELADE/CEPAL, Redatam maintainers, or other institutions.

### No source-release substitution

A semantic catalog is versioned and may carry source/release evidence. A new Census release does not silently inherit variable categories, anomalies, or semantics from an earlier release.

### No hidden ambiguity

If materially different supported operationalizations remain plausible, the system must ask for clarification. A plausible deterministic-looking query is not an acceptable substitute.

### No hidden model authority

The future LLM may propose concepts, but it cannot:

- choose raw Census variable identifiers;
- choose category codes;
- invent relationships;
- write joins;
- write target SQL;
- write target Redatam code;
- override deterministic validation.

## Product-language guidance

Prefer:

> "Interpreté tu pregunta como..."

> "Esta consulta usa el universo VP..."

> "SQL generado para el esquema lógico..."

> "Resultado local sobre el slice RADIO indicado..." when B4 actually ran.

Avoid:

> "El Censo dice..."

> "El resultado nacional es..." unless separately established.

> "Consulta oficial..."

> "SQL y Redatam validados como equivalentes..." until the live differential gate passes.

> "INDEC ejecutó esta consulta..." when only a recipe was generated.
