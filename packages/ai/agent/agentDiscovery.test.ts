import { describe, expect, it } from "bun:test";
import {
  buildAgentDiscoveryResult,
  filterAgentsByScope,
  isPreferredAgent,
  isPublicDiscoveryAgent,
  resolveBillingSource,
  resolveDiscoveryScope,
} from "./agentDiscovery";
import {
  toSafeAgentSummary,
  toCompactAgentSummary,
  omitNullishAgentSummaryFields,
  type SafeAgentSummary,
} from "./safeAgentSummary";

describe("Agent Discovery Phase 1 (16 DoD Requirements)", () => {
  const currentUserId = "user-1";

  // Standard test fixtures
  const ownedAgent: SafeAgentSummary = toSafeAgentSummary(
    {
      id: "agent-owned",
      dbKey: "agent-user-1-agent-owned",
      userId: currentUserId,
      name: "My Owned Agent",
      model: "claude-sonnet-4",
      isPublic: false,
      updatedAt: "2026-07-01T00:00:00.000Z",
    },
    { userId: currentUserId }
  );

  const oauthAgent: SafeAgentSummary = toSafeAgentSummary(
    {
      id: "agent-oauth",
      dbKey: "agent-user-1-agent-oauth",
      userId: currentUserId,
      name: "My OAuth Agent",
      model: "gpt-5",
      apiKeyRef: "claude",
      isPublic: false,
      updatedAt: "2026-07-02T00:00:00.000Z",
    },
    { userId: currentUserId }
  );

  const customApiAgent: SafeAgentSummary = toSafeAgentSummary(
    {
      id: "agent-custom",
      dbKey: "agent-user-1-agent-custom",
      userId: currentUserId,
      name: "My Custom API Agent",
      model: "deepseek-v3",
      apiSource: "custom",
      isPublic: false,
      updatedAt: "2026-07-03T00:00:00.000Z",
    },
    { userId: currentUserId }
  );

  const localAgent: SafeAgentSummary = toSafeAgentSummary(
    {
      id: "agent-local",
      dbKey: "agent-user-1-agent-local",
      userId: currentUserId,
      name: "My Local Agent",
      model: "llama-3-local",
      cliProvider: "local",
      isPublic: false,
      updatedAt: "2026-07-04T00:00:00.000Z",
    },
    { userId: currentUserId }
  );

  const favoritePublicAgent: SafeAgentSummary = toSafeAgentSummary(
    {
      id: "agent-fav-pub",
      dbKey: "agent-pub-agent-fav-pub",
      publicKey: "agent-pub-agent-fav-pub",
      userId: "other-user",
      name: "Favorited Public Plaza Agent",
      model: "gemini-3.7-flash",
      apiSource: "platform",
      isPublic: true,
      updatedAt: "2026-07-05T00:00:00.000Z",
    },
    {
      userId: currentUserId,
      isFavorite: true,
      favoritedAt: 1700000005000,
      publicRecordExists: true,
    }
  );

  const regularPublicAgent: SafeAgentSummary = toSafeAgentSummary(
    {
      id: "agent-regular-pub",
      dbKey: "agent-pub-agent-regular-pub",
      publicKey: "agent-pub-agent-regular-pub",
      userId: "other-user",
      name: "Regular Public Marketplace Agent",
      model: "gemini-3.7-flash",
      apiSource: "platform",
      isPublic: true,
      updatedAt: "2026-07-06T00:00:00.000Z",
    },
    {
      userId: currentUserId,
      isFavorite: false,
      publicRecordExists: true,
    }
  );

  const allFixtures: SafeAgentSummary[] = [
    ownedAgent,
    oauthAgent,
    customApiAgent,
    localAgent,
    favoritePublicAgent,
    regularPublicAgent,
  ];

  it("Req 1: 默认 listAgents() 等价于 scope='preferred'", () => {
    const defaultResult = buildAgentDiscoveryResult({
      agents: allFixtures,
    });
    const preferredResult = buildAgentDiscoveryResult({
      agents: allFixtures,
      scope: "preferred",
    });

    expect(defaultResult.agents).toEqual(preferredResult.agents);
    expect(defaultResult.total).toBe(5);
  });

  it("Req 2: 普通非收藏 public Agent 默认不返回", () => {
    const result = buildAgentDiscoveryResult({
      agents: allFixtures,
    });
    const keys = result.agents.map((a: any) => a.agentKey);
    expect(keys).not.toContain("agent-pub-agent-regular-pub");
    expect(result.agents.some((a: any) => a.name === "Regular Public Marketplace Agent")).toBe(false);
  });

  it("Req 3: owned Agent 默认返回", () => {
    const result = buildAgentDiscoveryResult({
      agents: allFixtures,
    });
    const owned = result.agents.find((a: any) => a.agentKey === "agent-user-1-agent-owned");
    expect(owned).toBeDefined();
    expect((owned as any).isOwned).toBe(true);
  });

  it("Req 4: OAuth Agent 默认返回", () => {
    const result = buildAgentDiscoveryResult({
      agents: allFixtures,
    });
    const oauth = result.agents.find((a: any) => a.agentKey === "agent-user-1-agent-oauth");
    expect(oauth).toBeDefined();
    expect((oauth as any).isOAuth).toBe(true);
    expect((oauth as any).billingSource).toBe("user_subscription");
  });

  it("Req 5: custom API Agent 默认返回", () => {
    const result = buildAgentDiscoveryResult({
      agents: allFixtures,
    });
    const custom = result.agents.find((a: any) => a.agentKey === "agent-user-1-agent-custom");
    expect(custom).toBeDefined();
    expect((custom as any).billingSource).toBe("user_api");
  });

  it("Req 6: favorite public Agent 默认返回", () => {
    const result = buildAgentDiscoveryResult({
      agents: allFixtures,
    });
    const fav = result.agents.find((a: any) => a.agentKey === "agent-pub-agent-fav-pub");
    expect(fav).toBeDefined();
    expect((fav as any).isFavorite).toBe(true);
  });

  it("Req 7: favorite public Agent 的 billingSource 仍正确表示为 platform_credits", () => {
    const result = buildAgentDiscoveryResult({
      agents: allFixtures,
    });
    const fav = result.agents.find((a: any) => a.agentKey === "agent-pub-agent-fav-pub");
    expect(fav).toBeDefined();
    expect((fav as any).billingSource).toBe("platform_credits");
  });

  it("Req 8: scope='public' 返回普通 public/shared Agent", () => {
    const result = buildAgentDiscoveryResult({
      agents: allFixtures,
      scope: "public",
    });
    const regular = result.agents.find((a: any) => a.agentKey === "agent-pub-agent-regular-pub");
    expect(regular).toBeDefined();
    expect((regular as any).name).toBe("Regular Public Marketplace Agent");
    expect((regular as any).billingSource).toBe("platform_credits");
  });

  it("Req 9: scope='public' 不重复返回已经进入 preferred 的 favorite public Agent", () => {
    const result = buildAgentDiscoveryResult({
      agents: allFixtures,
      scope: "public",
    });
    const keys = result.agents.map((a: any) => a.agentKey);
    expect(keys).toContain("agent-pub-agent-regular-pub");
    expect(keys).not.toContain("agent-pub-agent-fav-pub");
    expect(keys).not.toContain("agent-user-1-agent-owned");
  });

  it("Req 10: scope='all' 返回两个集合的并集且无重复", () => {
    const result = buildAgentDiscoveryResult({
      agents: allFixtures,
      scope: "all",
    });
    expect(result.total).toBe(6);
    const keys = result.agents.map((a: any) => a.agentKey);
    expect(new Set(keys).size).toBe(6);
    expect(keys).toContain("agent-pub-agent-regular-pub");
    expect(keys).toContain("agent-pub-agent-fav-pub");
    expect(keys).toContain("agent-user-1-agent-owned");
    expect(keys).toContain("agent-user-1-agent-oauth");
    expect(keys).toContain("agent-user-1-agent-custom");
    expect(keys).toContain("agent-user-1-agent-local");
  });

  it("Req 11: unavailable preferred Agent 默认从 agents 过滤、仍出现在 unavailableAgents、不自动 fallback public", () => {
    const futureTime = Date.now() + 300000;
    const rateLimitedOwned = toSafeAgentSummary(
      {
        id: "agent-owned-limited",
        dbKey: "agent-user-1-agent-owned-limited",
        userId: currentUserId,
        name: "Rate Limited Owned Agent",
        model: "claude-sonnet-4",
        nextAvailableAt: futureTime,
        isPublic: false,
      },
      { userId: currentUserId }
    );

    // Only one preferred agent (which is 429) + one regular public agent
    const fixturesWithOnlyLimitedPreferred = [rateLimitedOwned, regularPublicAgent];

    const result = buildAgentDiscoveryResult({
      agents: fixturesWithOnlyLimitedPreferred,
      scope: "preferred",
    });

    // Hard boundary: does NOT fall back to regularPublicAgent!
    expect(result.agents).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.unavailableCount).toBe(1);
    expect(result.unavailableAgents).toHaveLength(1);
    expect(result.unavailableAgents[0].name).toBe("Rate Limited Owned Agent");
    expect(result.unavailableAgents[0].nextAvailableAt).toBe(futureTime);
  });

  it("Req 12: billingSource 映射覆盖 OAuth/custom/platform/local，非自声明不可信", () => {
    // 自有 record：OAuth/custom 信号可信（用户自己的订阅与 API key）
    expect(resolveBillingSource({ apiKeyRef: "claude", isOwned: true })).toBe("user_subscription");
    expect(resolveBillingSource({ isOAuth: true, isOwned: true })).toBe("user_subscription");
    expect(resolveBillingSource({ apiSource: "oauth", isOwned: true })).toBe("user_subscription");

    expect(resolveBillingSource({ apiSource: "custom", isOwned: true })).toBe("user_api");
    expect(resolveBillingSource({ billingSource: "user_api", isOwned: true })).toBe("user_api");

    // local：本地运行时由用户控制，不烧平台积分，非自有 record 也允许
    expect(resolveBillingSource({ cliProvider: "local" })).toBe("local");
    expect(resolveBillingSource({ isLocal: true })).toBe("local");
    expect(resolveBillingSource({ local: true })).toBe("local");
    expect(resolveBillingSource({ apiSource: "local" })).toBe("local");

    expect(resolveBillingSource({ apiSource: "platform", isPublic: true })).toBe("platform_credits");
    expect(resolveBillingSource({})).toBe("platform_credits");

    // 非自有 record：自声明 OAuth/custom 不可信，封顶 platform_credits
    //（绝不允许「实际烧平台积分 → 错标成 user 免费」方向）
    expect(resolveBillingSource({ apiKeyRef: "claude" })).toBe("platform_credits");
    expect(resolveBillingSource({ isOAuth: true, apiSource: "custom" })).toBe("platform_credits");
    expect(
      resolveBillingSource({ billingSource: "user_subscription", apiSource: "custom" })
    ).toBe("platform_credits");
  });

  it("Req 13: public record 不真实存在时不得生成假的 runnable agentKey / publicKey", () => {
    // Record with isPublic=true but NO confirmed public record
    const summary = toSafeAgentSummary(
      {
        id: "agent-unconfirmed-pub",
        userId: "other-user",
        name: "Unconfirmed Public Agent",
        isPublic: true,
      },
      {
        userId: currentUserId,
        // publicRecordExists omitted / unconfirmed
      }
    );

    expect(summary.publicKey).toBeUndefined();
    expect(summary.agentKey).toBeUndefined();

    // With explicit publicRecordExists: true, safe to derive public key
    const confirmedSummary = toSafeAgentSummary(
      {
        id: "agent-confirmed-pub",
        userId: "other-user",
        name: "Confirmed Public Agent",
        isPublic: true,
      },
      {
        userId: currentUserId,
        publicRecordExists: true,
      }
    );
    expect(confirmedSummary.publicKey).toBe("agent-pub-agent-confirmed-pub");
    expect(confirmedSummary.agentKey).toBe("agent-pub-agent-confirmed-pub");
  });

  // Req 14（client/server scope semantics 一致）已移至
  // packages/server/handlers/agentRun/listAgentsServer.test.ts —— server 包
  // 才能 import 两侧实现，ai 包反向 import server 会破坏依赖方向。
  // 原用例两侧都调 filterAgentsByScope，属实现镜像恒真式，已废弃。

  it("Req 15: 大量 public Agent 不应膨胀默认 preferred 输出（3 preferred + 50 普通 public）", () => {
    const preferred3 = [ownedAgent, oauthAgent, customApiAgent];
    const public50: SafeAgentSummary[] = Array.from({ length: 50 }, (_, i) =>
      toSafeAgentSummary(
        {
          id: `public-agent-${i}`,
          dbKey: `agent-pub-public-agent-${i}`,
          publicKey: `agent-pub-public-agent-${i}`,
          userId: `other-user-${i}`,
          name: `Public Agent ${i}`,
          model: "gemini-flash",
          apiSource: "platform",
          isPublic: true,
          updatedAt: Date.now() - i * 1000,
        },
        { userId: currentUserId, publicRecordExists: true }
      )
    );

    const mixed53 = [...preferred3, ...public50];
    const result = buildAgentDiscoveryResult({
      agents: mixed53,
      // default scope is "preferred"
    });

    expect(result.total).toBe(3);
    expect(result.agents).toHaveLength(3);
    expect(result.agents.map((a: any) => a.agentKey).sort()).toEqual([
      "agent-user-1-agent-custom",
      "agent-user-1-agent-oauth",
      "agent-user-1-agent-owned",
    ]);
  });

  it("Req 16: 现有 compact projection / verbose 行为不回退（仅新增 billingSource，不重新塞入长描述）", () => {
    const compact = toCompactAgentSummary(ownedAgent);
    expect(compact).toHaveProperty("billingSource");
    expect(compact).not.toHaveProperty("introduction");
    expect(compact).not.toHaveProperty("modelAbility");
    expect(compact).not.toHaveProperty("inputPrice");
    expect(compact).not.toHaveProperty("outputPrice");
    expect(compact).not.toHaveProperty("favoritedAt");
    expect(compact).not.toHaveProperty("updatedAt");

    const verbose = omitNullishAgentSummaryFields(ownedAgent);
    expect(verbose).toHaveProperty("billingSource");
    expect(verbose).toHaveProperty("updatedAt");
  });

  it("Compatibility: publicOnly=true 映射到 scope='public'，且冲突参数抛错", () => {
    expect(resolveDiscoveryScope({ publicOnly: true })).toBe("public");
    expect(resolveDiscoveryScope({ publicOnly: false })).toBe("preferred");
    expect(resolveDiscoveryScope({})).toBe("preferred");
    expect(resolveDiscoveryScope({ scope: "preferred" })).toBe("preferred");
    expect(resolveDiscoveryScope({ scope: "public" })).toBe("public");
    expect(resolveDiscoveryScope({ scope: "all" })).toBe("all");

    // Identical meaning is accepted
    expect(resolveDiscoveryScope({ scope: "public", publicOnly: true })).toBe("public");
    expect(resolveDiscoveryScope({ scope: "preferred", publicOnly: false })).toBe("preferred");

    // Conflicting args throw
    expect(() =>
      resolveDiscoveryScope({ scope: "preferred", publicOnly: true })
    ).toThrow(/Conflicting arguments/);
    expect(() =>
      resolveDiscoveryScope({ scope: "public", publicOnly: false })
    ).toThrow(/Conflicting arguments/);
    expect(() =>
      resolveDiscoveryScope({ scope: "all", publicOnly: true })
    ).toThrow(/Conflicting arguments/);

    // Invalid scope throws
    expect(() =>
      resolveDiscoveryScope({ scope: "invalid_scope" as any })
    ).toThrow(/Invalid scope/);
  });
});
