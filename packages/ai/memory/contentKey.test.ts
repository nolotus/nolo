import { describe, expect, it } from "bun:test";
import {
  computeMemoryContentKey,
  createMemoryItem,
} from "./storeShared";

describe("computeMemoryContentKey", () => {
  const baseInput = {
    ownerType: "user" as const,
    ownerId: "user1",
    visibility: "private" as const,
    subjectType: "user" as const,
    subjectId: "user1",
    kind: "episodic" as const,
    content: "用户喜欢先看结论",
    importance: 0.8,
    confidence: 0.8,
  };

  it("produces a mem- prefixed 16-char hex key", () => {
    const key = computeMemoryContentKey(baseInput);
    expect(key).toMatch(/^mem-[0-9a-f]{16}$/);
  });

  it("is deterministic — same input always same key", () => {
    const a = computeMemoryContentKey(baseInput);
    const b = computeMemoryContentKey(baseInput);
    expect(a).toBe(b);
  });

  it("differs when kind changes (episodic vs semantic)", () => {
    const ep = computeMemoryContentKey({ ...baseInput, kind: "episodic" });
    const sm = computeMemoryContentKey({ ...baseInput, kind: "semantic" });
    expect(ep).not.toBe(sm);
  });

  it("differs when subject changes (user vs agent)", () => {
    const userSubject = computeMemoryContentKey({
      ...baseInput,
      subjectType: "user",
      subjectId: "user1",
    });
    const agentSubject = computeMemoryContentKey({
      ...baseInput,
      subjectType: "agent",
      subjectId: "agent-a",
    });
    expect(userSubject).not.toBe(agentSubject);
  });

  it("differs when content changes", () => {
    const a = computeMemoryContentKey({ ...baseInput, content: "喜欢先看结论" });
    const b = computeMemoryContentKey({ ...baseInput, content: "喜欢先看展开" });
    expect(a).not.toBe(b);
  });

  it("differs when owner changes (user vs space)", () => {
    const userOwned = computeMemoryContentKey({
      ...baseInput,
      ownerType: "user",
      ownerId: "user1",
    });
    const spaceOwned = computeMemoryContentKey({
      ...baseInput,
      ownerType: "space",
      ownerId: "space1",
    });
    expect(userOwned).not.toBe(spaceOwned);
  });
});

describe("createMemoryItem contentKey", () => {
  it("auto-generates contentKey on creation", () => {
    const item = createMemoryItem({
      ownerType: "user",
      ownerId: "user1",
      visibility: "private",
      subjectType: "user",
      subjectId: "user1",
      kind: "episodic",
      content: "测试记忆",
      importance: 0.8,
      confidence: 0.8,
    });
    expect(item.contentKey).toBeDefined();
    expect(item.contentKey).toMatch(/^mem-[0-9a-f]{16}$/);
  });

  it("two items with same semantic fields get same contentKey but different id", () => {
    const input = {
      ownerType: "user" as const,
      ownerId: "user1",
      visibility: "private" as const,
      subjectType: "user" as const,
      subjectId: "user1",
      kind: "episodic" as const,
      content: "同一条记忆",
      importance: 0.8,
      confidence: 0.8,
    };
    const a = createMemoryItem(input);
    const b = createMemoryItem(input);
    // contentKey 相同 — 跨实例去重的基础
    expect(a.contentKey).toBe(b.contentKey);
    // id 不同 — 保证唯一性
    expect(a.id).not.toBe(b.id);
  });
});