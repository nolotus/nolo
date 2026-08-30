import { describe, expect, it } from "bun:test";
import React from "react";
import { renderInDom } from "../../../testing/domRender";
import { MemorySavedIndicator } from "./MessageList";

describe("MemorySavedIndicator UI component", () => {
  it("renders nothing when no memories are present", async () => {
    const dialogConfig = {
      id: "d1",
      memoryEvents: [],
    };
    const view = await renderInDom(<MemorySavedIndicator dialogConfig={dialogConfig} />);
    try {
      expect(view.container.innerHTML).toBe("");
    } finally {
      await view.cleanup();
    }
  });

  it("renders memory indicators for explicit and tool memories, but filters out inferred", async () => {
    const dialogConfig = {
      id: "d1",
      memoryEvents: [
        {
          type: "memory.saved",
          sourceKind: "explicit-user-directive",
          content: "记住我是创建者",
        },
        {
          type: "memory.saved",
          sourceKind: "agent-tool",
          content: "偏好简短回答",
        },
        {
          type: "memory.saved",
          sourceKind: "inferred-understanding",
          content: "用户似乎在工作",
        },
      ],
    };
    
    const view = await renderInDom(<MemorySavedIndicator dialogConfig={dialogConfig} />);
    try {
      const html = view.container.innerHTML;
      expect(html).toContain('data-testid="memory-saved-container"');
      expect(html).toContain('data-testid="memory-saved-item"');
      expect(html).toContain("已保存记忆");
      expect(html).toContain("记住我是创建者");
      expect(html).toContain("助手已保存记忆");
      expect(html).toContain("偏好简短回答");
      expect(html).not.toContain("推断的偏好");
      expect(html).not.toContain("用户似乎在工作");
      
      const items = view.container.querySelectorAll('[data-testid="memory-saved-item"]');
      expect(items.length).toBe(2);
    } finally {
      await view.cleanup();
    }
  });
});
