import QueryShell from "./components/QueryShell";
import { GOLDEN_QUESTIONS } from "../src/core/index.js";

export default function HomePage() {
  const examples = GOLDEN_QUESTIONS.slice(0, 8).map((item) => item.question);

  return (
    <main className="page-shell">
      <header className="site-header">
        <div>
          <p className="eyebrow">Censo 2022 · Argentina</p>
          <h1>Consultá el Censo 2022</h1>
          <p className="lede">
            Convertimos una pregunta estadística en una interpretación explícita,
            SQL, Redatam Process e instrucciones de reproducción en INDEC.
          </p>
        </div>
        <div className="header-status">
          <span className="status-dot" aria-hidden="true" />
          C4–C6 · compilación reproducible
        </div>
      </header>

      <QueryShell examples={examples} />

      <footer>
        Proyecto independiente. No implica aval ni operación por parte de INDEC,
        CELADE/CEPAL o Redatam.
      </footer>
    </main>
  );
}
