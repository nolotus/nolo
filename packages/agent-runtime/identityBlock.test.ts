import { describe, expect, test } from "bun:test";

import { buildIdentityBlock } from "./identityBlock";

describe("buildIdentityBlock", () => {
  test("includes name, id and model", () => {
    const block = buildIdentityBlock({
      agentName: "Qwen3.8 Max",
      agentId: "agent-qwen",
      model: "qwen3.8-max",
    });
    expect(block).toContain("--- 身份信息 ---");
    expect(block).toContain("名称: Qwen3.8 Max");
    expect(block).toContain("ID: agent-qwen");
    expect(block).toContain("模型: qwen3.8-max");
  });

  test("omits the model line when model is absent", () => {
    const block = buildIdentityBlock({ agentName: "No Model Agent" });
    expect(block).toContain("名称: No Model Agent");
    expect(block).not.toContain("模型:");
  });

  test("does not put response language in agent identity", () => {
    const block = buildIdentityBlock({ model: "x" });
    expect(block).not.toContain("回复语言:");
  });
});
