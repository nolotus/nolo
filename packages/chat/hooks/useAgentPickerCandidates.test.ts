import { describe, expect, it } from "bun:test";
import {
  buildAgentPickerCandidates,
  type AgentPickerCandidate,
} from "./useAgentPickerCandidates";

const owned = (id: string, extra: Record<string, any> = {}) => ({
  dbKey: id,
  userId: "u1",
  updatedAt: 1_000_000,
  ...extra,
});
const pub = (id: string, extra: Record<string, any> = {}) => ({
  dbKey: `agent-pub-${id}`,
  updatedAt: 500_000,
  ...extra,
});

const asKeys = (list: AgentPickerCandidate[]) => list.map((c) => c.key);

describe("buildAgentPickerCandidates", () => {
  it("orders favorites first, then owned, then public", () => {
    const result = buildAgentPickerCandidates({
      ownedAgents: [owned("owned-1")],
      publicAgents: [pub("pub-1")],
      favoriteAgentIds: ["agent-pub-pub-1"],
      favoritedAtById: { "agent-pub-pub-1": 2_000_000 },
      activeAgentId: null,
      currentUserId: "u1",
      limit: 30,
    });
    // pub-1 是收藏 → 排在 owned/public 之前
    expect(asKeys(result)).toEqual(["agent-pub-pub-1", "owned-1"]);
    expect(result[0].isFavorite).toBe(true);
  });

  it("dedupes owned before public (owned wins, favorite flag merged)", () => {
    const sameKey = "agent-pub-x";
    const result = buildAgentPickerCandidates({
      ownedAgents: [{ dbKey: sameKey, userId: "u1", updatedAt: 9_000_000 }],
      publicAgents: [{ dbKey: sameKey, updatedAt: 1_000_000 }],
      favoriteAgentIds: [sameKey],
      favoritedAtById: { [sameKey]: 5_000_000 },
      activeAgentId: null,
      currentUserId: "u1",
      limit: 30,
    });
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe(sameKey);
    expect(result[0].isFavorite).toBe(true);
    expect(result[0].isOwned).toBe(true);
  });

  it("forces active agent to the first position when already in list", () => {
    const result = buildAgentPickerCandidates({
      ownedAgents: [owned("owned-1"), owned("owned-2")],
      publicAgents: [pub("pub-1")],
      favoriteAgentIds: ["agent-pub-pub-1"],
      favoritedAtById: { "agent-pub-pub-1": 2_000_000 },
      activeAgentId: "owned-2",
      currentUserId: "u1",
      limit: 30,
    });
    expect(result[0].key).toBe("owned-2");
    expect(asKeys(result)).toContain("agent-pub-pub-1");
  });

  it("prepends active agent when not present in any source", () => {
    const result = buildAgentPickerCandidates({
      ownedAgents: [owned("owned-1")],
      publicAgents: [pub("pub-1")],
      favoriteAgentIds: ["agent-pub-pub-1"],
      favoritedAtById: { "agent-pub-pub-1": 2_000_000 },
      activeAgentId: "orphan-agent",
      currentUserId: "u1",
      limit: 30,
    });
    expect(result[0].key).toBe("orphan-agent");
    // orphan 不占 limit 配额，列表应比无 active 时多 1
    expect(result).toHaveLength(3);
  });

  it("respects limit cap (active does not consume the quota)", () => {
    const ownedList = Array.from({ length: 20 }, (_, i) => owned(`o-${i}`));
    const publicList = Array.from({ length: 20 }, (_, i) => pub(`p-${i}`));
    const result = buildAgentPickerCandidates({
      ownedAgents: ownedList,
      publicAgents: publicList,
      favoriteAgentIds: [],
      favoritedAtById: {},
      activeAgentId: "orphan",
      currentUserId: "u1",
      limit: 10,
    });
    // limit=10 + active 额外置顶 = 11
    expect(result).toHaveLength(11);
    expect(result[0].key).toBe("orphan");
  });

  it("marks owned by currentUserId even when source is public", () => {
    const result = buildAgentPickerCandidates({
      ownedAgents: [],
      publicAgents: [{ dbKey: "agent-x", userId: "u1", updatedAt: 1 }],
      favoriteAgentIds: [],
      favoritedAtById: {},
      activeAgentId: null,
      currentUserId: "u1",
      limit: 30,
    });
    expect(result[0].key).toBe("agent-x");
    expect(result[0].isOwned).toBe(true);
  });

  it("matches favorite via alternative identifier (id field) not just dbKey", () => {
    // favoriteStore 存的可能是 id 而非 dbKey；agent 记录的 id 字段应也能命中收藏
    const result = buildAgentPickerCandidates({
      ownedAgents: [],
      publicAgents: [{ dbKey: "agent-pub-real", id: "real", updatedAt: 1 }],
      favoriteAgentIds: ["real"],
      favoritedAtById: { real: 3_000_000 },
      activeAgentId: null,
      currentUserId: "u1",
      limit: 30,
    });
    // 备选 id 必须写入 seen，不能再冒出一条 orphan「real」
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("agent-pub-real");
    expect(result[0].isFavorite).toBe(true);
  });

  it("keeps favorite priority and badge when favoritedAt timestamp is missing/zero", () => {
    // isFavorite=true 但 favoritedAtById 无记录：favoritedAt 兜底为正数，
    // 排序后仍应落入收藏组且 isFavorite 保持 true（不跌落为 false）。
    const result = buildAgentPickerCandidates({
      ownedAgents: [owned("owned-1")],
      publicAgents: [pub("pub-1")],
      favoriteAgentIds: ["agent-pub-pub-1"],
      favoritedAtById: {},
      activeAgentId: null,
      currentUserId: "u1",
      limit: 30,
    });
    expect(result[0].key).toBe("agent-pub-pub-1");
    expect(result[0].isFavorite).toBe(true);
  });

  it("returns empty when no sources and no active agent", () => {
    const result = buildAgentPickerCandidates({
      ownedAgents: [],
      publicAgents: [],
      favoriteAgentIds: [],
      favoritedAtById: {},
      activeAgentId: null,
      currentUserId: "u1",
      limit: 30,
    });
    expect(result).toEqual([]);
  });

  it("returns only active agent when sources empty but active present", () => {
    const result = buildAgentPickerCandidates({
      ownedAgents: [],
      publicAgents: [],
      favoriteAgentIds: [],
      favoritedAtById: {},
      activeAgentId: "only-active",
      currentUserId: "u1",
      limit: 30,
    });
    expect(asKeys(result)).toEqual(["only-active"]);
  });

  it("includes orphan favorite ids not yet present in owned/public sources", () => {
    const result = buildAgentPickerCandidates({
      ownedAgents: [owned("owned-1")],
      publicAgents: [],
      favoriteAgentIds: ["fav-orphan"],
      favoritedAtById: { "fav-orphan": 9_000_000 },
      activeAgentId: null,
      currentUserId: "u1",
      limit: 30,
    });
    expect(asKeys(result)).toEqual(["fav-orphan", "owned-1"]);
    expect(result[0].isFavorite).toBe(true);
  });
});