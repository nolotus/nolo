import { describe, expect, test } from "bun:test";

import {
  ADVANCED_FIELD_NAMES,
  buildSubmitPayload,
  handleAdvancedEdit,
  handleQuickCreate,
} from "./agentFormActions";

describe("buildSubmitPayload agent name fallback", () => {
  test("defaults an empty name to provider plus model", () => {
    const payload = buildSubmitPayload(
      { name: "", provider: "ollama-cloud", model: "glm-5.2:cloud" },
      { isCreate: true, dirtyFields: {} },
    );
    expect(payload.name).toBe("ollama-cloud glm-5.2:cloud");
  });
});

describe("handleQuickCreate", () => {
  test("credential sync clears apiKeyRef and credentialRef", async () => {
    const submissions: any[] = [];
    await handleQuickCreate({
      draft: {
        mode: "api", prompt: "", name: "Synced", provider: "openai", model: "gpt-5",
        hasVision: false, customProviderUrl: "https://api.example.com", apiKey: "",
        apiKeyRef: "provider-key:openai-api", apiKeyHeader: "", presetId: "openai-api",
        requiresDesktopOAuth: false, oauthConnected: false, credentialSynced: true,
        reasoningEffort: "medium", cliProvider: "", machineId: "", machineName: "",
      },
      onSubmit: data => submissions.push(data),
      t: (_key: string, fallback: string) => fallback,
      setIsQuickCreating: () => {},
      platformQuickCreateModel: { provider: "nolo", name: "glm-5.2" },
    });
    expect(submissions[0].apiKeyRef).toBe("");
    expect(submissions[0].credentialRef).toBeUndefined();
  });

  test("remembered provider key produces a provider-key ref when not synced", async () => {
    const submissions: any[] = [];
    await handleQuickCreate({
      draft: {
        mode: "api", prompt: "", name: "Remembered", provider: "openai", model: "gpt-5",
        hasVision: false, customProviderUrl: "https://api.example.com", apiKey: "",
        apiKeyRef: "provider-key:openai-api", apiKeyHeader: "", presetId: "openai-api",
        requiresDesktopOAuth: false, oauthConnected: false, credentialSynced: false,
        reasoningEffort: "medium", cliProvider: "", machineId: "", machineName: "",
      },
      onSubmit: data => submissions.push(data),
      t: (_key: string, fallback: string) => fallback,
      setIsQuickCreating: () => {},
      platformQuickCreateModel: { provider: "nolo", name: "glm-5.2" },
    });
    expect(submissions[0].apiKeyRef).toBe("provider-key:openai-api");
    expect(submissions[0].credentialRef).toBe("provider-key:openai-api");
  });

  test("allows creating an agent without a system prompt", async () => {
    const submissions: any[] = [];
    await handleQuickCreate({
      draft: {
        mode: "subscription",
        prompt: "",
        name: "新 AI",
        provider: "anthropic",
        model: "claude-sonnet-5",
        hasVision: true,
        customProviderUrl: "",
        apiKey: "",
        apiKeyRef: "claude",
        apiKeyHeader: "",
        presetId: "claude-oauth",
        requiresDesktopOAuth: true,
        oauthConnected: true,
        credentialSynced: false,
        reasoningEffort: "high",
        cliProvider: "",
        machineId: "",
        machineName: "",
      },
      onSubmit: (data) => submissions.push(data),
      t: (_key: string, fallback: string) => fallback,
      setIsQuickCreating: () => {},
      platformQuickCreateModel: { provider: "nolo", name: "glm-5.2" },
    });

    expect(submissions).toHaveLength(1);
    expect(submissions[0].prompt).toBe("");
    expect(submissions[0].hasVision).toBe(true);
    // reasoning_effort 应从 draft 透传到提交 payload
    expect(submissions[0].reasoning_effort).toBe("high");
  });

  test("cli mode sets apiSource=cli and forwards cliProvider/machineId without custom URL validation", async () => {
    const submissions: any[] = [];
    const toasts: string[] = [];
    await handleQuickCreate({
      draft: {
        mode: "cli",
        prompt: "写代码",
        name: "CLI Agent",
        provider: "",
        model: "",
        hasVision: false,
        customProviderUrl: "",
        apiKey: "",
        apiKeyRef: "",
        apiKeyHeader: "",
        presetId: "",
        requiresDesktopOAuth: false,
        oauthConnected: false,
        credentialSynced: false,
        reasoningEffort: "medium",
        cliProvider: "claude",
        machineId: "machine-xyz",
        machineName: "My Mac",
      },
      onSubmit: (data) => submissions.push(data),
      t: (_key: string, fallback?: string) => {
        // capture the invalidUrl toast so we can assert it was NOT shown
        if (fallback && fallback.includes("请填写有效的服务商 URL")) toasts.push(fallback);
        return fallback ?? "";
      },
      setIsQuickCreating: () => {},
      platformQuickCreateModel: { provider: "nolo", name: "glm-5.2" },
    });

    expect(submissions).toHaveLength(1);
    expect(submissions[0].apiSource).toBe("cli");
    expect(submissions[0].cliProvider).toBe("claude");
    expect(submissions[0].machineId).toBe("machine-xyz");
    expect(submissions[0].provider).toBe("");
    expect(submissions[0].model).toBe("");
    // cli 分支不能触发 custom URL 校验 toast
    expect(toasts).toHaveLength(0);
  });

  test("cli mode with empty machineId still creates (default CLI runtime)", async () => {
    const submissions: any[] = [];
    await handleQuickCreate({
      draft: {
        mode: "cli",
        prompt: "",
        name: "新 AI",
        provider: "",
        model: "",
        hasVision: false,
        customProviderUrl: "",
        apiKey: "",
        apiKeyRef: "",
        apiKeyHeader: "",
        presetId: "",
        requiresDesktopOAuth: false,
        oauthConnected: false,
        credentialSynced: false,
        reasoningEffort: "medium",
        cliProvider: "codex",
        machineId: "",
        machineName: "",
      },
      onSubmit: (data) => submissions.push(data),
      t: (_key: string, fallback: string) => fallback,
      setIsQuickCreating: () => {},
      platformQuickCreateModel: { provider: "nolo", name: "glm-5.2" },
    });

    expect(submissions).toHaveLength(1);
    expect(submissions[0].apiSource).toBe("cli");
    expect(submissions[0].machineId).toBe("");
  });
});

