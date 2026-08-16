import { describe, expect, test } from "bun:test";
import { CORE_DRAIN_REASON } from "core/drainReason";
import { isDeployWindowRetrySignal } from "core/deployWindowRetrySignal";

describe("isDeployWindowRetrySignal", () => {
  test("core_draining reason → 部署窗口信号（无论是否带 status）", () => {
    expect(
      isDeployWindowRetrySignal({ reason: CORE_DRAIN_REASON, retryable: true })
    ).toBe(true);
    expect(
      isDeployWindowRetrySignal({ status: 503, reason: CORE_DRAIN_REASON })
    ).toBe(true);
  });

  test("网关类 status 502/503/504 → 部署窗口信号", () => {
    expect(isDeployWindowRetrySignal({ status: 502, retryable: true })).toBe(true);
    expect(isDeployWindowRetrySignal({ status: 503, retryable: true })).toBe(true);
    expect(isDeployWindowRetrySignal({ status: 504, retryable: true })).toBe(true);
  });

  test("带 status 的非网关错误（429/500 等）→ 不算部署窗口信号", () => {
    expect(isDeployWindowRetrySignal({ status: 429, retryable: true })).toBe(false);
    expect(isDeployWindowRetrySignal({ status: 500, retryable: true })).toBe(false);
  });

  test("无 status 的 retryable 错误（事件流意外关闭/连接失败）→ 部署窗口信号", () => {
    expect(isDeployWindowRetrySignal({ retryable: true })).toBe(true);
    expect(isDeployWindowRetrySignal({ retryable: true, reason: undefined })).toBe(true);
  });

  test("非 retryable 错误（401/403/abort）→ 不重试，不算部署窗口信号", () => {
    expect(isDeployWindowRetrySignal({ status: 401 })).toBe(false);
    expect(isDeployWindowRetrySignal({ status: 403 })).toBe(false);
    expect(isDeployWindowRetrySignal({})).toBe(false);
  });
});
