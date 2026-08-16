import { beforeEach, describe, expect, it } from "bun:test";
import { MemoryDB } from "database-engine/MemoryDB";
import {
  captureExplicitMemoryEpisode,
  consolidateExplicitMemoryAfterDialog,
} from "./capture";
import { loadMemoryCandidatesFromDb } from "./query";
import { __test__ } from "./consolidate";

describe("memory consolidate", () => {
  const db = new MemoryDB();

  beforeEach(async () => {
    db.clear();
  });

  it("normalizes explicit remember content", () => {
    expect(__test__.normalizeExplicitRememberContent("请记住，我不喜欢被说教。")).toBe(
      "我不喜欢被说教"
    );
  });

  it("creates semantic memory only after repeated explicit remembers", async () => {
    await captureExplicitMemoryEpisode({
      db,
      userId: "user1",
      agentKey: "agent-a",
      dialogId: "dialog-1",
      userInput: "请记住，我不喜欢被说教。",
    });
    await consolidateExplicitMemoryAfterDialog({
      db,
      userId: "user1",
      agentKey: "agent-a",
      dialogId: "dialog-1",
      userInput: "请记住，我不喜欢被说教。",
    });

    let items = await loadMemoryCandidatesFromDb(db, {
      owners: [{ ownerType: "user", ownerId: "user1" }],
      subjects: [{ subjectType: "user", subjectId: "user1" }],
      ownerLimit: 20,
    });
    expect(items.some((item) => item.kind === "semantic")).toBe(false);

    await captureExplicitMemoryEpisode({
      db,
      userId: "user1",
      agentKey: "agent-a",
      dialogId: "dialog-2",
      userInput: "记住，我不喜欢被说教。",
    });
    await consolidateExplicitMemoryAfterDialog({
      db,
      userId: "user1",
      agentKey: "agent-a",
      dialogId: "dialog-2",
      userInput: "记住，我不喜欢被说教。",
    });

    items = await loadMemoryCandidatesFromDb(db, {
      owners: [{ ownerType: "user", ownerId: "user1" }],
      subjects: [{ subjectType: "user", subjectId: "user1" }],
      ownerLimit: 20,
    });
    const semantic = items.find((item) => item.kind === "semantic");
    expect(semantic?.content).toBe("我不喜欢被说教");
  });
});
