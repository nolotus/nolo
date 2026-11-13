/**
 * Agent-run 生命周期状态的**唯一业务分类真值**（core，无 UI/i18n 依赖）。
 *
 * 背景：CLI（`packages/cli/client/toolOutput.ts`）与 Web
 * （`packages/chat/messages/toolPresentation.ts` /
 * `packages/chat/messages/web/agentRunStartReceipt.ts`）都要回答同一个问题——
 * 「这个 run 状态算正常还是异常」。历史上两端各自维护白名单，导致
 * `done` / `completed` 在 Web 属正常、在 CLI 属未登记：同一个启动回执在两端
 * 一个被省略、一个被保留。分类只此一份，两端消费同一张表。
 *
 * 分类口径（三档 + 兜底未知）：
 * - `active`：明确在跑/已派发等待（pending、queued、started、running）。
 * - `succeeded`：明确成功终态（done、completed）。
 * - `abnormal`：明确异常/终止（failed、timeout、killed、cancelled、
 *   cancelling、orphaned、not_found、unknown）。
 * - `unknown`：空值或**未登记**状态（含未来新增）。消费方必须按「保留」处理：
 *   漏登记一个新状态时的失效方向是「多显示一行回执」，不是「静默隐藏」。
 *
 * 本模块同时承载两个**不同**的业务决策，但它们共用同一张表，不另建第二份
 * 生命周期状态语义：
 * - `isAgentRunStatusNormal`：允许「成功启动回执」被固定运行区去重的资格
 *   （active 或 succeeded）。两端共用。
 * - `isAgentRunStartFailureStatus`：启动卡片用「失败标题」的语义（只有
 *   failed / timeout / orphaned / cancelled / killed）。这是标题文案决策，
 *   与去重资格不同：`done` 不是失败标题，但资格上属正常的成功回执。
 */

export type AgentRunStatusKind = "active" | "succeeded" | "abnormal" | "unknown";

type RegisteredKind = Exclude<AgentRunStatusKind, "unknown">;

type AgentRunStatusRow = {
  kind: RegisteredKind;
  /** 启动卡片是否用「启动失败」标题；不设即为普通启动标题。 */
  startFailureLabel?: true;
};

/**
 * 状态 → 分类的唯一表。增删状态只改这里：kind 决定去重资格，`startFailureLabel`
 * 决定失败标题，二者从同一行读出。
 */
const AGENT_RUN_STATUS_TABLE: Record<string, AgentRunStatusRow> = {
  pending: { kind: "active" },
  queued: { kind: "active" },
  started: { kind: "active" },
  running: { kind: "active" },
  done: { kind: "succeeded" },
  completed: { kind: "succeeded" },
  failed: { kind: "abnormal", startFailureLabel: true },
  timeout: { kind: "abnormal", startFailureLabel: true },
  killed: { kind: "abnormal", startFailureLabel: true },
  cancelled: { kind: "abnormal", startFailureLabel: true },
  orphaned: { kind: "abnormal", startFailureLabel: true },
  cancelling: { kind: "abnormal" },
  not_found: { kind: "abnormal" },
  unknown: { kind: "abnormal" },
};

function normalizeStatus(status?: string | null): string {
  return typeof status === "string" ? status.trim() : "";
}

/** 状态 → 业务分类；空值与未登记状态返回 `"unknown"`（不是 `active`）。 */
export function resolveAgentRunStatusKind(
  status?: string | null,
): AgentRunStatusKind {
  const key = normalizeStatus(status);
  if (!key) return "unknown";
  return AGENT_RUN_STATUS_TABLE[key]?.kind ?? "unknown";
}

/**
 * 是否属「明确正常」一侧（`active` 或 `succeeded`）——即允许成功启动回执被
 * 固定运行区去重的资格。未登记状态返回 `false` → 调用方保留回执。
 */
export function isAgentRunStatusNormal(status?: string | null): boolean {
  const kind = resolveAgentRunStatusKind(status);
  return kind === "active" || kind === "succeeded";
}

/**
 * 启动卡片是否该用「启动失败」标题。只认 failed / timeout / orphaned /
 * cancelled / killed——比 `isAgentRunStatusNormal` 的补集更窄：`cancelling` /
 * `not_found` / 未登记状态都不是「启动失败」，标题保持普通启动文案。
 */
export function isAgentRunStartFailureStatus(status?: string | null): boolean {
  const key = normalizeStatus(status);
  if (!key) return false;
  return AGENT_RUN_STATUS_TABLE[key]?.startFailureLabel === true;
}
