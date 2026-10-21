import type {
  AgentRunLifecyclePhase,
  AgentRunLifecycleRun,
  AgentRunStreamAgentRunEvent,
  AgentRunStreamRemoteTaskEvent,
} from "core/agentRunStreamEvents";
import {
  mergeRemoteTaskView,
  stripUndefined,
  type RemoteTaskCleanupView,
  type RemoteTaskCostView,
  type RemoteTaskProcessView,
  type RemoteTaskStageView,
  type RemoteTaskView,
  type ToolExecutionLocation,
} from "core/remoteTaskView";

export type {
  AgentRunLifecyclePhase,
  AgentRunLifecycleRun,
  AgentRunStreamAgentRunEvent,
  AgentRunStreamRemoteTaskEvent,
};

export type AgentRunScope = {
  userId: string;
  dialogId?: string;
  workspaceId?: string;
};

/**
 * SSE 事件汇聚点的类型面（§4.2 #1：**先扩类型再改逻辑**）。
 * 必须与 core union 同步扩宽 —— 漏扩会让 `remote_task` 帧在本模块（以及从本模块
 * 取类型的 `useAgentRuns.ts`）编译失败；这是刻意设计（强制消费端表态，§4.1）。
 */
export type AgentRunEvent = AgentRunStreamAgentRunEvent | AgentRunStreamRemoteTaskEvent;
export const AGENT_RUN_LINGER_MS = 5_000;

/** §8.1 第一级失联阈值：90s 无证据 → unknown（`run.status` 不变）。 */
export const REMOTE_TASK_UNKNOWN_AFTER_MS = 90_000;
/** §8.1 第二级硬阈值：15 分钟无证据 → 「需处置」（仍不置 failed）。 */
export const REMOTE_TASK_REQUIRES_ACTION_MS = 15 * 60_000;

type Listener = () => void;
type RunRecord = { run: AgentRunLifecycleRun; phase: AgentRunLifecyclePhase };
type TerminalRecord = { startedAt: number; finishedAt: number; scope: AgentRunScope };
type LingerRecord = { run: AgentRunLifecycleRun; scope: AgentRunScope };

/** 日志只保留可用性元数据（§9.3：日志正文禁入 store / 消息状态）。 */
export type RemoteTaskLogsMeta = { available?: boolean; tailLinesMax?: number };

/**
 * 远程任务在 store 中的形状（§7.3「终态后 task 状态落 run 记录的 `remoteTask`
 * 子对象」）。`location` 由 `mergeRemoteTaskState` 的 fail-closed 投影保证：
 * 证据不全 → `{ status: "unknown" }`（§3.3），本模块不再自行解释字段。
 * 本类型是 web 侧视图，不改动 core 的值域（core 由 B1 冻结）。
 */
export type RemoteTaskState = {
  runId: string;
  eventSeq?: number;
  location?: ToolExecutionLocation;
  process?: RemoteTaskProcessView;
  stage?: RemoteTaskStageView;
  /** `null` = 显式未知（未知 ≠ 缺失，§8.2） */
  cost?: RemoteTaskCostView;
  cleanup?: RemoteTaskCleanupView;
  logs?: RemoteTaskLogsMeta;
};

type RemoteTaskRecord = {
  runId: string;
  task: RemoteTaskState;
  /** 已接受的最大 `eventSeq`，用于重放/乱序判重（§5.3、§7.3） */
  eventSeq: number;
  startedAt?: number;
  /** `max(lastHeartbeatAt, lastStageAt, lastCleanupAt)` 的消费侧观测值 */
  lastEvidenceAt: number;
  scope: AgentRunScope;
};

const runs = new Map<string, RunRecord>();
// Tombstones are deliberately retained: replayed events must not revive a run
// after its finished snapshot has been observed.
const terminals = new Map<string, TerminalRecord>();
// Linger is presentation-only and intentionally separate from tombstones.
const linger = new Map<string, LingerRecord>();
const runScopes = new Map<string, AgentRunScope>();
// Durable-ish remote task state: survives the run's terminal transition and the
// linger window (§7.3：linger 只清 Live 卡片，不清 remoteTask)。Never keyed by
// generation — `eventSeq` is the single ordering axis (§7.3)。
const remoteTasks = new Map<string, RemoteTaskRecord>();
const listeners = new Set<Listener>();
let version = 0;
let clock = () => Date.now();

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 帧 → 视图的 scope 归属判定（§7.2，LOW-2 fail closed）。
 * - 帧 scope 非对象 / 缺 `userId`：无归属可判 ⇒ 丢弃（不 throw、不落库）；
 * - **对话视图**（`scope.dialogId` 有值）：只接受 `event.scope.dialogId` 与之
 *   **精确相等**的帧。缺 `dialogId` 不是通配、不是「以通道归属为准」——
 *   一条没有对话归属的帧会污染当前对话视图（跨对话泄漏），一律丢弃；
 * - **用户级全局视图**（`scope.dialogId` 为空，B10 全局入口）：接受本用户
 *   任意对话的帧（跨对话可发现是功能），但仍不跨用户。
 * 本函数是第二道兜底：即使上层路由被绕过，这里也不放行（两层独立成立）。
 */
