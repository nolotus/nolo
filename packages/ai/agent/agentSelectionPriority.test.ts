import { describe, expect, test } from "bun:test";
import {
  isUserConfiguredAgent,
  resolveAgentSelectionPriority,
  compareAgentSelection,
  parseAgentTimestamp,
  AGENT_SELECTION_PRIORITY_INSTRUCTIONS,
} from "./agentSelectionPriority";

describe("agentSelectionPriority", () => {
  test("isUserConfiguredAgent identifies OAuth and custom-owned agents", () => {
    expect(isUserConfiguredAgent({ isOAuth: true })).toBe(true);
    expect(isUserConfiguredAgent({ isOwned: true, apiSource: "custom" })).toBe(true);
    expect(isUserConfiguredAgent({ isOwned: true, apiSource: "platform" })).toBe(false);
    expect(isUserConfiguredAgent({ isOwned: false, apiSource: "custom" })).toBe(false);
    expect(isUserConfiguredAgent({})).toBe(false);
  });

  test("resolveAgentSelectionPriority maps strictly to the 5 priority tiers", () => {
    // Tier 0: 收藏且已配置（OAuth 或自定义 API）
    expect(
      resolveAgentSelectionPriority({
        isFavorite: true,
        isOAuth: true,
      })
    ).toBe(0);
    expect(
      resolveAgentSelectionPriority({
        isFavorite: true,
        isOwned: true,
        apiSource: "custom",
      })
    ).toBe(0);

    // Tier 1: 其他收藏
    expect(
      resolveAgentSelectionPriority({
        isFavorite: true,
        isOwned: false,
        apiSource: "platform",
      })
    ).toBe(1);
    expect(
      resolveAgentSelectionPriority({
        isFavorite: true,
        isOwned: true,
        apiSource: "platform",
      })
    ).toBe(1);

    // Tier 2: 未收藏但已配置（OAuth 或 自定义 API）
    expect(
      resolveAgentSelectionPriority({
        isFavorite: false,
        isOAuth: true,
      })
    ).toBe(2);
    expect(
      resolveAgentSelectionPriority({
        isFavorite: false,
        isOwned: true,
        apiSource: "custom",
      })
    ).toBe(2);

    // Tier 3: 其他用户自建
    expect(
      resolveAgentSelectionPriority({
        isFavorite: false,
        isOwned: true,
        apiSource: "platform",
      })
    ).toBe(3);

    // Tier 4: 公开或非用户所有的 Agent
    expect(
      resolveAgentSelectionPriority({
        isFavorite: false,
        isOwned: false,
        apiSource: "platform",
      })
    ).toBe(4);
    expect(resolveAgentSelectionPriority({})).toBe(4);
  });

  test("compareAgentSelection sorts tiers first", () => {
    const list = [
      { id: "tier-4", isOwned: false, updatedAt: 900 },
      { id: "tier-3", isOwned: true, apiSource: "platform", updatedAt: 800 },
      { id: "tier-2", isOAuth: true, updatedAt: 700 },
      { id: "tier-1", isFavorite: true, favoritedAt: 600 },
      { id: "tier-0", isFavorite: true, isOAuth: true, favoritedAt: 500 },
    ];
    const sorted = [...list].sort(compareAgentSelection);
    expect(sorted.map((item) => item.id)).toEqual([
      "tier-0",
      "tier-1",
      "tier-2",
      "tier-3",
      "tier-4",
    ]);
  });

  test("compareAgentSelection uses favoritedAt for favorites tie-break and updatedAt/createdAt for others", () => {
    const favorites = [
      { id: "fav-old", isFavorite: true, favoritedAt: 100, updatedAt: 999 },
      { id: "fav-new", isFavorite: true, favoritedAt: 200, updatedAt: 1 },
    ];
    expect(favorites.sort(compareAgentSelection).map((item) => item.id)).toEqual([
      "fav-new",
      "fav-old",
    ]);

    const nonFavorites = [
      { id: "old-updated", updatedAt: 100, createdAt: 100 },
      { id: "new-updated", updatedAt: 300, createdAt: 50 },
      { id: "fallback-created", createdAt: 200 },
    ];
    expect(nonFavorites.sort(compareAgentSelection).map((item) => item.id)).toEqual([
      "new-updated",
      "fallback-created",
      "old-updated",
    ]);
  });

  test("parseAgentTimestamp parses number, ISO string, and invalid fallbacks", () => {
    expect(parseAgentTimestamp(1700000000000)).toBe(1700000000000);
    expect(parseAgentTimestamp("2024-01-01T00:00:00.000Z")).toBe(
      Date.parse("2024-01-01T00:00:00.000Z")
    );
    expect(parseAgentTimestamp(null)).toBe(0);
    expect(parseAgentTimestamp(undefined)).toBe(0);
    expect(parseAgentTimestamp("invalid")).toBe(0);
  });

  test("AGENT_SELECTION_PRIORITY_INSTRUCTIONS describes the 5-tier product priority", () => {
    expect(AGENT_SELECTION_PRIORITY_INSTRUCTIONS).toContain("优先级契约");
    expect(AGENT_SELECTION_PRIORITY_INSTRUCTIONS).toContain("收藏的 OAuth / 自定义 Agent");
    expect(AGENT_SELECTION_PRIORITY_INSTRUCTIONS).toContain("其他收藏 Agent");
    expect(AGENT_SELECTION_PRIORITY_INSTRUCTIONS).toContain("未收藏的 OAuth / 自定义 Agent");
    expect(AGENT_SELECTION_PRIORITY_INSTRUCTIONS).toContain("其他自建 Agent");
    expect(AGENT_SELECTION_PRIORITY_INSTRUCTIONS).toContain("公开 / 平台 Agent");
    expect(AGENT_SELECTION_PRIORITY_INSTRUCTIONS).toContain("429 限流与知情权契约");
    expect(AGENT_SELECTION_PRIORITY_INSTRUCTIONS).toContain("unavailableAgents");
    expect(AGENT_SELECTION_PRIORITY_INSTRUCTIONS).toContain("任何用户私有凭据与自建 Agent");
    expect(AGENT_SELECTION_PRIORITY_INSTRUCTIONS).toContain("isOwned=true、isOAuth=true 或 apiSource=\"custom\"");
    expect(AGENT_SELECTION_PRIORITY_INSTRUCTIONS).toContain("改派平台 Agent（消耗平台积分）前必须在回复中告知用户");
    expect(AGENT_SELECTION_PRIORITY_INSTRUCTIONS).toContain("收藏优先硬门");
    expect(AGENT_SELECTION_PRIORITY_INSTRUCTIONS).toContain("覆盖顶档成本门");
    expect(AGENT_SELECTION_PRIORITY_INSTRUCTIONS).toContain(
      "收藏 Agent 全部占用或确认不可用后才允许派平台 Agent",
    );
  });
});
