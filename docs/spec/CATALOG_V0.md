# B2 — CensusCatalog v0

## Goal

Provide a small, evidence-backed semantic catalog sufficient to exercise roughly twenty representative v1 questions without inventing Census semantics.

The catalog is deliberately **not** a full data dictionary.

## Basis

v0 uses variables that are present in both:

1. the project's preserved relational schema / VP extraction lineage; and
2. the current official CPV2022 Redatam dictionaries.

This avoids silently treating current-web-only additions as if they were already present in the locally qualified release.

The catalog records evidence references for every entity, variable, category and geography.

## Curated scope

### PERSONA

- EDAD — age;
- P02 — sex registered at birth;
- P06 — current educational attendance;
- P07 — current educational level;
- AESC — completed years of schooling, visible but experimental/non-queryable because code 99 means Ignorado and special-value semantics are not modeled yet;
- HNVUA — recorded as blocked/anomalous, not queryable.

### HOGAR

- TOTPOBH — household size;
- H20 — rooms;
- H22 — housing tenure;
- H24A — home internet;
- NBI_TOT — unmet basic needs.

### VIVIENDA

- V01 — dwelling type;
- V06 — households in dwelling;
- TOTPOBV — persons in dwelling.

### Geography

- PROV;
- DPTO.

v0 supports geography as a breakdown. It does not yet enumerate every province/department member, so explicit geography-code selection fails closed.

## Categories

Categorical codes are only curated where official definitions provide explicit code/label mappings.

V01 is marked with partial category coverage because v0 needs only the private-dwelling categories used by the first question set; it does not claim to reproduce every code in the full variable range.

## Deterministic resolution

The catalog contains two distinct surfaces:

- canonical semantic concepts such as `age`, `woman`, `rented`;
- explicit human aliases such as `edad`, `mujeres`, `alquiler`.

Alias normalization is limited to deterministic case/accent/punctuation normalization. No fuzzy search, embedding similarity or model call is used in B2.

Ambiguous catalog aliases are a catalog error.

## Release boundary

The v0 catalog names `april-2025` as the local source-release basis and separately records the current official Redatam base `CPV2022`.

This is an intersection contract, not a claim that the two releases are byte-identical or schema-identical.


## Special-value safety

The official definition for AESC uses code 99 for **Ignorado**. Catalog v0 therefore exposes AESC as evidence-backed metadata but does not allow it in filters, averages or breakdowns yet.

This is deliberate: treating 99 as an ordinary numeric value would make queries such as `AESC >= 12` or `AVERAGE(AESC)` silently wrong. A later contract may model special/missing codes explicitly before promoting this variable.
