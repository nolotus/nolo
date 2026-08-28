import { afterEach, describe, expect, it } from "bun:test";
import {
  formatAgentListCard,
  listAgentsFunc,
  listAgentsFunctionSchema,
  readDialogFunctionSchema,
  readAgentFunctionSchema,
} from "./noloWorkspaceReadTools";

const originalFetch = globalThis.fetch;

const buildThunkApi = () => ({
  getState: () => ({
    auth: { currentToken: "test-token", userId: "user-1" },
    settings: {},
  }),
});

const agentRecords = [
  {
    id: "agent-1",
    dbKey: "agent-user-1-agent-1",
    name: "Private Agent",
    model: "gpt-test",
    isPublic: false,
    updatedAt: "2026-07-01T00:00:00.000Z",
    tools: ["read", "exa_search"],
  },
  {
    id: "agent-2",
    dbKey: "agent-user-1-agent-2",
    name: "Public Agent",
    model: "gpt-test",
    isPublic: true,
    updatedAt: "2026-07-02T00:00:00.000Z",
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
    // listAgentsFunc 按 updatedAt 降序排列（最新在前），不依赖顺序断言字段
    const byId = new Map<string, any>(agents.map((agent: any) => [agent.id, agent]));
    expect(byId.get("agent-1")?.name).toBe("Private Agent");
    expect(byId.get("agent-1")?.isPublic).toBe(false);
    expect(byId.get("agent-1")?.tools).toEqual(["read", "exa_search"]);
    // Private agent: publicKey must be omitted entirely, not synthesized.
    expect(byId.get("agent-1")).not.toHaveProperty("publicKey");
    // Public agent (isPublic=true) without explicit publicKey: also omitted.
    // isPublic is a flag, NOT proof the agent-pub-<id> record exists.
    // listAgentsFunc cannot cheaply verify existence → omit rather than guess.
    expect(byId.get("agent-2")).not.toHaveProperty("publicKey");
    expect((result.rawData as any).total).toBe(2);
  });

  it("publicOnly=true 只返回公开 agent", async () => {
    mockQueryFetch(agentRecords);
    const result = await listAgentsFunc(
      { publicOnly: true },
      buildThunkApi(),
    );
    const agents = (result.rawData as any).agents;
    expect(agents).toHaveLength(1);
    expect(agents[0].id).toBe("agent-2");
  });

  it("游客（无 token/userId）返回空结果而非抛错", async () => {
    const thunkApi = { getState: () => undefined };
    const result = await listAgentsFunc({}, thunkApi);
    expect((result.rawData as any).total).toBe(0);
    expect((result.rawData as any).agents).toEqual([]);
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
