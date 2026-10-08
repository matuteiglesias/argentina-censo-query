# A2 — Supported grammar v1

The initial grammar is deliberately smaller than the Census.

Its purpose is to prove that one semantic representation can deterministically compile to multiple targets without silently changing statistical meaning.

## Supported entities

Within the VP database:

- VIVIENDA;
- HOGAR;
- PERSONA.

## Measures

### COUNT

Count records at an explicit entity grain.

### AVERAGE

Mean of one numeric variable at its supported grain.

### SHARE

Share of records satisfying one explicit numerator condition within the already filtered universe.

The denominator is the same validated entity/universe after base filters, before applying the share condition.

## Filters

Supported operators:

~~~text
eq
neq
gt
gte
lt
lte
between
in
~~~

v1 supports:

- same-entity predicates;
- predicates on validated ancestor entities, once B2 defines an allowed relationship path.

No arbitrary expression strings are accepted.

## Breakdowns

At most one breakdown in v1:

- geography: PROV or DPTO;
- one supported Census variable.

Cross-tabs with two or more simultaneous breakdown dimensions are deferred.

## Geographic selection

A query may target:

- all supported geography;
- one or more explicit codes at a supported geography level.

The semantic catalog/resolver owns the mapping from ordinary place names to codes. The LLM must not invent codes.

## Examples intended to be supported

- ¿Cuántas mujeres de 20 a 29 años hay por provincia?
- ¿Cuál es la edad promedio por provincia?
- ¿Qué porcentaje de hogares alquila por departamento?
- ¿Cuántas personas viven en hogares con una característica de tenencia ya catalogada?

The last example is only supported when the predicate traverses a validated ancestor path such as PERSONA → HOGAR.

## Explicitly deferred

- descendant-derived predicates such as "hogares con cinco o más personas";
- arbitrary derived indicators;
- arbitrary joins;
- raw SQL fragments;
- regressions or statistical models;
- maps and charts;
- cross-census comparisons;
- cross-universe composition across VP / PO_A_IG / VC_PSC;
- free-form result interpretation;
- query execution.

## Ambiguity examples

> ¿Cuántos universitarios hay?

May mean current attendance or highest educational level. The correct v1 outcome is needs_clarification, not an arbitrary query.

> ¿Cuántas personas mayores de 100 hay?

If the user's wording implies the complete Census universe rather than VP only, the system must surface the VP boundary rather than silently claiming completeness.

## Grammar evolution

New operations require:

1. a contract change;
2. resolver/validator rules;
3. deterministic compilation rules for every advertised target;
4. golden fixtures demonstrating that meaning is preserved.

A feature is not part of the supported grammar merely because an LLM can describe it.