function matchesScope(event: AgentRunEvent, scope: AgentRunScope): boolean {
  const wanted: unknown = event.scope;
  if (!isPlainObject(wanted) || typeof wanted.userId !== "string") return false;
  if (wanted.userId !== scope.userId) return false;
  if (scope.dialogId !== undefined) {
    const wantedDialogId = wanted.dialogId;
    if (typeof wantedDialogId !== "string" || wantedDialogId !== scope.dialogId) return false;
  }
  return wanted.workspaceId === undefined || wanted.workspaceId === scope.workspaceId;
}

/**
 * 已存记录 → 视图的 scope 归属判定（读侧投影，与 `matchesScope` 同语义）。
 * 对话视图要求 `stored.dialogId` **精确相等**：owner 不明（缺 `dialogId`）的记录
 * 在对话视图里**不可见**，只在用户级全局视图可见 —— 否则「事件缺 dialogId ⇒
 * 当通配」会让一条无对话归属的记录同时出现在每个对话视图（LOW-2 跨对话泄漏）。
 */
function matchesStoredScope(stored: AgentRunScope, scope: AgentRunScope): boolean {
  if (stored.userId !== scope.userId) return false;
  if (scope.dialogId !== undefined) {
    const storedDialogId = stored.dialogId;
    if (typeof storedDialogId !== "string" || storedDialogId !== scope.dialogId) return false;
  }
  return scope.workspaceId === undefined || stored.workspaceId === scope.workspaceId;
}

function isTerminal(run: AgentRunLifecycleRun) {
  return run.status === "done" || run.status === "failed" || run.status === "cancelled";
}

function notify() {
  version += 1;
  listeners.forEach((listener) => listener());
}

function removeExpiredLinger(now: number): boolean {
  let changed = false;
  for (const [runId, record] of linger) {
    if (now >= (record.run.finishedAt ?? record.run.startedAt) + AGENT_RUN_LINGER_MS) {
      linger.delete(runId);
      changed = true;
    }
  }
  return changed;
}

/**
 * payload 键级白名单（§9.3）：日志正文、`command`/`args`、环境变量、绝对本地
 * 路径**永不落地**。`stage` 用 RemoteTaskStageView（剥掉 `stdoutTail`）；`logs`
 * 只留 `{ available, tailLinesMax }` 上限元数据，任何 `lines` 正文一律丢弃。
 */
const REMOTE_TASK_PAYLOAD_KEYS = [
  "location",
  "process",
  "stage",
  "cost",
  "cleanup",
  "logs",
  "ttlExpiresAt",
] as const;

function sanitizeLogsMeta(value: unknown): RemoteTaskLogsMeta | undefined {
  if (!isPlainObject(value)) return undefined;
  const meta: RemoteTaskLogsMeta = {};
  if (typeof value.available === "boolean") meta.available = value.available;
  if (typeof value.tailLinesMax === "number" && Number.isFinite(value.tailLinesMax)) {
    meta.tailLinesMax = value.tailLinesMax;
  }
  return Object.keys(meta).length > 0 ? meta : undefined;
}

/** 只保留白名单字段；非 cost 的 `null` 视同「未提供」（§3.6）。 */
export function sanitizeRemoteTaskPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of REMOTE_TASK_PAYLOAD_KEYS) {
    const raw = payload[key];
    if (raw === undefined) continue;
    if (raw === null && key !== "cost") continue;
    if (key === "stage") {
      if (!isPlainObject(raw)) continue;
      const { stdoutTail: _droppedLogBody, ...rest } = raw;
      out.stage = rest;
      continue;
    }
    if (key === "logs") {
      const meta = sanitizeLogsMeta(raw);
      if (!meta) continue;
      out.logs = meta;
      continue;
    }
    out[key] = raw;
  }
  return out;
}


