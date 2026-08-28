import { describe, expect, it } from "bun:test";
import {
  isAgentUnavailableNow,
  listFavoriteAgentIdsAcrossServers,
  normalizeListedAgent,
  parseAgentListArgs,
  toSafeListedAgentSummary,
} from "./agentListHelpers";
import type { CliFetchImpl } from "./cliFetch";

const rpcResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("listFavoriteAgentIdsAcrossServers", () => {
  it("calls the listFavorites RPC per server and merges favoritedAt (max wins)", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchImpl: CliFetchImpl = async (input, init) => {
      const url = String(input);
      calls.push({ url, init });
      if (url.includes("server-a")) {
        return rpcResponse({
          items: [
            { id: "agent-1", favoritedAt: 100 },
            { id: "agent-2", favoritedAt: 200 },
          ],
        });
      }
      return rpcResponse({
        items: [{ id: "agent-2", favoritedAt: 300 }],
        ids: ["agent-3"],
      });
    };

    const map = await listFavoriteAgentIdsAcrossServers({
      authToken: "token-1",
      fetchImpl,
      serverUrls: ["https://server-a.test", "https://server-b.test"],
    });

    expect(calls).toHaveLength(2);
    expect(calls[0].url).toBe("https://server-a.test/rpc/listFavorites");
    const headers = calls[0].init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer token-1");
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({
      targetType: "agent",
    });
    expect(map).toEqual({ "agent-1": 100, "agent-2": 300, "agent-3": 1 });
  });

  it("skips failing servers silently", async () => {
    const fetchImpl: CliFetchImpl = async (input) => {
      if (String(input).includes("bad")) throw new Error("network down");
      return rpcResponse({ items: [{ id: "agent-1", favoritedAt: 5 }] });
    };

    const map = await listFavoriteAgentIdsAcrossServers({
      authToken: "t",
      fetchImpl,
      serverUrls: ["https://bad.test", "https://good.test"],
    });

    expect(map).toEqual({ "agent-1": 5 });
  });

  it("returns an empty map when every server fails", async () => {
    const fetchImpl: CliFetchImpl = async () => rpcResponse({}, 500);
    const map = await listFavoriteAgentIdsAcrossServers({
      authToken: "t",
      fetchImpl,
      serverUrls: ["https://x.test"],
    });
    expect(map).toEqual({});
  });
});

describe("toSafeListedAgentSummary publicKey omission", () => {
  const privateRecord = {
    dbKey: "agent-user1-abc123",
    id: "abc123",
    userId: "user1",
    name: "Test Agent",
    model: "test-model",
    isPublic: false,
  };

  it("omits the publicKey field entirely when publicRecordExists === false", () => {
    const agent = normalizeListedAgent(privateRecord);
    expect(agent).not.toBeNull();
    agent!.publicRecordExists = false;

    const summary = toSafeListedAgentSummary(agent!);
    // 整个字段省略（不是 null），模型才不会拿它去 readAgent
    expect("publicKey" in summary).toBe(false);
    // 裸 id 仍然保留，调用方可用它走双候选解析
    expect(summary.id).toBe("abc123");
    // 序列化结果里也不能出现 publicKey
    expect(JSON.stringify(summary)).not.toContain("publicKey");
  });

  it("keeps a runnable agentKey across the normalize → safe-summary boundary", () => {
    // ListedAgent 只带 privateKey（无 dbKey/userId）。若 isOwned 判定认不出这个
    // 形态，`agent list --safe` 会把自建 agent 全判成非自建并省略 agentKey，
    // TUI 显示 "(agentKey unavailable)"、模型无法派发。
    const agent = normalizeListedAgent(privateRecord);
    const summary = toSafeListedAgentSummary(agent!, { userId: "user1" });
    expect(summary.isOwned).toBe(true);
    expect(summary.agentKey).toBe("agent-user1-abc123");
  });

  it("keeps publicKey when publicRecordExists === true", () => {
    const agent = normalizeListedAgent(privateRecord);
    expect(agent).not.toBeNull();
    agent!.publicRecordExists = true;

    const summary = toSafeListedAgentSummary(agent!);
    expect(summary.publicKey).toBe("agent-pub-abc123");
  });
});

describe("parseAgentListArgs show-unavailable flag", () => {
  it("defaults to hidden and honors --show-unavailable", () => {
    expect(parseAgentListArgs([]).showUnavailable).toBe(false);
    expect(parseAgentListArgs(["--show-unavailable"]).showUnavailable).toBe(true);
    expect(parseAgentListArgs(["--json"]).showUnavailable).toBe(false);
  });
});
