import {
  CPV2022_VP_CATALOG_V0,
  canonicalizeDirectResult,
  type CanonicalResult,
  type CensusQuery,
} from "../core/index.js";
import { executeLocalVpQuery } from "../local/duckdb-executor.js";

export type LocalQueryResponse = {
  contract: "argentina.census-local-query-response/v1";
  result: CanonicalResult;
  source: {
    scope: "RADIO";
    code: string;
    manifestSemanticHash: string;
    executionId: string;
  };
};

export async function runLocalQuery(
  query: CensusQuery,
  sliceRoot: string,
): Promise<LocalQueryResponse> {
  // B4 always revalidates and compiles the supplied query. Never accept SQL
  // or source paths from the HTTP request.
  const local = await executeLocalVpQuery(
    query,
    sliceRoot,
    CPV2022_VP_CATALOG_V0,
  );
  return {
    contract: "argentina.census-local-query-response/v1",
    result: canonicalizeDirectResult(
      query,
      local.rows.map((row) => ({
        breakdown: row.breakdown,
        value: row.value,
      })),
    ),
    source: {
      scope: "RADIO",
      code: local.source_radio_code,
      manifestSemanticHash: local.source_manifest_semantic_hash,
      executionId: local.execution_id,
    },
  };
}
