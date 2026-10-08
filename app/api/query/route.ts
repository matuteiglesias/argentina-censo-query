import { NextResponse } from "next/server";
import { InterpreterError } from "../../../src/server/interpreter/types.js";
import { submitQuestion } from "../../../src/server/query-orchestrator.js";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 8_192) {
    return NextResponse.json({ error: "request_too_large" }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (
    typeof payload !== "object" ||
    payload === null ||
    Array.isArray(payload) ||
    Object.keys(payload).length !== 1 ||
    typeof (payload as { question?: unknown }).question !== "string"
  ) {
    return NextResponse.json({ error: "question_required" }, { status: 400 });
  }

  const question = (payload as { question: string }).question.trim();
  if (question.length === 0 || question.length > 1_000) {
    return NextResponse.json({ error: "invalid_question_length" }, { status: 400 });
  }

  try {
    return NextResponse.json(await submitQuestion(question), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof InterpreterError) {
      const status =
        error.kind === "configuration" ? 503
        : error.kind === "provider_timeout" ? 504
        : error.kind === "provider_transport" ? 502
        : 422;
      // Never leak provider SDK errors, prompt or secrets to the browser.
      return NextResponse.json({ error: error.kind }, { status });
    }
    return NextResponse.json({ error: "query_pipeline_failure" }, { status: 500 });
  }
}
