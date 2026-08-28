import { describe, expect, it } from "bun:test";

import { resolveAgentImageInputSupport } from "./agentCapabilities";

describe("resolveAgentImageInputSupport", () => {
  it("allows custom server-proxy agents with known vision model to receive images even when stale hasVision is false", () => {
    expect(
      resolveAgentImageInputSupport({
        apiSource: "custom",
        provider: "custom",
        model: "kimi-k2.6",
        useServerProxy: true,
        hasVision: false,
      }),
    ).toBe(true);

    expect(
      resolveAgentImageInputSupport({
        apiSource: "custom",
        provider: "custom",
        model: "anthropic/claude-sonnet-5",
        useServerProxy: true,
        hasVision: false,
      }),
    ).toBe(true);
  });

  it("correctly marks custom agents with non-vision catalog models as false", () => {
    // Custom/自建 agent 配了已知非视觉模型（如 glm-5.2、deepseek-v4-flash、mimo-v2.5-pro），
    // catalog 明确为 hasVision: false 时必须返回 false，触发视觉预处理或降级，而不是直接发裸图导致 400
    expect(
      resolveAgentImageInputSupport({
        apiSource: "custom",
        provider: "custom",
        model: "glm-5.2",
      }),
    ).toBe(false);

    expect(
      resolveAgentImageInputSupport({
        apiSource: "custom",
        provider: "opencode-go",
        model: "glm-5.2",
      }),
    ).toBe(false);

    expect(
      resolveAgentImageInputSupport({
        apiSource: "custom",
        provider: "opencode-go",
        model: "mimo-v2.5-pro",
      }),
    ).toBe(false);
  });

  it("respects explicit hasVision boolean on unknown custom models", () => {
    expect(
      resolveAgentImageInputSupport({
        apiSource: "custom",
        model: "unknown-text-only-model",
        hasVision: false,
      }),
    ).toBe(false);

    expect(
      resolveAgentImageInputSupport({
        apiSource: "custom",
        model: "unknown-vision-model",
        hasVision: true,
      }),
    ).toBe(true);
  });

  it("defaults unknown models without explicit hasVision to true", () => {
    expect(
      resolveAgentImageInputSupport({
        apiSource: "custom",
        model: "totally-unknown-model-xyz",
      }),
    ).toBe(true);
  });

  it("keeps known first-party non-vision models blocked", () => {
    expect(
      resolveAgentImageInputSupport({
        provider: "deepseek",
        model: "deepseek-v4-flash",
        hasVision: true,
      }),
    ).toBe(false);
  });

  it("uses the model registry over stale agent records for known vision models", () => {
    expect(
      resolveAgentImageInputSupport({
        provider: "nolo",
        model: "kimi-k2.6",
        hasVision: false,
      }),
    ).toBe(true);
  });

  it("resolves Token Plan qwen3.8-max from catalog even without apiSource", () => {
    // 旧 Qwen Token Plan agent：apiSource 缺失、provider="qwen"、hasVision 存的是 false。
    // qwen3.8-max 已并入 qwen 能力目录，应按目录判支持，而不是回退到存的 false
    // （否则 CLI 会误切到 Kimi K2.6、chat 会拦截图片）。
    expect(
      resolveAgentImageInputSupport({
        provider: "qwen",
        model: "qwen3.8-max",
        hasVision: false,
      }),
    ).toBe(true);
  });

  it("strips -preview suffix so legacy qwen3.8-max-preview agents still resolve vision", () => {
    // F1 回归保护：正式版上线后，存量 DB 里仍存旧 id "qwen3.8-max-preview" + hasVision:false。
    // catalog 已不含 preview 条目，直接查会 miss → 回退到存的 false → 被判无视觉。
    // stripPreviewSuffix 把 -preview 去掉后再查 catalog，命中 qwen3.8-max 的 hasVision:true。
    expect(
      resolveAgentImageInputSupport({
        provider: "qwen",
        model: "qwen3.8-max-preview",
        hasVision: false,
      }),
    ).toBe(true);
  });

  it("recognizes Gemini 3.7 Flash and its Antigravity tiered aliases as vision-capable", () => {
    for (const model of ["gemini-3.7-flash", "gemini-3.7-flash-medium", "gemini-3.7-flash-tiered"]) {
      expect(resolveAgentImageInputSupport({ provider: "google", model })).toBe(true);
    }
  });

  it("folds antigravity effort suffix so gemini-3.6-flash-high is treated as vision", () => {
    // agy-flash 等 dispatch agent 存的是带 effort 后缀的 wire id（gemini-3.6-flash-high），
    // catalog 只收基础名 gemini-3.6-flash（hasVision:true）。精确匹配会漏判为无 vision，
    // 导致 TUI 把图片强切到 Kimi K2.6。能力检测应折叠后缀后再查 catalog。
    expect(
      resolveAgentImageInputSupport({
        provider: "google",
        model: "gemini-3.6-flash-high",
        hasVision: false,
      }),
    ).toBe(true);
  });

  it("folds -medium/-low/-extra-low effort suffixes too", () => {
    expect(
      resolveAgentImageInputSupport({
        provider: "google",
        model: "gemini-3.6-flash-medium",
      }),
    ).toBe(true);
    expect(
      resolveAgentImageInputSupport({
        provider: "google",
        model: "gemini-3.6-flash-low",
      }),
    ).toBe(true);
    expect(
      resolveAgentImageInputSupport({
        provider: "google",
        model: "gemini-3.5-flash-extra-low",
      }),
    ).toBe(true);
  });

  it("recognizes GLM 5.3 and GLM 5.3 Flash (including alias variations) as vision-capable", () => {
    // 平台托管 GLM 5.3 / GLM 5.3 Flash（即使历史记录带 stale hasVision: false）
    expect(
      resolveAgentImageInputSupport({
        provider: "nolo",
        model: "glm-5-3-flash",
        hasVision: false,
      }),
    ).toBe(true);

    expect(
      resolveAgentImageInputSupport({
        provider: "nolo",
        model: "glm-5.3-flash",
        hasVision: false,
      }),
    ).toBe(true);

    expect(
      resolveAgentImageInputSupport({
        provider: "nolo",
        model: "glm-5.3",
        hasVision: false,
      }),
    ).toBe(true);

    // Z.AI / 外部订阅下的 GLM 5.3 Flash 与 GLM 5.3
    expect(
      resolveAgentImageInputSupport({
        provider: "zai",
        model: "glm-5.3-flash",
      }),
    ).toBe(true);

    expect(
      resolveAgentImageInputSupport({
        provider: "zai",
        model: "glm-5.3",
      }),
    ).toBe(true);
  });
});
