import { describe, expect, it } from "bun:test";
import {
  applyModelLayerOverride,
  buildModelLayerOverride,
  mergeReferences,
} from "./modelLayerOverride";

describe("buildModelLayerOverride", () => {
  it("returns null when provider or model is missing/empty", () => {
    expect(buildModelLayerOverride({ model: "m" })).toBeNull();
    expect(buildModelLayerOverride({ provider: "p", model: " " })).toBeNull();
    expect(buildModelLayerOverride(null)).toBeNull();
    expect(buildModelLayerOverride(undefined)).toBeNull();
  });

  it("picks only model-layer fields, never prompt/tools", () => {
    const override = buildModelLayerOverride({
      provider: "openai",
      model: "gpt-5.5",
      apiSource: "custom",
      apiKey: "sk-test",
      temperature: 0.3,
      prompt: "you are a cat",
      tools: ["readFile"],
    });
    expect(override).not.toBeNull();
    expect(override!.provider).toBe("openai");
    expect(override!.model).toBe("gpt-5.5");
    expect(override!.apiSource).toBe("custom");
    expect(override!.apiKey).toBe("sk-test");
    expect(override!.temperature).toBe(0.3);
    expect((override as unknown as Record<string, unknown>).prompt).toBeUndefined();
    expect((override as unknown as Record<string, unknown>).tools).toBeUndefined();
  });

  it("omits undefined fields instead of copying them", () => {
    expect(buildModelLayerOverride({ provider: "deepseek", model: "v4" })).toEqual({
      provider: "deepseek",
      model: "v4",
    });
  });

  it("includes references only when non-empty", () => {
    expect(
      buildModelLayerOverride({
        provider: "p",
        model: "m",
        references: [{ dbKey: "p1", title: "S", type: "instruction" }],
      })!.references,
    ).toHaveLength(1);
    expect(
      buildModelLayerOverride({ provider: "p", model: "m", references: [] })!
        .references,
    ).toBeUndefined();
  });
});

describe("applyModelLayerOverride", () => {
  it("replaces the model layer and drops base fields not present in override", () => {
    const base = {
      provider: "deepseek",
      model: "deepseek-v4-pro",
      apiSource: "platform",
      useServerProxy: true,
      apiKey: "sk-base",
      temperature: 0.9,
      prompt: "tier prompt",
      tools: ["readFile"],
    };
    const override = buildModelLayerOverride({
      provider: "anthropic",
      model: "claude-opus",
      apiSource: "custom",
      apiKey: "sk-override",
    })!;

    const next = applyModelLayerOverride(base, override);
    expect(next.provider).toBe("anthropic");
    expect(next.model).toBe("claude-opus");
    expect(next.apiSource).toBe("custom");
    expect(next.apiKey).toBe("sk-override");
    // base 独有的凭证/采样配置被清除，不会泄漏到覆盖后的配置
    expect(next.useServerProxy).toBeUndefined();
    expect(next.temperature).toBeUndefined();
    // 非 model 层字段保持原样
    expect(next.prompt).toBe("tier prompt");
    expect(next.tools).toEqual(["readFile"]);
    // 不修改入参
    expect(base.provider).toBe("deepseek");
    expect(base.apiKey).toBe("sk-base");
  });

  it("merges override references after base references, deduped by dbKey", () => {
    const base = {
      provider: "p",
      model: "m",
      references: [
        { dbKey: "p1", title: "Base Skill", type: "instruction" },
        { dbKey: "p2", title: "Base Knowledge", type: "knowledge" },
      ],
    };
    const override = buildModelLayerOverride({
      provider: "p2",
      model: "m2",
      references: [
        { dbKey: "p2", title: "Dup", type: "knowledge" },
        { dbKey: "p3", title: "Override Skill", type: "instruction" },
      ],
    })!;

    const next = applyModelLayerOverride(base, override);
    expect(next.references).toEqual([
      { dbKey: "p1", title: "Base Skill", type: "instruction" },
      { dbKey: "p2", title: "Base Knowledge", type: "knowledge" },
      { dbKey: "p3", title: "Override Skill", type: "instruction" },
    ]);
  });

  it("drops base references key when both sides are empty", () => {
    const next = applyModelLayerOverride(
      { provider: "p", model: "m", references: [] },
      buildModelLayerOverride({ provider: "o", model: "g" })!,
    );
    expect("references" in next).toBe(false);
  });

  it("preserves customProviderUrl, credentialRef, and credentialSynced when overriding platform tier agent", () => {
    const customAgentRecord = {
      provider: "qwen",
      model: "qwen3.8-max",
      apiSource: "custom",
      useServerProxy: false,
      customProviderUrl: "https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
      apiKeyRef: "api-key:agent-x",
      credentialRef: "api-key:agent-x",
      credentialSynced: true,
    };

    const override = buildModelLayerOverride(customAgentRecord);
    expect(override).not.toBeNull();
    expect(override!.customProviderUrl).toBe(
      "https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
    );
    expect(override!.credentialRef).toBe("api-key:agent-x");
    expect(override!.credentialSynced).toBe(true);

    const base: Record<string, unknown> = {
      provider: "deepseek",
      model: "deepseek-v4-flash",
      apiSource: "platform",
      useServerProxy: true,
    };

    const result = applyModelLayerOverride(base, override!);
    expect(result.apiSource).toBe("custom");
    expect(result.customProviderUrl).toBe(
      "https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
    );
    expect(result.credentialRef).toBe("api-key:agent-x");
    expect(result.credentialSynced).toBe(true);
  });
});

describe("mergeReferences", () => {
  it("dedupes by dbKey with base priority and tolerates null", () => {
    expect(
      mergeReferences(
        [{ dbKey: "a" }],
        [{ dbKey: "a", title: "x" }, { dbKey: "b" }],
      ),
    ).toEqual([{ dbKey: "a" }, { dbKey: "b" }]);
    expect(mergeReferences(null, undefined)).toEqual([]);
  });
});
