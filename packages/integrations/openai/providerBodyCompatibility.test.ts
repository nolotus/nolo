import { describe, expect, it } from "bun:test";

import {
  FIREWORKS_KIMI_CURRENT_MODEL,
  PLATFORM_HOSTED_KIMI_K3_MODEL,
  PLATFORM_HOSTED_KIMI_K26_MODEL,
} from "ai/llm/kimi";
import { normalizeChatCompletionsBodyForProvider } from "./providerBodyCompatibility";

describe("normalizeChatCompletionsBodyForProvider", () => {
  it("removes Fireworks Kimi reasoning fields while preserving the thinking toggle", () => {
    const body = {
      model: "moonshotai/Kimi-K2.6",
      messages: [{ role: "user", content: "hi" }],
      thinking: { type: "disabled" },
      reasoning_effort: "none",
      reasoning: { enabled: false },
      tool_choice: "auto",
    };

    const normalized = normalizeChatCompletionsBodyForProvider({
      body,
      provider: "fireworks",
      model: FIREWORKS_KIMI_CURRENT_MODEL,
    });

    expect(normalized).toEqual({
      model: FIREWORKS_KIMI_CURRENT_MODEL,
      messages: [{ role: "user", content: "hi" }],
      thinking: { type: "disabled" },
      tool_choice: "auto",
    });
    expect(body.reasoning_effort).toBe("none");
    expect(body.reasoning).toEqual({ enabled: false });
  });

  it("keeps DeepInfra Kimi reasoning fields intact", () => {
    const body = {
      model: FIREWORKS_KIMI_CURRENT_MODEL,
      messages: [{ role: "user", content: "hi" }],
      thinking: { type: "disabled" },
      reasoning_effort: "none",
      reasoning: { enabled: false },
    };

    expect(
      normalizeChatCompletionsBodyForProvider({
        body,
        provider: "deepinfra",
        model: "moonshotai/Kimi-K2.6",
      }),
    ).toEqual({
      model: "moonshotai/Kimi-K2.6",
      messages: [{ role: "user", content: "hi" }],
      thinking: { type: "disabled" },
      reasoning_effort: "none",
      reasoning: { enabled: false },
    });
  });

  it("strips sampling params and maps max_tokens for Moonshot kimi-k3", () => {
    const body = {
      model: "kimi-k3",
      messages: [{ role: "user", content: "hi" }],
      temperature: 0.7,
      top_p: 0.9,
      frequency_penalty: 0.5,
      presence_penalty: 0.3,
      max_tokens: 4096,
      tool_choice: "auto",
    };

    const normalized = normalizeChatCompletionsBodyForProvider({
      body,
      provider: "moonshot",
      model: "kimi-k3",
    });

    expect(normalized).toEqual({
      model: "kimi-k3",
      messages: [{ role: "user", content: "hi" }],
      max_completion_tokens: 4096,
      tool_choice: "auto",
    });
    expect(normalized).not.toHaveProperty("temperature");
    expect(normalized).not.toHaveProperty("top_p");
    expect(normalized).not.toHaveProperty("frequency_penalty");
    expect(normalized).not.toHaveProperty("presence_penalty");
    expect(normalized).not.toHaveProperty("max_tokens");
    // 归一化不改入参。
    expect(body.max_tokens).toBe(4096);
    expect(body.temperature).toBe(0.7);
  });

  it("does not invent max_completion_tokens when kimi-k3 body has no max_tokens", () => {
    const normalized = normalizeChatCompletionsBodyForProvider({
      body: {
        model: "kimi-k3",
        messages: [{ role: "user", content: "hi" }],
        temperature: 1,
      },
      provider: "moonshot",
      model: "kimi-k3",
    });

    expect(normalized).toEqual({
      model: "kimi-k3",
      messages: [{ role: "user", content: "hi" }],
    });
    expect(normalized).not.toHaveProperty("max_completion_tokens");
    expect(normalized).not.toHaveProperty("max_tokens");
    expect(normalized).not.toHaveProperty("temperature");
  });

  it("leaves non-Kimi bodies untouched", () => {
    const body = {
      model: "gpt-4o",
      messages: [{ role: "user", content: "hi" }],
      temperature: 0.7,
      top_p: 0.9,
      frequency_penalty: 0.5,
      presence_penalty: 0.3,
      max_tokens: 4096,
    };

    expect(
      normalizeChatCompletionsBodyForProvider({
        body,
        provider: "openai",
        model: "gpt-4o",
      }),
    ).toEqual({
      model: "gpt-4o",
      messages: [{ role: "user", content: "hi" }],
      temperature: 0.7,
      top_p: 0.9,
      frequency_penalty: 0.5,
      presence_penalty: 0.3,
      max_tokens: 4096,
    });
  });

  it("keeps sampling params for Moonshot non-kimi-k3 models", () => {
    const body = {
      model: "kimi-k2.6",
      messages: [{ role: "user", content: "hi" }],
      temperature: 0.6,
      max_tokens: 1024,
    };

    expect(
      normalizeChatCompletionsBodyForProvider({
        body,
        provider: "moonshot",
        model: "kimi-k2.6",
      }),
    ).toEqual({
      model: "kimi-k2.6",
      messages: [{ role: "user", content: "hi" }],
      temperature: 0.6,
      max_tokens: 1024,
    });
  });

  it("applies the K3 quirk to platform-hosted nolo requests (upstream crof)", () => {
    // 线上事故复现：平台托管路径 provider 是 "nolo" 而非 "moonshot"，
    // 判据只认 "moonshot" 时 quirk 完全不触发 → 不合规 body → 上游中途断流。
    const body = {
      model: PLATFORM_HOSTED_KIMI_K3_MODEL,
      messages: [{ role: "user", content: "hi" }],
      temperature: 0.7,
      top_p: 0.9,
      frequency_penalty: 0.5,
      presence_penalty: 0.3,
      max_tokens: 4096,
      tool_choice: "auto",
    };

    const normalized = normalizeChatCompletionsBodyForProvider({
      body,
      provider: "nolo",
      model: PLATFORM_HOSTED_KIMI_K3_MODEL,
    });

    expect(normalized).toEqual({
      model: PLATFORM_HOSTED_KIMI_K3_MODEL,
      messages: [{ role: "user", content: "hi" }],
      max_completion_tokens: 4096,
      tool_choice: "auto",
    });
    expect(normalized).not.toHaveProperty("temperature");
    expect(normalized).not.toHaveProperty("top_p");
    expect(normalized).not.toHaveProperty("frequency_penalty");
    expect(normalized).not.toHaveProperty("presence_penalty");
    expect(normalized).not.toHaveProperty("max_tokens");
  });

  it("applies the K3 quirk to legacy ollama-cloud hosted records", () => {
    const normalized = normalizeChatCompletionsBodyForProvider({
      body: {
        model: PLATFORM_HOSTED_KIMI_K3_MODEL,
        messages: [{ role: "user", content: "hi" }],
        temperature: 0.7,
        max_tokens: 2048,
      },
      provider: "ollama-cloud",
      model: PLATFORM_HOSTED_KIMI_K3_MODEL,
    });

    expect(normalized.max_completion_tokens).toBe(2048);
    expect(normalized).not.toHaveProperty("max_tokens");
    expect(normalized).not.toHaveProperty("temperature");
  });

  it("keeps sampling params for platform-hosted non-K3 models", () => {
    const body = {
      model: PLATFORM_HOSTED_KIMI_K26_MODEL,
      messages: [{ role: "user", content: "hi" }],
      temperature: 0.6,
      max_tokens: 1024,
    };

    expect(
      normalizeChatCompletionsBodyForProvider({
        body,
        provider: "nolo",
        model: PLATFORM_HOSTED_KIMI_K26_MODEL,
      }),
    ).toEqual({
      model: PLATFORM_HOSTED_KIMI_K26_MODEL,
      messages: [{ role: "user", content: "hi" }],
      temperature: 0.6,
      max_tokens: 1024,
    });
  });
});
