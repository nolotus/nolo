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

  it("writes procedural memories from LLM extraction", async () => {
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
    expect(saved[0].kind).toBe("procedural");
    expect(saved[0].confidence).toBe(0.5);
    expect(saved[0].sourceKind).toBe("dialog-learning");
    expect(saved[0].tags).toContain("dialog-learning");
    expect(saved[0].tags).toContain("dialog-learning:error_resolution");
    expect(saved[0].sourceDialogId).toBe("dialog-1");
  });

  it("upgrades to semantic when same pattern found in different dialog", async () => {
    // First dialog — write procedural
    const llmCall = async () =>
      JSON.stringify([
        { pattern: "workaround", content: "DeepSeek 不支持 JSON mode，用 prompt 约束输出" },
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

    // Second dialog — same pattern, different dialog → should upgrade to semantic
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
    expect(saved2[0].kind).toBe("semantic");
    expect(saved2[0].confidence).toBeGreaterThan(0.5);
    expect(saved2[0].tags).toContain("consolidated-dialog-learning");
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

    // First call writes procedural
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
      kinds: ["procedural", "semantic"],
      ownerLimit: 100,
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0].kind).toBe("procedural");
    expect(candidates[0].content).toBe("每次部署前先跑测试再跑构建");
    expect(candidates[0].sourceKind).toBe("dialog-learning");
  });
});