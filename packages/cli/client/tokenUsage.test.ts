import { describe, expect, test } from "bun:test";
import {
  BUILTIN_NOLO_AGENT_KEY,
  PUBLIC_DEEPSEEK_V4_FLASH_AGENT_KEY,
} from "core/builtinAgents";
import {
  buildTurnTokenUsage,
  formatTokenCount,
  formatUsage,
  mergeUsageRecords,
  renderTokenStatus,
  resolveAgentContextWindow,
  resolveAgentModelIdentity,
  resolveContextWindow,
  sumPlatformCredits,
  withTurnCredits,
} from "./tokenUsage";

describe("tokenUsage", () => {
  test("merges usage across tool-loop rounds", () => {
    expect(
      mergeUsageRecords(
        { prompt_tokens: 100, completion_tokens: 20 },
        { input_tokens: 300, output_tokens: 40 }
      )
    ).toEqual({ input_tokens: 400, output_tokens: 60 });
  });

  test("computes remaining context from the latest prompt size", () => {
    const usage = buildTurnTokenUsage(
      { prompt_tokens: 12_400, completion_tokens: 1_200 },
      "MiniMax-M3"
    );
    expect(usage).toMatchObject({
      input: 12_400,
      output: 1_200,
      contextWindow: 1_000_000,
      remaining: 987_600,
    });
    expect(renderTokenStatus(usage)).toBe("in 12.4k out 1.2k left 987.6k");

    const fireworksUsage = buildTurnTokenUsage(
      { prompt_tokens: 12_400, completion_tokens: 1_200 },
      "accounts/fireworks/models/minimax-m3"
    );
    expect(fireworksUsage?.contextWindow).toBe(512_000);
  });

  test("formats small and unknown token counts", () => {
    expect(formatTokenCount(842)).toBe("842");
    expect(renderTokenStatus()).toBe("in — out — left —");
    expect(resolveContextWindow("MiniMax-M3")).toBe(1_000_000);
  });

  test("resolveAgentContextWindow follows the nolo catalog model (1M)", () => {
    // nolo 指向 builtinAgentCatalog 里的 GLM 5.3 Flash（1M），
    // 窗口跟随目录模型，不再受 NOLO_AUTO_ROUTE 影响。
    // glm-5-3-flash（当前 nolo 默认档）的 catalog 窗口是 1M（2^20）。
    expect(
      resolveAgentContextWindow({
        agentKey: BUILTIN_NOLO_AGENT_KEY,
        agentName: "nolo",
      }),
    ).toBe(1_048_576);

    expect(
      resolveAgentContextWindow({
        agentKey: PUBLIC_DEEPSEEK_V4_FLASH_AGENT_KEY,
        agentName: "auto→flash",
      }),
    ).toBe(1_000_000);

    // 没有 agentKey 时只有一个显示名，仍回落到通用默认窗口。
    expect(resolveAgentContextWindow({ agentName: "nolo" })).toBe(256_000);
  });

  test("resolveAgentModelIdentity resolves the nolo default from the catalog", () => {
    expect(
      resolveAgentModelIdentity({
        agentKey: BUILTIN_NOLO_AGENT_KEY,
        agentName: "nolo",
      }),
    ).toEqual({ agentName: "nolo", model: "glm-5-3-flash" });

    // 显式 model 优先，不被默认档覆盖。
    expect(
      resolveAgentModelIdentity({
        agentKey: "agent-pub-custom",
        agentName: "custom",
        model: "gpt-5.6-luna",
      }),
    ).toEqual({ agentName: "custom", model: "gpt-5.6-luna" });

    expect(
      resolveAgentModelIdentity({ agentKey: "agent-pub-custom", agentName: "custom" }),
    ).toEqual({ agentName: "custom" });
  });

  test("calculates platform credits from provider raw cost when cost > 0", () => {
    expect(
      buildTurnTokenUsage(
        { input_tokens: 100, output_tokens: 50, cost: 0.5 },
        "nolo"
      )?.credits
    ).toBe(4.0);
    expect(
      buildTurnTokenUsage({ input_tokens: 100, output_tokens: 50 }, "nolo")
        ?.credits
    ).toBeUndefined();
  });

  test("keeps platform-billed cost as credits verbatim (no x8)", () => {
    // 服务端 billing 帧注入 billing_unit: "credits"，cost 已是平台积分，原样取值。
    expect(
      buildTurnTokenUsage(
        {
          input_tokens: 16,
          output_tokens: 59,
          cost: 0.000202,
          billing_provider: "nolo",
          billing_model: "glm-5-3-flash",
          billing_unit: "credits",
        },
        "nolo"
      )?.credits
    ).toBe(0.000202);
  });

  test("multiplies external provider USD cost by 8 credits/USD", () => {
    // 无 billing 元数据 → cost 是外部 provider 自报美元（如 OpenRouter custom agent）。
    expect(
      buildTurnTokenUsage(
        { input_tokens: 100, output_tokens: 50, cost: 0.01 },
        "openrouter/custom"
      )?.credits
    ).toBe(0.08);
  });

  test("conservatively falls back to USD ×8 when only billing_provider present without billing_unit", () => {
    // 仅有 billing_provider、无 billing_unit → 缺单位标记，保守按美元换算。
    expect(
      buildTurnTokenUsage(
        {
          input_tokens: 100,
          output_tokens: 50,
          cost: 0.01,
          billing_provider: "nolo",
        },
        "nolo"
      )?.credits
    ).toBe(0.08);
  });

  test("conservatively falls back to USD ×8 when upstream forges billing_provider/billing_model without billing_unit", () => {
    // 上游伪造 billing_provider/billing_model 但无 billing_unit → 仍按美元换算，
    // 不再因字段存在性误判为平台积分。
    expect(
      buildTurnTokenUsage(
        {
          input_tokens: 100,
          output_tokens: 50,
          cost: 0.01,
          billing_provider: "forged",
          billing_model: "forged-model",
        },
        "nolo"
      )?.credits
    ).toBe(0.08);
  });

  test("treats billing_unit credits + cost as platform credits verbatim", () => {
    expect(
      buildTurnTokenUsage(
        {
          input_tokens: 16,
          output_tokens: 59,
          cost: 0.000202,
          billing_unit: "credits",
        },
        "nolo"
      )?.credits
    ).toBe(0.000202);
  });

  test("sumPlatformCredits adds up every platform-billed call in the turn", () => {
    // 一轮里 3 次 provider 调用：result.usage 只会是最后一次（0.001），
    // 状态行要的是三次之和。
    expect(
      sumPlatformCredits([
        { usage: { cost: 0.004, billing_unit: "credits" } },
        { usage: { cost: 0.002, billing_unit: "credits" } },
        { usage: { cost: 0.001, billing_unit: "credits" } },
      ])
    ).toBeCloseTo(0.007, 10);
  });

  test("sumPlatformCredits ignores calls without the platform billing unit", () => {
    // 自有 API / 订阅制不扣平台积分：即便上游自报 cost 也不折算进来，
    // 否则会凭空造出一笔并不存在的平台消费。
    expect(
      sumPlatformCredits([
        { usage: { cost: 1.5 } },
        { usage: { cost: 2.5, billing_provider: "forged" } },
      ])
    ).toBeUndefined();
    expect(
      sumPlatformCredits([
        { usage: { cost: 1.5 } },
        { usage: { cost: 0.25, billing_unit: "credits" } },
      ])
    ).toBe(0.25);
  });

  test("sumPlatformCredits reports 0 for a platform call that was not charged", () => {
    // 「跑了平台但这次没扣费」和「压根没走平台」是两件事：前者返回 0，
    // 后者返回 undefined。
    expect(sumPlatformCredits([{ usage: { cost: 0, billing_unit: "credits" } }])).toBe(0);
    expect(sumPlatformCredits([])).toBeUndefined();
    expect(sumPlatformCredits(undefined)).toBeUndefined();
  });

  test("withTurnCredits overrides the last-call credits with the turn total", () => {
    const lastCallOnly = buildTurnTokenUsage(
      { input_tokens: 10, output_tokens: 5, cost: 0.001, billing_unit: "credits" },
      "nolo"
    );
    expect(lastCallOnly?.credits).toBe(0.001);
    const wholeTurn = withTurnCredits(lastCallOnly, 0.007);
    expect(wholeTurn?.credits).toBe(0.007);
    // token 字段不受影响：上下文占用看的是最后一次调用的累计输入。
    expect(wholeTurn?.input).toBe(10);
    expect(wholeTurn?.output).toBe(5);
  });

  test("withTurnCredits keeps existing credits when the turn total is unknown", () => {
    const tokens = buildTurnTokenUsage({ input_tokens: 1, output_tokens: 1 }, "nolo");
    expect(withTurnCredits(tokens, undefined)).toBe(tokens);
    expect(withTurnCredits(undefined, 0.5)).toBeUndefined();
  });

  test("formatUsage renders cache hit count and percentage", () => {
    expect(
      formatUsage(
        {
          input_tokens: 10_000,
          output_tokens: 250,
          cache_read_input_tokens: 8_000,
        },
        "01TESTDIALOG0000000000"
      )
    ).toContain("cache: 8k / 44.4%");

    // OpenAI/Anthropic 语义：input 不含 cache 时命中可能超过新输入，
    // 分母包含 cacheHit 后百分比恒 ≤100%
    expect(
      formatUsage(
        {
          input_tokens: 2_000,
          output_tokens: 100,
          cache_read_input_tokens: 10_000,
        },
        "01TESTDIALOG0000000000"
      )
    ).toContain("cache: 10k / 83.3%");

    expect(
      renderTokenStatus({
        input: 10_000,
        output: 250,
        cacheRead: 8_000,
      })
    ).toBe("in 10k (cache 8k) out 250 left —");
  });
});
