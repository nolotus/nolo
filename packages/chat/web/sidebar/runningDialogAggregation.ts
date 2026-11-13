// ── 运行状态聚合（纯模型，无 React） ───────────────────────────────────────
// 单一状态源：create/space/spaceDialogStore 的 SSE 状态表（dialogId → status）。
// 本模块**不新建状态源、不缓存历史**，只在既有状态表上做「按既有关系模型向上汇总」。
//
// 状态语义（严格三态，unknown 不判终态、也不伪造运行）：
// - "running"            → 正在运行（唯一算「真运行」的状态）
// - "pending" / "queued" → 排队中（独立状态，**不算运行**）
// - done/failed/…        → 终态
// - 未上报 / 其它未知值   → unknown（既不判终态，也不当运行）
//
// 身份：dialog key 复用 database/dialogKey.parseDialogKey 的同一接口
// （`dialog-<userId>-<dialogId>`，userId 可含 '-'），不另造 key 格式、不截断连字符。
//
// 祖先汇总复用 sidebarDialogHierarchy.buildDialogHierarchy：它已负责同 owner /
// 同 origin 校验、自引用剔除与沿父链 cycle 防护；本模块在其之上只做向上标记，
// 并自带 seen 集合兜底，循环必终止。

import { parseDialogKey } from "database/dialogKey";
import { buildDialogHierarchy, type HierarchySidebarItem } from "./sidebarDialogHierarchy";

export type DialogStatusMap = Readonly<Record<string, string>>;

/** 参与聚合的最小条目形状（额外字段一律运行时读取，不进类型）。 */
export type AggregationItem = {
  contentKey: string;
  type?: string;
};

export type DialogRunState = "running" | "pending" | "terminal" | "unknown";

const RUNNING_STATUS = "running";
const PENDING_STATUSES = new Set(["pending", "queued"]);
const TERMINAL_STATUSES = new Set([
  "done",
  "failed",
  "completed",
  "succeeded",
  "cancelled",
  "canceled",
]);

const fieldOf = (item: unknown, field: string): unknown => {
  if (!item || typeof item !== "object") return undefined;
  return (item as Record<string, unknown>)[field];
};

/** 状态 → 三态分类。unknown 既不是终态，也不是运行。 */
export const classifyDialogStatus = (status: string | undefined): DialogRunState => {
  if (status === undefined) return "unknown";
  const normalized = status.trim().toLowerCase();
  if (!normalized) return "unknown";
  if (normalized === RUNNING_STATUS) return "running";
  if (PENDING_STATUSES.has(normalized)) return "pending";
  if (TERMINAL_STATUSES.has(normalized)) return "terminal";
  return "unknown";
};

/** 只有显式 "running" 才算真运行。 */
export const isRunningStatus = (status: string | undefined): boolean =>
  classifyDialogStatus(status) === "running";

export const isTerminalStatus = (status: string | undefined): boolean =>
  classifyDialogStatus(status) === "terminal";

/**
 * contentKey → 裸 dialogId。复用 parseDialogKey：
 * userId 可含 '-'，dialogId 取最后一个 '-' 之后的完整后缀（不截断连字符）。
 */
export const dialogIdOfContentKey = (contentKey: string): string | null =>
  parseDialogKey(contentKey)?.dialogId ?? null;

/** 状态表可能按 contentKey 或裸 dialogId 落键，两种都查。 */
export const statusOfDialog = (
  statuses: DialogStatusMap,
  contentKey: string,
): string | undefined => {
  const direct = statuses[contentKey];
  if (direct !== undefined) return direct;
  const dialogId = dialogIdOfContentKey(contentKey);
  return dialogId ? statuses[dialogId] : undefined;
};

const isDialogItem = (item: AggregationItem): boolean => item.type === "dialog";

/** 自身状态为「正在运行」的对话 key 集合（pending / unknown / 终态都不算）。 */
export const collectRunningDialogKeys = (
  items: readonly AggregationItem[],
  statuses: DialogStatusMap,
): Set<string> => {
  const running = new Set<string>();
  for (const item of items) {
    if (!isDialogItem(item)) continue;
    if (isRunningStatus(statusOfDialog(statuses, item.contentKey))) running.add(item.contentKey);
  }
  return running;
};

