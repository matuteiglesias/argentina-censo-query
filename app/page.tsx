import DemoShell from "./components/DemoShell";
import { buildDemoCases } from "../src/server/demo-model";

export default function HomePage() {
  const cases = buildDemoCases();

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
          C1 · shell sin LLM
        </div>
      </header>

      <DemoShell cases={cases} />

      <footer>
        Proyecto independiente. No implica aval ni operación por parte de INDEC,
        CELADE/CEPAL o Redatam.
      </footer>
    </main>
  );
}
