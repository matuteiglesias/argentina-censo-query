import type { CensusQuery } from "../contracts/census-query.js";
import {
  CanonicalResultSchema,
  type CanonicalResult,
  type CanonicalResultRow,
} from "../contracts/result.js";
import { CensusQuerySchema } from "../contracts/census-query.js";
import { stableCanonicalId } from "../canonical-json.js";

export type ResultLikeRow = {
  breakdown?: unknown;
  value: unknown;
};

export type CountComponentRow = {
  breakdown?: unknown;
  value: unknown;
};

function finiteNumber(value: unknown, path: string): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  throw new TypeError(path + " must be a finite number");
}

function canonicalBreakdown(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

function sortRows(rows: CanonicalResultRow[]): CanonicalResultRow[] {
  return [...rows].sort((left, right) => {
    if (left.breakdown === right.breakdown) return 0;
    if (left.breakdown === null) return -1;
    if (right.breakdown === null) return 1;
    return left.breakdown.localeCompare(right.breakdown);
  });
}

function queryIdentity(input: unknown): {
  query: CensusQuery;
  queryId: string;
} {
  const query = CensusQuerySchema.parse(input);
  return { query, queryId: stableCanonicalId("cq", query) };
}

export function canonicalizeDirectResult(
  queryInput: unknown,
  rowsInput: ResultLikeRow[],
): CanonicalResult {
  const { query, queryId } = queryIdentity(queryInput);
  const rows = sortRows(
    rowsInput.map((row, index) => ({
      breakdown: canonicalBreakdown(row.breakdown),
      value: finiteNumber(row.value, "rows." + index + ".value"),
    })),
  );

  return CanonicalResultSchema.parse({
    contract: "argentina.census-canonical-result/v1",
    query_id: queryId,
    measure: query.measure.type,
    rows,
  });
}

export function canonicalizeShareFromCounts(
  queryInput: unknown,
  totalRowsInput: CountComponentRow[],
  selectedRowsInput: CountComponentRow[],
): CanonicalResult {
  const { query, queryId } = queryIdentity(queryInput);
  if (query.measure.type !== "share") {
    throw new TypeError("selected/total composition requires a SHARE CensusQuery");
  }

  const totals = new Map<string | null, number>();
  for (const [index, row] of totalRowsInput.entries()) {
    const key = canonicalBreakdown(row.breakdown);
    const value = finiteNumber(row.value, "totalRows." + index + ".value");
    if (!Number.isInteger(value) || value < 0) {
      throw new TypeError("total counts must be non-negative integers");
    }
    if (totals.has(key)) throw new TypeError("duplicate total breakdown");
    totals.set(key, value);
  }

  const selected = new Map<string | null, number>();
  for (const [index, row] of selectedRowsInput.entries()) {
    const key = canonicalBreakdown(row.breakdown);
    const value = finiteNumber(row.value, "selectedRows." + index + ".value");
    if (!Number.isInteger(value) || value < 0) {
      throw new TypeError("selected counts must be non-negative integers");
    }
    if (selected.has(key)) throw new TypeError("duplicate selected breakdown");
    selected.set(key, value);
  }

  const rows: CanonicalResultRow[] = [];
  for (const [breakdown, total] of totals.entries()) {
    if (total === 0) {
      throw new RangeError(
        "SHARE denominator is zero for breakdown " + String(breakdown),
      );
    }
    const numerator = selected.get(breakdown) ?? 0;
    if (numerator > total) {
      throw new RangeError(
        "SHARE selected count exceeds total for breakdown " + String(breakdown),
      );
    }
    rows.push({ breakdown, value: numerator / total });
  }

  for (const breakdown of selected.keys()) {
    if (!totals.has(breakdown)) {
      throw new TypeError(
        "selected result contains breakdown absent from total: " +
          String(breakdown),
      );
    }
  }

  return CanonicalResultSchema.parse({
    contract: "argentina.census-canonical-result/v1",
    query_id: queryId,
    measure: "share",
    rows: sortRows(rows),
  });
}

export type EquivalenceComparison = {
  equivalent: boolean;
  tolerance: number;
  differences: string[];
};

export function compareCanonicalResults(
  left: CanonicalResult,
  right: CanonicalResult,
  tolerance = 1e-12,
): EquivalenceComparison {
  const differences: string[] = [];
  if (left.query_id !== right.query_id) {
    differences.push("query_id differs");
  }
  if (left.measure !== right.measure) {
    differences.push("measure differs");
  }
  if (left.rows.length !== right.rows.length) {
    differences.push(
      "row count differs: " + left.rows.length + " != " + right.rows.length,
    );
  }

  const max = Math.max(left.rows.length, right.rows.length);
  for (let index = 0; index < max; index += 1) {
    const a = left.rows[index];
    const b = right.rows[index];
    if (!a || !b) continue;
    if (a.breakdown !== b.breakdown) {
      differences.push(
        "breakdown differs at row " +
          index +
          ": " +
          String(a.breakdown) +
          " != " +
          String(b.breakdown),
      );
    }
    if (Math.abs(a.value - b.value) > tolerance) {
      differences.push(
        "value differs at row " +
          index +
          ": " +
          a.value +
          " != " +
          b.value,
      );
    }
  }

  return {
    equivalent: differences.length === 0,
    tolerance,
    differences,
  };
}
