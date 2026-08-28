import { beforeEach, describe, expect, it } from "bun:test";
import { createMemoryKey } from "database/keys";
import { MemoryDB } from "database-engine/MemoryDB";
import { loadMemoryCandidatesFromDb } from "./query";
import { captureUnderstandingMemoryFromDialog } from "./understanding";
import { buildUnderstandingCandidate } from "./understandingLlm";

/**
 * 抽取本身在 understandingLlm.test.ts 覆盖。这里只测写入侧决策：归属、去重、
 * episodic→semantic 升级——这些规则与抽取方式无关，换掉正则不该动它们。
 */
const stubLlm = (candidates: Array<{ facet: string; content: string }>) =>
  async () => JSON.stringify(candidates);

const TENSION = {
  facet: "tension",
  content: "在权衡稳定可信的首体验与更强运营能力",
};
const GOAL = {
  facet: "goal",
  content: "想先把第一封欢迎邮件的体验做稳",
};

describe("understanding memory", () => {
  const db = new MemoryDB();

  beforeEach(() => {
    db.clear();
  });

  it("skips extraction entirely when no llmCall is injected", async () => {
    await captureUnderstandingMemoryFromDialog({
      db,
      userId: "user-1",
      agentKey: "agent-email",
      dialogId: "dialog-1",
      userInput: "我更在意信任感，不想一上来就很促销。",
    });

    const items = await loadMemoryCandidatesFromDb(db, {
      owners: [{ ownerType: "user", ownerId: "user-1" }],
      subjects: [{ subjectType: "agent", subjectId: "agent-email" }],
      kinds: ["episodic", "semantic"],
      ownerLimit: 20,
    });
    expect(items).toHaveLength(0);
  });

  it("does not spend an LLM call on trivially short turns", async () => {
    let called = false;
    await captureUnderstandingMemoryFromDialog({
      db,
      userId: "user-1",
      agentKey: "agent-email",
      dialogId: "dialog-1",
      userInput: "好的",
      llmCall: async () => {
        called = true;
        return "[]";
      },
    });
    expect(called).toBe(false);
  });

  it("persists understanding memory under the agent subject and consolidates repeats into semantic", async () => {
    const llmCall = stubLlm([TENSION]);

    await captureUnderstandingMemoryFromDialog({
      db,
      userId: "user-1",
      agentKey: "agent-email",
      dialogId: "dialog-1",
      userInput:
        "我现在真正纠结的是：第一阶段先只上 transactional，还是一开始就搭 marketing 分组体系。",
      llmCall,
    });

    let items = await loadMemoryCandidatesFromDb(db, {
      owners: [{ ownerType: "user", ownerId: "user-1" }],
      subjects: [{ subjectType: "agent", subjectId: "agent-email" }],
      kinds: ["episodic", "semantic"],
      ownerLimit: 20,
    });

    expect(
      items.some(
        (item) =>
          item.kind === "episodic" && item.tags?.includes("understanding-memory")
      )
    ).toBe(true);
    expect(items.some((item) => item.kind === "semantic")).toBe(false);

    // 同一信号出现在另一个 dialog → 升级为 semantic
    await captureUnderstandingMemoryFromDialog({
      db,
      userId: "user-1",
      agentKey: "agent-email",
      dialogId: "dialog-2",
      userInput:
        "我现在真正纠结的是：第一阶段先只上 transactional，还是一开始就搭 marketing 分组体系。",
      llmCall,
    });

    items = await loadMemoryCandidatesFromDb(db, {
      owners: [{ ownerType: "user", ownerId: "user-1" }],
      subjects: [{ subjectType: "agent", subjectId: "agent-email" }],
      kinds: ["episodic", "semantic"],
      ownerLimit: 20,
    });

    expect(
      items.some(
        (item) =>
          item.kind === "semantic" && item.content.includes("稳定可信的首体验")
      )
    ).toBe(true);
  });

  it("does not re-write the same signal twice within one dialog", async () => {
    const llmCall = stubLlm([TENSION]);
    const args = {
      db,
      userId: "user-1",
      agentKey: "agent-email",
      dialogId: "dialog-1",
      userInput: "我现在真正纠结的是第一阶段的取舍。",
      llmCall,
    };
    await captureUnderstandingMemoryFromDialog(args);
    await captureUnderstandingMemoryFromDialog(args);

    const items = await loadMemoryCandidatesFromDb(db, {
      owners: [{ ownerType: "user", ownerId: "user-1" }],
      subjects: [{ subjectType: "agent", subjectId: "agent-email" }],
      kinds: ["episodic", "semantic"],
      ownerLimit: 20,
    });
    expect(items).toHaveLength(1);
  });

  it("does not promote legacy episodic memories without sourceDialogId into semantic", async () => {
    const llmCall = stubLlm([GOAL]);
    const legacyCandidate = buildUnderstandingCandidate("goal", GOAL.content);
    expect(legacyCandidate?.facet).toBe("goal");

    await captureUnderstandingMemoryFromDialog({
      db,
      userId: "user-1",
      agentKey: "agent-email",
      dialogId: "dialog-legacy",
      userInput: "这次我想先把第一封欢迎邮件的体验做稳。",
      llmCall,
    });

    let items = await loadMemoryCandidatesFromDb(db, {
      owners: [{ ownerType: "user", ownerId: "user-1" }],
      subjects: [{ subjectType: "agent", subjectId: "agent-email" }],
      kinds: ["episodic", "semantic"],
      ownerLimit: 20,
    });

    const legacyEpisode = items.find(
      (item) =>
        item.kind === "episodic" &&
        item.patternKey === legacyCandidate?.patternKey
    );
    if (!legacyEpisode) {
      throw new Error("missing legacy episodic memory");
    }

    await db.put(createMemoryKey("user", "user-1", legacyEpisode.id), {
      ...legacyEpisode,
      sourceDialogId: undefined,
    });

    await captureUnderstandingMemoryFromDialog({
      db,
      userId: "user-1",
      agentKey: "agent-email",
      dialogId: "dialog-next",
      userInput: "这次我想先把第一封欢迎邮件的体验做稳。",
      llmCall,
    });

    items = await loadMemoryCandidatesFromDb(db, {
      owners: [{ ownerType: "user", ownerId: "user-1" }],
      subjects: [{ subjectType: "agent", subjectId: "agent-email" }],
      kinds: ["episodic", "semantic"],
      ownerLimit: 20,
    });

    const samePatternItems = items.filter(
      (item) => item.patternKey === legacyCandidate?.patternKey
    );
    expect(samePatternItems.some((item) => item.kind === "semantic")).toBe(false);
    expect(samePatternItems.filter((item) => item.kind === "episodic")).toHaveLength(2);
  });
});
