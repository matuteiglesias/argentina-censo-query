import { isAbsolute } from "node:path";

export type ExecutionAvailability =
  | { mode: "compile_only"; available: false }
  | { mode: "local_radio"; available: true };

export function localExecutionAvailability(
  env: NodeJS.ProcessEnv = process.env,
): ExecutionAvailability {
  const root = env.CENSO_LOCAL_SLICE_ROOT?.trim();
  if (
    env.NODE_ENV !== "development" ||
    env.CENSO_EXECUTION_MODE !== "local_radio" ||
    !root ||
    !isAbsolute(root)
  ) {
    return { mode: "compile_only", available: false };
  }
  return { mode: "local_radio", available: true };
}

export function isLoopbackRequest(request: Request): boolean {
  const hostname = request.headers
    .get("host")
    ?.toLowerCase()
    .replace(/:\d+$/, "");
  if (!hostname || !["localhost", "127.0.0.1", "[::1]"].includes(hostname)) {
    return false;
  }
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    return (
      ["http:", "https:"].includes(parsed.protocol) &&
      parsed.host.toLowerCase() === request.headers.get("host")?.toLowerCase()
    );
  } catch {
    return false;
  }
}
