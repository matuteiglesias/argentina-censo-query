# B5 — Redatam Process compiler

B5 deterministically projects a validated `CensusQuery` to Redatam Process source.

It writes code. It does not remotely execute Redatam.

## Design rule

The Redatam program is never model-generated. It comes from the same canonical CensusQuery consumed by the SQL compiler.

A query that fails B3 cannot reach B5.

## Runtime-qualified syntax boundary

The permanent-radio qualification used:

- RedEngine 1.1.0-final;
- redatamx 1.1.3;
- April-2025 VP;
- RADIO 061471101.

That runtime rejected several initially assumed forms. The supported compiler therefore:

- does **not** emit `SELECTION ALL`;
- does **not** emit query predicates as a RUNDEF `UNIVERSE`;
- applies query predicates as table-level `FILTER`;
- does not add unnecessary marker `RANGE` declarations.

The local qualification harness adds the RADIO selection externally so execution scope and CensusQuery meaning remain separate.

## COUNT

B5 defines one compiler-private marker on the entity being counted:

~~~text
RUNDEF ACQ

DEFINE PERSONA.ZZACQCOUNT
  AS 1
  TYPE INTEGER

TABLE ACQ_RESULT
  AS FREQUENCY
  OF PERSONA.ZZACQCOUNT
  FILTER (PERSONA.EDAD >= 65)
~~~

With a breakdown it uses the same marker in a crosstab:

~~~text
TABLE ACQ_RESULT
  AS CROSSTABS
  OF PERSONA.ZZACQCOUNT BY PROV.IDPROV
~~~

This keeps the counted entity explicit even when filters reference an ancestor entity.

## AVERAGE

~~~text
RUNDEF ACQ

TABLE ACQ_RESULT
  AS AVERAGE
  OF PERSONA.EDAD
~~~

Base query filters, when present, are appended as a table-level `FILTER`.

## SHARE

The original implementation attempted a generated 0/1 `SWITCH` variable. RedEngine 1.1 rejected the tested `INCASE` forms.

That path is retired.

B7 defines SHARE by two COUNT tables:

~~~text
RUNDEF ACQ

DEFINE HOGAR.ZZACQCOUNT
  AS 1
  TYPE INTEGER

TABLE ACQ_TOTAL
  AS CROSSTABS
  OF HOGAR.ZZACQCOUNT BY DPTO.IDPTO

TABLE ACQ_SELECTED
  AS CROSSTABS
  OF HOGAR.ZZACQCOUNT BY DPTO.IDPTO
  FILTER (HOGAR.H22 = 2)
~~~

If the CensusQuery has base filters, `ACQ_TOTAL` receives the base filter and `ACQ_SELECTED` receives:

~~~text
(base filter) AND (share condition)
~~~

B7 canonicalization computes:

~~~text
share = selected / total
~~~

by breakdown.

The component COUNT/FILTER/CROSSTABS primitives have permanent-radio evidence. The composed two-table SHARE artifact remains labelled `derived_from_radio_qualified` until its opt-in live gate is rerun.

## Geography

The compiler uses the Redatam geography variables:

~~~text
PROV.IDPROV
DPTO.IDPTO
~~~

This is separate from B4's local XRADIO-prefix projection. Both are deterministic projections of the same CensusQuery geography level.

## Preserved empirical evidence

The B5 qualification report records real-source agreement for:

- base COUNT VIVIENDA/HOGAR/PERSONA;
- PERSONA EDAD filter;
- PERSONA P02 filter;
- PERSONA filtered through ancestor HOGAR.H22;
- AVERAGE PERSONA.EDAD;
- PERSONA count by PROV;
- HOGAR count by DPTO.

See `docs/qualification/B5_REDATAM_EQUIVALENCE.md`.

Queries that combine these primitives in a shape not directly executed are **derived from qualified primitives**, not silently promoted to exact empirical qualification.

## Gates

Cloud CI verifies deterministic compilation for the complete B8 supported corpus.

The authorized local environment owns the optional execution gates in:

- `tests/b5-live-qualification.test.ts`;
- `tests/b5-share-live.test.ts`.

A syntax-valid-looking program alone is never evidence of statistical equivalence.
