import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { apiPost, buildCurlCommand } from "./apiHelpers";

describe("apiHelpers", () => {
  const originalFetch = globalThis.fetch;
  const originalAbortTimeout = AbortSignal.timeout;
  let fetchMock: ReturnType<typeof mock>;

  beforeEach(() => {
    fetchMock = mock(async (_url: string, _init?: RequestInit) => {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    AbortSignal.timeout = originalAbortTimeout;
    delete process.env.SCRIPTS_CURL_RESOLVE;
  });

  it("uses a per-request timeout override when provided", async () => {
    const source = readFileSync(join(import.meta.dir, "apiHelpers.ts"), "utf8");

    expect(source).toContain("options?.timeoutMs ?? REMOTE_FETCH_TIMEOUT_MS");
  });

  it("retries transient remote certificate verification failures", async () => {
    const source = readFileSync(join(import.meta.dir, "apiHelpers.ts"), "utf8");

    expect(source).toContain("certificate");
    expect(source).toContain("if (attempt >= 2) return false");
    expect(source).toContain("attempt += 1");
  });

  it("accepts large localhost JSON bodies without hitting curl argv limits", async () => {
    const source = readFileSync(join(import.meta.dir, "apiHelpers.ts"), "utf8");

    expect(source).toContain("LOCAL_CURL_BODY_LIMIT");
    expect(source).toContain("init.body.length > LOCAL_CURL_BODY_LIMIT");
    expect(source).toContain("isLocalhostUrl(url) && !useLocalFetch");
  });

  it("adds opt-in curl DNS overrides for script requests", () => {
    process.env.SCRIPTS_CURL_RESOLVE = "us.nolo.chat:443:104.21.32.247";

    const command = buildCurlCommand("https://us.nolo.chat/health", {
      method: "GET",
    });

    expect(command).toContain("--resolve");
    expect(command).toContain("us.nolo.chat:443:104.21.32.247");
  });
});
