import { beforeEach, describe, expect, it } from "bun:test";
import { MemoryDB } from "database-engine/MemoryDB";
import { loadMemoryCandidatesFromDb } from "./query";
import { rememberMemory } from "./remember";

describe("rememberMemory", () => {
  const db = new MemoryDB();

  beforeEach(() => {
    db.clear();
  });

  it("writes user-scoped episodic memory by default when userId exists", async () => {
    const result = await rememberMemory({
      db,
      userId: "user1",
      spaceId: "space1",
      dialogId: "dialog-1",
      content: "在复杂问题里，这个用户更喜欢先看结论。",
    });

    const items = await loadMemoryCandidatesFromDb(db, {
      owners: [{ ownerType: "user", ownerId: "user1" }],
      subjects: [{ subjectType: "user", subjectId: "user1" }],
      ownerLimit: 20,
    });

    expect(result.resolvedScopes).toEqual([
      expect.objectContaining({ ownerType: "user", ownerId: "user1" }),
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]?.kind).toBe("episodic");
    expect(items[0]?.patternKey).toBe("agent-remember");
  });

  it("reports similarMemories when new content is an evolution snapshot of an existing item", async () => {
    await rememberMemory({
      db,
      userId: "user1",
      spaceId: "space1",
      content:
        "bun-nolo realtime Effect 第二刀已落地本地 alpha（37f779327）：server 侧抽出唯一 seam = EventStore{append,listAfter}，LevelDB 与 InMemoryEventStore 共用同一 replay 语义，realtimeWorld.test 12 pass。",
    });

    const result = await rememberMemory({
      db,
      userId: "user1",
      spaceId: "space1",
      content:
        "bun-nolo realtime Effect 第二刀已封板并 push origin/alpha（37f779327）：server 侧抽出唯一 seam = EventStore{append,listAfter}，共享 replay 语义，realtimeWorld.test 12 pass。",
    });

    expect(result.savedItems).toHaveLength(1); // 非精确命中 → 新建，不覆盖旧条
    expect(result.similarMemories.length).toBeGreaterThanOrEqual(1);
    expect(result.similarMemories[0]?.content).toContain("第二刀已落地");
  });

  it("returns empty similarMemories for exact duplicates and unrelated content", async () => {
    await rememberMemory({
      db,
      userId: "user1",
      spaceId: "space1",
      content: "这个用户在复杂问题里更喜欢先看结论。",
    });

    const exact = await rememberMemory({
      db,
      userId: "user1",
      spaceId: "space1",
      content: "这个用户在复杂问题里更喜欢先看结论。",
    });
    expect(exact.similarMemories).toEqual([]); // 精确命中走 bump 分支，不提示

    const unrelated = await rememberMemory({
      db,
      userId: "user1",
      spaceId: "space1",
      content: "团队协作约定：提交信息一律使用英文书写。",
    });
    expect(unrelated.similarMemories).toEqual([]);
  });

  it("matches dedupe and similar candidates by effective subject when memorySubjectId is set", async () => {
    const first = await rememberMemory({
      db,
      userId: "user1",
      spaceId: "space1",
      memorySubjectId: "agent-kimi",
      content:
        "bun-nolo realtime Effect 第二刀已落地本地 alpha（37f779327）：server 侧抽出唯一 seam = EventStore{append,listAfter}，LevelDB 与 InMemoryEventStore 共用同一 replay 语义，realtimeWorld.test 12 pass。",
    });
    expect(first.savedItems[0]?.subjectId).toBe("agent-kimi");

    const second = await rememberMemory({
      db,
      userId: "user1",
      spaceId: "space1",
      memorySubjectId: "agent-kimi",
      content:
        "bun-nolo realtime Effect 第二刀已封板并 push origin/alpha（37f779327）：server 侧抽出唯一 seam = EventStore{append,listAfter}，共享 replay 语义，realtimeWorld.test 12 pass。",
    });
    expect(second.savedItems[0]?.subjectId).toBe("agent-kimi");
    // 同 effective subject 的演进快照必须被软查重捕获（写入与查重同一 subject 判定）
    expect(second.similarMemories.length).toBeGreaterThanOrEqual(1);
    expect(second.similarMemories[0]?.content).toContain("第二刀已落地");
  });

  it("skips similar matching for short contents to avoid CJK bigram false positives", async () => {
    await rememberMemory({
      db,
      userId: "user1",
      spaceId: "space1",
      content: "部署状态已更新。",
    });
    // 两句共享大部分 CJK 2-gram（overlap 会过阈值），但 token 数低于门槛 → 不提示
    const result = await rememberMemory({
      db,
      userId: "user1",
      spaceId: "space1",
      content: "部署状态已过期。",
    });
    expect(result.savedItems).toHaveLength(1);
    expect(result.similarMemories).toEqual([]);
  });

  it("supports explicit space scope", async () => {
    const result = await rememberMemory({
      db,
      userId: "user1",
      spaceId: "space1",
      dialogId: "dialog-1",
      content: "这个 space 讨论风险时默认先给回滚路径。",
      scope: "space",
    });

    const items = await loadMemoryCandidatesFromDb(db, {
      owners: [{ ownerType: "space", ownerId: "space1" }],
      subjects: [{ subjectType: "space", subjectId: "space1" }],
      ownerLimit: 20,
    });

    expect(result.resolvedScopes).toEqual([
      expect.objectContaining({ ownerType: "space", ownerId: "space1" }),
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]?.visibility).toBe("shared");
  });

  it("writes procedural memory when a repeated runbook is explicitly requested", async () => {
    await rememberMemory({
      db,
      userId: "user1",
      spaceId: "space1",
      content: "Memory recall 失败时，先看 selectedItems，再看 system message 组装。",
      scope: "space",
      kind: "procedural",
      // 名副其实的 repeated runbook：硬门要求显式复现证据
      recurrenceEvidence: "同一排查顺序在两次 recall 故障中都奏效。",
    });

    const items = await loadMemoryCandidatesFromDb(db, {
      owners: [{ ownerType: "space", ownerId: "space1" }],
      subjects: [{ subjectType: "space", subjectId: "space1" }],
      kinds: ["procedural"],
      ownerLimit: 20,
    });

    expect(items).toHaveLength(1);
    expect(items[0]?.kind).toBe("procedural");
    expect(items[0]?.patternKey).toBe("procedural-runbook");
    expect(items[0]?.tags).toContain("procedural-memory");
  });

  it("rejects invalid memory kinds", async () => {
    await expect(
      rememberMemory({
        db,
        userId: "user1",
        content: "bad kind",
        kind: "scratch" as any,
      })
    ).rejects.toThrow("rememberMemory: kind must be episodic, semantic, or procedural");
  });

  it("falls back to user scope when explicit space scope lacks spaceId", async () => {
    const result = await rememberMemory({
      db,
      userId: "user1",
      content: "这个长期运行默认先把高价值想法沉淀给当前用户。",
      scope: "space",
    });

    const items = await loadMemoryCandidatesFromDb(db, {
      owners: [{ ownerType: "user", ownerId: "user1" }],
      subjects: [{ subjectType: "user", subjectId: "user1" }],
      ownerLimit: 20,
    });

    expect(result.requestedScope).toBe("space");
    expect(result.resolvedScopes).toEqual([
      expect.objectContaining({ ownerType: "user", ownerId: "user1" }),
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]?.visibility).toBe("private");
  });

  it("rejects remember requests without content", async () => {
    await expect(
      rememberMemory({
        db,
        userId: "user1",
        content: "   ",
      })
    ).rejects.toThrow("rememberMemory: content is required");
  });

  it("writes memory under agent subject when agentKey is provided", async () => {
    const result = await rememberMemory({
      db,
      userId: "user1",
      content: "用户希望这个 agent 回答前先确认前提。",
      agentKey: "agent:test",
    });

    const items = await loadMemoryCandidatesFromDb(db, {
      owners: [{ ownerType: "user", ownerId: "user1" }],
      subjects: [{ subjectType: "agent", subjectId: "agent:test" }],
      ownerLimit: 20,
    });

    expect(result.savedItems).toHaveLength(1);
    expect(result.savedItems[0]?.subjectType).toBe("agent");
    expect(result.savedItems[0]?.subjectId).toBe("agent:test");
    expect(items).toHaveLength(1);
    expect(items[0]?.subjectType).toBe("agent");
    expect(items[0]?.subjectId).toBe("agent:test");
  });

  // ==========================================================================
  // Bug 1 修复：置信度区分来源（§3.2 判别标准）
  // ==========================================================================
  it("user-directive source gets higher confidence than agent-inferred", async () => {
    const userResult = await rememberMemory({
      db,
      userId: "user1",
      content: "用户明确说记住的偏好",
      source: "user-directive",
    });
    const agentResult = await rememberMemory({
      db,
      userId: "user1",
      content: "agent 推测的偏好",
      source: "agent-inferred",
    });

    expect(userResult.savedItems[0]?.confidence).toBe(0.85);
    expect(agentResult.savedItems[0]?.confidence).toBe(0.6);
    expect(userResult.savedItems[0]!.confidence).toBeGreaterThan(
      agentResult.savedItems[0]!.confidence,
    );
  });

  it("defaults to agent-inferred confidence when source is not specified", async () => {
    const result = await rememberMemory({
      db,
      userId: "user1",
      content: "无 source 参数的记忆",
    });
    // 默认 agent-inferred → 0.6（留一次纠正缓冲：0.6-0.2=0.4 仍可用，0.4-0.2=0.2 冷藏）
    expect(result.savedItems[0]?.confidence).toBe(0.6);
  });

  it("procedural kind adds +0.08 confidence for both sources", async () => {
    const userProc = await rememberMemory({
      db,
      userId: "user1",
      content: "用户确认的排障步骤",
      kind: "procedural",
      recurrenceEvidence: "同一步骤已复现两次。",
      source: "user-directive",
    });
    const agentProc = await rememberMemory({
      db,
      userId: "user1",
      content: "agent 推测的排障步骤",
      kind: "procedural",
      recurrenceEvidence: "同一步骤已复现两次。",
      source: "agent-inferred",
    });

    expect(userProc.savedItems[0]?.confidence).toBe(0.88);
    expect(agentProc.savedItems[0]?.confidence).toBe(0.68);
  });

  // ==========================================================================
  // Bug 2 修复：重复写入去重（§3.2 不无限堆积）
  // ==========================================================================
  it("deduplicates identical content+kind under same owner (does not create duplicate)", async () => {
    const content = "这个用户更喜欢先看结论再看展开";
    const r1 = await rememberMemory({
      db,
      userId: "user1",
      content,
      source: "agent-inferred",
    });
    const r2 = await rememberMemory({
      db,
      userId: "user1",
      content,
      source: "agent-inferred",
    });

    // 两次写入应该返回同一个 id（去重）
    expect(r1.savedItems[0]?.id).toBe(r2.savedItems[0]?.id);

    // db 里只有一条
    const items = await loadMemoryCandidatesFromDb(db, {
      owners: [{ ownerType: "user", ownerId: "user1" }],
      subjects: [{ subjectType: "user", subjectId: "user1" }],
      ownerLimit: 20,
    });
    const matching = items.filter((i) => i.content === content);
    expect(matching).toHaveLength(1);
    // activationCount 应该提升
    expect(matching[0]?.activationCount).toBe(1);
  });

  it("dedup takes higher confidence when source upgrades", async () => {
    const content = "这个用户偏好极简风格";

    // 第一次：agent 推测 → 低置信
    await rememberMemory({
      db,
      userId: "user1",
      content,
      source: "agent-inferred",
    });

    // 第二次：用户明确说 → 高置信，应该升级旧记忆的 confidence
    const r2 = await rememberMemory({
      db,
      userId: "user1",
      content,
      source: "user-directive",
    });

    expect(r2.savedItems[0]?.confidence).toBe(0.85);
  });

  it("does not deduplicate different content with same owner", async () => {
    await rememberMemory({
      db,
      userId: "user1",
      content: "偏好先看结论",
      source: "agent-inferred",
    });
    await rememberMemory({
      db,
      userId: "user1",
      content: "偏好先看风险",
      source: "agent-inferred",
    });

    const items = await loadMemoryCandidatesFromDb(db, {
      owners: [{ ownerType: "user", ownerId: "user1" }],
      subjects: [{ subjectType: "user", subjectId: "user1" }],
      ownerLimit: 20,
    });
    expect(items).toHaveLength(2);
  });

  it("does not deduplicate same content across different agents (subject isolation)", async () => {
    const content = "先读 package.json 确认版本";

    // agent-frontend 写
    await rememberMemory({
      db,
      userId: "user1",
      content,
      agentKey: "agent-frontend",
      source: "agent-inferred",
    });
    // agent-backend 写相同 content——应是独立记忆（subject 不同）
    await rememberMemory({
      db,
      userId: "user1",
      content,
      agentKey: "agent-backend",
      source: "agent-inferred",
    });

    const frontendItems = await loadMemoryCandidatesFromDb(db, {
      owners: [{ ownerType: "user", ownerId: "user1" }],
      subjects: [{ subjectType: "agent", subjectId: "agent-frontend" }],
      ownerLimit: 20,
    });
    const backendItems = await loadMemoryCandidatesFromDb(db, {
      owners: [{ ownerType: "user", ownerId: "user1" }],
      subjects: [{ subjectType: "agent", subjectId: "agent-backend" }],
      ownerLimit: 20,
    });

    expect(frontendItems.filter((i) => i.content === content)).toHaveLength(1);
    expect(backendItems.filter((i) => i.content === content)).toHaveLength(1);
    // 两个 agent 的记忆 id 不同（独立条目）
    expect(frontendItems[0]?.id).not.toBe(backendItems[0]?.id);
  });

  it("deduplicates same content + same agent (same subject)", async () => {
    const content = "先读 package.json 确认版本";

    // 同一个 agent 写两次相同 content → 去重
    const r1 = await rememberMemory({
      db,
      userId: "user1",
      content,
      agentKey: "agent-frontend",
      source: "agent-inferred",
    });
    const r2 = await rememberMemory({
      db,
      userId: "user1",
      content,
      agentKey: "agent-frontend",
      source: "agent-inferred",
    });

    expect(r1.savedItems[0]?.id).toBe(r2.savedItems[0]?.id);
  });
  /**
   * procedural 硬门回归。
   *
   * 背景：kind 由模型自行传入，而 schema 描述（"重复出现的可执行流程"）约束不住它——
   * 实测 220 条存量记忆里 92 条（42%）是被误标成 procedural 的一次性排障实录，
   * 挤占了 overlay 中 procedural 的固定 top-k 配额，真正的 runbook 反而召不回来。
   * 因此 procedural 需要显式复现证据，缺失则降级 episodic（降级而非报错：
   * 分类不准不应导致记忆内容丢失）。
   */
  describe("procedural 复现证据硬门", () => {
    it("procedural 缺 recurrenceEvidence 时降级为 episodic 并回传降级原因", async () => {
      const result = await rememberMemory({
        db,
        userId: "user1",
        content: "某次部署卡在 PM2 残留实例，手动清理后恢复。",
        kind: "procedural",
      });

      expect(result.requestedKind).toBe("procedural");
      expect(result.savedKind).toBe("episodic");
      expect(result.savedItems[0]?.kind).toBe("episodic");
      // 降级必须可见，否则调用方以为写进了 runbook
      expect(result.kindDowngradeReason).toContain("recurrenceEvidence");
    });

    it("procedural 带 recurrenceEvidence 时保留 procedural 并留存证据", async () => {
      const result = await rememberMemory({
        db,
        userId: "user1",
        content: "部署前必须先清理 PM2 残留 nolo 实例。",
        kind: "procedural",
        recurrenceEvidence: "2026-08-27 与 2026-09-01 两次部署都卡在同一处。",
      });

      expect(result.savedKind).toBe("procedural");
      expect(result.savedItems[0]?.kind).toBe("procedural");
      // 证据随 item 落库，日后可复核"凭什么算 runbook"
      expect(result.savedItems[0]?.recurrenceEvidence).toContain("2026-08-27");
      expect(result.kindDowngradeReason).toBeUndefined();
    });

    it("空白 recurrenceEvidence 视同未提供", async () => {
      const result = await rememberMemory({
        db,
        userId: "user1",
        content: "空白证据不应通过硬门。",
        kind: "procedural",
        recurrenceEvidence: "   ",
      });

      expect(result.savedKind).toBe("episodic");
    });

    it("episodic / semantic 不受硬门影响", async () => {
      const ep = await rememberMemory({
        db,
        userId: "user1",
        content: "这个用户更喜欢先看结论。",
      });
      const se = await rememberMemory({
        db,
        userId: "user1",
        content: "该仓库的 alpha 分支是集成线。",
        kind: "semantic",
      });

      expect(ep.savedKind).toBe("episodic");
      expect(se.savedKind).toBe("semantic");
      expect(ep.kindDowngradeReason).toBeUndefined();
      expect(se.kindDowngradeReason).toBeUndefined();
    });
  });
  /**
   * sourceKind 显式落库回归。
   *
   * 此前 sourceKind 从不写入，全靠 getMemorySourceKind 从 patternKey 反推——
   * 实测全库 220 条 sourceKind 均为 undefined。派生逻辑对历史条目仍需保留，
   * 但新写入必须自带来源，否则 overlay 无法区分"用户说的"与"agent 猜的"。
   */
  describe("sourceKind 显式落库", () => {
    it("user-directive 落 explicit-user-directive", async () => {
      const r = await rememberMemory({
        db,
        userId: "user1",
        content: "用户明确要求记住的事。",
        source: "user-directive",
      });
      expect(r.savedItems[0]?.sourceKind).toBe("explicit-user-directive");
    });

    it("agent-inferred 落 agent-tool", async () => {
      const r = await rememberMemory({
        db,
        userId: "user1",
        content: "agent 自己判断值得记的事。",
        source: "agent-inferred",
      });
      expect(r.savedItems[0]?.sourceKind).toBe("agent-tool");
    });
  });
});
