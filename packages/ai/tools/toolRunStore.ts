// File: ai/tools/toolRunStore.ts
// Module store for ToolRun — peeled out of Redux (Wave7).
// Mirrors packages/app/notifications/notificationStore.ts +
// packages/ai/agent/publicAgentsSSRStore.ts (content snapshot for
// useSyncExternalStore so UI updates when runs change).
//
// Reducer semantics below are copied verbatim from the deleted toolRunSlice.ts
// (upsert/update/remove filters, processLaunch helpers, startedAt ascending
// sortComparer). toolRun state reads/writes no longer go through Redux; the
// only Redux-bound piece left is `executeToolRun`, kept as createAsyncThunk so
// call sites stay `dispatch(executeToolRun(...))` — but inside it calls the
// mutators below directly and reads via getToolRunById.

import {
  createAsyncThunk,
  type AsyncThunk,
} from "@reduxjs/toolkit";
import { useSyncExternalStore } from "react";
import { toErrorMessage } from "core/errorMessage";
import { asOptionalTrimmedString } from "core/optionalString";
import { selectIdentityUserId } from "identity/selectors";
import type { ProcessLaunchInfo } from "chat/messages/types";
import type { ToolBehavior, ToolInteraction } from ".";
import { getToolResultErrorData } from "./toolResultError";

// ===== types =====

export type ToolRunStatus = "pending" | "running" | "succeeded" | "failed";
export type ToolRunStepStatus = ToolRunStatus;

export interface ToolRunStep {
  id: string;
  label: string;
  status: ToolRunStepStatus;
  detail?: string;
}

export interface ToolRun {
  id: string;
  messageId: string; // 这次工具调用属于哪条消息或步骤消息
  toolName: string;
  behavior?: ToolBehavior;
  inputSummary?: string;
  outputSummary?: string;
  steps?: ToolRunStep[];
  status: ToolRunStatus;
  error?: string;
  startedAt: number;
  finishedAt?: number;
  // 交互模式（从 ToolDefinition 抄过来）
  interaction?: ToolInteraction;
  // 保存本次调用的完整参数，后续确认或重放时会用到
  input?: any;
  /** launchProcess 启动的后台进程信息。独立于 toolRun 状态机：
   * 工具调用本身是 succeeded（立即返回），但进程后续可 running→stopped→exited 流转。 */
  processLaunch?: ProcessLaunchInfo;
}

