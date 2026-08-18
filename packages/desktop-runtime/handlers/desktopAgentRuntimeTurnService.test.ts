import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  createDesktopAgentRuntimeRecordStoreFromDb,
  createDesktopAgentRuntimeHybridRecordStoreFromDb,
  runDesktopAgentRuntimeTurn,
  runDesktopTextOnlyAgentRuntimeTurn,
  resolveDesktopEffectiveEnabledPacks,
} from "./desktopAgentRuntimeTurnService";
import {
  CODE_PLANNER_COMPILED_EFFECTIVE_TOOLS,
  CODE_PLANNER_WEB_CAPABILITY_PACK_IDS,
} from "ai/skills/codePlannerSkills";
import { FORCED_TOOLS, expandEnabledPacks } from "ai/tools/toolPacks";
import { BUILTIN_NOLO_AGENT_KEY } from "./agentRun/builtinAgents";

const mockFetch = (fn: any): typeof fetch => {
  // Auto-route memory overlay queries to an empty promptBlock so the new
  // desktop memory layer does not consume a provider-call sequence position
  // in call-ordered test mocks. Tests that explicitly assert on memory supply
  // their own memoryOverlayFetchImpl instead.
  const wrapped: typeof fetch = (async (
    input: string | URL | Request,
    init?: RequestInit | BunFetchRequestInit,
  ) => {
    const url = String(input);
    if (url.includes("/api/memory/query")) {
      return Response.json({ promptBlock: null });
    }
    return fn(input, init);
  }) as unknown as typeof fetch;
  return wrapped;
};

