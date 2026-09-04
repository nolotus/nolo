import { describe, expect, it } from "bun:test";
import { MemoryDB } from "database-engine/MemoryDB";
import {
  detectMemoryCorrection,
  penalizeCorrectedMemories,
  MEMORY_CORRECTION_PENALTY,
} from "./correction";
import { createMemoryItem, writeMemoryItemWithIndexesToDb } from "./store";
import { createMemoryKey } from "database/keys";

const writeActivatedItem = async (
  db: MemoryDB,
  overrides: Partial<Parameters<typeof createMemoryItem>[0]> & {
    activationCount?: number;
    lastActivatedAt?: string;
  }
) => {
  const item = {
    ...createMemoryItem({
      ownerType: "user",
      ownerId: "user1",
      visibility: "private",
      subjectType: "agent",
      subjectId: "agent-a",
      kind: "episodic",
      content: "更怕交付延期",
      importance: 0.9,
      confidence: 0.76,
      tags: ["understanding-memory"],
      ...overrides,
    } as any),
    ...(overrides.activationCount !== undefined
      ? { activationCount: overrides.activationCount }
      : {}),
    ...(overrides.lastActivatedAt !== undefined
      ? { lastActivatedAt: overrides.lastActivatedAt }
      : {}),
  };
  await writeMemoryItemWithIndexesToDb(db, item);
  return item;
};

/** Write an item that looks as if it was just retrieved into the overlay. */
const writeRecentlyRetrieved = (
  db: MemoryDB,
  overrides: Parameters<typeof writeActivatedItem>[1]
) =>
  writeActivatedItem(db, {
    activationCount: 2,
    lastActivatedAt: new Date().toISOString(),
    ...overrides,
  });

