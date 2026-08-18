// packages/ai/tools/agent/quotaCircuitBreaker.test.ts
//
// 覆盖规格要求的测试面：
// - 各类 quota 错误形态（429 数字/文案关键词/status 字段/中文额度上限用尽）均被识别
// - quota 与 agent-not-found 正确区分
// - 熔断期内派发被直接拒绝且不发起远程调用；熔断到期后恢复
// - "Resets in 17hr 51min" 能解析；无法解析时字段留空而不是瞎猜
// - 契约测试：CLI 与共享层共用同一份 pattern（CLI 若回退为本地实现，本测试必须失败）

import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import {
  AGENT_NOT_FOUND_PATTERNS,
  classifyRunFailure,
  createInMemoryCircuitBreakerStore,
  DEFAULT_AGENT_NOT_FOUND_BREAKER_MS,
  buildBreakerEntry,
  extractProvider,
  findActiveBreaker,
  isAgentNotFoundError,
  isAuthError,
  isNetworkError,
  isQuotaExhaustedError,
  parseResetsInMs,
  QUOTA_ERROR_PATTERNS,
  shouldRejectDispatch,
} from "./quotaCircuitBreaker";

const NOW = 1_750_000_000_000; // 固定时钟（模块禁止读取系统时钟，时间全由入参驱动）

// ── 1. quota 识别：各类形态 ──────────────────────────────────────

describe("isQuotaExhaustedError — 各类 quota 错误形态均被识别", () => {
  it("429 数字（错误消息含 429）", () => {
    expect(isQuotaExhaustedError(new Error("HTTP 429 Too Many Requests"))).toBe(true);
    expect(isQuotaExhaustedError("429 quota exceeded")).toBe(true);
  });

  it("文案关键词 quota / rate limit / too many requests", () => {
    // 真实场景：HTTP 429 状态码 + "Weekly usage limit reached. Resets in 17hr 51min"
    // （识别靠 status===429；消息里的恢复时长另由 parseResetsInMs 解析）
    expect(
      isQuotaExhaustedError({ status: 429, message: "Weekly usage limit reached. Resets in 17hr 51min" }),
    ).toBe(true);
    expect(isQuotaExhaustedError(new Error("quota exceeded, please upgrade"))).toBe(true);
    expect(isQuotaExhaustedError(new Error("Rate limit exceeded, slow down"))).toBe(true);
    expect(isQuotaExhaustedError(new Error("Too many requests in window"))).toBe(true);
  });

  it("status 字段 / statusCode 字段为 429", () => {
    expect(isQuotaExhaustedError({ status: 429, message: "upstream rejected" })).toBe(true);
    expect(isQuotaExhaustedError({ statusCode: 429, message: "upstream rejected" })).toBe(true);
    expect(isQuotaExhaustedError({ status: 500, message: "server error" })).toBe(false);
  });

  it("中文 额度 / 上限 / 用尽", () => {
    expect(isQuotaExhaustedError(new Error("本周额度已用完"))).toBe(true);
    expect(isQuotaExhaustedError(new Error("已达到调用上限"))).toBe(true);
    expect(isQuotaExhaustedError(new Error("配额用尽"))).toBe(true);
  });

  it("结构化识别 CliProviderQuotaError（按 name / message 前缀，不依赖 CLI 包）", () => {
    expect(
      isQuotaExhaustedError({ name: "CliProviderQuotaError", message: "[QUOTA_LIMITED:opencode-go] quota" }),
    ).toBe(true);
    expect(isQuotaExhaustedError({ message: "[QUOTA_LIMITED:opencode-go] weekly limit" })).toBe(true);
  });

  it("非 quota 错误不被误判", () => {
    expect(isQuotaExhaustedError(new Error("agent crashed with TypeError"))).toBe(false);
    expect(isQuotaExhaustedError(null)).toBe(false);
    expect(isQuotaExhaustedError(undefined)).toBe(false);
  });
});

// ── 2. agent-not-found 与 quota 区分 ─────────────────────────────