/**
 * Web 侧 remote_task 的值级 merge **只有 core 一份真值**（审查 M1）：四个
 * projector、非法子对象的 `?? previous` 回退、location 证据不全时 fail-closed
 * 为 `{ status: "unknown" }`，全部复用 `mergeRemoteTaskView`（TUI 同源）。
 * 本模块**不得**再写第二份 spread merge —— 否则畸形
 * `location: { status: "ready", 缺 workspace }` 会原样入库，被 `locationUnknown`
 * 误判为 live（假 spinner / 走秒），而 TUI 侧已 fail-closed。
 * `logs` 是 web 侧展示元数据（core 无此字段），在 core merge 结果之上单独合并；
 * 键级白名单仍由 `sanitizeRemoteTaskPayload` 先行把关（§9.3）。
 */
function mergeRemoteTaskState(
  previous: RemoteTaskState | undefined,
  incoming: Record<string, unknown>,
  runId: string,
): RemoteTaskState {
  const cleaned = stripUndefined(sanitizeRemoteTaskPayload(incoming));
  const previousView: RemoteTaskView | undefined = previous
    ? {
        runId: previous.runId,
        ...(previous.eventSeq !== undefined ? { eventSeq: previous.eventSeq } : {}),
        location: previous.location ?? { status: "unknown" },
        ...(previous.process ? { process: previous.process } : {}),
        ...(previous.stage ? { stage: previous.stage } : {}),
        ...(previous.cost !== undefined ? { cost: previous.cost } : {}),
        ...(previous.cleanup ? { cleanup: previous.cleanup } : {}),
        ...(previous.ttlExpiresAt ? { ttlExpiresAt: previous.ttlExpiresAt } : {}),
      }
    : undefined;
  const merged: RemoteTaskView = mergeRemoteTaskView(
    previousView,
    { ...cleaned, runId } as Partial<RemoteTaskView>,
  );
  const logs = "logs" in cleaned ? (cleaned.logs as RemoteTaskLogsMeta | undefined) : previous?.logs;
  return { ...merged, ...(logs ? { logs } : {}) };
}

/**
 * `remote_task` 分支（§7.3）：**豁免** startedAt 代际拒绝与 tombstone —— run 进入
 * 终态之后的 cleanup 终局确认、失联转 unknown / 需处置等更新不得被静默丢弃。
 * 防重放改用任务内单调递增的 `eventSeq`：`eventSeq <= lastAcceptedSeq` 一律拒绝。
 */
function applyRemoteTaskEvent(event: AgentRunStreamRemoteTaskEvent, scope?: AgentRunScope): boolean {
  if (scope && !matchesScope(event, scope)) return false;
  const payload = event.task as unknown;
  if (!isPlainObject(payload)) return false;
  const runId = payload.runId;
  const eventSeq = payload.eventSeq;
  // 无 `eventSeq` 的帧无法判重 → fail closed 忽略（default-ignore，§3.5）。
  if (typeof runId !== "string" || runId.length === 0) return false;
  if (typeof eventSeq !== "number" || !Number.isFinite(eventSeq)) return false;

  const existing = remoteTasks.get(runId);
  if (existing && eventSeq <= existing.eventSeq) return false;

  // M1：值级 merge 只有 core 一份真值，本模块不再写第二份 spread merge。
  const task = mergeRemoteTaskState(existing?.task, payload, runId);
  const now = clock();
  remoteTasks.set(runId, {
    runId,
    task,
    eventSeq,
    startedAt: existing?.startedAt ?? runs.get(runId)?.run.startedAt,
    lastEvidenceAt: existing ? Math.max(existing.lastEvidenceAt, now) : now,
    scope: scope ?? event.scope,
  });
  notify();
  return true;
}

