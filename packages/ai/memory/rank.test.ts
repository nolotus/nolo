import { describe, expect, it } from "bun:test";
import { rankMemoryCandidates } from "./rank";
import type { MemoryItem } from "./types";

const buildItem = (input: Partial<MemoryItem> & Pick<MemoryItem, "id" | "content">): MemoryItem => ({
  ownerType: "user",
  ownerId: "user1",
  visibility: "private",
  subjectType: "user",
  subjectId: "user1",
  kind: "semantic",
  createdAt: "2026-04-16T00:00:00.000Z",
  lastActivatedAt: "2026-04-16T00:00:00.000Z",
  activationCount: 1,
  importance: 0.8,
  confidence: 0.8,
  ...input,
});

describe("memory rank", () => {
  it("matches Chinese phrases through cjk token overlap", () => {
    const ranked = rankMemoryCandidates(
      [
        buildItem({ id: "m1", content: "我不喜欢被说教" }),
        buildItem({ id: "m2", content: "上次我们讨论了部署流程" }),
      ],
      "你以后不要太说教"
    );

    expect(ranked[0]?.id).toBe("m1");
  });

  it("prioritizes an exact memory identifier over repeatedly activated older memories", () => {
    const ranked = rankMemoryCandidates(
      [
        buildItem({
          id: "old",
          content: "H4 memory recall test marker=memory-pref-old. 用户偏好：回答时先给结论，再补证据。",
          activationCount: 20,
          lastActivatedAt: new Date().toISOString(),
          importance: 0.95,
          confidence: 0.95,
        }),
        buildItem({
          id: "fresh",
          content: "H4 memory recall test marker=memory-pref-target. 用户偏好：回答时先给结论，再补证据。",
          activationCount: 0,
          importance: 0.82,
          confidence: 0.72,
        }),
      ],
      "请恢复 memory_marker=memory-pref-target 的用户偏好"
    );

    expect(ranked[0]?.id).toBe("fresh");
  });

  it("prioritizes the current project or space path over semantically similar old memories", () => {
    const ranked = rankMemoryCandidates(
      [
        buildItem({
          id: "beta-old",
          ownerType: "space",
          ownerId: "space-beta",
          subjectType: "project",
          subjectId: "project-beta",
          content: "Beta 项目上次本地服务端口是 8080，用户说跟上次一样即可。",
          createdAt: "2026-06-01T00:00:00.000Z",
          lastActivatedAt: "2026-06-06T00:00:00.000Z",
          activationCount: 20,
          importance: 0.98,
          confidence: 0.98,
        }),
        buildItem({
          id: "alpha-current",
          ownerType: "space",
          ownerId: "space-alpha",
          subjectType: "project",
          subjectId: "project-alpha",
          content: "Alpha 项目上次本地服务端口是 3001，用户说跟上次一样时沿用 3001。",
          createdAt: "2026-06-04T00:00:00.000Z",
          lastActivatedAt: "2026-06-04T00:00:00.000Z",
          activationCount: 0,
          importance: 0.7,
          confidence: 0.7,
        }),
      ],
      "这个项目跟上次一样启动",
      {
        currentOwner: { ownerType: "space", ownerId: "space-alpha" },
        currentSubject: { subjectType: "project", subjectId: "project-alpha" },
      }
    );

    expect(ranked[0]?.id).toBe("alpha-current");
  });

  it("prioritizes newer explicit preference updates over older reinforced conflicts", () => {
    const ranked = rankMemoryCandidates(
      [
        buildItem({
          id: "old-name",
          content: "请记住，叫我张三。",
          createdAt: "2026-06-01T00:00:00.000Z",
          lastActivatedAt: "2026-06-06T00:00:00.000Z",
          activationCount: 20,
          importance: 0.98,
          confidence: 0.98,
          patternKey: "explicit-remember",
          sourceKind: "explicit-user-directive",
        }),
        buildItem({
          id: "new-name",
          content: "请记住，叫我李四。",
          createdAt: "2026-06-06T00:00:00.000Z",
          lastActivatedAt: "2026-06-06T00:00:00.000Z",
          activationCount: 0,
          importance: 0.8,
          confidence: 0.8,
          patternKey: "explicit-remember",
          sourceKind: "explicit-user-directive",
        }),
      ],
      "我叫什么名字"
    );

    expect(ranked[0]?.id).toBe("new-name");
  });

  it("prioritizes explicit-user-directive over high-score inferred memories", () => {
    const ranked = rankMemoryCandidates(
      [
        buildItem({
          id: "high-score",
          content: "用户喜欢用 TypeScript",
          activationCount: 50,
          lastActivatedAt: new Date().toISOString(),
          importance: 0.99,
          confidence: 0.99,
        }),
        buildItem({
          id: "explicit",
          content: "请记住，默认用中文回复。",
          createdAt: "2026-01-01T00:00:00.000Z",
          lastActivatedAt: "2026-01-01T00:00:00.000Z",
          activationCount: 1,
          importance: 0.5,
          confidence: 0.5,
          patternKey: "explicit-remember",
          sourceKind: "explicit-user-directive",
        }),
      ],
      "typescript 编程"
    );

    expect(ranked[0]?.id).toBe("explicit");
  });
});

describe("零激活记忆的宽限期降权", () => {
  const base = {
    ownerType: "user" as const,
    ownerId: "user1",
    visibility: "private" as const,
    subjectType: "user" as const,
    subjectId: "user1",
    importance: 0.8,
    confidence: 0.8,
  };
  const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

  it("过宽限期仍零激活的记忆，排在同期有激活的记忆之后", () => {
    const items = [
      {
        ...base,
        id: "zombie",
        contentKey: "mem-zombie",
        kind: "episodic" as const,
        content: "一次性工程条目",
        createdAt: daysAgo(20),
        lastActivatedAt: daysAgo(20),
        activationCount: 0,
      },
      {
        ...base,
        id: "useful",
        contentKey: "mem-useful",
        kind: "episodic" as const,
        content: "反复用到的偏好",
        createdAt: daysAgo(20),
        lastActivatedAt: daysAgo(20),
        activationCount: 8,
      },
    ];

    const ranked = rankMemoryCandidates(items, "");
    expect(ranked[0]?.id).toBe("useful");
  });

  it("宽限期内的新记忆不被降权（给新记忆证明自己的机会）", () => {
    const items = [
      {
        ...base,
        id: "fresh",
        contentKey: "mem-fresh",
        kind: "episodic" as const,
        content: "刚写入的记忆",
        createdAt: daysAgo(1),
        lastActivatedAt: daysAgo(1),
        activationCount: 0,
      },
      {
        ...base,
        id: "old",
        contentKey: "mem-old",
        kind: "episodic" as const,
        content: "很久以前的记忆",
        createdAt: daysAgo(60),
        lastActivatedAt: daysAgo(60),
        activationCount: 1,
      },
    ];

    const ranked = rankMemoryCandidates(items, "");
    expect(ranked[0]?.id).toBe("fresh");
  });
});
