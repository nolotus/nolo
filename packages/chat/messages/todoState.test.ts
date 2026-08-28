import { describe, expect, test } from "bun:test";
import { selectLatestConversationTodo } from "./todoState";

describe("selectLatestConversationTodo", () => {
  test("returns the latest setTodoList snapshot", () => {
    expect(
      selectLatestConversationTodo([
        { id: "old", role: "tool", toolName: "setTodoList", content: JSON.stringify({ todos: [{ title: "old", status: "done" }] }) },
        { id: "new", role: "tool", toolName: "setTodoList", content: JSON.stringify({ todos: [{ title: "new", status: "in_progress" }] }) },
      ]),
    ).toEqual({
      sourceMessageId: "new",
      todos: [{ title: "new", status: "in_progress" }],
    });
  });

  test("preserves an empty latest snapshot as a cleared Todo", () => {
    expect(
      selectLatestConversationTodo([
        { role: "tool", toolName: "setTodoList", content: JSON.stringify({ todos: [{ title: "old" }] }) },
        { role: "tool", toolName: "setTodoList", content: JSON.stringify({ todos: [] }) },
      ]),
    ).toEqual({ todos: [] });
  });

  test("ignores unrelated and malformed messages", () => {
    expect(
      selectLatestConversationTodo([
        { role: "assistant", content: "hello" },
        { role: "tool", toolName: "read", content: "{}" },
        { role: "tool", toolName: "setTodoList", content: "not-json" },
      ]),
    ).toBeNull();
  });
});