describe("handleAdvancedEdit reasoning_effort dirty semantics", () => {
  test("setValue(reasoning_effort) marks dirty so buildSubmitPayload keeps the draft value", () => {
    const setValueCalls: Array<[string, unknown, Record<string, unknown>?]> = [];
    const dirtyFields: Record<string, unknown> = {};

    handleAdvancedEdit({
      draft: {
        mode: "subscription",
        prompt: "",
        name: "Grok AI",
        provider: "xai",
        model: "grok-4",
        hasVision: false,
        customProviderUrl: "",
        apiKey: "",
        apiKeyRef: "xai",
        apiKeyHeader: "",
        presetId: "xai-oauth",
        requiresDesktopOAuth: true,
        oauthConnected: true,
        credentialSynced: false,
        reasoningEffort: "high",
        cliProvider: "",
        machineId: "",
        machineName: "",
      },
      getValues: () => "",
      setValue: (field: string, value: unknown, opts?: Record<string, unknown>) => {
        setValueCalls.push([field, value, opts]);
        // Simulate RHF: only shouldDirty:true flips dirtyFields.
        if (opts?.shouldDirty === true) dirtyFields[field] = true;
      },
      setApiSource: () => {},
      setCommittedCreateSource: () => {},
      setCreateSourceCommitted: () => {},
      setActiveTabState: () => {},
      platformQuickCreateModel: { provider: "nolo", name: "glm-5.2" },
    });

    const reasoningCall = setValueCalls.find(([field]) => field === "reasoning_effort");
    expect(reasoningCall?.[1]).toBe("high");
    expect(reasoningCall?.[2]).toMatchObject({
      shouldValidate: true,
      shouldDirty: true,
    });
    expect(dirtyFields.reasoning_effort).toBe(true);

    // User does not touch the field again in advanced form — still must survive submit.
    const payload = buildSubmitPayload(
      {
        name: "Grok AI",
        reasoning_effort: "high",
      },
      { isCreate: true, dirtyFields },
    );
    expect(payload.reasoning_effort).toBe("high");
  });

  test("cli mode sets apiSource=cli / cliProvider / machineId into RHF", () => {
    const setValueCalls: Array<[string, unknown]> = [];
    let appliedApiSource = "";

    handleAdvancedEdit({
      draft: {
        mode: "cli",
        prompt: "code helper",
        name: "CLI Agent",
        provider: "",
        model: "",
        hasVision: false,
        customProviderUrl: "",
        apiKey: "",
        apiKeyRef: "",
        apiKeyHeader: "",
        presetId: "",
        requiresDesktopOAuth: false,
        oauthConnected: false,
        credentialSynced: false,
        reasoningEffort: "medium",
        cliProvider: "gemini",
        machineId: "machine-abc",
        machineName: "Dev Box",
      },
      getValues: () => "",
      setValue: (field: string, value: unknown) => setValueCalls.push([field, value]),
      setApiSource: (s) => {
        appliedApiSource = s;
      },
      setCommittedCreateSource: () => {},
      setCreateSourceCommitted: () => {},
      setActiveTabState: () => {},
      platformQuickCreateModel: { provider: "nolo", name: "glm-5.2" },
    });

    expect(appliedApiSource).toBe("cli");
    const apiSourceCall = setValueCalls.find(([f]) => f === "apiSource");
    expect(apiSourceCall?.[1]).toBe("cli");
    const cliProviderCall = setValueCalls.find(([f]) => f === "cliProvider");
    expect(cliProviderCall?.[1]).toBe("gemini");
    const machineIdCall = setValueCalls.find(([f]) => f === "machineId");
    expect(machineIdCall?.[1]).toBe("machine-abc");
    const modelCall = setValueCalls.find(([f]) => f === "model");
    expect(modelCall?.[1]).toBe("");
    const providerCall = setValueCalls.find(([f]) => f === "provider");
    expect(providerCall?.[1]).toBe("");
  });
});

