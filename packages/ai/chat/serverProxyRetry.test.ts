import { afterEach, describe, expect, it, mock } from "bun:test";

import { performServerProxyFetchWithRetry } from "./serverProxyRetry";
import { DRAIN_EXHAUSTED_USER_MESSAGE } from "core/drainReason";

describe("performServerProxyFetchWithRetry", () => {
  const originalSetTimeout = globalThis.setTimeout;

  afterEach(() => {
    globalThis.setTimeout = originalSetTimeout;
  });

  it("retries once on retryable proxy responses and honors Retry-After", async () => {
    const delays: number[] = [];
    globalThis.setTimeout = (((callback: (...args: any[]) => void, ms?: number) => {
      delays.push(Number(ms ?? 0));
      callback();
      return 0;
    }) as unknown) as typeof setTimeout;

    const execute = mock(async () => {
      if (execute.mock.calls.length === 1) {
        return new Response("draining", {
          status: 503,
          headers: { "Retry-After": "2" },
        });
      }
      return new Response("ok", { status: 200 });
    });

    const response = await performServerProxyFetchWithRetry({
      execute,
    });

    expect(response.status).toBe(200);
    expect(execute).toHaveBeenCalledTimes(2);
    expect(delays).toEqual([2000]);
  });

  it("waits through a bounded sequence of explicit core drain responses", async () => {
    const delays: number[] = [];
    globalThis.setTimeout = (((callback: (...args: any[]) => void, ms?: number) => {
      delays.push(Number(ms ?? 0));
      callback();
      return 0;
    }) as unknown) as typeof setTimeout;

    let attempt = 0;
    const execute = mock(async () => {
      attempt += 1;
      if (attempt <= 4) {
        return Response.json(
          {
            error: "Server draining",
            reason: "core_draining",
            retryable: true,
            retryAfterMs: 1,
          },
          { status: 503 },
        );
      }
      return new Response("ok", { status: 200 });
    });

    const response = await performServerProxyFetchWithRetry({ execute });

    expect(response.status).toBe(200);
    expect(execute).toHaveBeenCalledTimes(5);
    expect(delays).toEqual([1, 1, 1, 1]);
  });

  it("stops after the bounded core drain retry budget is exhausted", async () => {
    const delays: number[] = [];
    globalThis.setTimeout = (((callback: (...args: any[]) => void, ms?: number) => {
      delays.push(Number(ms ?? 0));
      callback();
      return 0;
    }) as unknown) as typeof setTimeout;

    const execute = mock(async () =>
      Response.json(
        {
          error: "Server draining",
          reason: "core_draining",
          retryable: true,
          retryAfterMs: 1,
        },
        { status: 503 },
      ),
    );

    const response = await performServerProxyFetchWithRetry({ execute });

    expect(response.status).toBe(503);
    expect(execute).toHaveBeenCalledTimes(31);
    expect(delays).toHaveLength(30);
    // retry 耗尽后应返回友好提示，而非 raw JSON
    const body = await response.text();
    expect(body).toBe(DRAIN_EXHAUSTED_USER_MESSAGE);
  });

  it("retries once on transient network failures with the default delay", async () => {
    const delays: number[] = [];
    globalThis.setTimeout = (((callback: (...args: any[]) => void, ms?: number) => {
      delays.push(Number(ms ?? 0));
      callback();
      return 0;
    }) as unknown) as typeof setTimeout;

    let attempt = 0;
    const execute = mock(async () => {
      attempt += 1;
      if (attempt === 1) {
        throw new Error("connect ECONNREFUSED");
      }
      return new Response("ok", { status: 200 });
    });

    const response = await performServerProxyFetchWithRetry({
      execute,
    });

    expect(response.status).toBe(200);
    expect(execute).toHaveBeenCalledTimes(2);
    expect(delays).toEqual([1000]);
  });

  it("retries up to 2 times with progressive backoff on transient network failures", async () => {
    const delays: number[] = [];
    globalThis.setTimeout = (((callback: (...args: any[]) => void, ms?: number) => {
      delays.push(Number(ms ?? 0));
      callback();
      return 0;
    }) as unknown) as typeof setTimeout;

    let attempt = 0;
    const execute = mock(async () => {
      attempt += 1;
      if (attempt <= 2) {
        throw new Error("Failed to fetch");
      }
      return new Response("ok", { status: 200 });
    });

    const response = await performServerProxyFetchWithRetry({
      execute,
    });

    expect(response.status).toBe(200);
    expect(execute).toHaveBeenCalledTimes(3);
    expect(delays).toEqual([1000, 2000]);
  });

  it("does not retry non-retryable responses", async () => {
    const execute = mock(async () => new Response("bad", { status: 400 }));

    const response = await performServerProxyFetchWithRetry({
      execute,
    });

    expect(response.status).toBe(400);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("reports retry progress via onRetry with attempt/maxAttempts/delayMs", async () => {
    const delays: number[] = [];
    globalThis.setTimeout = (((callback: (...args: any[]) => void, ms?: number) => {
      delays.push(Number(ms ?? 0));
      callback();
      return 0;
    }) as unknown) as typeof setTimeout;

    const reported: Array<{ attempt: number; maxAttempts: number; delayMs: number }> = [];
    const execute = mock(async () => {
      if (execute.mock.calls.length === 1) {
        return new Response("draining", {
          status: 503,
          headers: { "Retry-After": "2" },
        });
      }
      return new Response("ok", { status: 200 });
    });

    const response = await performServerProxyFetchWithRetry({
      execute,
      onRetry: (info) => reported.push(info),
    });

    expect(response.status).toBe(200);
    expect(execute).toHaveBeenCalledTimes(2);
    expect(reported).toEqual([{ attempt: 1, maxAttempts: 3, delayMs: 2000 }]);
  });

  it("retries plain 503 statuses up to 3 times then surfaces the last response", async () => {
    const delays: number[] = [];
    globalThis.setTimeout = (((callback: (...args: any[]) => void, ms?: number) => {
      delays.push(Number(ms ?? 0));
      callback();
      return 0;
    }) as unknown) as typeof setTimeout;

    const execute = mock(async () =>
      new Response("busy", { status: 503, headers: { "Retry-After": "1" } }),
    );

    const response = await performServerProxyFetchWithRetry({ execute });

    expect(response.status).toBe(503);
    // 初始 1 次 + 3 次重试 = 4 次调用
    expect(execute).toHaveBeenCalledTimes(4);
    expect(delays).toHaveLength(3);
  });

  it("reports network-error retry progress with attempt not exceeding maxAttempts", async () => {
    const delays: number[] = [];
    globalThis.setTimeout = (((callback: (...args: any[]) => void, ms?: number) => {
      delays.push(Number(ms ?? 0));
      callback();
      return 0;
    }) as unknown) as typeof setTimeout;

    const reported: Array<{ attempt: number; maxAttempts: number; delayMs: number }> = [];
    let attempt = 0;
    const execute = mock(async () => {
      attempt += 1;
      if (attempt <= 2) {
        throw new Error("Failed to fetch");
      }
      return new Response("ok", { status: 200 });
    });

    const response = await performServerProxyFetchWithRetry({
      execute,
      onRetry: (info) => reported.push(info),
    });

    expect(response.status).toBe(200);
    expect(execute).toHaveBeenCalledTimes(3);
    expect(reported).toEqual([
      { attempt: 1, maxAttempts: 2, delayMs: 1000 },
      { attempt: 2, maxAttempts: 2, delayMs: 2000 },
    ]);
  });
});
