import { beforeEach, describe, expect, it } from "bun:test";
import { MemoryDB } from "database-engine/MemoryDB";
import { captureCompletedMemoryTurn } from "./completedTurn";
import { loadMemoryCandidatesFromDb } from "./query";

describe("captureCompletedMemoryTurn", () => {
  const db = new MemoryDB();

  beforeEach(() => {
    db.clear();
  });

  it("runs completed-turn explicit and understanding capture through one entry point", async () => {
    await captureCompletedMemoryTurn({
      db,
      userId: "user1",
      spaceId: "space1",
      agentKey: "agent-a",
      dialogId: "dialog-1",
      userInput:
        "请记住，我是 nolotus。我现在真正纠结的是：先修记忆召回，还是先整理架构。",
      trace: [
        {
          role: "assistant",
          content:
            "所以你卡的点不是能不能写入，而是记忆召回路径与架构整理之间的取舍。",
        },
      ],
      // understanding 抽取现在走 LLM；stub 返回一条 tension 候选。
      // dialogLearning 共用这个 llmCall，但它按 `pattern` 字段校验，
      // 这份 facet/content 响应对它来说没有合法候选，因此不会写 procedural。
      llmCall: async () =>
        JSON.stringify([
          { facet: "tension", content: "在权衡记忆召回路径与架构整理" },
        ]),
    });

    const userSubjectItems = await loadMemoryCandidatesFromDb(db, {
      owners: [{ ownerType: "user", ownerId: "user1" }],
      subjects: [{ subjectType: "user", subjectId: "user1" }],
      kinds: ["episodic"],
      ownerLimit: 20,
    });
    const agentSubjectItems = await loadMemoryCandidatesFromDb(db, {
      owners: [{ ownerType: "user", ownerId: "user1" }],
      subjects: [{ subjectType: "agent", subjectId: "agent-a" }],
      kinds: ["episodic"],
      ownerLimit: 20,
    });

    expect(userSubjectItems.some((item) => item.patternKey === "explicit-remember")).toBe(true);
    expect(agentSubjectItems.some((item) => item.tags?.includes("understanding-memory"))).toBe(true);
  });

  it("returns visible saved memory events for explicit user directives", async () => {
    const result = await captureCompletedMemoryTurn({
      db,
      userId: "user1",
      agentKey: "agent-a",
      dialogId: "dialog-visible-1",
      userInput: "请记住，我希望你叫我 nolotus。",
      trace: [{ role: "assistant", content: "已记住。" }],
    });

    expect(result.savedMemories).toEqual([
      expect.objectContaining({
        sourceKind: "explicit-user-directive",
        content: expect.stringContaining("叫我 nolotus"),
        visibility: "private",
        kind: "episodic",
      }),
    ]);
  });

  it("does not emit visible events for inferred understanding memories", async () => {
    const result = await captureCompletedMemoryTurn({
      db,
      userId: "user1",
      agentKey: "agent-a",
      dialogId: "dialog-understanding-only",
      userInput: "我更怕第一封把用户吓跑。",
      trace: [
        {
          role: "assistant",
          content: "明白，你更在意信任感。",
        },
      ],
    });

    const understandingEvents = result.savedMemories.filter(
      (m) => m.sourceKind === "inferred-understanding"
    );
    expect(understandingEvents).toHaveLength(0);
  });

  it("returns visible events for agent tool memories from bestEffortMemories", async () => {
    const result = await captureCompletedMemoryTurn({
      db,
      userId: "user1",
      agentKey: "agent-a",
      dialogId: "dialog-best-effort",
      userInput: "继续讨论。",
      trace: [{ role: "assistant", content: "好的。" }],
      bestEffortMemories: [
        {
          content: "用户偏好先给结论再补细节。",
        },
      ],
    });

    expect(result.savedMemories).toEqual([
      expect.objectContaining({
        sourceKind: "agent-tool",
        content: "用户偏好先给结论再补细节。",
      }),
    ]);
  });
});