describe("buildSubmitPayload max_tokens clear semantics", () => {
  // 这些用例锁住第 1 条 HIGH finding 修复所依赖的清空语义：
  // 编辑模式下「跟随模型默认」必须发 null 才能让后端真正删字段，
  // undefined 在编辑模式不发送（后端保持旧值），新建模式 null/undefined 都不发送。
  const baseData = {
    name: "a",
    max_tokens: null as number | null | undefined,
  };

  test("edit mode + max_tokens: null + dirty → payload contains { max_tokens: null }", () => {
    const payload = buildSubmitPayload(
      { ...baseData, max_tokens: null },
      { isCreate: false, dirtyFields: { max_tokens: true } },
    );
    expect(payload).toHaveProperty("max_tokens", null);
  });

  test("edit mode + max_tokens: undefined + dirty → payload omits max_tokens", () => {
    const payload = buildSubmitPayload(
      { ...baseData, max_tokens: undefined },
      { isCreate: false, dirtyFields: { max_tokens: true } },
    );
    expect(payload).not.toHaveProperty("max_tokens");
  });

  test("create mode + max_tokens: null + dirty → payload omits max_tokens", () => {
    const payload = buildSubmitPayload(
      { ...baseData, max_tokens: null },
      { isCreate: true, dirtyFields: { max_tokens: true } },
    );
    expect(payload).not.toHaveProperty("max_tokens");
  });

  test("create mode + max_tokens: undefined + dirty → payload omits max_tokens", () => {
    const payload = buildSubmitPayload(
      { ...baseData, max_tokens: undefined },
      { isCreate: true, dirtyFields: { max_tokens: true } },
    );
    expect(payload).not.toHaveProperty("max_tokens");
  });

  test("edit mode + max_tokens not dirty → payload omits max_tokens", () => {
    const payload = buildSubmitPayload(
      { ...baseData, max_tokens: 8000 },
      { isCreate: false, dirtyFields: { max_tokens: false } },
    );
    expect(payload).not.toHaveProperty("max_tokens");
  });

  test("create mode + max_tokens not dirty → payload omits max_tokens", () => {
    const payload = buildSubmitPayload(
      { ...baseData, max_tokens: 8000 },
      { isCreate: true, dirtyFields: { max_tokens: false } },
    );
    expect(payload).not.toHaveProperty("max_tokens");
  });

  test("ADVANCED_FIELD_NAMES includes max_tokens", () => {
    expect(ADVANCED_FIELD_NAMES).toContain("max_tokens");
  });
});
