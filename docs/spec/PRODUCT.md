# A0 — Product contract

## Product

Repository: **argentina-censo-query**.

Working user-facing description: **Consultá el Censo 2022**.

The product accepts one natural-language statistical question about the Argentine 2022 Census and helps a user formalize that question transparently.

Its successful output is a **compilation bundle**, not a statistical answer.

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
   copy   copy         recipe
~~~

### Authority

CensusQuery is the sole authoritative interpretation of statistical meaning.

SQL, Redatam Process, and the INDEC WebServer recipe are derived representations. They may never be interpreted independently and then reconciled after the fact.

## Product outcomes

A question has exactly one of three semantic outcomes:

1. **candidate** — enough meaning was extracted to attempt deterministic resolution;
2. **needs_clarification** — two or more materially different supported interpretations remain plausible;
3. **unsupported** — the requested operation is outside the supported grammar or universe.

Only a resolved and validated candidate can become a CensusQuery.

## Successful experience

For a valid question the user sees:

- the interpreted universe;
- measure;
- filters;
- breakdown;
- provenance/catalog identity;
- copyable SQL;
- copyable Redatam Process;
- copyable INDEC WebServer reproduction instructions.

The interpretation is shown before target code because semantic transparency is the primary product property.

## No execution

v1 ends at compilation.

It does not:

- execute generated SQL;
- connect to DuckDB, BigQuery, Postgres, or another database;
- execute Redatam locally;
- submit Redatam programs to INDEC;
- scrape INDEC results;
- store Census microdata;
- return counts, percentages, means, maps, or charts.

A later execution layer may consume the same CensusQuery, but execution is not part of this contract.

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
  product UI
~~~

The query product must not reimplement extraction mechanics.

## First supported Census universe

The first grammar targets **VP — persons, households and private dwellings**.

A user request for "all people counted by the Census" must not silently collapse to VP if other Census universes would be required.

## Future UI assumption

The anticipated application stack is Next.js + TypeScript, but framework choice is deliberately downstream of the core contracts. The semantic core remains ordinary TypeScript and can be tested without a browser or server.
