import { describe, expect, test } from "bun:test";

import type {
  AgentRuntimeAgentConfig,
  AgentRuntimeHostAdapter,
  AgentRuntimeProvider,
  AgentRuntimeSaveTurnInput,
  AgentRuntimeToolCallInput,
  CredentialBroker,
} from "../../agent-runtime";
import {
  createDesktopAgentRuntimeAdapter,
  createDesktopAgentRuntimeRecordStoreActions,
  createDesktopAgentRuntimeRecordStoreReadActions,
  createDesktopAgentRuntimeRequestScopedActions,
  executeDesktopAgentRuntimeToolCall,
  loadDesktopAgentRuntimeAgentConfigFromRecordStore,
  loadDesktopAgentRuntimeAgentConfig,
  loadDesktopAgentRuntimeDialogHistoryFromRecordStore,
  loadDesktopAgentRuntimeDialogHistory,
  resolveBuiltinPlatformAgentConfig,
  resolveDesktopOpenAiCompatibleProvider,
  resolveDesktopConfiguredProvider,
  resolveDesktopPlatformChatProvider,
  resolveDesktopAgentRuntimeProvider,
  resolveDesktopAgentRuntimeUserId,
  saveDesktopAgentRuntimeTurnToRecordStore,
  saveDesktopAgentRuntimeTurn,
} from "./desktopAgentRuntimeAdapter";
import { CHROME_CONNECTOR_TOOL_NAMES } from "../../ai/tools/chromeConnectorTools";
import { BUILTIN_CHROME_OPERATOR_AGENT_KEY } from "./agentRun/builtinAgents";
import { createTokenKey } from "database/keys";

const mockFetch = (fn: any): typeof fetch => fn as unknown as typeof fetch;

