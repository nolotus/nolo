import { afterEach, describe, expect, it } from "bun:test";
import {
  formatAgentListCard,
  listAgentsFunc,
  listAgentsFunctionSchema,
  listSpacesFunc,
  readDialogFunctionSchema,
  readAgentFunctionSchema,
  readDialogFunc,
  readSpaceFunc,
} from "./noloWorkspaceReadTools";

const originalFetch = globalThis.fetch;

const buildThunkApi = () => ({
  getState: () => ({
    auth: {
      currentToken: "test-token",
      currentUser: { userId: "user-1" },
      userId: "user-1",
    },
    settings: {},
  }),
});

const agentRecords = [
  {
    id: "agent-1",
    dbKey: "agent-local-agent-1",
    userId: "local",
    name: "Private Agent",
    model: "gpt-test",
    isPublic: false,
    updatedAt: "2026-07-01T00:00:00.000Z",
    tools: ["read", "exa_search"],
  },
  {
    id: "agent-2",
    dbKey: "agent-local-agent-2",
    userId: "local",
    name: "Public Agent",
    model: "gpt-test",
    isPublic: true,
    updatedAt: "2026-07-02T00:00:00.000Z",
    tools: ["read"],
  },
  {
    id: "agent-3",
    dbKey: "agent-pub-agent-3",
    publicKey: "agent-pub-agent-3",
    userId: "other-user",
    name: "Shared Public Agent",
    model: "gpt-test",
    isPublic: true,
    updatedAt: "2026-07-03T00:00:00.000Z",
    tools: ["read"],
  },
];

