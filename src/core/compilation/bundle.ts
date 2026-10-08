import type { CensusCatalog } from "../contracts/catalog.js";
import type {
  CompilationBundle,
  CompilationContext,
} from "../contracts/compilation.js";
import { compileSql } from "./sql.js";
import { compileRedatam } from "./redatam.js";
import { compileIndecWebRecipe } from "./indec-web.js";
import { assertCompilableQuery } from "./shared.js";

export function compilationContextForCatalog(
  catalog: CensusCatalog,
): CompilationContext {
  return {
    contract: "argentina.census-compilation-context/v1",
    catalog_id: catalog.catalog_id,
    census_vintage: 2022,
    source_database: catalog.database,
    source_release_label: catalog.source_release_label,
    logical_schema: "argentina.censo2022-relational/v1",
  };
}

export function compileBundle(
  originalQuestion: string,
  input: unknown,
  catalog: CensusCatalog,
): CompilationBundle {
  const question = originalQuestion.trim();
  if (!question) throw new Error("original question must be non-empty");
  const query = assertCompilableQuery(input, catalog);

  return {
    contract: "argentina.census-compilation/v1",
    original_question: question,
    query,
    context: compilationContextForCatalog(catalog),
    targets: {
      sql: compileSql(query, catalog),
      redatam_process: compileRedatam(query, catalog),
      indec_web: compileIndecWebRecipe(query, catalog),
    },
  };
}