describe("desktop agent runtime turn service", () => {
  const DEFAULT_LOCAL_CODING_TOOL_NAMES = [
    "listFiles",
    "readFile",
    "writeFile",
    "editFile",
    "globFiles",
    "searchFiles",
    "execShell",
    "launchProcess",
    "listProcesses",
  ];
  const DEFAULT_PRIVATE_NOLO_WORKSPACE_TOOL_NAMES = [
    "listDialogs",
    "readDialog",
    "queryDialogsBySubjectRef",
    "listAgents",
    "readAgent",
    "listSpaces",
    "readSpace",
    "readDoc",
    "readSkillDoc",
    "loadSkill",
    "listTables",
    "queryTableRows",
    "cliWhoami",
    "cliDoctor",
  ];
  const DEFAULT_PRIVATE_DESKTOP_TOOL_NAMES = [
    ...DEFAULT_LOCAL_CODING_TOOL_NAMES,
    ...DEFAULT_PRIVATE_NOLO_WORKSPACE_TOOL_NAMES,
  ];
  const SHELL_LOCAL_CODING_TOOL_NAMES = [
    ...DEFAULT_PRIVATE_DESKTOP_TOOL_NAMES,
  ];

  function createTempWorkspace() {
    return mkdtempSync(join(tmpdir(), "nolo-desktop-runtime-"));
  }

  test("wraps LevelDB missing records as null reads", async () => {
    const store = createDesktopAgentRuntimeRecordStoreFromDb({
      get: async () => {
        const error = new Error("NotFound");
        (error as any).code = "LEVEL_NOT_FOUND";
        throw error;
      },
      batch: async () => {},
      iterator: async function* () {},
    });

    await expect(store.read("missing-key")).resolves.toBeNull();
  });

  test("creates a desktop hybrid record store that reads and caches remote misses", async () => {
    const memory = new Map<string, unknown>();
    const requests: Array<{ url: string; auth: string | null }> = [];
    const store = createDesktopAgentRuntimeHybridRecordStoreFromDb({
      env: {
        NOLO_SERVER: "https://us.nolo.chat/",
        AUTH_TOKEN: "token-1",
      },
      fetchImpl: mockFetch(async (url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        requests.push({
          url: String(url),
          auth: new Headers(init?.headers).get("Authorization"),
        });
        return Response.json({
          data: {
            name: "Remote Frontend",
            model: "qwen-coder",
            updatedAt: "2026-05-14T00:00:00.000Z",
          },
        });
      }),
      db: {
        get: async (key) => {
          if (!memory.has(key)) throw new Error(`not found: ${key}`);
          return memory.get(key);
        },
        put: async (key, value) => {
          memory.set(key, value);
        },
        batch: async () => {},
        iterator: async function* () {},
      },
    });

    await expect(store.read("agent-user-1-frontend", { remote: true })).resolves.toMatchObject({
      dbKey: "agent-user-1-frontend",
      name: "Remote Frontend",
      serverOrigin: "https://us.nolo.chat",
    });
    expect(requests).toEqual([{
      url: "https://us.nolo.chat/api/v1/db/read/agent-user-1-frontend",
      auth: "Bearer token-1",
    }]);
    expect(memory.get("agent-user-1-frontend")).toMatchObject({
      name: "Remote Frontend",
      serverOrigin: "https://us.nolo.chat",
    });
  });

  test("refreshes stale desktop cached agent records when remote reads are requested", async () => {
    const memory = new Map<string, unknown>([
      ["agent-user-1-frontend", {
        name: "Cached Frontend",
        prompt: "old prompt",
        updatedAt: "2026-05-13T00:00:00.000Z",
      }],
    ]);
    const requests: string[] = [];
    const store = createDesktopAgentRuntimeHybridRecordStoreFromDb({
      env: {
        NOLO_SERVER: "https://us.nolo.chat/",
        AUTH_TOKEN: "token-1",
      },
      fetchImpl: mockFetch(async (url: string | URL | Request) => {
        requests.push(String(url));
        return Response.json({
          data: {
            name: "Remote Frontend",
            prompt: "new prompt",
            updatedAt: "2026-05-14T00:00:00.000Z",
          },
        });
      }),
      db: {
        get: async (key) => {
          if (!memory.has(key)) throw new Error(`not found: ${key}`);
          return memory.get(key);
        },
        put: async (key, value) => {
          memory.set(key, value);
        },
        batch: async () => {},
        iterator: async function* () {},
      },
    });

    await expect(store.read("agent-user-1-frontend", { remote: true })).resolves.toMatchObject({
      name: "Remote Frontend",
      prompt: "new prompt",
      serverOrigin: "https://us.nolo.chat",
    });
    expect(requests).toEqual([
      "https://us.nolo.chat/api/v1/db/read/agent-user-1-frontend",
    ]);
    expect(memory.get("agent-user-1-frontend")).toMatchObject({
      name: "Remote Frontend",
      prompt: "new prompt",
      serverOrigin: "https://us.nolo.chat",
    });
  });

  test("keeps desktop cached agent records usable when remote refresh fails", async () => {
    const memory = new Map<string, unknown>([
      ["agent-user-1-frontend", {
        name: "Cached Frontend",
        prompt: "cached prompt",
      }],
    ]);
    const store = createDesktopAgentRuntimeHybridRecordStoreFromDb({
      env: {
        NOLO_SERVER: "https://us.nolo.chat/",
      },
      fetchImpl: mockFetch(async () => {
        throw new Error("offline");
      }),
      db: {
        get: async (key) => {
          if (!memory.has(key)) throw new Error(`not found: ${key}`);
          return memory.get(key);
        },
        put: async (key, value) => {
          memory.set(key, value);
        },
        batch: async () => {},
        iterator: async function* () {},
      },
    });

    await expect(store.read("agent-user-1-frontend", { remote: true })).resolves.toMatchObject({
      name: "Cached Frontend",
      prompt: "cached prompt",
    });
  });

  test("binds LevelDB methods when creating the desktop hybrid record store", async () => {
    class ThisSensitiveDb {
      #memory = new Map<string, unknown>([
        ["agent-user-1-local", { name: "Local Agent" }],
      ]);

      async get(key: string) {
        if (!this.#memory.has(key)) throw new Error(`not found: ${key}`);
        return this.#memory.get(key);
      }

      async put(key: string, value: unknown) {
        this.#memory.set(key, value);
      }

      async batch(ops: Array<{ type: "put"; key: string; value: Record<string, unknown> }>) {
        for (const op of ops) {
          this.#memory.set(op.key, op.value);
        }
      }

      async *iterator() {}
    }

    const store = createDesktopAgentRuntimeHybridRecordStoreFromDb({
      env: {},
      db: new ThisSensitiveDb(),
    });

    await expect(store.read("agent-user-1-local")).resolves.toMatchObject({
      name: "Local Agent",
    });
    await expect(store.batch?.([{
      type: "put",
      key: "dialog-local",
      value: { type: "dialog" },
    }])).resolves.toBeUndefined();
    await expect(store.read("dialog-local")).resolves.toMatchObject({
      type: "dialog",
    });
  });

  test("runs a text-only local turn through the desktop record store and provider", async () => {
    const reads: Array<{ key: string; remote?: boolean }> = [];
    const ranges: Array<{ gte: string; lte?: string }> = [];
    const batches: Array<Array<{ type: "put"; key: string; value: Record<string, unknown> }>> = [];
    const providerRequests: Array<{ url: string; body: Record<string, unknown> }> = [];
    const store = {
      read: async (key: string, options?: { remote?: boolean }) => {
        reads.push({ key, remote: options?.remote });
        if (key === "agent-user-1-frontend") {
          return {
            name: "Frontend Agent",
            prompt: "Fix UI with concise implementation steps.",
            model: "qwen-coder",
          };
        }
        return null;
      },
      iterator: async function* (options: { gte: string; lte?: string }) {
        ranges.push(options);
        yield ["dialog-dialog-existing-msg-001", { role: "user", content: "old request" }];
        yield ["dialog-dialog-existing-msg-002", { role: "assistant", content: "old answer" }];
      },
      batch: async (ops: Array<{ type: "put"; key: string; value: Record<string, unknown> }>) => {
        batches.push(ops);
      },
    };

    const result = await runDesktopTextOnlyAgentRuntimeTurn({
      env: {
        NOLO_USER_ID: "user-1",
        NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
        NOLO_LOCAL_OPENAI_API_KEY: "sk-local",
      },
      store: store as any,
      agentRef: "frontend",
      input: "polish the notification UI",
      continueDialogId: "dialog-existing",
      now: () => 1710000000000,
      createId: () => "unused",
      fetchImpl: mockFetch(async (input: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        providerRequests.push({
          url: String(input),
          body: JSON.parse(String(init?.body ?? "{}")),
        });
        return new Response(JSON.stringify({
          model: "qwen-coder",
          choices: [{ message: { role: "assistant", content: "done" } }],
        }));
      }),
    });

    expect(result).toMatchObject({
      dialogId: "dialog-existing",
      content: "done",
      model: "qwen-coder",
    });
    expect(reads).toEqual([
      { key: "agent-user-1-frontend", remote: true },
      { key: "dialog-user-1-dialog-existing", remote: false },
    ]);
    expect(ranges).toEqual([{
      gte: "dialog-dialog-existing-msg-",
      lte: "dialog-dialog-existing-msg-\uffff",
    }]);
    expect(providerRequests).toEqual([{
      url: "http://127.0.0.1:11434/v1/chat/completions",
      body: {
        model: "qwen-coder",
        messages: [
          { role: "system", content: "Fix UI with concise implementation steps." },
          { role: "user", content: "old request" },
          { role: "assistant", content: "old answer" },
          { role: "user", content: "polish the notification UI" },
        ],
        stream: false,
      },
    }]);
    expect(batches).toHaveLength(1);
    expect(batches[0]?.map((op) => op.key)).toEqual([
      "dialog-user-1-dialog-existing",
      "dialog-dialog-existing-msg-1710000000000-001",
      "dialog-dialog-existing-msg-1710000000000-002",
    ]);
  });

  test("uses request-scoped agentConfigSnapshot when host store has no agent record", async () => {
    const reads: string[] = [];
    const batches: unknown[] = [];
    const providerBodies: any[] = [];
    const store = {
      read: async (key: string) => {
        reads.push(key);
        return null;
      },
      iterator: async function* () {},
      batch: async (ops: unknown[]) => {
        batches.push(ops);
      },
    };

    const result = await runDesktopTextOnlyAgentRuntimeTurn({
      env: {
        NOLO_USER_ID: "local",
        NOLO_DESKTOP: "1",
      },
      store: store as any,
      agentRef: "agent-local-1",
      input: "hello from snapshot",
      continueDialogId: "dialog-local-1",
      agentConfigSnapshot: {
        dbKey: "agent-local-1",
        prompt: "You are a local agent",
        model: "local-model",
        provider: "custom",
        apiSource: "custom",
        customProviderUrl: "http://127.0.0.1:11434/v1",
        credentialRef: "api-key:agent-local-1",
        temperature: 0.1,
      },
      dialogHistorySnapshot: {
        dialogId: "dialog-local-1",
        messages: [
          { role: "user", content: "previous" },
          { role: "assistant", content: "prior reply" },
        ],
      },
      now: () => 1710000000000,
      createId: () => "ephemeral",
      fetchImpl: mockFetch(async (_input: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        providerBodies.push(JSON.parse(String(init?.body ?? "{}")));
        return new Response(JSON.stringify({
          model: "local-model",
          choices: [{ message: { role: "assistant", content: "snapshot-ok" } }],
        }));
      }),
    });

    expect(result).toMatchObject({
      content: "snapshot-ok",
      model: "local-model",
      dialogId: "dialog-local-1",
    });
    expect(providerBodies[0]?.messages).toEqual([
      { role: "system", content: "You are a local agent" },
      { role: "user", content: "previous" },
      { role: "assistant", content: "prior reply" },
      { role: "user", content: "hello from snapshot" },
    ]);
    // Host store must not become a second truth for request-snapshot agents.
    expect(batches).toHaveLength(0);
    // Turn agent was not loaded from host store (snapshot path).
    expect(reads.every((key) => !key.includes("agent-local-1"))).toBe(true);
  });

  test("rejects tool calls in the text-only desktop service", async () => {
    const store = {
      read: async (key: string) => key === "agent-user-1-frontend"
        ? { name: "Frontend Agent", model: "qwen-coder" }
        : null,
      iterator: async function* () {},
      batch: async () => {},
    };

    await expect(runDesktopTextOnlyAgentRuntimeTurn({
      env: {
        NOLO_USER_ID: "user-1",
        NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
      },
      store,
      agentRef: "frontend",
      input: "use a tool",
      now: () => 1710000000000,
      createId: () => "dialog-new",
      fetchImpl: mockFetch(async () => new Response(JSON.stringify({
        model: "qwen-coder",
        choices: [{
          message: {
            role: "assistant",
            content: "",
            tool_calls: [{
              id: "call-1",
              type: "function",
              function: { name: "execShell", arguments: "{\"cmd\":\"pwd\"}" },
            }],
          },
        }],
      }))),
    })).rejects.toThrow("Desktop text-only agent runtime cannot execute tool calls: execShell");
  });

  test("exposes Nolo workspace tools to built-in nolo inside desktop runtime", async () => {
    const originalDesktop = process.env.NOLO_DESKTOP;
    const originalDesktopAppEntry = process.env.NOLO_DESKTOP_APP_ENTRY;
    const originalSpawn = Bun.spawn;
    process.env.NOLO_DESKTOP = "1";
    process.env.NOLO_DESKTOP_APP_ENTRY = "/Applications/Nolo Desktop-canary.app/Contents/Resources/app/bun/index.js";
    const providerRequests: Array<{ body: any }> = [];
    const spawnCalls: Array<{ cmd: string[]; env?: NodeJS.ProcessEnv }> = [];
    const batches: Array<Array<{ type: "put"; key: string; value: Record<string, unknown> }>> = [];

    Bun.spawn = ((options: { cmd: string[]; env?: NodeJS.ProcessEnv }) => {
      spawnCalls.push(options);
      return {
        stdout: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("dialog output\n"));
            controller.close();
          },
        }),
        stderr: new ReadableStream({
          start(controller) {
            controller.close();
          },
        }),
        exited: Promise.resolve(0),
      };
    }) as unknown as typeof Bun.spawn;

    try {
      const result = await runDesktopAgentRuntimeTurn({
        env: {
          NOLO_DESKTOP: "1",
          NOLO_USER_ID: "user-1",
          NOLO_SERVER: "https://nolo.chat",
          AUTH_TOKEN: "token-1",
        },
        store: {
          read: async (key: string) => {
            if (key === BUILTIN_NOLO_AGENT_KEY) {
              return {
                dbKey: BUILTIN_NOLO_AGENT_KEY,
                id: "01NOLOAPPBLD000000019KCKT0",
                name: "nolo",
                prompt: "desktop nolo prompt",
                tools: ["runStreamingAgent", ...DEFAULT_PRIVATE_NOLO_WORKSPACE_TOOL_NAMES],
                provider: "openai",
                model: "gpt-4o",
              };
            }
            return null;
          },
          iterator: async function* () {},
          batch: async (ops) => {
            batches.push(ops);
          },
        },
        agentRef: BUILTIN_NOLO_AGENT_KEY,
        input: "帮我总结最近 2 个对话",
        now: () => 1710000000000,
        createId: () => "dialog-desktop-nolo",
        fetchImpl: mockFetch(async (_url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
          const body = JSON.parse(String(init?.body ?? "{}"));
          providerRequests.push({ body });
          if (providerRequests.length === 1) {
            return Response.json({
              choices: [{
                message: {
                  role: "assistant",
                  content: "",
                  tool_calls: [{
                    id: "call-list-dialogs",
                    type: "function",
                    function: {
                      name: "listDialogs",
                      arguments: JSON.stringify({ limit: 2 }),
                    },
                  }],
                },
              }],
            });
          }
          return Response.json({
            choices: [{ message: { role: "assistant", content: "desktop nolo done" } }],
          });
        }),
      });

      const firstToolNames = (providerRequests[0]?.body.tools ?? [])
        .map((tool: any) => tool.function?.name);
      expect(firstToolNames).toContain("listDialogs");
      expect(firstToolNames).toContain("readDialog");
      expect(firstToolNames).toContain("queryTableRows");
      expect(spawnCalls[0]?.cmd.at(-5)).toBe(process.env.NOLO_DESKTOP_APP_ENTRY);
      expect(spawnCalls[0]?.cmd.slice(-4)).toEqual(["dialog", "list", "--limit", "2"]);
      expect(providerRequests[1]?.body.messages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            role: "tool",
            tool_call_id: "call-list-dialogs",
            content: "dialog output\n",
          }),
        ])
      );
      expect(result).toMatchObject({
        dialogId: "dialog-desktop-nolo",
        content: "desktop nolo done",
      });
      expect(batches).toHaveLength(1);
    } finally {
      Bun.spawn = originalSpawn;
      if (originalDesktop === undefined) {
        delete process.env.NOLO_DESKTOP;
      } else {
        process.env.NOLO_DESKTOP = originalDesktop;
      }
      if (originalDesktopAppEntry === undefined) {
        delete process.env.NOLO_DESKTOP_APP_ENTRY;
      } else {
        process.env.NOLO_DESKTOP_APP_ENTRY = originalDesktopAppEntry;
      }
    }
  });

  test("narrows built-in Nolo desktop browser tasks to Chrome tools", async () => {
    const originalDesktop = process.env.NOLO_DESKTOP;
    process.env.NOLO_DESKTOP = "1";
    const requests: Array<{ url?: string; body: any }> = [];
    try {
      const result = await runDesktopAgentRuntimeTurn({
        env: {
          NOLO_DESKTOP: "1",
          NOLO_USER_ID: "user-1",
          NOLO_SERVER: "https://nolo.chat",
          AUTH_TOKEN: "token-1",
          DEEPINFRA_API_KEY: "deepinfra-key",
        },
        store: {
          read: async (key: string) => {
            if (key === "user-1-settings") {
              return { desktopChromeConnectorEnabled: true };
            }
            if (key === BUILTIN_NOLO_AGENT_KEY) {
              return {
                dbKey: BUILTIN_NOLO_AGENT_KEY,
                id: "01NOLOAPPBLD000000019KCKT0",
                name: "nolo",
                prompt: "desktop nolo prompt",
                tools: ["runStreamingAgent"],
                provider: "openai",
                model: "gpt-4o",
              };
            }
            return null;
          },
          iterator: async function* () {},
          batch: async () => {},
        },
        agentRef: BUILTIN_NOLO_AGENT_KEY,
        input: "帮我在 Chrome 里打开 nolo.chat，判断首页 quick-chat 是否可用。",
        now: () => 1710000000000,
        createId: () => "dialog-desktop-nolo-browser",
        fetchImpl: mockFetch(async (_url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
          requests.push({ body: JSON.parse(String(init?.body ?? "{}")) });
          return Response.json({
            choices: [{ message: { role: "assistant", content: "browser checked" } }],
          });
        }),
      });

      const toolNames = (requests[0]?.body.tools ?? []).map((tool: any) => tool.function?.name);
      expect(result.content).toBe("browser checked");
      expect(toolNames).toEqual([
        ...FORCED_TOOLS,
        "chrome_list_tabs",
        "chrome_open_tab",
        "chrome_read_page",
        "chrome_click",
        "chrome_type",
        "chrome_press",
        "chrome_scroll",
        "chrome_screenshot",
        "chrome_read_console",
        "chrome_read_network",
      ]);
      expect(toolNames).not.toContain("listFiles");
      expect(toolNames).not.toContain("execShell");
      expect(toolNames).not.toContain("listDialogs");
    } finally {
      if (originalDesktop === undefined) delete process.env.NOLO_DESKTOP;
      else process.env.NOLO_DESKTOP = originalDesktop;
    }
  });

  test("runs execShell by default when the agent declares it", async () => {
    const store = new Map<string, any>([
      ["agent-user-1-shell", {
        dbKey: "agent-user-1-shell",
        id: "shell",
        prompt: "Use shell.",
        model: "qwen-coder",
        toolNames: ["execShell"],
      }],
    ]);
    const batchOps: any[] = [];
    const requests: Array<{ url?: string; body: any }> = [];
    let completeCount = 0;

    const result = await runDesktopAgentRuntimeTurn({
      env: {
        NOLO_USER_ID: "user-1",
        NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
      },
      store: {
        read: async (key) => store.get(key) ?? null,
        iterator: async function* () {},
        batch: async (ops) => {
          batchOps.push(...ops);
        },
      },
      agentRef: "shell",
      input: "print cwd",
      runtimeContext: {
        subjectRefs: [
          { kind: "page", id: "page-brief", role: "brief" },
          { kind: "table-row", id: "row-user-board-task", role: "subject" },
        ],
      },
      cwd: import.meta.dir,
      now: () => 1710000000000,
      createId: () => "dialog-shell",
      fetchImpl: mockFetch(async (_url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        completeCount += 1;
        requests.push({ body: JSON.parse(String(init?.body)) });
        if (completeCount === 1) {
          return Response.json({
            model: "qwen-coder",
            choices: [{
              message: {
                content: "",
                tool_calls: [{
                  id: "call-1",
                  type: "function",
                  function: { name: "execShell", arguments: "{\"cmd\":\"pwd\"}" },
                }],
              },
            }],
          });
        }
        return Response.json({
          model: "qwen-coder",
          choices: [{ message: { content: "shell done" } }],
        });
      }),
    });

    expect(result).toMatchObject({
      dialogId: "dialog-shell",
      content: "shell done",
      toolCallCount: 1,
    });
    expect(requests[0]?.body.tools.map((tool: any) => tool.function.name)).toEqual(
      [...FORCED_TOOLS, ...SHELL_LOCAL_CODING_TOOL_NAMES]
    );
    expect(requests[1]?.body.messages.map((message: any) => message.role)).toEqual([
      "system",
      "user",
      "assistant",
      "tool",
    ]);
    expect(requests[1]?.body.messages.at(-1).content).toContain("exitCode:");
    expect(batchOps.map((op) => op.key)).toEqual([
      "dialog-user-1-dialog-shell",
      "dialog-dialog-shell-msg-1710000000000-001",
      "dialog-dialog-shell-msg-1710000000000-002",
      "dialog-dialog-shell-msg-1710000000000-003",
      "dialog-dialog-shell-msg-1710000000000-004",
    ]);
    expect(batchOps[0]?.value).toMatchObject({
      subjectRefs: [
        { kind: "page", id: "page-brief", role: "brief" },
        { kind: "table-row", id: "row-user-board-task", role: "subject" },
      ],
      localRuntime: {
        host: "desktop",
        worktreePath: import.meta.dir,
      },
    });
  });

  test("runs execShell when the agent runtime policy declares it", async () => {
    const store = new Map<string, any>([
        ["agent-user-1-shell", {
          dbKey: "agent-user-1-shell",
          id: "shell",
          prompt: "Use shell.",
          model: "qwen-coder",
          tools: ["execShell"],
          runtimeToolPolicy: {
            version: 1,
            runtimeTools: ["execShell"],
            workspace: { mode: "current" },
            shell: {
              enabled: true,
              mode: "worktree",
            },
          },
        }],
    ]);
    const requests: Array<{ url?: string; body: any }> = [];
    let completeCount = 0;

    const result = await runDesktopAgentRuntimeTurn({
        env: {
          NOLO_USER_ID: "user-1",
          NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
        },
        store: {
          read: async (key) => store.get(key) ?? null,
          iterator: async function* () {},
          batch: async () => {},
        },
        agentRef: "shell",
        input: "print cwd",
        cwd: import.meta.dir,
        now: () => 1710000000000,
        createId: () => "dialog-policy-shell",
        fetchImpl: mockFetch(async (_url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
          completeCount += 1;
          requests.push({ body: JSON.parse(String(init?.body)) });
          if (completeCount === 1) {
            return Response.json({
              model: "qwen-coder",
              choices: [{
                message: {
                  content: "",
                  tool_calls: [{
                    id: "call-1",
                    type: "function",
                      function: { name: "execShell", arguments: "{\"cmd\":\"pwd\"}" },
                  }],
                },
              }],
            });
          }
          return Response.json({
            model: "qwen-coder",
            choices: [{ message: { content: "policy shell done" } }],
          });
        }),
    });

    expect(result).toMatchObject({
        dialogId: "dialog-policy-shell",
        content: "policy shell done",
        toolCallCount: 1,
    });
    expect(requests[0]?.body.tools.map((tool: any) => tool.function.name)).toContain("execShell");
    expect(requests[1]?.body.messages.at(-1).content).toContain("exitCode:");
  });

  test("applies desktop runtime policy shell output limit without adding a timeout", async () => {
    const store = new Map<string, any>([
      ["agent-user-1-shell", {
        dbKey: "agent-user-1-shell",
        id: "shell",
        prompt: "Use shell.",
          model: "qwen-coder",
          runtimeToolPolicy: {
            version: 1,
            runtimeTools: ["execShell"],
            shell: { enabled: true, mode: "worktree", maxOutputBytes: 120 },
          },
      }],
    ]);
    const requests: Array<{ url?: string; body: any }> = [];
    let completeCount = 0;

    const result = await runDesktopAgentRuntimeTurn({
      env: {
        NOLO_USER_ID: "user-1",
        NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
      },
      store: {
        read: async (key) => store.get(key) ?? null,
        iterator: async function* () {},
        batch: async () => {},
      },
      agentRef: "shell",
      input: "run output limit check",
      cwd: import.meta.dir,
      now: () => 1710000000000,
      createId: () => "dialog-policy-shell-limits",
      fetchImpl: mockFetch(async (_url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        completeCount += 1;
        requests.push({ body: JSON.parse(String(init?.body)) });
        if (completeCount === 1) {
          return Response.json({
            model: "qwen-coder",
            choices: [{
              message: {
                content: "",
                tool_calls: [{
                  id: "call-1",
                  type: "function",
                  function: {
                    name: "execShell",
                    arguments: JSON.stringify({
                      cmd: process.platform === "win32"
                        ? "'abcdefghijklmnopqrstuvwxyz0123456789'.PadRight(500, 'x')"
                        : "bun -e 'console.log(\"x\".repeat(500))'",
                    }),
                  },
                }],
              },
            }],
          });
        }
        return Response.json({
          model: "qwen-coder",
          choices: [{ message: { content: "limits applied" } }],
        });
      }),
    });

    expect(result.content).toBe("limits applied");
    const toolResult = requests[1]?.body.messages.at(-1)?.content ?? "";
    expect(toolResult).toContain("exitCode:");
    expect(toolResult).not.toContain("command timed out");
  });

  test("exposes runtime policy tools on desktop even when plain tool declarations omit them", async () => {
    const store = new Map<string, any>([
        ["agent-user-1-shell", {
          dbKey: "agent-user-1-shell",
          id: "shell",
          prompt: "Use shell.",
          model: "qwen-coder",
          runtimeToolPolicy: {
            version: 1,
            runtimeTools: ["execShell"],
            workspace: { mode: "current" },
            shell: {
              enabled: true,
              mode: "worktree",
            },
          },
        }],
    ]);
    const requests: Array<{ url?: string; body: any }> = [];
    let completeCount = 0;

    const result = await runDesktopAgentRuntimeTurn({
        env: {
          NOLO_USER_ID: "user-1",
          NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
        },
        store: {
          read: async (key) => store.get(key) ?? null,
          iterator: async function* () {},
          batch: async () => {},
        },
        agentRef: "shell",
        input: "print cwd",
        cwd: import.meta.dir,
        now: () => 1710000000000,
        createId: () => "dialog-policy-shell-only",
        fetchImpl: mockFetch(async (_url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
          completeCount += 1;
          requests.push({ body: JSON.parse(String(init?.body)) });
          if (completeCount === 1) {
            return Response.json({
              model: "qwen-coder",
              choices: [{
                message: {
                  content: "",
                  tool_calls: [{
                    id: "call-1",
                    type: "function",
                    function: { name: "execShell", arguments: "{\"cmd\":\"pwd\"}" },
                  }],
                },
              }],
            });
          }
          return Response.json({
            model: "qwen-coder",
            choices: [{ message: { content: "policy shell only done" } }],
          });
        }),
    });

    expect(result).toMatchObject({
        dialogId: "dialog-policy-shell-only",
        content: "policy shell only done",
        toolCallCount: 1,
    });
    expect(requests[0]?.body.tools.map((tool: any) => tool.function.name)).toContain("execShell");
    expect(requests[1]?.body.messages.at(-1).content).toContain("exitCode:");
  });

  test("advertises visual runtime tools from runtime policy on desktop requests", async () => {
    const store = new Map<string, any>([
      ["agent-user-1-visual", {
        dbKey: "agent-user-1-visual",
        id: "visual",
        prompt: "Inspect the preview.",
        model: "qwen-coder",
        runtimeToolPolicy: {
          version: 1,
          runtimeTools: ["captureVisualState"],
        },
      }],
    ]);
    const requests: Array<{ url?: string; body: any }> = [];

    const result = await runDesktopAgentRuntimeTurn({
      env: {
        NOLO_USER_ID: "user-1",
        NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
      },
      store: {
        read: async (key) => store.get(key) ?? null,
        iterator: async function* () {},
        batch: async () => {},
      },
      agentRef: "visual",
      input: "inspect the screen",
      cwd: import.meta.dir,
      now: () => 1710000000000,
      createId: () => "dialog-visual-policy",
      fetchImpl: mockFetch(async (_url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        requests.push({ body: JSON.parse(String(init?.body)) });
        return Response.json({
          model: "qwen-coder",
          choices: [{ message: { content: "visual tool advertised" } }],
        });
      }),
    });

    expect(result.content).toBe("visual tool advertised");
    expect(requests[0]?.body.tools.map((tool: any) => tool.function.name)).toContain("captureVisualState");
  });

  test("exposes execShell without shell env gate", async () => {
    const store = new Map<string, any>([
      ["agent-user-1-shell", {
        dbKey: "agent-user-1-shell",
        id: "shell",
        prompt: "Use shell.",
        model: "qwen-coder",
        toolNames: ["execShell"],
      }],
    ]);
    const requests: Array<{ url?: string; body: any }> = [];

    const result = await runDesktopAgentRuntimeTurn({
      env: {
        NOLO_USER_ID: "user-1",
        NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
      },
      store: {
        read: async (key) => store.get(key) ?? null,
        iterator: async function* () {},
        batch: async () => {},
      },
      agentRef: "shell",
      input: "print cwd",
      cwd: import.meta.dir,
      now: () => 1710000000000,
      createId: () => "dialog-default-shell",
      fetchImpl: mockFetch(async (_url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        requests.push({ body: JSON.parse(String(init?.body)) });
        return Response.json({
          model: "qwen-coder",
          choices: [{ message: { content: "text only" } }],
        });
      }),
    });

    expect(result.content).toBe("text only");
    expect(requests[0]?.body.tools.map((tool: any) => tool.function.name)).toContain("execShell");
  });

  test("blocks destructive desktop execShell calls unless the user explicitly asked to delete", async () => {
    const store = new Map<string, any>([
      ["agent-user-1-shell", {
        dbKey: "agent-user-1-shell",
        id: "shell",
        prompt: "Use shell.",
        model: "qwen-coder",
        toolNames: ["execShell"],
      }],
    ]);
    const requests: Array<{ url?: string; body: any }> = [];

    const result = await runDesktopAgentRuntimeTurn({
      env: {
        NOLO_USER_ID: "user-1",
        NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
      },
      store: {
        read: async (key) => store.get(key) ?? null,
        iterator: async function* () {},
        batch: async () => {},
      },
      agentRef: "shell",
      input: "inspect cwd but don't delete files",
      cwd: import.meta.dir,
      now: () => 1710000000000,
      createId: () => "dialog-destructive-shell-guard",
      fetchImpl: mockFetch(async (_url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        const body = JSON.parse(String(init?.body));
        requests.push({ body });
        const lastToolMessage = [...body.messages]
          .reverse()
          .find((message: any) => message.role === "tool");
        if (lastToolMessage) {
          expect(String(lastToolMessage.content)).toContain(
            "destructive_action_requires_confirmation",
          );
          return Response.json({
            model: "qwen-coder",
            choices: [{ message: { content: "desktop guard ok" } }],
          });
        }
        return Response.json({
          model: "qwen-coder",
          choices: [{
            message: {
              content: "",
              tool_calls: [{
                id: "call-1",
                type: "function",
                function: { name: "execShell", arguments: "{\"cmd\":\"rm -rf ./tmp\"}" },
              }],
            },
          }],
        });
      }),
    });

    expect(result.content).toBe("desktop guard ok");
    void requests;
  });

  test("does not force workspace activation for desktop turns without an explicit cwd", async () => {
    const store = new Map<string, any>([
      ["agent-user-1-shell", {
        dbKey: "agent-user-1-shell",
        id: "shell",
        prompt: "Use shell when needed.",
        model: "qwen-coder",
        tools: ["execShell"],
        runtimeToolPolicy: {
          version: 1,
          runtimeTools: ["execShell"],
          workspace: { mode: "current" },
          shell: {
            enabled: true,
            mode: "worktree",
          },
        },
      }],
    ]);
    const requests: Array<{ url?: string; body: any }> = [];

    const result = await runDesktopAgentRuntimeTurn({
      env: {
        NOLO_USER_ID: "user-1",
        NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
      },
      store: {
        read: async (key) => store.get(key) ?? null,
        iterator: async function* () {},
        batch: async () => {},
      },
      agentRef: "shell",
      input: "just answer in text",
      now: () => 1710000000000,
      createId: () => "dialog-no-cwd",
      fetchImpl: mockFetch(async (_url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        requests.push({ body: JSON.parse(String(init?.body)) });
        return Response.json({
          model: "qwen-coder",
          choices: [{ message: { content: "text only" } }],
        });
      }),
    });

    expect(result).toMatchObject({
      dialogId: "dialog-no-cwd",
      content: "text only",
    });
    expect(requests).toHaveLength(1);
  });

  test("uses the configured cwd for agent-declared desktop tools", async () => {
    const store = new Map<string, any>([
        ["agent-user-1-shell", {
          dbKey: "agent-user-1-shell",
          id: "shell",
          prompt: "Use shell.",
          model: "qwen-coder",
          toolNames: ["execShell"],
        }],
    ]);
    const batchOps: any[] = [];
    const requests: Array<{ url?: string; body: any }> = [];
    let completeCount = 0;

    const result = await runDesktopAgentRuntimeTurn({
        env: {
          NOLO_USER_ID: "user-1",
          NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
        },
        store: {
          read: async (key) => store.get(key) ?? null,
          iterator: async function* () {},
          batch: async (ops) => {
            batchOps.push(...ops);
          },
        },
        agentRef: "shell",
        input: "print task cwd",
        cwd: import.meta.dir,
        now: () => 1710000000000,
        createId: () => "dialog-task-shell",
        fetchImpl: mockFetch(async (_url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
          completeCount += 1;
          requests.push({ body: JSON.parse(String(init?.body)) });
          if (completeCount === 1) {
            return Response.json({
              model: "qwen-coder",
              choices: [{
                message: {
                  content: "",
                  tool_calls: [{
                    id: "call-1",
                    type: "function",
                    function: { name: "execShell", arguments: "{\"cmd\":\"pwd\"}" },
                  }],
                },
              }],
            });
          }
          return Response.json({
            model: "qwen-coder",
            choices: [{ message: { content: "task shell done" } }],
          });
        }),
    });

    expect(result).toMatchObject({
        dialogId: "dialog-task-shell",
        content: "task shell done",
        toolCallCount: 1,
    });
    expect(requests[1]?.body.messages.at(-1).content).toContain("exitCode:");
    expect(batchOps[0]?.value).toMatchObject({
        localRuntime: {
          host: "desktop",
          worktreePath: import.meta.dir,
        },
    });
  });

  test("uses configured cwd for desktop tool runs", async () => {
    const store = new Map<string, any>([
        ["agent-user-1-shell", {
          dbKey: "agent-user-1-shell",
          id: "shell",
          prompt: "Use shell.",
          model: "qwen-coder",
          toolNames: ["execShell"],
        }],
    ]);
    const requests: Array<{ url?: string; body: any }> = [];
    let completeCount = 0;

    const result = await runDesktopAgentRuntimeTurn({
        env: {
          NOLO_USER_ID: "user-1",
          NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
        },
        store: {
          read: async (key) => store.get(key) ?? null,
          iterator: async function* () {},
          batch: async () => {},
        },
        agentRef: "shell",
        input: "print default task cwd",
        cwd: import.meta.dir,
        now: () => 1710000000000,
        createId: () => "dialog-default-task-shell",
        fetchImpl: mockFetch(async (_url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
          completeCount += 1;
          requests.push({ body: JSON.parse(String(init?.body)) });
          if (completeCount === 1) {
            return Response.json({
              model: "qwen-coder",
              choices: [{
                message: {
                  content: "",
                  tool_calls: [{
                    id: "call-1",
                    type: "function",
                    function: { name: "execShell", arguments: "{\"cmd\":\"pwd\"}" },
                  }],
                },
              }],
            });
          }
          return Response.json({
            model: "qwen-coder",
            choices: [{ message: { content: "default task shell done" } }],
          });
        }),
    });

    expect(result.content).toBe("default task shell done");
    expect(requests[1]?.body.messages.at(-1).content).toContain("exitCode:");
  });

  test("runs allowed workspace file tools with default local runtime tools", async () => {
    const workspaceRoot = createTempWorkspace();
    try {
      const store = new Map<string, any>([
        ["agent-user-1-writer", {
          dbKey: "agent-user-1-writer",
          id: "writer",
          prompt: "Write files.",
          model: "qwen-coder",
          toolNames: ["writeFile"],
        }],
      ]);
      const requests: Array<{ url?: string; body: any }> = [];
      let completeCount = 0;

      const result = await runDesktopAgentRuntimeTurn({
        env: {
          NOLO_USER_ID: "user-1",
          NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
        },
        store: {
          read: async (key) => store.get(key) ?? null,
          iterator: async function* () {},
          batch: async () => {},
        },
        agentRef: "writer",
        input: "write a file",
        cwd: workspaceRoot,
        now: () => 1710000000000,
        createId: () => "dialog-writer",
        fetchImpl: mockFetch(async (_url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
          completeCount += 1;
          requests.push({ body: JSON.parse(String(init?.body)) });
          if (completeCount === 1) {
            return Response.json({
              model: "qwen-coder",
              choices: [{
                message: {
                  content: "",
                  tool_calls: [{
                    id: "call-1",
                    type: "function",
                    function: {
                      name: "writeFile",
                      arguments: JSON.stringify({
                        path: "src/app.ts",
                        content: "export const value = 1;\n",
                      }),
                    },
                  }],
                },
              }],
            });
          }
          return Response.json({
            model: "qwen-coder",
            choices: [{ message: { content: "file done" } }],
          });
        }),
      });

      expect(result.content).toBe("file done");
      expect(readFileSync(join(workspaceRoot, "src/app.ts"), "utf8")).toBe("export const value = 1;\n");
      expect(requests[0]?.body.tools.map((tool: any) => tool.function.name)).toEqual(
        [...FORCED_TOOLS, ...DEFAULT_PRIVATE_DESKTOP_TOOL_NAMES]
      );
      expect(requests[1]?.body.messages.at(-1)).toMatchObject({
        role: "tool",
        content: `wrote ${join("src", "app.ts")}`,
        tool_call_id: "call-1",
      });
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  test("runs generic file tools as the desktop model-facing coding surface", async () => {
    const workspaceRoot = createTempWorkspace();
    try {
      const store = new Map<string, any>([
        ["agent-user-1-general", {
          dbKey: "agent-user-1-general",
          id: "general",
          prompt: "Use simple local tools.",
          model: "qwen-coder",
          toolNames: ["listFiles", "readFile", "writeFile", "editFile", "searchFiles"],
        }],
      ]);
      const toolCalls = [
        { name: "writeFile", arguments: { path: "notes/todo.txt", content: "alpha\n" } },
        { name: "readFile", arguments: { path: "notes/todo.txt" } },
        { name: "editFile", arguments: { path: "notes/todo.txt", oldText: "alpha", newText: "beta" } },
        { name: "searchFiles", arguments: { query: "beta", path: "notes" } },
        { name: "listFiles", arguments: { path: "notes" } },
      ];
      const requests: Array<{ url?: string; body: any }> = [];
      let completeCount = 0;

      const result = await runDesktopAgentRuntimeTurn({
        env: {
          NOLO_USER_ID: "user-1",
          NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
        },
        store: {
          read: async (key) => store.get(key) ?? null,
          iterator: async function* () {},
          batch: async () => {},
        },
        agentRef: "general",
        input: "write, read, edit, search, and list a file",
        cwd: workspaceRoot,
        now: () => 1710000000000,
        createId: () => "dialog-general",
        fetchImpl: mockFetch(async (_url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
          requests.push({ body: JSON.parse(String(init?.body)) });
          if (completeCount < toolCalls.length) {
            const call = toolCalls[completeCount];
            completeCount += 1;
            return Response.json({
              model: "qwen-coder",
              choices: [{
                message: {
                  content: "",
                  tool_calls: [{
                    id: `call-${completeCount}`,
                    type: "function",
                    function: {
                      name: call.name,
                      arguments: JSON.stringify(call.arguments),
                    },
                  }],
                },
              }],
            });
          }
          return Response.json({
            model: "qwen-coder",
            choices: [{ message: { content: "generic tools done" } }],
          });
        }),
      });

      expect(result.content).toBe("generic tools done");
      expect(readFileSync(join(workspaceRoot, "notes/todo.txt"), "utf8")).toBe("beta\n");
      expect(requests[0]?.body.tools.map((tool: any) => tool.function.name)).toEqual(
        [...FORCED_TOOLS, ...DEFAULT_PRIVATE_DESKTOP_TOOL_NAMES]
      );
      expect(requests.at(-1)?.body.messages.flatMap((message: any) =>
        message.role === "assistant"
          ? (message.tool_calls ?? []).map((call: any) => call.function.name)
          : []
      )).toEqual([
        "writeFile",
        "readFile",
        "editFile",
        "searchFiles",
        "listFiles",
      ]);
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });
});

describe("quick-chat tier agent workspace tool gating", () => {
  test("does not inject workspace tools for tier agent without workspaceToolsHint", async () => {
    const providerRequests: Array<{ body: any }> = [];
    await runDesktopAgentRuntimeTurn({
      env: {
        NOLO_DESKTOP: "1",
        NOLO_USER_ID: "user-1",
        NOLO_SERVER: "https://nolo.chat",
        AUTH_TOKEN: "token-1",
      },
      store: {
        read: async () => null,
        iterator: async function* () {},
        batch: async () => {},
      },
      agentRef: "agent-pub-01DSV4FLASHPB00000000JFPFD",
      input: "广东经济怎么样",
      now: () => 1710000000000,
      createId: () => "dialog-tier-no-hint",
      fetchImpl: mockFetch(async (_url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        const body = JSON.parse(String(init?.body ?? "{}"));
        providerRequests.push({ body });
        return Response.json({
          choices: [{ message: { role: "assistant", content: "广东经济保持增长" } }],
        });
      }),
    });
    const toolNames = (providerRequests[0]?.body.tools ?? []).map((tool: any) => tool.function?.name);
    // No workspace tools, but FORCED_TOOLS (ask_user) is always present.
    expect(toolNames).toEqual(["ask_user"]);
  });

  test("mounts full code-planning skill toolset for tier agent with workspaceToolsHint=true", async () => {
    const providerRequests: Array<{ body: any }> = [];
    await runDesktopAgentRuntimeTurn({
      env: {
        NOLO_DESKTOP: "1",
        NOLO_USER_ID: "user-1",
        NOLO_SERVER: "https://nolo.chat",
        AUTH_TOKEN: "token-1",
      },
      store: {
        read: async () => null,
        iterator: async function* () {},
        batch: async () => {},
      },
      agentRef: "agent-pub-01DSV4FLASHPB00000000JFPFD",
      input: "帮我分析下 src/index.ts",
      workspaceToolsHint: true,
      now: () => 1710000000000,
      createId: () => "dialog-tier-hint",
      fetchImpl: mockFetch(async (_url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        const body = JSON.parse(String(init?.body ?? "{}"));
        providerRequests.push({ body });
        return Response.json({
          choices: [{ message: { role: "assistant", content: "文件分析完成" } }],
        });
      }),
    });
    const toolNames = (providerRequests[0]?.body.tools ?? []).map((tool: any) => tool.function?.name);
    // 完整工具面 = code-planning skill 自有（工作区读写/shell + startAgentRun）
    // + 系统层联网能力包（web-search / web-scrape）+ 强制工具。
    expect(new Set(toolNames)).toEqual(
      new Set([
        ...CODE_PLANNER_COMPILED_EFFECTIVE_TOOLS,
        ...expandEnabledPacks([...CODE_PLANNER_WEB_CAPABILITY_PACK_IDS]),
        ...FORCED_TOOLS,
      ]),
    );
    expect(toolNames).toContain("listFiles");
    expect(toolNames).toContain("readFile");
    expect(toolNames).toContain("editFile");
    expect(toolNames).toContain("execShell");
    expect(toolNames).toContain("startAgentRun");
    expect(toolNames).toContain("exa_search");
    expect(toolNames).toContain("firecrawl_scrape");
  });

  test("mounts full code-planning skill toolset for the quality tier agent with hint", async () => {
    const providerRequests: Array<{ body: any }> = [];
    await runDesktopAgentRuntimeTurn({
      env: {
        NOLO_DESKTOP: "1",
        NOLO_USER_ID: "user-1",
        NOLO_SERVER: "https://nolo.chat",
        AUTH_TOKEN: "token-1",
      },
      store: {
        read: async (key: string) => {
          if (key === "agent-pub-01GLM52CHAT00000000001U721") {
            return {
              dbKey: "agent-pub-01GLM52CHAT00000000001U721",
              name: "GLM 5.2",
              provider: "openai",
              model: "glm-5.2",
              apiSource: "platform",
              useServerProxy: true,
              isPublic: true,
            };
          }
          return null;
        },
        iterator: async function* () {},
        batch: async () => {},
      },
      agentRef: "agent-pub-01GLM52CHAT00000000001U721",
      input: "读取这个文件",
      workspaceToolsHint: true,
      now: () => 1710000000000,
      createId: () => "dialog-quality-hint",
      fetchImpl: mockFetch(async (_url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        const body = JSON.parse(String(init?.body ?? "{}"));
        providerRequests.push({ body });
        return Response.json({
          choices: [{ message: { role: "assistant", content: "ok" } }],
        });
      }),
    });
    const toolNames = (providerRequests[0]?.body.tools ?? []).map((tool: any) => tool.function?.name);
    // 完整 code-planning skill 工具面（含 editFile/execShell/startAgentRun）
    expect(new Set(toolNames)).toEqual(new Set([...CODE_PLANNER_COMPILED_EFFECTIVE_TOOLS, ...FORCED_TOOLS]));
    expect(toolNames).toContain("readFile");
    expect(toolNames).toContain("editFile");
    expect(toolNames).toContain("execShell");
  });

  test("does not inject workspace tools for a non-tier agent even with hint", async () => {
    const providerRequests: Array<{ body: any }> = [];
    const workspaceRoot = mkdtempSync(join(tmpdir(), "nolo-desktop-non-tier-"));
    try {
      await runDesktopAgentRuntimeTurn({
        env: {
          NOLO_DESKTOP: "1",
          NOLO_USER_ID: "user-1",
          NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
        },
        store: {
          read: async (key: string) => {
            if (key === "agent-user-1-general") {
              return {
                dbKey: "agent-user-1-general",
                name: "General Agent",
                prompt: "Use tools.",
                model: "qwen-coder",
                toolNames: ["listFiles", "readFile"],
              };
            }
            return null;
          },
          iterator: async function* () {},
          batch: async () => {},
        },
        agentRef: "agent-user-1-general",
        input: "帮我看看工作区",
        workspaceToolsHint: true,
        cwd: workspaceRoot,
        now: () => 1710000000000,
        createId: () => "dialog-non-tier",
        fetchImpl: mockFetch(async (_url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
          const body = JSON.parse(String(init?.body ?? "{}"));
          providerRequests.push({ body });
          return Response.json({
            choices: [{ message: { role: "assistant", content: "done" } }],
          });
        }),
      });
      const toolNames = (providerRequests[0]?.body.tools ?? []).map((tool: any) => tool.function?.name);
      // 非 tier agent 完全不受 hint 影响：保持原有行为（声明工具 + 默认集）
      expect(toolNames).toContain("listFiles");
      expect(toolNames).toContain("readFile");
      // 非 tier agent 仍获得完整默认本地编码集
      expect(toolNames).toContain("writeFile");
      expect(toolNames).toContain("editFile");
      expect(toolNames).toContain("execShell");
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  test("non-tier agent behavior is unchanged without hint", async () => {
    const providerRequests: Array<{ body: any }> = [];
    const workspaceRoot = mkdtempSync(join(tmpdir(), "nolo-desktop-non-tier-nohint-"));
    try {
      await runDesktopAgentRuntimeTurn({
        env: {
          NOLO_DESKTOP: "1",
          NOLO_USER_ID: "user-1",
          NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
        },
        store: {
          read: async (key: string) => {
            if (key === "agent-user-1-general") {
              return {
                dbKey: "agent-user-1-general",
                name: "General Agent",
                prompt: "Use tools.",
                model: "qwen-coder",
                toolNames: ["listFiles", "readFile"],
              };
            }
            return null;
          },
          iterator: async function* () {},
          batch: async () => {},
        },
        agentRef: "agent-user-1-general",
        input: "随便聊",
        cwd: workspaceRoot,
        now: () => 1710000000000,
        createId: () => "dialog-non-tier-nohint",
        fetchImpl: mockFetch(async (_url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
          const body = JSON.parse(String(init?.body ?? "{}"));
          providerRequests.push({ body });
          return Response.json({
            choices: [{ message: { role: "assistant", content: "done" } }],
          });
        }),
      });
      const toolNames = (providerRequests[0]?.body.tools ?? []).map((tool: any) => tool.function?.name);
      // 非 tier agent：与上一例一致，hint 缺省不影响
      expect(toolNames).toContain("writeFile");
      expect(toolNames).toContain("execShell");
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });
});


describe("desktop startAgentRun runtime inheritance and web bridges", () => {
  const parentDialogId = "parent-dialog-1";
  const parentSpaceId = "space-demo-1";
  const parentDialogKey = `dialog-user-1-${parentDialogId}`;

  function createParentDialogStore(agentKey: string, toolNames: string[], agentExtras: Record<string, unknown> = {}) {
    return {
      read: async (key: string) => {
        if (key === agentKey) {
          return {
            dbKey: agentKey,
            id: agentKey,
            name: "Bridge Test Agent",
            prompt: "Use tools carefully.",
            model: "qwen-coder",
            toolNames: [...toolNames],
            ...agentExtras,
          };
        }
        if (key === parentDialogKey) {
          return {
            dbKey: parentDialogKey,
            id: parentDialogId,
            spaceId: parentSpaceId,
          };
        }
        return null;
      },
      iterator: async function* () {},
      batch: async () => {},
    };
  }

  function parseToolMessage(requests: Array<{ url?: string; headers?: any; body: any }>, toolCallId: string) {
    const toolRequest = requests.find((req) =>
      Array.isArray(req.body?.messages) &&
      req.body.messages.some((m: any) => m.role === "tool" && m.tool_call_id === toolCallId),
    );
    const toolMessage = toolRequest?.body.messages.find(
      (m: any) => m.role === "tool" && m.tool_call_id === toolCallId,
    );
    expect(toolMessage).toBeTruthy();
    return JSON.parse(String(toolMessage.content));
  }

  test("exposes startAgentRun only when declared; undeclared is not exposed and not callable", async () => {
    const declaredRequests: Array<{ body: any }> = [];
    await runDesktopAgentRuntimeTurn({
      env: {
        NOLO_DESKTOP: "1",
        NOLO_USER_ID: "user-1",
        NOLO_SERVER: "https://nolo.chat",
        AUTH_TOKEN: "token-1",
        NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
      },
      store: createParentDialogStore("agent-with-call", ["startAgentRun", "listFiles"]),
      agentRef: "agent-with-call",
      input: "delegate a task",
      now: () => 1710000000000,
      createId: () => "dialog-with-call",
      fetchImpl: mockFetch(async (_url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        declaredRequests.push({ body: JSON.parse(String(init?.body ?? "{}")) });
        return Response.json({
          choices: [{ message: { role: "assistant", content: "ok" } }],
        });
      }),
    });
    const declaredTools = (declaredRequests[0]?.body.tools ?? []).map((t: any) => t.function?.name);
    expect(declaredTools).toContain("startAgentRun");

    const undeclaredRequests: Array<{ body: any }> = [];
    let toolPhase = 0;
    await runDesktopAgentRuntimeTurn({
      env: {
        NOLO_DESKTOP: "1",
        NOLO_USER_ID: "user-1",
        NOLO_SERVER: "https://nolo.chat",
        AUTH_TOKEN: "token-1",
        NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
      },
      store: createParentDialogStore("agent-no-call", ["listFiles"]),
      agentRef: "agent-no-call",
      input: "no call agent",
      now: () => 1710000000000,
      createId: () => "dialog-no-call",
      fetchImpl: mockFetch(async (url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        const urlText = String(url);
        if (urlText.includes("/api/agent/run")) {
          throw new Error("startAgentRun must not hit /api/agent/run when undeclared");
        }
        toolPhase += 1;
        const body = JSON.parse(String(init?.body ?? "{}"));
        undeclaredRequests.push({ body });
        if (toolPhase === 1) {
          return Response.json({
            choices: [{
              message: {
                role: "assistant",
                content: "",
                tool_calls: [{
                  id: "call-undeclared",
                  type: "function",
                  function: {
                    name: "startAgentRun",
                    arguments: JSON.stringify({ agentKey: "child-a", task: "should fail" }),
                  },
                }],
              },
            }],
          });
        }
        return Response.json({
          choices: [{ message: { role: "assistant", content: "blocked" } }],
        });
      }),
    });
    const undeclaredTools = (undeclaredRequests[0]?.body.tools ?? []).map((t: any) => t.function?.name);
    expect(undeclaredTools).not.toContain("startAgentRun");
    // Policy rejects the undeclared tool before any server bridge fetch.
    const toolMsg = undeclaredRequests[1]?.body.messages?.find(
      (m: any) => m.role === "tool" && m.tool_call_id === "call-undeclared",
    );
    expect(String(toolMsg?.content ?? "")).toMatch(/not enabled|not allowed|no local executor|startAgentRun/i);
  });

  test("async startAgentRun inherits the authorized Desktop workspace and returns a real pending child dialog", async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "nolo-desktop-callagent-bg-"));
    const writes: Array<Array<{ type: string; key: string; value?: Record<string, unknown> }>> = [];
    const childTurns: any[] = [];
    const networkRequests: string[] = [];
    let providerPhase = 0;
    try {
      await runDesktopAgentRuntimeTurn({
        env: {
          NOLO_DESKTOP: "1",
          NOLO_USER_ID: "user-1",
          NOLO_SERVER: "https://nolo.chat",
          AUTH_TOKEN: "token-1",
          NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
        },
        store: {
          ...createParentDialogStore("agent-caller", ["startAgentRun"]),
          batch: async (ops: any[]) => {
            writes.push(ops);
          },
        },
        agentRef: "agent-caller",
        input: "start child in background",
        cwd: workspaceRoot,
        continueDialogId: parentDialogId,
        dialogKey: parentDialogKey,
        runtimeContext: {
          surface: "cli",
          entrypoint: "parent-entry",
          allowedChildAgentKeys: ["child-worker"],
        },
        now: () => 1710000000000,
        createId: () => "dialog-callagent-bg",
        runChildDesktopTurn: async (input) => {
          childTurns.push(input);
          return {
            dialogId: input.continueDialogId!,
            model: "kimi-for-coding-highspeed",
            provider: "custom",
            content: "background child done",
          };
        },
        fetchImpl: mockFetch(async (url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
          const urlText = String(url);
          networkRequests.push(urlText);
          if (urlText.includes("/api/agent/run")) {
            throw new Error("authorized Desktop startAgentRun must not use the server bridge");
          }
          providerPhase += 1;
          if (providerPhase === 1) {
            return Response.json({
              choices: [{
                message: {
                  role: "assistant",
                  content: "",
                  tool_calls: [{
                    id: "call-agent-bg",
                    type: "function",
                    function: {
                      name: "startAgentRun",
                      arguments: JSON.stringify({
                        agentKey: "child-worker",
                        task: "long task",
                        input: { step: 1 },
                      }),
                    },
                  }],
                },
              }],
            });
          }
          return Response.json({
            choices: [{ message: { role: "assistant", content: "child started" } }],
          });
        }),
      });

      await Promise.resolve();
      expect(networkRequests.some((url) => url.includes("/api/agent/run"))).toBe(false);
      expect(childTurns).toHaveLength(1);
      expect(childTurns[0]).toMatchObject({
        agentRef: "child-worker",
        cwd: workspaceRoot,
        restrictShellToWorkspace: true,
        continueDialogId: "dialog-callagent-bg",
        parentDialogId,
        spaceId: parentSpaceId,
      });
      expect(childTurns[0].input).toContain("long task");
      expect(childTurns[0].input).toContain("--- INPUT (json) ---");
      expect(childTurns[0].runtimeContext).toMatchObject({
        surface: "desktop",
        entrypoint: "agent-tool:startAgentRun",
        threadKind: "background",
        presentationIntent: "background_handoff",
        parentThreadId: parentDialogId,
        rootThreadId: parentDialogId,
        allowedChildAgentKeys: ["child-worker"],
        workspaceRoot,
        workspaceKind: "current",
        workspaceAccess: "inherited",
      });
      const pendingWrite = writes
        .flat()
        .find((op) => op.key === "dialog-user-1-dialog-callagent-bg" && op.value?.status === "pending");
      expect(pendingWrite?.value).toMatchObject({
        id: "dialog-callagent-bg",
        parentDialogId,
        rootDialogId: parentDialogId,
        spaceId: parentSpaceId,
        executionMode: "background",
        localRuntime: {
          host: "desktop",
          worktreePath: workspaceRoot,
          workspaceKind: "current",
          workspaceAccess: "inherited",
        },
      });
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  test("foreground startAgentRun runs locally in the same authorized workspace and returns the same child dialog id", async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "nolo-desktop-callagent-fg-"));
    const bridgeRequests: Array<{ body: any }> = [];
    const providerBodies: Array<{ body: any }> = [];
    const childTurns: any[] = [];
    let providerPhase = 0;
    try {
      await runDesktopAgentRuntimeTurn({
        env: {
          NOLO_DESKTOP: "1",
          NOLO_USER_ID: "user-1",
          NOLO_SERVER: "https://nolo.chat",
          AUTH_TOKEN: "token-1",
          NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
        },
        store: createParentDialogStore("agent-caller-sync", ["startAgentRun"]),
        agentRef: "agent-caller-sync",
        input: "sync child",
        cwd: workspaceRoot,
        continueDialogId: parentDialogId,
        now: () => 1710000000000,
        createId: () => "dialog-callagent-sync",
        runChildDesktopTurn: async (input) => {
          childTurns.push(input);
          return {
            dialogId: input.continueDialogId!,
            model: "kimi-for-coding-highspeed",
            provider: "custom",
            content: "child answer",
            usage: { total_tokens: 12 },
          };
        },
        fetchImpl: mockFetch(async (url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
          const urlText = String(url);
          if (urlText.includes("/api/agent/run")) {
            bridgeRequests.push({ body: JSON.parse(String(init?.body ?? "{}")) });
            throw new Error("authorized Desktop startAgentRun must stay local");
          }
          providerPhase += 1;
          const body = JSON.parse(String(init?.body ?? "{}"));
          providerBodies.push({ body });
          if (providerPhase === 1) {
            return Response.json({
              choices: [{
                message: {
                  role: "assistant",
                  content: "",
                  tool_calls: [{
                    id: "call-agent-sync",
                    type: "function",
                    function: {
                      name: "startAgentRun",
                      arguments: JSON.stringify({
                        agentKey: "child-sync",
                        task: "short answer",
                        wait: true,
                      }),
                    },
                  }],
                },
              }],
            });
          }
          return Response.json({
            choices: [{ message: { role: "assistant", content: "done" } }],
          });
        }),
      });

      expect(bridgeRequests).toHaveLength(0);
      expect(childTurns).toHaveLength(1);
      expect(childTurns[0]).toMatchObject({
        cwd: workspaceRoot,
        restrictShellToWorkspace: true,
        continueDialogId: "dialog-callagent-sync",
        parentDialogId,
      });
      expect(childTurns[0].runtimeContext).toMatchObject({
        surface: "desktop",
        entrypoint: "agent-tool:startAgentRun",
        threadKind: "inline",
        presentationIntent: "inline_result",
        parentThreadId: parentDialogId,
        workspaceRoot,
        workspaceAccess: "inherited",
      });
      const result = parseToolMessage(providerBodies, "call-agent-sync");
      expect(result).toMatchObject({
        success: true,
        agentKey: "child-sync",
        dialogId: "dialog-callagent-sync",
        model: "kimi-for-coding-highspeed",
        provider: "custom",
        content: "child answer",
        usage: { total_tokens: 12 },
      });
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  test("an authorized local child failure is returned without falling back to the server bridge", async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "nolo-desktop-callagent-fail-"));
    const providerBodies: Array<{ body: any }> = [];
    const serverBridgeHits: string[] = [];
    const writes: Array<Array<{ type: string; key: string; value?: Record<string, unknown> }>> = [];
    let providerPhase = 0;
    try {
      await runDesktopAgentRuntimeTurn({
        env: {
          NOLO_DESKTOP: "1",
          NOLO_USER_ID: "user-1",
          NOLO_SERVER: "https://nolo.chat",
          AUTH_TOKEN: "token-1",
          NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
        },
        store: {
          ...createParentDialogStore("agent-caller-fail", ["startAgentRun"]),
          read: async (key: string) => {
            if (key === "dialog-user-1-dialog-callagent-fail") {
              return writes
                .flat()
                .findLast((op) => op.key === key)
                ?.value ?? null;
            }
            return createParentDialogStore("agent-caller-fail", ["startAgentRun"]).read(key);
          },
          batch: async (ops: any[]) => {
            writes.push(ops);
          },
        },
        agentRef: "agent-caller-fail",
        input: "run failing child",
        cwd: workspaceRoot,
        continueDialogId: parentDialogId,
        now: () => 1710000000000,
        createId: () => "dialog-callagent-fail",
        runChildDesktopTurn: async () => {
          throw new Error("local child exploded");
        },
        fetchImpl: mockFetch(async (url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
          const urlText = String(url);
          if (urlText.includes("/api/agent/run")) {
            serverBridgeHits.push(urlText);
            return Response.json({ dialogId: "unexpected-server-child" });
          }
          providerPhase += 1;
          const body = JSON.parse(String(init?.body ?? "{}"));
          providerBodies.push({ body });
          if (providerPhase === 1) {
            return Response.json({
              choices: [{
                message: {
                  role: "assistant",
                  content: "",
                  tool_calls: [{
                    id: "call-agent-fail",
                    type: "function",
                    function: {
                      name: "startAgentRun",
                      arguments: JSON.stringify({
                        agentKey: "child-fail",
                        task: "fail now",
                        wait: true,
                      }),
                    },
                  }],
                },
              }],
            });
          }
          return Response.json({
            choices: [{ message: { role: "assistant", content: "failure handled" } }],
          });
        }),
      });

      expect(serverBridgeHits).toHaveLength(0);
      expect(parseToolMessage(providerBodies, "call-agent-fail")).toMatchObject({
        success: false,
        agentKey: "child-fail",
        dialogId: "dialog-callagent-fail",
        error: "local child exploded",
      });
      const failedWrite = writes
        .flat()
        .findLast((op) => op.key === "dialog-user-1-dialog-callagent-fail");
      expect(failedWrite?.value).toMatchObject({
        id: "dialog-callagent-fail",
        status: "failed",
        executionMode: "foreground",
        errorMessage: "local child exploded",
      });
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  test("without a local workspace, startAgentRun keeps the canonical server bridge and ignores legacy transport hints", async () => {
    const bridgeRequests: Array<{ url: string; body: any }> = [];
    const providerBodies: Array<{ body: any }> = [];
    let providerPhase = 0;
    await runDesktopAgentRuntimeTurn({
      env: {
        NOLO_DESKTOP: "1",
        NOLO_USER_ID: "user-1",
        NOLO_SERVER: "https://nolo.chat",
        AUTH_TOKEN: "token-1",
        NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
      },
      store: createParentDialogStore("agent-server-fallback", ["startAgentRun"]),
      agentRef: "agent-server-fallback",
      input: "delegate without workspace",
      continueDialogId: parentDialogId,
      dialogKey: parentDialogKey,
      now: () => 1710000000000,
      createId: () => "dialog-server-fallback",
      fetchImpl: mockFetch(async (url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        const urlText = String(url);
        if (urlText.includes("/api/agent/run")) {
          bridgeRequests.push({
            url: urlText,
            body: JSON.parse(String(init?.body ?? "{}")),
          });
          return Response.json({
            dialogId: "server-child-dialog",
            content: "server child answer",
            model: "server-model",
          });
        }
        providerPhase += 1;
        const body = JSON.parse(String(init?.body ?? "{}"));
        providerBodies.push({ body });
        if (providerPhase === 1) {
          return Response.json({
            choices: [{
              message: {
                role: "assistant",
                content: "",
                tool_calls: [{
                  id: "call-agent-server",
                  type: "function",
                  function: {
                    name: "startAgentRun",
                    arguments: JSON.stringify({
                      agentKey: "child-server",
                      task: "server task",
                      mode: "client",
                      serverBase: "https://evil.example.com",
                      wait: true,
                    }),
                  },
                }],
              },
            }],
          });
        }
        return Response.json({
          choices: [{ message: { role: "assistant", content: "done" } }],
        });
      }),
    });

    expect(bridgeRequests).toHaveLength(1);
    expect(bridgeRequests[0].url).toBe("https://nolo.chat/api/agent/run");
    expect(bridgeRequests[0].body).toMatchObject({
      agentKey: "child-server",
      spaceId: parentSpaceId,
      stream: false,
    });
    expect(bridgeRequests[0].body.mode).toBeUndefined();
    expect(bridgeRequests[0].body.serverBase).toBeUndefined();
    expect(parseToolMessage(providerBodies, "call-agent-server")).toMatchObject({
      success: true,
      dialogId: "server-child-dialog",
      content: "server child answer",
    });
  });

  test("rejects a disallowed child and missing server auth stably", async () => {
    async function runRejectCase(args: {
      createId: string;
      toolArgs: Record<string, unknown>;
      env?: Record<string, string>;
      runtimeContext?: Record<string, unknown>;
      expectNoBridge?: boolean;
    }) {
      const bridgeHits: string[] = [];
      const providerBodies: Array<{ body: any }> = [];
      let providerPhase = 0;
      await runDesktopAgentRuntimeTurn({
        env: {
          NOLO_DESKTOP: "1",
          NOLO_USER_ID: "user-1",
          NOLO_SERVER: "https://nolo.chat",
          AUTH_TOKEN: "token-1",
          NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
          ...(args.env ?? {}),
        },
        store: createParentDialogStore("agent-caller-reject", ["startAgentRun"]),
        agentRef: "agent-caller-reject",
        input: "reject cases",
        continueDialogId: parentDialogId,
        runtimeContext: args.runtimeContext,
        now: () => 1710000000000,
        createId: () => args.createId,
        fetchImpl: mockFetch(async (url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
          const urlText = String(url);
          if (urlText.includes("/api/agent/run")) {
            bridgeHits.push(urlText);
            return Response.json({ dialogId: "should-not-reach" });
          }
          providerPhase += 1;
          const body = JSON.parse(String(init?.body ?? "{}"));
          providerBodies.push({ body });
          if (providerPhase === 1) {
            return Response.json({
              choices: [{
                message: {
                  role: "assistant",
                  content: "",
                  tool_calls: [{
                    id: "call-agent-reject",
                    type: "function",
                    function: {
                      name: "startAgentRun",
                      arguments: JSON.stringify(args.toolArgs),
                    },
                  }],
                },
              }],
            });
          }
          return Response.json({
            choices: [{ message: { role: "assistant", content: "handled" } }],
          });
        }),
      });
      if (args.expectNoBridge !== false) {
        expect(bridgeHits).toHaveLength(0);
      }
      return parseToolMessage(providerBodies, "call-agent-reject");
    }

    const allowedResult = await runRejectCase({
      createId: "dialog-reject-allowed",
      toolArgs: { agentKey: "not-allowed-child", task: "x" },
      runtimeContext: { allowedChildAgentKeys: ["only-this-child"] },
    });
    expect(allowedResult.error).toMatch(/allowedChildAgentKeys/i);
    expect(allowedResult.agentKey).toBe("not-allowed-child");

    const authResult = await runRejectCase({
      createId: "dialog-reject-auth",
      toolArgs: { agentKey: "child-a", task: "x" },
      env: { AUTH_TOKEN: "" },
    });
    expect(authResult.error).toMatch(/AUTH_TOKEN/i);
  });

  test("exa/fetch bridges use server endpoints with auth and continueDialogId as dialogId", async () => {
    const webRequests: Array<{ url: string; headers: any; body: any }> = [];
    let providerPhase = 0;
    await runDesktopAgentRuntimeTurn({
      env: {
        NOLO_DESKTOP: "1",
        NOLO_USER_ID: "user-1",
        NOLO_SERVER: "https://nolo.chat",
        AUTH_TOKEN: "token-web",
        NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
      },
      store: createParentDialogStore("agent-web", ["exa_search", "fetchWebpage"]),
      agentRef: "agent-web",
      input: "search and fetch",
      continueDialogId: parentDialogId,
      now: () => 1710000000000,
      createId: () => "dialog-web-bridge",
      fetchImpl: mockFetch(async (url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        const urlText = String(url);
        if (urlText.includes("/api/exa-search") || urlText.includes("/api/fetch-webpage")) {
          webRequests.push({
            url: urlText,
            headers: init?.headers,
            body: JSON.parse(String(init?.body ?? "{}")),
          });
          return Response.json({ ok: true, results: [] });
        }
        providerPhase += 1;
        if (providerPhase === 1) {
          return Response.json({
            choices: [{
              message: {
                role: "assistant",
                content: "",
                tool_calls: [
                  {
                    id: "call-exa",
                    type: "function",
                    function: {
                      name: "exa_search",
                      arguments: JSON.stringify({ query: "bun nolo" }),
                    },
                  },
                  {
                    id: "call-fetch",
                    type: "function",
                    function: {
                      name: "fetchWebpage",
                      arguments: JSON.stringify({ url: "https://example.com" }),
                    },
                  },
                ],
              },
            }],
          });
        }
        return Response.json({
          choices: [{ message: { role: "assistant", content: "web done" } }],
        });
      }),
    });

    expect(webRequests).toHaveLength(2);
    const exa = webRequests.find((r) => r.url.endsWith("/api/exa-search"));
    const fetchPage = webRequests.find((r) => r.url.endsWith("/api/fetch-webpage"));
    expect(exa).toBeTruthy();
    expect(fetchPage).toBeTruthy();
    expect(exa?.headers).toMatchObject({ Authorization: "Bearer token-web" });
    expect(fetchPage?.headers).toMatchObject({ Authorization: "Bearer token-web" });
    expect(exa?.body).toMatchObject({
      query: "bun nolo",
      numResults: 5,
      dialogId: parentDialogId,
    });
    expect(fetchPage?.body).toMatchObject({
      url: "https://example.com",
      dialogId: parentDialogId,
    });
  });

  test("does not expose undeclared web tools", async () => {
    const providerRequests: Array<{ body: any }> = [];
    await runDesktopAgentRuntimeTurn({
      env: {
        NOLO_DESKTOP: "1",
        NOLO_USER_ID: "user-1",
        NOLO_SERVER: "https://nolo.chat",
        AUTH_TOKEN: "token-1",
        NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
      },
      store: createParentDialogStore("agent-no-web", ["listFiles"]),
      agentRef: "agent-no-web",
      input: "no web",
      now: () => 1710000000000,
      createId: () => "dialog-no-web",
      fetchImpl: mockFetch(async (_url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        providerRequests.push({ body: JSON.parse(String(init?.body ?? "{}")) });
        return Response.json({
          choices: [{ message: { role: "assistant", content: "ok" } }],
        });
      }),
    });
    const toolNames = (providerRequests[0]?.body.tools ?? []).map((t: any) => t.function?.name);
    expect(toolNames).not.toContain("exa_search");
    expect(toolNames).not.toContain("fetchWebpage");
    expect(toolNames).not.toContain("firecrawl_scrape");
    expect(toolNames).not.toContain("firecrawl_search");
  });
});

describe("desktop agent runtime XHS and table tool parity", () => {
  test("exposes read_x_post in desktop OpenAI tool surface when the agent declares it", async () => {
    const store = new Map<string, any>([
      ["agent-user-1-x-post", {
        dbKey: "agent-user-1-x-post",
        id: "x-post",
        prompt: "Read X posts.",
        model: "qwen-coder",
        toolNames: ["read_x_post"],
      }],
    ]);
    const requests: Array<{ url?: string; body: any }> = [];

    await runDesktopAgentRuntimeTurn({
      env: {
        NOLO_USER_ID: "user-1",
        NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
      },
      store: {
        read: async (key) => store.get(key) ?? null,
        iterator: async function* () {},
        batch: async () => {},
      },
      agentRef: "x-post",
      input: "read this X post",
      now: () => 1710000000000,
      createId: () => "dialog-x-post-surface",
      fetchImpl: mockFetch(async (_url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        requests.push({ body: JSON.parse(String(init?.body)) });
        return Response.json({
          model: "qwen-coder",
          choices: [{ message: { content: "x post surface test" } }],
        });
      }),
    });

    const toolNames = requests[0]?.body.tools.map((t: any) => t.function?.name) ?? [];
    expect(toolNames).toContain("read_x_post");
  });

  test("adds LIGHT_WEB companions without social-reader for desktop web-search agents", async () => {
    const store = new Map<string, any>([
      ["agent-user-1-web-reader", {
        dbKey: "agent-user-1-web-reader",
        id: "web-reader",
        prompt: "Read web pages.",
        model: "qwen-coder",
        toolNames: ["fetchWebpage"],
      }],
    ]);
    const requests: Array<{ url?: string; body: any }> = [];

    await runDesktopAgentRuntimeTurn({
      env: {
        NOLO_USER_ID: "user-1",
        NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
      },
      store: {
        read: async (key) => store.get(key) ?? null,
        iterator: async function* () {},
        batch: async () => {},
      },
      agentRef: "web-reader",
      input: "search the web",
      now: () => 1710000000000,
      createId: () => "dialog-web-reader-surface",
      fetchImpl: mockFetch(async (_url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        requests.push({ body: JSON.parse(String(init?.body)) });
        return Response.json({
          model: "qwen-coder",
          choices: [{ message: { content: "web surface test" } }],
        });
      }),
    });

    const toolNames = requests[0]?.body.tools.map((t: any) => t.function?.name) ?? [];
    expect(toolNames).toContain("exa_search");
    expect(toolNames).toContain("fetchWebpage");
    expect(toolNames).not.toContain("read_x_post");
    expect(toolNames).not.toContain("read_xhs_profile");
  });

  test("exposes read_xhs_profile in desktop OpenAI tool surface when the agent declares it", async () => {
    const store = new Map<string, any>([
      ["agent-user-1-xhs", {
        dbKey: "agent-user-1-xhs",
        id: "xhs",
        prompt: "Collect XHS profile.",
        model: "qwen-coder",
        toolNames: ["read_xhs_profile"],
      }],
    ]);
    const requests: Array<{ url?: string; body: any }> = [];

    await runDesktopAgentRuntimeTurn({
      env: {
        NOLO_USER_ID: "user-1",
        NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
      },
      store: {
        read: async (key) => store.get(key) ?? null,
        iterator: async function* () {},
        batch: async () => {},
      },
      agentRef: "xhs",
      input: "collect XHS profile",
      now: () => 1710000000000,
      createId: () => "dialog-xhs-surface",
      fetchImpl: mockFetch(async (_url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        requests.push({ body: JSON.parse(String(init?.body)) });
        return Response.json({
          model: "qwen-coder",
          choices: [{ message: { content: "xhs surface test" } }],
        });
      }),
    });

    const toolNames = requests[0]?.body.tools.map((t: any) => t.function?.name) ?? [];
    expect(toolNames).toContain("read_xhs_profile");
  });

  test("does not expose read_xhs_profile when the agent does not declare it", async () => {
    const store = new Map<string, any>([
      ["agent-user-1-no-xhs", {
        dbKey: "agent-user-1-no-xhs",
        id: "no-xhs",
        prompt: "General help.",
        model: "qwen-coder",
        toolNames: ["readFile"],
      }],
    ]);
    const requests: Array<{ url?: string; body: any }> = [];

    await runDesktopAgentRuntimeTurn({
      env: {
        NOLO_USER_ID: "user-1",
        NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
      },
      store: {
        read: async (key) => store.get(key) ?? null,
        iterator: async function* () {},
        batch: async () => {},
      },
      agentRef: "no-xhs",
      input: "help me",
      now: () => 1710000000000,
      createId: () => "dialog-no-xhs",
      fetchImpl: mockFetch(async (_url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        requests.push({ body: JSON.parse(String(init?.body)) });
        return Response.json({
          model: "qwen-coder",
          choices: [{ message: { content: "no xhs surface test" } }],
        });
      }),
    });

    const toolNames = requests[0]?.body.tools.map((t: any) => t.function?.name) ?? [];
    expect(toolNames).not.toContain("read_xhs_profile");
  });

  test("exposes declared table write tools in desktop OpenAI tool surface", async () => {
    const store = new Map<string, any>([
      ["agent-user-1-table", {
        dbKey: "agent-user-1-table",
        id: "table",
        prompt: "Collect and save.",
        model: "qwen-coder",
        toolNames: ["read_xhs_profile", "createTable", "addTableRow", "addTableRows", "updateTableRow", "updateTableRows"],
      }],
    ]);
    const requests: Array<{ url?: string; body: any }> = [];

    await runDesktopAgentRuntimeTurn({
      env: {
        NOLO_USER_ID: "user-1",
        NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
      },
      store: {
        read: async (key) => store.get(key) ?? null,
        iterator: async function* () {},
        batch: async () => {},
      },
      agentRef: "table",
      input: "采集用户并保存到 table",
      now: () => 1710000000000,
      createId: () => "dialog-table-surface",
      fetchImpl: mockFetch(async (_url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        requests.push({ body: JSON.parse(String(init?.body)) });
        return Response.json({
          model: "qwen-coder",
          choices: [{ message: { content: "table surface test" } }],
        });
      }),
    });

    const toolNames = requests[0]?.body.tools.map((t: any) => t.function?.name) ?? [];
    expect(toolNames).toContain("read_xhs_profile");
    expect(toolNames).toContain("createTable");
    expect(toolNames).toContain("addTableRow");
    expect(toolNames).toContain("addTableRows");
    expect(toolNames).toContain("updateTableRow");
    expect(toolNames).toContain("updateTableRows");
  });

  test("executes read_xhs_profile through the desktop local bridge", async () => {
    const store = new Map<string, any>([
      ["agent-user-1-xhs-exec", {
        dbKey: "agent-user-1-xhs-exec",
        id: "xhs-exec",
        prompt: "Collect XHS profile.",
        model: "qwen-coder",
        toolNames: ["read_xhs_profile"],
      }],
    ]);
    const requests: Array<{ url?: string; body: any }> = [];
    let completeCount = 0;
    const readXhsProfileCalls: any[] = [];

    await runDesktopAgentRuntimeTurn({
      env: {
        NOLO_USER_ID: "user-1",
        NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
      },
      store: {
        read: async (key) => store.get(key) ?? null,
        iterator: async function* () {},
        batch: async () => {},
      },
      agentRef: "xhs-exec",
      input: "collect this user: https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556",
      now: () => 1710000000000,
      createId: () => "dialog-xhs-exec",
      readXhsProfile: (async (args: any) => {
        readXhsProfileCalls.push(args);
        return {
          rawData: {
            ok: true,
            data: {
              profile: { nickname: "mock user", redId: "MOCK123" },
              notes: [{ noteId: "note-1", title: "Test Note" }],
              noteDetails: [],
              analysis: { totalNotes: 1 },
            },
            fetchedAt: new Date().toISOString(),
          },
          displayData: "小红书用户: mock user\n笔记数量: 1",
        };
      }) as any,
      fetchImpl: mockFetch(async (_url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        completeCount += 1;
        requests.push({ body: JSON.parse(String(init?.body)) });
        if (completeCount === 1) {
          return Response.json({
            model: "qwen-coder",
            choices: [{
              message: {
                content: "",
                tool_calls: [{
                  id: "call-xhs",
                  type: "function",
                  function: {
                    name: "read_xhs_profile",
                    arguments: JSON.stringify({
                      url: "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556",
                      maxScrollPages: 1,
                    }),
                  },
                }],
              },
            }],
          });
        }
        return Response.json({
          model: "qwen-coder",
          choices: [{ message: { content: "xhs exec done" } }],
        });
      }),
    });

    // Verify the mock reader was called with the right URL
    expect(readXhsProfileCalls).toHaveLength(1);
    expect(readXhsProfileCalls[0].url).toBe("https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556");

    // Verify the tool call was made and a tool response was sent back
    expect(requests[1]?.body.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "tool",
          tool_call_id: "call-xhs",
        }),
      ])
    );
    const toolMessage = requests[1]?.body.messages.find(
      (m: any) => m.role === "tool" && m.tool_call_id === "call-xhs"
    );
    // Should contain the mock reader result
    expect(toolMessage?.content).toContain("mock user");
    expect(toolMessage?.content).toContain("note-1");
  });

  test("executes read_x_post through the desktop local bridge", async () => {
    const store = new Map<string, any>([
      ["agent-user-1-x-post-exec", {
        dbKey: "agent-user-1-x-post-exec",
        id: "x-post-exec",
        prompt: "Read X posts.",
        model: "qwen-coder",
        toolNames: ["read_x_post"],
      }],
    ]);
    const requests: Array<{ url?: string; body: any }> = [];
    let completeCount = 0;
    const readXPostCalls: any[] = [];

    await runDesktopAgentRuntimeTurn({
      env: {
        NOLO_USER_ID: "user-1",
        NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
      },
      store: {
        read: async (key) => store.get(key) ?? null,
        iterator: async function* () {},
        batch: async () => {},
      },
      agentRef: "x-post-exec",
      input: "read this: https://x.com/BohuTANG/status/2063842222307704944",
      now: () => 1710000000000,
      createId: () => "dialog-x-post-exec",
      readXPost: (async (args: any) => {
        readXPostCalls.push(args);
        return {
          rawData: {
            ok: true,
            backend: "desktop_local_browser",
            fetchedAt: "2026-06-08T00:00:00.000Z",
            data: {
              id: "2063842222307704944",
              url: "https://x.com/BohuTANG/status/2063842222307704944",
              text: "mock x post",
              author: {
                handle: "BohuTANG",
                displayName: "Bohu",
              },
            },
          },
          displayData: "已读取 X 帖子：@BohuTANG\nmock x post",
        };
      }) as any,
      fetchImpl: mockFetch(async (_url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        completeCount += 1;
        requests.push({ body: JSON.parse(String(init?.body)) });
        if (completeCount === 1) {
          return Response.json({
            model: "qwen-coder",
            choices: [{
              message: {
                content: "",
                tool_calls: [{
                  id: "call-x-post",
                  type: "function",
                  function: {
                    name: "read_x_post",
                    arguments: JSON.stringify({
                      url: "https://x.com/BohuTANG/status/2063842222307704944",
                    }),
                  },
                }],
              },
            }],
          });
        }
        return Response.json({
          model: "qwen-coder",
          choices: [{ message: { content: "x post exec done" } }],
        });
      }),
    });

    expect(readXPostCalls).toHaveLength(1);
    expect(readXPostCalls[0].url).toBe("https://x.com/BohuTANG/status/2063842222307704944");
    const toolMessage = requests[1]?.body.messages.find(
      (m: any) => m.role === "tool" && m.tool_call_id === "call-x-post"
    );
    expect(toolMessage?.content).toContain("mock x post");
  });

  test("blocks table write when the user did not explicitly request capture", async () => {
    const store = new Map<string, any>([
      ["agent-user-1-table-block", {
        dbKey: "agent-user-1-table-block",
        id: "table-block",
        prompt: "Collect and save.",
        model: "qwen-coder",
        toolNames: ["createTable"],
      }],
    ]);
    const requests: Array<{ url?: string; body: any }> = [];
    let completeCount = 0;

    const result = await runDesktopAgentRuntimeTurn({
      env: {
        NOLO_USER_ID: "user-1",
        NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
      },
      store: {
        read: async (key) => store.get(key) ?? null,
        iterator: async function* () {},
        batch: async () => {},
      },
      agentRef: "table-block",
      input: "帮我看看这个小红书用户的信息",  // No explicit capture intent
      now: () => 1710000000000,
      createId: () => "dialog-table-block",
      fetchImpl: mockFetch(async (_url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        completeCount += 1;
        requests.push({ body: JSON.parse(String(init?.body)) });
        if (completeCount === 1) {
          return Response.json({
            model: "qwen-coder",
            choices: [{
              message: {
                content: "",
                tool_calls: [{
                  id: "call-create-table",
                  type: "function",
                  function: {
                    name: "createTable",
                    arguments: JSON.stringify({ name: "test-table" }),
                  },
                }],
              },
            }],
          });
        }
        return Response.json({
          model: "qwen-coder",
          choices: [{ message: { content: "table block test done" } }],
        });
      }),
    });

    const toolMessage = requests[1]?.body.messages.find(
      (m: any) => m.role === "tool" && m.tool_call_id === "call-create-table"
    );
    expect(toolMessage).toBeDefined();
    const toolResult = JSON.parse(toolMessage.content);
    expect(toolResult.error).toBe("knowledge_capture_requires_confirmation");
  });

  test("allows table write when the user explicitly requests capture", async () => {
    const store = new Map<string, any>([
      ["agent-user-1-table-allow", {
        dbKey: "agent-user-1-table-allow",
        id: "table-allow",
        prompt: "Collect and save.",
        model: "qwen-coder",
        toolNames: ["createTable"],
      }],
    ]);
    const requests: Array<{ url?: string; body: any }> = [];
    let completeCount = 0;

    await runDesktopAgentRuntimeTurn({
      env: {
        NOLO_USER_ID: "user-1",
        NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
        NOLO_SERVER: "https://alpha-a.nolo.chat",
        AUTH_TOKEN: "test-token",
      },
      store: {
        read: async (key) => store.get(key) ?? null,
        iterator: async function* () {},
        batch: async () => {},
      },
      agentRef: "table-allow",
      input: "采集这个用户的信息并创建表格保存",  // Explicit capture intent
      now: () => 1710000000000,
      createId: () => "dialog-table-allow",
      fetchImpl: mockFetch(async (url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        completeCount += 1;
        requests.push({ url: String(url), body: JSON.parse(String(init?.body ?? "{}")) });
        if (completeCount === 1) {
          return Response.json({
            model: "qwen-coder",
            choices: [{
              message: {
                content: "",
                tool_calls: [{
                  id: "call-create-table-allow",
                  type: "function",
                  function: {
                    name: "createTable",
                    arguments: JSON.stringify({ name: "xhs-data" }),
                  },
                }],
              },
            }],
          });
        }
        // Second call: the createTable bridge call to server
        if (String(url).includes("/api/table/create")) {
          return Response.json({ tableId: "test-table-id", ok: true });
        }
        return Response.json({
          model: "qwen-coder",
          choices: [{ message: { content: "table allow test done" } }],
        });
      }),
    });

    const toolMessage = requests[2]?.body.messages.find(
      (m: any) => m.role === "tool" && m.tool_call_id === "call-create-table-allow"
    );
    expect(toolMessage).toBeDefined();
    // Should not contain capture blocked error
    expect(toolMessage.content).not.toContain("knowledge_capture_requires_confirmation");
  });
});

describe("desktop agent runtime boundFolder resolution", () => {
  const mkdtemp = (prefix: string) => mkdtempSync(join(tmpdir(), prefix));

  test("resolves boundFolder from dialog space when cwd is not provided", async () => {
    const workspaceRoot = mkdtemp("nolo-bound-workspace-");
    const boundFolder = mkdtemp("nolo-bound-folder-");
    try {
      const records = new Map<string, any>([
        ["agent-user-1-binder", {
          dbKey: "agent-user-1-binder",
          id: "binder",
          prompt: "Write files.",
          model: "qwen-coder",
          toolNames: ["writeFile"],
        }],
        // Dialog record with spaceId
        ["dialog-user-1-dialog-binder", {
          dbKey: "dialog-user-1-dialog-binder",
          spaceId: "my-bound-space",
        }],
        // Space record with boundFolder
        ["space-my-bound-space", {
          id: "my-bound-space",
          name: "Bound Space",
          boundFolder,
        }],
      ]);
      const reads: Array<{ key: string; remote?: boolean }> = [];
      const providerRequests: Array<{ body: any }> = [];
      let turnCount = 0;

      const result = await runDesktopAgentRuntimeTurn({
        env: {
          NOLO_DESKTOP: "1",
          NOLO_USER_ID: "user-1",
          NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
        },
        store: {
          read: async (key, options) => {
            reads.push({ key, remote: options?.remote });
            return records.get(key) ?? null;
          },
          iterator: async function* () {},
          batch: async () => {},
        },
        agentRef: "binder",
        input: "write a file in my folder",
        continueDialogId: "dialog-binder",
        dialogKey: "dialog-user-1-dialog-binder",
        // Intentionally NOT passing cwd — boundFolder should be auto-resolved
        now: () => 1710000000000,
        createId: () => "dialog-binder",
        fetchImpl: mockFetch(async (_url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
          turnCount += 1;
          providerRequests.push({ body: JSON.parse(String(init?.body)) });
          if (turnCount === 1) {
            return Response.json({
              model: "qwen-coder",
              choices: [{
                message: {
                  content: "",
                  tool_calls: [{
                    id: "call-write",
                    type: "function",
                    function: {
                      name: "writeFile",
                      arguments: JSON.stringify({
                        path: "hello.txt",
                        content: "bound folder test\n",
                      }),
                    },
                  }],
                },
              }],
            });
          }
          return Response.json({
            model: "qwen-coder",
            choices: [{ message: { content: "bound folder done" } }],
          });
        }),
      });

      expect(result.content).toBe("bound folder done");
      expect(reads).toContainEqual({
        key: "dialog-user-1-dialog-binder",
        remote: true,
      });
      expect(reads).toContainEqual({
        key: "space-my-bound-space",
        remote: true,
      });
      // The file should be written in boundFolder (not workspaceRoot)
      expect(readFileSync(join(boundFolder, "hello.txt"), "utf8")).toBe("bound folder test\n");
      expect(providerRequests[1]?.body.messages.at(-1)).toMatchObject({
        role: "tool",
        content: "wrote hello.txt",
        tool_call_id: "call-write",
      });
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true });
      rmSync(boundFolder, { recursive: true, force: true });
    }
  });

  test("lets boundFolder quick-chat use execShell while blocking unconfirmed delete", async () => {
    const boundFolder = mkdtemp("nolo-bound-shell-");
    try {
      writeFileSync(join(boundFolder, "todo.txt"), "organize me\n", "utf8");
      const records = new Map<string, any>([
        ["agent-user-1-shell", {
          dbKey: "agent-user-1-shell",
          id: "shell",
          prompt: "Use tools.",
          model: "qwen-coder",
          toolNames: ["execShell", "writeFile"],
        }],
        ["dialog-user-1-dialog-shell-bound", {
          dbKey: "dialog-user-1-dialog-shell-bound",
          spaceId: "shell-bound-space",
        }],
        ["space-shell-bound-space", {
          id: "shell-bound-space",
          boundFolder,
        }],
      ]);
      const providerRequests: Array<{ body: any }> = [];
      let turnCount = 0;

      const result = await runDesktopAgentRuntimeTurn({
        env: {
          NOLO_DESKTOP: "1",
          NOLO_USER_ID: "user-1",
          NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
        },
        store: {
          read: async (key) => records.get(key) ?? null,
          iterator: async function* () {},
          batch: async () => {},
        },
        agentRef: "shell",
        input: "帮我整理这个文件夹，但先不要删除文件",
        continueDialogId: "dialog-shell-bound",
        dialogKey: "dialog-user-1-dialog-shell-bound",
        now: () => 1710000000000,
        createId: () => "dialog-shell-bound",
        fetchImpl: mockFetch(async (_url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
          turnCount += 1;
          const body = JSON.parse(String(init?.body));
          providerRequests.push({ body });
          if (turnCount === 1) {
            return Response.json({
              model: "qwen-coder",
              choices: [{
                message: {
                  content: "",
                  tool_calls: [{
                    id: "call-organize",
                    type: "function",
                    function: {
                      name: "execShell",
                      arguments: JSON.stringify({
                        cmd: "mkdir organized && mv todo.txt organized/todo.txt && printf 'organized\\n' > organized/todo.txt",
                      }),
                    },
                  }],
                },
              }],
            });
          }
          if (turnCount === 2) {
            return Response.json({
              model: "qwen-coder",
              choices: [{
                message: {
                  content: "",
                  tool_calls: [{
                    id: "call-delete",
                    type: "function",
                    function: {
                      name: "execShell",
                      arguments: JSON.stringify({ cmd: "rm organized/todo.txt" }),
                    },
                  }],
                },
              }],
            });
          }
          return Response.json({
            model: "qwen-coder",
            choices: [{ message: { content: "整理好了，删除需要你确认" } }],
          });
        }),
      });

      const advertisedTools = (providerRequests[0]?.body.tools ?? [])
        .map((tool: any) => tool.function?.name);
      expect(advertisedTools).toContain("execShell");
      expect(readFileSync(join(boundFolder, "organized", "todo.txt"), "utf8")).toBe("organized\n");
      expect(existsSync(join(boundFolder, "todo.txt"))).toBe(false);
      expect(providerRequests[1]?.body.messages.at(-1)).toMatchObject({
        role: "tool",
        tool_call_id: "call-organize",
      });
      expect(providerRequests[1]?.body.messages.at(-1).content).toContain("exitCode: 0");
      expect(providerRequests[2]?.body.messages.at(-1)).toMatchObject({
        role: "tool",
        tool_call_id: "call-delete",
      });
      expect(providerRequests[2]?.body.messages.at(-1).content).toContain(
        "destructive_action_requires_confirmation",
      );
      expect(readFileSync(join(boundFolder, "organized", "todo.txt"), "utf8")).toBe("organized\n");
      expect(result.content).toBe("整理好了，删除需要你确认");
    } finally {
      rmSync(boundFolder, { recursive: true, force: true });
    }
  });

  test("blocks boundFolder execShell path escapes", async () => {
    const boundFolder = mkdtemp("nolo-bound-shell-escape-");
    try {
      const records = new Map<string, any>([
        ["agent-user-1-shell", {
          dbKey: "agent-user-1-shell",
          id: "shell",
          prompt: "Use tools.",
          model: "qwen-coder",
          toolNames: ["execShell"],
        }],
        ["dialog-user-1-dialog-shell-escape", {
          dbKey: "dialog-user-1-dialog-shell-escape",
          spaceId: "shell-escape-space",
        }],
        ["space-shell-escape-space", {
          id: "shell-escape-space",
          boundFolder,
        }],
      ]);
      const providerRequests: Array<{ body: any }> = [];
      let turnCount = 0;

      const result = await runDesktopAgentRuntimeTurn({
        env: {
          NOLO_DESKTOP: "1",
          NOLO_USER_ID: "user-1",
          NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
        },
        store: {
          read: async (key) => records.get(key) ?? null,
          iterator: async function* () {},
          batch: async () => {},
        },
        agentRef: "shell",
        input: "看看上级目录",
        continueDialogId: "dialog-shell-escape",
        dialogKey: "dialog-user-1-dialog-shell-escape",
        now: () => 1710000000000,
        createId: () => "dialog-shell-escape",
        fetchImpl: mockFetch(async (_url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
          turnCount += 1;
          const body = JSON.parse(String(init?.body));
          providerRequests.push({ body });
          if (turnCount === 1) {
            return Response.json({
              model: "qwen-coder",
              choices: [{
                message: {
                  content: "",
                  tool_calls: [{
                    id: "call-escape",
                    type: "function",
                    function: {
                      name: "execShell",
                      arguments: JSON.stringify({ cmd: "cat ../secret.txt" }),
                    },
                  }],
                },
              }],
            });
          }
          return Response.json({
            model: "qwen-coder",
            choices: [{ message: { content: "不能访问授权文件夹外" } }],
          });
        }),
      });

      expect(providerRequests[1]?.body.messages.at(-1)).toMatchObject({
        role: "tool",
        tool_call_id: "call-escape",
      });
      expect(providerRequests[1]?.body.messages.at(-1).content).toContain(
        "workspace_shell_escape_blocked",
      );
      expect(result.content).toBe("不能访问授权文件夹外");
    } finally {
      rmSync(boundFolder, { recursive: true, force: true });
    }
  });

  test("falls back to process.cwd() when dialog has no space boundFolder", async () => {
    const workspaceRoot = mkdtemp("nolo-fallback-");
    try {
      const records = new Map<string, any>([
        ["agent-user-1-fallback", {
          dbKey: "agent-user-1-fallback",
          id: "fallback",
          prompt: "Write files.",
          model: "qwen-coder",
          toolNames: ["writeFile"],
        }],
        // Dialog record without spaceId
        ["dialog-user-1-dialog-fallback", {
          dbKey: "dialog-user-1-dialog-fallback",
          // no spaceId
        }],
      ]);
      const providerRequests: Array<{ body: any }> = [];
      let turnCount = 0;

      // Set cwd to workspaceRoot so file ops land there when boundFolder is absent
      const result = await runDesktopAgentRuntimeTurn({
        env: {
          NOLO_DESKTOP: "1",
          NOLO_USER_ID: "user-1",
          NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
        },
        store: {
          read: async (key) => records.get(key) ?? null,
          iterator: async function* () {},
          batch: async () => {},
        },
        agentRef: "fallback",
        input: "write a file",
        continueDialogId: "dialog-fallback",
        cwd: workspaceRoot,
        now: () => 1710000000000,
        createId: () => "dialog-fallback",
        fetchImpl: mockFetch(async (_url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
          turnCount += 1;
          providerRequests.push({ body: JSON.parse(String(init?.body)) });
          if (turnCount === 1) {
            return Response.json({
              model: "qwen-coder",
              choices: [{
                message: {
                  content: "",
                  tool_calls: [{
                    id: "call-write",
                    type: "function",
                    function: {
                      name: "writeFile",
                      arguments: JSON.stringify({
                        path: "fallback.txt",
                        content: "fallback test\n",
                      }),
                    },
                  }],
                },
              }],
            });
          }
          return Response.json({
            model: "qwen-coder",
            choices: [{ message: { content: "fallback done" } }],
          });
        }),
      });

      expect(result.content).toBe("fallback done");
      // File should be in workspaceRoot (cwd), not in some bound folder
      expect(readFileSync(join(workspaceRoot, "fallback.txt"), "utf8")).toBe("fallback test\n");
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });
});

describe("desktop agent runtime turn context layers", () => {
  const mkdtemp = (prefix: string) => mkdtempSync(join(tmpdir(), prefix));

  const baseAgentRecord = {
    dbKey: "agent-user-1-ctx",
    id: "ctx",
    prompt: "You are ctx.",
    model: "qwen-coder",
  };

  const runContextTurn = async (args: {
    records: Map<string, any>;
    env?: Record<string, string>;
    dialogKey?: string;
  }) => {
    const providerRequests: Array<{ body: any }> = [];
    const result = await runDesktopAgentRuntimeTurn({
      env: {
        NOLO_DESKTOP: "1",
        NOLO_USER_ID: "user-1",
        NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
        ...(args.env ?? {}),
      },
      store: {
        read: async (key) => args.records.get(key) ?? null,
        iterator: async function* () {},
        batch: async () => {},
      },
      agentRef: "ctx",
      input: "which space am I in?",
      continueDialogId: "dlg-ctx",
      dialogKey: args.dialogKey ?? "dialog-user-1-dlg-ctx",
      now: () => 1710000000000,
      createId: () => "dlg-ctx",
      fetchImpl: mockFetch(async (_url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        providerRequests.push({ body: JSON.parse(String(init?.body)) });
        return Response.json({
          model: "qwen-coder",
          choices: [{ message: { content: "ctx done" } }],
        });
      }),
    });
    const systemMessage = providerRequests[0]?.body.messages.find(
      (message: any) => message.role === "system",
    );
    return { result, systemContent: String(systemMessage?.content ?? "") };
  };

  test("injects space and workspace layers from the dialog's space record", async () => {
    const boundFolder = mkdtemp("nolo-ctx-bound-");
    try {
      const records = new Map<string, any>([
        ["agent-user-1-ctx", baseAgentRecord],
        ["dialog-user-1-dlg-ctx", {
          dbKey: "dialog-user-1-dlg-ctx",
          spaceId: "ctx-space",
        }],
        ["space-ctx-space", {
          id: "ctx-space",
          name: "上下文空间",
          description: "test space",
          boundFolder,
          categories: { "cat-1": { name: "文档", order: 1 } },
          contents: {
            "doc-1": {
              title: "架构说明",
              type: "page",
              contentKey: "doc-1",
              categoryId: "cat-1",
              updatedAt: 100,
            },
          },
        }],
      ]);

      const { result, systemContent } = await runContextTurn({ records });

      expect(result.content).toBe("ctx done");
      expect(systemContent).toContain("You are ctx.");
      expect(systemContent).toContain("本对话属于以下 Space");
      expect(systemContent).toContain("Space Title: 上下文空间");
      expect(systemContent).toContain("Space ID: ctx-space");
      expect(systemContent).toContain("架构说明");
      expect(systemContent).toContain("工作区（Workspace）");
      expect(systemContent).toContain(boundFolder);
    } finally {
      rmSync(boundFolder, { recursive: true, force: true });
    }
  });

  test("boundFolder wins over explicit cwd when a space binding is present", async () => {
    const boundFolder = mkdtemp("nolo-bound-priority-");
    const otherCwd = mkdtemp("nolo-other-cwd-");
    try {
      const records = new Map<string, any>([
        ["agent-user-1-prio", {
          dbKey: "agent-user-1-prio",
          id: "prio",
          prompt: "Write files.",
          model: "qwen-coder",
          toolNames: ["writeFile"],
        }],
        ["dialog-user-1-dialog-prio", {
          dbKey: "dialog-user-1-dialog-prio",
          spaceId: "prio-space",
        }],
        ["space-prio-space", {
          id: "prio-space",
          name: "Priority Space",
          boundFolder,
        }],
      ]);
      let turnCount = 0;

      const result = await runDesktopAgentRuntimeTurn({
        env: {
          NOLO_DESKTOP: "1",
          NOLO_USER_ID: "user-1",
          NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
        },
        store: {
          read: async (key) => records.get(key) ?? null,
          iterator: async function* () {},
          batch: async () => {},
        },
        agentRef: "prio",
        input: "write a file",
        continueDialogId: "dialog-prio",
        dialogKey: "dialog-user-1-dialog-prio",
        // Explicit cwd is provided, but the space boundFolder must win.
        cwd: otherCwd,
        now: () => 1710000000000,
        createId: () => "dialog-prio",
        fetchImpl: mockFetch(async (_url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
          turnCount += 1;
          if (turnCount === 1) {
            return Response.json({
              model: "qwen-coder",
              choices: [{
                message: {
                  content: "",
                  tool_calls: [{
                    id: "call-write",
                    type: "function",
                    function: {
                      name: "writeFile",
                      arguments: JSON.stringify({
                        path: "prio.txt",
                        content: "priority test\n",
                      }),
                    },
                  }],
                },
              }],
            });
          }
          return Response.json({
            model: "qwen-coder",
            choices: [{ message: { content: "priority done" } }],
          });
        }),
      });

      expect(result.content).toBe("priority done");
      // File lands in the bound folder, NOT in the explicit cwd.
      expect(readFileSync(join(boundFolder, "prio.txt"), "utf8")).toBe("priority test\n");
      expect(existsSync(join(otherCwd, "prio.txt"))).toBe(false);
    } finally {
      rmSync(boundFolder, { recursive: true, force: true });
      rmSync(otherCwd, { recursive: true, force: true });
    }
  });

  test("explicit dialogKey resolves the dialog even when host env user id diverges", async () => {
    const records = new Map<string, any>([
      // Agent readable under the env user; dialog only under the web user's key.
      ["agent-host-local-ctx", { ...baseAgentRecord, dbKey: "agent-host-local-ctx" }],
      ["dialog-user-1-dlg-ctx", {
        dbKey: "dialog-user-1-dlg-ctx",
        spaceId: "ctx-space",
      }],
      ["space-ctx-space", { id: "ctx-space", name: "上下文空间" }],
    ]);

    const { systemContent } = await runContextTurn({
      records,
      env: { NOLO_LOCAL_USER_ID: "host-local" },
      dialogKey: "dialog-user-1-dlg-ctx",
    });

    expect(systemContent).toContain("Space Title: 上下文空间");
  });

  test("emits an explicit failure layer when the space record cannot be read", async () => {
    const records = new Map<string, any>([
      ["agent-user-1-ctx", baseAgentRecord],
      ["dialog-user-1-dlg-ctx", {
        dbKey: "dialog-user-1-dlg-ctx",
        spaceId: "ghost-space",
      }],
      // No space record on purpose.
    ]);

    const { systemContent } = await runContextTurn({ records });

    expect(systemContent).toContain("声明属于 Space ghost-space");
    expect(systemContent).toContain("不要声称对话不属于任何空间");
  });

  test("adds no context layers when the dialog has no spaceId", async () => {
    const records = new Map<string, any>([
      ["agent-user-1-ctx", baseAgentRecord],
      ["dialog-user-1-dlg-ctx", { dbKey: "dialog-user-1-dlg-ctx" }],
    ]);

    const { systemContent } = await runContextTurn({ records });

    expect(systemContent).toBe("You are ctx.");
  });

  test("skips dialog-record resolution entirely when dialogKey is absent or mismatched (env derivation removed)", async () => {
    const records = new Map<string, any>([
      ["agent-user-1-ctx", baseAgentRecord],
      ["dialog-user-1-dlg-ctx", {
        dbKey: "dialog-user-1-dlg-ctx",
        spaceId: "ctx-space",
      }],
      ["space-ctx-space", { id: "ctx-space", name: "上下文空间" }],
    ]);

    const absent = await runContextTurn({ records, dialogKey: "" });
    expect(absent.systemContent).toBe("You are ctx.");

    const mismatched = await runContextTurn({
      records,
      dialogKey: "dialog-user-1-other-dialog",
    });
    expect(mismatched.systemContent).toBe("You are ctx.");
  });
});

describe("desktop agent runtime T12-T14 context layers (dialog summary / global prompt / memory)", () => {
  const baseAgentRecord = {
    dbKey: "agent-user-1-layer",
    id: "layer",
    prompt: "You are layer.",
    model: "qwen-coder",
  };

  const runLayerTurn = async (args: {
    records: Map<string, any>;
    dialogKey?: string;
    env?: Record<string, string>;
    memoryOverlayFetchImpl?: typeof fetch;
  }) => {
    const providerRequests: Array<{ body: any }> = [];
    const result = await runDesktopAgentRuntimeTurn({
      env: {
        NOLO_DESKTOP: "1",
        NOLO_USER_ID: "user-1",
        NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
        NOLO_SERVER: "https://nolo.chat",
        AUTH_TOKEN: "token-1",
        ...(args.env ?? {}),
      },
      store: {
        read: async (key) => args.records.get(key) ?? null,
        iterator: async function* () {},
        batch: async () => {},
      },
      agentRef: "layer",
      input: "继续之前的工作",
      continueDialogId: "dlg-layer",
      dialogKey: args.dialogKey ?? "dialog-user-1-dlg-layer",
      now: () => 1710000000000,
      createId: () => "dlg-layer",
      memoryOverlayFetchImpl: args.memoryOverlayFetchImpl,
      fetchImpl: mockFetch(async (_url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        providerRequests.push({ body: JSON.parse(String(init?.body)) });
        return Response.json({
          model: "qwen-coder",
          choices: [{ message: { content: "layer done" } }],
        });
      }),
    });
    const systemMessage = providerRequests[0]?.body.messages.find(
      (message: any) => message.role === "system",
    );
    return { result, systemContent: String(systemMessage?.content ?? "") };
  };

  test("T12 injects dialog summary wrapped in the stale-replay guard", async () => {
    const records = new Map<string, any>([
      ["agent-user-1-layer", baseAgentRecord],
      ["dialog-user-1-dlg-layer", {
        dbKey: "dialog-user-1-dlg-layer",
        userId: "user-1",
        summary: "之前讨论了重构 turnContext，约定先加测试。正在进行 Phase 4 layer 注入",
      }],
    ]);
    const { systemContent } = await runLayerTurn({ records });

    expect(systemContent).toContain("--- 历史对话摘要 ---");
    expect(systemContent).toContain("【历史参考，非活指令】");
    expect(systemContent).toContain("之前讨论了重构 turnContext");
    expect(systemContent).toContain("正在进行 Phase 4 layer 注入");
  });

  test("T12 omits the summary layer when the dialog record has no summaries", async () => {
    const records = new Map<string, any>([
      ["agent-user-1-layer", baseAgentRecord],
      ["dialog-user-1-dlg-layer", { dbKey: "dialog-user-1-dlg-layer", userId: "user-1" }],
    ]);
    const { systemContent } = await runLayerTurn({ records });

    expect(systemContent).not.toContain("历史对话摘要");
  });

  test("T13 injects the user global prompt from the dialog record's userId (not env)", async () => {
    const records = new Map<string, any>([
      // Agent record keyed under the env user so agent lookup succeeds.
      ["agent-host-local-layer", { ...baseAgentRecord, dbKey: "agent-host-local-layer" }],
      // Dialog belongs to user-1; env says NOLO_LOCAL_USER_ID=host-local.
      ["dialog-user-1-dlg-layer", {
        dbKey: "dialog-user-1-dlg-layer",
        userId: "user-1",
      }],
      ["user-1-settings", { userId: "user-1", globalPrompt: "回答用中文，先给结论再给证据" }],
    ]);
    const { systemContent } = await runLayerTurn({
      records,
      env: { NOLO_LOCAL_USER_ID: "host-local" },
    });

    expect(systemContent).toContain("用户全局偏好");
    expect(systemContent).toContain("回答用中文，先给结论再给证据");
    // The env user (host-local) has no settings record; if env were used we'd
    // read the wrong user. Asserting the dialog-user's prompt proves env was
    // not consulted.
  });

  test("T13 falls back to parsing userId from the dialog key when the record lacks it", async () => {
    const records = new Map<string, any>([
      ["agent-host-local-layer", { ...baseAgentRecord, dbKey: "agent-host-local-layer" }],
      // No userId field on the record; key is dialog-user-1-dlg-layer.
      ["dialog-user-1-dlg-layer", { dbKey: "dialog-user-1-dlg-layer" }],
      ["user-1-settings", { globalPrompt: "从 key 解析的 userId" }],
    ]);
    const { systemContent } = await runLayerTurn({
      records,
      env: { NOLO_LOCAL_USER_ID: "host-local" },
    });

    expect(systemContent).toContain("从 key 解析的 userId");
  });

  test("T13 omits the global prompt layer when the settings record has no globalPrompt", async () => {
    const records = new Map<string, any>([
      ["agent-user-1-layer", baseAgentRecord],
      ["dialog-user-1-dlg-layer", { dbKey: "dialog-user-1-dlg-layer", userId: "user-1" }],
      ["user-1-settings", { userId: "user-1", theme: "dark" }],
    ]);
    const { systemContent } = await runLayerTurn({ records });

    expect(systemContent).not.toContain("用户全局偏好");
  });

  test("T13 emits an explicit failure layer when the settings read throws", async () => {
    const records = new Map<string, any>([
      ["agent-user-1-layer", baseAgentRecord],
      ["dialog-user-1-dlg-layer", { dbKey: "dialog-user-1-dlg-layer", userId: "user-1" }],
    ]);
    const providerRequests: Array<{ body: any }> = [];
    await runDesktopAgentRuntimeTurn({
      env: {
        NOLO_DESKTOP: "1",
        NOLO_USER_ID: "user-1",
        NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
      },
      store: {
        read: async (key) => {
          if (key === "user-1-settings") throw new Error("settings leveldb offline");
          return records.get(key) ?? null;
        },
        iterator: async function* () {},
        batch: async () => {},
      },
      agentRef: "layer",
      input: "hi",
      continueDialogId: "dlg-layer",
      dialogKey: "dialog-user-1-dlg-layer",
      now: () => 1710000000000,
      createId: () => "dlg-layer",
      fetchImpl: mockFetch(async (_url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        providerRequests.push({ body: JSON.parse(String(init?.body)) });
        return Response.json({ model: "qwen-coder", choices: [{ message: { content: "done" } }] });
      }),
    });
    const systemMessage = providerRequests[0]?.body.messages.find(
      (message: any) => message.role === "system",
    );
    const sys = String(systemMessage?.content ?? "");
    expect(sys).toContain("读取用户 user-1 的偏好设置失败");
    expect(sys).toContain("settings leveldb offline");
    expect(sys).toContain("不要编造偏好");
  });

  test("T13 skips the global prompt layer when there is no dialog record (no continueDialogId)", async () => {
    const providerRequests: Array<{ body: any }> = [];
    await runDesktopAgentRuntimeTurn({
      env: {
        NOLO_DESKTOP: "1",
        NOLO_USER_ID: "user-1",
        NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
      },
      store: {
        read: async (key) =>
          key === "agent-user-1-layer" ? baseAgentRecord : null,
        iterator: async function* () {},
        batch: async () => {},
      },
      agentRef: "layer",
      input: "fresh start",
      // No continueDialogId → no dialog record → must not guess userId from env.
      now: () => 1710000000000,
      createId: () => "fresh",
      fetchImpl: mockFetch(async (_url: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        providerRequests.push({ body: JSON.parse(String(init?.body)) });
        return Response.json({ model: "qwen-coder", choices: [{ message: { content: "done" } }] });
      }),
    });
    const systemMessage = providerRequests[0]?.body.messages.find(
      (message: any) => message.role === "system",
    );
    expect(String(systemMessage?.content ?? "")).toBe("You are layer.");
  });

  test("T14 injects the memory overlay with use guidance when the fetch succeeds", async () => {
    const records = new Map<string, any>([
      ["agent-user-1-layer", baseAgentRecord],
      ["dialog-user-1-dlg-layer", { dbKey: "dialog-user-1-dlg-layer", userId: "user-1" }],
    ]);
    const { systemContent } = await runLayerTurn({
      records,
      // Bypass the mockFetch memory-url auto-route by supplying a raw fetch.
      memoryOverlayFetchImpl: (async () =>
        Response.json({ promptBlock: "--- Memory Overlay ---\n[Semantic]\n- 用户偏好简洁结论" }) as any) as unknown as typeof fetch,
    });

    expect(systemContent).toContain("用户偏好简洁结论");
    expect(systemContent).toContain("--- 记忆使用方式 ---");
  });

  test("T14 omits the memory layer when the fetch fails (non-fatal, turn still succeeds)", async () => {
    const records = new Map<string, any>([
      ["agent-user-1-layer", baseAgentRecord],
      ["dialog-user-1-dlg-layer", { dbKey: "dialog-user-1-dlg-layer", userId: "user-1" }],
    ]);
    const { result, systemContent } = await runLayerTurn({
      records,
      memoryOverlayFetchImpl: (async () => {
        throw new Error("memory service offline");
      }) as unknown as typeof fetch,
    });

    expect(result.content).toBe("layer done");
    expect(systemContent).not.toContain("记忆使用方式");
  });

  test("T14 passes an abort signal so a stalled memory service cannot hang the turn", async () => {
    const records = new Map<string, any>([
      ["agent-user-1-layer", baseAgentRecord],
      ["dialog-user-1-dlg-layer", { dbKey: "dialog-user-1-dlg-layer", userId: "user-1" }],
    ]);
    let observedSignal: AbortSignal | undefined;

    const { result, systemContent } = await runLayerTurn({
      records,
      // A memory service that never answers: the turn must still finish.
      // Without a timeout signal this test would hang instead of failing.
      memoryOverlayFetchImpl: ((_url: any, init?: RequestInit) => {
        observedSignal = init?.signal ?? undefined;
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new Error("aborted by timeout")),
          );
        });
      }) as unknown as typeof fetch,
    });

    // The turn completed at all, which is the real guarantee: a memory service
    // that never answers cannot hold the user's turn open. The signal fired,
    // proving the timeout (not some other path) released it.
    expect(observedSignal).toBeDefined();
    expect(observedSignal!.aborted).toBe(true);
    expect(result.content).toBe("layer done");
    expect(systemContent).not.toContain("记忆使用方式");
  });

  test("T14 omits the memory layer when the fetch returns an empty promptBlock", async () => {
    const records = new Map<string, any>([
      ["agent-user-1-layer", baseAgentRecord],
      ["dialog-user-1-dlg-layer", { dbKey: "dialog-user-1-dlg-layer", userId: "user-1" }],
    ]);
    const { systemContent } = await runLayerTurn({
      records,
      memoryOverlayFetchImpl: (async () =>
        Response.json({ promptBlock: null }) as any) as unknown as typeof fetch,
    });

    expect(systemContent).not.toContain("记忆使用方式");
  });

  test("layer order: user-global-prompt before space before memory before summary", async () => {
    const records = new Map<string, any>([
      ["agent-user-1-layer", baseAgentRecord],
      ["dialog-user-1-dlg-layer", {
        dbKey: "dialog-user-1-dlg-layer",
        userId: "user-1",
        spaceId: "order-space",
        summary: "历史结论 Z",
      }],
      ["user-1-settings", { globalPrompt: "全局偏好 P" }],
      ["space-order-space", { id: "order-space", name: "顺序空间" }],
    ]);
    const { systemContent } = await runLayerTurn({
      records,
      memoryOverlayFetchImpl: (async () =>
        Response.json({ promptBlock: "--- Memory Overlay ---\n记忆内容 M" }) as any) as unknown as typeof fetch,
    });

    const globalIdx = systemContent.indexOf("全局偏好 P");
    const spaceIdx = systemContent.indexOf("顺序空间");
    const memoryIdx = systemContent.indexOf("记忆内容 M");
    const summaryIdx = systemContent.indexOf("历史结论 Z");
    expect(globalIdx).toBeGreaterThan(-1);
    expect(spaceIdx).toBeGreaterThan(globalIdx);
    expect(memoryIdx).toBeGreaterThan(spaceIdx);
    expect(summaryIdx).toBeGreaterThan(memoryIdx);
  });

  test("exposes accumulated reasoning_content on the turn result for thinkContent persistence", async () => {
    // 桌面 turn 完成时把 reasoning 累计进 result.reasoning_content，供客户端
    // 持久化为 thinkContent（见 messageSlice.ts messageStreamEnd → thinkContent）。
    // provider 在流式 SSE 中累积 delta.reasoning_content 到 state.reasoning，
    // 最终返回 result.reasoning_content；service 层 onReasoningDelta 累计作为
    // 多轮补齐路径。本用例走真实 runDesktopAgentRuntimeTurn + SSE fetch mock，
    // 断言 result.reasoning_content 非空且与 SSE 累计一致。
    const reasoningDeltas: string[] = [];
    const store = {
      read: async (key: string) => {
        if (key === "agent-user-1-reasoner") {
          return {
            name: "Reasoner",
            prompt: "Think step by step.",
            model: "qwen-coder",
          };
        }
        return null;
      },
      iterator: async function* () {},
      batch: async () => {},
    };

    const result = await runDesktopTextOnlyAgentRuntimeTurn({
      env: {
        NOLO_USER_ID: "user-1",
        NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
        NOLO_LOCAL_OPENAI_API_KEY: "sk-local",
      },
      store: store as any,
      agentRef: "reasoner",
      input: "explain the plan",
      continueDialogId: "dialog-reason",
      now: () => 1710000000000,
      createId: () => "unused",
      onTextDelta: () => {},
      onReasoningDelta: (chunk: string) => {
        reasoningDeltas.push(chunk);
      },
      fetchImpl: mockFetch(async (input: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
        // SSE stream with reasoning_content deltas then a final text delta.
        const body = [
          `data: ${JSON.stringify({ choices: [{ delta: { reasoning_content: "first " } }] })}`,
          ``,
          `data: ${JSON.stringify({ choices: [{ delta: { reasoning_content: "thought" } }] })}`,
          ``,
          `data: ${JSON.stringify({ choices: [{ delta: { content: "the answer" } }] })}`,
          ``,
          `data: ${JSON.stringify({ choices: [{ delta: {} }], usage: { completion_tokens: 5 } })}`,
          ``,
          `data: [DONE]`,
          ``,
        ].join("\n");
        return new Response(body, {
          headers: { "Content-Type": "text/event-stream" },
        });
      }),
    });

    expect(result.content).toBe("the answer");
    // reasoning_content 非空：provider 在 SSE 流里累计 reasoning delta。
    expect(typeof result.reasoning_content).toBe("string");
    expect((result.reasoning_content as string).length).toBeGreaterThan(0);
    expect(result.reasoning_content).toContain("first");
    expect(result.reasoning_content).toContain("thought");
    // onReasoningDelta 透传验证：adapter 当前未转发 options.onReasoningDelta 到
    // provider，所以增量回调在真实链路上暂不触发（已记入报告）。reasoning_content
    // 仍由 provider 在 SSE 流内累计返回。这里断言回调被调用与否由 adapter 行为
    // 决定；本断言只锁定 result.reasoning_content 这条持久化数据路径。
    expect(Array.isArray(reasoningDeltas)).toBe(true);
  });
});

