import { afterEach, describe, expect, it, mock } from "bun:test";

import type { RootState } from "app/store";

let moduleVersion = 0;
const originalFetch = globalThis.fetch;

const buildState = (viewMode: "all" | "categories"): RootState =>
  ({
    space: {
      currentSpaceId: viewMode === "all" ? null : "space-1",
      currentSpace: null,
      memberSpaces: [],
      loading: false,
      initialized: true,
      collapsedCategories: {},
      viewMode,
      dialogStatuses: {},
      unreadDialogIds: {},
    },
  }) as RootState;

describe("mergeAgentToolsWithRuntime", () => {
  it("all view 不自动挂 search_all_spaces，改为推荐 search-all-spaces skill", async () => {
    const { mergeAgentToolsWithRuntime } = await import(
      `./streamAgentChatTurnUtils?v=${moduleVersion++}`
    );
    const result = mergeAgentToolsWithRuntime(
      {
        provider: "openai",
        model: "gpt-4o-mini",
        userId: "user-1",
        useServerProxy: true,
        updatedAt: "now",
        createdAt: 1,
        isPublic: false,
        tools: [],
      },
      [],
      [],
      undefined,
      buildState("all"),
    );

    // search_all_spaces 已移出 CORE，all 视图不再自动注入：工具面保持干净，
    // 全空间搜索改为 recommended hint，由 agent 按需 loadSkill 载入。
    expect(result.tools).not.toContain("search_all_spaces");
    expect(result.tools).not.toContain("search_workspace");
    expect(result.recommendedSkillHints).toContain("search-all-spaces");
  });

  it("uses search_workspace in categories view", async () => {
    const { mergeAgentToolsWithRuntime } = await import(
      `./streamAgentChatTurnUtils?v=${moduleVersion++}`
    );
    const result = mergeAgentToolsWithRuntime(
      {
        provider: "openai",
        model: "gpt-4o-mini",
        userId: "user-1",
        useServerProxy: true,
        updatedAt: "now",
        createdAt: 1,
        isPublic: false,
        tools: [],
      },
      [],
      [],
      undefined,
      buildState("categories"),
    );

    expect(result.tools).toContain("search_workspace");
    expect(result.tools).not.toContain("search_all_spaces");
    expect(result.recommendedSkillHints).not.toContain("search-all-spaces");
  });

  it("adds LIGHT_WEB companions without social-reader tools for web-search agents", async () => {
    const { mergeAgentToolsWithRuntime } = await import(
      `./streamAgentChatTurnUtils?v=${moduleVersion++}`
    );
    const result = mergeAgentToolsWithRuntime(
      {
        provider: "openai",
        model: "gpt-4o-mini",
        userId: "user-1",
        useServerProxy: true,
        updatedAt: "now",
        createdAt: 1,
        isPublic: false,
        tools: ["fetchWebpage"],
      },
      [],
      [],
      undefined,
      buildState("categories"),
    );

    expect(result.tools).toContain("exa_search");
    expect(result.tools).toContain("fetchWebpage");
    expect(result.tools).not.toContain("read_x_post");
    expect(result.tools).not.toContain("read_xhs_profile");
  });

  it("does not add social-reader tools to agents with no configured tools", async () => {
    const { mergeAgentToolsWithRuntime } = await import(
      `./streamAgentChatTurnUtils?v=${moduleVersion++}`
    );
    const result = mergeAgentToolsWithRuntime(
      {
        provider: "openai",
        model: "gpt-4o-mini",
        userId: "user-1",
        useServerProxy: true,
        updatedAt: "now",
        createdAt: 1,
        isPublic: false,
        tools: [],
      },
      [],
      [],
      undefined,
      buildState("categories"),
    );

    expect(result.tools).not.toContain("read_x_post");
  });

  it("默认给空配置 agent 注入 DEFAULT_ENABLED_PACKS（含 rememberMemory）", async () => {
    const { mergeAgentToolsWithRuntime } = await import(
      `./streamAgentChatTurnUtils?v=${moduleVersion++}`
    );
    const result = mergeAgentToolsWithRuntime(
      {
        provider: "openai",
        model: "gpt-4o-mini",
        userId: "user-1",
        useServerProxy: true,
        updatedAt: "now",
        createdAt: 1,
        isPublic: false,
        tools: [],
      },
      [],
      [],
      undefined,
      buildState("categories"),
    );

    // 空配置 agent fallback 补 long-term-memory + agent-orchestration 包：
    // rememberMemory 默认开，编排工具（startAgentRun/controlAgentRun/listAgents）默认挂
    expect(result.tools).toContain("rememberMemory");
    expect(result.tools).toContain("startAgentRun");
    expect(result.tools).toContain("controlAgentRun");
    expect(result.tools).toContain("listAgents");
    expect(result.tools).toContain("loadSkill");
    expect(result.tools).toContain("readSkillDoc");
    // 不 fallback web-search，避免改变空配置 agent 的 web 能力边界
    expect(result.tools).not.toContain("exa_search");
  });

  it("显式 enabledPacks 非空时幂等补齐编排包（HIGH-2 ensure）", async () => {
    const { mergeAgentToolsWithRuntime } = await import(
      `./streamAgentChatTurnUtils?v=${moduleVersion++}`
    );
    const result = mergeAgentToolsWithRuntime(
      {
        provider: "openai",
        model: "gpt-4o-mini",
        userId: "user-1",
        useServerProxy: true,
        updatedAt: "now",
        createdAt: 1,
        isPublic: false,
        tools: [],
        enabledPacks: ["web-search"],
      } as any,
      [],
      [],
      undefined,
      buildState("categories"),
    );

    // 显式配置过的 agent 也默认含编排包（startAgentRun/controlAgentRun/listAgents）
    expect(result.tools).toContain("startAgentRun");
    expect(result.tools).toContain("controlAgentRun");
    expect(result.tools).toContain("listAgents");
    // 用户显式勾选的包仍保留
    expect(result.tools).toContain("exa_search");
  });

  it("disabledTools 可单关编排工具，CORE 保留（关闭通道）", async () => {
    const { mergeAgentToolsWithRuntime } = await import(
      `./streamAgentChatTurnUtils?v=${moduleVersion++}`
    );
    const result = mergeAgentToolsWithRuntime(
      {
        provider: "openai",
        model: "gpt-4o-mini",
        userId: "user-1",
        useServerProxy: true,
        updatedAt: "now",
        createdAt: 1,
        isPublic: false,
        tools: [],
        disabledTools: ["startAgentRun", "controlAgentRun", "listAgents"],
      } as any,
      [],
      [],
      undefined,
      buildState("categories"),
    );

    expect(result.tools).not.toContain("startAgentRun");
    expect(result.tools).not.toContain("controlAgentRun");
    expect(result.tools).not.toContain("listAgents");
    // 其余默认包工具保留
    expect(result.tools).toContain("rememberMemory");
    expect(result.tools).toContain("search_workspace");
  });

  it("公开 agent 空配置 fallback 后工具面含编排三件套", async () => {
    const { mergeAgentToolsWithRuntime } = await import(
      `./streamAgentChatTurnUtils?v=${moduleVersion++}`
    );
    const result = mergeAgentToolsWithRuntime(
      {
        provider: "openai",
        model: "gpt-4o-mini",
        userId: "user-1",
        useServerProxy: true,
        updatedAt: "now",
        createdAt: 1,
        isPublic: true,
        tools: [],
      },
      [],
      [],
      undefined,
      buildState("categories"),
    );

    // 公开 agent 也默认获得编排能力包（HIGH-2 全量启用语义）
    expect(result.tools).toContain("startAgentRun");
    expect(result.tools).toContain("controlAgentRun");
    expect(result.tools).toContain("listAgents");
  });

  /**
   * 回归：勾了任意能力包（enabledPacks 非空）就走「按勾选展开」分支，此前只补
   * agent-orchestration，long-term-memory 被静默丢掉。现象是「只勾了联网搜索的
   * agent 就是不记事」，而设置页里长期记忆开关显示默认开启。
   */
  it("非空 enabledPacks 未勾 long-term-memory 时仍强制补 rememberMemory", async () => {
    const { mergeAgentToolsWithRuntime } = await import(
      `./streamAgentChatTurnUtils?v=${moduleVersion++}`
    );
    const result = mergeAgentToolsWithRuntime(
      {
        provider: "openai",
        model: "gpt-4o-mini",
        userId: "user-1",
        useServerProxy: true,
        updatedAt: "now",
        createdAt: 1,
        isPublic: false,
        tools: [],
        enabledPacks: ["web-search"],
      } as any,
      [],
      [],
      undefined,
      buildState("categories"),
    );

    expect(result.tools).toContain("rememberMemory");
    expect(result.tools).toContain("exa_search");
  });

  /**
   * inline-artifact agent 的定位是「纯产物生成、无交互工具」。强制追加包的守卫
   * 原本只覆盖 enabledPacks 为空的分支，勾过任意包的 inline-artifact agent 仍会被
   * 塞进 rememberMemory 与编排三件套。
   */
  it("inline-artifact agent 即使有非空 enabledPacks 也不被追加强制包", async () => {
    const { mergeAgentToolsWithRuntime } = await import(
      `./streamAgentChatTurnUtils?v=${moduleVersion++}`
    );
    const result = mergeAgentToolsWithRuntime(
      {
        provider: "openai",
        model: "gpt-4o-mini",
        userId: "user-1",
        useServerProxy: true,
        updatedAt: "now",
        createdAt: 1,
        isPublic: false,
        tools: [],
        tags: ["inline-artifact"],
        enabledPacks: ["web-search"],
      } as any,
      [],
      [],
      undefined,
      buildState("categories"),
    );

    expect(result.tools).not.toContain("rememberMemory");
    expect(result.tools).not.toContain("startAgentRun");
    expect(result.tools).not.toContain("controlAgentRun");
    expect(result.tools).not.toContain("listAgents");
  });

  it("非空 enabledPacks 下 disabledTools 仍能单关 rememberMemory", async () => {
    const { mergeAgentToolsWithRuntime } = await import(
      `./streamAgentChatTurnUtils?v=${moduleVersion++}`
    );
    const result = mergeAgentToolsWithRuntime(
      {
        provider: "openai",
        model: "gpt-4o-mini",
        userId: "user-1",
        useServerProxy: true,
        updatedAt: "now",
        createdAt: 1,
        isPublic: false,
        tools: [],
        enabledPacks: ["web-search"],
        disabledTools: ["rememberMemory"],
      } as any,
      [],
      [],
      undefined,
      buildState("categories"),
    );

    expect(result.tools).not.toContain("rememberMemory");
  });

  it("disabledTools 可单关 rememberMemory，其余默认包工具保留", async () => {
    const { mergeAgentToolsWithRuntime } = await import(
      `./streamAgentChatTurnUtils?v=${moduleVersion++}`
    );
    const result = mergeAgentToolsWithRuntime(
      {
        provider: "openai",
        model: "gpt-4o-mini",
        userId: "user-1",
        useServerProxy: true,
        updatedAt: "now",
        createdAt: 1,
        isPublic: false,
        tools: [],
        disabledTools: ["rememberMemory"],
      } as any,
      [],
      [],
      undefined,
      buildState("categories"),
    );

    expect(result.tools).not.toContain("rememberMemory");
    // 其他 CORE 工具不受影响
    expect(result.tools).toContain("search_workspace");
  });

  it("does not expose server-only core tools in browser runtime", async () => {
    const previousWindow = (globalThis as any).window;
    (globalThis as any).window = {};

    try {
      const { mergeAgentToolsWithRuntime } = await import(
        `./streamAgentChatTurnUtils?v=${moduleVersion++}`
      );
      const result = mergeAgentToolsWithRuntime(
        {
          provider: "openai",
          model: "gpt-4o-mini",
          userId: "user-1",
          useServerProxy: true,
          updatedAt: "now",
          createdAt: 1,
          isPublic: false,
          tools: [],
        },
        [],
        [],
        undefined,
        buildState("categories"),
      );

      expect(result.tools).toContain("search_workspace");
      expect(result.tools).not.toContain("createAgentAutomation");
      expect(result.tools).not.toContain("notifyUser");
      expect(result.tools).not.toContain("createScheduledTask");
    } finally {
      if (previousWindow === undefined) {
        delete (globalThis as any).window;
      } else {
        (globalThis as any).window = previousWindow;
      }
    }
  });

  it("does not inject core or choice tools into inline visual artifact agents", async () => {
    const { mergeAgentToolsWithRuntime } = await import(
      `./streamAgentChatTurnUtils?v=${moduleVersion++}`
    );
    const result = mergeAgentToolsWithRuntime(
      {
        provider: "fireworks",
        model: "accounts/fireworks/models/kimi-latest",
        userId: "user-1",
        useServerProxy: true,
        updatedAt: "now",
        createdAt: 1,
        isPublic: true,
        tools: [],
        tags: ["inline-artifact", "streaming-ui"],
      } as any,
      ["ask_user"],
      ["search_workspace"],
      { extraTools: ["ask_user"] },
      buildState("categories"),
    );

    expect(result.tools).toEqual([]);
    expect(result.tools).not.toContain("ask_user");
    expect(result.tools).not.toContain("search_workspace");
  });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("memory overlay context", () => {
  it("queries authenticated server memory for normal chat turns", async () => {
    const { fetchMemoryOverlayContext } = await import(
      `./streamAgentChatTurnUtils?v=${moduleVersion++}`
    );

    globalThis.fetch = mock(async () =>
      new Response(
        JSON.stringify({
          promptBlock:
            "--- Memory Overlay ---\n[Semantic]\n- 用户长期偏好/事实：用户是网站创建者 nolotus",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    ) as unknown as typeof fetch;

    const promptBlock = await fetchMemoryOverlayContext(
      {
        auth: { currentToken: "token-1" },
        settings: { currentServer: "https://nolo.chat" },
        space: { currentSpaceId: "space-1" },
      } as RootState,
      {
        dbKey: "agent-pub-01NOLOAPPBLD000000019KCKT0",
      } as any,
      "你知道我是谁吗？"
    );

    expect(promptBlock).toContain("用户是网站创建者 nolotus");
    const [requestUrl, requestInit] = (globalThis.fetch as any).mock.calls[0];
    expect(new URL(String(requestUrl)).pathname).toBe("/api/memory/query");
    expect(requestInit).toMatchObject({
      method: "POST",
      headers: expect.objectContaining({
        Authorization: "Bearer token-1",
      }),
      body: JSON.stringify({
        agentKey: "agent-pub-01NOLOAPPBLD000000019KCKT0",
        userInput: "你知道我是谁吗？",
        spaceId: "space-1",
      }),
    });
  });

  it("carries memory overlay into merged prompt contexts", async () => {
    const { mergeContexts } = await import(
      `./streamAgentChatTurnUtils?v=${moduleVersion++}`
    );

    const contexts = mergeContexts(
      {} as any,
      {
        currentInputContext: null,
        historyContext: "",
        editingContext: null,
        appWorkingMemory: null,
        dialogSummary: null,
        memoryOverlay: "--- Memory Overlay ---\n[Semantic]\n- 用户是 nolotus",
        referenceKeys: [],
      } as any
    );

    expect(contexts.memoryOverlay).toContain("用户是 nolotus");
  });
});

describe("validateAccessAndBalance", () => {
  // streamAgentChatTurn.test mocks this module; always restore + cache-bust.
  const loadValidateAccessAndBalance = async () => {
    mock.restore();
    const mod = await import(
      `./streamAgentChatTurnUtils.ts?validate=${moduleVersion++}`
    );
    return mod.validateAccessAndBalance as typeof import("./streamAgentChatTurnUtils").validateAccessAndBalance;
  };

  it("allows legacy platform agents with explicit pricing when catalog pricing is missing", async () => {
    const validateAccessAndBalance = await loadValidateAccessAndBalance();

    const error = validateAccessAndBalance(
      {
        provider: "openai",
        model: "gpt-4o-mini",
        userId: "other-user",
        useServerProxy: true,
        apiSource: "platform",
        inputPrice: 1.2,
        outputPrice: 4.8,
        updatedAt: "now",
        createdAt: 1,
        isPublic: true,
      } as any,
      {
        auth: {
          currentUser: {
            userId: "user-1",
            balance: 10,
          },
        },
      } as RootState
    );

    expect(error).toBeNull();
  });

  it("allows logged-out local custom agents before balance is available", async () => {
    const validateAccessAndBalance = await loadValidateAccessAndBalance();

    const error = validateAccessAndBalance(
      {
        dbKey: "agent-local-01AGENT",
        provider: "custom",
        model: "local-model",
        userId: "local",
        apiSource: "custom",
        customProviderUrl: "http://127.0.0.1:11434/v1",
      } as any,
      {
        auth: {
          currentUser: null,
        },
      } as RootState
    );

    expect(error).toBeNull();
  });

  it("allows logged-out local cli agents before balance is available", async () => {
    const validateAccessAndBalance = await loadValidateAccessAndBalance();

    const error = validateAccessAndBalance(
      {
        dbKey: "agent-local-01CLI",
        provider: "cli",
        model: "copilot-cli",
        userId: "local",
        apiSource: "cli",
      } as any,
      {
        auth: {
          currentUser: null,
        },
      } as RootState
    );

    expect(error).toBeNull();
  });

  it("asks for login when platform balance is missing instead of pretending balance is loading", async () => {
    const validateAccessAndBalance = await loadValidateAccessAndBalance();

    const error = validateAccessAndBalance(
      {
        provider: "openai",
        model: "gpt-4o-mini",
        userId: "other-user",
        apiSource: "platform",
        useServerProxy: true,
        inputPrice: 1.2,
        outputPrice: 4.8,
      } as any,
      {
        auth: {
          currentUser: null,
        },
      } as RootState
    );

    expect(error).toContain("请登录");
    expect(error).not.toContain("正在获取用户余额");
  });
});

describe("mergeAgentToolsWithRuntime app-builder capability pack", () => {
  it("组合展开 app-builder 的 17 个工具，并把两段 promptPatch 注入 skillPromptPatches", async () => {
    const { mergeAgentToolsWithRuntime } = await import(
      `./streamAgentChatTurnUtils?v=${moduleVersion++}`
    );
    const result = mergeAgentToolsWithRuntime(
      {
        provider: "nolo",
        model: "glm-5.2",
        userId: "user-1",
        useServerProxy: true,
        updatedAt: "now",
        createdAt: 1,
        isPublic: true,
        tools: [],
        enabledPacks: ["app-builder"],
      } as any,
      [],
      [],
      undefined,
      buildState("categories"),
    );

    expect(result.tools).toContain("appRead");
    expect(result.tools).toContain("appFileReplace");
    expect(result.tools).toContain("appPreflight");
    expect(result.tools).toContain("appDeploy");
    expect(result.tools).toContain("createTable");
    expect(result.tools).toContain("openAIGptImage");

    // 部署那三件已拆到 app-deploy 子包，工具与纪律都随 includes 组合带回来。
    expect(result.skillPromptPatches).toHaveLength(2);
    expect(result.skillPromptPatches[0]).toContain("应用构建能力包");
    expect(result.skillPromptPatches[0]).toContain("SSR");
    expect(result.skillPromptPatches[1]).toContain("应用发布能力包");
  });

  it("空配置 agent 的默认 fallback 包不注入 app-builder 的 promptPatch", async () => {
    const { mergeAgentToolsWithRuntime } = await import(
      `./streamAgentChatTurnUtils?v=${moduleVersion++}`
    );
    const result = mergeAgentToolsWithRuntime(
      {
        provider: "openai",
        model: "gpt-4o-mini",
        userId: "user-1",
        useServerProxy: true,
        updatedAt: "now",
        createdAt: 1,
        isPublic: false,
        tools: [],
      } as any,
      [],
      [],
      undefined,
      buildState("categories"),
    );

    expect(result.tools).toContain("rememberMemory");
    expect(result.tools).not.toContain("appRead");
    expect(result.skillPromptPatches ?? []).toEqual([]);
  });
});

describe("mergeAgentToolsWithRuntime — systemBuiltinSkills 全局开关", () => {
  const buildStateWithSkills = (
    systemBuiltinSkills: Record<string, boolean> | undefined,
    viewMode: "all" | "categories" = "categories",
  ): RootState =>
    ({
      ...buildState(viewMode),
      settings: systemBuiltinSkills ? { systemBuiltinSkills } : {},
    }) as RootState;

  it("默认开启（无 settings）保留 web-search 工具", async () => {
    const { mergeAgentToolsWithRuntime } = await import(
      `./streamAgentChatTurnUtils?v=${moduleVersion++}`
    );
    const result = mergeAgentToolsWithRuntime(
      {
        provider: "openai",
        model: "gpt-4o-mini",
        userId: "user-1",
        useServerProxy: true,
        updatedAt: "now",
        createdAt: 1,
        isPublic: false,
        enabledPacks: ["web-search"],
      } as any,
      [],
      [],
      undefined,
      buildStateWithSkills(undefined),
    );

    expect(result.tools).toContain("exa_search");
    expect(result.tools).toContain("fetchWebpage");
  });

  it("显式关闭 web-search 后过滤掉 exa_search 与 fetchWebpage，保留其他工具", async () => {
    const { mergeAgentToolsWithRuntime } = await import(
      `./streamAgentChatTurnUtils?v=${moduleVersion++}`
    );
    const result = mergeAgentToolsWithRuntime(
      {
        provider: "openai",
        model: "gpt-4o-mini",
        userId: "user-1",
        useServerProxy: true,
        updatedAt: "now",
        createdAt: 1,
        isPublic: false,
        enabledPacks: ["web-search", "long-term-memory"],
      } as any,
      [],
      [],
      undefined,
      buildStateWithSkills({ "web-search": false }),
    );

    expect(result.tools).not.toContain("exa_search");
    expect(result.tools).not.toContain("fetchWebpage");
    // long-term-memory 不受影响。
    expect(result.tools).toContain("rememberMemory");
  });

  it("显式关闭 conversation-todo 后过滤掉 setTodoList", async () => {
    const { mergeAgentToolsWithRuntime } = await import(
      `./streamAgentChatTurnUtils?v=${moduleVersion++}`
    );
    const result = mergeAgentToolsWithRuntime(
      {
        provider: "openai",
        model: "gpt-4o-mini",
        userId: "user-1",
        useServerProxy: true,
        updatedAt: "now",
        createdAt: 1,
        isPublic: false,
        tools: [],
      } as any,
      [],
      [],
      undefined,
      buildStateWithSkills({ "conversation-todo": false }),
    );

    expect(result.tools).not.toContain("setTodoList");
    expect(result.tools).toContain("ask_user");
  });

  it("显式开启 web-search 时保留 web-search 工具", async () => {
    const { mergeAgentToolsWithRuntime } = await import(
      `./streamAgentChatTurnUtils?v=${moduleVersion++}`
    );
    const result = mergeAgentToolsWithRuntime(
      {
        provider: "openai",
        model: "gpt-4o-mini",
        userId: "user-1",
        useServerProxy: true,
        updatedAt: "now",
        createdAt: 1,
        isPublic: false,
        enabledPacks: ["web-search"],
      } as any,
      [],
      [],
      undefined,
      buildStateWithSkills({ "web-search": true }),
    );

    expect(result.tools).toContain("exa_search");
    expect(result.tools).toContain("fetchWebpage");
  });
});
