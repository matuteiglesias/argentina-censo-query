# Local Codex qualification handoff — B4/B5/B6

This runbook owns only the tests that require the authorized local Census/RedEngine environment.

Do not change Census source bytes.

## 1. Start from merged main

~~~bash
git switch main
git pull --ff-only
npm install
npm run check
~~~

Cloud CI should already be green before this handoff begins.

## 2. B4 — real RADIO slice

Locate the already validated permanent RADIO `061471101` VP slice. Do not regenerate it merely to satisfy this test if a qualified slice already exists.

Run:

~~~bash
export CENSO_VP_RADIO_061471101_SLICE=/absolute/path/to/the/slice
npm test -- tests/local-real-radio.test.ts
~~~

Required result:

~~~text
custody checks  PASS
VIVIENDA         73
HOGAR            56
PERSONA         137
~~~

If the manifest semantic hash produced by Python does not match the TypeScript recomputation, stop and report the exact serialization difference; do not weaken the gate.

## 3. B5 — live RedEngine equivalence

Use the authorized local RXDB source and already configured RedEngine bridge.

For a bounded set of CensusQueries, compile B4 SQL and B5 Redatam from the same canonical query.

Run both against the same RADIO `061471101`.

Start with:

1. COUNT VIVIENDA — expected 73;
2. COUNT HOGAR — expected 56;
3. COUNT PERSONA — expected 137;
4. PERSONA filtered by EDAD;
5. PERSONA filtered by P02;
6. PERSONA filtered through HOGAR.H22;
7. AVERAGE PERSONA.EDAD;
8. SHARE on a supported HOGAR condition;
9. a PROV breakdown;
10. a DPTO breakdown.

Compare normalized result values, not textual table formatting.

Do not promote B5 if Redatam's marker/CROSSTABS or SWITCH/AVERAGE semantics differ from the local SQL result.

## 4. B6 — manual public WebServer smoke

Using the emitted recipe, inspect the current public CPV2022 WebServer manually.

Confirm:

- the target page opens;
- entity/variable selectors named by the recipe exist;
- Área geográfica / Corte de área / Definición del universo controls still correspond to the recipe;
- the private-dwellings Programa surface accepts a small B5 program if manual execution is appropriate.

Do not automate remote submission merely for this gate.

## 5. Report

Return exactly three sections:

~~~text
B4 REAL RADIO
PASS | BLOCKERS
evidence

B5 REDENGINE EQUIVALENCE
PASS | BLOCKERS | MATERIAL DRIFT
evidence

B6 INDEC WEBSERVER
PASS | BLOCKERS | MATERIAL DRIFT
evidence
~~~

If B4 passes but B5/B6 do not, keep B4 qualified and leave the other target claims bounded. Do not weaken deterministic contracts to force convergence.
