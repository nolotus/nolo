import { describe, expect, it } from "bun:test";
import { MemoryDB } from "database-engine/MemoryDB";
import { createMemoryItem, writeMemoryItemWithIndexesToDb } from "./store";

let moduleVersion = 0;

const loadUnderstandingGreetingModule = () =>
  import(`./understandingGreeting.ts`);

describe("understanding greeting", () => {
  it("builds a greeting from what the user cared about and the unresolved branch", async () => {
    const { mergeGreetingWithUnderstandingMemory } =
      await loadUnderstandingGreetingModule();
    const resolution = {
      item: {
        facet: "unfinished",
        content: "还没决定第一阶段先只做 transactional，还是先搭 marketing 分组",
      },
      anchorItems: [
        {
          facet: "preference",
          content: "更在意首封邮件的信任感",
        },
      ],
      followUpItem: {
        facet: "unfinished",
        content: "还没决定第一阶段先只做 transactional，还是先搭 marketing 分组",
      },
    } as any;
    const greeting = mergeGreetingWithUnderstandingMemory({
      greetingText: "你好，我是邮件助手。",
      resolution,
    });

    expect(greeting).toContain("欢迎回来。");
    expect(greeting).toContain("我记得你上次更在意的是首封邮件的信任感");
    expect(greeting).toContain("如果你愿意，我们可以接着看：第一阶段先只做 transactional，还是先搭 marketing 分组");
    expect(greeting).not.toContain("我记得你之前");
  });

  it("stays empty for a brand-new agent even when the user has memories from other agents", async () => {
    const { resolveUnderstandingGreetingMemory } =
      await loadUnderstandingGreetingModule();
    const db = new MemoryDB();
    await writeMemoryItemWithIndexesToDb(
      db,
      createMemoryItem({
        ownerType: "user",
        ownerId: "user1",
        visibility: "private",
        subjectType: "agent",
        subjectId: "agent-old-writer",
        kind: "episodic",
        content: "更怕交付延期",
        importance: 0.9,
        confidence: 0.9,
        tags: ["understanding-memory"],
        facet: "preference",
      })
    );

    const resolution = await resolveUnderstandingGreetingMemory({
      db,
      userId: "user1",
      spaceId: "space-media",
      agentKey: "agent-brand-new",
    });

    expect(resolution.item).toBeNull();
    expect(resolution.anchorItems).toEqual([]);
    expect(resolution.followUpItem).toBeNull();
  });

  it("still surfaces consolidated memories recorded for the same agent", async () => {
    const { resolveUnderstandingGreetingMemory } =
      await loadUnderstandingGreetingModule();
    const db = new MemoryDB();
    await writeMemoryItemWithIndexesToDb(
      db,
      createMemoryItem({
        ownerType: "user",
        ownerId: "user1",
        visibility: "private",
        subjectType: "agent",
        subjectId: "agent-same",
        kind: "semantic",
        content: "更在意首封邮件的信任感",
        importance: 0.9,
        confidence: 0.8,
        tags: ["understanding-memory", "consolidated-understanding"],
        facet: "preference",
      })
    );

    const resolution = await resolveUnderstandingGreetingMemory({
      db,
      userId: "user1",
      spaceId: "space-media",
      agentKey: "agent-same",
    });

    expect(resolution.item?.content).toBe("更在意首封邮件的信任感");
  });

  it("keeps single-observation and low-confidence memories out of the greeting", async () => {
    const { resolveUnderstandingGreetingMemory } =
      await loadUnderstandingGreetingModule();
    const db = new MemoryDB();
    // Episodic = only ever observed in one dialog: not allowed to open.
    await writeMemoryItemWithIndexesToDb(
      db,
      createMemoryItem({
        ownerType: "user",
        ownerId: "user1",
        visibility: "private",
        subjectType: "agent",
        subjectId: "agent-same",
        kind: "episodic",
        content: "更怕交付延期",
        importance: 0.9,
        confidence: 0.76,
        tags: ["understanding-memory"],
        facet: "preference",
      })
    );
    // Consolidated but corrected below the greeting bar: silenced.
    await writeMemoryItemWithIndexesToDb(
      db,
      createMemoryItem({
        ownerType: "user",
        ownerId: "user1",
        visibility: "private",
        subjectType: "agent",
        subjectId: "agent-same",
        kind: "semantic",
        content: "不喜欢新的排版系统",
        importance: 0.9,
        confidence: 0.58,
        tags: ["understanding-memory", "consolidated-understanding"],
        facet: "style",
      })
    );

    const resolution = await resolveUnderstandingGreetingMemory({
      db,
      userId: "user1",
      spaceId: "space-media",
      agentKey: "agent-same",
    });

    expect(resolution.item).toBeNull();
    expect(resolution.anchorItems).toEqual([]);
  });
});
