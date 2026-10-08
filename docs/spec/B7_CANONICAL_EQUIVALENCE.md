# B7 — Canonical equivalence

B7 separates **statistical equality** from target-language formatting.

The canonical comparison object is:

~~~text
CanonicalResult
  query_id
  measure
  rows[]
    breakdown
    value
~~~

SQL/DuckDB rows and Redatam outputs must be normalized into this representation before equality is discussed.

## SHARE decision

The initial B5 attempt represented SHARE as an average of a compiler-generated 0/1 SWITCH variable. RedEngine 1.1.0-final rejected the tested SWITCH/INCASE forms.

B7 removes that syntax dependency.

For a SHARE CensusQuery:

~~~text
share = selected / total
~~~

Redatam is compiled from two count tables over the same grain and breakdown:

~~~text
ACQ_TOTAL
  COUNT entity under base filters

ACQ_SELECTED
  COUNT entity under base filters + share condition
~~~

The canonicalizer joins them by breakdown and computes:

~~~text
value = selected / total
~~~

This is the same statistical quantity emitted by SQL as:

~~~sql
AVG(CASE WHEN condition THEN 1.0 ELSE 0.0 END)
~~~

for a non-empty denominator.

## Evidence boundary

The permanent RADIO 061471101 qualification already established that RedEngine COUNT with table FILTER, ancestor predicates and geographic crosstabs agrees with B4 SQL for the tested cases.

Therefore the new SHARE target is classified as **derived from radio-qualified COUNT primitives**, not as an independently live-qualified RedEngine SHARE execution.

That distinction is encoded in the C0 qualification registry and must remain visible until the composed two-table program itself is exercised on the authorized runtime.

## Equality

For exact counts the canonical values must be exact integers.

For averages/shares the default comparison tolerance is `1e-12`.

No textual SQL/Redatam formatting enters the equality decision.