describe("desktop agent runtime adapter", () => {
  const agentConfig: AgentRuntimeAgentConfig = {
    key: "agent-frontend",
    name: "Frontend Agent",
    model: "local-model",
  };
  const provider: AgentRuntimeProvider = {
    model: "local-model",
    complete: async () => ({ content: "ok", model: "local-model" }),
  };
  const saveTurnInput: AgentRuntimeSaveTurnInput = {
    agentKey: "agent-frontend",
    messages: [{ role: "user", content: "fix ui" }],
    result: { content: "done", model: "local-model" },
  };
  const toolCall: AgentRuntimeToolCallInput = {
    id: "tool-1",
    name: "readFile",
    arguments: "{}",
  };

  function createActionLog() {
    const calls: string[] = [];
    return {
      calls,
      actions: {
        loadAgentConfig: async (agentRef: string) => {
          calls.push(`loadAgentConfig:${agentRef}`);
          return agentConfig;
        },
        loadDialogHistory: async (dialogId: string) => {
          calls.push(`loadDialogHistory:${dialogId}`);
          return [{ role: "user" as const, content: "history" }];
        },
        saveTurn: async (input: AgentRuntimeSaveTurnInput) => {
          calls.push(`saveTurn:${input.agentKey}`);
          return { dialogId: "dialog-desktop" };
        },
        resolveProvider: async (config: AgentRuntimeAgentConfig) => {
          calls.push(`resolveProvider:${config.key}`);
          return provider;
        },
        executeTool: async (call: AgentRuntimeToolCallInput) => {
          calls.push(`executeTool:${call.name}`);
          return { content: "tool ok" };
        },
      },
    };
  }

  test("creates a desktop host adapter with capabilities derived from desktop runtime facts", () => {
    const { actions } = createActionLog();

    const adapter = createDesktopAgentRuntimeAdapter({
      env: {
        NOLO_SERVER_DB_PATH: "/Users/example/Nolo/data/leveldb",
        OPENAI_API_KEY: "sk-local",
      },
      actions,
    });

    expect(adapter).toMatchObject({
      host: "desktop",
      capabilities: ["leveldb-agent-config", "local-provider", "leveldb-persistence"],
    } as Partial<AgentRuntimeHostAdapter>);
  });

  test("request-scoped snapshot prefers matching agentRef and suppresses host saveTurn", async () => {
    const { actions, calls } = createActionLog();
    const store = { read: async () => null };
    const scoped = createDesktopAgentRuntimeRequestScopedActions({
      base: actions,
      env: { NOLO_DESKTOP: "1", NOLO_USER_ID: "local" },
      store,
      turnAgentRef: "agent-local-1",
      agentConfigSnapshot: {
        dbKey: "agent-local-1",
        prompt: "from snapshot",
        model: "local-model",
        provider: "custom",
        apiSource: "custom",
        customProviderUrl: "http://127.0.0.1:11434/v1",
        credentialRef: "api-key:agent-local-1",
        tools: ["readFile"],
      },
      dialogHistorySnapshot: {
        dialogId: "dialog-1",
        messages: [
          { role: "user", content: "prev" },
          { role: "assistant", content: "ok" },
        ],
      },
      createId: () => "ephemeral-1",
    });

    const loaded = await scoped.loadAgentConfig("agent-local-1");
    expect(loaded).toMatchObject({
      key: "agent-local-1",
      prompt: "from snapshot",
      model: "local-model",
      credentialRef: "api-key:agent-local-1",
    });
    expect(loaded?.apiKey).toBeUndefined();

    // Other agent refs still hit the host store path.
    await expect(scoped.loadAgentConfig("agent-other")).resolves.toBe(agentConfig);
    expect(calls).toContain("loadAgentConfig:agent-other");
    expect(calls).not.toContain("loadAgentConfig:agent-local-1");

    await expect(scoped.loadDialogHistory("dialog-1")).resolves.toEqual([
      { role: "user", content: "prev" },
      { role: "assistant", content: "ok" },
    ]);
    // Unrelated dialogs fall through to host store.
    await expect(scoped.loadDialogHistory("dialog-other")).resolves.toEqual([
      { role: "user", content: "history" },
    ]);

    // saveTurn is a no-op for request-snapshot agents (no host dual-write).
    await expect(
      scoped.saveTurn({
        agentKey: "agent-local-1",
        messages: [{ role: "user", content: "hi" }],
        result: { content: "done", model: "local-model" },
        continueDialogId: "dialog-1",
      }),
    ).resolves.toEqual({ dialogId: "dialog-1" });
    expect(calls).not.toContain("saveTurn:agent-local-1");
  });

  test("keeps each host action as a named delegation point", async () => {
    const { actions, calls } = createActionLog();

    await expect(loadDesktopAgentRuntimeAgentConfig({ actions, agentRef: "frontend" })).resolves.toBe(agentConfig);
    await expect(loadDesktopAgentRuntimeDialogHistory({ actions, dialogId: "dialog-1" })).resolves.toEqual([
      { role: "user", content: "history" },
    ]);
    await expect(saveDesktopAgentRuntimeTurn({ actions, input: saveTurnInput })).resolves.toEqual({
      dialogId: "dialog-desktop",
    });
    await expect(resolveDesktopAgentRuntimeProvider({ actions, agentConfig })).resolves.toBe(provider);
    await expect(executeDesktopAgentRuntimeToolCall({ actions, call: toolCall })).resolves.toEqual({
      content: "tool ok",
    });

    expect(calls).toEqual([
      "loadAgentConfig:frontend",
      "loadDialogHistory:dialog-1",
      "saveTurn:agent-frontend",
      "resolveProvider:agent-frontend",
      "executeTool:readFile",
    ]);
  });

  test("resolves desktop agent runtime user id from explicit local env before generic user env", () => {
    expect(resolveDesktopAgentRuntimeUserId({
      NOLO_LOCAL_USER_ID: "local-user",
      NOLO_USER_ID: "generic-user",
    })).toBe("local-user");
    expect(resolveDesktopAgentRuntimeUserId({
      NOLO_USER_ID: "generic-user",
    })).toBe("generic-user");
    expect(resolveDesktopAgentRuntimeUserId({})).toBe("local");
  });

  test("loads desktop agent config from record store using shared lookup order", async () => {
    const reads: Array<{ key: string; remote?: boolean }> = [];
    const store: any = {
      read: async (key: string, options?: { remote?: boolean }) => {
        reads.push({ key, remote: options?.remote });
        if (key !== "agent-user-1-frontend") return null;
        return {
          name: "Frontend Agent",
          model: "gpt-5.4",
          apiSource: "platform",
          tools: ["readFile"],
        };
      },
    };

    await expect(loadDesktopAgentRuntimeAgentConfigFromRecordStore({
      store,
      agentRef: "frontend",
      userId: "user-1",
    })).resolves.toMatchObject({
      key: "agent-user-1-frontend",
      name: "Frontend Agent",
      model: "gpt-5.4",
      provider: "platform",
      toolNames: ["readFile"],
    });

    expect(reads).toEqual([
      { key: "agent-user-1-frontend" },
    ]);
  });

  test("loads cached built-in Nolo records without injecting local developer tools", async () => {
    const previousDesktop = process.env.NOLO_DESKTOP;
    try {
      process.env.NOLO_DESKTOP = "1";
      const store: any = {
        read: async (key: string) => key === "agent-pub-01NOLOAPPBLD000000019KCKT0"
          ? {
              dbKey: "agent-pub-01NOLOAPPBLD000000019KCKT0",
              id: "01NOLOAPPBLD000000019KCKT0",
              name: "Nolo",
              prompt: "cached online prompt",
              model: "stale-model",
              provider: "openrouter",
              tools: ["runStreamingAgent"],
              runtimeToolPolicy: {
                version: 1,
                runtimeTools: ["readFile"],
              },
            }
          : null,
      };

      await expect(loadDesktopAgentRuntimeAgentConfigFromRecordStore({
        store,
        agentRef: "agent-pub-01NOLOAPPBLD000000019KCKT0",
        userId: "user-1",
      })).resolves.toMatchObject({
        key: "agent-pub-01NOLOAPPBLD000000019KCKT0",
        prompt: "cached online prompt",
        provider: "openrouter",
        model: "stale-model",
        toolNames: ["runStreamingAgent"],
        runtimeToolPolicy: {
          version: 1,
          runtimeTools: ["readFile"],
        },
      });
    } finally {
      if (previousDesktop === undefined) delete process.env.NOLO_DESKTOP;
      else process.env.NOLO_DESKTOP = previousDesktop;
    }
  });

  test("loads desktop dialog history from record store using dialog message range", async () => {
    const ranges: Array<{ gte: string; lte?: string }> = [];
    const store: any = {
      iterator: async function* (options: { gte: string; lte?: string }) {
        ranges.push(options);
        yield ["dialog-dialog-1-msg-001", { role: "user", content: "first" }];
        yield ["dialog-dialog-1-msg-002", { role: "system", content: "skip" }];
        yield ["dialog-dialog-1-msg-003", {
          role: "assistant",
          content: "answer",
          tool_calls: [{ id: "call-1", type: "function" }],
        }];
      },
    };

    await expect(loadDesktopAgentRuntimeDialogHistoryFromRecordStore({
      store,
      dialogId: "dialog-1",
    })).resolves.toEqual([
      { role: "user", content: "first" },
      {
        role: "assistant",
        content: "answer",
        // Pass-through: incomplete stored tool_calls are not synthesized.
        tool_calls: [{ id: "call-1", type: "function" }],
      },
    ] as any);

    expect(ranges).toEqual([{
      gte: "dialog-dialog-1-msg-",
      lte: "dialog-dialog-1-msg-\uffff",
    }]);
  });

  test("creates desktop record store read actions for agent config and dialog history", async () => {
    const store: any = {
      read: async (key: string) => key === "agent-user-1-frontend"
        ? { name: "Frontend Agent", model: "gpt-5.4" }
        : null,
      iterator: async function* () {
        yield ["dialog-dialog-1-msg-001", { role: "user", content: "first" }];
      },
    };
    const readActions = createDesktopAgentRuntimeRecordStoreReadActions({
      env: { NOLO_USER_ID: "user-1" },
      store,
    });

    await expect(readActions.loadAgentConfig("frontend")).resolves.toMatchObject({
      key: "agent-user-1-frontend",
      name: "Frontend Agent",
    });
    await expect(readActions.loadDialogHistory("dialog-1")).resolves.toEqual([
      { role: "user", content: "first" },
    ]);
  });

  test("keeps public desktop agent configs explicit-only", async () => {
    const store: any = {
      read: async (key: string) => key === "agent-pub-public"
        ? {
            dbKey: "agent-pub-public",
            name: "Public Agent",
            model: "gpt-5.4",
            tools: ["readFile"],
            userId: "publisher-1",
          }
        : null,
      iterator: async function* () {},
    };
    const readActions = createDesktopAgentRuntimeRecordStoreReadActions({
      env: { NOLO_USER_ID: "user-1" },
      store,
    });

    await expect(readActions.loadAgentConfig("agent-pub-public")).resolves.toMatchObject({
      key: "agent-pub-public",
      toolNames: ["readFile"],
      toolSurface: {
        finalToolNames: ["readFile"],
        injectedToolNames: [],
        auditReason: "explicit-only-public",
      },
    });
  });

  test("keeps desktop Chrome connector tools hidden when the global setting is disabled", async () => {
    const store: any = {
      read: async (key: string) => {
        if (key === "user-1-settings") {
          return { desktopChromeConnectorEnabled: false };
        }
        return key === "agent-user-1-browser"
          ? {
              dbKey: "agent-user-1-browser",
              name: "Browser Agent",
              model: "gpt-5.4",
              userId: "user-1",
              tools: ["readFile", "chrome_open_tab"],
              runtimeToolPolicy: {
                version: 1,
                runtimeTools: ["execShell", "chrome_read_page"],
              },
            }
          : null;
      },
      iterator: async function* () {},
    };
    const readActions = createDesktopAgentRuntimeRecordStoreReadActions({
      env: { NOLO_DESKTOP: "1", NOLO_USER_ID: "user-1" },
      store,
    });

    await expect(readActions.loadAgentConfig("browser")).resolves.toMatchObject({
      key: "agent-user-1-browser",
      toolNames: expect.arrayContaining(["readFile"]),
      runtimeToolPolicy: {
        runtimeTools: ["execShell"],
      },
      toolSurface: {
        finalToolNames: expect.arrayContaining(["readFile"]),
      },
    });
    const config = await readActions.loadAgentConfig("browser");
    expect(config?.toolNames).not.toContain("chrome_open_tab");
    expect(config?.toolNames).not.toContain("chrome_read_page");
    expect((config as any)?.toolSurface?.finalToolNames).not.toContain("chrome_open_tab");
  });

  test("adds desktop Chrome connector tools to ordinary desktop agents when globally enabled", async () => {
    const store: any = {
      read: async (key: string) => {
        if (key === "user-1-settings") {
          return { desktopChromeConnectorEnabled: true };
        }
        return key === "agent-user-1-browser"
          ? {
              dbKey: "agent-user-1-browser",
              name: "Browser Agent",
              model: "gpt-5.4",
              userId: "user-1",
              prompt: "browser prompt",
              tools: ["readFile"],
            }
          : null;
      },
      iterator: async function* () {},
    };
    const readActions = createDesktopAgentRuntimeRecordStoreReadActions({
      env: { NOLO_DESKTOP: "1", NOLO_USER_ID: "user-1" },
      store,
    });

    const config = await readActions.loadAgentConfig("browser");

    expect(config?.toolNames).toEqual(expect.arrayContaining(["readFile", ...CHROME_CONNECTOR_TOOL_NAMES]));
    expect((config as any)?.toolSurface?.finalToolNames).toEqual(expect.arrayContaining(["readFile", ...CHROME_CONNECTOR_TOOL_NAMES]));
    expect(config?.prompt).toContain("Nolo Desktop Chrome connector instructions");
  });

  test("Chrome operator cannot bypass the global desktop Chrome connector setting", async () => {
    const store: any = {
      read: async (key: string) => {
        if (key === "user-1-settings") {
          return { desktopChromeConnectorEnabled: false };
        }
        return key === BUILTIN_CHROME_OPERATOR_AGENT_KEY
          ? {
              dbKey: BUILTIN_CHROME_OPERATOR_AGENT_KEY,
              id: "01CHROMEOPR000000000001",
              name: "Chrome 操作员",
              model: "gpt-5.4",
              userId: "builtin",
              isPublic: true,
              prompt: "If you cannot see chrome_* tools, ask the user to enable the setting.",
              tools: ["chrome_open_tab", "chrome_read_page"],
            }
          : null;
      },
      iterator: async function* () {},
    };
    const readActions = createDesktopAgentRuntimeRecordStoreReadActions({
      env: { NOLO_DESKTOP: "1", NOLO_USER_ID: "user-1" },
      store,
    });

    const config = await readActions.loadAgentConfig(BUILTIN_CHROME_OPERATOR_AGENT_KEY);

    expect(config?.toolNames).toEqual([]);
    expect((config as any)?.toolSurface?.finalToolNames).toEqual([]);
  });

  test("saves desktop agent runtime turn to record store using shared dialog write plan", async () => {
    const reads: string[] = [];
    const batches: Array<Array<{ type: "put"; key: string; value: Record<string, unknown> }>> = [];
    const store: any = {
      read: async (key: string) => {
        reads.push(key);
        return key === "dialog-user-1-existing"
          ? { title: "Existing title", createdAt: "2024-01-01T00:00:00.000Z" }
          : null;
      },
      batch: async (ops: Array<{ type: "put"; key: string; value: Record<string, unknown> }>) => {
        batches.push(ops);
      },
    };

    await expect(saveDesktopAgentRuntimeTurnToRecordStore({
      store,
      userId: "user-1",
      now: () => 1710000000000,
      createId: () => "unused",
      input: {
        agentKey: "agent-user-1-frontend",
        continueDialogId: "existing",
        messages: [
          { role: "user", content: "fix ui" },
          { role: "assistant", content: "done" },
        ],
        result: {
          content: "done",
          model: "gpt-5.4",
          usage: { prompt_tokens: 3, completion_tokens: 2 },
        },
      },
    })).resolves.toEqual({ dialogId: "existing", title: "Existing title" });

    expect(reads).toEqual(["dialog-user-1-existing"]);
    expect(batches).toHaveLength(1);
    expect(batches[0]?.map((op) => op.key)).toEqual([
      "dialog-user-1-existing",
      "dialog-existing-msg-1710000000000-001",
      "dialog-existing-msg-1710000000000-002",
    ]);
    expect(batches[0]?.[0]?.value).toMatchObject({
      title: "Existing title",
      triggerType: "desktop-local",
      localRuntime: { host: "desktop" },
      usage: { prompt_tokens: 3, completion_tokens: 2 },
    });
  });

  test("persists desktop per-call usage and applies the shared provider billing matrix", async () => {
    const cases = [
      { billingConfig: { apiSource: "platform" }, billable: true },
      { billingConfig: { apiSource: "custom" }, billable: false },
      { billingConfig: { apiSource: "cli" }, billable: false },
      { billingConfig: { apiSource: "platform", apiKeyRef: "chatgpt" }, billable: false },
    ];

    for (const [index, testCase] of cases.entries()) {
      const written = new Map<string, any>();
      const store: any = {
        read: async (key: string) => written.get(key) ?? null,
        batch: async (ops: Array<{ type: "put"; key: string; value: any }>) => {
          for (const op of ops) written.set(op.key, op.value);
        },
      };
      await saveDesktopAgentRuntimeTurnToRecordStore({
        store,
        userId: "user-1",
        now: () => 1710003600000,
        createId: () => `id-${index}`,
        input: {
          agentKey: `agent-user-1-${index}`,
          messages: [{ role: "user", content: "hello" }],
          result: {
            content: "done",
            model: "gpt-5.5",
            usage: { input_tokens: 10, output_tokens: 2 },
          },
          usageRecords: [{
            callId: `desktop-call-${index}`,
            model: "gpt-5.5",
            provider: "openai",
            usage: { input_tokens: 10, output_tokens: 2 },
          }],
          billingConfig: {
            model: "gpt-5.5",
            provider: "openai",
            ...testCase.billingConfig,
          },
        },
      });

      const token = [...written.entries()].find(([key]) => key.startsWith("token-user-1-"))?.[1];
      expect(token).toMatchObject({
        entry_path: "desktop-local",
        input_tokens: 10,
        output_tokens: 2,
        billable: testCase.billable,
      });
      const stats = [...written.entries()].find(([key]) => key.startsWith("token-stats-day-user-"))?.[1];
      expect(stats?.total).toMatchObject({ tokens: { input: 10, output: 2 }, count: 1 });

      await saveDesktopAgentRuntimeTurnToRecordStore({
        store,
        userId: "user-1",
        now: () => 1710000000000,
        createId: () => `retry-${index}`,
        input: {
          agentKey: `agent-user-1-${index}`,
          messages: [{ role: "user", content: "hello" }],
          result: { content: "done", model: "gpt-5.5" },
          usageRecords: [{
            callId: `desktop-call-${index}`,
            model: "gpt-5.5",
            provider: "openai",
            usage: { input_tokens: 10, output_tokens: 2 },
          }],
          billingConfig: {
            model: "gpt-5.5",
            provider: "openai",
            ...testCase.billingConfig,
          },
        },
      });
      const retryStats = [...written.entries()].find(([key]) => key.startsWith("token-stats-day-user-"))?.[1];
      expect(retryStats?.total.count).toBe(1);
      expect([...written.keys()].filter((key) => key.startsWith("token-user-1-call-"))).toEqual([
        createTokenKey.recordForStableCall("user-1", `desktop-call-${index}`),
      ]);
    }
  });

  test("creates desktop record store actions for reads and save turn while leaving provider and tools injected", async () => {
    const provider: AgentRuntimeProvider = {
      model: "gpt-5.4",
      complete: async () => ({ content: "ok", model: "gpt-5.4" }),
    };
    const batches: unknown[] = [];
    const store: any = {
      read: async (key: string) => key === "agent-user-1-frontend"
        ? { name: "Frontend Agent", model: "gpt-5.4" }
        : null,
      iterator: async function* () {
        yield ["dialog-dialog-1-msg-001", { role: "user", content: "first" }];
      },
      batch: async (ops: unknown[]) => {
        batches.push(ops);
      },
    };

    const actions = createDesktopAgentRuntimeRecordStoreActions({
      env: { NOLO_USER_ID: "user-1" },
      store,
      now: () => 1710000000000,
      createId: () => "dialog-new",
      resolveProvider: async () => provider,
      executeTool: async () => ({ content: "tool ok" }),
    });

    await expect(actions.loadAgentConfig("frontend")).resolves.toMatchObject({
      key: "agent-user-1-frontend",
    });
    await expect(actions.loadDialogHistory("dialog-1")).resolves.toEqual([
      { role: "user", content: "first" },
    ]);
    await expect(actions.saveTurn(saveTurnInput)).resolves.toEqual({ dialogId: "dialog-new", title: "fix ui" });
    await expect(actions.resolveProvider(agentConfig)).resolves.toBe(provider);
    await expect(actions.executeTool(toolCall)).resolves.toEqual({ content: "tool ok" });
    expect(batches).toHaveLength(1);
  });

  test("resolves desktop OpenAI-compatible provider and completes through fetch", async () => {
    const requests: Array<{ url: string; body: any }> = [];
    const provider = await resolveDesktopOpenAiCompatibleProvider({
      env: {
        NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
        NOLO_LOCAL_OPENAI_API_KEY: "sk-local",
      },
      agentConfig: {
        key: "agent-user-1-frontend",
        model: "qwen-coder",
        temperature: 0.2,
      },
      fetchImpl: mockFetch(async (input: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        requests.push({
          url: String(input),
          body: JSON.parse(String(init?.body ?? "{}")),
        });
        return new Response(JSON.stringify({
          model: "qwen-coder",
          choices: [{ message: { role: "assistant", content: "done" } }],
        }));
      }),
    });

    await expect(provider.complete([{ role: "user", content: "fix ui" }])).resolves.toMatchObject({
      content: "done",
      model: "qwen-coder",
    });

    expect(provider.model).toBe("qwen-coder");
    expect(requests).toEqual([{
      url: "http://127.0.0.1:11434/v1/chat/completions",
      body: {
        model: "qwen-coder",
        messages: [{ role: "user", content: "fix ui" }],
        stream: false,
        temperature: 0.2,
      },
    }]);
  });

  test("resolves OpenAI-compatible provider from credentialBroker without raw apiKey", async () => {
    const secrets = new Map<string, string>([
      ["api-key:agent-brokered", "sk-from-host-broker"],
    ]);
    const credentialBroker: CredentialBroker = {
      get: async (ref) => secrets.get(ref) ?? null,
      put: async (ref, secret) => {
        secrets.set(ref, secret);
      },
      delete: async (ref) => {
        secrets.delete(ref);
      },
      has: async (ref) => secrets.has(ref),
    };
    const authHeaders: string[] = [];
    const provider = await resolveDesktopOpenAiCompatibleProvider({
      env: {},
      agentConfig: {
        key: "agent-brokered",
        provider: "custom",
        apiSource: "custom",
        model: "mimo-v2.5-pro",
        customProviderUrl: "https://token-plan-cn.xiaomimimo.com/v1",
        credentialRef: "api-key:agent-brokered",
        // no raw apiKey after migrate strip
      },
      credentialBroker,
      fetchImpl: mockFetch(async (_input: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        authHeaders.push(new Headers(init?.headers).get("api-key") ?? new Headers(init?.headers).get("Authorization") ?? "");
        return new Response(JSON.stringify({
          model: "mimo-v2.5-pro",
          choices: [{ message: { role: "assistant", content: "ok" } }],
        }));
      }),
    });

    await expect(provider.complete([{ role: "user", content: "hi" }])).resolves.toMatchObject({
      content: "ok",
      model: "mimo-v2.5-pro",
    });
    expect(authHeaders.some((h) => h.includes("sk-from-host-broker"))).toBe(true);
  });

  test("resolves desktop configured provider through the Nolo chat proxy when no direct provider is configured", async () => {
    const requests: Array<{ url: string; auth: string | null; body: any }> = [];
    const provider = await resolveDesktopConfiguredProvider({
      env: {
        NOLO_SERVER: "https://us.nolo.chat",
        AUTH_TOKEN: "token-1",
      },
      agentConfig: {
        key: "agent-user-1-frontend",
        model: "accounts/fireworks/models/kimi-k2p6",
        provider: "fireworks",
      },
      tools: [{
        type: "function",
        function: { name: "writeFile" },
      }],
      fetchImpl: mockFetch(async (input: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        requests.push({
          url: String(input),
          auth: new Headers(init?.headers).get("Authorization"),
          body: JSON.parse(String(init?.body ?? "{}")),
        });
        return Response.json({
          choices: [{ message: { role: "assistant", content: "done" } }],
        });
      }),
    });

    await expect(provider.complete([{ role: "user", content: "fix ui" }])).resolves.toMatchObject({
      content: "done",
      model: "accounts/fireworks/models/kimi-k2p6",
      provider: "fireworks",
    });

    expect(requests).toEqual([{
      url: "https://us.nolo.chat/api/v1/chat",
      auth: "Bearer token-1",
      body: {
        model: "accounts/fireworks/models/kimi-k2p6",
        messages: [{ role: "user", content: "fix ui" }],
        stream: false,
        tools: [{
          type: "function",
          function: { name: "writeFile" },
        }],
        tool_choice: "auto",
        agentKey: "agent-user-1-frontend",
        url: "https://api.fireworks.ai/inference/v1/chat/completions",
        provider: "fireworks",
      },
    }]);
  });

  test("routes Claude OAuth agents through Anthropic Messages with the local OAuth token", async () => {
    const requests: Array<{ url: string; auth: string | null; body: any }> = [];
    const provider = await resolveDesktopConfiguredProvider({
      env: {},
      agentConfig: {
        key: "agent-user-1-claude",
        apiSource: "custom",
        provider: "anthropic",
        model: "claude-opus-4-8",
        apiKeyRef: "claude",
        useServerProxy: false,
      },
      apiKeyRefResolver: async (ref) => ref === "claude" ? "oauth-claude-token" : null,
      fetchImpl: mockFetch(async (input: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        requests.push({
          url: String(input),
          auth: new Headers(init?.headers).get("Authorization"),
          body: JSON.parse(String(init?.body ?? "{}")),
        });
        return Response.json({
          id: "msg_1",
          type: "message",
          role: "assistant",
          model: "claude-opus-4-8",
          content: [{ type: "text", text: "ok" }],
          stop_reason: "end_turn",
          usage: { input_tokens: 1, output_tokens: 1 },
        });
      }),
    });

    await expect(provider.complete([{ role: "user", content: "hi" }])).resolves.toMatchObject({
      content: "ok",
      model: "claude-opus-4-8",
      provider: "anthropic",
    });
    expect(requests[0]).toMatchObject({
      url: "https://api.anthropic.com/v1/messages",
      auth: "Bearer oauth-claude-token",
    });
  });

  test("routes ChatGPT OAuth agents through Codex Responses with the local account id", async () => {
    const requests: Array<{ url: string; auth: string | null; accountId: string | null; body: any }> = [];
    const provider = await resolveDesktopConfiguredProvider({
      env: {},
      agentConfig: {
        key: "agent-user-1-chatgpt",
        apiSource: "custom",
        provider: "openai",
        model: "gpt-5.6-sol",
        apiKeyRef: "chatgpt",
        useServerProxy: false,
      },
      apiKeyRefResolver: async (ref) => ref === "chatgpt" ? "oauth-chatgpt-token" : null,
      oauthTokenStore: {
        read: (ref) => ref === "chatgpt" ? {
          provider: "chatgpt",
          accessToken: "oauth-chatgpt-token",
          accountId: "account-1",
          obtainedAt: 1,
        } : null,
        write: () => {},
        remove: () => false,
      },
      fetchImpl: mockFetch(async (input: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        requests.push({
          url: String(input),
          auth: new Headers(init?.headers).get("Authorization"),
          accountId: new Headers(init?.headers).get("chatgpt-account-id"),
          body: JSON.parse(String(init?.body ?? "{}")),
        });
        return new Response(
          'data: {"type":"response.output_text.delta","delta":"ok"}\n\n' +
          'data: {"type":"response.completed","response":{"usage":{"input_tokens":1,"output_tokens":1,"total_tokens":2}}}\n\n',
          { headers: { "Content-Type": "text/event-stream" } },
        );
      }),
    });

    await expect(provider.complete([{ role: "user", content: "hi" }])).resolves.toMatchObject({
      content: "ok",
      model: "gpt-5.6-sol",
      provider: "openai",
      // codex responses 聚合 body 的收尾元数据必须透传：finish_reason/stream_complete
      // 防 desktop 空轮误报截断，usage 供 TUI context chip 更新。
      finish_reason: "stop",
      stream_complete: true,
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    });
    expect(requests[0]).toMatchObject({
      url: "https://chatgpt.com/backend-api/codex/responses",
      auth: "Bearer oauth-chatgpt-token",
      accountId: "account-1",
      body: {
        model: "gpt-5.6-sol",
        stream: true,
        store: false,
      },
    });
  });

  test("routes platform OpenAI responses models through the Nolo chat proxy with the responses endpoint", async () => {
    const requests: Array<{ url: string; auth: string | null; body: any }> = [];
    // gpt-5.5 still has endpointKey:"responses"; gpt-5.4-mini no longer does.
    const provider = await resolveDesktopConfiguredProvider({
      env: {
        NOLO_SERVER: "https://us.nolo.chat",
        AUTH_TOKEN: "token-1",
        OPENAI_API_KEY: "sk-should-not-win",
      },
      agentConfig: {
        key: "agent-pub-01NOLOAPPBLD000000019KCKT0",
        model: "gpt-5.5",
        provider: "openai",
        apiSource: "platform",
      },
      fetchImpl: mockFetch(async (input: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        requests.push({
          url: String(input),
          auth: new Headers(init?.headers).get("Authorization"),
          body: JSON.parse(String(init?.body ?? "{}")),
        });
        return Response.json({
          output: [{
            type: "message",
            content: [{ type: "output_text", text: "done" }],
          }],
        });
      }),
    });

    await expect(provider.complete([{ role: "user", content: "hello" }])).resolves.toMatchObject({
      content: "done",
      model: "gpt-5.5",
      provider: "openai",
    });

    expect(requests).toEqual([{
      url: "https://us.nolo.chat/api/v1/chat",
      auth: "Bearer token-1",
      body: {
        model: "gpt-5.5",
        input: [{
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: "hello" }],
        }],
        stream: false,
        agentKey: "agent-pub-01NOLOAPPBLD000000019KCKT0",
        url: "https://api.openai.com/v1/responses",
        provider: "openai",
        apiSource: "platform",
      },
    }]);
  });

  test("forwards onReasoningDelta through the complete wrapper and enables streaming without onTextDelta", async () => {
    // 断点 1 验证：adapter 的 complete 包装器此前丢弃 options.onReasoningDelta，
    // 且 stream 仅由 onTextDelta 决定。修复后应：传入 onReasoningDelta 时
    //   1) stream=true（请求体含 stream:true）
    //   2) onReasoningDelta 被透传到 provider 并被 reasoning_content delta 触发。
    // 用 platform 路径（platformChatProvider 的 shouldStream 已支持
    // onTextDelta||onReasoningDelta 双回调），mock 含 reasoning_content 的 SSE。
    const requests: Array<{ url: string; body: any }> = [];
    const reasoningChunks: string[] = [];
    const provider = await resolveDesktopPlatformChatProvider({
      env: {
        NOLO_SERVER: "https://us.nolo.chat",
        AUTH_TOKEN: "token-1",
      },
      agentConfig: {
        key: "agent-user-1-reasoner",
        model: "accounts/fireworks/models/kimi-k2p6",
        provider: "fireworks",
        useServerProxy: true,
      },
      fetchImpl: mockFetch(async (input: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        requests.push({
          url: String(input),
          body: JSON.parse(String(init?.body ?? "{}")),
        });
        const sse = [
          `data: ${JSON.stringify({ choices: [{ delta: { reasoning_content: "think " } }] })}`,
          ``,
          `data: ${JSON.stringify({ choices: [{ delta: { reasoning_content: "step" } }] })}`,
          ``,
          `data: ${JSON.stringify({ choices: [{ delta: { content: "answer" } }] })}`,
          ``,
          `data: ${JSON.stringify({ choices: [{ delta: {} }], usage: { completion_tokens: 3 } })}`,
          ``,
          `data: [DONE]`,
          ``,
        ].join("\n");
        return new Response(sse, {
          headers: { "Content-Type": "text/event-stream" },
        });
      }),
    });

    const result = await provider.complete(
      [{ role: "user", content: "explain" }],
      {
        // 注意：这里只传 onReasoningDelta，不传 onTextDelta，
        // 用以验证 stream 条件已改为双回调。
        onReasoningDelta: (chunk: string) => {
          reasoningChunks.push(chunk);
        },
      },
    );

    // 1) stream 条件改为 onTextDelta || onReasoningDelta，请求体应含 stream:true。
    expect(requests[0]?.body.stream).toBe(true);
    // 2) onReasoningDelta 已被透传并在 SSE reasoning_content delta 上触发。
    expect(reasoningChunks).toEqual(["think ", "step"]);
    expect(result.content).toBe("answer");
    expect(result.reasoning_content).toContain("think");
    expect(result.reasoning_content).toContain("step");
  });
});

