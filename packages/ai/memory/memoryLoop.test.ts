/**
 * 多轮记忆链路集成测试
 *
 * 对照 docs/记忆架构.md §9.4 的四个 Story + docs/记忆架构-进化思考.md §3 的
 * "聪明 vs 自以为是"判别标准。
 *
 * 这些测试把写入侧（captureCompletedMemoryTurn）和召回侧（resolveMemoryRuntime）
 * 串成完整的多轮链路：Round 1 写入 → Round 2 召回 → 验证 promptBlock 含记忆内容。
 * 之前的单元测试只测了各自的一半，没有测跨轮链路。
 *
 * 测试用 MemoryDB（内存 mock）做真实读写，不用 mock 替换 loadMemoryCandidates——
 * 这样能验证"写入→保存→读取→排序→注入"的完整链路。
 */

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { MemoryDB } from "database-engine/MemoryDB";

import { captureCompletedMemoryTurn } from "./completedTurn";
import { loadMemoryCandidatesFromDb } from "./queryShared";
import type { MemoryItem } from "./types";

let moduleVersion = 0;
const testDb = new MemoryDB();

/**
 * Load resolveMemoryRuntime directly — no mocking needed.
 * runtime.ts now accepts a `db` parameter, so passing testDb makes the
 * real loadMemoryCandidatesFromDb / touchMemoryItemsInDb operate on our
 * in-memory database. This tests the full write→read→rank→inject chain.
 */
async function loadRuntimeWithDb() {
  const mod = await import(`./runtime`);
  return mod;
}