/** Narrow event adapter: all SSE wiring should call this function. */
export function applyAgentRunEvent(event: AgentRunEvent, scope?: AgentRunScope): boolean {
  // 契约护栏 1（§3.5）：未知 `type` 一律 **default-ignore** —— 不 throw、不落库、
  // 不改状态；本行之外的成员在此返回 false 即为「忽略」。
  //
  // 契约衔接（§7.3 / §10.1 第 1 行）：`remote_task` 分支（eventSeq 判重 +
  // stripUndefined 增量 merge + 豁免 tombstone 代际拒绝，终态后状态落 `remoteTask`
  // 子对象）在下方 `applyRemoteTaskEvent` 中落地。
  if (event.type === "remote_task") return applyRemoteTaskEvent(event, scope);
  // 生产者若发出其它未登记类型帧，仍会被此处按「忽略」处理。
  if (event.type !== "agent_run" || (scope && !matchesScope(event, scope))) return false;

  const { run, phase } = event;
  const existing = runs.get(run.runId);
  const terminal = terminals.get(run.runId);

  // A newer startedAt explicitly begins a new generation for the same id.
  if (phase === "started" && terminal && run.startedAt > terminal.startedAt) {
    terminals.delete(run.runId);
    linger.delete(run.runId);
  } else if (terminal && run.startedAt <= terminal.startedAt) {
    return false;
  }

  if (existing) {
    if (run.startedAt < existing.run.startedAt) return false;
    if (run.startedAt === existing.run.startedAt && phase === "started" && existing.phase !== "started") return false;
  }

  if (isTerminal(run)) {
    const current = existing?.run;
    const finishedAt = Math.max(run.finishedAt ?? run.startedAt, current?.finishedAt ?? 0);
    const finishedRun = { ...current, ...run, finishedAt };
    terminals.set(run.runId, { startedAt: run.startedAt, finishedAt, scope: event.scope });
    linger.set(run.runId, { run: finishedRun, scope: event.scope });
    runs.delete(run.runId);
    runScopes.delete(run.runId);
    notify();
    return true;
  }

  const isNewGeneration = phase === "started" && !!existing && run.startedAt > existing.run.startedAt;
  const previous = isNewGeneration ? undefined : existing?.run;
  const folded: AgentRunLifecycleRun = { ...previous, ...run };
  const toolCallCount = Math.max(previous?.toolCallCount ?? 0, run.toolCallCount ?? 0);
  if (toolCallCount > 0) folded.toolCallCount = toolCallCount;
  else delete folded.toolCallCount;
  runs.set(run.runId, { run: folded, phase });
  runScopes.set(run.runId, event.scope);
  const remote = remoteTasks.get(run.runId);
  // Live 快照的 startedAt 是任务耗时的唯一可用基准（服务端 payload 不带它）。
  if (remote) remote.startedAt = remote.startedAt ?? run.startedAt;
  notify();
  return true;
}

export function getAgentRunsVersion(): number { return version; }
export function tickAgentRuns(now = clock()): void {
  if (runs.size > 0 || remoteTasks.size > 0 || removeExpiredLinger(now)) notify();
}

/** Returns active runs plus terminal snapshots still inside the presentation linger window. */
export function getAgentRuns(scope?: AgentRunScope, now = clock()): AgentRunLifecycleRun[] {
  if (!scope || !scope.userId) return [];
  removeExpiredLinger(now);
  const active = [...runs.entries()]
    .filter(([runId]) => {
      const runScope = runScopes.get(runId);
      return !!runScope && matchesStoredScope(runScope, scope);
    })
    .map(([, record]) => record.run);
  const terminal = [...linger.values()]
    .filter((record) => matchesStoredScope(record.scope, scope))
    .map((record) => record.run);
  return [...active, ...terminal].sort(
    (a, b) =>
      a.startedAt - b.startedAt ||
      // 同毫秒 startedAt 时用 runId 兜底，保证顺序稳定（review LOW）。
      (a.runId < b.runId ? -1 : a.runId > b.runId ? 1 : 0),
  );
}

/**
 * `reclaimed`（TTL 到期回收）**必须**与 `terminal`（已停止）分开：`expired`
 * 是「按 TTL 回收」，不是「执行者已停止」（见 `getRemoteTaskStopView`）。
 * 合并成一个值会让同一张卡并排出现「已停止」与「≠ 已停止」（审查 M2）。
 */
export type RemoteTaskActivity = "live" | "unknown" | "requires_action" | "terminal" | "reclaimed";

export type RemoteTaskCard = {
  runId: string;
  task: RemoteTaskState;
  eventSeq: number;
  lastEvidenceAt: number;
  /** 证据陈旧（≥ REMOTE_TASK_UNKNOWN_AFTER_MS 无证据，或 location 投影为 unknown） */
  evidenceStale: boolean;
  /** §8.1 第二级：≥15 分钟无证据 → 「需处置」 */
  requiresAction: boolean;
  /** §8.2：unknown / 需处置时 elapsed **冻结于 `lastEvidenceAt`**，不得继续走秒 */
  elapsedFrozen: boolean;
  /** 冻结前的 elapsed 基准时刻；未冻结时等于 `now` */
  elapsedReferenceAt: number;
  /** 冻结基准下的耗时；缺少 startedAt 时为 undefined（不猜） */
  elapsedMs?: number;
  /** `null` / 缺失 → 显式未知，UI 不得显示 0（§8.2） */
  cost: RemoteTaskCostView | undefined;
  costUnknown: boolean;
  activity: RemoteTaskActivity;
  /** unknown 必进 attention（§8.1），需处置同列且置顶 */
  attention: boolean;
  /** §6.1 D4：任务所属对话（跨对话入口据此给出「打开对话」） */
  ownerDialogId?: string;
  /** §6.1 D4：owner 不明（`owner === null` 语义）—— **不得**因此没收停止权，仅需二次确认 */
  ownerUnknown: boolean;
};

