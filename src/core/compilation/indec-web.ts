import type { CensusCatalog } from "../contracts/catalog.js";
import type { CensusQuery } from "../contracts/census-query.js";
import type { IndecWebRecipeSchema } from "../contracts/compilation.js";
import type { z } from "zod";
import {
  assertCompilableQuery,
  variableLabel,
} from "./shared.js";
import {
  compileRedatam,
  renderRedatamFilterExpression,
  renderRedatamPredicate,
} from "./redatam.js";

export type IndecWebRecipe = z.infer<typeof IndecWebRecipeSchema>;

const ROOT = "https://redatam.indec.gob.ar/binarg/RpWebStats.exe";

const FREQUENCY_URL = {
  PERSONA: `${ROOT}/Frequency?BASE=CPV2022&ITEM=FREQPOBPART&lang=ESP`,
  HOGAR: `${ROOT}/Frequency?BASE=CPV2022&ITEM=FREQHOG&lang=ESP`,
  VIVIENDA: `${ROOT}/Frequency?BASE=CPV2022&ITEM=FREQVIVPART&lang=ESP`,
} as const;

const TOTAL_COUNT_URL = {
  PERSONA: `${ROOT}/AreaList?BASE=CPV2022&ITEM=CONTEOSPPART&lang=ESP`,
  HOGAR: `${ROOT}/AreaList?BASE=CPV2022&ITEM=CONTEOSVHPART&lang=ESP`,
  VIVIENDA: `${ROOT}/AreaList?BASE=CPV2022&ITEM=CONTEOSVHPART&lang=ESP`,
} as const;

const SELECTED_COUNT_URL = {
  PERSONA: `${ROOT}/Qts?BASE=CPV2022&ITEM=CONTEOPOBPART&lang=ESP`,
  HOGAR: "https://redatam.indec.gob.ar/argbin/RpWebStats.exe/Qts?BASE=CPV2022&ITEM=CONTEOHOG&lang=ESP",
} as const;

const AVERAGE_URL =
  `${ROOT}/CrossTab?BASE=CPV2022&ITEM=PROMEDIOSPART&lang=ESP`;
const PROGRAM_URL =
  `${ROOT}/CmdSet?BASE=CPV2022&ITEM=PROGVIVPART&lang=ESP`;

// Qualification of PROMEDIOSPART on 2026-10-07 found only these live options.
// Keep this allowlist narrow so an average is not advertised as a standard
// recipe unless the current control can represent its variable literally.
const STANDARD_AVERAGE_VARIABLES = new Set(["HOGAR.TOTPH", "HOGAR.TOTPM"]);

function areaBreakdown(query: CensusQuery): string | null {
  const breakdown = query.breakdowns[0];
  if (!breakdown || breakdown.type !== "geography") return null;
  return breakdown.level === "PROV" ? "Provincia" : "Departamento";
}

function programFallback(
  query: CensusQuery,
  redatamCode: string,
  universe: string | null,
): IndecWebRecipe {
  return {
    target: "indec_web_recipe",
    contract: "indec-redatam-web-recipe/v1",
    database: "Censo 2022 · Viviendas particulares (CPV2022)",
    entity: query.universe.entity,
    area: "Toda la base",
    area_breakdown: areaBreakdown(query),
    universe_filter: universe,
    output: "Tabla",
    steps: [
      `Abrí: ${PROGRAM_URL}`,
      "Elegí la superficie Programa de Viviendas particulares.",
      "Pegá el código Redatam Process generado por esta misma CensusQuery.",
      "Revisá visualmente que entidad, universo y corte geográfico coincidan con la interpretación mostrada.",
      "Ejecutá manualmente sólo si querés reproducir la consulta en el WebServer de INDEC.",
      "Código a copiar:\n" + redatamCode,
    ],
  };
}