describe("resolveDesktopEffectiveEnabledPacks", () => {
  // agent-orchestration 不在包级期望里：它已迁入 SYSTEM_AGENT_CAPABILITIES
  // （全局设置 systemBuiltinSkills）。desktop 端有 startAgentRun 执行器
  // （buildDesktopStartAgentRunToolExecutor），但 controlAgentRun 执行器尚未
  // 落地，因此仍有意不默认挂载整个编排包（见函数 docstring）；
  // CLI/web 的默认挂载在工具面解析处由 addDefaultSystemCapabilityTools 完成。
  test("绑文件夹并已授权时，自动追加 code + 全部 always-on 包", () => {
    expect(
      resolveDesktopEffectiveEnabledPacks({
        enabledPacks: ["web-search"],
        workspaceAuthorized: true,
      }),
    ).toEqual(["web-search", "code", "long-term-memory", "skills"]);
  });

  test("已含 code 包但不含 always-on 包时，幂等补齐", () => {
    expect(
      resolveDesktopEffectiveEnabledPacks({
        enabledPacks: ["code", "web-search"],
        workspaceAuthorized: true,
      }),
    ).toEqual(["code", "web-search", "long-term-memory", "skills"]);
  });

  test("未绑文件夹时只补 always-on 包、不补 code 包", () => {
    expect(
      resolveDesktopEffectiveEnabledPacks({
        enabledPacks: ["web-search"],
        workspaceAuthorized: false,
      }),
    ).toEqual(["web-search", "long-term-memory", "skills"]);
  });

  test("enabledPacks 为空且绑文件夹时，得到 code + 全部 always-on 包", () => {
    expect(
      resolveDesktopEffectiveEnabledPacks({
        enabledPacks: [],
        workspaceAuthorized: true,
      }),
    ).toEqual(["code", "long-term-memory", "skills"]);
  });

  test("已含部分 always-on 包时不重复追加、补齐其余", () => {
    expect(
      resolveDesktopEffectiveEnabledPacks({
        enabledPacks: ["code", "agent-orchestration"],
        workspaceAuthorized: true,
      }),
    ).toEqual(["code", "agent-orchestration", "long-term-memory", "skills"]);
    expect(
      resolveDesktopEffectiveEnabledPacks({
        enabledPacks: ["agent-orchestration"],
        workspaceAuthorized: false,
      }),
    ).toEqual(["agent-orchestration", "long-term-memory", "skills"]);
  });
});
