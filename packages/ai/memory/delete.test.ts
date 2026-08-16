import { beforeEach, describe, expect, it } from "bun:test";
import { MemoryDB } from "database-engine/MemoryDB";

let moduleVersion = 0;

/**
 * Dynamic imports with cache-busting to avoid module-mock pollution from
 * sibling test files (runtime.test.ts mocks ./storeShared and ./queryShared).
 */
const loadDeps = async () => {
  const v = moduleVersion++;
  const [deleteMod, storeMod, queryMod] = await Promise.all([
    import(`./delete.ts?real=${v}`),
    import(`./storeShared?real=${v}`),
    import(`./queryShared?real=${v}`),
  ]);
  return {
    deleteMemoriesForOwnerFromDb: deleteMod.deleteMemoriesForOwnerFromDb,
    createMemoryItem: storeMod.createMemoryItem,
    writeMemoryItemWithIndexesToDb: storeMod.writeMemoryItemWithIndexesToDb,
    loadMemoryCandidatesFromDb: queryMod.loadMemoryCandidatesFromDb,
  };
};

describe("memory delete", () => {
  const db = new MemoryDB();

  beforeEach(() => {
    db.clear();
  });

  it("deletes memory records and indexes by owner filters", async () => {
    const { deleteMemoriesForOwnerFromDb, createMemoryItem, writeMemoryItemWithIndexesToDb, loadMemoryCandidatesFromDb } = await loadDeps();
    await writeMemoryItemWithIndexesToDb(
      db,
      createMemoryItem({
        ownerType: "user",
        ownerId: "user-1",
        visibility: "private",
        subjectType: "agent",
        subjectId: "agent-a",
        kind: "episodic",
        facet: "tension",
        content: "在权衡先稳住首体验还是先搭运营体系",
        importance: 0.9,
        confidence: 0.8,
        tags: ["understanding-memory", "memory-facet:tension"],
        patternKey: "understanding:tension:test",
        sourceDialogId: "dialog-a",
      })
    );
    await writeMemoryItemWithIndexesToDb(
      db,
      createMemoryItem({
        ownerType: "user",
        ownerId: "user-1",
        visibility: "private",
        subjectType: "agent",
        subjectId: "agent-a",
        kind: "semantic",
        facet: "preference",
        content: "更在意首封邮件的信任感",
        importance: 0.9,
        confidence: 0.8,
        tags: ["understanding-memory", "memory-facet:preference"],
        patternKey: "understanding:preference:test",
        sourceDialogId: "dialog-b",
      })
    );

    const result = await deleteMemoriesForOwnerFromDb(
      db,
      { ownerType: "user", ownerId: "user-1" },
      { facets: ["tension"], sourceDialogId: "dialog-a" }
    );

    expect(result.deletedCount).toBe(1);
    expect(result.matchedItems[0]?.facet).toBe("tension");

    const remaining = await loadMemoryCandidatesFromDb(db, {
      owners: [{ ownerType: "user", ownerId: "user-1" }],
      subjects: [{ subjectType: "agent", subjectId: "agent-a" }],
      kinds: ["episodic", "semantic"],
      ownerLimit: 20,
    });

    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.facet).toBe("preference");
  });

  it("supports delete-and-rerun loops for understanding memory records", async () => {
    const { deleteMemoriesForOwnerFromDb, createMemoryItem, writeMemoryItemWithIndexesToDb, loadMemoryCandidatesFromDb } = await loadDeps();
    await writeMemoryItemWithIndexesToDb(
      db,
      createMemoryItem({
        ownerType: "user",
        ownerId: "user-1",
        visibility: "private",
        subjectType: "agent",
        subjectId: "agent-email",
        kind: "episodic",
        facet: "preference",
        content: "更在意首封邮件的信任感",
        importance: 0.84,
        confidence: 0.72,
        tags: ["understanding-memory", "memory-facet:preference"],
        patternKey: "understanding:preference:email-trust",
        sourceDialogId: "dialog-1",
      })
    );

    let items = await loadMemoryCandidatesFromDb(db, {
      owners: [{ ownerType: "user", ownerId: "user-1" }],
      subjects: [{ subjectType: "agent", subjectId: "agent-email" }],
      kinds: ["episodic", "semantic"],
      ownerLimit: 20,
    });
    expect(items).toHaveLength(1);

    const deleted = await deleteMemoriesForOwnerFromDb(
      db,
      { ownerType: "user", ownerId: "user-1" },
      {
        subjectType: "agent",
        subjectId: "agent-email",
        tags: ["understanding-memory"],
      }
    );
    expect(deleted.deletedCount).toBeGreaterThan(0);

    items = await loadMemoryCandidatesFromDb(db, {
      owners: [{ ownerType: "user", ownerId: "user-1" }],
      subjects: [{ subjectType: "agent", subjectId: "agent-email" }],
      kinds: ["episodic", "semantic"],
      ownerLimit: 20,
    });
    expect(items).toHaveLength(0);

    await writeMemoryItemWithIndexesToDb(
      db,
      createMemoryItem({
        ownerType: "user",
        ownerId: "user-1",
        visibility: "private",
        subjectType: "agent",
        subjectId: "agent-email",
        kind: "episodic",
        facet: "preference",
        content: "更在意首封邮件的信任感",
        importance: 0.84,
        confidence: 0.72,
        tags: ["understanding-memory", "memory-facet:preference"],
        patternKey: "understanding:preference:email-trust",
        sourceDialogId: "dialog-2",
      })
    );

    items = await loadMemoryCandidatesFromDb(db, {
      owners: [{ ownerType: "user", ownerId: "user-1" }],
      subjects: [{ subjectType: "agent", subjectId: "agent-email" }],
      kinds: ["episodic", "semantic"],
      ownerLimit: 20,
    });
    expect(items).toHaveLength(1);
    expect(items[0]?.sourceDialogId).toBe("dialog-2");
  });
});