export function compileIndecWebRecipe(
  input: unknown,
  catalog: CensusCatalog,
): IndecWebRecipe {
  const query = assertCompilableQuery(input, catalog);
  const redatam = compileRedatam(query, catalog);
  const universe = renderRedatamFilterExpression(query) ?? null;
  const breakdown = query.breakdowns[0];
  const geo = areaBreakdown(query);

  if (query.measure.type === "count" && breakdown?.type === "variable") {
    const label = variableLabel(catalog, breakdown.variable);
    return {
      target: "indec_web_recipe",
      contract: "indec-redatam-web-recipe/v1",
      database: "Censo 2022 · Viviendas particulares (CPV2022)",
      entity: query.universe.entity,
      area: "Toda la base",
      area_breakdown: null,
      universe_filter: universe,
      output: "Tabla · valores absolutos",
      steps: [
        `Abrí: ${FREQUENCY_URL[query.universe.entity]}`,
        `En "Seleccione una o más variables", elegí: ${label}.`,
        'En "Corte de área", elegí: País.',
        'Mantené "Área geográfica" en "Toda la base".',
        universe
          ? `En "Definición del universo", reproducí este filtro: ${universe}`
          : 'Mantené "Definición del universo" en "(toda la base)".',
        'Elegí "Tabla" y valores absolutos.',
        "Ejecutá manualmente.",
      ],
    };
  }

  if (query.measure.type === "count") {
    return {
      target: "indec_web_recipe",
      contract: "indec-redatam-web-recipe/v1",
      database: "Censo 2022 · Viviendas particulares (CPV2022)",
      entity: query.universe.entity,
      area: "Toda la base",
      area_breakdown: geo,
      universe_filter: universe,
      output: "Tabla · conteo",
      steps: [
        `Abrí: ${TOTAL_COUNT_URL[query.universe.entity]}`,
        `En "Entidad a contar", elegí: ${query.universe.entity}.`,
        'Mantené "Área geográfica" en "Toda la base".',
        geo
          ? `En "Corte de área", elegí: ${geo}.`
          : 'En "Corte de área", elegí: País.',
        universe
          ? `En "Definición del universo", reproducí este filtro: ${universe}`
          : 'Mantené "Definición del universo" en "(toda la base)".',
        'Elegí "Tabla" y ejecutá manualmente.',
      ],
    };
  }

  if (
    query.measure.type === "average" &&
    STANDARD_AVERAGE_VARIABLES.has(query.measure.variable)
  ) {
    const variable = variableLabel(catalog, query.measure.variable);
    const steps = [
      `Abrí: ${AVERAGE_URL}`,
      `En "Promedios de", elegí: ${variable}.`,
    ];
    if (breakdown?.type === "variable") {
      steps.push(
        `En "Por (fila)", elegí: ${variableLabel(catalog, breakdown.variable)}.`,
      );
    } else if (geo) {
      steps.push(`En "Corte de área", elegí: ${geo}.`);
    } else {
      steps.push('En "Corte de área", elegí: País.');
    }
    steps.push(
      'Mantené "Área geográfica" en "Toda la base".',
      universe
        ? `En "Definición del universo", reproducí este filtro: ${universe}`
        : 'Mantené "Definición del universo" en "(toda la base)".',
      'Elegí "Tabla" y ejecutá manualmente.',
    );
    return {
      target: "indec_web_recipe",
      contract: "indec-redatam-web-recipe/v1",
      database: "Censo 2022 · Viviendas particulares (CPV2022)",
      entity: query.universe.entity,
      area: "Toda la base",
      area_breakdown: geo,
      universe_filter: universe,
      output: "Tabla · promedio",
      steps,
    };
  }

  if (
    query.measure.type === "share" &&
    (query.universe.entity === "PERSONA" || query.universe.entity === "HOGAR") &&
    (!breakdown || breakdown.type === "geography")
  ) {
    const condition = renderRedatamPredicate(query.measure.condition);
    return {
      target: "indec_web_recipe",
      contract: "indec-redatam-web-recipe/v1",
      database: "Censo 2022 · Viviendas particulares (CPV2022)",
      entity: query.universe.entity,
      area: "Toda la base",
      area_breakdown: geo,
      universe_filter: universe,
      output: "Tabla · Total + Seleccionado; proporción = Seleccionado / Total",
      steps: [
        `Abrí: ${SELECTED_COUNT_URL[query.universe.entity]}`,
        `En "Seleccionar una o más condiciones", construí: ${condition}`,
        'En "Cómputos a incluir", seleccioná Total y Seleccionado.',
        geo
          ? `En "Corte de área", elegí: ${geo}.`
          : 'En "Corte de área", elegí: País.',
        universe
          ? `En "Definición del universo", reproducí el filtro base: ${universe}`
          : 'Mantené "Definición del universo" en "(toda la base)".',
        "La CensusQuery define SHARE como Seleccionado / Total dentro del universo filtrado.",
        'Elegí "Tabla" y ejecutá manualmente.',
      ],
    };
  }

  return programFallback(query, redatam.code, universe);
}