/**
 * 远程任务读侧投影（§7.2/§8.2）。与 `getAgentRuns` 独立：run 终态 + linger 过期
 * 之后本投影**仍然返回**，这是「agent 结束后仍可见」与「刷新后仍可见」的载体。
 */
export function getRemoteTasks(scope?: AgentRunScope, now = clock()): RemoteTaskCard[] {
  if (!scope || !scope.userId) return [];
  const cards: RemoteTaskCard[] = [];
  for (const record of remoteTasks.values()) {
    if (!matchesStoredScope(record.scope, scope)) continue;
    const cleanupStatus = record.task.cleanup?.status;
    // `expired` 是「按 TTL 到期回收」，**不是**「执行者已停止」：单列 reclaimed，
    // 否则会与 getRemoteTaskStopView 的「≠ 已停止」文案在同一张卡上打架（M2）。
    const reclaimed = cleanupStatus === "expired";
    const terminal = cleanupStatus === "stopped" || reclaimed;
    const idleMs = Math.max(0, now - record.lastEvidenceAt);
    const requiresAction = !terminal && idleMs >= REMOTE_TASK_REQUIRES_ACTION_MS;
    const locationUnknown = record.task.location === undefined || record.task.location.status === "unknown";
    const stale = !terminal && (idleMs >= REMOTE_TASK_UNKNOWN_AFTER_MS);
    const activity: RemoteTaskActivity = reclaimed
      ? "reclaimed"
      : terminal
        ? "terminal"
        : requiresAction
          ? "requires_action"
          : stale || locationUnknown
            ? "unknown"
            : "live";
    // §8.2：unknown / 需处置 / 终局 → elapsed 冻结在 lastEvidenceAt；仅 live 走时。
    const elapsedFrozen = activity !== "live";
    const elapsedReferenceAt = elapsedFrozen ? record.lastEvidenceAt : now;
    const cost = record.task.cost;
    const costUnknown = !(cost && typeof cost.amount === "number");
    cards.push({
      runId: record.runId,
      task: record.task,
      eventSeq: record.eventSeq,
      lastEvidenceAt: record.lastEvidenceAt,
      evidenceStale: stale,
      requiresAction,
      elapsedFrozen,
      elapsedReferenceAt,
      elapsedMs: record.startedAt === undefined
        ? undefined
        : Math.max(0, elapsedReferenceAt - record.startedAt),
      cost,
      costUnknown,
      activity,
      attention: activity === "unknown" || activity === "requires_action",
      ownerDialogId: record.scope.dialogId,
      ownerUnknown: record.scope.dialogId === undefined,
    });
  }
  return cards.sort(
    (a, b) =>
      (a.requiresAction === b.requiresAction ? 0 : a.requiresAction ? -1 : 1) ||
      a.lastEvidenceAt - b.lastEvidenceAt ||
      (a.runId < b.runId ? -1 : a.runId > b.runId ? 1 : 0),
  );
}

/** §8.2：unknown / 需处置 / 终局一律**禁活跃 spinner**，文案不得写「运行中」。 */
export function remoteTaskCardUseSpinner(activity: RemoteTaskActivity): boolean {
  return activity === "live";
}

export function formatRemoteTaskActivityLabel(activity: RemoteTaskActivity): string {
  if (activity === "live") return "运行中";
  if (activity === "requires_action") return "需处置（失联）";
  // expired 是 TTL 回收而非停止：不得复用「已停止」（M2）
  if (activity === "reclaimed") return "已回收";
  if (activity === "terminal") return "已停止";
  return "未知（失联）";
}