const mockQueryFetch = (records: unknown[]) => {
  globalThis.fetch = (async (input: any) => {
    const url = String(input);
    if (url.includes("/api/v1/db/query/")) {
      return new Response(
        JSON.stringify({ data: { data: records } }),
        { status: 200 },
      );
    }
    if (url.includes("/rpc/listFavorites") || url.includes("/api/v1/db/read/")) {
      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    }
    throw new Error(`unexpected fetch: ${url}`);
  }) as typeof fetch;
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("listAgentsFunc", () => {
  it("返回 agent 列表且不暴露 privateKey/dbKey（降权）", async () => {
    mockQueryFetch(agentRecords);
    const result = await listAgentsFunc({}, buildThunkApi());
    const agents = (result.rawData as any).agents;
    expect(agents).toHaveLength(2);
    for (const agent of agents) {
      expect(agent).not.toHaveProperty("privateKey");
      expect(agent).not.toHaveProperty("dbKey");
    }
    const byName = new Map<string, any>(agents.map((agent: any) => [agent.name, agent]));
    expect(byName.get("Private Agent")?.isPublic).toBe(false);
    expect(byName.get("Private Agent")?.billingSource).toBe("platform_credits");
    expect(byName.get("Private Agent")?.tools).toEqual(["read", "exa_search"]);
    // 默认精简投影：噪音字段一律不出现。
    for (const field of ["id", "introduction", "cliProvider", "modelAbility", "updatedAt", "inputPrice", "outputPrice"]) {
      expect(byName.get("Private Agent")).not.toHaveProperty(field);
    }
    // Public agent (isPublic=true) without explicit publicKey: also omitted.
    // isPublic is a flag, NOT proof the agent-pub-<id> record exists.
    // listAgentsFunc cannot cheaply verify existence → omit rather than guess.
    expect(byName.get("Public Agent")).not.toHaveProperty("publicKey");
    expect((result.rawData as any).total).toBe(2);
  });

  it("verbose: true 返回完整字段集，但 null 值键仍被省略", async () => {
    mockQueryFetch(agentRecords);
    const result = await listAgentsFunc({ verbose: true }, buildThunkApi());
    const raw = JSON.stringify(result.rawData);
    const byName = new Map<string, any>(
      ((result.rawData as any).agents as any[]).map((agent) => [agent.name, agent]),
    );
    expect(byName.get("Private Agent")?.updatedAt).toBe("2026-07-01T00:00:00.000Z");
    expect(byName.get("Private Agent")?.billingSource).toBe("platform_credits");
    // 完整摘要同样不给私有 agent 一个无法解析的 publicKey。
    expect(byName.get("Private Agent")).not.toHaveProperty("publicKey");
    // fixture 里 handle/introduction/价格等均为 null → 整个响应不出现 null 值键。
    expect(raw).not.toContain("null");
  });

  it("publicOnly=true 只返回公开 agent（映射到 scope=public，排除 preferred）", async () => {
    mockQueryFetch(agentRecords);
    const result = await listAgentsFunc(
      { publicOnly: true },
      buildThunkApi(),
    );
    const agents = (result.rawData as any).agents;
    expect(agents).toHaveLength(1);
    expect(agents[0].name).toBe("Shared Public Agent");
    expect(agents[0].billingSource).toBe("platform_credits");
  });

  it("scope='all' 返回 preferred 和 public 的去重并集", async () => {
    mockQueryFetch(agentRecords);
    const result = await listAgentsFunc(
      { scope: "all" },
      buildThunkApi(),
    );
    const agents = (result.rawData as any).agents;
    expect(agents).toHaveLength(3);
  });

  it("游客（无 token/userId）返回空结果而非抛错", async () => {
    const thunkApi = { getState: () => undefined };
    const result = await listAgentsFunc({}, thunkApi);
    expect((result.rawData as any).total).toBe(0);
    expect((result.rawData as any).agents).toEqual([]);
    expect((result.rawData as any).unavailableCount).toBe(0);
    expect((result.rawData as any).unavailableAgents).toEqual([]);
  });

  it("无 429 agent 时 unavailableAgents 为空数组且 unavailableCount 为 0", async () => {
    mockQueryFetch(agentRecords);
    const result = await listAgentsFunc({}, buildThunkApi());
    const rawData = result.rawData as any;
    expect(rawData.unavailableCount).toBe(0);
    expect(rawData.unavailableAgents).toEqual([]);
  });

  it("存在 429 agent 时 agents 数组不含它、unavailableCount 正确、unavailableAgents 含其摘要且字段齐全", async () => {
    const cooldownDeadline = Date.now() + 120000;
    const mixedRecords = [
      ...agentRecords,
      {
        id: "agent-rate-limited",
        dbKey: "agent-local-agent-rate-limited",
        userId: "local",
        name: "Rate Limited Agent",
        model: "claude-3-5-sonnet",
        provider: "anthropic",
        apiSource: "custom",
        isFavorite: true,
        favoritedAt: 1700000000000,
        nextAvailableAt: cooldownDeadline,
        updatedAt: "2026-07-03T00:00:00.000Z",
        tools: ["editFile"],
      },
    ];
    mockQueryFetch(mixedRecords);
    const result = await listAgentsFunc({}, buildThunkApi());
    const rawData = result.rawData as any;

    expect(rawData.total).toBe(2);
    expect(rawData.agents).toHaveLength(2);
    expect(rawData.agents.some((a: any) => a.name === "Rate Limited Agent")).toBe(false);

    expect(rawData.unavailableCount).toBe(1);
    expect(rawData.unavailableAgents).toHaveLength(1);

    const unavailable = rawData.unavailableAgents[0];
    expect(unavailable.name).toBe("Rate Limited Agent");
    expect(unavailable.model).toBe("claude-3-5-sonnet");
    expect(unavailable.provider).toBe("anthropic");
    expect(unavailable.apiSource).toBe("custom");
    expect(unavailable.isFavorite).toBe(true);
    expect(unavailable.isOAuth).toBe(false);
    expect(typeof unavailable.isOwned).toBe("boolean");
    expect(unavailable.nextAvailableAt).toBe(cooldownDeadline);
    expect(unavailable.favoritedAt).toBe(1700000000000);
    expect(unavailable.updatedAt).toBe("2026-07-03T00:00:00.000Z");
  });

  it("showUnavailable: true 时 agents 包含 429 agent，unavailableAgents 仍返回其摘要", async () => {
    const cooldownDeadline = Date.now() + 120000;
    const mixedRecords = [
      ...agentRecords,
      {
        id: "agent-rate-limited",
        dbKey: "agent-local-agent-rate-limited",
        userId: "local",
        name: "Rate Limited Agent",
        model: "claude-3-5-sonnet",
        provider: "anthropic",
        apiSource: "custom",
        isFavorite: true,
        nextAvailableAt: cooldownDeadline,
        updatedAt: "2026-07-03T00:00:00.000Z",
      },
    ];
    mockQueryFetch(mixedRecords);
    const result = await listAgentsFunc({ showUnavailable: true }, buildThunkApi());
    const rawData = result.rawData as any;

    expect(rawData.total).toBe(3);
    expect(rawData.agents).toHaveLength(3);
    expect(rawData.agents.some((a: any) => a.name === "Rate Limited Agent")).toBe(true);

    expect(rawData.unavailableCount).toBe(1);
    expect(rawData.unavailableAgents).toHaveLength(1);
    expect(rawData.unavailableAgents[0].name).toBe("Rate Limited Agent");
    expect(rawData.unavailableAgents[0].nextAvailableAt).toBe(cooldownDeadline);
  });
});

describe("readDialog schema contract", () => {
  it("documents dialog resolution matching resolveNoloDialogInput", () => {
    const description = readDialogFunctionSchema.description;
    expect(description).toContain("dbKey (dialog-<userId>-<id>)");
    expect(description).toContain("dialog URL");
    expect(description).toMatch(/bare id only resolves for the currently logged-in user/i);
    expect(description).toContain("listDialogs");
    // 与 resolveNoloDialogInput 的真实行为一致，不伪造不存在的参数：
    // schema 只暴露 dialog / limit 两个参数。
    const properties = (readDialogFunctionSchema.parameters as any).properties;
    expect(Object.keys(properties).sort()).toEqual(["dialog", "limit"]);
    expect(readDialogFunctionSchema.parameters.required).toEqual(["dialog"]);
    expect(properties.dialog.description).toContain("dialog-");
    expect(properties.limit).toBeDefined();
  });
});

describe("agent tool contracts", () => {
  it("requires the runnable agentKey and rejects display names", () => {
    expect(listAgentsFunctionSchema.description).toContain("agentKey");
    expect(listAgentsFunctionSchema.description).toContain("Copy `agentKey` verbatim into startAgentRun");
    expect(listAgentsFunctionSchema.description).toContain("unavailableAgents");
    expect(listAgentsFunctionSchema.description).toContain("unavailableCount");
    expect(readAgentFunctionSchema.description).toContain("exact agentKey from listAgents");
    expect(readAgentFunctionSchema.description).toContain("do not pass the display name");
    expect(readAgentFunctionSchema.parameters.properties.agent.description).toContain("Do not use the display name");
  });
});

describe("formatAgentListCard", () => {
  it("formats agent summary list into readable card block", () => {
    const agents = [
      {
        name: "Agent Alpha",
        model: "gemini-3.6-flash-high",
        apiSource: "platform",
        isFavorite: true,
        isOwned: true,
        agentKey: "agent-pub-alpha",
      },
      {
        name: "Agent Beta",
        model: "claude-3-5-sonnet",
        provider: "anthropic",
        isFavorite: false,
        agentKey: "agent-user-1-beta-id",
      },
    ];
    const card = formatAgentListCard(agents);
    expect(card).toBe(
      "Agents (2)\n★◎ Agent Alpha  gemini-3.6-flash-high  platform  agent-pub-alpha\n   Agent Beta  claude-3-5-sonnet  anthropic  agent-user-1-beta-id"
    );
    expect(card).toContain("agent-pub-alpha");
    expect(card).toContain("beta-id");
  });

  it("handles empty agent list and fallback fields", () => {
    expect(formatAgentListCard([])).toBe("Agents (0)");
    const agentWithFallbacks = [{ isFavorite: false }];
    expect(formatAgentListCard(agentWithFallbacks)).toBe("Agents (1)\n   (unnamed)  —  —  (agentKey unavailable)");
  });

  it("truncates agents list exceeding maxDisplay limit", () => {
    const agents = Array.from({ length: 5 }, (_, i) => ({
      name: `Agent ${i + 1}`,
      model: "gpt-4",
      apiSource: "custom",
      agentKey: `agent-pub-${i + 1}`,
    }));
    const card = formatAgentListCard(agents, 3);
    expect(card).toContain("Agents (5)");
    expect(card).toContain("Agent 3");
    expect(card).not.toContain("[agent-pub-3]");
    expect(card).not.toContain("Agent 4");
    expect(card).toContain("… +2 more");
  });

  it("defaults to showing only 8 agents even when more are passed", () => {
    const agents = Array.from({ length: 12 }, (_, i) => ({
      name: `Agent ${i + 1}`,
      model: "gpt-4",
      apiSource: "custom",
      agentKey: `agent-pub-${i + 1}`,
    }));
    const card = formatAgentListCard(agents);
    expect(card).toContain("Agents (12)");
    expect(card).toContain("Agent 8");
    expect(card).not.toContain("Agent 9");
    expect(card).toContain("… +4 more");
  });
});

/**
 * drain 窗口保护下沉到共享层后，workspace 读工具（/rpc/* 等裸 fetch 路径）必须
 * 默认继承：503 core_draining 自动重试；预算耗尽后给 agent 的是共享层的友好
 * 文案（显式错误），而不是 raw JSON，也不是伪装成功的空结果。
 * retryAfterMs: 1 让 30 次长预算在测试里瞬间走完。
 */
describe("workspace read tools drain-window retry (shared layer wiring)", () => {
  const dialogId = "01ARZ3NDEKTSV4RRFFQ69G5FAV";
  const drain503 = () =>
    new Response(
      JSON.stringify({
        error: "Server draining",
        reason: "core_draining",
        retryable: true,
        retryAfterMs: 1,
      }),
      { status: 503, headers: { "content-type": "application/json" } },
    );

  it("readDialogFunc retries 503 core_draining on /rpc/getConvMsgs and succeeds", async () => {
    let msgsCalls = 0;
    globalThis.fetch = (async (input: any) => {
      const url = String(input);
      if (url.includes("/rpc/getConvMsgs")) {
        msgsCalls += 1;
        if (msgsCalls <= 2) return drain503();
        return new Response(JSON.stringify([{ role: "assistant", content: "ok" }]), { status: 200 });
      }
      if (url.includes("/api/v1/db/read/")) {
        return new Response(JSON.stringify({ data: { title: "Drain me" } }), { status: 200 });
      }
      throw new Error(`unexpected fetch: ${url}`);
    }) as typeof fetch;

    const result = await readDialogFunc({ dialog: dialogId, limit: 25 }, buildThunkApi());

    // 2 次 drain 503 + 1 次成功：读取路径确实走了共享重试。
    expect(msgsCalls).toBe(3);
    const raw = result.rawData as any;
    expect(raw.success).toBe(true);
    expect(raw.messages).toHaveLength(1);
    const text = JSON.stringify(result);
    expect(text).not.toContain("Server draining");
    expect(text).not.toContain("core_draining");
  });

  it("listSpacesFunc surfaces the friendly copy after the drain budget is exhausted", async () => {
    let calls = 0;
    globalThis.fetch = (async (input: any) => {
      calls += 1;
      return drain503();
    }) as typeof fetch;

    let caught: unknown = null;
    try {
      await listSpacesFunc({}, buildThunkApi());
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    const message = (caught as Error).message;
    // 预算耗尽后是友好文案；既不是 raw JSON，也不是误导性的「未登录/不可达」。
    expect(message).toContain("服务正在重启中，请稍后重试");
    expect(message).not.toContain("Server draining");
    expect(message).not.toContain("core_draining");
    expect(message).not.toContain("listSpaces requires a signed-in user");
    // /rpc/getUserSpaceMemberships 打满 core_draining 专属长预算（30 次）。
    expect(calls).toBe(30);
  });

  it("keeps network-error replay enabled for idempotent read paths (default retryNetworkErrors)", async () => {
    let calls = 0;
    globalThis.fetch = (async (input: any) => {
      const url = String(input);
      if (url.includes("/rpc/getUserSpaceMemberships")) {
        calls += 1;
        if (calls <= 2) throw new Error("socket hang up");
        return new Response(JSON.stringify([{ spaceId: "space-1", spaceName: "Alpha" }]), { status: 200 });
      }
      throw new Error(`unexpected fetch: ${url}`);
    }) as typeof fetch;

    const result = await listSpacesFunc({}, buildThunkApi());

    // 读操作（POST 查询，无副作用）重放安全：瞬时网络错误按共享层默认
    // （retryNetworkErrors: true，本批接线未显式关闭）重试后成功。
    expect(calls).toBe(3);
    expect((result.rawData as any).spaces).toHaveLength(1);
  });

  it("readSpaceFunc surfaces the friendly copy instead of a misleading not-found after drain exhaustion", async () => {
    globalThis.fetch = (async (input: any) => {
      const url = String(input);
      if (url.includes("/api/v1/db/read/")) return drain503();
      throw new Error(`unexpected fetch: ${url}`);
    }) as typeof fetch;

    let caught: unknown = null;
    try {
      await readSpaceFunc({ space: "space-abc" }, buildThunkApi());
    } catch (error) {
      caught = error;
    }

    // 重试耗尽 → 友好文案；绝不能落进 readBestRecord 的 null → 「not found」。
    expect(caught).toBeInstanceOf(Error);
    const message = (caught as Error).message;
    expect(message).toContain("服务正在重启中，请稍后重试");
    expect(message).not.toContain("readSpace not found");
    expect(message).not.toContain("Server draining");
    expect(message).not.toContain("core_draining");
  });

  it("listAgentsFunc surfaces the friendly copy instead of an empty list when /rpc/listFavorites drains out", async () => {
    let favCalls = 0;
    globalThis.fetch = (async (input: any) => {
      const url = String(input);
      if (url.includes("/rpc/listFavorites")) {
        favCalls += 1;
        return drain503();
      }
      if (url.includes("/api/v1/db/query/")) {
        return new Response(JSON.stringify({ data: { data: agentRecords } }), { status: 200 });
      }
      if (url.includes("/api/v1/db/read/")) {
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
      }
      throw new Error(`unexpected fetch: ${url}`);
    }) as typeof fetch;

    let caught: unknown = null;
    try {
      await listAgentsFunc({}, buildThunkApi());
    } catch (error) {
      caught = error;
    }

    // 记录查询成功、收藏映射 drain 耗尽：必须显式报「服务正在重启」，
    // 不能吞成空 favorites map 让 listAgents 以成功语义展示残缺列表。
    expect(caught).toBeInstanceOf(Error);
    const message = (caught as Error).message;
    expect(message).toContain("服务正在重启中，请稍后重试");
    expect(message).not.toContain("Server draining");
    expect(message).not.toContain("core_draining");
    // /rpc/listFavorites 打满 core_draining 专属长预算（30 次）后才上抛。
    expect(favCalls).toBe(30);
  });
});
