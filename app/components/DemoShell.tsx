"use client";

import { FormEvent, useMemo, useState } from "react";
import type { DemoCase, SupportedDemo } from "../../src/server/demo-model";
import CopyButton from "./CopyButton";

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("es").replace(/\s+/g, " ");
}

function badgeClass(status: string) {
  return "qualification-badge qualification-" + status.replaceAll("_", "-");
}

function ResultPlaceholder() {
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Resultado</p>
          <h2>Ejecución</h2>
        </div>
        <span className="muted-badge">local-only</span>
      </div>
      <div className="empty-result">
        <strong>No hay un executor web configurado en C1.</strong>
        <p>
          B4 ejecuta sólo contra un slice VP RADIO local verificado. Esta shell
          no publica microdatos ni presenta un resultado nacional ficticio.
        </p>
        <button type="button" disabled>
          Ejecutar
        </button>
      </div>
    </section>
  );
}

function SupportedView({ demo }: { demo: SupportedDemo }) {
  const { bundle, interpretation, qualifications, queryId } = demo;
  const webRecipe = bundle.targets.indec_web.steps.join("\n");

  return (
    <>
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Interpretación</p>
            <h2>Qué significa esta consulta</h2>
          </div>
          <span className="valid-badge">CensusQuery válido</span>
        </div>
        <dl className="interpretation-grid">
          <div>
            <dt>Universo</dt>
            <dd>{interpretation.universe}</dd>
          </div>
          <div>
            <dt>Medida</dt>
            <dd>{interpretation.measure}</dd>
          </div>
          <div>
            <dt>Filtros</dt>
            <dd>
              {interpretation.filters.length > 0
                ? interpretation.filters.join(" · ")
                : "Sin filtros adicionales"}
            </dd>
          </div>
          <div>
            <dt>Desglose</dt>
            <dd>{interpretation.breakdown}</dd>
          </div>
        </dl>
      </section>

      <ResultPlaceholder />

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Reproducibilidad</p>
            <h2>Tres proyecciones, una sola consulta</h2>
          </div>
        </div>

        <div className="artifact-list">
          <details open>
            <summary>
              <span>SQL · DuckDB logical schema</span>
              <span className="summary-action">ver código</span>
            </summary>
            <div className="artifact-body">
              <CopyButton value={bundle.targets.sql.code} />
              <pre>{bundle.targets.sql.code}</pre>
            </div>
          </details>

          <details>
            <summary>
              <span>Redatam Process</span>
              <span className="summary-action">ver código</span>
            </summary>
            <div className="artifact-body">
              <CopyButton value={bundle.targets.redatam_process.code} />
              <pre>{bundle.targets.redatam_process.code}</pre>
            </div>
          </details>

          <details>
            <summary>
              <span>INDEC WebServer</span>
              <span className="summary-action">ver instrucciones</span>
            </summary>
            <div className="artifact-body">
              <CopyButton value={webRecipe} label="Copiar instrucciones" />
              <ol className="recipe-list">
                {bundle.targets.indec_web.steps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </div>
          </details>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Evidencia</p>
            <h2>Qué podemos afirmar</h2>
          </div>
        </div>
        <div className="qualification-grid">
          {qualifications.map((item) => (
            <article key={item.target} className="qualification-card">
              <div className="qualification-card-top">
                <strong>
                  {item.target === "sql_local"
                    ? "SQL local"
                    : item.target === "redatam"
                      ? "Redatam"
                      : "INDEC Web"}
                </strong>
                <span className={badgeClass(item.status)}>{item.label}</span>
              </div>
              <p>{item.claim}</p>
              <small>{item.scope}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="panel provenance-panel">
        <p className="section-kicker">Provenance</p>
        <dl className="provenance-grid">
          <div>
            <dt>Fuente semántica</dt>
            <dd>Censo 2022 · VP</dd>
          </div>
          <div>
            <dt>Release</dt>
            <dd>{bundle.context.source_release_label}</dd>
          </div>
          <div>
            <dt>Catálogo</dt>
            <dd>{bundle.context.catalog_id}</dd>
          </div>
          <div>
            <dt>Query ID</dt>
            <dd className="mono">{queryId}</dd>
          </div>
        </dl>
      </section>
    </>
  );
}

export default function DemoShell({ cases }: { cases: DemoCase[] }) {
  const supported = useMemo(
    () => cases.filter((item): item is SupportedDemo => item.kind === "supported"),
    [cases],
  );
  const [question, setQuestion] = useState(supported[0]?.question ?? "");
  const [active, setActive] = useState<DemoCase | null>(supported[0] ?? null);
  const [unknown, setUnknown] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = normalize(question);
    const match = cases.find((item) => normalize(item.question) === target);
    setActive(match ?? null);
    setUnknown(!match);
  }

  return (
    <>
      <section className="query-card">
        <form onSubmit={submit}>
          <label htmlFor="question">¿Qué querés consultar del Censo 2022?</label>
          <div className="query-row">
            <input
              id="question"
              list="golden-questions"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ej.: ¿Cuántas mujeres de 20 a 29 años hay por provincia?"
            />
            <button type="submit">Interpretar</button>
          </div>
          <datalist id="golden-questions">
            {cases.map((item) => (
              <option key={item.question} value={item.question} />
            ))}
          </datalist>
          <p className="form-help">
            C1 usa el corpus golden como intérprete determinista. El modelo de
            lenguaje todavía no está conectado.
          </p>
        </form>
      </section>

      {unknown ? (
        <section className="panel warning-panel">
          <p className="section-kicker">Intérprete todavía no conectado</p>
          <h2>Esta pregunta no pertenece al corpus C1.</h2>
          <p>
            Probá una de las sugerencias del campo. En C3, el intérprete
            estructurado generalizará este paso sin escribir SQL ni Redatam.
          </p>
        </section>
      ) : null}

      {active?.kind === "edge" ? (
        <section className="panel warning-panel">
          <p className="section-kicker">
            {active.outcome.status === "needs_clarification"
              ? "Aclaración necesaria"
              : "Fuera de alcance"}
          </p>
          <h2>
            {active.outcome.status === "needs_clarification"
              ? active.outcome.prompt
              : active.outcome.message}
          </h2>
          {active.outcome.status === "needs_clarification" ? (
            <div className="clarification-options">
              {active.outcome.options.map((option) => (
                <button type="button" key={option.id} disabled>
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {active?.kind === "supported" ? <SupportedView demo={active} /> : null}

      <section className="examples">
        <div className="section-heading">
          <div>
            <p className="section-kicker">B8 · golden corpus</p>
            <h2>Preguntas de especificación</h2>
          </div>
          <span className="muted-badge">{supported.length} soportadas</span>
        </div>
        <div className="example-grid">
          {supported.slice(0, 8).map((item) => (
            <button
              type="button"
              key={item.question}
              onClick={() => {
                setQuestion(item.question);
                setActive(item);
                setUnknown(false);
              }}
            >
              {item.question}
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