describe("agent-not-found 与 quota 正确区分", () => {
  it("agent not found 文案 / AGENT_NOT_FOUND code / 404+agent 语义", () => {
    expect(isAgentNotFoundError(new Error("Agent config not found for ID: agent-xxx"))).toBe(true);
    expect(isAgentNotFoundError(new Error("readAgent not found: agent-bad"))).toBe(true);
    expect(isAgentNotFoundError({ code: "AGENT_NOT_FOUND", message: "Agent 不存在: agent-xxx" })).toBe(true);
    expect(isAgentNotFoundError({ status: 404, message: "Agent 不存在或无权限" })).toBe(true);
    expect(isAgentNotFoundError({ statusCode: 404, message: "agent not found" })).toBe(true);
  });

  it("普通 404（无 agent 语义）不误判为 agent-not-found", () => {
    expect(isAgentNotFoundError({ status: 404, message: "page not found" })).toBe(false);
    expect(isAgentNotFoundError({ status: 404, message: "" })).toBe(false);
  });

  it("quota 错误不是 agent-not-found，反之亦然", () => {
    expect(isAgentNotFoundError(new Error("Weekly usage limit reached"))).toBe(false);
    expect(isQuotaExhaustedError(new Error("Agent config not found for ID: agent-xxx"))).toBe(false);
  });

  it("classifyRunFailure 正确分派 reason", () => {
    expect(
      classifyRunFailure({ status: 429, message: "Weekly usage limit reached. Resets in 17hr 51min" }).reason,
    ).toBe("quota");
    expect(classifyRunFailure(new Error("Agent config not found for ID: agent-bad")).reason).toBe("agent-not-found");
    expect(classifyRunFailure({ status: 401, message: "unauthorized" }).reason).toBe("auth");
    expect(classifyRunFailure(new Error("ECONNREFUSED")).reason).toBe("network");
    expect(classifyRunFailure(new Error("unexpected crash")).reason).toBe("other");
  });
});

// ── 3. 结构化字段：provider / retryAfterMs 解析 ──────────────────

describe("结构化字段解析", () => {
  it("extractProvider 从 provider 字段 / [QUOTA_LIMITED:] 前缀提取", () => {
    expect(extractProvider({ provider: "opencode-go", message: "quota" })).toBe("opencode-go");
    expect(extractProvider({ message: "[QUOTA_LIMITED:opencode-go] weekly limit" })).toBe("opencode-go");
    expect(extractProvider(new Error("plain error"))).toBeUndefined();
  });

  it("parseResetsInMs 解析 'Resets in 17hr 51min'", () => {
    // 17h51m = 17*3600*1000 + 51*60*1000 = 64_260_000
    expect(parseResetsInMs("Weekly usage limit reached. Resets in 17hr 51min")).toBe(64_260_000);
  });

  it("parseResetsInMs 支持 hours / minutes / seconds / days 变体", () => {
    expect(parseResetsInMs("Resets in 2 hours")).toBe(2 * 3600 * 1000);
    expect(parseResetsInMs("try again in 30 minutes")).toBe(30 * 60 * 1000);
    expect(parseResetsInMs("Retry after 90 seconds")).toBe(90 * 1000);
    expect(parseResetsInMs("resets in 1 day 3 hours 45 minutes")).toBe(
      (24 * 3600 + 3 * 3600 + 45 * 60) * 1000,
    );
  });

  it("无法解析时留空而不是瞎猜", () => {
    expect(parseResetsInMs("Weekly usage limit reached.")).toBeUndefined();
    expect(parseResetsInMs("")).toBeUndefined();
    expect(parseResetsInMs("some unrelated error text")).toBeUndefined();
  });

  it("classifyRunFailure 的 quota 带 retryAfterMs，解析不到则留空", () => {
    const withResets = classifyRunFailure({
      status: 429,
      message: "Weekly usage limit reached. Resets in 17hr 51min",
    });
    expect(withResets.reason).toBe("quota");
    expect(withResets.retryAfterMs).toBe(64_260_000);

    const withoutResets = classifyRunFailure({
      status: 429,
      message: "Weekly usage limit reached.",
    });
    expect(withoutResets.reason).toBe("quota");
    expect(withoutResets.retryAfterMs).toBeUndefined();
  });

  it("retry-after 响应头也被识别（秒 → 毫秒）", () => {
    const info = classifyRunFailure({ status: 429, headers: { "retry-after": "300" } });
    expect(info.reason).toBe("quota");
    expect(info.retryAfterMs).toBe(300_000);
  });
});

// ── 4. 熔断判定：期内拒绝、到期恢复 ─────────────────────────────

