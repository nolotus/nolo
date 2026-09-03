import { describe, expect, it } from "bun:test";

import { prepareTokenUsageData } from "./prepareTokenUsageData";
import { createTokenRecord } from "./saveTokenRecord";
import { findModelConfig } from "ai/llm/providers";

describe("prepareTokenUsageData", () => {
  it("ignores stale persisted prices for a code-owned builtin agent after model rerouting", () => {
    const prepared = prepareTokenUsageData({
      rawUsage: {
        input_tokens: 1_000_000,
        output_tokens: 1_000_000,
        billing_provider: "nolo",
        billing_model: "glm-5-3-flash",
      },
      agentConfig: {
        provider: "nolo",
        model: "kimi-k2.6",
        inputPrice: 3.36,
        outputPrice: 13.44,
        apiSource: "platform",
      },
      userId: "user-1",
      agentId: "agent-pub-01NOLOAPPBLD000000019KCKT0",
      dialogId: "dialog-1",
      timestamp: 12345,
    });

    expect(prepared.billedModel).toBe("glm-5-3-flash");
    expect(prepared.tokenData.cost).toBe(4);
  });

  it("preserves explicit pricing for an ordinary creator-owned public agent", () => {
    const prepared = prepareTokenUsageData({
      rawUsage: {
        input_tokens: 1_000_000,
        output_tokens: 1_000_000,
        billing_provider: "nolo",
        billing_model: "glm-5-3-flash",
      },
      agentConfig: {
        provider: "nolo",
        model: "kimi-k2.6",
        inputPrice: 3.36,
        outputPrice: 13.44,
        // A conflicting/stale record id must not override the canonical key.
        id: "01NOLOAPPBLD000000019KCKT0",
        userId: "creator-1",
        apiSource: "custom",
        sharingLevel: "full",
      },
      userId: "buyer-1",
      agentId: "agent-pub-01CREATORAGENT000000000001",
      dialogId: "dialog-1",
      timestamp: 12345,
    });

    expect(prepared.billedModel).toBe("glm-5-3-flash");
    expect(prepared.tokenData.cost).toBe(16.8);
    expect(prepared.tokenData.pay["creator-1"]).toBe(12.8);
  });

  it("ignores persisted prices for a platform agent whose key is not in the builtin set", () => {
    const prepared = prepareTokenUsageData({
      rawUsage: {
        input_tokens: 1_000_000,
        output_tokens: 1_000_000,
        billing_provider: "nolo",
        billing_model: "glm-5-3-flash",
      },
      agentConfig: {
        provider: "nolo",
        model: "kimi-k2.6",
        inputPrice: 3.36,
        outputPrice: 13.44,
        apiSource: "platform",
      },
      userId: "user-1",
      agentId: "agent-pub-01NOTINBUILTINSET00000000A",
      dialogId: "dialog-1",
      timestamp: 12345,
    });

    expect(prepared.tokenData.cost).toBe(4);
  });

  it("prefers billing metadata from usage over the agent fallback", () => {
    const prepared = prepareTokenUsageData({
      rawUsage: {
        prompt_tokens: 1_000_000,
        completion_tokens: 1_000_000,
        total_tokens: 2_000_000,
        prompt_cache_hit_tokens: 0,
        prompt_cache_miss_tokens: 0,
        billing_provider: "nolo",
        billing_model: "kimi-k2.6",
      },
      agentConfig: {
        provider: "fireworks",
        model: "accounts/fireworks/models/kimi-k2p6",
        id: "agent-user-1",
      },
      userId: "user-1",
      username: "tester",
      agentId: "agent-user-1",
      dialogId: "dialog-1",
      timestamp: 12345,
    });

    expect(prepared.billedProvider).toBe("nolo");
    expect(prepared.billedModel).toBe("kimi-k2.6");
    expect(prepared.recordProvider).toBe("nolo");
    expect(prepared.tokenData).toMatchObject({
      userId: "user-1",
      username: "tester",
      agentId: "agent-user-1",
      cybotId: "agent-user-1",
      model: "kimi-k2.6",
      provider: "nolo",
      dialogId: "dialog-1",
      timestamp: 12345,
    });
  });

  it("prices platform Flash agent by official DeepSeek catalog when usage carries billing fallback metadata", () => {
    // runAgentClientLoop / stream:false path: agent stays nolo+flash (0.03/0.16),
    // but after Ollama 429 the proxy falls back to official DeepSeek and injects
    // billing_provider/model so prepareTokenUsageData → calculatePrice uses 1/2.
    const oneMInOneMOut = {
      prompt_tokens: 1_000_000,
      completion_tokens: 1_000_000,
      total_tokens: 2_000_000,
      prompt_cache_hit_tokens: 0,
      prompt_cache_miss_tokens: 0,
    };
    const platformFlashAgent = {
      provider: "nolo",
      model: "deepseek-v4-flash",
      // Agent snapshot may still carry Ollama list prices from catalog seed.
      inputPrice: 0.03,
      outputPrice: 0.16,
      id: "agent-flash-1",
    };

    const withoutBilling = prepareTokenUsageData({
      rawUsage: oneMInOneMOut,
      agentConfig: platformFlashAgent,
      agentId: "agent-flash-1",
      dialogId: "dialog-1",
      timestamp: Date.UTC(2026, 7, 16, 16), // 2026-08-17 00:00 Beijing, off-peak
    });
    expect(withoutBilling.billedProvider).toBe("nolo");
    expect(withoutBilling.tokenData.cost).toBe(7.2);

    const withOfficialFallbackBilling = prepareTokenUsageData({
      rawUsage: {
        ...oneMInOneMOut,
        billing_provider: "deepseek",
        billing_model: "deepseek-v4-flash",
      },
      agentConfig: platformFlashAgent,
      agentId: "agent-flash-1",
      dialogId: "dialog-1",
      timestamp: Date.UTC(2026, 7, 16, 16), // 2026-08-17 00:00 Beijing, off-peak
    });
    expect(withOfficialFallbackBilling.billedProvider).toBe("deepseek");
    expect(withOfficialFallbackBilling.billedModel).toBe("deepseek-v4-flash");
    expect(withOfficialFallbackBilling.tokenData.cost).toBe(7.2);
    expect(withOfficialFallbackBilling.tokenData.cost).not.toBe(0.21);
    expect(withOfficialFallbackBilling.tokenData).toMatchObject({
      provider: "deepseek",
      model: "deepseek-v4-flash",
      billing_provider: "deepseek",
      billing_model: "deepseek-v4-flash",
    });

    const billedCatalog = findModelConfig(
      "nolo",
      withOfficialFallbackBilling.billedModel,
    )?.price;
    const persisted = createTokenRecord(withOfficialFallbackBilling.tokenData, {
      cost: withOfficialFallbackBilling.tokenData.cost,
      inputPrice: billedCatalog?.input ?? platformFlashAgent.inputPrice,
      outputPrice: billedCatalog?.output ?? platformFlashAgent.outputPrice,
    });
    expect(persisted).toMatchObject({
      provider: "deepseek",
      billing_provider: "deepseek",
      billing_model: "deepseek-v4-flash",
      // DeepSeek 人民币计价，经 CNY_UPSTREAM_MULTIPLIER(1.2) 加价。
      // 注意两者不同源：inputPrice/outputPrice 取 catalog 的 price（= 峰价
      // ¥3→3.6 / ¥9→10.8），cost 则按本用例的谷时段实算（¥1.5→1.8 加
      // ¥4.5→5.4，各 1M tokens 合计 7.2）。这个差异是既有行为，非本次引入。
      inputPrice: 3.6,
      outputPrice: 10.8,
      cost: 7.2,
    });
  });

  it("calculates OpenRouter cost from usage metadata through the shared path", () => {
    const prepared = prepareTokenUsageData({
      rawUsage: {
        input_tokens: 100,
        output_tokens: 20,
        cost: 0.95,
        billing_provider: "openrouter",
        billing_model: "openai/gpt-5.5",
      },
      agentConfig: {
        provider: "openrouter",
        model: "openai/gpt-5.5",
      },
      agentId: "agent-1",
      dialogId: "dialog-1",
      timestamp: 12345,
    });

    expect(prepared.tokenData.cost).toBe(7.6);
    expect(prepared.recordProvider).toBe("openrouter");
    expect(prepared.billedModel).toBe("openai/gpt-5.5");
  });

  it("passes split sharing level through to creator pay distribution", () => {
    const prepared = prepareTokenUsageData({
      rawUsage: {
        input_tokens: 1_000_000,
        output_tokens: 0,
      },
      agentConfig: {
        provider: "custom-provider",
        model: "custom-model",
        id: "agent-pub-test",
        userId: "creator-1",
        inputPrice: 4,
        outputPrice: 0,
        sharingLevel: "split",
      },
      userId: "payer-1",
      username: "tester",
      agentId: "agent-pub-test",
      dialogId: "dialog-1",
      timestamp: 12345,
    });

    expect(prepared.tokenData.cost).toBe(4);
    expect(prepared.tokenData.pay["creator-1"]).toBe(2);
  });

  it("prices OpenAI gpt-5.5 fallback records as standard by default", () => {
    const prepared = prepareTokenUsageData({
      rawUsage: {
        input_tokens: 100_000,
        output_tokens: 1_000_000,
      },
      agentConfig: {
        provider: "openai",
        model: "gpt-5.5",
      },
      agentId: "agent-1",
      dialogId: "dialog-1",
      timestamp: 12345,
    });

    expect(prepared.billedModel).toBe("gpt-5.5");
    expect(prepared.billedServiceTier).toBeUndefined();
    expect(prepared.tokenData.cost).toBe(244);
  });

  it("preserves Google billing service tiers from usage metadata", () => {
    const prepared = prepareTokenUsageData({
      rawUsage: {
        input_tokens: 1_000_000,
        output_tokens: 1_000_000,
        billing_service_tier: "flex",
      },
      agentConfig: {
        provider: "google",
        model: "gemini-3.6-flash",
      },
      agentId: "agent-1",
      dialogId: "dialog-1",
      timestamp: 12345,
    });

    expect(prepared.billedServiceTier).toBe("flex");
    expect(prepared.tokenData.cost).toBe(42);
  });

  it("adds a fallback per-image charge for OpenAI built-in image generation on non-image models", () => {
    const prepared = prepareTokenUsageData({
      rawUsage: {
        input_tokens: 2836,
        output_tokens: 55,
        image_generation_count: 1,
      },
      agentConfig: {
        provider: "openai",
        model: "gpt-5.5",
      },
      agentId: "agent-1",
      dialogId: "dialog-1",
      timestamp: 12345,
    });

    expect(prepared.billedModel).toBe("gpt-5.5");
    // token cost (2836*40 + 55*240)/1e6 + medium 1K image surcharge 0.42384
    expect(prepared.tokenData.cost).toBe(0.55048);
    expect(prepared.tokenData.image_generation_count).toBe(1);
  });

  it("preserves provider audit identifiers on token data", () => {
    const prepared = prepareTokenUsageData({
      rawUsage: {
        input_tokens: 10,
        output_tokens: 20,
        provider_response_ids: ["resp_123", "resp_123", " resp_456 "],
        provider_request_ids: ["req_abc"],
      },
      agentConfig: {
        provider: "openai",
        model: "gpt-5.5",
      },
      agentId: "agent-1",
      dialogId: "dialog-1",
      timestamp: 12345,
    });

    expect(prepared.tokenData.provider_response_ids).toEqual([
      "resp_123",
      "resp_456",
    ]);
    expect(prepared.tokenData.provider_request_ids).toEqual(["req_abc"]);
  });

  it("fails closed when neither agentId nor cybotId is provided", () => {
    expect(() =>
      prepareTokenUsageData({
        rawUsage: { input_tokens: 10, output_tokens: 20 },
        agentConfig: { provider: "openai", model: "gpt-5.5" },
        agentId: "",
        dialogId: "dialog-1",
      })
    ).toThrow(/non-empty agentId or cybotId/);
  });

  it("fails closed when both agentId and cybotId are blank", () => {
    expect(() =>
      prepareTokenUsageData({
        rawUsage: { input_tokens: 10, output_tokens: 20 },
        agentConfig: { provider: "openai", model: "gpt-5.5" },
        agentId: "   ",
        cybotId: "",
        dialogId: "dialog-1",
      })
    ).toThrow(/non-empty agentId or cybotId/);
  });

  it("writes both agentId and cybotId from legacy cybotId-only input", () => {
    const prepared = prepareTokenUsageData({
      rawUsage: { input_tokens: 10, output_tokens: 20 },
      agentConfig: { provider: "openai", model: "gpt-5.5" },
      cybotId: "agent-legacy-1",
      dialogId: "dialog-1",
      timestamp: 12345,
    });

    expect(prepared.tokenData.agentId).toBe("agent-legacy-1");
    expect(prepared.tokenData.cybotId).toBe("agent-legacy-1");
  });

  it("carries cache attribution fields only when provided", () => {
    const withAttribution = prepareTokenUsageData({
      rawUsage: { input_tokens: 10, output_tokens: 20 },
      agentConfig: { provider: "openai", model: "gpt-5.5" },
      agentId: "agent-user-1",
      dialogId: "dialog-1",
      timestamp: 12345,
      stable_prefix_hash: "abc123",
      stable_prefix_estimated_tokens: 4096,
      entry_path: "web-chat",
    });

    expect(withAttribution.tokenData.stable_prefix_hash).toBe("abc123");
    expect(withAttribution.tokenData.stable_prefix_estimated_tokens).toBe(4096);
    expect(withAttribution.tokenData.entry_path).toBe("web-chat");

    const withoutAttribution = prepareTokenUsageData({
      rawUsage: { input_tokens: 10, output_tokens: 20 },
      agentConfig: { provider: "openai", model: "gpt-5.5" },
      agentId: "agent-user-1",
      dialogId: "dialog-1",
      timestamp: 12345,
    });

    expect(withoutAttribution.tokenData).not.toHaveProperty("stable_prefix_hash");
    expect(withoutAttribution.tokenData).not.toHaveProperty(
      "stable_prefix_estimated_tokens"
    );
    expect(withoutAttribution.tokenData).not.toHaveProperty("entry_path");
  });

  it("does not trust server_billed as a billing decision; provider_call_id ledger idempotency owns dedupe", () => {
    // Platform agent that would normally be billable (apiSource=platform,
    // userId set, cost > 0). The chat proxy server already charged this
    // provider call via recordChatProxyTokenUsage, so it stamps
    // server_billed: true + provider_call_id on the usage payload. The client
    // must NOT also deductBalance locally — prepareTokenUsageData forces
    // billable=false so updateTokensAction's deductBalance gate skips.
    const baseUsage = {
      prompt_tokens: 1_000_000,
      completion_tokens: 1_000_000,
      total_tokens: 2_000_000,
      prompt_cache_hit_tokens: 0,
      prompt_cache_miss_tokens: 0,
    };
    const platformAgent = {
      provider: "deepseek",
      model: "deepseek-v4-flash",
      apiSource: "platform",
      id: "agent-user-1",
    };

    // Without server_billed: platform agent with cost > 0 → billable true.
    const withoutServerBilled = prepareTokenUsageData({
      rawUsage: baseUsage,
      agentConfig: platformAgent,
      userId: "user-1",
      username: "tester",
      agentId: "agent-user-1",
      dialogId: "dialog-1",
      timestamp: Date.UTC(2026, 7, 16, 16), // 2026-08-17 00:00 Beijing, off-peak
    });
    expect(withoutServerBilled.tokenData.billable).toBe(true);
    expect(withoutServerBilled.tokenData.cost).toBeGreaterThan(0);

    // Legacy server_billed is audit-only. provider_call_id is carried through
    // so both server/client charge attempts share ledger idempotency.
    const withServerBilled = prepareTokenUsageData({
      rawUsage: {
        ...baseUsage,
        server_billed: true,
        provider_call_id: "call_server_billed_xyz",
      },
      agentConfig: platformAgent,
      userId: "user-1",
      username: "tester",
      agentId: "agent-user-1",
      dialogId: "dialog-1",
      timestamp: 12345,
    });
    expect(withServerBilled.tokenData.billable).toBe(true);
    // cost is still computed (for stats / display), only billable flips.
    expect(withServerBilled.tokenData.cost).toBeGreaterThan(0);
    expect(withServerBilled.tokenData.server_billed).toBe(true);
    expect(withServerBilled.tokenData.provider_call_id).toBe(
      "call_server_billed_xyz"
    );
  });

  it("does not flip billable for a non-billable agent just because server_billed is set (no-op for already-non-billable)", () => {
    // CLI / OAuth subscription agents are already non-billable. server_billed
    // is only meaningful for the chat-proxy platform path; for non-billable
    // agents it is a no-op (billable stays false regardless).
    const prepared = prepareTokenUsageData({
      rawUsage: {
        input_tokens: 10,
        output_tokens: 20,
        server_billed: true,
        provider_call_id: "call_cli_path",
      },
      agentConfig: { provider: "openai", model: "gpt-5.5", apiSource: "cli" },
      agentId: "agent-user-1",
      dialogId: "dialog-1",
      timestamp: 12345,
    });
    expect(prepared.tokenData.billable).toBe(false);
  });
});
