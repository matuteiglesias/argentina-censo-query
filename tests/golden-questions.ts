import type { CensusQuery, SemanticIntent } from "../src/core/index.js";

const literal = (value: string | number | boolean) =>
  ({ kind: "literal", value }) as const;
const concept = (value: string) =>
  ({ kind: "concept", concept: value }) as const;

const geo = (conceptId: string) =>
  ({ type: "geography", concept: conceptId }) as const;

function intent(
  entityConcept: string,
  measure:
    | { type: "count" }
    | { type: "average"; variableConcept: string }
    | {
        type: "share";
        variableConcept: string;
        operator: "eq";
        valueConcept: string;
      },
  filters: SemanticIntent["filters"] = [],
  breakdown?: SemanticIntent["breakdown"],
): SemanticIntent {
  const base = {
    contract: "argentina.census-semantic-intent/v1" as const,
    original_question: "fixture",
    universe_concept: "vp",
    filters,
    ...(breakdown ? { breakdown } : {}),
  };

  if (measure.type === "count") {
    return {
      ...base,
      measure: { type: "count", entity_concept: entityConcept },
    };
  }
  if (measure.type === "average") {
    return {
      ...base,
      measure: {
        type: "average",
        entity_concept: entityConcept,
        variable_concept: measure.variableConcept,
      },
    };
  }
  return {
    ...base,
    measure: {
      type: "share",
      entity_concept: entityConcept,
      condition: {
        variable_concept: measure.variableConcept,
        operator: measure.operator,
        value: concept(measure.valueConcept),
      },
    },
  };
}

const pred = (
  variableConcept: string,
  operator: "eq" | "gt" | "gte" | "between",
  value:
    | ReturnType<typeof literal>
    | ReturnType<typeof concept>
    | readonly [ReturnType<typeof literal>, ReturnType<typeof literal>],
): SemanticIntent["filters"][number] => {
  if (operator === "between") {
    return {
      variable_concept: variableConcept,
      operator,
      value: value as [
        ReturnType<typeof literal>,
        ReturnType<typeof literal>,
      ],
    };
  }
  return {
    variable_concept: variableConcept,
    operator,
    value: value as ReturnType<typeof literal> | ReturnType<typeof concept>,
  };
};

function query(
  entity: "PERSONA" | "HOGAR" | "VIVIENDA",
  measure: CensusQuery["measure"],
  filters: CensusQuery["filters"] = [],
  level?: "PROV" | "DPTO",
): CensusQuery {
  return {
    contract: "argentina.census-query/v1",
    universe: { database: "VP", entity },
    measure,
    filters,
    breakdowns: level ? [{ type: "geography", level }] : [],
    geography_selection: { type: "all" },
  };
}

