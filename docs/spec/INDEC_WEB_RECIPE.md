# B6 — INDEC Redatam Web recipe compiler

B6 turns the same validated CensusQuery into **manual reproduction instructions** for the public INDEC Redatam WebServer.

It does not submit forms, scrape results, or claim INDEC endorsement.

## Current surfaces checked (qualified 2026-10-07)

The implementation was checked against the public CPV2022 WebServer surfaces on 2026-10-07, including:

- total counts for private population and for private dwellings/households;
- frequency tables for PERSONA/HOGAR/VIVIENDA;
- the averages page surface (but not as a standard recipe for the current catalog variables; see below);
- selected-vs-total counts for population/households;
- the advanced **Programa** surface for private dwellings.

The recipe stores the concrete page in its steps so a user can reproduce the operation manually.

## Mapping

The deterministic preference order is:

| CensusQuery form | WebServer recipe |
| --- | --- |
| COUNT + variable breakdown | frequency surface |
| COUNT + no/geo breakdown | total-count surface |
| AVERAGE with a variable exposed by the live averages control | averages surface |
| AVERAGE whose variable is not exposed by the live averages control | Programa fallback |
| SHARE for PERSONA/HOGAR + no/geo breakdown | selected-vs-total count surface |
| form not represented safely by the standard pages | advanced Programa surface + B5 code |

Base filters are carried as the recipe's “Definición del universo”. Geographic breakdown is carried as “Corte de área”.

For a frequency recipe with a variable breakdown and no geographic breakdown, the recipe explicitly sets “Corte de área” to “País” and “Área geográfica” to “Toda la base”.

For SHARE, the recipe explicitly says that the CensusQuery quantity is:

~~~text
Seleccionado / Total
~~~

within the already filtered universe.

## Program fallback

The current public CPV2022 site exposes an advanced page titled as a Redatam+SP program surface for private dwellings.

B6 may therefore point a user to that page and provide the exact B5 program to paste manually.

This does **not** mean:

- B6 remotely executes the program;
- every generated B5 program has already been accepted by that server;
- the page is a stable API.

Those are separate empirical claims.

### Average-surface freshness finding

On 2026-10-07 the live `PROMEDIOSPART` page opened, but its “Promedios de” control exposed only `HOGAR.TOTPH` and `HOGAR.TOTPM`. The current catalog's representative average variables (`PERSONA.EDAD`, `HOGAR.TOTPOBH`, and `VIVIENDA.V06`) were not available there. B6 therefore routes those averages to the Programa fallback rather than silently emitting an unusable standard-page recipe.

## Qualification

Cloud tests verify that all twenty golden CensusQueries receive a structurally valid recipe and that representative queries map to the intended current page families.

The remaining live gate is manual/local:

1. open the emitted page;
2. confirm the named controls still exist;
3. reproduce a bounded query;
4. compare the interpretation and, where practical, its output with B4/B5.

If the WebServer surface changes, B6 should fail its freshness/review gate rather than silently pretending the instructions are current.

This is a manual/public-interface qualification, not a guarantee that INDEC will preserve these URLs or controls. Re-review the surfaces before relying on a recipe after a site change.
