import { describe, expect, test } from "bun:test";

import { anthropicOAuthModels, isAdaptiveThinkingModelId } from "./anthropicOAuthModels";
import { getModelContextWindow } from "ai/llm/getModelContextWindow";

describe("anthropic OAuth model table", () => {
  test("contains exactly the 10 models returned by GET /v1/models", () => {
    const ids = anthropicOAuthModels.map((m) => m.name).sort();
    expect(ids).toEqual(
      [
        "claude-fable-5",
        "claude-opus-5",
        "claude-sonnet-5",
        "claude-opus-4-8",
        "claude-opus-4-7",
        "claude-sonnet-4-6",
        "claude-opus-4-6",
        "claude-opus-4-5-20251101",
        "claude-sonnet-4-5-20250929",
        "claude-haiku-4-5-20251001",
      ].sort(),
    );
  });

  test("context windows match official docs (haiku-4-5 = 200k, others 1M)", () => {
    const byId = Object.fromEntries(anthropicOAuthModels.map((m) => [m.name, m.contextWindow]));
    expect(byId["claude-haiku-4-5-20251001"]).toBe(200_000);
    for (const id of [
      "claude-fable-5",
      "claude-opus-5",
      "claude-sonnet-5",
      "claude-opus-4-8",
      "claude-opus-4-7",
      "claude-sonnet-4-6",
      "claude-opus-4-6",
      "claude-opus-4-5-20251101",
      "claude-sonnet-4-5-20250929",
    ]) {
      expect(byId[id], id).toBe(1_000_000);
    }
  });

  test("OAuth models are priced 0 (subscription, not metered)", () => {
    for (const m of anthropicOAuthModels) {
      expect(m.price.input, m.name).toBe(0);
      expect(m.price.output, m.name).toBe(0);
    }
  });

  test("thinkingMode matches official docs (adaptive for 5-gen & 4.6+, extended for 4.5-)", () => {
    for (const id of [
      "claude-fable-5",
      "claude-opus-5",
      "claude-sonnet-5",
      "claude-opus-4-8",
      "claude-opus-4-7",
      "claude-sonnet-4-6",
      "claude-opus-4-6",
    ]) {
      expect(isAdaptiveThinkingModelId(id), id).toBe(true);
    }
    for (const id of [
      "claude-opus-4-5-20251101",
      "claude-sonnet-4-5-20250929",
      "claude-haiku-4-5-20251001",
    ]) {
      expect(isAdaptiveThinkingModelId(id), id).toBe(false);
    }
  });

  test("isAdaptiveThinkingModelId falls back to id substring for unknown models", () => {
    // 未入表的新模型：子串 fallback（与旧 provider 行为一致）
    expect(isAdaptiveThinkingModelId("claude-sonnet-5-pro")).toBe(true);
    expect(isAdaptiveThinkingModelId("claude-opus-4-9")).toBe(false);
    expect(isAdaptiveThinkingModelId(undefined)).toBe(false);
  });
});

describe("getModelContextWindow resolves OAuth models from the table", () => {
  test("claude-sonnet-5 hits the OAuth table (1M) instead of the 200k fuzzy fallback", () => {
    expect(getModelContextWindow("claude-sonnet-5")).toBe(1_000_000);
  });

  test("claude-haiku-4-5-20251001 resolves to official 200k", () => {
    expect(getModelContextWindow("claude-haiku-4-5-20251001")).toBe(200_000);
  });

  test("claude-sonnet-4-6 resolves to 1M", () => {
    expect(getModelContextWindow("claude-sonnet-4-6")).toBe(1_000_000);
  });

  test("claude-opus-5 resolves to 1M", () => {
    expect(getModelContextWindow("claude-opus-5")).toBe(1_000_000);
  });

  test("legacy API-table model still resolves via the API table (200k)", () => {
    // claude-3-7-sonnet-latest 仍在 anthropicModels（API 表）
    expect(getModelContextWindow("claude-3-7-sonnet-latest")).toBe(200_000);
  });
});
