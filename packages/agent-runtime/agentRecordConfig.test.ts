import { describe, expect, test } from "bun:test";

import { resolveAgentRuntimeConfigFromRecord } from "./agentRecordConfig";

describe("agent runtime record config", () => {
  test("keeps complete runtime-relevant agent config while normalizing tools", () => {
    const rawRecord = {
      dbKey: "agent-user-1-frontend",
      name: "Frontend implementer",
      prompt: "Fix UI carefully.",
      model: "gpt-5.4",
      provider: "openai",
      apiSource: "platform",
      cliProvider: "codex",
      customProviderUrl: "https://provider.example/v1",
      apiKey: "sk-agent",
      apiKeyHeader: "api-key",
      apiKeyFromAgentKey: "agent-secret",
      apiKeyRef: undefined,
      useServerProxy: true,
      toolNames: ["legacyTool", "readFile"],
      tools: [
        "readFile",
        "editFile",
        { type: "function", function: { name: "writeFile" } },
      ],
      runtimeBinding: { machineId: "machine-1" },
      runtimeToolPolicy: {
        version: 1,
        runtimeTools: ["execShell"],
        workspace: { mode: "current" },
        shell: { enabled: true, mode: "worktree" },
        git: { canCommit: true, canPushAlpha: false, canMergeMain: false },
        audit: { logShellCommands: true, writeToDialog: true, writeToTask: true },
      },
      delegation: { target: "local" },
      temperature: 0.2,
      top_p: 0.9,
      frequency_penalty: 0.1,
      presence_penalty: 0.3,
      max_tokens: 4096,
      reasoning_effort: "medium",
    };

    expect(resolveAgentRuntimeConfigFromRecord("agent-user-1-frontend", rawRecord)).toEqual({
      key: "agent-user-1-frontend",
      name: "Frontend implementer",
      prompt: "Fix UI carefully.",
      model: "gpt-5.4",
      provider: "openai",
      apiSource: "platform",
      cliProvider: "codex",
      customProviderUrl: "https://provider.example/v1",
      apiKey: "sk-agent",
      apiKeyHeader: "api-key",
      apiKeyFromAgentKey: "agent-secret",
      useServerProxy: true,
      toolNames: ["legacyTool", "readFile", "editFile", "writeFile"],
      runtimeBinding: { machineId: "machine-1" },
      runtimeToolPolicy: {
        version: 1,
        runtimeTools: ["execShell"],
        workspace: { mode: "current" },
        shell: { enabled: true, mode: "worktree" },
        git: { canCommit: true, canPushAlpha: false, canMergeMain: false },
        audit: { logShellCommands: true, writeToDialog: true, writeToTask: true },
      },
      delegation: { target: "local" },
      temperature: 0.2,
      top_p: 0.9,
      frequency_penalty: 0.1,
      presence_penalty: 0.3,
      max_tokens: 4096,
      reasoning_effort: "medium",
      rawRecord,
    });
  });

  test("accepts reasoningEffort camelCase on agent records", () => {
    expect(resolveAgentRuntimeConfigFromRecord("agent-user-1-grok", {
      apiSource: "cli",
      cliProvider: "grok",
      reasoningEffort: "high",
    })).toMatchObject({
      key: "agent-user-1-grok",
      reasoning_effort: "high",
    });
  });

  test("falls back provider to apiSource and tools to tools", () => {
    expect(resolveAgentRuntimeConfigFromRecord("agent-user-1-cli", {
      apiSource: "cli",
      tools: ["execShell"],
    })).toMatchObject({
      key: "agent-user-1-cli",
      provider: "cli",
      apiSource: "cli",
      toolNames: ["execShell"],
    });
  });

  test("accepts runtime tool policy under runtimeBinding for older agent records", () => {
    expect(resolveAgentRuntimeConfigFromRecord("agent-user-1-runner", {
      runtimeBinding: {
        machineId: "machine-1",
        runtimeToolPolicy: {
          version: 1,
          runtimeTools: ["execShell"],
          workspace: { mode: "lease" },
        },
      },
    })).toMatchObject({
      key: "agent-user-1-runner",
      runtimeToolPolicy: {
        version: 1,
        runtimeTools: ["execShell"],
        workspace: { mode: "lease" },
      },
    });
  });

  test("promotes apiKeyRef for OAuth custom agents", () => {
    expect(resolveAgentRuntimeConfigFromRecord("agent-user-1-grok", {
      apiSource: "custom",
      provider: "xai",
      apiKeyRef: "xai",
      customProviderUrl: "https://api.x.ai/v1",
      model: "grok-composer-2.5-fast",
    })).toMatchObject({
      key: "agent-user-1-grok",
      apiKeyRef: "xai",
      provider: "xai",
    });
  });

  test("promotes custom provider credential fields into runtime config", () => {
    expect(resolveAgentRuntimeConfigFromRecord("agent-user-1-mimo", {
      provider: "custom",
      apiSource: "custom",
      customProviderUrl: "https://token-plan-cn.xiaomimimo.com/v1",
      apiKey: "mimo-agent-key",
      apiKeyHeader: "api-key",
      apiKeyFromAgentKey: "agent-secret-field",
    })).toMatchObject({
      key: "agent-user-1-mimo",
      provider: "custom",
      apiSource: "custom",
      customProviderUrl: "https://token-plan-cn.xiaomimimo.com/v1",
      apiKey: "mimo-agent-key",
      apiKeyHeader: "api-key",
      apiKeyFromAgentKey: "agent-secret-field",
    });
  });
});
