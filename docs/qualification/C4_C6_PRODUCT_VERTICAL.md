# C4–C6/C7 local qualification — 2026-10-08

## Scope

Branch `feat/c4-c6-product-vertical` (PR #8), commit under verification: `d9a4ffb`.
PR #7 (`feat/c3-interpreter-contract`, `39c03df`) remains open and is the parent; no merge was performed.
Cloud implementation:
- POST /api/query: Golden or opted-in model interpretation -> resolver/B3 -> one CensusQuery -> CompilationBundle, QueryDescription, qualification registry, provenance.
- Next.js interactive query screen consumes /api/query. SQL, Redatam and INDEC are rendered from the same server response; edge outcomes do not compile.
- Opt-in POST /api/run only in NODE_ENV=development with CENSO_EXECUTION_MODE=local_radio, absolute CENSO_LOCAL_SLICE_ROOT, and loopback request checks.
- B4 executor verifies manifest and Parquet hashes, then validates that all Parquet XRADIO values equal the RADIO code in the verified manifest.
- Local run returns CanonicalResult aggregates and source RADIO identity; no arbitrary SQL, input file paths, microdata rows, or national result claims.
- C7 lightweight HTTP contract checks (not browser E2E).

## Commands and results

- `node v22.23.2`, npm `10.9.8`; the initial `npm ci` was affected by registry `EAI_AGAIN` and npm's `Exit handler never called`.
- npm `11.21.0` reproduced the actionable lockfile issue: `npm ci` rejected missing optional DuckDB and Rollup platform entries.
- Controlled `npx npm@11 install --package-lock-only --ignore-scripts --no-audit --no-fund` added only those optional platform entries (456 lines; no direct dependency/version changes). `npx npm@11 ci --no-audit --no-fund` then passed.
- `npm run check`: PASS; TypeScript, 18 test files passed / 3 skipped, 130 tests passed / 15 skipped, Next production build passed.
- `npm run eval:c3`: GoldenInterpreter PASS, 20/20 exact, 4/4 negative, 0 unsafe acceptance.
- Local `POST /api/query`: golden returned `ready` with one CensusQuery, query ID, bundle, qualifications and provenance; ambiguous returned `needs_clarification` without query/bundle; unsupported and unknown returned `unsupported` without query/bundle.
- Production `npm run build && npm run start` with local execution variables set: `POST /api/run` returned HTTP 404 `local_execution_disabled`.
- Chrome headless UI smoke: golden displayed interpretation, reproducibility sections and public no-execution state; ambiguous question displayed clarification and no execution. The copy controls are rendered from the same three server artifacts.

## Verified GitHub Actions

- Branch commit `1d1a55f`, GitHub Actions push run `37729285836`: PASS.
- `npm run check`: strict TypeScript PASS; Vitest 130 passed, 15 intentionally skipped (18 test files passed, 3 skipped); Next.js 15 production build PASS.
- Next production build includes `/api/query` and `/api/run` as Node routes; native DuckDB is external to Webpack. The run handler itself rejects production execution before dynamic import.
- Supported C4 tests cover the exact 20 B8 queries and four negative outcomes. C5 tests cover explicit opt-in, production denial, loopback checks, mock CanonicalResult, synthetic RADIO executor identity disagreement, Parquet tampering and missing custody.
- C7 HTTP tests cover supported, ambiguous, unsupported and invalid envelope handling, plus disabled run route.

These are cloud/contract and local compile-only checks, not real VP data source qualification and not model-live evaluation.

## Known limitations

1. Live C3 Gemini evaluation: NOT RUN; no Google credentials in cloud.
2. Real local RADIO `061471101` execution via new UI/API: NOT RUN. No authorized verified slice or `validation.json` was present under `/home/matias`; therefore COUNT/SHARE numeric values, manifest hash and `RADIO 061471101` provenance were not claimed.
3. Browser smoke was run with Chrome headless, not Playwright: compile-only golden and clarification flows passed; local result and copy-to-clipboard effects were not exercised against a real slice.
4. Public preview deployment: NOT DONE. No Vercel project matching argentina-censo-query was found in the available project search. Do not automatically create an external deployment.
5. The npm 11 lockfile issue was corrected in the reviewed package-lock diff described above; CI/workflow policy was otherwise unchanged.
6. PR #7 is still the parent; PR #8 must not merge first.

## Scientific claim constraints

The qualification registry is unchanged. SHARE in Redatam remains qualified as derived from COUNT primitives rather than claiming final live SHARE equivalence. INDEC is reproduction instructions only and does not imply remote INDEC execution or endorsement. A local RADIO result cannot be described as an Argentina-wide estimate.
