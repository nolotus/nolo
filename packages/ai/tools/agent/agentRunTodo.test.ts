import { describe, expect, it } from "bun:test";
import {
  deriveAgentRunTodoStatus,
  projectTodosFromRuns,
  summarizeAgentRunTodo,
  type AgentRunTodoRecord,
  type AgentRunTodoRunSummary,
} from "./agentRunTodo";

const NOW = "2026-08-09T02:00:00.000Z";

function makeRun(
  runId: string,
  status: string,
  extra: Partial<AgentRunTodoRunSummary> = {}
): AgentRunTodoRunSummary {
  return { runId, status, ...extra };
}

function makeTodo(partial: Partial<AgentRunTodoRecord> = {}): AgentRunTodoRecord {
  return {
    id: "t-1",
    title: "测试后台任务",
    status: "pending",
    runIds: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...partial,
  };
}

describe("agentRunTodo — deriveAgentRunTodoStatus", () => {
  it("无关联 run 时保持原本状态", () => {
    const todo = makeTodo({ status: "pending" });
    const res = deriveAgentRunTodoStatus({ todo, runs: [] });
    expect(res.status).toBe("pending");
  });

  it("当有 run 在运行中时推导为 running", () => {
    const todo = makeTodo({ status: "pending" });
    const runs = [makeRun("r-1", "done"), makeRun("r-2", "running")];
    const res = deriveAgentRunTodoStatus({ todo, runs });
    expect(res.status).toBe("running");
    expect(res.latestRun?.runId).toBe("r-2");
  });

  it("最近一次 run 为成功状态时推导为 done", () => {
    const todo = makeTodo({ status: "pending" });
    const runs = [makeRun("r-1", "failed"), makeRun("r-2", "completed")];
    const res = deriveAgentRunTodoStatus({ todo, runs });
    expect(res.status).toBe("done");
    expect(res.latestRun?.runId).toBe("r-2");
  });

  it("最近一次 run 为失败状态时推导为 failed", () => {
    const todo = makeTodo({ status: "pending" });
    const runs = [makeRun("r-1", "done"), makeRun("r-2", "failed")];
    const res = deriveAgentRunTodoStatus({ todo, runs });
    expect(res.status).toBe("failed");
    expect(res.latestRun?.runId).toBe("r-2");
  });

  it("支持 stopped / cancelled / orphaned 等失败分类", () => {
    const todo = makeTodo({ status: "pending" });
    const res1 = deriveAgentRunTodoStatus({ todo, runs: [makeRun("r-1", "stopped")] });
    expect(res1.status).toBe("failed");

    const res2 = deriveAgentRunTodoStatus({ todo, runs: [makeRun("r-2", "cancelled")] });
    expect(res2.status).toBe("failed");
  });
});

describe("agentRunTodo — summarizeAgentRunTodo", () => {
  it("生成的 done 摘要说明", () => {
    const todo = makeTodo({ runIds: ["r-1", "r-2"] });
    const derived = { status: "done" as const };
    const summary = summarizeAgentRunTodo(todo, derived);
    expect(summary).toBe("完成 · 共 2 次 run");
  });

  it("生成的 running 摘要说明（含 agent 名或短 runId）", () => {
    const todo = makeTodo({ runIds: ["r-12345678"] });
    const derived = {
      status: "running" as const,
      latestRun: makeRun("r-12345678", "running", { agentName: "Agent-X" }),
    };
    const summary = summarizeAgentRunTodo(todo, derived);
    expect(summary).toContain("运行中");
    expect(summary).toContain("Agent-X");
  });

  it("生成的 failed 摘要说明", () => {
    const todo = makeTodo({ runIds: ["r-1"] });
    const derived = {
      status: "failed" as const,
      latestRun: makeRun("r-1", "failed"),
    };
    const summary = summarizeAgentRunTodo(todo, derived);
    expect(summary).toBe("失败 · 最近状态: failed");
  });

  it("默认 pending 摘要说明", () => {
    const todo = makeTodo();
    const derived = { status: "pending" as const };
    const summary = summarizeAgentRunTodo(todo, derived);
    expect(summary).toBe("待执行");
  });
});

describe("agentRunTodo — projectTodosFromRuns", () => {
  it("从 runs 列表纯函数投影出 Todo 结构", () => {
    const runs = [
      {
        runId: "run-1",
        batchId: "batch-A",
        agentName: "Writer",
        status: "done",
        startedAt: "2026-09-03T05:00:00.000Z",
        endedAt: "2026-09-03T05:01:00.000Z",
        task: "Write blog post",
      },
      {
        runId: "run-2",
        batchId: "batch-A",
        agentName: "Reviewer",
        status: "running",
        startedAt: "2026-09-03T05:02:00.000Z",
        task: "Review blog post",
      },
      {
        runId: "run-3",
        batchId: "batch-B",
        agentName: "Deployer",
        status: "failed",
        startedAt: "2026-09-03T05:03:00.000Z",
        endedAt: "2026-09-03T05:04:00.000Z",
      },
    ];

    const todos = projectTodosFromRuns(runs);
    expect(todos.length).toBe(2);

    const todoA = todos.find((t) => t.id === "todo-batch-A");
    expect(todoA).toBeDefined();
    expect(todoA?.status).toBe("running"); // 有一个在 running
    expect(todoA?.runIds).toEqual(["run-1", "run-2"]);
    expect(todoA?.title).toBe("Write blog post");

    const todoB = todos.find((t) => t.id === "todo-batch-B");
    expect(todoB).toBeDefined();
    expect(todoB?.status).toBe("failed");
    expect(todoB?.runIds).toEqual(["run-3"]);
  });
});

