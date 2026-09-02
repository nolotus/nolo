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
describe("buildMemoryOverlay - 来源标记与 user subject 保底", () => {
  it("推断来源（dialog-learning / understanding）标注（推断），显式与 agent-tool 不标", () => {
    const overlay = buildMemoryOverlay([
      makeItem({ content: "用户明确说的偏好", kind: "episodic", patternKey: "explicit-remember" }),
      makeItem({ content: "agent 自己判断要记的", kind: "episodic", patternKey: "agent-remember" }),
      makeItem({ content: "从对话里学到的", kind: "episodic", patternKey: "dialog-learning:style" }),
    ]);

    expect(overlay).toContain("- 用户明确说的偏好");
    expect(overlay).toContain("- agent 自己判断要记的");
    // 推断类必须可见地存疑——否则模型会把它当成用户亲口说过的
    expect(overlay).toContain("- （推断）从对话里学到的");
  });

  it("显式 sourceKind 优先于 patternKey 反推", () => {
    const overlay = buildMemoryOverlay([
      makeItem({
        content: "显式标注为推断",
        kind: "episodic",
        patternKey: "agent-remember",
        sourceKind: "inferred-understanding",
      }),
    ]);

    expect(overlay).toContain("（推断）显式标注为推断");
  });

  it("同 kind 名额已满时，为 subject=user 的记忆保留一席", () => {
    const items: MemoryItem[] = [
      makeItem({ id: "a1", content: "工程记忆一", kind: "episodic", subjectType: "agent", subjectId: "agent-1" }),
      makeItem({ id: "a2", content: "工程记忆二", kind: "episodic", subjectType: "agent", subjectId: "agent-1" }),
      makeItem({ id: "a3", content: "工程记忆三", kind: "episodic", subjectType: "agent", subjectId: "agent-1" }),
      makeItem({ id: "u1", content: "用户长期偏好", kind: "episodic", subjectType: "user", subjectId: "user1" }),
    ];

    const overlay = buildMemoryOverlay(items, { perKindLimit: 3 });

    // 排最后的工程记忆让位给用户偏好；前两条工程记忆保留
    expect(overlay).toContain("用户长期偏好");
    expect(overlay).toContain("工程记忆一");
    expect(overlay).toContain("工程记忆二");
    expect(overlay).not.toContain("工程记忆三");
  });

  it("名额内已含 user subject 时不做任何调整", () => {
    const items: MemoryItem[] = [
      makeItem({ id: "u1", content: "用户偏好一", kind: "episodic", subjectType: "user", subjectId: "user1" }),
      makeItem({ id: "a1", content: "工程记忆一", kind: "episodic", subjectType: "agent", subjectId: "agent-1" }),
      makeItem({ id: "a2", content: "工程记忆二", kind: "episodic", subjectType: "agent", subjectId: "agent-1" }),
      makeItem({ id: "u2", content: "用户偏好二", kind: "episodic", subjectType: "user", subjectId: "user1" }),
    ];

    const overlay = buildMemoryOverlay(items, { perKindLimit: 3 });

    expect(overlay).toContain("用户偏好一");
    expect(overlay).toContain("工程记忆一");
    expect(overlay).toContain("工程记忆二");
    expect(overlay).not.toContain("用户偏好二");
  });

  it("候选里没有 user subject 时保持原样（不报错、不留空位）", () => {
    const items: MemoryItem[] = [
      makeItem({ id: "a1", content: "工程记忆一", kind: "episodic", subjectType: "agent", subjectId: "agent-1" }),
      makeItem({ id: "a2", content: "工程记忆二", kind: "episodic", subjectType: "agent", subjectId: "agent-1" }),
      makeItem({ id: "a3", content: "工程记忆三", kind: "episodic", subjectType: "agent", subjectId: "agent-1" }),
    ];

    const overlay = buildMemoryOverlay(items, { perKindLimit: 3 });

    expect(overlay).toContain("工程记忆一");
    expect(overlay).toContain("工程记忆三");
  });
});

describe("buildMemoryOverlay - perKindLimit 边界", () => {
  it("perKindLimit <= 0 时返回空（不因负数索引静默丢条目）", () => {
    const items: MemoryItem[] = [
      makeItem({ id: "a1", content: "工程记忆一", kind: "episodic", subjectType: "agent", subjectId: "agent-1" }),
      makeItem({ id: "u1", content: "用户偏好", kind: "episodic", subjectType: "user", subjectId: "user1" }),
    ];

    const overlay = buildMemoryOverlay(items, { perKindLimit: 0 });

    expect(overlay).not.toContain("工程记忆一");
    expect(overlay).not.toContain("用户偏好");
  });

  it("perKindLimit = 1 且名额被 agent subject 占用时，让位给 user subject", () => {
    const items: MemoryItem[] = [
      makeItem({ id: "a1", content: "工程记忆一", kind: "episodic", subjectType: "agent", subjectId: "agent-1" }),
      makeItem({ id: "u1", content: "用户偏好", kind: "episodic", subjectType: "user", subjectId: "user1" }),
    ];

    const overlay = buildMemoryOverlay(items, { perKindLimit: 1 });

    expect(overlay).toContain("用户偏好");
    expect(overlay).not.toContain("工程记忆一");
  });
});
