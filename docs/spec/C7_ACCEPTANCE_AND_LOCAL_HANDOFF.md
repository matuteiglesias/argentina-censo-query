# C7 — acceptance and local Codex handoff

## State and merge graph

- PR #7: C3 SemanticInterpreter (base main; unmerged at time C4-C6 began).
- PR #8: C4-C6 server vertical (base feat/c3-interpreter-contract).
- Do not merge #8 before #7. Rebase/retarget #8 to main after merging #7, then rerun all checks.
- No provider credentials or local VP RADIO data belong in GitHub CI or the application preview.

## Acceptance matrix

| Surface | Cloud-checkable | Local-only |
|---|---|---|
| C4 supported corpus | 20/20 exactly expected CensusQuery, one shared bundle and evidence | browser submit uses /api/query |
| C4 negative corpus | 4/4 statuses, no bundles/queries | ambiguity/unsupported UX visible |
| C4 interpreter failure | typed error, no fabricated query | inspect 503/504/502/422 when configured |
| C5 server policy | production always disabled; explicit dev opt-in; loopback checks | run with authorized verified slice |
| C5 identity | RADIO selection code validation + XRADIO match | verify manifest and 73/56/137 baseline |
| C5 aggregate | Direct CanonicalResult normalizer | actual RADIO results and source provenance |
| C6 reproduction | SQL/Redatam/INDEC all from same CensusQuery | inspect/copy three outputs in browser |
| C6 qualification | only registry from core | badge claims consistent with evidence |
| C7 preview | Next production build; /api/run must be disabled | optional compile-only preview deploy |

## Local Codex task: finish verification, not another rewrite

Read AGENTS.md, docs/spec/C4_C6_PRODUCT_VERTICAL.md, and this file. Review the PR #8 diff and inspect existing tests first.

1. Check branch ancestry and status. Work on feat/c4-c6-product-vertical, do not merge. If C3 PR #7 has merged meanwhile, rebase carefully and retarget PR #8.
2. Run npm install --no-audit --no-fund and npm run check. Investigate npm ci separately: the C3 lockfile lacked optional-platform entries with npm 11 on GitHub Actions. Do not regenerate an uncontrolled lockfile or suppress compiler errors; capture versions and diff.
3. Run npm run eval:c3 with GoldenInterpreter: expect 20/20 exact, 4/4 negative, zero unsafe acceptance. Live Gemini evaluation requires explicit user-authorized credentials and remains independent.
4. Smoke POST /api/query with a supported golden, an ambiguous edge, an unsupported edge and an unknown question. Ready must contain query, queryId, description, compilation bundle, qualifications and provenance. Edge outcomes must not contain query or bundle.
5. In production via npm run build && npm run start, POST /api/run must return 404 even with root/mode env set. Do not mount microdata in a public deployment.
6. On the authorized workstation with CENSO_EXECUTION_MODE=local_radio and CENSO_LOCAL_SLICE_ROOT pointing at the verified VP RADIO slice, run npm run dev -- --hostname 127.0.0.1. POST /api/run must accept only CensusQuery, reject SQL/path payloads, verify custody, and report source.scope=RADIO and code=061471101, not Argentina.
7. Validate SQL rows and canonical numeric values for representative COUNT and SHARE. Tamper tests must fail: wrong manifest RADIO vs source XRADIO, invalid validation.json, Parquet hash mismatch. Do not overwrite real source files to test tampering: use a scratch copy or synthetic fixture.
8. Browser E2E smoke (Playwright if already available locally; do not add it as a runtime dependency): submit golden question, inspect interpretation, copy all three outputs, see qualification and query ID; submit '¿Cuántos universitarios hay?' and see clarification without query; submit unsupported question and see no code; in local mode click Run and inspect RADIO table; in preview mode the button must be disabled. Confirm all flows at mobile width.
9. Review whether the default GoldenInterpreter mode meets expectations; arbitrary free-form questions should be visibly unsupported until opt-in model mode is configured. Never silently fall back to GoldenInterpreter when configured Google fails.
10. Update docs/qualification with exact tested commit, npm/Node versions, suite numbers, E2E outcomes, local source identity and known limitations. Mark PR #8 ready only when gates pass. No automatic merge or public deployment without checking explicit mode.

Do not build agents, RAG, auth, DB, national hosting, map UI, or arbitrary SQL editor as part of C7.

## Non-blocking follow-ups

- Live Google model evaluation remains C3 qualification, not a C4/C5 correctness prerequisite.
- Re-generate the cross-platform optional package-lock entries in a separate, reviewed change, then switch CI back to npm ci.
- An optional preview deployment must be compile-only with no CENSO_LOCAL_SLICE_ROOT.
