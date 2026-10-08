import { describe, expect, it } from "vitest";
import {
  isLoopbackRequest,
  localExecutionAvailability,
} from "../src/server/local-execution-policy.js";

describe("C5 local execution safety gates", () => {
  const configured = {
    CENSO_EXECUTION_MODE: "local_radio",
    CENSO_LOCAL_SLICE_ROOT: "/verified/radio",
  };

  it("does not run in production even if a verified root is configured", () => {
    expect(localExecutionAvailability({ ...configured, NODE_ENV: "production" })).toEqual({
      available: false,
      mode: "compile_only",
    });
  });

  it("needs both explicit opt-in and an absolute local root", () => {
    expect(localExecutionAvailability({ NODE_ENV: "development" }).available).toBe(false);
    expect(localExecutionAvailability({
      ...configured,
      CENSO_LOCAL_SLICE_ROOT: "relative/slice",
      NODE_ENV: "development",
    }).available).toBe(false);
    expect(localExecutionAvailability({
      ...configured,
      CENSO_EXECUTION_MODE: "compile_only",
      NODE_ENV: "development",
    }).available).toBe(false);
    expect(localExecutionAvailability({ ...configured, NODE_ENV: "development" })).toEqual({
      available: true,
      mode: "local_radio",
    });
  });

  it("allows local same-origin requests only", () => {
    const request = (host: string, origin?: string) => new Request(
      "http://localhost:3000/api/run",
      {
        method: "POST",
        headers: {
          host,
          ...(origin ? { origin } : {}),
        },
      },
    );
    expect(isLoopbackRequest(request("localhost:3000", "http://localhost:3000"))).toBe(true);
    expect(isLoopbackRequest(request("127.0.0.1:3000"))).toBe(true);
    expect(isLoopbackRequest(request("[::1]:3000"))).toBe(true);
    expect(isLoopbackRequest(request("example.org"))).toBe(false);
    expect(isLoopbackRequest(request("localhost:3000", "https://evil.org"))).toBe(false);
    expect(isLoopbackRequest(request("localhost:3000", "invalid-origin"))).toBe(false);
  });
});