export const createToolRunId = () =>
  `toolrun_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

// ===== internal state =====

// Map preserves insertion order; getAllToolRuns sorts by startedAt ascending
// (same as the old entity adapter sortComparer).
const runsById = new Map<string, ToolRun>();

const listeners = new Set<() => void>();

// Client-only store (no SSR) — version counter matches notificationStore.
// A hand-rolled content snapshot previously omitted outputSummary/steps and
// missed deploy-progress UI updates from toolRunUpdated.
let version = 0;

const notify = (): void => {
  version += 1;
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      /* subscriber errors must not break mutators */
    }
  }
};

// ===== mutators (plain functions — same payloads as old actions) =====

export function toolRunStarted(payload: {
  id: string;
  messageId: string;
  toolName: string;
  behavior?: ToolBehavior;
  inputSummary?: string;
  startedAt?: number;
  interaction?: ToolInteraction;
  input?: any;
}): void {
  const {
    id,
    messageId,
    toolName,
    behavior,
    inputSummary,
    startedAt,
    interaction,
    input,
  } = payload;
  // 每次开始（包括重试）都清空上一次的 error / 输出 / 结束时间
  runsById.set(id, {
    id,
    messageId,
    toolName,
    behavior,
    inputSummary,
    status: "running",
    startedAt: startedAt ?? Date.now(),
    interaction,
    input,
    error: undefined,
    finishedAt: undefined,
    outputSummary: undefined,
    steps: undefined,
  });
  notify();
}

// 把某个 ToolRun 状态设为 pending（用于“预览但未执行”的阶段）
export function toolRunSetPending(payload: { id: string }): void {
  const { id } = payload;
  const run = runsById.get(id);
  if (run) {
    run.status = "pending";
    notify();
  }
}

export function toolRunSucceeded(payload: {
  id: string;
  outputSummary?: string;
  steps?: ToolRunStep[];
  finishedAt?: number;
}): void {
  const { id, outputSummary, steps, finishedAt } = payload;
  const run = runsById.get(id);
  if (run) {
    run.status = "succeeded";
    run.outputSummary = outputSummary;
    if (steps !== undefined) {
      run.steps = steps;
    }
    run.finishedAt = finishedAt ?? Date.now();
    notify();
  }
}

export function toolRunUpdated(payload: {
  id: string;
  outputSummary?: string;
  steps?: ToolRunStep[];
}): void {
  const { id, outputSummary, steps } = payload;
  const run = runsById.get(id);
  if (run) {
    if (outputSummary !== undefined) {
      run.outputSummary = outputSummary;
    }
    if (steps !== undefined) {
      run.steps = steps;
    }
    notify();
  }
}

export function toolRunFailed(payload: {
  id: string;
  error: string;
  outputSummary?: string;
  steps?: ToolRunStep[];
  finishedAt?: number;
}): void {
  const { id, error, outputSummary, steps, finishedAt } = payload;
  const run = runsById.get(id);
  if (run) {
    run.status = "failed";
    run.error = error;
    if (outputSummary !== undefined) {
      run.outputSummary = outputSummary;
    }
    if (steps !== undefined) {
      run.steps = steps;
    }
    run.finishedAt = finishedAt ?? Date.now();
    notify();
  }
}

export function resetToolRunsForMessage(payload: { messageId: string }): void {
  const { messageId } = payload;
  let changed = false;
  for (const [id, run] of runsById) {
    if (run.messageId === messageId) {
      runsById.delete(id);
      changed = true;
    }
  }
  if (changed) notify();
}

export function resetAllToolRuns(): void {
  if (runsById.size === 0) return;
  runsById.clear();
  notify();
}

export function updateProcessLaunchStatus(payload: {
  toolRunId: string;
  status: ProcessLaunchInfo["status"];
  exitCode?: number;
}): void {
  const run = runsById.get(payload.toolRunId);
  if (run?.processLaunch) {
    run.processLaunch.status = payload.status;
    if (payload.exitCode !== undefined) {
      run.processLaunch.exitCode = payload.exitCode;
    }
    notify();
  }
}

/** 将 processLaunch 信息写入 toolRun（launchProcess 工具返回后调用）。 */
export function setProcessLaunch(payload: {
  toolRunId: string;
  processLaunch: ProcessLaunchInfo;
}): void {
  const run = runsById.get(payload.toolRunId);
  if (run) {
    run.processLaunch = payload.processLaunch;
    notify();
  }
}

// ===== 历史装载回灌（刷新页面 / 重进对话 / 跨轮次） =====
//
// 缺陷（2026-10-12 实测复现）：确认卡的渲染条件只看内存 store 里的 run
// （MessageToolConfirmBar → useToolRunsByMessageId），而 run 只在本次会话的
// 工具调用流里创建。工具消息本身是持久化的（带 toolRunId +
// toolPayload.status === "pending"），于是刷新/重进对话后 runsById 里没有对应
// run → 确认卡 return null，待确认的操作永远点不到（页面还留着「等待你确认」
// 的假象）。
//
// 回灌只认 pending 行：succeeded/failed 本来就不渲染确认卡。已存在的 run id
// 一律跳过、绝不改写状态——否则本会话「已确认/正在执行」的 run 会被滞后的历史
// 快照回退成 pending。

/** 持久化工具消息里与回灌相关的字段（历史行经过 DB 序列化，一律按 unknown 收窄）。 */
interface PersistedToolMessageLike {
  id?: unknown;
  parentMessageId?: unknown;
  toolName?: unknown;
  toolRunId?: unknown;
  toolPayload?: {
    status?: unknown;
    toolRunId?: unknown;
    toolName?: unknown;
    interaction?: unknown;
    input?: unknown;
    startedAt?: unknown;
  } | null;
}

/** 历史消息里还处于「待用户确认」的工具调用。 */
export interface PersistedPendingToolRun {
  runId: string;
  /** run 归属的消息：与 toolThunks 的 toolRunStarted 同口径，是发起调用的
   * assistant 消息（parentMessageId），而不是工具消息自身。 */
  messageId: string;
  toolName: string;
  /** 落盘时记下的交互模式；缺失/非法值退化为 "confirm"（旧数据里没有这个字段）。 */
  interaction: ToolInteraction;
  input: unknown;
  startedAt?: number;
}

const toInputSummary = (input: unknown): string => {
  try {
    return JSON.stringify(input ?? {}).slice(0, 400);
  } catch {
    // 循环引用等不可序列化输入：摘要降级为空，绝不因为展示字段丢掉回灌机会
    return "";
  }
};

/** 从（历史）消息里挑出 pending 的确认 run，不写 store——纯函数，便于测试与复用。 */
export function collectPendingToolRuns(
  messages: unknown
): PersistedPendingToolRun[] {
  if (!Array.isArray(messages)) return [];

  const pending: PersistedPendingToolRun[] = [];
  for (const raw of messages as PersistedToolMessageLike[]) {
    const payload = raw?.toolPayload;
    if (!payload || payload.status !== "pending") continue;

    const runId =
      asOptionalTrimmedString(payload.toolRunId) ??
      asOptionalTrimmedString(raw?.toolRunId);
    if (!runId) continue;

    const toolName =
      asOptionalTrimmedString(payload.toolName) ??
      asOptionalTrimmedString(raw?.toolName);
    const messageId =
      asOptionalTrimmedString(raw?.parentMessageId) ??
      asOptionalTrimmedString(raw?.id);
    if (!toolName || !messageId) continue;

    // 交互模式以落盘值为准（confirm / authorize 不互相降级）；旧数据没有这个
    // 字段，或值非法时退化为 "confirm"。
    const rawInteraction = asOptionalTrimmedString(payload.interaction);
    const interaction: ToolInteraction =
      rawInteraction === "confirm" ||
      rawInteraction === "authorize" ||
      rawInteraction === "auto"
        ? rawInteraction
        : "confirm";

    pending.push({
      runId,
      messageId,
      toolName,
      interaction,
      input: payload.input,
      startedAt:
        typeof payload.startedAt === "number" ? payload.startedAt : undefined,
    });
  }
  return pending;
}

/**
 * 把历史消息里 pending 的确认 run 回灌进内存 store（幂等）。
 * 返回本次新写入的 run 数；重复装载同一批消息返回 0。
 *
 * interaction 固定为 "confirm"：确认卡只认 confirm（toolConfirmPolicy），而
 * 媒体工具（mediaJobTool/transcribe/translate）的 pending run 在实时路径里
 * 也是写 "confirm"（toolThunks 的结果驱动分支），且它们由卡片自己渲染、被
 * CARD_MANAGED_CONFIRM_TOOL_NAMES 排除在确认栏之外，不会因此多出一个入口。
 */
export function hydrateToolRunsFromMessages(messages: unknown): number {
  let hydrated = 0;
  for (const candidate of collectPendingToolRuns(messages)) {
    if (runsById.has(candidate.runId)) continue;

    toolRunStarted({
      id: candidate.runId,
      messageId: candidate.messageId,
      toolName: candidate.toolName,
      inputSummary: toInputSummary(candidate.input),
      startedAt: candidate.startedAt,
      interaction: candidate.interaction,
      input: candidate.input,
    });
    toolRunSetPending({ id: candidate.runId });
    hydrated += 1;
  }
  return hydrated;
}

/** 可对账的工具消息形状（id/dbKey 用于落盘回写，toolRunId 用于与内存 run 对齐）。 */
export interface ConfirmToolMessageShape {
  id?: unknown;
  dbKey?: unknown;
  toolRunId?: unknown;
  // 不用 Record<string, unknown>：接口类型（如 ToolPayload）没有隐式索引签名，
  // 会让 Message 不满足约束。这里只声明对账需要的字段。
  toolPayload?: { status?: unknown } | null;
}

/**
 * 找出「内存 run 已 succeeded、消息行却还写着 pending」的确认行（M1）。
 *
 * 确认栏/媒体卡片走 executeToolRun：它只推进内存 run，从不回写消息行，落盘的
 * toolPayload.status 因此永远是 pending。刷新后 hydrateToolRunsFromMessages
 * 会照着这行 pending 把 run 复活，卡片重新显示「需要确认」→ 再点一次对
 * email_send 这类不可逆操作就是重复执行。调用方拿到这些行后把 status 写回
 * succeeded，hydrate 便不再回灌它们。
 *
 * 只认 succeeded：失败/取消的 run 保持 pending，刷新后仍可重试（与修复前一致）。
 */
export function collectConfirmedExecutedMessages<
  T extends ConfirmToolMessageShape
>(messages: unknown): Array<{ message: T; outputSummary?: string }> {
  if (!Array.isArray(messages)) return [];

  const executedRuns = new Map<string, ToolRun>();
  for (const run of runsById.values()) {
    if (run.status === "succeeded") executedRuns.set(run.id, run);
  }
  if (executedRuns.size === 0) return [];

  const executed: Array<{ message: T; outputSummary?: string }> = [];
  for (const message of messages as T[]) {
    if (!message || message.toolPayload?.status !== "pending") continue;
    const runId = asOptionalTrimmedString(message.toolRunId);
    if (!runId) continue;
    const run = executedRuns.get(runId);
    if (!run) continue;
    executed.push({
      message,
      outputSummary: asOptionalTrimmedString(run.outputSummary),
    });
  }
  return executed;
}

// ===== reads =====

export function getAllToolRuns(): ToolRun[] {
  return Array.from(runsById.values()).sort((a, b) => a.startedAt - b.startedAt);
}

export function getToolRunById(id: string): ToolRun | undefined {
  return runsById.get(id);
}

export function getToolRunsByMessageId(messageId: string): ToolRun[] {
  return getAllToolRuns().filter((run) => run.messageId === messageId);
}

// ===== useSyncExternalStore =====

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): number {
  return version;
}

export function useAllToolRuns(): ToolRun[] {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return getAllToolRuns();
}

export function useToolRunById(id: string): ToolRun | undefined {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return getToolRunById(id);
}

export function useToolRunsByMessageId(messageId: string): ToolRun[] {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return getToolRunsByMessageId(messageId);
}

export function resetToolRunStoreForTests(): void {
  runsById.clear();
  notify();
}

// ===== 通用执行 thunk：基于已有 ToolRun.input 再次执行工具（可作为重试） =====
//
// 保留 createAsyncThunk 名称/导出，调用方仍是 dispatch(executeToolRun(...))。
// 但 toolRun 状态读写不走 Redux：run 从 getToolRunById 取，状态推进直接调
// mutator（toolRunStarted / toolRunSucceeded / toolRunFailed），只剩
// findToolExecutor 的 thunkApi 第二参数、fetchUserSpaceMemberships dispatch、
// getState().auth 仍走 Redux。

export const executeToolRun: AsyncThunk<
  // payload creator 总是返回这三个键（rawData/displayData 可能是 undefined 值，
  // 但键本身一定在），写成可选键会与 createAsyncThunk 推导出的类型不兼容。
  { id: string; rawData: any; displayData: any },
  { id: string; inputOverride?: Record<string, unknown> },
  any
> = createAsyncThunk(
  "toolRun/executeToolRun",
  async (
    { id, inputOverride }: { id: string; inputOverride?: Record<string, unknown> },
    thunkApi
  ) => {
    const run = getToolRunById(id);

    if (!run) {
      throw new Error(`ToolRun not found: ${id}`);
    }
    const executionInput = inputOverride ?? run.input;
    if (!executionInput) {
      throw new Error(`ToolRun ${id} has no input to execute with.`);
    }

    const { findToolExecutor } = await import(".");
    const { executor } = findToolExecutor(run.toolName);

    // 点击按钮时，把状态重新置为 running，方便 UI 显示“执行中…”；这同时也清掉旧错误
    toolRunStarted({
      id: run.id,
      messageId: run.messageId,
      toolName: run.toolName,
      behavior: run.behavior,
      inputSummary: run.inputSummary,
      startedAt: Date.now(),
      interaction: run.interaction,
      input: executionInput,
    });

    try {
      const result = await executor(executionInput, thunkApi, {
        parentMessageId: run.messageId,
      });

      toolRunSucceeded({
        id: run.id,
        outputSummary: result?.displayData || "",
      });

      if (run.toolName === "deleteSpaces") {
        const latestState = thunkApi.getState() as any;
        // Phase 5：auth slice 已删除（恒为 {}），userId 走显式绑定的会话。
        const userId = selectIdentityUserId(latestState);
        if (userId) {
          const { fetchUserSpaceMemberships } = await import("create/space/member/memberThunks");
          await thunkApi.dispatch(fetchUserSpaceMemberships(userId) as any);
        }
      }

      return {
        id: run.id,
        rawData: result?.rawData,
        displayData: result?.displayData,
      };
    } catch (e: any) {
      const msg = toErrorMessage(e);
      const structured = getToolResultErrorData(e);
      toolRunFailed({
        id: run.id,
        error: msg,
        outputSummary: asOptionalTrimmedString(structured?.displayData),
      });
      throw e;
    }
  }
);