import { describe, expect, it } from "bun:test";
import { MemoryDB } from "database-engine/MemoryDB";
import { createDialogKey } from "database/keys";
import {
  resolveRecentRelationshipRecap,
  mergeGreetingWithRelationshipRecap,
  shouldUseRecentRelationshipRecap,
} from "./recentRelationshipRecap";

describe("recentRelationshipRecap", () => {
  it("only enables recap for single-agent user-created fresh dialogs", () => {
    expect(
      shouldUseRecentRelationshipRecap({
        userId: "user1",
        agentKey: "agent-a",
        agentsCount: 1,
        triggerType: "user",
      })
    ).toBe(true);

    expect(
      shouldUseRecentRelationshipRecap({
        userId: "user1",
        agentKey: "agent-a",
        agentsCount: 2,
        triggerType: "user",
      })
    ).toBe(false);

    expect(
      shouldUseRecentRelationshipRecap({
        userId: "user1",
        agentKey: "agent-a",
        agentsCount: 1,
        inheritFromDialogKey: "dialog-user1-old",
        triggerType: "user",
      })
    ).toBe(false);

    expect(
      shouldUseRecentRelationshipRecap({
        userId: "user1",
        agentKey: "agent-pub-01NIHAISHATCMMVP000001",
        agentsCount: 1,
        triggerType: "user",
      })
    ).toBe(false);

    expect(
      shouldUseRecentRelationshipRecap({
        userId: "user1",
        agentKey: "agent-a",
        agentsCount: 1,
        triggerType: "scheduled_run",
      })
    ).toBe(false);
  });

  it("prefers recent summary from the same agent", async () => {
    const db = new MemoryDB();
    await db.put(createDialogKey("user-1").replace(/01.*/, "older"), {
      dbKey: "dialog-user-1-older",
      cybots: ["agent-a"],
      summary: "更早的一次总结",
      updatedAt: "2026-04-01T00:00:00.000Z",
    });
    await db.put(createDialogKey("user-1").replace(/01.*/, "newer"), {
      dbKey: "dialog-user-1-newer",
      cybots: ["agent-a"],
      summary: "最近一次我们主要聊了长期记忆和回声室问题。",
      updatedAt: "2026-04-10T00:00:00.000Z",
    });

    const resolution = await resolveRecentRelationshipRecap({
      db,
      userId: "user-1",
      agentKey: "agent-a",
    });

    expect(resolution.reason).toBe("selected");
    expect(resolution.recap).toContain("长期记忆和回声室");
  });

  it("keeps the base greeting when the recap is just a plain summary", () => {
    const text = mergeGreetingWithRelationshipRecap({
      greetingText: "你好，我是你的长期陪伴助手。",
      recentRecap: "你不希望我只是附和你。",
    });

    expect(text).toBe("你好，我是你的长期陪伴助手。");
    expect(text).not.toContain("我记得你上次在聊");
    expect(text).not.toContain("你不希望我只是附和你。");
    expect(text).not.toContain("上次我们主要聊到");
  });

  it("uses a continuation-oriented template when the recap feels unfinished", () => {
    const text = mergeGreetingWithRelationshipRecap({
      greetingText: "你好，我是你的长期陪伴助手。",
      recentRecap: "你还在纠结接下来到底该先做产品还是先做内容。",
    });

    expect(text).toContain("我记得你上次在聊");
    expect(text).toContain("你还在纠结接下来到底该先做产品还是先做内容。");
    expect(text).toContain("如果你还想接着那个点继续");
    expect(text).toContain("换个方向也可以");
  });

  it("skips very recent dialogs to avoid repetitive recap", async () => {
    const db = new MemoryDB();
    await db.put(createDialogKey("user-1").replace(/01.*/, "recent"), {
      dbKey: "dialog-user-1-recent",
      cybots: ["agent-a"],
      summary: "这是一个足够长、但刚刚发生的最近总结。",
      updatedAt: new Date().toISOString(),
    });

    const resolution = await resolveRecentRelationshipRecap({
      db,
      userId: "user-1",
      agentKey: "agent-a",
    });

    expect(resolution.recap).toBeNull();
    expect(resolution.reason).toBe("too-recent");
  });

  it("skips low-quality titles or summaries", async () => {
    const db = new MemoryDB();
    await db.put(createDialogKey("user-1").replace(/01.*/, "bad"), {
      dbKey: "dialog-user-1-bad",
      cybots: ["agent-a"],
      title: "04-16 12:30",
      updatedAt: "2026-04-10T00:00:00.000Z",
    });

    const resolution = await resolveRecentRelationshipRecap({
      db,
      userId: "user-1",
      agentKey: "agent-a",
    });

    expect(resolution.recap).toBeNull();
    expect(resolution.reason).toBe("low-quality");
  });

  it("falls back to the last assistant message when summary is missing", async () => {
    const db = new MemoryDB();
    const dialogKey = "dialog-user1-01DIALOGRECENT0000000000000001";
    await db.put(dialogKey, {
      dbKey: dialogKey,
      cybots: ["agent-a"],
      title: "继续",
      updatedAt: "2026-04-10T00:00:00.000Z",
    });
    await db.put("dialog-01DIALOGRECENT0000000000000001-msg-01MSG1", {
      dbKey: "dialog-01DIALOGRECENT0000000000000001-msg-01MSG1",
      role: "assistant",
      content: "我们上次已经收敛到先做记忆可观察性，再决定要不要上 semantic consolidation。",
    });

    const resolution = await resolveRecentRelationshipRecap({
      db,
      userId: "user1",
      agentKey: "agent-a",
    });

    expect(resolution.reason).toBe("selected");
    expect(resolution.recap).toContain("记忆可观察性");
  });
});
