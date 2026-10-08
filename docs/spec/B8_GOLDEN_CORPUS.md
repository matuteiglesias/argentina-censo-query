# B8 — Product golden corpus

The twenty supported golden questions are not demos. They are the first semantic product specification.

They live under `src/core/golden/questions.ts` so tests, the C1 shell and the future model-evaluation harness consume the same source of truth.

The corpus covers:

- PERSONA counts and multiple filters;
- PERSONA average;
- categorical and geographic breakdowns;
- HOGAR count/share;
- VIVIENDA count/average;
- ancestor predicates;
- education/internet/NBI/tenure concepts.

A separate edge-case corpus under `src/core/golden/edge-cases.ts` specifies ambiguity and unsupported behavior. These cases must never be forced into a CensusQuery merely because a model can produce a plausible interpretation.

The future LLM is accepted only if it reproduces these expected semantic outcomes; everything below SemanticIntent remains deterministic.
