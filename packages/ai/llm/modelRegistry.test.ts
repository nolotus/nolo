import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

import { cloudflareModels, CF_GLM_5_2_MODEL } from "./cloudflare";
import { gmiModels, GMI_GLM_5_2_MODEL } from "./gmi";
import { deepinfraModels } from "./deepinfra";
import { fireworksModels } from "./fireworks";
import { ALL_MODELS } from "./models";
import { openrouterModels } from "./openrouterModels";
import { zaiModels, ZAI_GLM_5_2_MODEL } from "./zai";
import { getModelContextWindow, getModelInfo, DEFAULT_CONTEXT_WINDOW } from "./getModelContextWindow";
import { getModelAbility } from "./modelAbility";

describe("model registry", () => {
  it("resolves context windows accurately across providers, display names, ids, and fuzzy fallback", () => {
    // 全量表：显示名与 id 双键精确命中数据文件（qwen3.8 已修正为 1M，非旧 256k）。
    expect(getModelContextWindow("Qwen3.8 Max")).toBe(1_000_000);
    expect(getModelContextWindow("qwen3.8-max")).toBe(1_000_000);
    // 旧 preview id 已不在精确表，但 fuzzy(qwen3.8) 仍兜底命中 1M——
    // 保障已存 agent 记录里的旧 id 不至于落到默认 256k。
    expect(getModelContextWindow("qwen3.8-max-preview")).toBe(1_000_000);
    expect(getModelContextWindow("Qwen3.6 Flash")).toBe(262_144);
    expect(getModelContextWindow("Qwen3 Coder Plus")).toBe(1_048_576);
    expect(getModelContextWindow("Qwen Long")).toBe(10_485_760);
    expect(getModelContextWindow("Kimi K3")).toBe(1_000_000);
    expect(getModelContextWindow("Kimi K2.6")).toBe(262_144);
    expect(getModelContextWindow("GLM 5.2")).toBe(1_000_000);
    expect(getModelContextWindow("DeepSeek V4 Flash")).toBe(1_000_000);
    // 数据表外：fuzzy 兜底（minimax 不在任何模型表；claude 别名 id 走 fuzzy）。
    expect(getModelContextWindow("MiniMax-M3")).toBe(1_000_000);
    expect(getModelContextWindow("claude-sonnet-4.5")).toBe(200_000);
    // Cursor OAuth 模型（cursor-oauth preset）：Grok 4.5 / Claude 4.6 / Gemini 3.1 Pro 均 1M 级；
    // claude-4.6-* 必须命中 cursor 规则而非通用 claude → 200k。
    expect(getModelContextWindow("cursor-grok-4.5-high")).toBe(1_000_000);
    expect(getModelContextWindow("cursor-grok-4.5-high-fast")).toBe(1_000_000);
    expect(getModelContextWindow("claude-4.6-sonnet-medium")).toBe(1_000_000);
    expect(getModelContextWindow("claude-4.6-opus-high")).toBe(1_000_000);
    expect(getModelContextWindow("gemini-3.1-pro")).toBe(1_000_000);
    expect(getModelContextWindow("cursor-gemini-3.1-pro")).toBe(1_000_000);
    // AGY Flash / Gemini 3.6 Flash 及其 effort wire 后缀（如 -high/-medium/-low）：必须正确识别为 1M 上下文（1,048,576）。
    expect(getModelContextWindow("gemini-3.6-flash")).toBe(1_048_576);
    expect(getModelContextWindow("gemini-3.6-flash-high")).toBe(1_048_576);
    expect(getModelContextWindow("gemini-3.6-flash-medium")).toBe(1_048_576);
    expect(getModelContextWindow("gemini-3.6-flash-low")).toBe(1_048_576);
    expect(getModelContextWindow("gemini-3.7-flash")).toBe(1_048_576);
    expect(getModelContextWindow("gemini-3.7-flash-medium")).toBe(1_048_576);
    expect(getModelContextWindow("gemini-3.7-flash-tiered")).toBe(1_048_576);
    expect(getModelContextWindow("gemini-3.5-flash")).toBe(1_048_576);
    // Composer 2.5 未公布固定窗口，保持默认 256k。
    expect(getModelContextWindow("composer-2.5")).toBe(256_000);
    expect(getModelContextWindow("composer-2.5-fast")).toBe(256_000);
    // 完全未知：默认兜底。
    expect(getModelContextWindow("totally-unknown-model-xyz")).toBe(DEFAULT_CONTEXT_WINDOW);
  });

  it("keeps getModelInfo on the legacy ALL_MODELS map so image-output fallback is unchanged", () => {
    // 双 map 不变量：getModelInfo 必须对未进 ALL_MODELS 的 qwen/moonshot/anthropic 模型
    // 返回 null，以保 supportsImageGeneration 等下游兜底分支。若后人把 getModelInfo 切到
    // 全量表，此断言失败。
    expect(getModelInfo("qwen3-max")).toBeNull();
    expect(getModelInfo("Qwen3 Max")).toBeNull();
    // 对照：ALL_MODELS 内的模型仍非 null，证明 legacy map 本身工作正常（非整体失效）。
    expect(getModelInfo("deepseek-v4-flash")).not.toBeNull();
  });

  it("keeps the OpenRouter catalog empty (grok-4.3 and minimax-m3 removed)", () => {
    expect(openrouterModels).toEqual([]);
  });

  it("includes the current Fireworks serverless models without Kimi/GLM", () => {
    expect(fireworksModels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "accounts/fireworks/models/minimax-m3",
          displayName: "MiniMax: MiniMax M3",
          hasVision: true,
          contextWindow: 512000,
          supportsTool: true,
          price: expect.objectContaining({
            input: 0.3 * 8,
            output: 1.2 * 8,
            cachingRead: 0.06 * 8,
          }),
        }),
      ])
    );
    expect(
      fireworksModels.some((m) => m.name.toLowerCase().includes("kimi"))
    ).toBe(false);
    expect(
      fireworksModels.some((m) => m.name.toLowerCase().includes("glm"))
    ).toBe(false);
  });

  it("keeps GMI/Z.AI/Cloudflare GLM catalogs empty (platform GLM is nolo only)", () => {
    expect(gmiModels).toEqual([]);
    expect(zaiModels).toEqual([]);
    expect(cloudflareModels).toEqual([]);
  });

  it("keeps DeepInfra Claude models without Kimi/GLM", () => {
    expect(deepinfraModels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "anthropic/claude-haiku-4-5",
          displayName: "Anthropic: Claude Haiku 4.5",
          hasVision: true,
          contextWindow: 195000,
          supportsTool: false,
          price: expect.objectContaining({
            input: 1 * 9,
            output: 5 * 9,
          }),
        }),
        expect.objectContaining({
          name: "anthropic/claude-sonnet-5",
          displayName: "Anthropic: Claude Sonnet 5",
          hasVision: true,
          contextWindow: 976000,
          supportsTool: false,
          price: expect.objectContaining({
            input: 3 * 9,
            output: 15 * 9,
          }),
        }),
        expect.objectContaining({
          name: "anthropic/claude-opus-4-8",
          displayName: "Anthropic: Claude Opus 4.8",
          hasVision: true,
          contextWindow: 976000,
          supportsTool: false,
          price: expect.objectContaining({
            input: 5 * 9,
            output: 25 * 9,
          }),
        }),
      ])
    );
    expect(
      deepinfraModels.some((m) => m.name.toLowerCase().includes("kimi"))
    ).toBe(false);
    expect(
      deepinfraModels.some((m) => m.name.toLowerCase().includes("glm"))
    ).toBe(false);
  });

  it("surfaces platform nolo Kimi + GLM and DeepInfra Claude in ALL_MODELS", () => {
    expect(ALL_MODELS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider: "nolo",
          name: "kimi-k3",
        }),
        expect.objectContaining({
          provider: "nolo",
          name: "deepseek-v4-flash",
        }),
        expect.objectContaining({
          provider: "deepinfra",
          name: "anthropic/claude-haiku-4-5",
        }),
        expect.objectContaining({
          provider: "deepinfra",
          name: "anthropic/claude-sonnet-5",
        }),
        expect.objectContaining({
          provider: "deepinfra",
          name: "anthropic/claude-opus-4-8",
        }),
      ])
    );
    expect(
      ALL_MODELS.some(
        (m) => m.provider === "fireworks" && String(m.name).includes("glm")
      )
    ).toBe(false);
    expect(
      ALL_MODELS.some(
        (m) => m.provider === "deepinfra" && String(m.name).includes("GLM")
      )
    ).toBe(false);
  });

  it("does not register Anthropic Claude models through OpenRouter", () => {
    const openRouterClaudeModels = openrouterModels.filter((model) => {
      const id = String((model as any).id ?? model.name).toLowerCase();
      const provider = model.provider?.toLowerCase();
      const name = model.name.toLowerCase();
      return (
        provider === "anthropic" ||
        id.startsWith("anthropic/") ||
        id.includes("claude") ||
        name.includes("claude")
      );
    });

    expect(openRouterClaudeModels).toEqual([]);
    expect(
      ALL_MODELS.filter(
        (model) =>
          model.provider === "openrouter" &&
          (model.name.toLowerCase().includes("claude") ||
            model.name.toLowerCase().startsWith("anthropic/"))
      )
    ).toEqual([]);
  });

  it("does not register retired Chinese fallback models through OpenRouter", () => {
    const chineseOpenRouterModels = openrouterModels.filter((model: any) => {
      const searchable = [
        model.id,
        model.name,
        model.displayName,
        model.provider,
        model.group,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return /\b(moonshot|kimi|xiaomi|mimo|deepseek|z-ai|zai|glm)\b/.test(
        searchable
      );
    });

    expect(chineseOpenRouterModels).toEqual([]);
  });

  it("recognizes local Qwen 3.6 GGUF model context windows", () => {
    const source = readFileSync(
      new URL("./getModelContextWindow.ts", import.meta.url),
      "utf8"
    );
    expect(source).toContain("const QWEN_3_6_CONTEXT_WINDOW = 262_144");
    expect(source).toContain('normalizedName.includes("qwen3.6")');
  });

  it("recognizes GLM 5.2 and its naming variants", () => {
    const source = readFileSync(
      new URL("./getModelContextWindow.ts", import.meta.url),
      "utf8"
    );
    expect(source).toContain("const GLM_5_2_CONTEXT_WINDOW = 1_000_000");
    expect(source).toContain('normalizedName.includes("glm-5.2")');
  });

  it("does not register Google or Gemini models through OpenRouter", () => {
    const googleOpenRouterModels = openrouterModels.filter((model: any) => {
      const searchable = [
        model.id,
        model.name,
        model.displayName,
        model.provider,
        model.group,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return searchable.includes("google") || searchable.includes("gemini");
    });

    expect(googleOpenRouterModels).toEqual([]);
  });

  it("no longer registers the Xiaomi MiMo provider (removed from product)", () => {
    // The mimo module was deleted; no model should carry the "mimo" provider.
    expect(ALL_MODELS.some((model) => model.provider === "mimo")).toBe(false);
  });

  it("does not register pricing models removed from the public catalog", () => {
    const removedOpenRouterNames = [
      "Claude 3 Opus",
      "Claude 3.5 Sonnet",
      "Gemini 1.5 Pro",
      "Gemini 1.5 Flash",
      "Gemini 2.0 Flash Thinking",
      "Gemini 2.0 Flash",
      "o3-mini-high",
      "o3-mini",
      "o1-mini",
      "GPT-4o",
      "GPT-4o Mini",
      "GPT-4 Turbo",
      "Grok 3 Beta",
      "Grok 3 Fast Beta",
      "Grok 2 Vision",
      "Llama 4 Scout",
      "Llama 4 Maverick",
      "Llama 3.3 70B",
      "Llama 3.2 90B Vision",
      "Llama 3.1 405B",
      "Nemotron Ultra 253B",
      "Nemotron Super 49B",
      "Phi-4 Multimodal",
      "Command A",
      "DeepSeek R1",
      "DeepSeek V3",
      "DeepSeek Chat V3-0324",
      "Mistral Large 2",
      "Pixtral Large",
      "Mistral Small 3",
      "Qwen QwQ 32B",
      "Qwen 2.5 VL 72B",
      "Qwen 2.5 72B",
    ];
    const removedFireworksNames = [
      "MoonshotAI: Kimi K2.5",
      "MiniMax: MiniMax M2.5",
      "MiniMax: MiniMax M2.7",
      "Qwen: Qwen 3.6 Plus",
    ];
    const removedRegistryNames = [
      "devstral-2512",
      "accounts/fireworks/models/minimax-m2p7",
      "moonshotai/Kimi-K2.5",
      "accounts/fireworks/models/qwen3p6-plus",
      "o3-pro",
    ];
    const registeredDisplayNames = ALL_MODELS.map(
      (model) => model.displayName ?? model.name
    );
    const registeredNames = ALL_MODELS.map((model) => model.name);

    for (const modelName of removedOpenRouterNames) {
      expect(openrouterModels.find((model) => model.name === modelName)).toBeUndefined();
      expect(registeredDisplayNames).not.toContain(modelName);
    }

    for (const modelName of removedFireworksNames) {
      expect(fireworksModels.find((model) => (model.displayName ?? model.name) === modelName)).toBeUndefined();
      expect(registeredDisplayNames).not.toContain(modelName);
    }

    for (const modelName of removedRegistryNames) {
      expect(registeredNames).not.toContain(modelName);
    }

    expect(registeredDisplayNames).toEqual(
      expect.not.arrayContaining([
        "Claude Opus 4.7",
        "Claude Opus 4.6",
        "Claude Sonnet 4.6",
        "Claude Haiku 4.6",
      ])
    );
  });
});
