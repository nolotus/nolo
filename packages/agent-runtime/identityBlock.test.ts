import { describe, expect, test } from "bun:test";

import { buildIdentityBlock } from "./identityBlock";

describe("buildIdentityBlock", () => {
  test("includes name, id, model and response language", () => {
    const block = buildIdentityBlock({
      agentName: "Qwen3.8 Max",
      agentId: "agent-qwen",
      model: "qwen3.8-max",
      responseLanguage: "zh-CN",
    });
    expect(block).toContain("--- 身份信息 ---");
    expect(block).toContain("名称: Qwen3.8 Max");
    expect(block).toContain("ID: agent-qwen");
    expect(block).toContain("模型: qwen3.8-max");
    expect(block).toContain("回复语言: zh-CN");
  });

  test("omits the model line when model is absent", () => {
    const block = buildIdentityBlock({ agentName: "No Model Agent" });
    expect(block).toContain("名称: No Model Agent");
    expect(block).not.toContain("模型:");
  });

  test("falls back to a default response language when none is provided", () => {
    const block = buildIdentityBlock({ model: "x" });
    expect(block).toContain("回复语言: 默认跟随用户本轮输入语言");
  });
});
