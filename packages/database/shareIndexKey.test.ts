import { describe, expect, it } from "bun:test";
import { shareKey } from "./keys";

describe("shareKey community index helpers", () => {
  it("tokenFromKey should parse share token", () => {
    expect(shareKey.tokenFromKey("share-abc123")).toBe("abc123");
    expect(shareKey.tokenFromKey("page-user-1")).toBe("");
  });

  it("communityCreatorIndex should sort newer shares first lexicographically", () => {
    const newer = shareKey.communityCreatorIndex("user-1", 2000, "newer");
    const older = shareKey.communityCreatorIndex("user-1", 1000, "older");
    expect(newer < older).toBe(true);
  });

  it("communityCreatorIndexFromShare should only index community shares", () => {
    const indexed = shareKey.communityCreatorIndexFromShare("share-abc", {
      meta: { visibility: "community", authorId: "user:user-1", createdAt: 1234 },
    });
    const privateIndex = shareKey.communityCreatorIndexFromShare("share-abc", {
      meta: { visibility: "private", authorId: "user:user-1", createdAt: 1234 },
    });

    expect(indexed.includes("shareidx-community-creator-user-1")).toBe(true);
    expect(privateIndex).toBe("");
  });

  it("communityAgentIndexFromShare should index by source agent key", () => {
    const indexed = shareKey.communityAgentIndexFromShare("share-abc", {
      meta: {
        visibility: "community",
        createdAt: 1234,
        sourceAgentKey: "agent-user-1-agentA",
      },
    });
    const nonCommunity = shareKey.communityAgentIndexFromShare("share-abc", {
      meta: {
        visibility: "private",
        createdAt: 1234,
        sourceAgentKey: "agent-user-1-agentA",
      },
    });

    expect(indexed.includes("shareidx-community-agent-agent-user-1-agentA")).toBe(true);
    expect(nonCommunity).toBe("");
  });

  it("communityIndexKeysFromShare should include all community indexes", () => {
    const indexes = shareKey.communityIndexKeysFromShare("share-abc", {
      meta: {
        visibility: "community",
        authorId: "user:user-1",
        createdAt: 1234,
        sourceAgentKey: "agent-user-1-agentA",
      },
    });

    expect(indexes.length).toBe(3);
    expect(indexes.some((key) => key.includes("shareidx-community-all-"))).toBe(true);
    expect(indexes.some((key) => key.includes("shareidx-community-creator-user-1"))).toBe(true);
    expect(
      indexes.some((key) => key.includes("shareidx-community-agent-agent-user-1-agentA"))
    ).toBe(true);
  });
});
