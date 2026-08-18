import { describe, expect, it } from "bun:test";
import { buildForkAgentFormData } from "./forkAgent";

const basePublicAgent = {
  allowFork: true,
  apiSource: "platform",
  name: "翻译助手",
  prompt: "你是一个翻译助手",
  provider: "openai",
  model: "gpt-4o-mini",
  introduction: "中英互译",
  greeting: "你好，我可以帮你翻译",
  tools: ["search", "calc"],
  hasVision: true,
  hasImageOutput: false,
  imageModel: undefined,
  imageConfig: undefined,
  imageWorkflow: "generate",
  defaultInteractionMode: "text",
  enableThinking: false,
  tags: ["翻译", "语言"],
  inputPrice: 0,
  outputPrice: 0,
};

describe("buildForkAgentFormData", () => {
  it("returns null when allowFork is missing", () => {
    const source = { ...basePublicAgent, allowFork: undefined };
    expect(buildForkAgentFormData(source)).toBeNull();
  });

  it("returns null when allowFork is false", () => {
    const source = { ...basePublicAgent, allowFork: false };
    expect(buildForkAgentFormData(source)).toBeNull();
  });

  it("returns null when apiSource is custom even if allowFork is true", () => {
    const source = { ...basePublicAgent, apiSource: "custom" };
    expect(buildForkAgentFormData(source)).toBeNull();
  });

  it("returns null when apiSource is cli even if allowFork is true", () => {
    const source = { ...basePublicAgent, apiSource: "cli" };
    expect(buildForkAgentFormData(source)).toBeNull();
  });

  it("builds a private, non-forkable fork with safe defaults", () => {
    const source = {
      ...basePublicAgent,
      isPublic: true,
      whitelist: ["someone@example.com"],
      references: [{ dbKey: "private/doc:author", title: "secret", type: "knowledge" }],
      apiKey: "sk-author-secret",
      apiKeyRef: "chatgpt",
      apiKeyHeader: "x-api-key",
      customProviderUrl: "https://author-only.example.com",
      cliProvider: "codex",
      machineId: "author-machine",
      inputPrice: 3.5,
      outputPrice: 15,
    };
    const formData = buildForkAgentFormData(source);
    expect(formData).not.toBeNull();
    expect(formData!.isPublic).toBe(false);
    expect(formData!.allowFork).toBe(false);
    expect(formData!.whitelist).toEqual([]);
    expect(formData!.references).toEqual([]);
    expect(formData!.inputPrice).toBe(0);
    expect(formData!.outputPrice).toBe(0);
    // 凭证类字段必须被清空，绝不复制作者的密钥/引用
    expect(formData!.apiKey).toBe("");
    expect(formData!.apiKeyRef).toBe("");
    expect(formData!.apiKeyHeader).toBe("");
    expect(formData!.customProviderUrl).toBe("");
    expect(formData!.cliProvider).toBe("");
    expect(formData!.machineId).toBe("");
    // 能力字段被复制
    expect(formData!.prompt).toBe("你是一个翻译助手");
    expect(formData!.provider).toBe("openai");
    expect(formData!.model).toBe("gpt-4o-mini");
    expect(formData!.hasVision).toBe(true);
    expect(formData!.tools).toEqual(["search", "calc"]);
  });

  it("appends 副本 suffix and keeps name ≤ 50 chars", () => {
    const source = {
      ...basePublicAgent,
      name: "一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十",
    };
    const formData = buildForkAgentFormData(source);
    expect(formData).not.toBeNull();
    expect(formData!.name.endsWith("副本")).toBe(true);
    expect(formData!.name.length).toBeLessThanOrEqual(50);
  });

  it("falls back to 新 AI when source has no name", () => {
    const source = { ...basePublicAgent, name: undefined };
    const formData = buildForkAgentFormData(source);
    expect(formData).not.toBeNull();
    expect(formData!.name).toBe("新 AI");
  });

  it("omits temperature key when source has no temperature", () => {
    const source = { ...basePublicAgent, temperature: undefined };
    const formData = buildForkAgentFormData(source);
    expect(formData).not.toBeNull();
    expect("temperature" in formData!).toBe(false);
  });

  it("includes temperature key when source defines it", () => {
    const source = { ...basePublicAgent, temperature: 0.7 };
    const formData = buildForkAgentFormData(source);
    expect(formData).not.toBeNull();
    expect(formData!.temperature).toBe(0.7);
  });

  it("converts array tags to comma-separated string", () => {
    const source = { ...basePublicAgent, tags: ["翻译", "语言", "  "] };
    const formData = buildForkAgentFormData(source);
    expect(formData).not.toBeNull();
    expect(typeof formData!.tags).toBe("string");
    expect(formData!.tags).toBe("翻译,语言");
  });

  it("keeps string tags as-is (trimmed)", () => {
    const source = { ...basePublicAgent, tags: "  翻译, 语言  " };
    const formData = buildForkAgentFormData(source);
    expect(formData).not.toBeNull();
    expect(formData!.tags).toBe("翻译, 语言");
  });
});