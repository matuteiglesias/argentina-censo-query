# B5 — Redatam Process compiler

B5 deterministically projects a validated `CensusQuery` to Redatam Process source.

It writes code. It does not execute Redatam.

## Design rule

The Redatam program is never model-generated. It comes from the same canonical query consumed by the SQL compiler.

A query that fails B3 cannot reach B5.

## v1 patterns

### Base universe

Base filters become the `RUNDEF` universe. The program starts from the whole selected database:

~~~text
RUNDEF ACQ
  SELECTION ALL
  UNIVERSE (...)
~~~

When there are no filters the UNIVERSE clause is omitted.

### COUNT

B5 defines a compiler-private one-valued marker on the entity being counted:

~~~text
DEFINE PERSONA.ZZACQCOUNT
  AS 1
  TYPE INTEGER
  RANGE 1-1
~~~

Without a breakdown it emits a frequency of that marker. With a breakdown it emits a crosstab against the requested variable/geography.

This keeps the counted entity explicit even when the filter references an ancestor entity.

### AVERAGE

~~~text
TABLE ACQ_RESULT
  AS AVERAGE
  OF PERSONA.EDAD BY PROV.IDPROV
~~~

### SHARE

SHARE is represented by a deterministic 0/1 variable and the mean of that variable:

~~~text
DEFINE HOGAR.ZZACQSHARE
  AS SWITCH
  INCASE (HOGAR.H22 = 2)
  ASSIGN 1
  ELSE 0
  TYPE INTEGER

TABLE ACQ_RESULT
  AS AVERAGE
  OF HOGAR.ZZACQSHARE BY DPTO.IDPTO
~~~

The base filters remain in the RUNDEF universe; the share condition affects only the numerator indicator.

## Geography

The current compiler uses the official Redatam geography variables:

~~~text
PROV.IDPROV
DPTO.IDPTO
~~~

This is separate from B4's local `XRADIO` prefix projection. Both are projections of the same CensusQuery geography level.

## Cloud gate

Every current golden CensusQuery produces deterministic Redatam source, and unit tests pin the important COUNT/AVERAGE/SHARE forms.

That is a **compiler gate**, not a live RedEngine equivalence gate.

## RedEngine 1.1 compatibility note

The first live qualification found that RedEngine 1.1.0-final rejected a same-line `INCASE (...) ASSIGN 1` form for SHARE. The compiler now emits the test and assignment as separate statements, matching documented SWITCH examples used by older Redatam runtimes.

A dedicated opt-in gate in `tests/b5-share-live.test.ts` compares the resulting RedEngine SHARE value directly with B4 on RADIO 061471101.

## Local qualification still required

Before calling B5 empirically qualified, run representative compiled programs against the same permanent RXDB RADIO used by B4 and compare Redatam output with B4's local result.

At minimum qualify:

- total VIVIENDA/HOGAR/PERSONA counts;
- PERSONA age/sex filter;
- an ancestor HOGAR filter at PERSONA grain;
- average age;
- a share;
- PROV/DPTO breakdown behavior.

A syntax-valid-looking program is not evidence of result equivalence.