describe("多轮记忆链路集成测试（§9.4 用户故事 + §3 聪明 vs 自以为是）", () => {
  beforeEach(() => {
    testDb.clear();
  });

  afterEach(() => {
    mock.restore();
  });

  // ===========================================================================
  // Story A — Space 级协作共识：Round 1 写入 → Round 2 召回
  // ===========================================================================
  describe("Story A: Space 协作共识跨轮召回", () => {
    it("Round 1 写入 space 共识 → Round 2 召回到 promptBlock", async () => {
      // Round 1: 用户明确说"记住"，scope=space（本仓库提交信息用英文）
      await captureCompletedMemoryTurn({
        db: testDb,
        userId: "user1",
        spaceId: "space-1",
        agentKey: "agent-a",
        dialogId: "dialog-1",
        userInput: "记住，这个 space 的提交信息必须用英文，且包含 scope 前缀。",
        trace: [{ role: "assistant", content: "已记住。" }],
      });

      // 验证写入了
      const items = await loadMemoryCandidatesFromDb(testDb, {
        owners: [{ ownerType: "user", ownerId: "user1" }],
        subjects: [{ subjectType: "user", subjectId: "user1" }],
        kinds: ["episodic"],
        ownerLimit: 20,
      });
      expect(items.length).toBeGreaterThan(0);
      expect(items.some((i) => i.content.includes("英文"))).toBe(true);

      // Round 2: 召回——用相关 query 触发召回
      const { resolveMemoryRuntime } = await loadRuntimeWithDb();
      const result = await resolveMemoryRuntime({
        db: testDb,
        userId: "user1",
        spaceId: "space-1",
        agentKey: "agent-a",
        userInput: "帮我写个提交信息",
      });

      // 验证 promptBlock 含记忆内容
      expect(result.selectedItems.length).toBeGreaterThan(0);
      expect(result.promptBlock).toContain("英文");
    });
  });

  // ===========================================================================
  // Story B — 特定 Agent 经验：subject=agent 跨轮召回
  // ===========================================================================
  describe("Story B: 特定 Agent 经验跨轮召回", () => {
    it("Round 1 understanding memory subject=agent → Round 2 同 agent 召回", async () => {
      // Round 1: understanding memory（inferred）写到 subject=agent
      // 用"更在意"句式触发 understanding memory 提取
      await captureCompletedMemoryTurn({
        db: testDb,
        userId: "user1",
        spaceId: "space-1",
        agentKey: "agent-frontend",
        dialogId: "dialog-1",
        userInput: "你在这个项目里更在意先读 package.json 确认框架版本。",
        trace: [{ role: "assistant", content: "明白，你更在意先读 package.json 确认版本。" }],
        // understanding 抽取走 LLM；stub 出一条 preference 候选。
        llmCall: async () =>
          JSON.stringify([
            { facet: "preference", content: "更在意先读 package.json 确认框架版本" },
          ]),
      });

      // 验证 understanding memory 写到了 subject=agent
      const agentItems = await loadMemoryCandidatesFromDb(testDb, {
        owners: [{ ownerType: "user", ownerId: "user1" }],
        subjects: [{ subjectType: "agent", subjectId: "agent-frontend" }],
        kinds: ["episodic"],
        ownerLimit: 20,
      });
      expect(agentItems.length).toBeGreaterThan(0);
      expect(agentItems.some((i) => i.tags?.includes("understanding-memory"))).toBe(true);

      // Round 2: 同一个 agent 召回
      const { resolveMemoryRuntime } = await loadRuntimeWithDb();
      const result = await resolveMemoryRuntime({
        db: testDb,
        userId: "user1",
        spaceId: "space-1",
        agentKey: "agent-frontend",
        userInput: "帮我改前端代码",
      });

      // 验证召回含 agent 经验
      expect(result.selectedItems.length).toBeGreaterThan(0);
    });

    it("Round 1 agent 经验 → Round 2 换 agent 不召回前一个的经验", async () => {
      // Round 1: agent-frontend 的经验
      await captureCompletedMemoryTurn({
        db: testDb,
        userId: "user1",
        agentKey: "agent-frontend",
        dialogId: "dialog-1",
        userInput: "你在这个项目里更在意先读 package.json 确认框架版本。",
        trace: [{ role: "assistant", content: "明白。" }],
      });

      // Round 2: 换 agent-backend 召回——不该看到 agent-frontend 的经验
      const { resolveMemoryRuntime } = await loadRuntimeWithDb();
      const result = await resolveMemoryRuntime({
        db: testDb,
        userId: "user1",
        agentKey: "agent-backend",
        userInput: "帮我改后端代码",
      });

      // agent-backend 的召回结果里不该有 package.json 相关内容
      const frontendExp = result.selectedItems.find((i: any) =>
        i.content?.includes("package.json"),
      );
      expect(frontendExp).toBeUndefined();
    });
  });

  // ===========================================================================
  // Story C — 用户身份/全局偏好：所有 agent 都能召回
  // ===========================================================================
  describe("Story C: 用户身份跨 agent 召回", () => {
    it("Round 1 写入用户身份 → Round 2 不同 agent 都能召回", async () => {
      // Round 1: 用户明确说身份
      await captureCompletedMemoryTurn({
        db: testDb,
        userId: "user1",
        agentKey: "agent-a",
        dialogId: "dialog-1",
        userInput: "请记住，我是这个项目的 owner，我叫 nolotus。",
        trace: [{ role: "assistant", content: "已记住。" }],
      });

      // Round 2: 换 agent-b 也能召回用户身份
      const { resolveMemoryRuntime } = await loadRuntimeWithDb();
      const result = await resolveMemoryRuntime({
        db: testDb,
        userId: "user1",
        agentKey: "agent-b",
        userInput: "我是谁？",
      });

      expect(result.selectedItems.length).toBeGreaterThan(0);
      expect(result.promptBlock).toContain("nolotus");
    });
  });

  // ===========================================================================
  // Story D — 临时进度：不该写入持久记忆
  // ===========================================================================
  describe("Story D: 临时进度不写入持久记忆", () => {
    it("Round 1 讨论当前任务进度 → 不产生 explicit memory", async () => {
      const result = await captureCompletedMemoryTurn({
        db: testDb,
        userId: "user1",
        agentKey: "agent-a",
        dialogId: "dialog-1",
        userInput: "我这次改到 src/auth/login.ts 第 47 行了，接下来要改 token 校验。",
        trace: [{ role: "assistant", content: "好的，接下来改 token 校验。" }],
      });

      // 不该有 explicit-user-directive（用户没有说"记住"）
      const explicitEvents = result.savedMemories.filter(
        (m) => m.sourceKind === "explicit-user-directive",
      );
      expect(explicitEvents).toHaveLength(0);
    });
  });

  // ===========================================================================
  // §3 聪明 vs 自以为是 — 纠正→降权→下一轮不再召回
  // ===========================================================================
  describe("纠正→降权→下一轮不再召回（§3 聪明记忆）", () => {
    it("Round 1 写入偏好 → Round 2 用户纠正 → Round 3 旧偏好已降权不在顶部", async () => {
      // Round 1: 写入"用户怕交付延期"
      await captureCompletedMemoryTurn({
        db: testDb,
        userId: "user1",
        agentKey: "agent-a",
        dialogId: "dialog-1",
        userInput: "请记住，我最怕交付延期。",
        trace: [{ role: "assistant", content: "已记住。" }],
      });

      // 模拟 Round 1 的记忆被召回激活（touch lastActivatedAt + activationCount）
      const items = await loadMemoryCandidatesFromDb(testDb, {
        owners: [{ ownerType: "user", ownerId: "user1" }],
        subjects: [{ subjectType: "user", subjectId: "user1" }],
        kinds: ["episodic"],
        ownerLimit: 20,
      });
      const target = items.find((i) => i.content.includes("交付延期"));
      expect(target).toBeDefined();

      // 手动 touch 模拟 Round 1 召回激活
      const { writeMemoryItemWithIndexesToDb } = await import("./store");
      await writeMemoryItemWithIndexesToDb(testDb, {
        ...target!,
        lastActivatedAt: new Date().toISOString(),
        activationCount: 1,
      });

      // Round 2: 用户纠正
      const correctionResult = await captureCompletedMemoryTurn({
        db: testDb,
        userId: "user1",
        agentKey: "agent-a",
        dialogId: "dialog-2",
        userInput: "你记错了，我说的不是怕交付延期，我是怕质量不达标。",
        trace: [{ role: "assistant", content: "抱歉记错了。" }],
      });

      // 纠正不应产生新的 explicit memory（"记错了"不是"记住"指令）
      const explicitInCorrection = correctionResult.savedMemories.filter(
        (m) => m.sourceKind === "explicit-user-directive",
      );
      expect(explicitInCorrection).toHaveLength(0);

      // 验证旧记忆 confidence 已降
      const updatedItems = await loadMemoryCandidatesFromDb(testDb, {
        owners: [{ ownerType: "user", ownerId: "user1" }],
        subjects: [{ subjectType: "user", subjectId: "user1" }],
        kinds: ["episodic"],
        ownerLimit: 20,
      });
      const corrected = updatedItems.find((i) => i.content.includes("交付延期"));
      expect(corrected).toBeDefined();
      expect(corrected!.confidence).toBeLessThan(target!.confidence);

      // Round 3: 召回——旧"怕交付延期"不在顶部或不在选中结果里
      const { resolveMemoryRuntime } = await loadRuntimeWithDb();
      const result = await resolveMemoryRuntime({
        db: testDb,
        userId: "user1",
        agentKey: "agent-a",
        userInput: "我最担心什么？",
      });

      // 旧记忆如果还在 selectedItems 里，confidence 应该已经降低
      // 如果低于 COLD_STORAGE_CONFIDENCE (0.3)，应该完全不在
      const oldInResults = result.selectedItems.find(
        (i: any) => i.content?.includes("交付延期"),
      );
      if (oldInResults) {
        // 如果还在，confidence 必须已降
        expect(oldInResults.confidence).toBeLessThan(target!.confidence);
      }
      // 如果不在，说明已被冷藏——这正是"聪明记忆"的预期行为
    });
  });

  // ===========================================================================
  // §3 聪明 vs 自以为是 — 低置信推测不改变默认行为
  // ===========================================================================
  describe("低置信推测不污染召回（§3.2 自以为是防线）", () => {
    it("agent 推测的 understanding memory 不出现在显式记忆的可见事件里", async () => {
      const result = await captureCompletedMemoryTurn({
        db: testDb,
        userId: "user1",
        agentKey: "agent-a",
        dialogId: "dialog-1",
        userInput: "我更怕第一封把用户吓跑。",
        trace: [{ role: "assistant", content: "明白，你更在意信任感。" }],
      });

      // understanding memory 是 inferred，不该出现在 visible savedMemories 里
      const understandingEvents = result.savedMemories.filter(
        (m) => m.sourceKind === "inferred-understanding",
      );
      expect(understandingEvents).toHaveLength(0);
    });
  });

  // ===========================================================================
  // agentKey 注入链路（上一轮修的 utilityServerTools 改动）
  // ===========================================================================
  describe("agentKey 自动注入（Story B runtime 链路）", () => {
    it("captureCompletedMemoryTurn 带 agentKey → understanding memory subject=agent", async () => {
      await captureCompletedMemoryTurn({
        db: testDb,
        userId: "user1",
        agentKey: "agent-frontend-xxx",
        dialogId: "dialog-1",
        userInput: "你更在意先读 package.json 确认版本再动手。",
        trace: [{ role: "assistant", content: "明白，你更在意先读 package.json。" }],
        llmCall: async () =>
          JSON.stringify([
            { facet: "preference", content: "更在意先读 package.json 确认版本再动手" },
          ]),
      });

      const agentItems = await loadMemoryCandidatesFromDb(testDb, {
        owners: [{ ownerType: "user", ownerId: "user1" }],
        subjects: [{ subjectType: "agent", subjectId: "agent-frontend-xxx" }],
        kinds: ["episodic"],
        ownerLimit: 20,
      });

      expect(agentItems.length).toBeGreaterThan(0);
      expect(agentItems.every((i) => i.subjectType === "agent")).toBe(true);
      expect(agentItems.every((i) => i.subjectId === "agent-frontend-xxx")).toBe(true);
    });
  });
});