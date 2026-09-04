import { describe, expect, test } from "bun:test";
import {
  toSafeAgentSummary,
  sortSafeAgentSummaries,
  toCompactAgentSummary,
  omitNullishAgentSummaryFields,
  resolveFavoriteStatus,
} from "./safeAgentSummary";
import { DEEPSEEK_API_POLICY } from "../economics/economicsPolicy";

describe("safeAgentSummary", () => {
  test("toSafeAgentSummary extracts safe summary fields and redacts secrets", () => {
    const rawRecord = {
      id: "agent-1",
      dbKey: "agent-user123-agent-1",
      publicKey: "agent-pub-agent-1",
      name: "Test Agent",
      handle: "test-bot",
      introduction: "I am a test agent",
      model: "gpt-5.6-sol",
      provider: "openai",
      apiSource: "platform",
      cliProvider: null,
      tools: ["search", "exec"],
      inputPrice: 0.01,
      outputPrice: 0.03,
      prompt: "SECRET SYSTEM PROMPT DO NOT LEAK",
      apiKey: "sk-secret-key-12345",
      token: "secret-token",
      password: "secret-password",
      credentialRef: "cred-ref-123",
      apiKeyRef: "key-ref-456",
      isPublic: true,
      updatedAt: 1700000000000,
      nextAvailableAt: 1700003600000,
    };

    const summary = toSafeAgentSummary(rawRecord);

    expect(summary.id).toBe("agent-1");
    expect(summary.publicKey).toBe("agent-pub-agent-1");
    expect(summary.name).toBe("Test Agent");
    expect(summary.handle).toBe("test-bot");
    expect(summary.introduction).toBe("I am a test agent");
    expect(summary.model).toBe("gpt-5.6-sol");
    expect(summary.provider).toBe("openai");
    expect(summary.apiSource).toBe("platform");
    expect(summary.cliProvider).toBeNull();
    expect(summary.tools).toEqual(["search", "exec"]);
    expect(summary.inputPrice).toBe(0.01);
    expect(summary.outputPrice).toBe(0.03);
    expect(summary.modelAbility).toEqual({ passAt1: 73, benchmarkScore: 59, writingScore: 80 });
    expect(summary.isFavorite).toBe(false);
    expect(summary.favoritedAt).toBeNull();
    expect(summary.isPublic).toBe(true);
    expect(summary.updatedAt).toBe(1700000000000);
    expect(summary.nextAvailableAt).toBe(1700003600000);

    const keys = Object.keys(summary);
    expect(keys).not.toContain("prompt");
    expect(keys).not.toContain("apiKey");
    expect(keys).not.toContain("token");
    expect(keys).not.toContain("password");
    expect(keys).not.toContain("secret");
    expect(keys).not.toContain("credentialRef");
    expect(keys).not.toContain("apiKeyRef");
    expect(keys).not.toContain("dbKey");
    expect(keys).not.toContain("privateKey");
    expect(keys).not.toContain("steps");
    expect(keys).not.toContain("recommendedFor");
  });

  test("toSafeAgentSummary returns null modelAbility for unknown models", () => {
    expect(toSafeAgentSummary({ id: "unknown-agent", model: "custom-unknown-model-xyz" }).modelAbility).toBeNull();
  });

  test("private agent without public record: publicKey field is omitted, not null", () => {
    const summary = toSafeAgentSummary({
      id: "priv-1",
      dbKey: "agent-user1-priv-1",
      name: "Private Agent",
      isPublic: false,
    });
    expect(summary).not.toHaveProperty("publicKey");
    expect(Object.keys(summary)).not.toContain("publicKey");
  });

  test("public agent with explicit publicKey on record: publicKey is preserved", () => {
    const summary = toSafeAgentSummary({
      id: "pub-1",
      dbKey: "agent-user1-pub-1",
      publicKey: "agent-pub-pub-1",
      name: "Public Agent",
      isPublic: true,
    });
    expect(summary.publicKey).toBe("agent-pub-pub-1");
  });

  test("CORE: isPublic=true without publicRecordExists confirmation → publicKey omitted (not synthesized)", () => {
    // Regression: caller must NOT derive publicRecordExists from isPublic.
    // Real data has isPublic=true with no readable agent-pub-<id> record
    // (e.g. DeepSeek V4 Flash agent-pub-01DSV4FLASHPB00000000JFPFD → 404).
    const summary = toSafeAgentSummary({
      id: "01DSV4FLASHPB00000000JFPFD",
      dbKey: "agent-user1-01DSV4FLASHPB00000000JFPFD",
      name: "DeepSeek V4 Flash",
      isPublic: true,
      // no publicKey field, no publicRecordExists — caller cannot cheaply verify
    });
    expect(summary.isPublic).toBe(true);
    expect(summary).not.toHaveProperty("publicKey");
    expect(Object.keys(summary)).not.toContain("publicKey");
  });

  test("publicRecordExists=false suppresses publicKey even when record carries one", () => {
    const summary = toSafeAgentSummary({
      id: "hidden-1",
      dbKey: "agent-user1-hidden-1",
      publicKey: "agent-pub-hidden-1",
      name: "Denied Agent",
      publicRecordExists: false,
    });
    expect(summary).not.toHaveProperty("publicKey");
  });

  test("publicRecordExists=true via options derives publicKey from id", () => {
    const summary = toSafeAgentSummary(
      { id: "derived-1", dbKey: "agent-user1-derived-1", name: "Derived Agent" },
      { publicRecordExists: true },
    );
    expect(summary.publicKey).toBe("agent-pub-derived-1");
  });

  test("publicRecordExists=false via options suppresses record publicKey", () => {
    const summary = toSafeAgentSummary(
      { id: "opt-deny", dbKey: "agent-user1-opt-deny", publicKey: "agent-pub-opt-deny", name: "Opt Deny" },
      { publicRecordExists: false },
    );
    expect(summary).not.toHaveProperty("publicKey");
  });

  test("resolveFavoriteStatus matches favorite by dbKey, publicKey, or id", () => {
    const favoritesMap = {
      "agent-user1-fav1": 1700000001000,
      "agent-pub-fav2": 1700000002000,
    };

    expect(resolveFavoriteStatus({ id: "fav1", dbKey: "agent-user1-fav1" }, { favoritesMap })).toEqual({
      isFavorite: true,
      favoritedAt: 1700000001000,
    });
    expect(resolveFavoriteStatus({ id: "fav2", publicKey: "agent-pub-fav2" }, { favoritesMap })).toEqual({
      isFavorite: true,
      favoritedAt: 1700000002000,
    });
    expect(resolveFavoriteStatus({ id: "not-fav", dbKey: "agent-user1-not-fav" }, { favoritesMap })).toEqual({
      isFavorite: false,
      favoritedAt: null,
    });
  });

  test("sortSafeAgentSummaries sorts favorites first, then recency", () => {
    const agents = [
      { id: "non-fav-recent", isFavorite: false, updatedAt: 10000 },
      { id: "fav-older", isFavorite: true, favoritedAt: 1000, updatedAt: 5000 },
      { id: "fav-newer", isFavorite: true, favoritedAt: 2000, updatedAt: 1000 },
      { id: "non-fav-old", isFavorite: false, updatedAt: 2000 },
    ];

    expect(sortSafeAgentSummaries(agents).map((agent) => agent.id)).toEqual([
      "fav-newer",
      "fav-older",
      "non-fav-recent",
      "non-fav-old",
    ]);
  });

  test("sortSafeAgentSummaries prioritizes favorites, then OAuth/custom agents", () => {
    const agents = [
      { id: "public-recent", isOwned: false, isFavorite: true, favoritedAt: 9000, updatedAt: 10000 },
      { id: "self-old", isOwned: true, isFavorite: false, updatedAt: 100 },
      { id: "self-fav", isOwned: true, isFavorite: true, favoritedAt: 500, updatedAt: 50 },
      { id: "fav-oauth", isOwned: false, isOAuth: true, isFavorite: true, favoritedAt: 1000, updatedAt: 1 },
      { id: "owned-custom", isOwned: true, apiSource: "custom", isFavorite: false, updatedAt: 500 },
    ];

    expect(sortSafeAgentSummaries(agents).map((agent) => agent.id)).toEqual([
      "fav-oauth",
      "public-recent",
      "self-fav",
      "owned-custom",
      "self-old",
    ]);
  });

  test("toSafeAgentSummary marks isOwned when record userId matches current user", () => {
    const summary = toSafeAgentSummary(
      { id: "own-1", dbKey: "agent-user1-own-1", userId: "user1", name: "Own" },
      { userId: "user1" },
    );
    expect(summary.isOwned).toBe(true);
  });

  test("toSafeAgentSummary marks isOwned via dbKey prefix when userId field is absent", () => {
    const summary = toSafeAgentSummary(
      { id: "own-2", dbKey: "agent-user1-own-2", name: "Own via key" },
      { userId: "user1" },
    );
    expect(summary.isOwned).toBe(true);
  });

  test("toSafeAgentSummary marks isOwned via privateKey prefix (CLI ListedAgent shape)", () => {
    // CLI `agent list --safe` 传的是 ListedAgent：只有 privateKey，没有 dbKey/userId。
    // 不认 privateKey 会让全部自建 agent 变成 isOwned=false 且丢失 agentKey。
    const summary = toSafeAgentSummary(
      { id: "own-4", privateKey: "agent-user1-own-4", name: "Own via privateKey" },
      { userId: "user1" },
    );
    expect(summary.isOwned).toBe(true);
    expect(summary.agentKey).toBe("agent-user1-own-4");
  });

  test("toSafeAgentSummary does not mark isOwned via another user's privateKey", () => {
    const summary = toSafeAgentSummary(
      { id: "other-2", privateKey: "agent-user2-other-2", name: "Other via privateKey" },
      { userId: "user1" },
    );
    expect(summary.isOwned).toBe(false);
    expect(summary.agentKey).toBeUndefined();
  });

  test("toSafeAgentSummary does not mark isOwned for other users' agents", () => {
    const summary = toSafeAgentSummary(
      { id: "other-1", dbKey: "agent-user2-other-1", userId: "user2", name: "Other" },
      { userId: "user1" },
    );
    expect(summary.isOwned).toBe(false);
  });

  test("toSafeAgentSummary handles user ids containing hyphens via full dbKey prefix", () => {
    const summary = toSafeAgentSummary(
      { id: "agent-2", dbKey: "agent-user-1-agent-2", name: "Hyphen user" },
      { userId: "user-1" },
    );
    expect(summary.isOwned).toBe(true);
  });

  test("toSafeAgentSummary treats ownerId match as owned even when userId differs", () => {
    const summary = toSafeAgentSummary(
      { id: "own-3", dbKey: "agent-user1-own-3", userId: "user1", ownerId: "user1", name: "Own" },
      { userId: "user1" },
    );
    expect(summary.isOwned).toBe(true);
  });

  test("toSafeAgentSummary treats own public agents as owned", () => {
    // 自建后公开的 agent：dbKey 前缀仍是 agent-<userId>-，isOwned 应为 true
    const summary = toSafeAgentSummary(
      { id: "pub-1", publicKey: "agent-pub-pub-1", dbKey: "agent-user1-pub-1", name: "Own public" },
      { userId: "user1" },
    );
    expect(summary.isOwned).toBe(true);
  });

  test("toSafeAgentSummary exposes runnable agentKey for owned agents to their owner", () => {
    const summary = toSafeAgentSummary(
      { id: "own-1", dbKey: "agent-user1-own-1", name: "Owned" },
      { userId: "user1" },
    );
    expect(summary.agentKey).toBe("agent-user1-own-1");
  });

  test("toSafeAgentSummary exposes publicKey as agentKey for public non-owned agents", () => {
    const summary = toSafeAgentSummary(
      { id: "pub-x", publicKey: "agent-pub-pub-x", name: "Public shared" },
      { userId: "user1" },
    );
    expect(summary.agentKey).toBe("agent-pub-pub-x");
  });

  test("toSafeAgentSummary omits agentKey when no signed-in user is available", () => {
    const summary = toSafeAgentSummary({ id: "own-1", dbKey: "agent-user1-own-1", name: "Owned" });
    expect(summary).not.toHaveProperty("agentKey");
  });

  test("toSafeAgentSummary resolves owned agentKey from ListedAgent privateKey (CLI shape)", () => {
    // CLI/TUI 走 ListedAgent：只有 privateKey，没有 dbKey/userId。
    // 之前这条路径全部判为非自建，agentKey 被整体省略，模型看到 "(agentKey unavailable)"。
    const summary = toSafeAgentSummary(
      { id: "own-1", privateKey: "agent-user1-own-1", name: "Owned", publicKey: "agent-pub-own-1" },
      { userId: "user1" },
    );
    expect(summary.isOwned).toBe(true);
    expect(summary.agentKey).toBe("agent-user1-own-1");
  });

  test("toSafeAgentSummary prefers the real owned key over re-deriving from id", () => {
    // 真实数据里 record.id 有时就是整条 dbKey；重拼会产出
    // agent-user1-agent-user1-<id> 这种必然 404 的 key。
    const summary = toSafeAgentSummary(
      { id: "agent-user1-own-2", dbKey: "agent-user1-own-2", userId: "user1", name: "Owned" },
      { userId: "user1" },
    );
    expect(summary.agentKey).toBe("agent-user1-own-2");
  });

  test("toSafeAgentSummary falls back to deriving the key from id when no owned key is present", () => {
    // ownerId 认定自建，但记录既无 dbKey 也无 privateKey → 只能由 id 拼。
    const summary = toSafeAgentSummary(
      { id: "own-4", ownerId: "user1", name: "Owned" },
      { userId: "user1" },
    );
    expect(summary.isOwned).toBe(true);
    expect(summary.agentKey).toBe("agent-user1-own-4");
  });

  test("toSafeAgentSummary never adopts another user's key as an owned agentKey", () => {
    const summary = toSafeAgentSummary(
      { id: "other-1", dbKey: "agent-user2-other-1", userId: "user2", name: "Other" },
      { userId: "user1" },
    );
    expect(summary.isOwned).toBe(false);
    expect(summary).not.toHaveProperty("agentKey");
  });

  test("toSafeAgentSummary never leaks privateKey or dbKey as agentKey", () => {
    const summary = toSafeAgentSummary(
      { id: "own-1", dbKey: "agent-user1-own-1", privateKey: "agent-user1-own-1", name: "Owned" },
      { userId: "user1" },
    );
    // agentKey 只会是 agent-<userId>-... 形态的可运行 key，绝不带出密钥材料
    expect(summary.agentKey).toBe("agent-user1-own-1");
    const keys = Object.keys(summary);
    expect(keys).not.toContain("privateKey");
    expect(keys).not.toContain("dbKey");
  });
});

