import { NextResponse } from "next/server";
import {
  InterpreterError,
  interpretAndResolve,
  type InterpretationResponse,
} from "../../../src/server/interpreter/index.js";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (
    typeof payload !== "object" ||
    payload === null ||
    !Object.hasOwn(payload, "question") ||
    typeof (payload as { question?: unknown }).question !== "string"
  ) {
    return NextResponse.json({ error: "question_required" }, { status: 400 });
  }

  try {
    const run = await interpretAndResolve((payload as { question: string }).question);
    const response: InterpretationResponse = {
      result: run.result,
      ...(run.query ? { query: run.query } : {}),
      provenance: run.provenance,
    };
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof InterpreterError) {
      const status = error.kind === "configuration" ? 503 : 422;
      return NextResponse.json(
        { error: error.kind, message: error.message },
        { status },
      );
    }
    return NextResponse.json({ error: "interpreter_failure" }, { status: 500 });
  }
}
