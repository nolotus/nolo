import { beforeEach, describe, expect, it } from "bun:test";
import { MemoryDB } from "database-engine/MemoryDB";
import {
  captureExplicitMemoryEpisode,
  shouldCaptureExplicitMemory,
} from "./capture";
import { loadMemoryCandidatesFromDb } from "./query";

describe("shouldCaptureExplicitMemory", () => {
  it("captures explicit remember requests", () => {
    expect(shouldCaptureExplicitMemory("这个你要记住，我不喜欢被说教")).toBe(true);
    expect(shouldCaptureExplicitMemory("请记住这件事")).toBe(true);
  });

  it("ignores normal text and incidental uses of remember", () => {
    expect(shouldCaptureExplicitMemory("我今天有点累")).toBe(false);
    expect(shouldCaptureExplicitMemory("我终于记住这个密码了")).toBe(false);
  });
});

describe("captureExplicitMemoryEpisode", () => {
  const db = new MemoryDB();

  beforeEach(() => {
    db.clear();
  });

  it("captures explicit remembers to the user bucket without fanout into space memory", async () => {
    await captureExplicitMemoryEpisode({
      db,
      userId: "user1",
      spaceId: "space1",
      agentKey: "agent-a",
      dialogId: "dialog-1",
      userInput: "请记住，我不喜欢被说教。",
    });

    const userItems = await loadMemoryCandidatesFromDb(db, {
      owners: [{ ownerType: "user", ownerId: "user1" }],
      subjects: [{ subjectType: "user", subjectId: "user1" }],
      ownerLimit: 20,
    });
    const spaceItems = await loadMemoryCandidatesFromDb(db, {
      owners: [{ ownerType: "space", ownerId: "space1" }],
      subjects: [{ subjectType: "space", subjectId: "space1" }],
      ownerLimit: 20,
    });

    expect(userItems).toHaveLength(1);
    expect(userItems[0]?.ownerType).toBe("user");
    expect(spaceItems).toHaveLength(0);
  });

  it("falls back to shared space memory when no user scope exists", async () => {
    await captureExplicitMemoryEpisode({
      db,
      spaceId: "space1",
      agentKey: "agent-a",
      dialogId: "dialog-1",
      userInput: "记住，这个 space 以后默认先给根因链路分析。",
    });

    const spaceItems = await loadMemoryCandidatesFromDb(db, {
      owners: [{ ownerType: "space", ownerId: "space1" }],
      subjects: [{ subjectType: "space", subjectId: "space1" }],
      ownerLimit: 20,
    });

    expect(spaceItems).toHaveLength(1);
    expect(spaceItems[0]?.ownerType).toBe("space");
    expect(spaceItems[0]?.visibility).toBe("shared");
  });

  it("keeps repeated explicit remembers as episodic before post-dialog consolidation", async () => {
    await captureExplicitMemoryEpisode({
      db,
      userId: "user1",
      agentKey: "agent-a",
      dialogId: "dialog-1",
      userInput: "请记住，我不喜欢被说教。",
    });
    await captureExplicitMemoryEpisode({
      db,
      userId: "user1",
      agentKey: "agent-a",
      dialogId: "dialog-2",
      userInput: "记住，我不喜欢被说教。",
    });

    const userItems = await loadMemoryCandidatesFromDb(db, {
      owners: [{ ownerType: "user", ownerId: "user1" }],
      subjects: [{ subjectType: "user", subjectId: "user1" }],
      ownerLimit: 20,
    });

    expect(userItems.filter((item) => item.kind === "episodic")).toHaveLength(2);
    expect(userItems.some((item) => item.kind === "semantic")).toBe(false);
  });
});
