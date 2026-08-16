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
      source: "user-directive",
    });
    const agentProc = await rememberMemory({
      db,
      userId: "user1",
      content: "agent 推测的排障步骤",
      kind: "procedural",
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
});
