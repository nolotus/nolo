import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { TodoCard } from "./TodoCard";

describe("TodoCard (HTML DOM Render Verification)", () => {
  it("renders todo items with correct DOM structure, titles, icons, and progress status", () => {
    const rawData = {
      todos: [
        { title: "Task 1 completed", status: "done" },
        { title: "Task 2 in progress", status: "in_progress" },
        { title: "Task 3 pending", status: "pending" },
      ],
    };

    const html = renderToString(<TodoCard rawData={rawData} />);

    // 视觉 DOM 根容器与基础 CSS Class 断言
    expect(html).toContain('data-testid="chat-todo-card"');
    expect(html).toContain('data-testid="chat-todo-progress-bar-bg"');
    expect(html).toContain('data-testid="chat-todo-progress-text"');

    // Todo 标题与渲染文本断言
    expect(html).toContain("Task 1 completed");
    expect(html).toContain("Task 2 in progress");
    expect(html).toContain("Task 3 pending");

    // 状态标记 CSS 类与元素结构断言
    expect(html).toContain('data-status="done"');
    expect(html).toContain('data-status="in_progress"');
    expect(html).toContain('data-status="pending"');

    // 进度与百分比渲染断言 (1 / 3, 33%)
    expect(html).toContain("33%");
  });

  it("handles stringified JSON rawData gracefully and renders HTML element tree", () => {
    const rawData = JSON.stringify({
      todos: [{ title: "Stringified Task", status: "done" }],
    });

    const html = renderToString(<TodoCard rawData={rawData} />);
    expect(html).toContain('data-testid="chat-todo-card"');
    expect(html).toContain("Stringified Task");
    expect(html).toContain('data-status="done"');
  });

  it("renders empty state card when todos is empty", () => {
    const html = renderToString(<TodoCard rawData={{ todos: [] }} />);
    expect(html).toContain('data-testid="chat-todo-card"');
    expect(html).toContain("已清空");
  });
});
