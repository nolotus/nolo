import { describe, expect, it } from "bun:test";
import {
  PUBLIC_DEEPSEEK_V4_FLASH_AGENT_KEY,
  PUBLIC_DEEPSEEK_V4_PRO_AGENT_KEY,
  PUBLIC_KIMI_K26_IMAGE_AGENT_KEY,
  PUBLIC_GPT_IMAGE_2_GENERATOR_AGENT_KEY,
  PUBLIC_GPT_IMAGE_2_EDITOR_AGENT_KEY,
  PUBLIC_GPT_IMAGE_2_CONTINUOUS_AGENT_KEY,
  PUBLIC_NANO_BANANA_2_LITE_AGENT_KEY,
} from "core/builtinAgents";
import {
  resolveBuiltinPlatformAgentConfig,
  resolveBuiltinPlatformAgentRecord,
} from "./builtinPlatformAgentConfigs";

describe("resolveBuiltinPlatformAgentRecord", () => {
  it("flattens rawRecord into an Agent-shaped record with dbKey and name", () => {
    expect(
      resolveBuiltinPlatformAgentRecord(PUBLIC_DEEPSEEK_V4_FLASH_AGENT_KEY),
    ).toEqual({
      dbKey: PUBLIC_DEEPSEEK_V4_FLASH_AGENT_KEY,
      name: "DeepSeek V4 Flash Vision Exp",
      isPublic: true,
      provider: "nolo",
      model: "deepseek-v4-flash-vision-exp",
      apiSource: "platform",
      useServerProxy: true,
    });
  });

  it("covers every quick-chat tier key the auto profiles route to", () => {
    for (const key of [
      PUBLIC_DEEPSEEK_V4_FLASH_AGENT_KEY,
      PUBLIC_DEEPSEEK_V4_PRO_AGENT_KEY,
      PUBLIC_KIMI_K26_IMAGE_AGENT_KEY,
    ]) {
      const record = resolveBuiltinPlatformAgentRecord(key);
      // provider + model are what getApiEndpoint and the chat proxy route on;
      // a record missing either is what produced MISSING_UPSTREAM_URL.
      expect(record?.provider).toBe("nolo");
      expect(typeof record?.model).toBe("string");
      expect(record?.model).toBeTruthy();
    }
  });

  it("covers the public image agents (进站即可生成图片)", () => {
    const imageCases = [
      {
        key: PUBLIC_GPT_IMAGE_2_GENERATOR_AGENT_KEY,
        model: "gpt-5.6-luna",
        imageModel: "gpt-image-2",
        workflow: "generate",
      },
      {
        key: PUBLIC_GPT_IMAGE_2_EDITOR_AGENT_KEY,
        model: "gpt-5.6-luna",
        imageModel: "gpt-image-2",
        workflow: "edit",
      },
      {
        key: PUBLIC_GPT_IMAGE_2_CONTINUOUS_AGENT_KEY,
        model: "gpt-5.6-luna",
        imageModel: "gpt-image-2",
        workflow: "continuous",
      },
      {
        key: PUBLIC_NANO_BANANA_2_LITE_AGENT_KEY,
        model: "gemini-3.1-flash-lite-image",
        imageModel: undefined,
        workflow: undefined,
      },
    ] as const;
    for (const c of imageCases) {
      const record = resolveBuiltinPlatformAgentRecord(c.key);
      expect(record?.model).toBe(c.model);
      expect(record?.hasImageOutput).toBe(true);
      if (c.imageModel) expect(record?.imageModel).toBe(c.imageModel);
      if (c.workflow) expect(record?.imageWorkflow).toBe(c.workflow);
    }
  });

  it("returns null for non-builtin refs so callers fall back to a real read", () => {
    expect(resolveBuiltinPlatformAgentRecord("agent-pub-01SOMEUSERAGENT")).toBeNull();
    expect(resolveBuiltinPlatformAgentConfig("agent-pub-01SOMEUSERAGENT")).toBeNull();
  });
});