describe("resolveBuiltinPlatformAgentConfig", () => {
  test("returns nolo-hosted deepseek-v4-flash for flash tier", () => {
    const config = resolveBuiltinPlatformAgentConfig("agent-pub-01DSV4FLASHPB00000000JFPFD");
    expect(config).not.toBeNull();
    expect(config).toMatchObject({
      key: "agent-pub-01DSV4FLASHPB00000000JFPFD",
      provider: "nolo",
      model: "deepseek-v4-flash",
      apiSource: "platform",
      useServerProxy: true,
    });
  });

  test("returns null for the retired pro tier key", () => {
    // nolo/deepseek-v4-pro 不在模型目录里（getModelConfig 会抛），没有任何路由
    // 会产出这个 key。留着内置配置只会让它在计费兜底里按零成本走。
    expect(resolveBuiltinPlatformAgentConfig("agent-pub-01DSV4PROPUB00000001A9OLZN")).toBeNull();
  });

  test("returns null for unknown agent keys", () => {
    expect(resolveBuiltinPlatformAgentConfig("agent-unknown")).toBeNull();
    expect(resolveBuiltinPlatformAgentConfig("")).toBeNull();
  });
});

describe("loadDesktopAgentRuntimeAgentConfigFromRecordStore builtin fallback", () => {
  test("synthesizes nolo-hosted flash tier config when store misses agent-pub-deepseek-v4-flash", async () => {
    const emptyStore = {
      read: async () => null,
    } as unknown as import("./desktopAgentRuntimeAdapter").DesktopAgentRuntimeRecordStore;
    const config = await loadDesktopAgentRuntimeAgentConfigFromRecordStore({
      store: emptyStore,
      agentRef: "agent-pub-01DSV4FLASHPB00000000JFPFD",
      userId: "user-1",
    });
    expect(config).not.toBeNull();
    expect(config).toMatchObject({
      key: "agent-pub-01DSV4FLASHPB00000000JFPFD",
      provider: "nolo",
      model: "deepseek-v4-flash",
    });
  });

  test("returns null for unknown non-tier agents when store misses", async () => {
    const emptyStore = {
      read: async () => null,
    } as unknown as import("./desktopAgentRuntimeAdapter").DesktopAgentRuntimeRecordStore;
    const config = await loadDesktopAgentRuntimeAgentConfigFromRecordStore({
      store: emptyStore,
      agentRef: "agent-unknown-custom",
      userId: "user-1",
    });
    expect(config).toBeNull();
  });
});
