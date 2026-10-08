# B7 — Canonical equivalence qualification

Status: **IMPLEMENTATION CLOSED / EVIDENCE BOUNDED**

Date: 2026-10-08

## Decision

The first B5 SHARE implementation attempted to create a 0/1 Redatam `SWITCH` variable and average it. RedEngine 1.1.0-final rejected the tested `INCASE` syntax.

That implementation is retired.

The supported B7 SHARE representation is now:

~~~text
TOTAL     = COUNT(entity | base filters)
SELECTED  = COUNT(entity | base filters + share condition)
SHARE     = SELECTED / TOTAL
~~~

The Redatam compiler emits two named count tables:

~~~text
ACQ_TOTAL
ACQ_SELECTED
~~~

using the same count marker / FILTER / CROSSTABS primitives already exercised in the permanent RADIO qualification.

## Preserved empirical evidence

On April-2025 VP, RADIO 061471101, RedEngine 1.1.0-final / redatamx 1.1.3:

- COUNT VIVIENDA: SQL 73 = Redatam 73;
- COUNT HOGAR: SQL 56 = Redatam 56;
- COUNT PERSONA: SQL 137 = Redatam 137;
- same-grain EDAD/P02 filters: equal;
- ancestor PERSONA ← HOGAR.H22 filter: equal;
- AVERAGE PERSONA.EDAD: equal within 1e-12;
- PROV and DPTO count breakdowns: equal.

The historical report is `docs/qualification/B5_REDATAM_EQUIVALENCE.md`.

## Canonical result

B7 introduces `argentina.census-canonical-result/v1`:

~~~text
query_id
measure
rows:
  breakdown
  value
~~~

SQL direct results and Redatam-selected/total components are normalized into this representation before equality is evaluated.

For SHARE the canonicalizer joins TOTAL and SELECTED by breakdown and computes the ratio deterministically.

## Evidence classification

The C0 registry classifies Redatam SHARE as:

~~~text
derived_from_radio_qualified
~~~

This means:

- the statistical composition is deterministic;
- its component COUNT semantics are empirically qualified on the permanent RADIO;
- the previous unsupported SWITCH syntax is no longer part of the path;
- the composed two-table program still has an opt-in real-runtime gate.

It does **not** mean the two-table SHARE artifact has already been rerun after this redesign.

## Optional live closure

With the authorized environment:

~~~bash
export CENSO_VP_RADIO_061471101_SLICE=/path/to/slice
export CENSO_VP_RXDB_DATABASE=/path/to/cpv2022.rxdb
npm test -- tests/b5-share-live.test.ts
~~~

The expected permanent-radio components are:

~~~text
TOTAL      56
SELECTED    1
SHARE       1 / 56
~~~

A future PASS may upgrade the registry status, but failure must not be hidden by changing CensusQuery semantics.
