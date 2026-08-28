import { describe, expect, it } from "bun:test";
import { buildMemoryOverlay } from "./overlay";
import type { MemoryItem } from "./types";

const makeItem = (overrides: Partial<MemoryItem> & { content: string; kind: MemoryItem["kind"] }): MemoryItem => ({
  id: `m-${overrides.content.slice(0, 6)}`,
  ownerType: "user",
  ownerId: "user1",
  visibility: "private",
  subjectType: "user",
  subjectId: "user1",
  createdAt: "2026-01-01T00:00:00Z",
  lastActivatedAt: "2026-01-01T00:00:00Z",
  activationCount: 1,
  importance: 0.8,
  confidence: 0.8,
  ...overrides,
});

describe("buildMemoryOverlay - token budget", () => {
  it("returns null for empty items", () => {
    expect(buildMemoryOverlay([])).toBeNull();
  });

  it("includes all items when within budget", () => {
    const items = [
      makeItem({ content: "用户喜欢先看结论", kind: "semantic" }),
      makeItem({ content: "上次用了 TypeScript", kind: "episodic" }),
    ];
    const overlay = buildMemoryOverlay(items, { maxTokens: 800 });
    expect(overlay).toContain("[Semantic]");
    expect(overlay).toContain("[Episodic]");
    expect(overlay).toContain("用户喜欢先看结论");
  });

  it("truncates episodic before semantic when budget is tight", () => {
    // 极小预算：只够头部 + 1 条 semantic（header 压缩后约 22 tokens）
    const items = [
      makeItem({ content: "用户偏好先看结论", kind: "semantic" }),
      makeItem({ content: "这是一条很长的过程性记忆记录", kind: "procedural" }),
      makeItem({ content: "上次聊了天气很好", kind: "episodic" }),
    ];
    const overlay = buildMemoryOverlay(items, { maxTokens: 40 });
    expect(overlay).toContain("[Semantic]");
    expect(overlay).not.toContain("[Episodic]");
  });

  it("returns header-only when budget is too small for any line", () => {
    const items = [
      makeItem({ content: "用户偏好先看结论", kind: "semantic" }),
    ];
    const overlay = buildMemoryOverlay(items, { maxTokens: 30 });
    // 预算太小，连一条都放不下——只返回头部
    expect(overlay).toContain("Memory");
    expect(overlay).not.toContain("[Semantic]");
  });

  it("respects perKindLimit", () => {
    const items = [
      makeItem({ content: "第一条语义记忆", kind: "semantic" }),
      makeItem({ content: "第二条语义记忆", kind: "semantic" }),
      makeItem({ content: "第三条语义记忆", kind: "semantic" }),
      makeItem({ content: "第四条语义记忆", kind: "semantic" }),
    ];
    const overlay = buildMemoryOverlay(items, { perKindLimit: 2 });
    expect(overlay).toContain("第一条语义记忆");
    expect(overlay).toContain("第二条语义记忆");
    expect(overlay).not.toContain("第四条语义记忆");
  });

  it("preserves header text for backward compatibility", () => {
    const items = [makeItem({ content: "测试记忆", kind: "semantic" })];
    const overlay = buildMemoryOverlay(items);
    expect(overlay).toContain("Memory");
    expect(overlay).toContain("用户输入优先");
  });

  it("section order: semantic before procedural before episodic", () => {
    const items = [
      makeItem({ content: "事件记忆", kind: "episodic" }),
      makeItem({ content: "过程记忆", kind: "procedural" }),
      makeItem({ content: "语义记忆", kind: "semantic" }),
    ];
    const overlay = buildMemoryOverlay(items, { maxTokens: 800 });
    const semanticIdx = overlay!.indexOf("[Semantic]");
    const proceduralIdx = overlay!.indexOf("[Procedural]");
    const episodicIdx = overlay!.indexOf("[Episodic]");
    expect(semanticIdx).toBeLessThan(proceduralIdx);
    expect(proceduralIdx).toBeLessThan(episodicIdx);
  });
});