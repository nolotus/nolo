import { describe, expect, it } from "bun:test";
import { getSavedMemories } from "./MessageList";

describe("getSavedMemories helper logic", () => {
  it("returns empty array for null/undefined dialogConfig", () => {
    expect(getSavedMemories(null)).toEqual([]);
    expect(getSavedMemories(undefined)).toEqual([]);
    expect(getSavedMemories({})).toEqual([]);
  });

  it("extracts memory.saved events from dialogConfig.memoryEvents", () => {
    const dialogConfig = {
      memoryEvents: [
        {
          type: "memory.saved",
          sourceKind: "explicit-user-directive",
          content: "记住我叫 nolotus",
          visibility: "private",
        },
        {
          type: "other.event",
          content: "ignored",
        },
      ],
    };
    expect(getSavedMemories(dialogConfig)).toEqual([
      {
        content: "记住我叫 nolotus",
        sourceKind: "explicit-user-directive",
        visibility: "private",
      },
    ]);
  });

  it("extracts from dialogConfig.artifacts and deduplicates by content", () => {
    const dialogConfig = {
      artifacts: [
        {
          type: "memory.saved",
          sourceKind: "agent-tool",
          content: " 偏好先给结论 ",
        },
      ],
      memoryEvents: [
        {
          type: "memory.saved",
          sourceKind: "agent-tool",
          content: "偏好先给结论",
        },
      ],
    };
    expect(getSavedMemories(dialogConfig)).toEqual([
      {
        content: "偏好先给结论",
        sourceKind: "agent-tool",
        visibility: "private",
      },
    ]);
  });

  it("extracts from dialogConfig.savedMemories as a fallback compatibility layer", () => {
    const dialogConfig = {
      savedMemories: [
        {
          sourceKind: "explicit-user-directive",
          content: "已记住nolotus是创建者",
        },
      ],
    };
    expect(getSavedMemories(dialogConfig)).toEqual([
      {
        content: "已记住nolotus是创建者",
        sourceKind: "explicit-user-directive",
        visibility: "private",
      },
    ]);
  });

  it("extracts from runtimeCheckpoint nested locations", () => {
    const dialogConfig = {
      runtimeCheckpoint: {
        memoryEvents: [
          {
            type: "memory.saved",
            sourceKind: "explicit-user-directive",
            content: "从checkpoint提取",
          },
        ],
      },
    };
    expect(getSavedMemories(dialogConfig)).toEqual([
      {
        content: "从checkpoint提取",
        sourceKind: "explicit-user-directive",
        visibility: "private",
      },
    ]);
  });

  it("filters out inferred-understanding sourceKind", () => {
    const dialogConfig = {
      memoryEvents: [
        {
          type: "memory.saved",
          sourceKind: "inferred-understanding",
          content: "推断的偏好",
        },
        {
          type: "memory.saved",
          sourceKind: "explicit-user-directive",
          content: "显式要求的偏好",
        },
      ],
    };
    expect(getSavedMemories(dialogConfig)).toEqual([
      {
        content: "显式要求的偏好",
        sourceKind: "explicit-user-directive",
        visibility: "private",
      },
    ]);
  });

  it("ignores malformed saved memory source kinds", () => {
    const dialogConfig = {
      memoryEvents: [
        {
          type: "memory.saved",
          sourceKind: "unknown-source",
          content: "不应显示",
        },
        {
          type: "memory.saved",
          sourceKind: "agent-tool",
          content: "应该显示",
        },
      ],
    };

    expect(getSavedMemories(dialogConfig)).toEqual([
      {
        content: "应该显示",
        sourceKind: "agent-tool",
        visibility: "private",
      },
    ]);
  });

  it("handles malformed memory items safely and ignores events without usable content", () => {
    const dialogConfig = {
      memoryEvents: [
        {
          type: "memory.saved",
          sourceKind: "explicit-user-directive",
          content: 12345,
        },
        {
          type: "memory.saved",
          sourceKind: "explicit-user-directive",
        },
        null,
        "string-item",
        {
          type: "memory.saved",
          sourceKind: "agent-tool",
          content: "   ",
        },
        {
          type: "memory.saved",
          sourceKind: "explicit-user-directive",
          content: "正常显示内容",
        },
      ] as any,
    };

    expect(getSavedMemories(dialogConfig)).toEqual([
      {
        content: "正常显示内容",
        sourceKind: "explicit-user-directive",
        visibility: "private",
      },
    ]);
  });

  it("filters out inferred-understanding events even if they are in different case/format", () => {
    const dialogConfig = {
      memoryEvents: [
        {
          type: "memory.saved",
          sourceKind: "Inferred-Understanding",
          content: "推断格式1",
        },
        {
          type: "memory.saved",
          sourceKind: "inferred_understanding",
          content: "推断格式2",
        },
        {
          type: "memory.saved",
          sourceKind: "explicit-user-directive",
          content: "保留这个",
        },
      ],
    };
    expect(getSavedMemories(dialogConfig)).toEqual([
      {
        content: "保留这个",
        sourceKind: "explicit-user-directive",
        visibility: "private",
      },
    ]);
  });

  it("deduplicates similar items with slight punctuation, casing or spacing variations to avoid spam", () => {
    const dialogConfig = {
      memoryEvents: [
        {
          type: "memory.saved",
          sourceKind: "explicit-user-directive",
          content: "记住我叫 Nolotus。",
        },
        {
          type: "memory.saved",
          sourceKind: "agent-tool",
          content: " 记住我叫 nolotus  ",
        },
        {
          type: "memory.saved",
          sourceKind: "explicit-user-directive",
          content: "记住我叫 nolotus!",
        },
        {
          type: "memory.saved",
          sourceKind: "explicit-user-directive",
          content: "记住我叫另一个名字",
        },
      ],
    };
    expect(getSavedMemories(dialogConfig)).toEqual([
      {
        content: "记住我叫 Nolotus。",
        sourceKind: "explicit-user-directive",
        visibility: "private",
      },
      {
        content: "记住我叫另一个名字",
        sourceKind: "explicit-user-directive",
        visibility: "private",
      },
    ]);
  });

  it("ignores non-memory artifacts even when they contain content and sourceKind", () => {
    const dialogConfig = {
      artifacts: [
        {
          type: "plain.artifact",
          sourceKind: "agent-tool",
          content: "普通 artifact 不应显示为记忆",
        },
        {
          sourceKind: "explicit-user-directive",
          content: "缺失 type 的 artifact 也不应显示为记忆",
        },
        {
          type: "memory.saved",
          sourceKind: "agent-tool",
          content: "真正保存的记忆",
        },
      ],
    };

    expect(getSavedMemories(dialogConfig)).toEqual([
      {
        content: "真正保存的记忆",
        sourceKind: "agent-tool",
        visibility: "private",
      },
    ]);
  });
});
