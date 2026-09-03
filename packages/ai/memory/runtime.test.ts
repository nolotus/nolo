import { beforeEach, describe, expect, it } from "bun:test";
import { MemoryDB } from "database-engine/MemoryDB";
import { createMemoryItem, writeMemoryItemWithIndexesToDb } from "./storeShared";
import { resolveMemoryRuntime } from "./runtime";
import type { MemoryItem } from "./types";

const db = new MemoryDB();

const writeItem = (partial: Partial<MemoryItem> & { id: string; content: string }) =>
  writeMemoryItemWithIndexesToDb(
    db,
    createMemoryItem({
      ownerType: "user",
      ownerId: "user1",
      visibility: "private",
      subjectType: "user",
      subjectId: "user1",
      kind: "episodic",
      importance: 0.9,
      confidence: 0.9,
      ...partial,
    } as any)
  );

describe("memory runtime", () => {
  beforeEach(() => {
    db.clear();
  });

  it("includes semantic memory in runtime overlay", async () => {
    await writeItem({
      id: "m1",
      kind: "episodic",
      content: "用户明确说过不喜欢被说教",
      patternKey: "explicit-remember",
    });
    await writeItem({
      id: "m2",
      kind: "semantic",
      content: "我不喜欢被说教",
      importance: 0.92,
      confidence: 0.72,
      activationCount: 2,
      patternKey: "semantic-explicit:我不喜欢被说教",
    });

    const result = await resolveMemoryRuntime({
      db,
      userId: "user1",
      agentKey: "agent-a",
      userInput: "你以后不要太说教",
    });

    expect(result.selectedItems.some((item: any) => item.kind === "semantic")).toBe(true);
    expect(result.promptBlock).toContain("[Semantic]");
    expect(result.promptBlock).toContain("我不喜欢被说教");
    expect(result.promptBlock).toContain("用户输入优先");
  });

  it("keeps a relevant space memory when user memories would crowd the overlay", async () => {
    await writeItem({
      id: "u1",
      content: "用户偏好先给结论",
    });
    await writeItem({
      id: "u2",
      content: "用户偏好青柠色",
    });
    await writeItem({
      id: "s1",
      ownerType: "space",
      ownerId: "space1",
      visibility: "shared",
      subjectType: "space",
      subjectId: "space1",
      content: "空间长期规则：记忆系统优化必须先给真实数据和测试证据",
    });

    const result = await resolveMemoryRuntime({
      db,
      userId: "user1",
      spaceId: "space1",
      agentKey: "agent-a",
      userInput: "记忆系统优化要看什么证据",
    });

    expect(result.selectedItems.some((item: any) => item.ownerType === "space")).toBe(true);
    expect(result.promptBlock).toContain("真实数据和测试证据");
  });

  it("selects current space/project memory for ambiguous continuation before stale user-global memory", async () => {
    await writeItem({
      id: "user-beta",
      subjectType: "project",
      subjectId: "project-beta",
      kind: "semantic",
      content: "Beta 项目上次本地服务端口是 8080，用户说跟上次一样时沿用 8080。",
      importance: 0.98,
      confidence: 0.98,
      activationCount: 20,
    });
    await writeItem({
      id: "space-alpha",
      ownerType: "space",
      ownerId: "space-alpha",
      visibility: "shared",
      subjectType: "project",
      subjectId: "project-alpha",
      kind: "semantic",
      content: "Alpha 项目上次本地服务端口是 3001，用户说跟上次一样时沿用 3001。",
      createdAt: "2026-06-04T00:00:00.000Z",
      importance: 0.7,
      confidence: 0.7,
      activationCount: 0,
    });

    const result = await resolveMemoryRuntime({
      db,
      userId: "user1",
      spaceId: "space-alpha",
      agentKey: "agent-a",
      userInput: "这个项目跟上次一样启动",
    });

    expect(result.selectedItems[0]?.id).toBe("space-alpha");
    expect(result.promptBlock).toContain("3001");
    expect(result.promptBlock).not.toContain("8080");
  });

  it("does not carry stale stack preferences when current input names a different stack", async () => {
    await writeItem({
      id: "old-stack",
      kind: "semantic",
      content: "用户长期偏好：新后端项目默认使用 TypeScript。",
      importance: 0.98,
      confidence: 0.98,
      activationCount: 20,
    });
    await writeItem({
      id: "answer-shape",
      kind: "semantic",
      content: "用户偏好：技术方案先给结论，再列风险和证据。",
      createdAt: "2026-06-02T00:00:00.000Z",
      importance: 0.8,
      confidence: 0.8,
      activationCount: 1,
    });

    const result = await resolveMemoryRuntime({
      db,
      userId: "user1",
      agentKey: "agent-a",
      userInput: "帮我写一个 Python FastAPI 服务",
    });

    expect(result.promptBlock ?? "").not.toContain("TypeScript");
  });

  it("keeps answer-shape preferences across unrelated technical topics", async () => {
    await writeItem({
      id: "ts-pref",
      kind: "semantic",
      content: "用户长期偏好：新后端项目默认使用 TypeScript。",
      importance: 0.98,
      confidence: 0.98,
      activationCount: 20,
    });
    await writeItem({
      id: "answer-shape",
      kind: "semantic",
      facet: "style",
      content: "用户偏好：技术方案先给结论，再列风险和证据。",
      createdAt: "2026-06-02T00:00:00.000Z",
      importance: 0.8,
      confidence: 0.8,
      activationCount: 1,
    });

    const result = await resolveMemoryRuntime({
      db,
      userId: "user1",
      agentKey: "agent-a",
      userInput: "数据库索引怎么设计比较好？",
    });

    expect(result.promptBlock ?? "").toContain("先给结论");
  });

  it("keeps a procedural runbook in the runtime overlay", async () => {
    await writeItem({
      id: "proc1",
      kind: "procedural",
      content:
        '记忆召回排查 runbook：1. 检查 selectedItems 是否为空；2. 检查 ranking 是否过滤了目标记忆；3. 检查 system messages 是否包含 "[Memory Overlay]"。',
      importance: 0.9,
      confidence: 0.9,
    });

    const result = await resolveMemoryRuntime({
      db,
      userId: "user1",
      spaceId: "space1",
      agentKey: "agent1",
      userInput: "memory recall 连续失败时按什么 runbook 排查 selectedItems ranking system messages",
    });

    expect(result.selectedItems.some((item: any) => item.kind === "procedural")).toBe(true);
    expect(result.promptBlock).toContain("[Procedural]");
    expect(result.promptBlock).toContain("selectedItems");
  });

  it("does not query user-global fallback for public agent memory runtime", async () => {
    // Public agent (agent-pub-*) with spaceId: when agent-specific memories
    // exist (subject query hits), owner fallback should NOT trigger, so
    // user-global memories should not appear.
    await writeItem({
      id: "agent-specific",
      ownerType: "space",
      ownerId: "space1",
      visibility: "shared",
      subjectType: "agent",
      subjectId: "agent-pub-01NIHAISHATCMMVP000001",
      kind: "semantic",
      content: "方剂补肾血的 agent 专属记忆",
      importance: 0.9,
      confidence: 0.9,
    });
    await writeItem({
      id: "user-global",
      kind: "semantic",
      content: "方剂补肾血的用户全局记忆",
      importance: 0.95,
      confidence: 0.95,
    });

    const result = await resolveMemoryRuntime({
      db,
      userId: "user1",
      spaceId: "space1",
      agentKey: "agent-pub-01NIHAISHATCMMVP000001",
      memorySubjectId: "agent-pub-01NIHAISHATCMMVP000001",
      userInput: "方剂有哪些补肾血的",
    });

    // Agent-specific memory should be found.
    expect(result.selectedItems.some((item: any) => item.id === "agent-specific")).toBe(true);
    // User-global memory should NOT appear (no owner fallback when subject hits).
    expect(result.selectedItems.some((item: any) => item.id === "user-global")).toBe(false);
  });

  it("freezes cold-storage memories out of the runtime overlay", async () => {
    await writeItem({
      id: "cold",
      kind: "semantic",
      content: "低置信度记忆不应该被召回",
      importance: 0.9,
      confidence: 0.1,
    });

    const result = await resolveMemoryRuntime({
      db,
      userId: "user1",
      spaceId: "space1",
      agentKey: "agent1",
      userInput: "低置信度记忆不应该被召回",
    });

    expect(result.selectedItems.some((item: any) => item.id === "cold")).toBe(false);
  });

  it("applies token budget to overlay output", async () => {
    // 写入多条长内容 episodic 记忆，使默认 800 token 预算真正触发截断
    const longContent =
      "这是一段非常长的记忆内容用于测试注入预算截断机制是否生效".repeat(3);
    for (let i = 0; i < 6; i++) {
      await writeItem({
        id: `budget-ep-${i}`,
        kind: "episodic",
        content: `${longContent}编号${i}`,
        patternKey: `budget-test-${i}`,
      });
    }
    // semantic 记忆与用户输入相关，会被 select 进来且 kind 优先级最高
    await writeItem({
      id: "budget-sem",
      kind: "semantic",
      content: "预算截断测试相关的语义记忆应该优先保留",
      importance: 0.95,
      confidence: 0.85,
      activationCount: 3,
    });

    const result = await resolveMemoryRuntime({
      db,
      userId: "user1",
      agentKey: "agent-a",
      userInput: "预算截断测试",
    });

    // semantic 应该被保留（kind 优先级最高）
    expect(result.promptBlock).toContain("预算截断测试相关的语义记忆应该优先保留");
    // 预算截断生效：不是所有 episodic 都能进 overlay
    // selectRuntimeMemoryItems 最多选 4 条，overlay 预算进一步截断
    // 确认输出在合理范围内（不会无限膨胀）
    expect(result.promptBlock!.length).toBeLessThan(2000);
  });
});
