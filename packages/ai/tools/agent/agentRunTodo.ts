/**
 * AgentRunTodo (精简版后台 AgentRun 任务追踪)
 *
 * 专用于后台 startAgentRun 任务的状态追踪。
 * 遵循 Agent Harness Playbook 核心原则：
 * 【视图即纯投影（Views are Pure Projections）】：
 * Todo 不再作为独立的多头真值源，其生命周期与状态完全由关联的 Agent Run 记录与 Batch 实时推导。
 * 状态收敛为：pending | running | done | failed
 * 零 I/O：禁止 Node 专有 API、禁止系统时钟调用，纯计算与契约定义。
 */

import { shortRunId } from "./agentRunDisplayHelpers";

export type AgentRunTodoStatus = "pending" | "running" | "done" | "failed";

export interface AgentRunTodoRecord {
  id: string;
  title: string;
  status: AgentRunTodoStatus;
  runIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AgentRunTodoRunSummary {
  runId: string;
  status: string;
  startedAt?: string;
  finishedAt?: string;
  agentName?: string;
}

export interface DeriveAgentRunTodoStatusInput {
  todo: Pick<AgentRunTodoRecord, "id" | "status">;
  runs: AgentRunTodoRunSummary[];
}

export interface DerivedAgentRunTodoStatus {
  status: AgentRunTodoStatus;
  latestRun?: AgentRunTodoRunSummary;
}

const SUCCESS_STATUSES = new Set(["completed", "done", "success", "passed", "finished"]);
const FAILED_STATUSES = new Set(["failed", "error", "stopped", "cancelled", "orphaned", "blocked"]);

/**
 * 纯函数：由关联的 run 列表推导 AgentRunTodo 最终状态
 */
export function deriveAgentRunTodoStatus(
  input: DeriveAgentRunTodoStatusInput
): DerivedAgentRunTodoStatus {
  const { todo, runs } = input;
  if (!runs || runs.length === 0) {
    return { status: todo.status ?? "pending" };
  }

  // 获取最新的 run
  const latestRun = runs[runs.length - 1];

  // 1. 若有任何 run 在 running 中，整体状态为 running
  const hasRunning = runs.some(
    (r) => r.status === "running" || r.status === "in_progress" || r.status === "executing"
  );
  if (hasRunning) {
    return { status: "running", latestRun };
  }

  // 2. 依据最近一次 run 的状态推导
  const runStatus = (latestRun.status || "").toLowerCase();
  if (SUCCESS_STATUSES.has(runStatus)) {
    return { status: "done", latestRun };
  }
  if (FAILED_STATUSES.has(runStatus)) {
    return { status: "failed", latestRun };
  }

  return { status: todo.status ?? "pending", latestRun };
}

/**
 * 纯函数：从一组 Run 记录直接投影派生出结构化的 AgentRunTodo 记录列表（Pure Materialization）
 */
export function projectTodosFromRuns(
  runs: Array<{
    runId: string;
    batchId?: string;
    agentName?: string;
    status: string;
    startedAt?: string;
    endedAt?: string;
    task?: string;
    note?: string;
  }>
): AgentRunTodoRecord[] {
  const batchMap = new Map<string, Array<{
    runId: string;
    status: string;
    agentName?: string;
    startedAt?: string;
    finishedAt?: string;
    title?: string;
  }>>();

  for (const r of runs) {
    const bId = r.batchId || `single-${r.runId}`;
    let list = batchMap.get(bId);
    if (!list) {
      list = [];
      batchMap.set(bId, list);
    }
    list.push({
      runId: r.runId,
      status: r.status,
      ...(r.agentName ? { agentName: r.agentName } : {}),
      ...(r.startedAt ? { startedAt: r.startedAt } : {}),
      ...(r.endedAt ? { finishedAt: r.endedAt } : {}),
      ...(r.task || r.note ? { title: r.task || r.note } : {}),
    });
  }

  const result: AgentRunTodoRecord[] = [];
  for (const [bId, runItems] of batchMap.entries()) {
    const first = runItems[0];
    const latest = runItems[runItems.length - 1];
    const derived = deriveAgentRunTodoStatus({
      todo: { id: bId, status: "pending" },
      runs: runItems,
    });
    result.push({
      id: bId.startsWith("todo-") ? bId : `todo-${bId}`,
      title: first?.title || first?.agentName || `Batch ${bId}`,
      status: derived.status,
      runIds: runItems.map((item) => item.runId),
      createdAt: first?.startedAt || new Date(0).toISOString(),
      updatedAt: latest?.finishedAt || latest?.startedAt || new Date(0).toISOString(),
    });
  }
  return result;
}

/**
 * 纯函数：生成单行可读摘要
 */
export function summarizeAgentRunTodo(
  todo: AgentRunTodoRecord,
  derived: DerivedAgentRunTodoStatus
): string {
  switch (derived.status) {
    case "done":
      return `完成 · 共 ${todo.runIds.length} 次 run`;
    case "running": {
      const who =
        derived.latestRun?.agentName ??
        (derived.latestRun ? shortRunId(derived.latestRun.runId) : "");
      return `运行中${who ? ` · ${who}` : ""}`;
    }
    case "failed":
      return `失败 · 最近状态: ${derived.latestRun?.status ?? "failed"}`;
    case "pending":
    default:
      return "待执行";
  }
}

/**
 * AgentRunTodoStore 契约（各端存储适配层实现）
 */
export interface AgentRunTodoStore {
  getTodo(id: string): Promise<AgentRunTodoRecord | null>;
  listTodos(): Promise<AgentRunTodoRecord[]>;
  saveTodo(todo: AgentRunTodoRecord): Promise<void>;
  deleteTodo(id: string): Promise<boolean>;
}