describe("compact listAgents projection", () => {
  const full = toSafeAgentSummary(
    {
      id: "own-1",
      dbKey: "agent-user1-own-1",
      name: "Owned Bot",
      handle: "owned-bot",
      introduction: "long introduction text",
      model: "gpt-5.6-sol",
      provider: "zai",
      apiSource: "custom",
      cliProvider: null,
      tools: ["search"],
      inputPrice: 0.01,
      outputPrice: 0.03,
      modelAbility: { passAt1: 73, benchmarkScore: 59, writingScore: 80 },
      isPublic: false,
      updatedAt: "2026-06-01T00:00:00.000Z",
    },
    { userId: "user1", favoritesMap: { "agent-user1-own-1": 1700000001000 } },
  );

  test("toCompactAgentSummary keeps exactly the agent-selection field set", () => {
    const compact = toCompactAgentSummary(full);
    expect(Object.keys(compact).sort()).toEqual([
      "agentKey",
      "apiSource",
      "billingSource",
      "isFavorite",
      "isOAuth",
      "isOwned",
      "isPublic",
      "model",
      "name",
      "provider",
      "tools",
    ]);
    expect(compact.agentKey).toBe("agent-user1-own-1");
    expect(compact.isFavorite).toBe(true);
  });

  test("toCompactAgentSummary drops noisy fields (introduction, cliProvider, modelAbility, prices, timestamps)", () => {
    const compact: Record<string, unknown> = toCompactAgentSummary(full);
    for (const field of [
      "id",
      "handle",
      "introduction",
      "cliProvider",
      "modelAbility",
      "favoritedAt",
      "updatedAt",
      "inputPrice",
      "outputPrice",
    ]) {
      expect(compact).not.toHaveProperty(field);
    }
  });

  test("omitNullishAgentSummaryFields removes null/undefined keys but keeps falsy values like empty tools", () => {
    const sparse = toSafeAgentSummary({ id: "x", dbKey: "agent-user1-x", name: "X" });
    const verboseSparse = omitNullishAgentSummaryFields(sparse);
    expect(verboseSparse).not.toHaveProperty("handle");
    expect(verboseSparse).not.toHaveProperty("introduction");
    expect(verboseSparse).not.toHaveProperty("model");
    expect(JSON.stringify(verboseSparse)).not.toContain("null");
    // [] / false 是有效信息，不得被误删。
    const kept = omitNullishAgentSummaryFields({ tools: [], isFavorite: false, name: "Y" });
    expect(kept).toEqual({ tools: [], isFavorite: false, name: "Y" });
  });

  test("nextAvailableAt survives the compact projection (cooling-agent decision info)", () => {
    const cooling = { ...full, nextAvailableAt: Date.now() + 3_600_000 };
    const compact = toCompactAgentSummary(cooling);
    expect(compact.nextAvailableAt).toBe(cooling.nextAvailableAt);
  });

  test("projecting after sortSafeAgentSummaries preserves favorite + OAuth ordering", () => {
    const mk = (
      name: string,
      fields: { userId?: string; apiKeyRef?: string; isFavorite?: boolean; updatedAt: string; favoritedAt?: number },
    ) =>
      toSafeAgentSummary(
        {
          id: name,
          dbKey: `agent-user1-${name}`,
          publicKey: `agent-pub-${name}`,
          userId: "user1",
          name,
          model: "gpt-5.6-sol",
          isPublic: false,
          ...fields,
        },
        {
          userId: "user1",
          favoritesMap: fields.isFavorite
            ? { [`agent-user1-${name}`]: fields.favoritedAt ?? 1 }
            : undefined,
        },
      );
    const input = [
      mk("plain-public", { userId: "other-user", updatedAt: "2026-07-01T00:00:00.000Z" }),
      mk("fav-oauth", { isFavorite: true, apiKeyRef: "chatgpt", updatedAt: "2026-06-01T00:00:00.000Z", favoritedAt: 1700000001000 }),
      mk("plain-owned", { updatedAt: "2026-07-03T00:00:00.000Z" }),
      mk("fav-plain", { isFavorite: true, updatedAt: "2026-06-02T00:00:00.000Z", favoritedAt: 1700000009000 }),
      mk("oauth-owned", { apiKeyRef: "chatgpt", updatedAt: "2026-07-02T00:00:00.000Z" }),
    ];
    const shortKey = (key: string | undefined) => key!.replace(/^agent-(user1|pub)-/, "");
    const sortedKeys = sortSafeAgentSummaries(input)
      .map((a) => a.agentKey)
      .map(shortKey);
    // 档位：0 收藏 OAuth → 1 其他收藏 → 2 未收藏 OAuth/自定义 → 3 其他自建 → 4 公开。
    expect(sortedKeys).toEqual(["fav-oauth", "fav-plain", "oauth-owned", "plain-owned", "plain-public"]);
    // 排序在投影之前完成，投影只裁输出字段，不得改变顺序。
    const projectedKeys = sortSafeAgentSummaries(input)
      .map(toCompactAgentSummary)
      .map((a) => shortKey(a.agentKey));
    expect(projectedKeys).toEqual(sortedKeys);
  });
});

