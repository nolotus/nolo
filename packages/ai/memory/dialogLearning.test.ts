import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

import { MemoryDB } from "database-engine/MemoryDB";
import {
  parseDialogLearningResponse,
  captureDialogLearnings,
} from "./dialogLearning";
import { loadMemoryCandidatesFromDb } from "./queryShared";

const testDb = new MemoryDB();

describe("parseDialogLearningResponse", () => {
  it("parses valid JSON array with patterns", () => {
    const raw = JSON.stringify([
      { pattern: "error_resolution", content: "用 lsof 查端口占用" },
      { pattern: "workaround", content: "DeepSeek 不支持 JSON mode，用 prompt 约束" },
    ]);
    const result = parseDialogLearningResponse(raw);
    expect(result).toHaveLength(2);
    expect(result[0].pattern).toBe("error_resolution");
    expect(result[1].content).toBe("DeepSeek 不支持 JSON mode，用 prompt 约束");
  });

  it("returns empty for empty input", () => {
    expect(parseDialogLearningResponse("")).toEqual([]);
    expect(parseDialogLearningResponse("[]")).toEqual([]);
  });

  it("extracts JSON from surrounding text", () => {
    const raw = `好的，以下是提取结果：\n[{"pattern":"workaround","content":"改用 B 方案"}]\n完成。`;
    const result = parseDialogLearningResponse(raw);
    expect(result).toHaveLength(1);
    expect(result[0].pattern).toBe("workaround");
  });

  it("filters invalid patterns", () => {
    const raw = JSON.stringify([
      { pattern: "error_resolution", content: "valid" },
      { pattern: "invalid_pattern", content: "should be filtered" },
      { pattern: "workaround", content: "" },
      { pattern: "repeated_workflow", content: "valid workflow" },
    ]);
    const result = parseDialogLearningResponse(raw);
    expect(result).toHaveLength(2);
    expect(result[0].pattern).toBe("error_resolution");
    expect(result[1].pattern).toBe("repeated_workflow");
  });

  it("filters overly long content", () => {
    const longContent = "a".repeat(501);
    const raw = JSON.stringify([
      { pattern: "error_resolution", content: longContent },
      { pattern: "workaround", content: "short" },
    ]);
    const result = parseDialogLearningResponse(raw);
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe("short");
  });

  it("returns empty for malformed JSON", () => {
    expect(parseDialogLearningResponse("not json at all")).toEqual([]);
    expect(parseDialogLearningResponse("{not array}")).toEqual([]);
  });
});

