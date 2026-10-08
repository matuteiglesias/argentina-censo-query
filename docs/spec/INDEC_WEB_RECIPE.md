# B6 — INDEC Redatam Web recipe compiler

B6 turns the same validated CensusQuery into **manual reproduction instructions** for the public INDEC Redatam WebServer.

It does not submit forms, scrape results, or claim INDEC endorsement.

## Current surfaces checked

The implementation is aligned to the public CPV2022 WebServer surfaces observed on 2026-10-08, including:

- total counts for private population and for private dwellings/households;
- frequency tables for PERSONA/HOGAR/VIVIENDA;
- averages;
- selected-vs-total counts for population/households;
- the advanced **Programa** surface for private dwellings.

The recipe stores the concrete page in its steps so a user can reproduce the operation manually.

## Mapping

The deterministic preference order is:

| CensusQuery form | WebServer recipe |
| --- | --- |
| COUNT + variable breakdown | frequency surface |
| COUNT + no/geo breakdown | total-count surface |
| AVERAGE | averages surface |
| SHARE for PERSONA/HOGAR + no/geo breakdown | selected-vs-total count surface |
| form not represented safely by the standard pages | advanced Programa surface + B5 code |

Base filters are carried as the recipe's “Definición del universo”. Geographic breakdown is carried as “Corte de área”.

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

## Qualification

Cloud tests verify that all twenty golden CensusQueries receive a structurally valid recipe and that representative queries map to the intended current page families.

The remaining live gate is manual/local:

1. open the emitted page;
2. confirm the named controls still exist;
3. reproduce a bounded query;
4. compare the interpretation and, where practical, its output with B4/B5.

If the WebServer surface changes, B6 should fail its freshness/review gate rather than silently pretending the instructions are current.