describe("agent economics snapshot (Phase 2A)", () => {
  // Mon 2026-09-07 02:00 UTC — inside DeepSeek's 01:00–04:00 UTC peak window.
  const MON_PEAK = Date.UTC(2026, 8, 7, 2, 0);

  const deepseekRecord = {
    id: "ds-1",
    dbKey: "agent-user1-ds-1",
    name: "DS Bot",
    model: "deepseek-chat",
    provider: "deepseek",
    apiSource: "custom",
    customProviderUrl: "https://api.deepseek.com/v1",
    isPublic: false,
  };

  test("DeepSeek API source carries the peak economics snapshot at a pinned instant", () => {
    const summary = toSafeAgentSummary(deepseekRecord, { userId: "user1", now: MON_PEAK });
    expect(summary.economics).toEqual({
      source: "deepseek_api",
      policyVersion: DEEPSEEK_API_POLICY.version,
      period: "peak",
      priceMultiplier: 2,
      changesAt: Date.UTC(2026, 8, 7, 4, 0),
    });
    // 端点只用于确认官方来源，绝不进入输出。
    expect(JSON.stringify(summary)).not.toContain("deepseek.com");
    expect(summary).not.toHaveProperty("customProviderUrl");
  });

  test("off-peak instant yields the 1× multiplier", () => {
    const summary = toSafeAgentSummary(deepseekRecord, {
      userId: "user1",
      now: Date.UTC(2026, 8, 7, 11, 0), // Mon 11:00 UTC — outside both windows
    });
    expect(summary.economics).toMatchObject({ period: "off_peak", priceMultiplier: 1 });
  });

  test("BigModel GLM Coding Plan source resolves via Asia/Shanghai peak hours", () => {
    // Wed 2026-09-09 06:00 UTC == 14:00 Shanghai → peak start (inclusive).
    const summary = toSafeAgentSummary(
      {
        ...deepseekRecord,
        id: "bm-1",
        dbKey: "agent-user1-bm-1",
        name: "BM Bot",
        model: "glm-5.3",
        provider: "bigmodel",
        customProviderUrl: "https://open.bigmodel.cn/api/coding/paas/v4",
      },
      { userId: "user1", now: Date.UTC(2026, 8, 9, 6, 0) }
    );
    expect(summary.economics).toMatchObject({
      source: "bigmodel_glm_coding_plan",
      period: "peak",
      quotaMultiplier: 1,
    });
  });

  test("neutral/unknown sources omit economics entirely", () => {
    // 国际版 Z.AI 计划没有 docs.bigmodel.cn 证据 → neutral。
    const zai = toSafeAgentSummary(
      {
        id: "z-1",
        dbKey: "agent-user1-z-1",
        name: "Z Bot",
        provider: "zai",
        customProviderUrl: "https://api.z.ai/api/coding/paas/v4",
      },
      { userId: "user1", now: MON_PEAK }
    );
    expect(zai).not.toHaveProperty("economics");
    const unknown = toSafeAgentSummary(
      { id: "u-1", dbKey: "agent-user1-u-1", name: "U Bot", provider: "openai" },
      { userId: "user1", now: MON_PEAK }
    );
    expect(unknown).not.toHaveProperty("economics");
    // bigmodel 同域按量计费端点 ≠ coding plan → neutral。
    const metered = toSafeAgentSummary(
      {
        ...deepseekRecord,
        provider: "bigmodel",
        customProviderUrl: "https://open.bigmodel.cn/api/paas/v4",
      },
      { userId: "user1", now: MON_PEAK }
    );
    expect(metered).not.toHaveProperty("economics");
  });

  test("compact projection carries the small snapshot but never the full policy/windows", () => {
    const summary = toSafeAgentSummary(deepseekRecord, { userId: "user1", now: MON_PEAK });
    const compact: Record<string, unknown> = toCompactAgentSummary(summary);
    expect(compact.economics).toMatchObject({ source: "deepseek_api", period: "peak" });
    const serialized = JSON.stringify(compact);
    expect(serialized).not.toContain('"windows"');
    expect(serialized).not.toContain("startMinute");
    expect(serialized).not.toContain("weekdays");
    expect(serialized).not.toContain("effectiveFrom");
    expect(serialized).not.toContain("sourceUrl");
    // neutral 来源的 compact 不出现 economics 键。
    const neutralCompact = toCompactAgentSummary(
      toSafeAgentSummary(
        { id: "x", dbKey: "agent-user1-x", name: "X", provider: "zai" },
        { userId: "user1", now: MON_PEAK }
      )
    );
    expect(neutralCompact).not.toHaveProperty("economics");
  });
});
