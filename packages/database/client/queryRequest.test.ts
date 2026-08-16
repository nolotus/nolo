import { describe, expect, it } from "bun:test";

import { noloQueryRequest } from "./queryRequest";

describe("noloQueryRequest", () => {
  it("sends Authorization when authToken is provided", async () => {
    const originalFetch = globalThis.fetch;
    let capturedInit: RequestInit | undefined;
    globalThis.fetch = (async (_url: string, init?: RequestInit) => {
      capturedInit = init;
      return new Response(JSON.stringify({ data: { data: [] } }), { status: 200 });
    }) as typeof fetch;

    try {
      await noloQueryRequest({
        server: "https://nolo.chat",
        queryUserId: "user-1",
        authToken: "secret-token",
        options: { limit: 10, condition: { type: ["agent"] } },
      });
    } finally {
      globalThis.fetch = originalFetch;
    }

    const headers = capturedInit?.headers as Record<string, string> | undefined;
    expect(headers?.Authorization).toBe("Bearer secret-token");
    expect(headers?.["Content-Type"]).toBe("application/json");
  });

  it("omits Authorization when authToken is absent", async () => {
    const originalFetch = globalThis.fetch;
    let capturedInit: RequestInit | undefined;
    globalThis.fetch = (async (_url: string, init?: RequestInit) => {
      capturedInit = init;
      return new Response(JSON.stringify({ data: { data: [] } }), { status: 401 });
    }) as typeof fetch;

    try {
      await noloQueryRequest({
        server: "https://nolo.chat",
        queryUserId: "user-1",
        options: { limit: 5, condition: { type: "dialog" } },
      });
    } finally {
      globalThis.fetch = originalFetch;
    }

    const headers = capturedInit?.headers as Record<string, string> | undefined;
    expect(headers?.Authorization).toBeUndefined();
  });

  it("aborts the request after the configured timeout", async () => {
    const originalFetch = globalThis.fetch;
    let capturedSignal: AbortSignal | undefined;
    globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ): Promise<Response> => {
      capturedSignal = init?.signal ?? undefined;
      return new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("aborted", "AbortError"));
        });
      });
    }) as typeof fetch;

    try {
      await expect(
        noloQueryRequest({
          server: "https://nolo.chat",
          queryUserId: "user-1",
          options: { condition: { type: "dialog" } },
          timeoutMs: 10,
        }),
      ).rejects.toBeInstanceOf(DOMException);
      expect(capturedSignal?.aborted).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("does not set an AbortSignal when timeoutMs is 0", async () => {
    const originalFetch = globalThis.fetch;
    let capturedSignal: AbortSignal | undefined;
    globalThis.fetch = (async (_url: string, init?: RequestInit) => {
      capturedSignal = init?.signal ?? undefined;
      return new Response(JSON.stringify({ data: { data: [] } }), { status: 200 });
    }) as typeof fetch;

    try {
      await noloQueryRequest({
        server: "https://nolo.chat",
        queryUserId: "user-1",
        options: { condition: { type: "dialog" } },
        timeoutMs: 0,
      });
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(capturedSignal).toBeUndefined();
  });

  it("applies the default 8s timeout when timeoutMs is omitted", async () => {
    const originalFetch = globalThis.fetch;
    let capturedSignal: AbortSignal | undefined;
    globalThis.fetch = (async (_url: string, init?: RequestInit) => {
      capturedSignal = init?.signal ?? undefined;
      return new Response(JSON.stringify({ data: { data: [] } }), { status: 200 });
    }) as typeof fetch;

    try {
      await noloQueryRequest({
        server: "https://nolo.chat",
        queryUserId: "user-1",
        options: { condition: { type: "dialog" } },
      });
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(capturedSignal).toBeInstanceOf(AbortSignal);
    expect(capturedSignal?.aborted).toBe(false);
  });
});