/**
 * 对话 → 直接父对话。只认 buildDialogHierarchy 认可的父子关系
 * （同 owner / 同 origin / 同 space 域，且已剔除自引用与环）。
 */
const buildParentMap = (dialogs: readonly unknown[]): Map<string, string> => {
  const hierarchy = buildDialogHierarchy(dialogs as unknown as readonly HierarchySidebarItem[]);
  const parent = new Map<string, string>();
  for (const [parentKey, children] of hierarchy.childrenOf) {
    for (const child of children) parent.set(child, parentKey);
  }
  return parent;
};

/**
 * 自身或子树内有「正在运行」对话的节点集合（自底向上汇总）。
 * @param parentMap 可注入的父子关系；缺省时由 buildDialogHierarchy 推导。
 */
export const aggregateRunningAncestors = (
  items: readonly AggregationItem[],
  statuses: DialogStatusMap,
  parentMap?: ReadonlyMap<string, string>,
): Map<string, boolean> => {
  const dialogs = items.filter(isDialogItem);
  const running = collectRunningDialogKeys(items, statuses);
  const parent = parentMap ?? buildParentMap(dialogs);
  const aggregated = new Map<string, boolean>();
  for (const key of running) {
    let current: string | undefined = key;
    const seen = new Set<string>();
    while (current && !seen.has(current)) {
      seen.add(current);
      aggregated.set(current, true);
      current = parent.get(current);
    }
  }
  return aggregated;
};

const primaryAgentKeyOf = (item: AggregationItem): string | null => {
  const raw = fieldOf(item, "primaryAgentKey");
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
};

const originOf = (item: AggregationItem): string => {
  const raw = fieldOf(item, "serverOrigin");
  return typeof raw === "string" ? raw.replace(/\/+$/, "") : "";
};

const ownerOf = (item: AggregationItem): string => {
  // 复用 MyContentListItem 的既有字段名（userId），不另造 ownerUserId。
  const raw = fieldOf(item, "userId");
  return typeof raw === "string" ? raw : "";
};

/**
 * agent 维度的聚合进行中状态。
 * 命中条件：agent 自身在跑，或其主对话（primaryAgentKey 指向该 agent，且同
 * owner / 同 origin）自身或子树里有「正在运行」的对话。
 */
export const aggregateRunningAgentKeys = (
  items: readonly AggregationItem[],
  statuses: DialogStatusMap,
  parentMap?: ReadonlyMap<string, string>,
): Set<string> => {
  const aggregated = aggregateRunningAncestors(items, statuses, parentMap);
  const runningAgents = new Set<string>();
  for (const agent of items) {
    if (agent.type !== "agent") continue;
    if (isRunningStatus(statusOfDialog(statuses, agent.contentKey))) {
      runningAgents.add(agent.contentKey);
      continue;
    }
    for (const dialog of items) {
      if (!isDialogItem(dialog)) continue;
      if (primaryAgentKeyOf(dialog) !== agent.contentKey) continue;
      if (originOf(dialog) !== originOf(agent)) continue;
      const dialogOwner = ownerOf(dialog);
      const agentOwner = ownerOf(agent);
      if (dialogOwner && agentOwner && dialogOwner !== agentOwner) continue;
      if (aggregated.get(dialog.contentKey)) {
        runningAgents.add(agent.contentKey);
        break;
      }
    }
  }
  return runningAgents;
};

/**
 * agent 视图里主对话的可见集合：
 * - 运行中的主对话（含其运行子树的 root）排前面，且**不占**普通项的名额；
 * - 普通主对话仍只取最近 limit 条；
 * - hiddenNormalCount = 被折叠掉的普通项数量（「更多」计数按剩余普通项算）。
 */
export const selectVisibleMainDialogs = <T extends string>(
  orderedKeys: readonly T[],
  runningKeys: ReadonlySet<T>,
  limit = 3,
): { visibleKeys: T[]; hiddenNormalCount: number } => {
  const running = orderedKeys.filter((key) => runningKeys.has(key));
  const normal = orderedKeys.filter((key) => !runningKeys.has(key));
  return {
    visibleKeys: [...running, ...normal.slice(0, limit)],
    hiddenNormalCount: Math.max(0, normal.length - limit),
  };
};
