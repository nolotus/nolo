/**
 * packages/core/fetchWithTransientRetry 的直连测试。
 *
 * 该模块是从 packages/cli/client/localRuntimeFetchRetry.ts 下沉的共享重试实现，
 * 供 CLI 与 packages/ai 等所有客户端路径共用。本文件直接 import core 模块，
 * 守护三条主路径：core_draining 长预算重试、预算耗尽后的友好替换响应、
 * transient 网络错误重试；CLI barrel 的 re-export 兼容面另由
 * packages/cli/client/fetchWithTransientRetry.test.ts 守护。
 */
import { describe, expect, it } from "bun:test";
import {
  fetchWithTransientRetry,
  isTransientFetchError,
} from "./fetchWithTransientRetry";
import { DRAIN_EXHAUSTED_USER_MESSAGE } from "./drainReason";

const json = (status: number, body: unknown, headers?: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });

const drain503 = () =>
  json(503, {
    error: "Server draining",
    reason: "core_draining",
    retryable: true,
    retryAfterMs: 1, // 测试内让 30 次长预算瞬间走完
  });

function scriptedFetch(responses: Response[]) {
  const calls: number[] = [];
  const impl = (async () => {
    calls.push(Date.now());
    return responses.shift() ?? drain503();
  }) as any;
  return { impl, calls };
}

describe("core fetchWithTransientRetry (direct)", () => {
  it("gives structured 503 core_draining the dedicated long budget, beyond the generic 3-attempt budget", async () => {
    const slept: number[] = [];
    const { impl, calls } = scriptedFetch([
      drain503(),
      drain503(),
      drain503(),
      drain503(),
      json(200, { ok: true }),
    ]);

    const res = await fetchWithTransientRetry(impl, "https://example.test/x", undefined, {
      sleep: async (ms) => { slept.push(ms); },
    });

    expect(res.status).toBe(200);
    // 4 次重试 > 普通预算（3 次）：core_draining 专属长预算在 core 直连面生效，
    // 不会把 drain 窗口截断在通用预算上。
    expect(calls.length).toBe(5);
    expect(slept).toEqual([1, 1, 1, 1]);
  });

  it("returns the friendly replacement response when the drain budget is exhausted", async () => {
    const { impl, calls } = scriptedFetch([]);

    const res = await fetchWithTransientRetry(impl, "https://example.test/x", undefined, {
      sleep: async () => {},
    });

    // 耗尽后不是 raw JSON，而是共享层注入的友好文案（503 + text/plain）。
    expect(res.status).toBe(503);
    const bodyText = await res.text();
    expect(bodyText).toBe(DRAIN_EXHAUSTED_USER_MESSAGE);
    expect(bodyText).not.toContain("Server draining");
    expect(bodyText).not.toContain("core_draining");
    // 打满 CORE_DRAINING_MAX_ATTEMPTS（30）后才替换，而不是普通预算的 3 次。
    expect(calls.length).toBe(30);
  });

  it("retries transient network errors by default until success", async () => {
    let calls = 0;
    const slept: number[] = [];
    const impl = (async () => {
      calls += 1;
      if (calls <= 2) throw new Error("socket hang up");
      return json(200, { ok: true });
    }) as any;

    const res = await fetchWithTransientRetry(impl, "https://example.test/x", undefined, {
      sleep: async (ms) => { slept.push(ms); },
    });

    expect(res.status).toBe(200);
    expect(calls).toBe(3);
    // 网络错误走通用预算 + 指数退避（250ms 起），不占用 drain 长预算。
    expect(slept).toEqual([250, 500]);
  });

  it("classifies transport-level failures for the shared retry seam", () => {
    expect(isTransientFetchError(new Error("ECONNRESET socket hang up"))).toBe(true);
    expect(isTransientFetchError(new Error("HTTP 404 not found"))).toBe(false);
  });
});
