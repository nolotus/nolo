import { beforeEach, describe, expect, it } from "bun:test";
import { MemoryDB } from "database-engine/MemoryDB";
import { createMemoryItem, writeMemoryItemWithIndexesToDb } from "./store";
import { loadMemoryCandidatesFromDb } from "./query";

describe("memory query", () => {
  const db = new MemoryDB();

  beforeEach(() => {
    db.clear();
  });

  it("filters by both subjectType and subjectId when recalling from subject indexes", async () => {
    await writeMemoryItemWithIndexesToDb(
      db,
      createMemoryItem({
        ownerType: "user",
        ownerId: "user1",
        visibility: "private",
        subjectType: "user",
        subjectId: "shared-subject",
        kind: "episodic",
        content: "用户自己的记忆",
        importance: 0.9,
        confidence: 0.9,
      })
    );
    await writeMemoryItemWithIndexesToDb(
      db,
      createMemoryItem({
        ownerType: "user",
        ownerId: "user1",
        visibility: "private",
        subjectType: "space",
        subjectId: "shared-subject",
        kind: "episodic",
        content: "同 id 但不同 subjectType 的记忆",
        importance: 0.9,
        confidence: 0.9,
      })
    );
    await writeMemoryItemWithIndexesToDb(
      db,
      createMemoryItem({
        ownerType: "user",
        ownerId: "user2",
        visibility: "private",
        subjectType: "user",
        subjectId: "shared-subject",
        kind: "episodic",
        content: "其他 owner 的记忆",
        importance: 0.9,
        confidence: 0.9,
      })
    );

    const items = await loadMemoryCandidatesFromDb(db, {
      owners: [{ ownerType: "user", ownerId: "user1" }],
      subjects: [{ subjectType: "user", subjectId: "shared-subject" }],
      kinds: ["episodic"],
      ownerLimit: 20,
    });

    expect(items.map((item) => item.content)).toEqual(["用户自己的记忆"]);
  });

  it("falls back to owner recent memories when subject indexes miss", async () => {
    await writeMemoryItemWithIndexesToDb(
      db,
      createMemoryItem({
        ownerType: "user",
        ownerId: "user1",
        visibility: "private",
        subjectType: "project",
        subjectId: "old-project",
        kind: "episodic",
        content: "用户偏好先给结论，再补证据",
        importance: 0.9,
        confidence: 0.9,
      })
    );

    const items = await loadMemoryCandidatesFromDb(db, {
      owners: [{ ownerType: "user", ownerId: "user1" }],
      subjects: [{ subjectType: "user", subjectId: "user1" }],
      kinds: ["episodic"],
      ownerLimit: 20,
    });

    expect(items.map((item) => item.content)).toContain("用户偏好先给结论，再补证据");
  });

  it("can include owner fallback even when another subject has hits", async () => {
    await writeMemoryItemWithIndexesToDb(
      db,
      createMemoryItem({
        ownerType: "user",
        ownerId: "user1",
        visibility: "private",
        subjectType: "agent",
        subjectId: "agent-a",
        kind: "episodic",
        content: "这个 agent 的旧理解",
        importance: 0.6,
        confidence: 0.7,
      })
    );
    await writeMemoryItemWithIndexesToDb(
      db,
      createMemoryItem({
        ownerType: "user",
        ownerId: "user1",
        visibility: "private",
        subjectType: "user",
        subjectId: "user1",
        kind: "episodic",
        content: "用户身份是 nolotus",
        importance: 0.95,
        confidence: 0.95,
        patternKey: "agent-remember",
      })
    );

    const items = await loadMemoryCandidatesFromDb(db, {
      owners: [{ ownerType: "user", ownerId: "user1" }],
      subjects: [{ subjectType: "agent", subjectId: "agent-a" }],
      kinds: ["episodic"],
      ownerLimit: 20,
      ownerFallback: "always",
    });

    expect(items.map((item) => item.content)).toContain("这个 agent 的旧理解");
    expect(items.map((item) => item.content)).toContain("用户身份是 nolotus");
  });

  it("never falls back to owner memories when ownerFallback is never", async () => {
    await writeMemoryItemWithIndexesToDb(
      db,
      createMemoryItem({
        ownerType: "user",
        ownerId: "user1",
        visibility: "private",
        subjectType: "agent",
        subjectId: "agent-other",
        kind: "episodic",
        content: "别的 agent 的记忆",
        importance: 0.9,
        confidence: 0.9,
      })
    );

    const items = await loadMemoryCandidatesFromDb(db, {
      owners: [{ ownerType: "user", ownerId: "user1" }],
      subjects: [{ subjectType: "agent", subjectId: "agent-brand-new" }],
      kinds: ["episodic"],
      ownerLimit: 20,
      ownerFallback: "never",
    });

    expect(items).toEqual([]);
  });
});