describe("captureDialogLearnings", () => {
  beforeEach(() => {
    testDb.clear();
  });

  afterEach(() => {
    mock.restore();
  });

  const mockTrace = [
    { role: "user", content: "Ollama 连接超时了" },
    { role: "assistant", content: "让我检查一下端口占用情况" },
    { role: "assistant", content: "用 lsof -i :11434 查找进程并 kill 掉" },
    { role: "user", content: "好了，搞定了" },
  ] as any[];

  it("first observation is saved as episodic, never procedural directly", async () => {
    const llmCall = async () =>
      JSON.stringify([
        { pattern: "error_resolution", content: "Ollama 端口被占用时用 lsof 查找并 kill 进程" },
      ]);

    const saved = await captureDialogLearnings({
      db: testDb,
      userId: "user-1",
      spaceId: null,
      agentKey: "agent-test",
      dialogId: "dialog-1",
      trace: mockTrace,
      llmCall,
    });

    expect(saved).toHaveLength(1);
    // 单次经验只能"被记住发生过"，绝不能直接获得 procedural 身份——这是 procedural 硬门
    expect(saved[0].kind).toBe("episodic");
    expect(saved[0].confidence).toBe(0.5);
    expect(saved[0].sourceKind).toBe("dialog-learning");
    expect(saved[0].tags).toContain("dialog-learning");
    expect(saved[0].tags).toContain("dialog-learning:error_resolution");
    expect(saved[0].sourceDialogId).toBe("dialog-1");
  });

  it("upgrades the SAME pattern to procedural only on a second independent dialog", async () => {
    // First dialog — 单次观察，episodic
    const llmCall = async () =>
      JSON.stringify([
        { pattern: "workaround", content: "DeepSeek 不支持 JSON mode，用 prompt 约束输出" },
      ]);

    const saved1 = await captureDialogLearnings({
      db: testDb,
      userId: "user-1",
      spaceId: null,
      agentKey: "agent-test",
      dialogId: "dialog-1",
      trace: mockTrace,
      llmCall,
    });
    expect(saved1).toHaveLength(1);
    expect(saved1[0].kind).toBe("episodic");

    // Second dialog — 同一 pattern 在独立 dialog 再次出现 → 升级 procedural
    const saved2 = await captureDialogLearnings({
      db: testDb,
      userId: "user-1",
      spaceId: null,
      agentKey: "agent-test",
      dialogId: "dialog-2",
      trace: mockTrace,
      llmCall,
    });

    expect(saved2).toHaveLength(1);
    expect(saved2[0].kind).toBe("procedural");
    // 第二条独立 dialog 的出现本身就是 recurrence evidence
    expect(saved2[0].recurrenceEvidence).toContain("dialog-1");
    expect(saved2[0].recurrenceEvidence).toContain("dialog-2");
    expect(saved2[0].confidence).toBeGreaterThan(0.5);
    expect(saved2[0].tags).toContain("corroborated-dialog-learning");
    expect(saved2[0].sourceDialogId).toBe("dialog-2");
  });

  it("skips when llmCall not provided", async () => {
    const saved = await captureDialogLearnings({
      db: testDb,
      userId: "user-1",
      spaceId: null,
      agentKey: "agent-test",
      dialogId: "dialog-1",
      trace: mockTrace,
    });
    expect(saved).toEqual([]);
  });

  it("skips when trace is empty", async () => {
    const llmCall = async () => "[]";
    const saved = await captureDialogLearnings({
      db: testDb,
      userId: "user-1",
      spaceId: null,
      agentKey: "agent-test",
      dialogId: "dialog-1",
      trace: [],
      llmCall,
    });
    expect(saved).toEqual([]);
  });

  it("returns empty when LLM returns no patterns", async () => {
    const llmCall = async () => "[]";
    const saved = await captureDialogLearnings({
      db: testDb,
      userId: "user-1",
      spaceId: null,
      agentKey: "agent-test",
      dialogId: "dialog-1",
      trace: mockTrace,
      llmCall,
    });
    expect(saved).toEqual([]);
  });

  it("handles LLM call failure gracefully", async () => {
    const llmCall = async () => {
      throw new Error("LLM unavailable");
    };
    const saved = await captureDialogLearnings({
      db: testDb,
      userId: "user-1",
      spaceId: null,
      agentKey: "agent-test",
      dialogId: "dialog-1",
      trace: mockTrace,
      llmCall,
    });
    expect(saved).toEqual([]);
  });

  it("skips duplicate from same dialog", async () => {
    const llmCall = async () =>
      JSON.stringify([
        { pattern: "error_resolution", content: "用 lsof 查端口" },
      ]);

    // First call writes episodic（第一次观察）
    await captureDialogLearnings({
      db: testDb,
      userId: "user-1",
      spaceId: null,
      agentKey: "agent-test",
      dialogId: "dialog-1",
      trace: mockTrace,
      llmCall,
    });

    // Second call same dialog — should skip
    const saved2 = await captureDialogLearnings({
      db: testDb,
      userId: "user-1",
      spaceId: null,
      agentKey: "agent-test",
      dialogId: "dialog-1",
      trace: mockTrace,
      llmCall,
    });

    expect(saved2).toEqual([]);
  });

  it("writes memories that are retrievable via loadMemoryCandidatesFromDb", async () => {
    const llmCall = async () =>
      JSON.stringify([
        { pattern: "repeated_workflow", content: "每次部署前先跑测试再跑构建" },
      ]);

    await captureDialogLearnings({
      db: testDb,
      userId: "user-1",
      spaceId: null,
      agentKey: "agent-test",
      dialogId: "dialog-1",
      trace: mockTrace,
      llmCall,
    });

    const candidates = await loadMemoryCandidatesFromDb(testDb, {
      owners: [{ ownerType: "user", ownerId: "user-1" }],
      subjects: [{ subjectType: "agent", subjectId: "agent-test" }],
      kinds: ["episodic", "procedural"],
      ownerLimit: 100,
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0].kind).toBe("episodic"); // 单次观察不入 procedural
    expect(candidates[0].content).toBe("每次部署前先跑测试再跑构建");
    expect(candidates[0].sourceKind).toBe("dialog-learning");
  });

  it("different patterns must NOT promote each other even across dialogs", async () => {
    const llm403a = async () =>
      JSON.stringify([
        { pattern: "error_resolution", content: "403 原因是 auth token 过期，重新登录" },
      ]);
    const llm403b = async () =>
      JSON.stringify([
        { pattern: "error_resolution", content: "403 原因是 rate limit，等配额窗口恢复" },
      ]);

    const saved1 = await captureDialogLearnings({
      db: testDb, userId: "user-1", spaceId: null, agentKey: "agent-test",
      dialogId: "dialog-a", trace: mockTrace, llmCall: llm403a,
    });
    expect(saved1[0]?.kind).toBe("episodic");

    const saved2 = await captureDialogLearnings({
      db: testDb, userId: "user-1", spaceId: null, agentKey: "agent-test",
      dialogId: "dialog-b", trace: mockTrace, llmCall: llm403b,
    });
    // 内容不同 → patternKey 不同 → 不得升级，两条都保持 episodic
    expect(saved2).toHaveLength(1);
    expect(saved2[0]?.kind).toBe("episodic");

    const all = await loadMemoryCandidatesFromDb(testDb, {
      owners: [{ ownerType: "user", ownerId: "user-1" }],
      subjects: [{ subjectType: "agent", subjectId: "agent-test" }],
      kinds: ["procedural"],
      ownerLimit: 100,
    });
    expect(all).toHaveLength(0);
  });

  it("regression guard: first observation must NOT become procedural directly", async () => {
    // 回退检测：若实现被撤回到"第一次写入直接 procedural"，本断言立刻失败。
    const llmCall = async () =>
      JSON.stringify([
        { pattern: "error_resolution", content: "PM2 残留进程导致端口占用" },
      ]);
    const saved = await captureDialogLearnings({
      db: testDb, userId: "user-1", spaceId: null, agentKey: "agent-test",
      dialogId: "dialog-1", trace: mockTrace, llmCall,
    });
    expect(saved[0]?.kind).not.toBe("procedural");
    expect(saved[0]?.kind).toBe("episodic");
  });

  it("regression guard: second dialog upgrades to procedural, NOT semantic", async () => {
    // 回退检测：若实现被撤回到"第二次升级 semantic"，本断言立刻失败。
    const llmCall = async () =>
      JSON.stringify([
        { pattern: "workaround", content: "用 prompt 约束 JSON 输出格式" },
      ]);
    await captureDialogLearnings({
      db: testDb, userId: "user-1", spaceId: null, agentKey: "agent-test",
      dialogId: "dialog-1", trace: mockTrace, llmCall,
    });
    const saved2 = await captureDialogLearnings({
      db: testDb, userId: "user-1", spaceId: null, agentKey: "agent-test",
      dialogId: "dialog-2", trace: mockTrace, llmCall,
    });
    expect(saved2[0]?.kind).toBe("procedural");
    expect(saved2[0]?.kind).not.toBe("semantic");
  });
});
