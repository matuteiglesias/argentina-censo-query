# A0 — Product contract

## Product

Repository: **argentina-censo-query**.

Working user-facing description: **Consultá el Censo 2022**.

The product accepts one natural-language statistical question about the Argentine 2022 Census and helps a user formalize that question transparently.

Its primary successful output is a **compilation bundle**, not a statistical answer.

## Input

One user question, initially optimized for Spanish:

> ¿Cuántas mujeres de 20 a 29 años hay por provincia?

The public interface may later preserve a short clarification exchange, but v1 is not a general chat assistant.

## Semantic pipeline

~~~text
Natural-language question
          │
          ▼
   SemanticIntent
  (concepts only)
          │
          ▼
 deterministic catalog
      resolution
          │
          ▼
     CensusQuery
   canonical AST v1
          │
          ▼
      validation
          │
     ┌────┼─────────────┐
     ▼    ▼             ▼
    SQL  Redatam    INDEC Web
     │    copy         recipe
     │
     └── optional B4 local qualification
         verified VP RADIO Parquet
         in-memory DuckDB
~~~

### Authority

CensusQuery is the sole authoritative interpretation of statistical meaning.

SQL, Redatam Process, the INDEC WebServer recipe, and B4 local execution are downstream projections/uses of that same query. They may never be interpreted independently and reconciled after the fact.

## Product outcomes

A question has exactly one of three semantic outcomes:

1. **candidate** — enough meaning was extracted to attempt deterministic resolution;
2. **needs_clarification** — two or more materially different supported interpretations remain plausible;
3. **unsupported** — the requested operation is outside the supported grammar or universe.

Only a resolved and validated candidate can become a CensusQuery.

## Successful public experience

For a valid question the user sees:

- interpreted universe;
- measure;
- filters;
- breakdown;
- provenance/catalog identity;
- copyable SQL;
- copyable Redatam Process;
- copyable INDEC WebServer reproduction instructions.

The interpretation is shown before target code because semantic transparency is the primary product property.

## Local execution is a separate qualification surface

B4 is authorized as local scientific/development infrastructure.

It may execute only deterministic compiler-produced SQL against an explicitly supplied, verified VP RADIO slice. It is intended to:

- test SQL semantics against known permanent laboratories;
- support future SQL ↔ Redatam differential validation;
- make compiler regressions observable.

B4 is **not** authorization for a hosted national Census database, arbitrary SQL, public microdata access, or result-serving product.

## No Redatam/INDEC remote execution

The repository still does not:

- execute Redatam programs itself;
- submit programs or forms to INDEC;
- scrape INDEC results;
- treat the public WebServer as an API.

B5 and B6 stop at code/instructions.

## Layer ownership

~~~text
rxdb-extractor
  generic RXDB extraction mechanics

argentina-censo2022-rxdb
  Argentine source/release/evidence contracts

argentina-censo-query
  semantic catalog
  SemanticIntent
  CensusQuery
  validation/resolution
  analytical target compilers
  bounded local query qualification
  product UI
~~~

The query product must not reimplement extraction mechanics.

## First supported Census universe

The first grammar targets **VP — persons, households and private dwellings**.

A user request for "all people counted by the Census" must not silently collapse to VP if other Census universes would be required.

## Future UI assumption

The anticipated application stack is Next.js + TypeScript, but framework choice remains downstream of the core contracts. The semantic core is ordinary TypeScript and can be tested without a browser or server.
