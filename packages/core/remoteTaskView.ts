import { isRecord } from "./isRecord";

/**
 * 远程任务清理状态枚举。
 * 值域收敛：本定义作为 core 层的共享值域（§3.2，H4①）。
 * "not_applicable" 已明确删除，本地/不适用以 undefined 缺省表达。
 */
export type RemoteTaskCleanupStatus = "stopped" | "stop-unverified" | "expired";

/**
 * 进程状态枚举。
 * 依据 §0 / processTask.ts:27-34，不得包含 "detached"。
 */
export type RemoteTaskProcessStatus = "running" | "stopped" | "exited" | "failed";

const PROCESS_STATUS_SET = new Set<RemoteTaskProcessStatus>([
  "running",
  "stopped",
  "exited",
  "failed",
]);

const CLEANUP_STATUS_SET = new Set<RemoteTaskCleanupStatus>([
  "stopped",
  "stop-unverified",
  "expired",
]);

/**
 * 工具执行位置结构等价类型（复用 ownerOriginExecution.ts:78-91 形状，§3.3）。
 * 必须 fail closed，缺省为 { status: "unknown" }。
 */
export type ToolExecutionLocation =
  | { status: "unknown" }
  | {
      status: "ready" | "unavailable" | "stopped";
      hostType: string;
      deviceId: string;
      deviceName: string;
      workspace: {
        id: string;
        root: string;
        cwd: string;
      };
    };

/**
 * Stage 子集投影（§3.4，H4②）。
 * 字段与 Stage 一致，明确不含 stdoutTail（日志由读取侧脱敏投影独立提供）。
 */
export interface RemoteTaskStageView {
  name: string;
  exitCode: number | null;
  signal: string | null;
  durationMs: number;
  stderrTail?: string;
  settledWithoutClose?: boolean;
}

export interface RemoteTaskProcessView {
  status: RemoteTaskProcessStatus;
  pid?: number;
  exitCode?: number;
}

export interface RemoteTaskCleanupView {
  status: RemoteTaskCleanupStatus;
  pending: boolean;
  detail?: string;
  ttlExpiresAt?: string;
  ttlMinutes?: number;
}

export type RemoteTaskCostView = { amount?: number; currency?: string } | null;

export interface RemoteTaskProjectionDrift {
  count: number;
  reasons: string[];
}

export interface RemoteTaskView {
  runId: string;
  eventSeq?: number;
  location: ToolExecutionLocation;
  process?: RemoteTaskProcessView;
  stage?: RemoteTaskStageView;
  cost?: RemoteTaskCostView;
  cleanup?: RemoteTaskCleanupView;
  ttlExpiresAt?: string;
  projectionDrift?: RemoteTaskProjectionDrift;
}

/**
 * 增量 merge 键级清理（§3.6 L3）。
 * - undefined 视同「未提供」，不得覆盖既有字段；
 * - 非 cost 字段的 null 不得覆盖既有字段；
 * - 负向测试：cost: null 属于唯一允许的 null 语义（显式未知，未知 ≠ 缺失，§8.2）。
 */
