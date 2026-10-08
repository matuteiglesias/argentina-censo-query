# C4–C6 cloud qualification — 2026-10-08

## Scope

Stacked branch `feat/c4-c6-product-vertical` (PR #8), based on C3 PR #7.
Cloud implementation:
- POST /api/query: Golden or opted-in model interpretation -> resolver/B3 -> one CensusQuery -> CompilationBundle, QueryDescription, qualification registry, provenance.
- Next.js interactive query screen consumes /api/query. SQL, Redatam and INDEC are rendered from the same server response; edge outcomes do not compile.
- Opt-in POST /api/run only in NODE_ENV=development with CENSO_EXECUTION_MODE=local_radio, absolute CENSO_LOCAL_SLICE_ROOT, and loopback request checks.
- B4 executor verifies manifest and Parquet hashes, then validates that all Parquet XRADIO values equal the RADIO code in the verified manifest.
- Local run returns CanonicalResult aggregates and source RADIO identity; no arbitrary SQL, input file paths, microdata rows, or national result claims.
- C7 lightweight HTTP contract checks (not browser E2E).

## Verified GitHub Actions

- Branch commit `1d1a55f`, GitHub Actions push run `37729285836`: PASS.
- `npm run check`: strict TypeScript PASS; Vitest 130 passed, 15 intentionally skipped (18 test files passed, 3 skipped); Next.js 15 production build PASS.
- Next production build includes `/api/query` and `/api/run` as Node routes; native DuckDB is external to Webpack. The run handler itself rejects production execution before dynamic import.
- Supported C4 tests cover the exact 20 B8 queries and four negative outcomes. C5 tests cover explicit opt-in, production denial, loopback checks, mock CanonicalResult, synthetic RADIO executor identity disagreement, Parquet tampering and missing custody.
- C7 HTTP tests cover supported, ambiguous, unsupported and invalid envelope handling, plus disabled run route.

This is cloud synthetic/contract evidence only, not real VP data source qualification and not model-live evaluation.

## Known limitations

1. Live C3 Gemini evaluation: NOT RUN; no Google credentials in cloud.
2. Real local RADIO `061471101` execution via new UI/API: NOT RUN here (must use authorized local slice). Existing B4 prior evidence remains distinct.
3. Browser/Playwright end-to-end smoke: NOT RUN here. See docs/spec/C7_ACCEPTANCE_AND_LOCAL_HANDOFF.md.
4. Public preview deployment: NOT DONE. No Vercel project matching argentina-censo-query was found in the available project search. Do not automatically create an external deployment.
5. `npm ci` with GitHub Actions' npm 11 fails because the current C3 lockfile is missing optional platform dependencies. CI continues using the previous `npm install --no-audit --no-fund` workflow, which passes. Refresh cross-platform lockfile in a separate reviewed intervention, not silently here.
6. PR #7 is still the parent; PR #8 must not merge first.

## Scientific claim constraints

The qualification registry is unchanged. SHARE in Redatam remains qualified as derived from COUNT primitives rather than claiming final live SHARE equivalence. INDEC is reproduction instructions only and does not imply remote INDEC execution or endorsement. A local RADIO result cannot be described as an Argentina-wide estimate.
