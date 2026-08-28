import { describe, expect, it } from "bun:test";
import type { Agent } from "app/types";
import {
  applyQuickChatModelOverride,
  buildQuickChatModelOverride,
} from "./quickChatModelOverride";

const makeAgent = (overrides: Partial<Agent> = {}): Agent =>
  ({
    provider: "deepseek",
    model: "deepseek-v4-flash",
    userId: "user-1",
    isPublic: true,
    updatedAt: "2026-01-01",
    createdAt: 1,
    ...overrides,
  }) as Agent;

describe("buildQuickChatModelOverride", () => {
  it("returns null when provider or model is missing/empty", () => {
    expect(buildQuickChatModelOverride(makeAgent({ provider: "" }))).toBeNull();
    expect(buildQuickChatModelOverride(makeAgent({ model: " " }))).toBeNull();
    expect(
      buildQuickChatModelOverride({} as Partial<Agent> as Agent),
    ).toBeNull();
  });

  it("picks only model-layer fields, never prompt/tools", () => {
    const override = buildQuickChatModelOverride(
      makeAgent({
        provider: "openai",
        model: "gpt-5.5",
        apiSource: "custom",
        apiKey: "sk-test",
        temperature: 0.3,
        prompt: "you are a cat",
        tools: ["readFile"],
      }),
    );
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
    const override = buildQuickChatModelOverride(makeAgent());
    expect(override).toEqual({
      provider: "deepseek",
      model: "deepseek-v4-flash",
    });
  });

  it("includes references only when non-empty", () => {
    const withRefs = buildQuickChatModelOverride(
      makeAgent({
        references: [{ dbKey: "p1", title: "Skill A", type: "instruction" }],
      }),
    );
    expect(withRefs!.references).toHaveLength(1);

    const withoutRefs = buildQuickChatModelOverride(
      makeAgent({ references: [] }),
    );
    expect(withoutRefs!.references).toBeUndefined();
  });
});

describe("applyQuickChatModelOverride", () => {
  it("replaces the model layer and drops base credentials not present in override", () => {
    const base = makeAgent({
      provider: "deepseek",
      model: "deepseek-v4-pro",
      apiSource: "platform",
      useServerProxy: true,
      apiKey: "sk-base",
      temperature: 0.9,
      prompt: "tier prompt",
      tools: ["readFile"],
    });
    const override = buildQuickChatModelOverride(
      makeAgent({
        provider: "anthropic",
        model: "claude-opus",
        apiSource: "custom",
        apiKey: "sk-override",
      }),
    )!;

    const next = applyQuickChatModelOverride(base, override);
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
    const base = makeAgent({
      references: [
        { dbKey: "p1", title: "Base Skill", type: "instruction" },
        { dbKey: "p2", title: "Base Knowledge", type: "knowledge" },
      ],
    });
    const override = buildQuickChatModelOverride(
      makeAgent({
        references: [
          { dbKey: "p2", title: "Dup", type: "knowledge" },
          { dbKey: "p3", title: "Override Skill", type: "instruction" },
        ],
      }),
    )!;

    const next = applyQuickChatModelOverride(base, override);
    expect(next.references).toEqual([
      { dbKey: "p1", title: "Base Skill", type: "instruction" },
      { dbKey: "p2", title: "Base Knowledge", type: "knowledge" },
      { dbKey: "p3", title: "Override Skill", type: "instruction" },
    ]);
  });

  it("keeps base references untouched when override has none", () => {
    const base = makeAgent({
      references: [{ dbKey: "p1", title: "Base Skill", type: "instruction" }],
    });
    const override = buildQuickChatModelOverride(
      makeAgent({ provider: "openai", model: "gpt-5.5" }),
    )!;
    const next = applyQuickChatModelOverride(base, override);
    expect(next.references).toEqual(base.references);
  });

  it("drops base references key when both sides are empty", () => {
    const base = makeAgent({ references: [] });
    const override = buildQuickChatModelOverride(
      makeAgent({ provider: "openai", model: "gpt-5.5" }),
    )!;
    const next = applyQuickChatModelOverride(base, override);
    expect("references" in next).toBe(false);
  });
});
