import { describe, expect, it, mock } from "bun:test";
import { fileURLToPath } from "node:url";

const realSettingSlice = await import("app/settings/settingSlice");
const realAuthSlice = await import("auth/authSlice");

let moduleVersion = 0;
const settingSlicePath = fileURLToPath(
  new URL("../../app/settings/settingSlice.tsx", import.meta.url)
);
const authSlicePath = fileURLToPath(
  new URL("../../auth/authSlice.ts", import.meta.url)
);

async function loadRunAgentBackground() {
  mock.module("app/settings/settingSlice", () => ({
    ...realSettingSlice,
    selectCurrentServer: () => "http://localhost",
  }));
  mock.module(settingSlicePath, () => ({
    ...realSettingSlice,
    selectCurrentServer: () => "http://localhost",
  }));

  mock.module("auth/authSlice", () => ({
    ...realAuthSlice,
    selectCurrentToken: () => "token",
  }));
  mock.module(authSlicePath, () => ({
    ...realAuthSlice,
    selectCurrentToken: () => "token",
  }));

  const module = await import(`./runAgentBackground.ts`);
  mock.restore();
  return module.runAgentBackground;
}

describe("runAgentBackground", () => {
  it("retries the background run startup once when the core is draining and honors Retry-After", async () => {
    const originalFetch = globalThis.fetch;
    const originalSetTimeout = globalThis.setTimeout;
    const runAgentBackground = await loadRunAgentBackground();
    const recordedDelays: number[] = [];

    let runAttempts = 0;
    globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/agent/run")) {
        runAttempts++;
        const body = init?.body ? JSON.parse(String(init.body)) : null;
        expect(body).toMatchObject({
          runtimeContext: {
            surface: "web",
            entrypoint: "background-agent-run",
          },
        });
        if (runAttempts === 1) {
          return new Response(
            JSON.stringify({
              error: "Server draining",
              reason: "core_draining",
              retryable: true,
              retryAfterMs: 2_000,
            }),
            {
              status: 503,
              headers: {
                "Content-Type": "application/json",
                "Retry-After": "2",
              },
            }
          );
        }
        return new Response(JSON.stringify({ dialogId: "dialog-1", status: "pending" }), {
          status: 202,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.endsWith("/api/events/dialog-dialog-1")) {
        return new Response(`data: ${JSON.stringify({ type: "done", content: "ok" })}\n\n`, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        });
      }

      throw new Error(`unexpected fetch: ${url}`);
    }) as unknown as typeof fetch;

    globalThis.setTimeout = (((callback: (...args: any[]) => void, delay?: number) => {
      recordedDelays.push(Number(delay ?? 0));
      callback();
      return 0;
    }) as unknown) as typeof setTimeout;

    try {
      const thunk = runAgentBackground({
        agentKey: "agent-1",
        userInput: "hello",
      });

      const action = await thunk(
        mock(() => undefined),
        () =>
          ({
            settings: { currentServer: "http://localhost" },
            auth: { currentToken: "token" },
          }) as any,
        undefined
      );

      expect(action.meta.requestStatus).toBe("fulfilled");
      expect(action.payload).toEqual({ dialogId: "dialog-1", content: "ok", usage: undefined });
      expect(runAttempts).toBe(2);
      expect(recordedDelays).toContain(2_000);
    } finally {
      globalThis.fetch = originalFetch;
      globalThis.setTimeout = originalSetTimeout;
    }
  });

  it("waits through repeated core_draining responses with the dedicated long budget", async () => {
    const originalFetch = globalThis.fetch;
    const originalSetTimeout = globalThis.setTimeout;
    const runAgentBackground = await loadRunAgentBackground();
    const recordedDelays: number[] = [];

    let runAttempts = 0;
    globalThis.fetch = mock(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/agent/run")) {
        runAttempts++;
        // 连续 3 次 core_draining（远超默认 1 次重试），第 4 次成功。
        if (runAttempts <= 3) {
          return new Response(
            JSON.stringify({
              error: "Server draining",
              reason: "core_draining",
              retryable: true,
              retryAfterMs: 1_500,
            }),
            {
              status: 503,
              headers: { "Content-Type": "application/json", "Retry-After": "2" },
            }
          );
        }
        return new Response(JSON.stringify({ dialogId: "dialog-long-drain", status: "pending" }), {
          status: 202,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.endsWith("/api/events/dialog-dialog-long-drain")) {
        return new Response(
          `data: ${JSON.stringify({ type: "done", content: "ok" })}\n\n`,
          { status: 200, headers: { "Content-Type": "text/event-stream" } }
        );
      }

      throw new Error(`unexpected fetch: ${url}`);
    }) as unknown as typeof fetch;

    globalThis.setTimeout = (((callback: (...args: any[]) => void, delay?: number) => {
      recordedDelays.push(Number(delay ?? 0));
      callback();
      return 0;
    }) as unknown) as typeof setTimeout;

    try {
      const thunk = runAgentBackground({
        agentKey: "agent-1",
        userInput: "long drain",
      });

      const action = await thunk(
        mock(() => undefined),
        () =>
          ({
            settings: { currentServer: "http://localhost" },
            auth: { currentToken: "token" },
          }) as any,
        undefined
      );

      expect(action.meta.requestStatus).toBe("fulfilled");
      expect(action.payload).toEqual({ dialogId: "dialog-long-drain", content: "ok", usage: undefined });
      // 3 次 core_draining 全部重试，最终第 4 次成功。
      // Retry-After: 2 头优先于 body 的 retryAfterMs，每次等待 2000ms。
      expect(runAttempts).toBe(4);
      expect(recordedDelays.filter((d) => d === 2_000).length).toBe(3);
    } finally {
      globalThis.fetch = originalFetch;
      globalThis.setTimeout = originalSetTimeout;
    }
  });

  it("retries when the SSE subscription handshake fails during reconnect", async () => {
    const originalFetch = globalThis.fetch;
    const originalSetTimeout = globalThis.setTimeout;
    const runAgentBackground = await loadRunAgentBackground();
    const statusChanges: string[] = [];

    let sseAttempts = 0;
    globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/agent/run")) {
        const body = init?.body ? JSON.parse(String(init.body)) : null;
        expect(body).toMatchObject({
          runtimeContext: {
            surface: "web",
            entrypoint: "background-agent-run",
          },
        });
        return new Response(JSON.stringify({ dialogId: "dialog-1", status: "pending" }), {
          status: 202,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.endsWith("/api/events/dialog-dialog-1")) {
        sseAttempts++;
        if (sseAttempts === 1) {
          throw new Error("connect ECONNREFUSED");
        }
        return new Response(`data: ${JSON.stringify({ type: "done", content: "ok" })}\n\n`, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        });
      }

      throw new Error(`unexpected fetch: ${url}`);
    }) as unknown as typeof fetch;

    globalThis.setTimeout = (((callback: (...args: any[]) => void) => {
      callback();
      return 0;
    }) as unknown) as typeof setTimeout;

    try {
      const thunk = runAgentBackground({
        agentKey: "agent-1",
        userInput: "hello",
        onStatusChange: (status: string) => statusChanges.push(status),
      });

      const action = await thunk(
        mock(() => undefined),
        () =>
          ({
            settings: { currentServer: "http://localhost" },
            auth: { currentToken: "token" },
          }) as any,
        undefined
      );

      expect(action.meta.requestStatus).toBe("fulfilled");
      expect(action.payload).toEqual({ dialogId: "dialog-1", content: "ok", usage: undefined });
      expect(sseAttempts).toBe(2);
      expect(statusChanges).toEqual(["pending", "reconnecting", "done"]);
    } finally {
      globalThis.fetch = originalFetch;
      globalThis.setTimeout = originalSetTimeout;
    }
  });

  it("honors Retry-After when the SSE subscription handshake gets a retryable 503", async () => {
    const originalFetch = globalThis.fetch;
    const originalSetTimeout = globalThis.setTimeout;
    const runAgentBackground = await loadRunAgentBackground();
    const statusChanges: string[] = [];
    const recordedDelays: number[] = [];

    let sseAttempts = 0;
    globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/agent/run")) {
        const body = init?.body ? JSON.parse(String(init.body)) : null;
        expect(body).toMatchObject({
          runtimeContext: {
            surface: "web",
            entrypoint: "background-agent-run",
          },
        });
        return new Response(JSON.stringify({ dialogId: "dialog-1", status: "pending" }), {
          status: 202,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.endsWith("/api/events/dialog-dialog-1")) {
        sseAttempts++;
        if (sseAttempts === 1) {
          return new Response(
            JSON.stringify({
              error: "Server draining",
              reason: "core_draining",
              retryable: true,
              retryAfterMs: 2_000,
            }),
            {
              status: 503,
              headers: {
                "Content-Type": "application/json",
                "Retry-After": "2",
              },
            }
          );
        }
        return new Response(`data: ${JSON.stringify({ type: "done", content: "ok" })}\n\n`, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        });
      }

      throw new Error(`unexpected fetch: ${url}`);
    }) as unknown as typeof fetch;

    globalThis.setTimeout = (((callback: (...args: any[]) => void, delay?: number) => {
      recordedDelays.push(Number(delay ?? 0));
      callback();
      return 0;
    }) as unknown) as typeof setTimeout;

    try {
      const thunk = runAgentBackground({
        agentKey: "agent-1",
        userInput: "hello",
        onStatusChange: (status: string) => statusChanges.push(status),
      });

      const action = await thunk(
        mock(() => undefined),
        () =>
          ({
            settings: { currentServer: "http://localhost" },
            auth: { currentToken: "token" },
          }) as any,
        undefined
      );

      expect(action.meta.requestStatus).toBe("fulfilled");
      expect(action.payload).toEqual({ dialogId: "dialog-1", content: "ok", usage: undefined });
      expect(sseAttempts).toBe(2);
      expect(statusChanges).toEqual(["pending", "reconnecting", "done"]);
      expect(recordedDelays).toContain(2_000);
    } finally {
      globalThis.fetch = originalFetch;
      globalThis.setTimeout = originalSetTimeout;
    }
  });

  it("extends the SSE subscription budget across repeated core_draining handshakes", async () => {
    const originalFetch = globalThis.fetch;
    const originalSetTimeout = globalThis.setTimeout;
    const runAgentBackground = await loadRunAgentBackground();
    const statusChanges: string[] = [];

    let sseAttempts = 0;
    globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/agent/run")) {
        return new Response(JSON.stringify({ dialogId: "dialog-1", status: "pending" }), {
          status: 202,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.endsWith("/api/events/dialog-dialog-1")) {
        sseAttempts++;
        // 部署窗口：订阅握手连续 5 次 503 core_draining（远超默认 3 次预算），
        // 第 6 次成功。修复前固定 3 次预算会在第 4 次尝试时放弃 → rejected；
        // 修复后 core_draining 触发长预算（30 次），不会中途放弃。
        if (sseAttempts <= 5) {
          return new Response(
            JSON.stringify({
              error: "Server draining",
              reason: "core_draining",
              retryable: true,
              retryAfterMs: 2_000,
            }),
            {
              status: 503,
              headers: {
                "Content-Type": "application/json",
                "Retry-After": "2",
              },
            }
          );
        }
        return new Response(`data: ${JSON.stringify({ type: "done", content: "ok" })}\n\n`, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        });
      }

      throw new Error(`unexpected fetch: ${url}`);
    }) as unknown as typeof fetch;

    globalThis.setTimeout = (((callback: (...args: any[]) => void) => {
      callback();
      return 0;
    }) as unknown) as typeof setTimeout;

    try {
      const thunk = runAgentBackground({
        agentKey: "agent-1",
        userInput: "hello",
        onStatusChange: (status: string) => statusChanges.push(status),
      });

      const action = await thunk(
        mock(() => undefined),
        () =>
          ({
            settings: { currentServer: "http://localhost" },
            auth: { currentToken: "token" },
          }) as any,
        undefined
      );

      expect(action.meta.requestStatus).toBe("fulfilled");
      expect(action.payload).toEqual({ dialogId: "dialog-1", content: "ok", usage: undefined });
      expect(sseAttempts).toBe(6);
      expect(statusChanges.filter((s) => s === "reconnecting").length).toBe(5);
    } finally {
      globalThis.fetch = originalFetch;
      globalThis.setTimeout = originalSetTimeout;
    }
  });

  it("subscribes to the returned serverBase when a background run is proxied remotely", async () => {
    const originalFetch = globalThis.fetch;
    const runAgentBackground = await loadRunAgentBackground();
    const seenUrls: string[] = [];

    globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      seenUrls.push(url);
      if (url === "http://localhost/api/agent/run") {
        const body = init?.body ? JSON.parse(String(init.body)) : null;
        expect(body).toMatchObject({
          runtimeContext: {
            surface: "web",
            entrypoint: "background-agent-run",
          },
        });
        return new Response(
          JSON.stringify({
            dialogId: "dialog-remote",
            status: "pending",
            serverBase: "https://runtime.example.com",
          }),
          {
            status: 202,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (url === "https://runtime.example.com/api/events/dialog-dialog-remote") {
        return new Response(`data: ${JSON.stringify({ type: "done", content: "ok" })}\n\n`, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        });
      }

      throw new Error(`unexpected fetch: ${url}`);
    }) as unknown as typeof fetch;

    try {
      const thunk = runAgentBackground({
        agentKey: "agent-remote",
        userInput: "hello remote",
      });

      const action = await thunk(
        mock(() => undefined),
        () =>
          ({
            settings: { currentServer: "http://localhost" },
            auth: { currentToken: "token" },
          }) as any,
        undefined
      );

      expect(action.meta.requestStatus).toBe("fulfilled");
      expect(action.payload).toEqual({
        dialogId: "dialog-remote",
        content: "ok",
        usage: undefined,
      });
      expect(seenUrls).toEqual([
        "http://localhost/api/agent/run",
        "https://runtime.example.com/api/events/dialog-dialog-remote",
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("parses background SSE events across chunk boundaries", async () => {
    const originalFetch = globalThis.fetch;
    const runAgentBackground = await loadRunAgentBackground();

    globalThis.fetch = mock(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "http://localhost/api/agent/run") {
        return new Response(JSON.stringify({ dialogId: "dialog-2", status: "pending" }), {
          status: 202,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url === "http://localhost/api/events/dialog-dialog-2") {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode('data: {"type":"done","cont'));
            controller.enqueue(encoder.encode('ent":"ok"}\n\n'));
            controller.close();
          },
        });
        return new Response(stream, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        });
      }

      throw new Error(`unexpected fetch: ${url}`);
    }) as unknown as typeof fetch;

    try {
      const thunk = runAgentBackground({
        agentKey: "agent-2",
        userInput: "hello",
      });

      const action = await thunk(
        mock(() => undefined),
        () =>
          ({
            settings: { currentServer: "http://localhost" },
            auth: { currentToken: "token" },
          }) as any,
        undefined
      );

      expect(action.meta.requestStatus).toBe("fulfilled");
      expect(action.payload).toEqual({
        dialogId: "dialog-2",
        content: "ok",
        usage: undefined,
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("returns dialogId without subscribing when waitForCompletion is false", async () => {
    const originalFetch = globalThis.fetch;
    const runAgentBackground = await loadRunAgentBackground();
    const sseFetchMock = mock((_input: any, _init?: any) => {
      throw new Error("should not subscribe to SSE");
    });

    globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "http://localhost/api/agent/run") {
        return new Response(
          JSON.stringify({ dialogId: "dialog-skip-sse", status: "pending" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return sseFetchMock(input, init);
    }) as unknown as typeof fetch;

    try {
      const thunk = runAgentBackground({
        agentKey: "agent-1",
        userInput: "skip sse",
        waitForCompletion: false,
      });

      const action = await thunk(
        mock(() => undefined),
        () =>
          ({
            settings: { currentServer: "http://localhost" },
            auth: { currentToken: "token" },
          }) as any,
        undefined
      );

      expect(action.meta.requestStatus).toBe("fulfilled");
      expect(action.payload).toEqual({ dialogId: "dialog-skip-sse", status: "pending" });
      expect(sseFetchMock).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});


describe("runAgentBackground idempotency key", () => {
  it("sends an idempotencyKey on POST and keeps it stable across retries", async () => {
    const originalFetch = globalThis.fetch;
    const originalSetTimeout = globalThis.setTimeout;
    const runAgentBackground = await loadRunAgentBackground();
    const recordedDelays: number[] = [];
    const seenKeys: Array<string | undefined> = [];

    let runAttempts = 0;
    globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/agent/run")) {
        runAttempts++;
        const body = init?.body ? JSON.parse(String(init.body)) : null;
        expect(typeof body.idempotencyKey).toBe("string");
        expect(body.idempotencyKey.length).toBeGreaterThan(0);
        seenKeys.push(body.idempotencyKey);
        if (runAttempts === 1) {
          // 服务端已受理但响应丢失的可重试信号（drain 窗口）。
          return new Response(
            JSON.stringify({ error: "draining", reason: "core_draining", retryable: true, retryAfterMs: 100 }),
            { status: 503, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response(JSON.stringify({ dialogId: "dialog-idem", status: "pending" }), {
          status: 202,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.endsWith("/api/events/dialog-dialog-idem")) {
        return new Response(`data: ${JSON.stringify({ type: "done", content: "ok" })}\n\n`, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        });
      }
      throw new Error(`unexpected fetch: ${url}`);
    }) as unknown as typeof fetch;

    globalThis.setTimeout = (((callback: (...args: any[]) => void, delay?: number) => {
      recordedDelays.push(Number(delay ?? 0));
      callback();
      return 0;
    }) as unknown) as typeof setTimeout;

    try {
      const thunk = runAgentBackground({ agentKey: "agent-1", userInput: "idem" });
      const action = await thunk(
        mock(() => undefined),
        () =>
          ({ settings: { currentServer: "http://localhost" }, auth: { currentToken: "token" } }) as any,
        undefined
      );
      expect(action.meta.requestStatus).toBe("fulfilled");
      expect(runAttempts).toBe(2);
      // 两次重试必须携带同一个幂等键，服务端才能去重。
      expect(seenKeys.length).toBe(2);
      expect(seenKeys[0]).toBe(seenKeys[1]);
    } finally {
      globalThis.fetch = originalFetch;
      globalThis.setTimeout = originalSetTimeout;
    }
  });

  it("retries a network error with the same idempotencyKey (response lost after server create)", async () => {
    const originalFetch = globalThis.fetch;
    const originalSetTimeout = globalThis.setTimeout;
    const runAgentBackground = await loadRunAgentBackground();
    const seenKeys: Array<string | undefined> = [];

    let runAttempts = 0;
    globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/agent/run")) {
        runAttempts++;
        const body = init?.body ? JSON.parse(String(init.body)) : null;
        seenKeys.push(body.idempotencyKey);
        if (runAttempts === 1) {
          // 服务端可能已创建 run，但响应在网络上丢失（socket hang up / ECONNRESET）。
          throw new Error("socket hang up");
        }
        return new Response(JSON.stringify({ dialogId: "dialog-net", status: "pending" }), {
          status: 202,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.endsWith("/api/events/dialog-dialog-net")) {
        return new Response(`data: ${JSON.stringify({ type: "done", content: "ok" })}\n\n`, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        });
      }
      throw new Error(`unexpected fetch: ${url}`);
    }) as unknown as typeof fetch;

    globalThis.setTimeout = (((callback: (...args: any[]) => void) => {
      callback();
      return 0;
    }) as unknown) as typeof setTimeout;

    try {
      const thunk = runAgentBackground({ agentKey: "agent-1", userInput: "net" });
      const action = await thunk(
        mock(() => undefined),
        () =>
          ({ settings: { currentServer: "http://localhost" }, auth: { currentToken: "token" } }) as any,
        undefined
      );
      expect(action.meta.requestStatus).toBe("fulfilled");
      expect(action.payload).toEqual({ dialogId: "dialog-net", content: "ok", usage: undefined });
      expect(runAttempts).toBe(2);
      expect(seenKeys[0]).toBe(seenKeys[1]);
    } finally {
      globalThis.fetch = originalFetch;
      globalThis.setTimeout = originalSetTimeout;
    }
  });

  it("honors a caller-supplied idempotencyKey", async () => {
    const originalFetch = globalThis.fetch;
    const runAgentBackground = await loadRunAgentBackground();
    let sentKey: string | undefined;

    globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/agent/run")) {
        const body = init?.body ? JSON.parse(String(init.body)) : null;
        sentKey = body.idempotencyKey;
        return new Response(JSON.stringify({ dialogId: "dialog-custom", status: "pending" }), {
          status: 202,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.endsWith("/api/events/dialog-dialog-custom")) {
        return new Response(`data: ${JSON.stringify({ type: "done", content: "ok" })}\n\n`, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        });
      }
      throw new Error(`unexpected fetch: ${url}`);
    }) as unknown as typeof fetch;

    try {
      const thunk = runAgentBackground({
        agentKey: "agent-1",
        userInput: "custom",
        idempotencyKey: "call_custom_1",
      });
      const action = await thunk(
        mock(() => undefined),
        () =>
          ({ settings: { currentServer: "http://localhost" }, auth: { currentToken: "token" } }) as any,
        undefined
      );
      expect(action.meta.requestStatus).toBe("fulfilled");
      expect(sentKey).toBe("call_custom_1");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
