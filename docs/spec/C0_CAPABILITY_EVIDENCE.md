# C0 — Capability and evidence layer

C0 makes qualification state a first-class product object instead of prose scattered across reports.

## CanonicalResult

`argentina.census-canonical-result/v1` records:

- stable CensusQuery ID;
- measure type;
- sorted `breakdown/value` rows.

SQL/DuckDB and Redatam results must be normalized before equivalence is discussed.

For SHARE, B7 canonicalizes two Redatam count components:

~~~text
selected / total
~~~

rather than depending on unsupported SWITCH syntax.

## Qualification registry

Every target receives an explicit status:

- `radio_qualified`;
- `derived_from_radio_qualified`;
- `surface_checked`;
- `compiler_tested`.

The registry is query-sensitive. For example:

- representative SQL COUNT/AVERAGE/SHARE → radio-qualified;
- Redatam COUNT/AVERAGE → radio-qualified on the preserved subset;
- Redatam SHARE → derived from radio-qualified COUNT primitives;
- variable-breakdown Redatam → compiler-tested until separately qualified;
- INDEC Web → surface-checked, never described as remotely executed.

The UI must consume this registry rather than hard-code stronger language.
