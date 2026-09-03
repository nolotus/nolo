import { describe, expect, it } from "bun:test";

import { resolveDisplayableUsageCost } from "./displayableUsageCost";
import type { BillingAgentConfig } from "./prepareTokenUsageData";

describe("resolveDisplayableUsageCost (展示层积分 cost 解析)", () => {
  const platformAgent: BillingAgentConfig = {
    provider: "deepseek",
    model: "deepseek-v4-flash",
    apiSource: "platform",
  };
  const usage = { input_tokens: 100, output_tokens: 50 };

  it("shows the actual catalog cost for a builtin with stale persisted prices", () => {
    const cost = resolveDisplayableUsageCost({
      billingAgentConfig: {
        provider: "nolo",
        model: "glm-5-3-flash",
        apiSource: "platform",
        id: "01NOLOAPPBLD000000019KCKT0",
        inputPrice: 3.36,
        outputPrice: 13.44,
      },
      agentId: "agent-pub-01NOLOAPPBLD000000019KCKT0",
      usage: { input_tokens: 1_000_000, output_tokens: 1_000_000 },
      userId: "user-1",
    });

    expect(cost).toBe(4);
  });

  it("keeps creator pricing when canonical identity conflicts with a stale builtin raw id", () => {
    const cost = resolveDisplayableUsageCost({
      billingAgentConfig: {
        provider: "nolo",
        model: "glm-5-3-flash",
        apiSource: "custom",
        id: "01NOLOAPPBLD000000019KCKT0",
        inputPrice: 3.36,
        outputPrice: 13.44,
      },
      agentId: "agent-pub-01CREATORAGENT000000000001",
      usage: { input_tokens: 1_000_000, output_tokens: 1_000_000 },
      userId: "user-1",
    });

    expect(cost).toBe(16.8);
  });

  it("does not infer builtin pricing from a mutable raw id without a canonical key", () => {
    const cost = resolveDisplayableUsageCost({
      billingAgentConfig: {
        provider: "nolo",
        model: "glm-5-3-flash",
        apiSource: "custom",
        id: "01NOLOAPPBLD000000019KCKT0",
        inputPrice: 3.36,
        outputPrice: 13.44,
      },
      usage: { input_tokens: 1_000_000, output_tokens: 1_000_000 },
      userId: "user-1",
    });

    expect(cost).toBe(16.8);
  });

  it("platform apiSource + persisted prices + no canonical key → catalog price (fail-closed, 事故形状)", () => {
    const cost = resolveDisplayableUsageCost({
      billingAgentConfig: {
        provider: "nolo",
        model: "glm-5-3-flash",
        apiSource: "platform",
        id: "01NOLOAPPBLD000000019KCKT0",
        inputPrice: 3.36,
        outputPrice: 13.44,
      },
      usage: { input_tokens: 1_000_000, output_tokens: 1_000_000 },
      userId: "user-1",
    });

    expect(cost).toBe(4);
  });

  it("billable > 0 → 返回 cost（platform agent 真实计费）", () => {
    const cost = resolveDisplayableUsageCost({
      billingAgentConfig: platformAgent,
      usage,
      userId: "user-1",
    });
    expect(typeof cost).toBe("number");
    expect(cost as number).toBeGreaterThan(0);
  });

  it("cost <= 0 → undefined（空 usage / 零 token）", () => {
    expect(
      resolveDisplayableUsageCost({
        billingAgentConfig: platformAgent,
        usage: {},
        userId: "user-1",
      }),
    ).toBeUndefined();
  });

  it("非 billable → undefined（custom 无 externalPrice 用户自带 key）", () => {
    expect(
      resolveDisplayableUsageCost({
        billingAgentConfig: {
          provider: "deepseek",
          model: "deepseek-v4-flash",
          apiSource: "custom",
        },
        usage,
        userId: "user-1",
      }),
    ).toBeUndefined();
  });

  it("userId 为 'local' / 空 → undefined（未登录本地账号不计费）", () => {
    expect(
      resolveDisplayableUsageCost({
        billingAgentConfig: platformAgent,
        usage,
        userId: "local",
      }),
    ).toBeUndefined();
    expect(
      resolveDisplayableUsageCost({
        billingAgentConfig: platformAgent,
        usage,
        userId: "",
      }),
    ).toBeUndefined();
  });

  it("异常输入 → undefined（绝不抛，不阻断响应路径）", () => {
    expect(() =>
      resolveDisplayableUsageCost({
        billingAgentConfig: platformAgent,
        usage: { input_tokens: Number.NaN } as any,
        userId: "user-1",
      }),
    ).not.toThrow();
    const result = resolveDisplayableUsageCost({
      billingAgentConfig: platformAgent,
      usage: { input_tokens: Number.NaN } as any,
      userId: "user-1",
    });
    expect(result).toBeUndefined();
  });
});