export function stripUndefined<T>(obj: T): T {
  if (!isRecord(obj)) return obj;
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    }
    if (value === null) {
      if (key === "cost") {
        result[key] = null;
      }
      // 其他字段的 null 均忽略，不覆盖既有字段
      continue;
    }
    if (isRecord(value) && !Array.isArray(value)) {
      result[key] = stripUndefined(value);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

/**
 * 位置投影（§3.3，H4③）：
 * - 无证据或字段不全 → { status: "unknown" }（fail closed，永不默认 ready、remote_server、local_client）。
 */
export function projectToolExecutionLocation(raw: unknown): ToolExecutionLocation {
  if (!isRecord(raw)) return { status: "unknown" };
  const status = raw.status;
  if (status !== "ready" && status !== "unavailable" && status !== "stopped") {
    return { status: "unknown" };
  }
  const hostType = typeof raw.hostType === "string" ? raw.hostType.trim() : "";
  const deviceId = typeof raw.deviceId === "string" ? raw.deviceId.trim() : "";
  const deviceName = typeof raw.deviceName === "string" ? raw.deviceName.trim() : "";
  if (!hostType || !deviceId || !deviceName || !isRecord(raw.workspace)) {
    return { status: "unknown" };
  }
  const ws = raw.workspace;
  const wsId = typeof ws.id === "string" ? ws.id.trim() : "";
  const wsRoot = typeof ws.root === "string" ? ws.root.trim() : "";
  const wsCwd = typeof ws.cwd === "string" ? ws.cwd.trim() : "";
  if (!wsId || !wsRoot || !wsCwd) {
    return { status: "unknown" };
  }

  return {
    status,
    hostType,
    deviceId,
    deviceName,
    workspace: { id: wsId, root: wsRoot, cwd: wsCwd },
  };
}

/**
 * Stage 子集投影（§3.4，H4②，§11.1）：
 * - 只能来自结构化上报对象；
 * - 绝不接受字符串（禁止任何从日志、stdout、stderr 正则提取 stage 的行为）；
 * - 剥离 stdoutTail。
 */
export function projectRemoteTaskStage(raw: unknown): RemoteTaskStageView | undefined {
  if (!isRecord(raw) || typeof raw.name !== "string" || !raw.name.trim()) {
    return undefined;
  }
  const name = raw.name.trim();
  const exitCode = typeof raw.exitCode === "number" ? raw.exitCode : null;
  const signal = typeof raw.signal === "string" ? raw.signal : null;
  const durationMs = typeof raw.durationMs === "number" && !Number.isNaN(raw.durationMs)
    ? Math.max(0, raw.durationMs)
    : 0;

  const stageView: RemoteTaskStageView = {
    name,
    exitCode,
    signal,
    durationMs,
  };

  if (typeof raw.stderrTail === "string") {
    stageView.stderrTail = raw.stderrTail;
  }
  if (typeof raw.settledWithoutClose === "boolean") {
    stageView.settledWithoutClose = raw.settledWithoutClose;
  }

  // stdoutTail 明确不投影在 stage 中
  return stageView;
}

/**
 * 进程状态投影：
 * - 缺失为 undefined（本地视角不可用，非错误，§7.1）。
 */
export function projectRemoteTaskProcess(raw: unknown): RemoteTaskProcessView | undefined {
  if (!isRecord(raw)) return undefined;
  if (typeof raw.status !== "string" || !PROCESS_STATUS_SET.has(raw.status as RemoteTaskProcessStatus)) {
    return undefined;
  }
  const processView: RemoteTaskProcessView = {
    status: raw.status as RemoteTaskProcessStatus,
  };
  if (typeof raw.pid === "number") processView.pid = raw.pid;
  if (typeof raw.exitCode === "number") processView.exitCode = raw.exitCode;
  return processView;
}

/**
 * 清理状态投影（§3.2，H4①）：
 * - 缺省/未确认 → "stop-unverified"；
 * - 本地/非沙箱不适用以 undefined 缺省表达。
 */
export function projectRemoteTaskCleanup(raw: unknown): RemoteTaskCleanupView | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) {
    return { status: "stop-unverified", pending: true };
  }
  const statusStr = typeof raw.status === "string" ? raw.status : "";
  const status: RemoteTaskCleanupStatus = CLEANUP_STATUS_SET.has(statusStr as RemoteTaskCleanupStatus)
    ? (statusStr as RemoteTaskCleanupStatus)
    : "stop-unverified";

  const pending = typeof raw.pending === "boolean" ? raw.pending : status !== "stopped";
  const detail = typeof raw.detail === "string" ? raw.detail : undefined;
  const ttlExpiresAt =
    typeof raw.ttlExpiresAt === "string" && raw.ttlExpiresAt
      ? raw.ttlExpiresAt
      : typeof raw.ttlExpiresAt === "number" && Number.isFinite(raw.ttlExpiresAt)
        ? new Date(raw.ttlExpiresAt).toISOString()
        : undefined;

  const ttlMinutes =
    typeof raw.ttlMinutes === "number" && Number.isFinite(raw.ttlMinutes) && raw.ttlMinutes > 0
      ? raw.ttlMinutes
      : undefined;

  return {
    status,
    pending,
    ...(detail ? { detail } : {}),
    ...(ttlExpiresAt ? { ttlExpiresAt } : {}),
    ...(ttlMinutes !== undefined ? { ttlMinutes } : {})
  };
}

/**
 * 远程任务快照增量合并（§3.6）：
 * - payload 经 stripUndefined 处理；
 * - 缺省安全降级（location -> unknown，cleanup.status -> stop-unverified）。
 */
