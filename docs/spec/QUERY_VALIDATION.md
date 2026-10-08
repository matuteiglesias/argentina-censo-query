# B3 — Query validator

B3 is the semantic firewall between a resolved CensusQuery and every future compiler.

A structurally valid JSON object is not enough. The validator checks Census semantics against the selected catalog.

## Rules

### Grain

The measure entity must equal the query universe entity.

### Relationship paths

A filter or variable breakdown may refer to:

- the same entity as the measure grain;
- a validated ancestor entity.

For VP v0:

~~~text
PERSONA → HOGAR → VIVIENDA
~~~

Therefore:

- PERSONA filtered by HOGAR.H22: valid;
- PERSONA filtered by VIVIENDA.V01: valid;
- HOGAR filtered by PERSONA.EDAD: invalid;
- VIVIENDA filtered by HOGAR.H22: invalid.

No arbitrary joins are inferred.

### Variables

Every referenced variable must:

- exist in the catalog;
- have status supported;
- permit the requested operator;
- accept the supplied value type;
- satisfy its curated range/category rules.

Blocked variables such as PERSONA.HNVUA fail closed. Experimental variables such as PERSONA.AESC also fail closed until their unresolved semantic boundary is explicitly modeled.

### Categories

For categorical variables, the code must be explicitly present in the curated category catalog.

A numerically plausible but unknown code is rejected.

For ordered numeric ranges, `between [lower, upper]` also requires `lower <= upper`; a syntactically plausible reversed range is rejected.

### Average

AVERAGE requires a variable:

- on the exact measure grain;
- explicitly marked as average-capable.

This prevents accidental person-weighting of household/dwelling quantities.

### Breakdown

A variable/geography must explicitly support breakdown.

v1 permits at most one breakdown structurally.

### Geography selection

PROV and DPTO breakdowns are supported in catalog v0.

Explicit geography member selection is rejected until members are enumerated in the catalog. A code with the right shape is not treated as evidence that the geography exists.

## Compiler gate

Future compilers must accept only CensusQuery objects that pass this validator.

Malformed-but-plausible queries must not reach SQL, Redatam or INDEC recipe generation.
