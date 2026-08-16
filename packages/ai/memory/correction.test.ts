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

describe("memory correction", () => {
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
      userInput: "你记错了，别再提这个",
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

  it("skips items activated outside the recent window", async () => {
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
      userInput: "你记错了",
    });

    const stored = await db.get(createMemoryKey("user", "user1", injected.id));
    expect(stored.confidence).toBeCloseTo(0.05, 5);
  });
});