/** §8.1 文案：「最后心跳 N 前」。 */
export function formatRemoteTaskHeartbeat(lastEvidenceAt: number, now = clock()): string {
  const seconds = Math.max(0, Math.floor((now - lastEvidenceAt) / 1000));
  if (seconds < 60) return `最后心跳 ${seconds}s 前`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `最后心跳 ${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  return `最后心跳 ${hours} 小时前`;
}

/** §8.2：`cost` 未知**显式显示未知**，绝不显示 0。 */
export function formatRemoteTaskCost(cost: RemoteTaskCostView | undefined): string {
  if (cost === null || cost === undefined) return "费用 未知";
  if (typeof cost.amount !== "number") return "费用 未知";
  return `费用 ${cost.amount}${cost.currency ? ` ${cost.currency}` : ""}`;
}

/**
 * §7.2 正拉入口：把 `controlAgentRun { action:"list" }` 的结果经**同一汇聚点**
 * （`applyAgentRunEvent`）灌入 store。只 merge、不产生新状态轴；不新建第二记录
 * 类型，也不清空既有状态（SSE 更新的代际/`eventSeq` 规则仍然优先）。
 */
export type ServerAgentRunRecord = {
  runId?: unknown;
  status?: unknown;
  agentKey?: unknown;
  title?: unknown;
  startedAt?: unknown;
  finishedAt?: unknown;
  updatedAt?: unknown;
  toolCallCount?: unknown;
  lastToolNames?: unknown;
  dialogId?: unknown;
  remoteTask?: unknown;
};

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

/**
 * 服务端状态 → 客户端 run 轴。未知/`pending`/`orphaned` 等一律**不冒充 running**
 * 的活跃语义之外的值：`pending` 视为未结束，`orphaned`（进程凭空消失）视为终态
 * 取消（§8.1「不置 failed」只约束失联任务，不约束这里）。
 */
function mapServerRunStatus(status: unknown): AgentRunLifecycleRun["status"] {
  if (status === "done") return "done";
  if (status === "failed") return "failed";
  if (status === "cancelled" || status === "orphaned") return "cancelled";
  return "running";
}

function extractServerRunRecords(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload.filter(isPlainObject);
  if (!isPlainObject(payload)) return [];
  const data = isPlainObject(payload.data) ? payload.data : undefined;
  const runs = data && Array.isArray(data.runs) ? data.runs : Array.isArray(payload.runs) ? payload.runs : undefined;
  if (!runs) return [];
  return runs.filter(isPlainObject);
}

/** 返回：成功灌入的 run 记录数（被代际/`eventSeq` 规则拒绝的不计）。 */
export function hydrateFromServer(payload: unknown, scope?: AgentRunScope): number {
  // fail closed：没有 userId 域就无法确定归属，宁可不灌（§6.1 D4）。
  if (!scope?.userId) return 0;
  const records = extractServerRunRecords(payload);
  let appliedCount = 0;
  for (const record of records) {
    const runId = asNonEmptyString(record.runId);
    if (!runId) continue;
    const startedAt = asFiniteNumber(record.startedAt) ?? asFiniteNumber(record.updatedAt) ?? clock();
    const status = mapServerRunStatus(record.status);
    const finishedAt = asFiniteNumber(record.finishedAt);
    const toolCallCount = asFiniteNumber(record.toolCallCount);
    const agentName = asNonEmptyString(record.agentKey);
    const title = asNonEmptyString(record.title);
    const dialogId = asNonEmptyString(record.dialogId) ?? scope.dialogId;
    const scoped: AgentRunScope = {
      userId: scope.userId,
      ...(dialogId ? { dialogId } : {}),
      ...(scope.workspaceId ? { workspaceId: scope.workspaceId } : {}),
    };
    const run: AgentRunLifecycleRun = {
      runId,
      status,
      startedAt,
      ...(finishedAt !== undefined ? { finishedAt } : {}),
      ...(toolCallCount !== undefined ? { toolCallCount } : {}),
      ...(agentName ? { agentName } : {}),
      ...(title ? { title } : {}),
    };
    const applied = applyAgentRunEvent(
      { type: "agent_run", phase: isTerminal(run) ? "finished" : "updated", scope: scoped, run },
      scope,
    );
    if (applied) appliedCount += 1;

    const remoteTask = record.remoteTask;
    if (isPlainObject(remoteTask)) {
      const eventSeq = asFiniteNumber(remoteTask.eventSeq) ?? 0;
      applyAgentRunEvent(
        {
          type: "remote_task",
          phase: "updated",
          scope: scoped,
          task: { ...remoteTask, runId, eventSeq } as AgentRunStreamRemoteTaskEvent["task"],
        },
        scope,
      );
      const stored = remoteTasks.get(runId);
      if (stored) stored.startedAt = stored.startedAt ?? startedAt;
    }
  }
  return appliedCount;
}

/* ═══ §6.2③ 用户逃生门：停止请求（本地回执轴，跨对话可用） ═══ */

/**
 * §6.2③ 本地 stop 请求记录。
 * - `acknowledgedAt === null` ⇒ **停止未确认**，UI 不得显示为已停止（§6.3）；
 * - 与 owner 无关：`owner === null` / owner 不明的任务同样可发起（§6.1 D4）。
 */
export type RemoteTaskStopRequest = {
  runId: string;
  requestedAt: number;
  acknowledgedAt: number | null;
  /** §6.2② 真实云到期时刻（未提供时为 undefined，禁止客户端自造 30 分钟） */
  ttlExpiresAt?: number;
  /** 服务端已把 intent 落库（§6.2① `intentStored`） */
  intentStoredAt?: number;
  /** 投递失败（§6.3：不得吞错伪装成功；intent 仍在，等待重投递） */
  deliveryFailedAt?: number;
};

const stopRequests = new Map<string, RemoteTaskStopRequest>();

export function getRemoteTaskStopRequest(runId: string): RemoteTaskStopRequest | undefined {
  return stopRequests.get(runId);
}

/**
 * §6.2② 真实云到期时刻：优先读取服务端下发/上报的真实云到期时刻（如 `cleanup.ttlExpiresAt` 或 `ttlMinutes` 计算值）；
 * 若上游未提供真实云期限，展示“未知”（返回 undefined），禁止客户端自造 30 分钟承诺。
 */
export function getRemoteTaskTtlExpiresAt(runId: string, now = clock()): number | undefined {
  const record = remoteTasks.get(runId);
  if (!record) return undefined;
  const rawExpiresAt =
    record.task.cleanup?.ttlExpiresAt ??
    record.task.ttlExpiresAt ??
    (record.task as { ttlExpiresAt?: unknown }).ttlExpiresAt;
  if (rawExpiresAt) {
    const parsed = typeof rawExpiresAt === "number"
      ? rawExpiresAt
      : Date.parse(rawExpiresAt);
    if (Number.isFinite(parsed)) return parsed;
  }
  const rawTtlMinutes = (record.task.cleanup as { ttlMinutes?: unknown })?.ttlMinutes
    ?? (record.task as { ttlMinutes?: unknown })?.ttlMinutes;
  if (typeof rawTtlMinutes === "number" && Number.isFinite(rawTtlMinutes) && rawTtlMinutes > 0) {
    const base = record.startedAt ?? record.lastEvidenceAt ?? now;
    return base + rawTtlMinutes * 60_000;
  }
  return undefined;
}

/**
 * 发起 stop：**先落本地记录**（网络失败也不丢用户意图），再等执行者回执。
 * 幂等：重复请求保留首次 `requestedAt`（§6.3 对终态 run 重复 stop 原样返回）。
 */
export function requestRemoteTaskStop(
  runId: string,
  options: { now?: number } = {},
): RemoteTaskStopRequest {
  const now = options.now ?? clock();
  const existing = stopRequests.get(runId);
  const ttlExpiresAt = existing?.ttlExpiresAt ?? getRemoteTaskTtlExpiresAt(runId, now);
  const next: RemoteTaskStopRequest = {
    runId,
    requestedAt: existing?.requestedAt ?? now,
    acknowledgedAt: existing?.acknowledgedAt ?? null,
    ...(ttlExpiresAt !== undefined ? { ttlExpiresAt } : {}),
    ...(existing?.intentStoredAt !== undefined ? { intentStoredAt: existing.intentStoredAt } : {}),
    ...(existing?.deliveryFailedAt !== undefined ? { deliveryFailedAt: existing.deliveryFailedAt } : {}),
  };
  stopRequests.set(runId, next);
  notify();
  return next;
}

export type RemoteTaskStopReceipt = {
  accepted?: boolean;
  pending?: boolean;
  intentStored?: boolean;
};

/** 传输回执合并：只影响回执字段，不改「用户已发起」这一事实。 */
export function applyRemoteTaskStopReceipt(
  runId: string,
  receipt: RemoteTaskStopReceipt & { deliveryFailed?: boolean },
  now = clock(),
): RemoteTaskStopRequest {
  const current = stopRequests.get(runId) ?? requestRemoteTaskStop(runId, { now });
  const next: RemoteTaskStopRequest = { ...current };
  if (receipt.deliveryFailed) {
    next.deliveryFailedAt = now;
  } else {
    delete next.deliveryFailedAt;
    if (receipt.intentStored || receipt.accepted) next.intentStoredAt = now;
  }
  stopRequests.set(runId, next);
  notify();
  return next;
}

/** 执行者回执（server 写 `stopIntent.ackAt` 后到达）。未确认前一律 pending。 */
export function acknowledgeRemoteTaskStop(runId: string, now = clock()): RemoteTaskStopRequest {
  const current = stopRequests.get(runId) ?? requestRemoteTaskStop(runId, { now });
  const next: RemoteTaskStopRequest = { ...current, acknowledgedAt: now };
  stopRequests.set(runId, next);
  notify();
  return next;
}

export type RemoteTaskStopPhase =
  | "not_requested"
  | "awaiting_executor"
  | "ttl_elapsed"
  | "unconfirmed"
  | "acknowledged"
  | "reclaimed";

export type RemoteTaskStopView = {
  runId: string;
  phase: RemoteTaskStopPhase;
  /** §6.1 D4：owner 不明需二次确认，但**不得**因此不给 stop 入口 */
  requiresSecondConfirm: boolean;
  canRequestStop: boolean;
  /** 回执文案（unknown 发起后必须是「停止请求已记录，等待执行者回归」+ TTL 到期时刻） */
  label: string;
  requestedAt?: number;
  acknowledgedAt: number | null;
  ttlExpiresAt?: number;
  ttlLabel: string;
};

/** 本地时钟刻度 HH:MM —— TTL 到期时刻的可读化。 */
export function formatRemoteTaskStopClock(ts: number | undefined): string {
  if (ts === undefined || !Number.isFinite(ts)) return "未知";
  const date = new Date(ts);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function formatRemoteTaskStopDeadline(ts: number | undefined, now: number): string {
  if (ts === undefined || !Number.isFinite(ts)) return "TTL 到期 未知";
  if (now >= ts) return `TTL 到期 ${formatRemoteTaskStopClock(ts)}（已到期）`;
  const minutes = Math.max(1, Math.ceil((ts - now) / 60_000));
  return `TTL 到期 ${formatRemoteTaskStopClock(ts)}（还剩 ${minutes} 分钟）`;
}

/**
 * §6.2③ + §6.3 停止回执投影，全部基于**显式证据**：
 * - `cleanup.status === "stopped"` 且 `pending !== true` ⇒ 已确认停止；
 * - `stop-unverified` 或 `pending === true` ⇒ **停止未确认**（绝不显示已停止）；
 * - `expired` ⇒ 已按 TTL 到期回收（**≠** 已停止）。
 */
export function getRemoteTaskStopView(card: RemoteTaskCard, now = clock()): RemoteTaskStopView {
  const request = stopRequests.get(card.runId);
  const cleanup = card.task.cleanup;
  const ttlExpiresAt = getRemoteTaskTtlExpiresAt(card.runId, now) ?? request?.ttlExpiresAt;
  const ttlLabel = formatRemoteTaskStopDeadline(ttlExpiresAt, now);
  const base = {
    runId: card.runId,
    requiresSecondConfirm: card.ownerUnknown,
    requestedAt: request?.requestedAt,
    acknowledgedAt: request?.acknowledgedAt ?? null,
    ...(ttlExpiresAt !== undefined ? { ttlExpiresAt } : {}),
    ttlLabel,
  };
  if (cleanup?.status === "expired") {
    return { ...base, phase: "reclaimed", canRequestStop: false,
      label: `已按 TTL 到期回收（${formatRemoteTaskStopClock(ttlExpiresAt)}）` };
  }
  if (cleanup?.status === "stopped" && cleanup.pending !== true) {
    return { ...base, phase: "acknowledged", canRequestStop: false,
      label: `执行者已确认停止${request ? `（已请求 ${formatRemoteTaskStopClock(request.requestedAt)}）` : ""}` };
  }
  if (cleanup?.status === "stop-unverified" || cleanup?.pending === true) {
    return { ...base, phase: "unconfirmed", canRequestStop: true,
      label: `停止未确认，等待执行者回报 · ${ttlLabel}` };
  }
  if (!request) {
    return { ...base, phase: "not_requested", canRequestStop: true, label: "未请求停止" };
  }
  const awaiting = `停止请求已记录，等待执行者回归（已请求 ${formatRemoteTaskStopClock(request.requestedAt)}）· ${ttlLabel}`;
  if (ttlExpiresAt !== undefined && now >= ttlExpiresAt) {
    return { ...base, phase: "ttl_elapsed", canRequestStop: true, label: `停止请求已记录，等待执行者回归 · ${ttlLabel}` };
  }
  return { ...base, phase: "awaiting_executor", canRequestStop: true, label: awaiting };
}

export function subscribeAgentRuns(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearAgentRunsForTests(): void {
  runs.clear();
  terminals.clear();
  linger.clear();
  runScopes.clear();
  remoteTasks.clear();
  stopRequests.clear();
  clock = () => Date.now();
  notify();
}

/** Test seam for deterministic expiry; production uses Date.now. */
export function setAgentRunsClockForTests(nextClock: (() => number) | undefined): void {
  clock = nextClock ?? (() => Date.now());
}

export function getAgentRunElapsedMs(run: AgentRunLifecycleRun, now = clock()): number {
  return Math.max(0, (run.finishedAt ?? now) - run.startedAt);
}

export function formatAgentRunElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h${String(minutes).padStart(2, "0")}m`;
  if (minutes > 0) return `${minutes}m${String(seconds).padStart(2, "0")}s`;
  return `${seconds}s`;
}