const RAW_GOLDEN_QUESTIONS: Array<{
  question: string;
  intent: SemanticIntent;
  expected: CensusQuery;
}> = [
  {
    question: "¿Cuántas mujeres de 20 a 29 años hay por provincia?",
    intent: intent(
      "person",
      { type: "count" },
      [
        pred("sex-at-birth", "eq", concept("woman")),
        pred("age", "between", [literal(20), literal(29)]),
      ],
      geo("province"),
    ),
    expected: query(
      "PERSONA",
      { type: "count", entity: "PERSONA" },
      [
        { variable: "PERSONA.P02", operator: "eq", value: 1 },
        { variable: "PERSONA.EDAD", operator: "between", value: [20, 29] },
      ],
      "PROV",
    ),
  },
  {
    question: "¿Cuántos varones mayores de 65 años hay por departamento?",
    intent: intent(
      "person",
      { type: "count" },
      [
        pred("sex-at-birth", "eq", concept("man")),
        pred("age", "gt", literal(65)),
      ],
      geo("department"),
    ),
    expected: query(
      "PERSONA",
      { type: "count", entity: "PERSONA" },
      [
        { variable: "PERSONA.P02", operator: "eq", value: 2 },
        { variable: "PERSONA.EDAD", operator: "gt", value: 65 },
      ],
      "DPTO",
    ),
  },
  {
    question: "¿Cuál es la edad promedio por provincia?",
    intent: intent(
      "person",
      { type: "average", variableConcept: "age" },
      [],
      geo("province"),
    ),
    expected: query(
      "PERSONA",
      { type: "average", entity: "PERSONA", variable: "PERSONA.EDAD" },
      [],
      "PROV",
    ),
  },
  {
    question: "¿Cuántas personas asisten actualmente a un establecimiento educativo por provincia?",
    intent: intent(
      "person",
      { type: "count" },
      [pred("school-attendance", "eq", concept("attends-education"))],
      geo("province"),
    ),
    expected: query(
      "PERSONA",
      { type: "count", entity: "PERSONA" },
      [{ variable: "PERSONA.P06", operator: "eq", value: 1 }],
      "PROV",
    ),
  },
  {
    question: "¿Cuántas personas no asisten actualmente por provincia?",
    intent: intent(
      "person",
      { type: "count" },
      [pred("school-attendance", "eq", concept("does-not-attend-education"))],
      geo("province"),
    ),
    expected: query(
      "PERSONA",
      { type: "count", entity: "PERSONA" },
      [{ variable: "PERSONA.P06", operator: "eq", value: 2 }],
      "PROV",
    ),
  },
  {
    question: "¿Cuántas personas cursan una carrera universitaria de grado por provincia?",
    intent: intent(
      "person",
      { type: "count" },
      [
        pred("school-attendance", "eq", concept("attends-education")),
        pred("current-education-level", "eq", concept("university-degree")),
      ],
      geo("province"),
    ),
    expected: query(
      "PERSONA",
      { type: "count", entity: "PERSONA" },
      [
        { variable: "PERSONA.P06", operator: "eq", value: 1 },
        { variable: "PERSONA.P07", operator: "eq", value: 6 },
      ],
      "PROV",
    ),
  },
  {
    question: "¿Cuántas personas cursan posgrado por provincia?",
    intent: intent(
      "person",
      { type: "count" },
      [pred("current-education-level", "eq", concept("postgraduate"))],
      geo("province"),
    ),
    expected: query(
      "PERSONA",
      { type: "count", entity: "PERSONA" },
      [{ variable: "PERSONA.P07", operator: "eq", value: 7 }],
      "PROV",
    ),
  },
  {
    question: "¿Cuántas personas de 65 años o más hay por sexo registrado al nacer?",
    intent: intent(
      "person",
      { type: "count" },
      [pred("age", "gte", literal(65))],
      { type: "variable", concept: "sex-at-birth" },
    ),
    expected: {
      ...query(
        "PERSONA",
        { type: "count", entity: "PERSONA" },
        [{ variable: "PERSONA.EDAD", operator: "gte", value: 65 }],
      ),
      breakdowns: [{ type: "variable", variable: "PERSONA.P02" }],
    },
  },
  {
    question: "¿Cuántos hogares alquilan su vivienda por provincia?",
    intent: intent(
      "household",
      { type: "count" },
      [pred("housing-tenure", "eq", concept("rented"))],
      geo("province"),
    ),
    expected: query(
      "HOGAR",
      { type: "count", entity: "HOGAR" },
      [{ variable: "HOGAR.H22", operator: "eq", value: 2 }],
      "PROV",
    ),
  },
  {
    question: "¿Qué porcentaje de hogares alquila por departamento?",
    intent: intent(
      "household",
      {
        type: "share",
        variableConcept: "housing-tenure",
        operator: "eq",
        valueConcept: "rented",
      },
      [],
      geo("department"),
    ),
    expected: query(
      "HOGAR",
      {
        type: "share",
        entity: "HOGAR",
        condition: { variable: "HOGAR.H22", operator: "eq", value: 2 },
      },
      [],
      "DPTO",
    ),
  },
  {
    question: "¿Cuántos hogares son propietarios por provincia?",
    intent: intent(
      "household",
      { type: "count" },
      [pred("housing-tenure", "eq", concept("owned"))],
      geo("province"),
    ),
    expected: query(
      "HOGAR",
      { type: "count", entity: "HOGAR" },
      [{ variable: "HOGAR.H22", operator: "eq", value: 1 }],
      "PROV",
    ),
  },
  {
    question: "¿Cuántos hogares tienen internet en la vivienda por provincia?",
    intent: intent(
      "household",
      { type: "count" },
      [pred("home-internet", "eq", concept("has-home-internet"))],
      geo("province"),
    ),
    expected: query(
      "HOGAR",
      { type: "count", entity: "HOGAR" },
      [{ variable: "HOGAR.H24A", operator: "eq", value: 1 }],
      "PROV",
    ),
  },
  {
    question: "¿Qué porcentaje de hogares no tiene internet por provincia?",
    intent: intent(
      "household",
      {
        type: "share",
        variableConcept: "home-internet",
        operator: "eq",
        valueConcept: "no-home-internet",
      },
      [],
      geo("province"),
    ),
    expected: query(
      "HOGAR",
      {
        type: "share",
        entity: "HOGAR",
        condition: { variable: "HOGAR.H24A", operator: "eq", value: 2 },
      },
      [],
      "PROV",
    ),
  },
  {
    question: "¿Cuántos hogares tienen cinco o más personas por provincia?",
    intent: intent(
      "household",
      { type: "count" },
      [pred("household-size", "gte", literal(5))],
      geo("province"),
    ),
    expected: query(
      "HOGAR",
      { type: "count", entity: "HOGAR" },
      [{ variable: "HOGAR.TOTPOBH", operator: "gte", value: 5 }],
      "PROV",
    ),
  },
  {
    question: "¿Cuál es el tamaño promedio del hogar por provincia?",
    intent: intent(
      "household",
      { type: "average", variableConcept: "household-size" },
      [],
      geo("province"),
    ),
    expected: query(
      "HOGAR",
      { type: "average", entity: "HOGAR", variable: "HOGAR.TOTPOBH" },
      [],
      "PROV",
    ),
  },
  {
    question: "¿Cuántos hogares tienen necesidades básicas insatisfechas por departamento?",
    intent: intent(
      "household",
      { type: "count" },
      [pred("unmet-basic-needs", "eq", concept("has-unmet-basic-needs"))],
      geo("department"),
    ),
    expected: query(
      "HOGAR",
      { type: "count", entity: "HOGAR" },
      [{ variable: "HOGAR.NBI_TOT", operator: "eq", value: 1 }],
      "DPTO",
    ),
  },
  {
    question: "¿Cuántas viviendas son casas por provincia?",
    intent: intent(
      "dwelling",
      { type: "count" },
      [pred("dwelling-type", "eq", concept("house"))],
      geo("province"),
    ),
    expected: query(
      "VIVIENDA",
      { type: "count", entity: "VIVIENDA" },
      [{ variable: "VIVIENDA.V01", operator: "eq", value: 1 }],
      "PROV",
    ),
  },
  {
    question: "¿Cuántas viviendas son departamentos por provincia?",
    intent: intent(
      "dwelling",
      { type: "count" },
      [pred("dwelling-type", "eq", concept("apartment"))],
      geo("province"),
    ),
    expected: query(
      "VIVIENDA",
      { type: "count", entity: "VIVIENDA" },
      [{ variable: "VIVIENDA.V01", operator: "eq", value: 4 }],
      "PROV",
    ),
  },
  {
    question: "¿Cuál es la cantidad promedio de hogares por vivienda por provincia?",
    intent: intent(
      "dwelling",
      { type: "average", variableConcept: "households-in-dwelling" },
      [],
      geo("province"),
    ),
    expected: query(
      "VIVIENDA",
      { type: "average", entity: "VIVIENDA", variable: "VIVIENDA.V06" },
      [],
      "PROV",
    ),
  },
  {
    question: "¿Cuántas personas viven en hogares que alquilan por provincia?",
    intent: intent(
      "person",
      { type: "count" },
      [pred("housing-tenure", "eq", concept("rented"))],
      geo("province"),
    ),
    expected: query(
      "PERSONA",
      { type: "count", entity: "PERSONA" },
      [{ variable: "HOGAR.H22", operator: "eq", value: 2 }],
      "PROV",
    ),
  },
];

export const GOLDEN_QUESTIONS = RAW_GOLDEN_QUESTIONS.map(
  ({ question, intent, expected }) => ({
    question,
    intent: { ...intent, original_question: question },
    expected,
  }),
);

