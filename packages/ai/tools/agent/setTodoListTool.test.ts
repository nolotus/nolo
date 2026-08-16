import { describe, expect, it } from "bun:test";
import {
  formatTodoListDisplayData,
  setTodoListFunc,
  setTodoListFunctionSchema,
} from "./setTodoListTool";
import { TOOL_PACKS } from "../toolPacks";

describe("setTodoListTool", () => {
  it("has valid tool schema", () => {
    expect(setTodoListFunctionSchema.name).toBe("setTodoList");
    expect(setTodoListFunctionSchema.parameters.required).toContain("todos");
  });

  it("is mounted by default in CORE tool pack for main chat tool surface", () => {
    expect(TOOL_PACKS.CORE).toContain("setTodoList");
  });

  it("replaces list and returns formatted rawData and displayData", async () => {
    const res = await setTodoListFunc({
      todos: [
        { title: "Task 1", status: "done" },
        { title: "Task 2", status: "in_progress" },
        { title: "Task 3", status: "pending" },
      ],
    });

    expect(res.rawData.todos.length).toBe(3);
    expect(res.rawData.todos[0]).toEqual({ title: "Task 1", status: "done" });
    expect(res.rawData.todos[1]).toEqual({ title: "Task 2", status: "in_progress" });
    expect(res.rawData.todos[2]).toEqual({ title: "Task 3", status: "pending" });

    expect(res.displayData).toContain("📋 Todo 列表 (1/3)");
    expect(res.displayData).toContain("✅ [已完成] Task 1");
    expect(res.displayData).toContain("🔄 [进行中] Task 2");
    expect(res.displayData).toContain("⏳ [待处理] Task 3");
  });

  it("handles empty todo list safely", async () => {
    const res = await setTodoListFunc({ todos: [] });
    expect(res.rawData.todos).toEqual([]);
    expect(res.displayData).toBe("📋 Todo 列表已清空");
  });

  it("formats output matching CLI and server tool executor contracts", async () => {
    const rawCall = {
      arguments: JSON.stringify({
        todos: [{ title: "CLI Task", status: "in_progress" }],
      }),
    };
    const parsedArgs = JSON.parse(rawCall.arguments);
    const res = await setTodoListFunc(parsedArgs);

    const executorOutput = {
      content: JSON.stringify(res.rawData),
      metadata: { displayData: res.displayData },
    };

    expect(executorOutput.content).toContain("CLI Task");
    expect(executorOutput.metadata.displayData).toContain("🔄 [进行中] CLI Task");
  });
});
