import { afterEach, describe, expect, it } from "bun:test";

import {
  DEFAULT_INITIAL_STREAM_RETRY_AFTER_MS,
  isRetryableInitialStreamError,
  waitForInitialStreamRetry,
} from "./streamRetry";

describe("streamRetry", () => {
  const originalSetTimeout = globalThis.setTimeout;

  afterEach(() => {
    globalThis.setTimeout = originalSetTimeout;
  });

  it("treats deploy-window disconnects and empty-stream timeouts as retryable", () => {
    expect(isRetryableInitialStreamError(new Error("fetch failed"))).toBe(true);
    expect(isRetryableInitialStreamError(new Error("connect ECONNRESET"))).toBe(true);
    expect(
      isRetryableInitialStreamError(
        new Error("模型响应流 45 秒内没有返回新内容")
      )
    ).toBe(true);
    expect(isRetryableInitialStreamError(new Error("bad request"))).toBe(false);
  });

  it("waits for the requested retry delay", async () => {
    const delays: number[] = [];
    globalThis.setTimeout = (((callback: (...args: any[]) => void, ms?: number) => {
      delays.push(Number(ms ?? 0));
      callback();
      return 0;
    }) as unknown) as typeof setTimeout;

    await waitForInitialStreamRetry(2200);

    expect(delays).toEqual([2200]);
  });

  it("falls back to the default delay when retryAfter is invalid", async () => {
    const delays: number[] = [];
    globalThis.setTimeout = (((callback: (...args: any[]) => void, ms?: number) => {
      delays.push(Number(ms ?? 0));
      callback();
      return 0;
    }) as unknown) as typeof setTimeout;

    await waitForInitialStreamRetry(Number.NaN);

    expect(delays).toEqual([DEFAULT_INITIAL_STREAM_RETRY_AFTER_MS]);
  });
});