describe("memory correction attribution (no friendly fire)", () => {
  it("penalizes only the memory whose identifier is explicitly named", async () => {
    const db = new MemoryDB();
    const a = await writeRecentlyRetrieved(db, { content: "用户喜欢短回答" });
    const b = await writeRecentlyRetrieved(db, { content: "用户常用 agent-x123 跑评测" });
    const c = await writeRecentlyRetrieved(db, { content: "用户正在做 bun-nolo" });

    const result = await penalizeCorrectedMemories({
      db,
      userId: "user1",
      agentKey: "agent-a",
      userInput: "agent-x123 根本不存在，你记错了",
    });

    expect(result.detected).toBe(true);
    expect(result.penalizedItems.map((item) => item.id)).toEqual([b.id]);
    expect((await db.get(createMemoryKey("user", "user1", a.id))).confidence).toBeCloseTo(0.76, 5);
    expect((await db.get(createMemoryKey("user", "user1", b.id))).confidence).toBeCloseTo(0.56, 5);
    expect((await db.get(createMemoryKey("user", "user1", c.id))).confidence).toBeCloseTo(0.76, 5);
  });

  it("penalizes only the clearly related memory, not every recently retrieved one", async () => {
    const db = new MemoryDB();
    const a = await writeRecentlyRetrieved(db, { content: "用户主要使用 TypeScript 开发" });
    const b = await writeRecentlyRetrieved(db, { content: "用户喜欢先看结论" });

    const result = await penalizeCorrectedMemories({
      db,
      userId: "user1",
      agentKey: "agent-a",
      userInput: "我用的是 Rust，你记错了，TypeScript 那条是以前的",
    });

    expect(result.detected).toBe(true);
    expect(result.penalizedItems.map((item) => item.id)).toEqual([a.id]);
    expect((await db.get(createMemoryKey("user", "user1", a.id))).confidence).toBeCloseTo(0.56, 5);
    expect((await db.get(createMemoryKey("user", "user1", b.id))).confidence).toBeCloseTo(0.76, 5);
  });

  it("no-ops on a vague correction that could also be about reasoning", async () => {
    const db = new MemoryDB();
    const items = [
      await writeRecentlyRetrieved(db, { content: "用户喜欢简洁回答" }),
      await writeRecentlyRetrieved(db, { content: "用户正在做 bun-nolo" }),
      await writeRecentlyRetrieved(db, { content: "用户关注运行成本" }),
    ];

    const result = await penalizeCorrectedMemories({
      db,
      userId: "user1",
      agentKey: "agent-a",
      userInput: "不是这样，你理解反了",
    });

    expect(result.detected).toBe(true);
    expect(result.penalizedItems).toEqual([]);
    for (const item of items) {
      expect((await db.get(createMemoryKey("user", "user1", item.id))).confidence).toBeCloseTo(0.76, 5);
    }
  });

  it("penalizes only the obviously relevant memory among several recent ones", async () => {
    const db = new MemoryDB();
    const a = await writeRecentlyRetrieved(db, { content: "用户的主站运行在 Google Taiwan" });
    const b = await writeRecentlyRetrieved(db, { content: "用户喜欢中文回答" });
    const c = await writeRecentlyRetrieved(db, { content: "用户关注 Agent 并发" });

    const result = await penalizeCorrectedMemories({
      db,
      userId: "user1",
      agentKey: "agent-a",
      userInput: "Google Taiwan 是以前的，你记错了",
    });

    expect(result.detected).toBe(true);
    expect(result.penalizedItems.map((item) => item.id)).toEqual([a.id]);
    expect((await db.get(createMemoryKey("user", "user1", b.id))).confidence).toBeCloseTo(0.76, 5);
    expect((await db.get(createMemoryKey("user", "user1", c.id))).confidence).toBeCloseTo(0.76, 5);
  });

  it("repeated explicit corrections drive the target toward cold storage without touching others", async () => {
    const db = new MemoryDB();
    const target = await writeRecentlyRetrieved(db, { content: "用户常用 agent-x123 跑评测" });
    const bystander = await writeRecentlyRetrieved(db, { content: "用户喜欢短回答" });

    for (let round = 0; round < 4; round += 1) {
      // 模拟每一轮都被重新检索进 overlay（touch）
      const key = createMemoryKey("user", "user1", target.id);
      const fresh = await db.get(key);
      await db.put(key, {
        ...fresh,
        activationCount: (fresh.activationCount ?? 0) + 1,
        lastActivatedAt: new Date().toISOString(),
      });

      const result = await penalizeCorrectedMemories({
        db,
        userId: "user1",
        agentKey: "agent-a",
        userInput: "agent-x123 根本不存在，你记错了",
      });
      expect(result.penalizedItems.map((item) => item.id)).toEqual([target.id]);
    }

    const stored = await db.get(createMemoryKey("user", "user1", target.id));
    expect(stored.confidence).toBeLessThan(0.2); // 4 × -0.2 从 0.76 → 低于常规使用阈值
    const storedBystander = await db.get(createMemoryKey("user", "user1", bystander.id));
    expect(storedBystander.confidence).toBeCloseTo(0.76, 5);
  });

  it("regression guard: penalizing ALL recent memories would fail these tests", async () => {
    // 如果 attribution 被回退成"全部 recent memories penalty"，
    // 本条中的 bystander 断言会立刻变红。
    const db = new MemoryDB();
    const target = await writeRecentlyRetrieved(db, { content: "用户常用 agent-y999 部署" });
    const bystander = await writeRecentlyRetrieved(db, { content: "用户喜欢短回答" });

    await penalizeCorrectedMemories({
      db,
      userId: "user1",
      agentKey: "agent-a",
      userInput: "agent-y999 已经下线了，你记错了",
    });

    expect((await db.get(createMemoryKey("user", "user1", target.id))).confidence).toBeCloseTo(0.56, 5);
    expect((await db.get(createMemoryKey("user", "user1", bystander.id))).confidence).toBeCloseTo(0.76, 5);
  });
});

  it("detects pushback phrases and ignores normal input", () => {
    expect(detectMemoryCorrection("你记错了，我没说过怕交付延期")).toBe(true);
    expect(detectMemoryCorrection("别再提吊顶高度的事")).toBe(true);
    expect(detectMemoryCorrection("不是这样的")).toBe(true);
    expect(detectMemoryCorrection("that's not what I said")).toBe(true);
    expect(detectMemoryCorrection("帮我写一篇小红书文案")).toBe(false);
    expect(detectMemoryCorrection("")).toBe(false);
  });

  it("penalizes recently activated memories on correction", async () => {
    const db = new MemoryDB();
    const injected = await writeActivatedItem(db, {
      activationCount: 2,
      lastActivatedAt: new Date().toISOString(),
    });
    const dormant = await writeActivatedItem(db, {
      content: "喜欢先看结论",
      activationCount: 0,
    });

    const result = await penalizeCorrectedMemories({
      db,
      userId: "user1",
      agentKey: "agent-a",
      userInput: "你记错了，我根本没说过怕交付延期，别再提交付延期",
    });

    expect(result.detected).toBe(true);
    expect(result.penalizedItems.map((item) => item.id)).toEqual([injected.id]);

    const storedInjected = await db.get(
      createMemoryKey("user", "user1", injected.id)
    );
    expect(storedInjected.confidence).toBeCloseTo(
      0.76 + MEMORY_CORRECTION_PENALTY,
      5
    );
    const storedDormant = await db.get(
      createMemoryKey("user", "user1", dormant.id)
    );
    expect(storedDormant.confidence).toBeCloseTo(0.76, 5);
  });

  it("does not touch anything when there is no correction", async () => {
    const db = new MemoryDB();
    const injected = await writeActivatedItem(db, {
      activationCount: 1,
      lastActivatedAt: new Date().toISOString(),
    });

    const result = await penalizeCorrectedMemories({
      db,
      userId: "user1",
      agentKey: "agent-a",
      userInput: "继续写下一段",
    });

    expect(result.detected).toBe(false);
    const stored = await db.get(createMemoryKey("user", "user1", injected.id));
    expect(stored.confidence).toBeCloseTo(0.76, 5);
  });

  it("skips items retrieved outside the recent window", async () => {
    const db = new MemoryDB();
    const stale = await writeActivatedItem(db, {
      activationCount: 3,
      lastActivatedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    });

    const result = await penalizeCorrectedMemories({
      db,
      userId: "user1",
      agentKey: "agent-a",
      userInput: "记错了",
    });

    expect(result.detected).toBe(true);
    expect(result.penalizedItems).toEqual([]);
    const stored = await db.get(createMemoryKey("user", "user1", stale.id));
    expect(stored.confidence).toBeCloseTo(0.76, 5);
  });

  it("floors confidence instead of going negative", async () => {
    const db = new MemoryDB();
    const injected = await writeActivatedItem(db, {
      confidence: 0.1,
      activationCount: 5,
      lastActivatedAt: new Date().toISOString(),
    });

    await penalizeCorrectedMemories({
      db,
      userId: "user1",
      agentKey: "agent-a",
      userInput: "你记错了，交付延期这事我从来没提过",
    });

    const stored = await db.get(createMemoryKey("user", "user1", injected.id));
    expect(stored.confidence).toBeCloseTo(0.05, 5);
  });
