import { describe, expect, it } from "bun:test";
import {
  buildCodingAgentRecord,
  splitCodingAgentServerEntries,
} from "./customCodingAgentFlow";
import { resolveTargetSpaceId } from "./agentWorkspaceDefaults";

describe("customCodingAgentFlow", () => {
  it("builds a platform coding agent record without machine runtime fields", () => {
    const record = buildCodingAgentRecord({
      userId: "user-1",
      now: 123,
      agentId: "01CODEAGENT00000000000001",
      name: "代码助理",
      provider: "deepseek",
      model: "deepseek-v4-pro",
      apiSource: "platform",
      tools: ["readFile", "applyEdit"],
      tags: ["deepseek", "coding"],
    });

    expect(record.provider).toBe("deepseek");
    expect(record.apiSource).toBe("platform");
    expect(record).not.toHaveProperty("customProviderUrl");
    expect(record).not.toHaveProperty("apiKey");
    expect(record).not.toHaveProperty("delegation");
    expect(record).not.toHaveProperty("runtimeBinding");
    expect(record.isPublic).toBe(false);
  });

  it("separates desktop-local provider runtime binding from reusable agent config", () => {
    const record = buildCodingAgentRecord({
      userId: "user-1",
      now: 123,
      agentId: "01LOCALCODE00000000000001",
      name: "本地 Qwen",
      provider: "custom",
      model: "Qwen3.6-27B-MTP-Q3_K_M.gguf",
      apiSource: "custom",
      providerUrl: "http://127.0.0.1:8080/v1/chat/completions",
      apiKey: "local-key",
      tools: [],
      tags: ["local"],
    });

    expect(record.customProviderUrl).toBe("http://127.0.0.1:8080/v1/chat/completions");
    expect(record.runtimeBinding).toEqual({
      kind: "desktop-local-provider",
      providerUrl: "http://127.0.0.1:8080/v1/chat/completions",
    });
  });

  it("detects when a separate core attach base still needs its own login entry", () => {
    expect(
      splitCodingAgentServerEntries(
        [{ baseUrl: "http://127.0.0.1:38371", userId: "u", authToken: "t" }],
        "http://127.0.0.1:38123"
      )
    ).toEqual({
      runtimeEntries: [{ baseUrl: "http://127.0.0.1:38371", userId: "u", authToken: "t" }],
      attachEntries: [],
      needsAttachLogin: true,
    });
  });

  it("does not default custom coding agents into a hardcoded shared space", () => {
    expect(resolveTargetSpaceId()).toBeUndefined();
    expect(resolveTargetSpaceId("")).toBeUndefined();
    expect(resolveTargetSpaceId("  space-1  ")).toBe("space-1");
  });
});