export function mergeRemoteTaskView(
  previous: RemoteTaskView | undefined,
  incoming: Partial<RemoteTaskView>,
): RemoteTaskView {
  const stripped = stripUndefined(incoming);

  const runId = stripped.runId || previous?.runId || "";
  const eventSeq = stripped.eventSeq !== undefined ? stripped.eventSeq : previous?.eventSeq;

  // location: 缺省 -> unknown
  let location: ToolExecutionLocation;
  if (stripped.location) {
    location = projectToolExecutionLocation(stripped.location);
  } else if (previous?.location) {
    location = previous.location;
  } else {
    location = { status: "unknown" };
  }

  // process: 缺失为 undefined，非错误
  let process: RemoteTaskProcessView | undefined;
  if (stripped.process) {
    process = projectRemoteTaskProcess(stripped.process) ?? previous?.process;
  } else {
    process = previous?.process;
  }

  // stage: 投影剥离 stdoutTail
  let stage: RemoteTaskStageView | undefined;
  if (stripped.stage) {
    stage = projectRemoteTaskStage(stripped.stage) ?? previous?.stage;
  } else {
    stage = previous?.stage;
  }

  // cost: null 保留为显式未知
  let cost: RemoteTaskCostView | undefined;
  if ("cost" in stripped) {
    cost = stripped.cost ?? null;
  } else {
    cost = previous?.cost;
  }

  // cleanup: 缺省 "stop-unverified"
  let cleanup: RemoteTaskCleanupView | undefined;
  if (stripped.cleanup) {
    const projected = projectRemoteTaskCleanup(stripped.cleanup);
    if (projected) {
      cleanup = {
        ...projected,
        ttlExpiresAt: projected.ttlExpiresAt ?? previous?.cleanup?.ttlExpiresAt,
        ttlMinutes: projected.ttlMinutes ?? previous?.cleanup?.ttlMinutes,
      };
      if (cleanup.ttlExpiresAt === undefined) {
        delete cleanup.ttlExpiresAt;
      }
      if (cleanup.ttlMinutes === undefined) {
        delete cleanup.ttlMinutes;
      }
    } else {
      cleanup = previous?.cleanup;
    }
  } else {
    cleanup = previous?.cleanup;
  }

  // top-level ttlExpiresAt: string | number (normalized to ISO string)
  const ttlExpiresAt =
    typeof stripped.ttlExpiresAt === "string" && stripped.ttlExpiresAt
      ? stripped.ttlExpiresAt
      : typeof stripped.ttlExpiresAt === "number" && Number.isFinite(stripped.ttlExpiresAt)
        ? new Date(stripped.ttlExpiresAt).toISOString()
        : previous?.ttlExpiresAt;

  const result: RemoteTaskView = {
    runId,
    ...(eventSeq !== undefined ? { eventSeq } : {}),
    location,
    ...(process ? { process } : {}),
    ...(stage ? { stage } : {}),
    ...(cost !== undefined ? { cost } : {}),
    ...(cleanup ? { cleanup } : {}),
    ...(ttlExpiresAt ? { ttlExpiresAt } : {}),
    ...(previous?.projectionDrift ? { projectionDrift: previous.projectionDrift } : {}),
  };

  return result;
}

/**
 * 冲突收敛规则（§3.4，H4②）：
 * - result JSON 与上报投影冲突时，以 result JSON 为事实；
 * - 投影做展示降级，记录 projectionDrift 计数与原因诊断；
 * - 写者优先级：result JSON > remote_task 上报。
 */
export function reconcileRemoteTaskWithResult(
  projected: RemoteTaskView,
  resultJson: unknown,
): RemoteTaskView {
  if (!isRecord(resultJson)) return projected;

  let drifted = false;
  const reasons: string[] = [];
  const updated: RemoteTaskView = { ...projected };

  // 1. cleanup 判定：result JSON 中的展平字段 cleanupStatus / cleanupPending
  const resultCleanupStatus = typeof resultJson.cleanupStatus === "string"
    ? (resultJson.cleanupStatus as RemoteTaskCleanupStatus)
    : undefined;
  const resultCleanupPending = typeof resultJson.cleanupPending === "boolean"
    ? resultJson.cleanupPending
    : undefined;

  if (resultCleanupStatus && CLEANUP_STATUS_SET.has(resultCleanupStatus)) {
    const prevStatus = projected.cleanup?.status;
    const prevPending = projected.cleanup?.pending;
    const finalPending = resultCleanupPending !== undefined ? resultCleanupPending : (resultCleanupStatus !== "stopped");

    if (prevStatus !== resultCleanupStatus || prevPending !== finalPending) {
      drifted = true;
      reasons.push(
        `cleanup_drift: projected={status:${prevStatus},pending:${prevPending}} vs result={status:${resultCleanupStatus},pending:${finalPending}}`,
      );
      updated.cleanup = {
        status: resultCleanupStatus,
        pending: finalPending,
        ...(projected.cleanup?.detail ? { detail: projected.cleanup.detail } : {}),
      };
    }
  }

  // 2. stages 判定：result JSON 中的 stages 数组
  if (Array.isArray(resultJson.stages) && resultJson.stages.length > 0) {
    const lastResultStageRaw = resultJson.stages[resultJson.stages.length - 1];
    const lastResultStage = projectRemoteTaskStage(lastResultStageRaw);
    if (lastResultStage) {
      const prevStage = projected.stage;
      const isMismatch = !prevStage ||
        prevStage.name !== lastResultStage.name ||
        prevStage.exitCode !== lastResultStage.exitCode;

      if (isMismatch) {
        drifted = true;
        reasons.push(
          `stage_drift: projected=${prevStage ? `${prevStage.name}(${prevStage.exitCode})` : "none"} vs result=${lastResultStage.name}(${lastResultStage.exitCode})`,
        );
        updated.stage = lastResultStage;
      }
    }
  }

  if (drifted) {
    const prevDrift = projected.projectionDrift;
    updated.projectionDrift = {
      count: (prevDrift?.count ?? 0) + reasons.length,
      reasons: [...(prevDrift?.reasons ?? []), ...reasons],
    };
  }

  return updated;
}
