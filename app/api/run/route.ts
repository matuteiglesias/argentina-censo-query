import { NextResponse } from "next/server";
import { z } from "zod";
import { CensusQuerySchema } from "../../../src/core/index.js";
import {
  isLoopbackRequest,
  localExecutionAvailability,
} from "../../../src/server/local-execution-policy.js";

export const runtime = "nodejs";

const RunRequestSchema = z.object({
  query: CensusQuerySchema,
}).strict();

export async function POST(request: Request) {
  // The existence of a local slice path is NOT permission to serve it.
  // Development-only, explicit opt-in, and loopback-only are all necessary.
  if (!localExecutionAvailability().available || !isLoopbackRequest(request)) {
    return NextResponse.json({ error: "local_execution_disabled" }, { status: 404 });
  }

  if (Number(request.headers.get("content-length") ?? 0) > 32_768) {
    return NextResponse.json({ error: "request_too_large" }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = RunRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_census_query" }, { status: 422 });
  }

  try {
    // Dynamic import keeps the local DuckDB executor off the regular query path.
    const { runLocalQuery } = await import("../../../src/server/run-local-query.js");
    const result = await runLocalQuery(
      parsed.data.query,
      process.env.CENSO_LOCAL_SLICE_ROOT!,
    );
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    // Never disclose local paths, Parquet metadata or SQL errors through HTTP.
    return NextResponse.json({ error: "local_query_failed" }, { status: 422 });
  }
}