describe("短期熔断判定（纯函数，无 I/O）", () => {
  const quotaEntry = buildBreakerEntry(NOW, "opencode-go", "quota", 64_260_000);

  it("熔断期内派发被拒绝，且不发起远程调用", () => {
    // 模拟派发入口：判定拒绝时直接短路，dispatch 不被调用
    let remoteCalls = 0;
    const dispatch = () => {
      remoteCalls += 1;
      return "remote-ok";
    };
    if (shouldRejectDispatch(NOW + 1000, [quotaEntry], "opencode-go")) {
      // 拒绝路径：不发远程调用
    } else {
      dispatch();
    }
    expect(remoteCalls).toBe(0);
  });

  it("findActiveBreaker 返回命中条目（含 until）", () => {
    const hit = findActiveBreaker(NOW + 1000, [quotaEntry], "opencode-go");
    expect(hit?.target).toBe("opencode-go");
    expect(hit?.kind).toBe("quota");
    expect(hit?.until).toBe(NOW + 64_260_000);
    expect(hit?.resetsAt).toBe(NOW + 64_260_000);
  });

  it("其它 provider 不受影响", () => {
    expect(shouldRejectDispatch(NOW + 1000, [quotaEntry], "claude-code")).toBe(false);
  });

  it("熔断到期后恢复正常派发", () => {
    expect(shouldRejectDispatch(NOW + 64_260_000 + 1, [quotaEntry], "opencode-go")).toBe(false);
    const hit = findActiveBreaker(NOW + 64_260_000 + 1, [quotaEntry], "opencode-go");
    expect(hit).toBeUndefined();
  });

  it("agent-not-found 负缓存 TTL 短于 quota", () => {
    const nfEntry = buildBreakerEntry(NOW, "agent-bad", "agent-not-found");
    expect(nfEntry.until - NOW).toBe(DEFAULT_AGENT_NOT_FOUND_BREAKER_MS);
    // 负缓存到期后恢复（允许重新派发，可能是远端刚创建了该 agent）
    expect(shouldRejectDispatch(NOW + DEFAULT_AGENT_NOT_FOUND_BREAKER_MS + 1, [nfEntry], "agent-bad")).toBe(false);
  });

  it("无熔断表时一切照常派发", () => {
    expect(shouldRejectDispatch(NOW, [], "opencode-go")).toBe(false);
  });

  it("quota 未解析到 retryAfterMs 时用默认熔断时长兜底", () => {
    const entry = buildBreakerEntry(NOW, "opencode-go", "quota");
    expect(entry.until - NOW).toBe(6 * 3600 * 1000);
  });
});

// ── 5. 存储接口：内存实现（读写在适配层，本层零 I/O）────────────

describe("CircuitBreakerStore 接口 + 内存实现", () => {
  it("set / get / clear / clearAll 基本读写", () => {
    const store = createInMemoryCircuitBreakerStore();
    const entry = buildBreakerEntry(NOW, "opencode-go", "quota", 64_260_000);
    store.set(entry);
    expect(store.get("opencode-go")).toEqual(entry);
    expect(store.get("claude-code")).toBeUndefined();

    store.clear("opencode-go");
    expect(store.get("opencode-go")).toBeUndefined();

    store.set(entry);
    store.clearAll();
    expect(store.get("opencode-go")).toBeUndefined();
  });
});

// ── 6. 契约测试：CLI 与共享层共用同一份 pattern ─────────────────

describe("契约：CLI 与共享层共用同一份实现（回退后本测试必须失败）", () => {
  it("QUOTA_ERROR_PATTERNS 覆盖规格列出的全部关键词", () => {
    const samples: Array<[string, string]> = [
      ["429", "HTTP 429 Too Many Requests"],
      ["quota", "quota exceeded"],
      ["rate limit", "Rate limit reached"],
      ["too many requests", "Too many requests in window"],
      ["额度", "额度已用完"],
      ["上限", "已达调用上限"],
      ["用尽", "配额用尽"],
      ["CliProviderQuotaError", "[QUOTA_LIMITED:opencode-go] quota"],
    ];
    for (const [keyword, sample] of samples) {
      expect(
        QUOTA_ERROR_PATTERNS.some((p) => p.test(sample)),
        `pattern set should match keyword "${keyword}" via sample "${sample}"`,
      ).toBe(true);
    }
  });

  it("CLI 源码 re-export 共享层实现，且不保留本地第二份实现", () => {
    // 直接读 CLI 文件源码断言契约，避免在并发测试中反向 import CLI 依赖树
    // （CLI 依赖树含并行 agent 正在改的模块，动态 import 会撞中间态）。
    // 回退场景（CLI 本地再写一份 patterns/isQuotaExhaustedError）下本断言失败。
    const cliSource = readFileSync(
      new URL("../../../cli/agentRunCommand.ts", import.meta.url),
      "utf8",
    );
    // CLI 必须从共享层 import 同一实现（单一来源）
    expect(cliSource).toContain(
      'import { isQuotaExhaustedError, QUOTA_ERROR_PATTERNS } from "ai/tools/agent/quotaCircuitBreaker"',
    );
    // CLI 必须 re-export 共享层实现（保持既有调用方 import 路径兼容）
    expect(cliSource).toContain("export { isQuotaExhaustedError, QUOTA_ERROR_PATTERNS };");
    // CLI 不得再定义本地第二份实现
    expect(cliSource).not.toContain("const QUOTA_ERROR_PATTERNS");
    expect(cliSource).not.toContain("export function isQuotaExhaustedError");
  });
});
