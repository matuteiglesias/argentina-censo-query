# A1 — Claim boundaries

These boundaries are part of the product contract.

## What the product may claim

For a successful compilation it may say:

- the question was resolved to an explicit CensusQuery;
- every Census identifier used by the resolved query exists in the selected semantic catalog;
- the query satisfies the supported grammar and structural validation rules;
- SQL, Redatam Process, and INDEC Web instructions were derived from the same canonical query;
- the compilation targets a named logical schema / Redatam dialect / Web recipe contract.

Later compiler/equivalence testing may support stronger claims, but those claims require preserved evidence.

## What the product must not claim

### No statistical result

The product does not execute the query, so it cannot claim that a count, share, average, or table is correct.

### No SQL-runtime guarantee yet

Copyable SQL targets a documented logical relational schema. Until an execution projection exists and is tested, the UI must not imply that the SQL can be pasted into arbitrary databases unchanged.

### No remote-Redatam guarantee

Generated Redatam Process is a compilation target. v1 does not claim that INDEC's current public WebServer accepts arbitrary Process programs for remote execution.

### Recipe is not execution

The INDEC recipe describes how the same statistical intent maps to WebServer concepts such as database, entity, area, universe/filter, breakdown and output. It is not proof that the user has executed it.

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

Avoid:

> "El Censo dice..."

> "El resultado es..."

> "Consulta oficial..."

> "SQL validado contra toda la base..." unless that evidence later exists.
