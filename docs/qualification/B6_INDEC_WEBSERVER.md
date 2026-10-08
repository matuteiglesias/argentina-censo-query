# B6 — INDEC WebServer qualification

## Scope

- Qualification date: 2026-10-07 (America/Argentina/Buenos_Aires)
- Repository base commit: `27f73f688a62a823787c856820dd5fb11774e28a`
- Qualification branch: `fix/b6-web-recipe-qualification`
- Public base: `https://redatam.indec.gob.ar/`
- Database checked: `CPV2022`
- Method: read-only public-page inspection and rendered-control inspection. No query form was submitted, no result table was scraped, and no undocumented request was used.

## Page-family evidence

All URLs below opened with `BASE=CPV2022` and the expected title/role.

| Family | Current URL / ITEM | Visible role and controls checked |
| --- | --- | --- |
| Private-population counts | `/binarg/RpWebStats.exe/AreaList?BASE=CPV2022&ITEM=CONTEOSPPART&lang=ESP` | “Viviendas particulares · Conteos · Total de población”; `Entidad a contar`, `Área geográfica`, `Corte de área`, `Definición del universo`, `Tipo de salida`; `Persona`, `País`, `Provincia`, and `Departamento` options present. |
| Private household/dwelling counts | `/binarg/RpWebStats.exe/AreaList?BASE=CPV2022&ITEM=CONTEOSVHPART&lang=ESP` | “Total de viviendas/hogares”; same controls; `Vivienda` and `Hogar` options present. |
| PERSONA frequency | `/binarg/RpWebStats.exe/Frequency?BASE=CPV2022&ITEM=FREQPOBPART&lang=ESP` | “Frecuencias · Población”; `Seleccione una o más variables`, `Corte de área`, `Área geográfica`, `Definición del universo`, `Tipo de salida`; `Sexo registrado al nacer`, `Edad`, `Cursa o asiste...`, and `Nivel educativo...` options present. |
| HOGAR frequency | `/binarg/RpWebStats.exe/Frequency?BASE=CPV2022&ITEM=FREQHOG&lang=ESP` | “Frecuencias · Hogares”; same frequency controls; `HOGAR.TOTPOBH`, `HOGAR.REGTEN`, `HOGAR.INTERNET`, and `HOGAR.NBI_TOT` options present. |
| VIVIENDA frequency | `/binarg/RpWebStats.exe/Frequency?BASE=CPV2022&ITEM=FREQVIVPART&lang=ESP` | “Frecuencias · Viviendas”; same frequency controls; dwelling type, occupancy, `VIVIENDA.TOTHOG`, and `VIVIENDA.TOTPOBV` options present. |
| Averages | `/binarg/RpWebStats.exe/CrossTab?BASE=CPV2022&ITEM=PROMEDIOSPART&lang=ESP` | “Estadísticas · Promedios”; `Promedios de`, `Por (fila)`, `Por (columna)`, `Corte de área`, `Área geográfica`, `Definición del universo`, `Tipo de salida`. **Drift:** the live `Promedios de` selector exposed only `HOGAR.TOTPH` and `HOGAR.TOTPM`, not the current catalog averages. |
| PERSONA selected/total | `/binarg/RpWebStats.exe/Qts?BASE=CPV2022&ITEM=CONTEOPOBPART&lang=ESP` | “Conteos · Población”; `Seleccionar una o más condiciones`, `Cómputos a incluir en la tabla de salida`, `Corte de área`, `Área geográfica`, `Definición del universo`; `Total` and `Seleccionado` options present. |
| HOGAR selected/total | `/argbin/RpWebStats.exe/Qts?BASE=CPV2022&ITEM=CONTEOHOG&lang=ESP` | “Conteos · Hogares”; same selected/total controls; route is **`/argbin/`**, unlike the other checked routes. |
| Programa | `/binarg/RpWebStats.exe/CmdSet?BASE=CPV2022&ITEM=PROGVIVPART&lang=ESP` | “Escribir programa Redatam+SP (solo para usuarios avanzados) · Viviendas particulares”; rendered page exposes an editable `textarea` program surface and an `Ejecutar` control; dictionary lists `PROV`, `DPTO`, `VIVIENDA`, `HOGAR`, and `PERSONA`, including `PROV.IDPROV`, `DPTO.IDPTO`, `HOGAR.H22`, `HOGAR.TOTPOBH`, `PERSONA.P02`, and `PERSONA.EDAD`. |

