"use client";

import { type FormEvent, useRef, useState } from "react";
import type { QuerySubmission } from "../../src/server/query-orchestrator.js";
import type { LocalQueryResponse } from "../../src/server/run-local-query.js";
import CopyButton from "./CopyButton";

type ReadySubmission = Extract<QuerySubmission, { status: "ready" }>;
type RunState =
  | { status: "running" }
  | { status: "complete"; data: LocalQueryResponse }
  | { status: "failed"; error: string }
  | null;

function badgeClass(status: string) {
  return "qualification-badge qualification-" + status.replaceAll("_", "-");
}

function formatValue(value: number, measure: "count" | "average" | "share") {
  if (measure === "share") {
    return (100 * value).toLocaleString("es-AR", { maximumFractionDigits: 2 }) + "%";
  }
  return value.toLocaleString("es-AR", {
    maximumFractionDigits: measure === "count" ? 0 : 3,
  });
}

function ResultPanel({
  submission,
  runState,
  onRun,
}: {
  submission: ReadySubmission;
  runState: RunState;
  onRun: () => void;
}) {
  const available = submission.execution.available;
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Resultados</p>
          <h2>Ejecución local</h2>
        </div>
        <span className="muted-badge">
          {available ? "Modo local · RADIO" : "Vista pública · sin ejecución"}
        </span>
      </div>

      {runState?.status === "complete" ? (
        <div className="local-result">
          <p className="local-scope">
            Resultado local · RADIO {runState.data.source.code}.
            No representa el total nacional.
          </p>
          <div className="result-table-container">
            <table className="result-table">
              <thead><tr><th>Desglose</th><th>Valor</th></tr></thead>
              <tbody>
                {runState.data.result.rows.map((row, index) => (
                  <tr key={row.breakdown ?? String(index)}>
                    <td>{row.breakdown ?? "Total"}</td>
                    <td>
                      {formatValue(row.value, runState.data.result.measure)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {runState.data.result.rows.length === 0 ? (
            <p>La consulta no devolvió filas para este RADIO.</p>
          ) : null}
          <p className="form-help">
            Manifiesto verificado: <code>{runState.data.source.manifestSemanticHash}</code>
          </p>
        </div>
      ) : (
        <div className="empty-result">
          <strong>
            {available
              ? "La consulta puede ejecutarse contra el RADIO local configurado."
              : "No hay un ejecutor disponible en esta instancia."}
          </strong>
          <p>
            {available
              ? "La fuente Parquet se verifica antes de cada ejecución. Sólo se devuelve un agregado de la consulta validada."
              : "La vista pública compila SQL, Redatam e instrucciones INDEC, pero no ejecuta microdatos ni muestra resultados nacionales simulados."}
          </p>
        </div>
      )}

      {runState?.status === "failed" ? (
        <p role="alert" className="inline-error">
          No se pudo ejecutar la consulta local: {runState.error}
        </p>
      ) : null}
      <button
        className="primary-action"
        type="button"
        onClick={onRun}
        disabled={!available || runState?.status === "running"}
      >
        {runState?.status === "running" ? "Ejecutando…" : "Ejecutar en RADIO local"}
      </button>
    </section>
  );
}

function ReadyView({
  submission,
  runState,
  onRun,
}: {
  submission: ReadySubmission;
  runState: RunState;
  onRun: () => void;
}) {
  const { bundle, description, qualifications, queryId, provenance } = submission;
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
          <div><dt>Universo</dt><dd>{description.universe}</dd></div>
          <div><dt>Medida</dt><dd>{description.measure}</dd></div>
          <div>
            <dt>Filtros</dt>
            <dd>{description.filters.length
              ? description.filters.join(" · ")
              : "Sin filtros adicionales"}</dd>
          </div>
          <div><dt>Desglose</dt><dd>{description.breakdown}</dd></div>
        </dl>
      </section>

      <ResultPanel submission={submission} runState={runState} onRun={onRun} />

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Reproducibilidad</p>
            <h2>Tres proyecciones, una sola consulta</h2>
          </div>
        </div>
        <div className="artifact-list">
          <details open>
            <summary><span>SQL · DuckDB logical schema</span><span className="summary-action">ver código</span></summary>
            <div className="artifact-body">
              <CopyButton value={bundle.targets.sql.code} />
              <pre>{bundle.targets.sql.code}</pre>
            </div>
          </details>
          <details>
            <summary><span>Redatam Process</span><span className="summary-action">ver código</span></summary>
            <div className="artifact-body">
              <CopyButton value={bundle.targets.redatam_process.code} />
              <pre>{bundle.targets.redatam_process.code}</pre>
            </div>
          </details>
          <details>
            <summary><span>INDEC WebServer</span><span className="summary-action">ver instrucciones</span></summary>
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
          <div><p className="section-kicker">Evidencia</p><h2>Qué podemos afirmar</h2></div>
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
          <div><dt>Fuente semántica</dt><dd>Censo 2022 · VP</dd></div>
          <div><dt>Release</dt><dd>{bundle.context.source_release_label}</dd></div>
          <div><dt>Catálogo</dt><dd>{bundle.context.catalog_id}</dd></div>
          <div><dt>Query ID</dt><dd className="mono">{queryId}</dd></div>
          <div><dt>Intérprete</dt><dd>{provenance.provider} · {provenance.requestedModel ?? "corpus B8"}</dd></div>
          <div><dt>Prompt / adaptador</dt><dd className="mono">{provenance.promptVersion} · {provenance.adapterVersion}</dd></div>
          <div><dt>Schema digest</dt><dd className="mono">{provenance.schemaDigest}</dd></div>
        </dl>
      </section>
    </>
  );
}

export default function QueryShell({ examples }: { examples: string[] }) {
  const [question, setQuestion] = useState(examples[0] ?? "");
  const [submission, setSubmission] = useState<QuerySubmission | null>(null);
  const [runState, setRunState] = useState<RunState>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);
  const runSequence = useRef(0);
  const controller = useRef<AbortController | null>(null);

  async function ask(value: string) {
    const id = ++requestSequence.current;
    ++runSequence.current;
    controller.current?.abort();
    controller.current = new AbortController();
    setBusy(true);
    setSubmission(null);
    setRunState(null);
    setError(null);
    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: value }),
        cache: "no-store",
        signal: controller.current.signal,
      });
      if (!response.ok) {
        const detail = (await response.json()) as { error?: string };
        throw new Error(detail.error ?? "query_pipeline_failure");
      }
      const result = (await response.json()) as QuerySubmission;
      if (id === requestSequence.current) setSubmission(result);
    } catch (caught) {
      if (id === requestSequence.current) {
        setError(caught instanceof Error ? caught.message : "query_pipeline_failure");
      }
    } finally {
      if (id === requestSequence.current) setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(question);
  }

  async function runLocal(submitted: ReadySubmission) {
    if (!submitted.execution.available) return;
    const id = ++runSequence.current;
    setRunState({ status: "running" });
    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: submitted.query }),
        cache: "no-store",
      });
      if (!response.ok) {
        const detail = (await response.json()) as { error?: string };
        throw new Error(detail.error ?? "local_query_failed");
      }
      const data = (await response.json()) as LocalQueryResponse;
      if (id === runSequence.current) {
        if (data.result.query_id !== submitted.queryId) {
          throw new Error("query_id_mismatch");
        }
        setRunState({ status: "complete", data });
      }
    } catch (caught) {
      if (id === runSequence.current) {
        setRunState({
          status: "failed",
          error: caught instanceof Error ? caught.message : "local_query_failed",
        });
      }
    }
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
              maxLength={1000}
            />
            <button type="submit" disabled={busy || !question.trim()}>
              {busy ? "Interpretando…" : "Interpretar"}
            </button>
          </div>
          <datalist id="golden-questions">
            {examples.map((item) => <option key={item} value={item} />)}
          </datalist>
          <p className="form-help">
            El intérprete produce conceptos; el catálogo determina los identificadores
            censales y compila las tres reproducciones. Sin ejecución nacional.
          </p>
        </form>
      </section>

      {busy ? <section className="panel"><p role="status">Interpretando y validando la consulta…</p></section> : null}
      {error ? (
        <section className="panel warning-panel" role="alert">
          <p className="section-kicker">No se pudo completar</p>
          <h2>La consulta no produjo un CensusQuery.</h2>
          <p>Error: {error}. Podés revisar la pregunta o reintentar.</p>
        </section>
      ) : null}

      {submission && submission.status !== "ready" ? (
        <section className="panel warning-panel">
          <p className="section-kicker">
            {submission.status === "needs_clarification" ? "Aclaración necesaria" : "Fuera de alcance"}
          </p>
          <h2>
            {submission.interpretation.status === "needs_clarification"
              ? submission.interpretation.prompt
              : submission.interpretation.message}
          </h2>
          {submission.interpretation.status === "needs_clarification" ? (
            <>
              <p className="form-help">
                Reformulá la pregunta especificando la definición que querés usar.
                No se ejecutó ninguna consulta.
              </p>
              <ul className="clarification-options">
                {submission.interpretation.options.map((option) => (
                  <li key={option.id}>
                    <strong>{option.label}</strong>
                    {option.description ? <span> · {option.description}</span> : null}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      ) : null}

      {submission?.status === "ready" ? (
        <ReadyView
          submission={submission}
          runState={runState}
          onRun={() => void runLocal(submission)}
        />
      ) : null}

      <section className="examples">
        <div className="section-heading">
          <div><p className="section-kicker">B8 · golden corpus</p><h2>Preguntas de especificación</h2></div>
          <span className="muted-badge">{examples.length} ejemplos</span>
        </div>
        <div className="example-grid">
          {examples.map((item) => (
            <button
              type="button"
              key={item}
              disabled={busy}
              onClick={() => {
                setQuestion(item);
                void ask(item);
              }}
            >
              {item}
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