The page titles and control labels above were checked against the rendered public interface, not inferred from compiler strings.

## Representative emitted recipes

The compiler's deterministic routing over the 20 current golden queries is:

| Golden shape | Example | Classification |
| --- | --- | --- |
| COUNT PERSONA + geographic breakdown + filters | women aged 20–29 by province | Standard `CONTEOSPPART`; `Entidad a contar = PERSONA`, `Corte de área = Provincia`, universe filter for `P02 = 1` and `EDAD` 20–29. |
| COUNT HOGAR + geographic breakdown + filter | rented households by department | Standard `CONTEOSVHPART`; `Entidad a contar = HOGAR`, `Corte de área = Departamento`, universe filter for `H22 = 2`. |
| COUNT + variable breakdown | persons 65+ by sex registered at birth | Standard `FREQPOBPART`; `Seleccione una o más variables = Sexo registrado al nacer`, `Corte de área = País`, `Área geográfica = Toda la base`, universe filter `EDAD >= 65`. |
| AVERAGE | average age by province; average household size; average households per dwelling | **Programa fallback**. The standard averages control cannot represent the emitted variables, so no standard average recipe is emitted. |
| SHARE | renting-household share by department | Standard `CONTEOHOG`; `Seleccionar una o más condiciones = HOGAR.H22 = 2`, `Cómputos ... = Total + Seleccionado`, `Corte de área = Departamento`. The declared quantity remains `Seleccionado / Total` within the base universe. |
| Unsupported standard shape | any share with a variable breakdown, or a non-PERSONA/HOGAR share | Programa fallback. |

The classification is deterministic from the `CensusQuery` shape plus the checked standard-average allowlist. No golden query receives a standard average recipe that the current UI cannot represent.

Explicit golden-query classification:

1. women aged 20–29 by province — **STANDARD WEB FORM** (`CONTEOSPPART`)
2. men over 65 by department — **STANDARD WEB FORM** (`CONTEOSPPART`)
3. average age by province — **PROGRAMA FALLBACK**
4. people currently attending education by province — **STANDARD WEB FORM** (`CONTEOSPPART`)
5. people not currently attending by province — **STANDARD WEB FORM** (`CONTEOSPPART`)
6. people attending university degree by province — **STANDARD WEB FORM** (`CONTEOSPPART`)
7. people attending postgraduate studies by province — **STANDARD WEB FORM** (`CONTEOSPPART`)
8. people aged 65+ by sex at birth — **STANDARD WEB FORM** (`FREQPOBPART`)
9. rented households by province — **STANDARD WEB FORM** (`CONTEOSVHPART`)
10. renting-household share by department — **STANDARD WEB FORM** (`CONTEOHOG`)
11. owner households by province — **STANDARD WEB FORM** (`CONTEOSVHPART`)
12. households with home internet by province — **STANDARD WEB FORM** (`CONTEOSVHPART`)
13. households without home internet by province — **STANDARD WEB FORM** (`CONTEOHOG`)
14. households with five or more people by province — **STANDARD WEB FORM** (`CONTEOSVHPART`)
15. average household size by province — **PROGRAMA FALLBACK**
16. households with unmet basic needs by department — **STANDARD WEB FORM** (`CONTEOSVHPART`)
17. houses by province — **STANDARD WEB FORM** (`CONTEOSVHPART`)
18. apartments by province — **STANDARD WEB FORM** (`CONTEOSVHPART`)
19. average households per dwelling by province — **PROGRAMA FALLBACK**
20. persons living in rented households by province — **STANDARD WEB FORM** (`CONTEOSPPART`)

## Programa boundary

The Programa page exists and is editable, but B5 live RedEngine execution/equivalence was not qualified in this run. Accordingly, this evidence confirms the fallback surface and its documented entity/geography vocabulary only; it does not claim that a generated B5 program was accepted or executed by INDEC.

## Result comparison and limitations

No live result comparison is recorded: performing that step would require manually submitting the public forms, which was intentionally not automated, and no authorized B5 execution result was available for comparison. This qualification therefore closes the current page/control compatibility findings and the deterministic fallback correction, but leaves the bounded manual result smoke and B5-dependent Programa acceptance as open evidence gates.

This document is a freshness snapshot. It does not establish an API, INDEC endorsement, URL permanence, or statistical equivalence between WebServer output, SQL, and Redatam.
