// ── Agent 优先侧栏的层级 / 分组纯函数 ───────────────────────────────────────
// 本模块只做「数据 → 展示行」的纯计算，不碰网络、store 与 React。
//
// 数据契约（由数据投影侧提供，本模块不修改投影）：
//   MyContentListItem(source="user-data") 上可能有
//     primaryAgentKey?: string   主 agent（归属真源）
//     cybots?: string[]          该条目涉及的执行 agent（仅参考，不决定归属）
//     parentDialogId?: string    父对话 bare id（不含 owner 前缀）
//     rootDialogId?: string      根对话 bare id
//   parentDialogId / rootDialogId 是 bare id，必须结合子项自身的 owner 与
//   serverOrigin 还原成完整 contentKey 才能比较，否则会跨用户 / 跨源误挂。
//
// 重要限制：当前侧栏摘要不是完整闭包（每类型 limit 200，父对话可能未载入）。
// 因此本模块绝不断言「某个 dialog 没有子对话」或「子对话总数 = N」：
//   - 父未载入的子行一律留在顶层（可访问的 fallback），并记入
//     `detachedByUnloadedParent`，调用方可以把它们当成「未知归属」而不是孤儿。
//   - `childrenOf` 里的数量只是「已载入的子对话数」，是下界。

import type { MyContentListItem } from "app/utils/myContentItems";
import { buildDialogKey, parseDialogKey } from "database/dialogKey";

/** 侧栏条目 + 血缘字段（血缘字段尚未进入公共类型时用可选扩展读取）。 */
export type HierarchySidebarItem = MyContentListItem & {
  parentDialogId?: unknown;
  rootDialogId?: unknown;
};

/** Prefer explicit projected identity only when it reproduces the complete key. */
const dialogIdentity = (item: HierarchySidebarItem): { userId: string; dialogId: string } | null => {
  const owner = "userId" in item && typeof item.userId === "string" ? item.userId.trim() : "";
  const id = "dialogId" in item && typeof item.dialogId === "string" ? item.dialogId.trim() : "";
  if (owner || id) {
    return owner && id && buildDialogKey(owner, id) === item.contentKey ? { userId: owner, dialogId: id } : null;
  }
  return parseDialogKey(item.contentKey);
};

export type DialogLineage = {
  /** 该项自身的 bare dialogId；非 dialog 条目返回 null。 */
  dialogId: string | null;
  /** 父对话 bare id；无 / 非法 / 自引用时返回 null。 */
  parentDialogId: string | null;
  /** 根对话 bare id（仅透传，不参与挂载决策）。 */
  rootDialogId: string | null;
};

const asBareId = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // 历史脏数据里存在把完整 key 写进 parentDialogId 的记录，尽量还原。
  const parsed = parseDialogKey(trimmed);
  return parsed ? parsed.dialogId : trimmed;
};

/**
 * 读取一个条目的血缘信息。自引用（parent === 自身）视为无父：
 * 侧栏不能凭一条脏数据把自己挂到自己下面。
 */
export const readDialogLineage = (
  item: HierarchySidebarItem,
): DialogLineage => {
  const parsedSelf = dialogIdentity(item);
  const dialogId = parsedSelf ? parsedSelf.dialogId : null;
  const parentDialogId = asBareId(item.parentDialogId);
  const rootDialogId = asBareId(item.rootDialogId);
  return {
    dialogId,
    parentDialogId:
      parentDialogId && dialogId && parentDialogId !== dialogId
        ? parentDialogId
        : null,
    rootDialogId:
      rootDialogId && dialogId && rootDialogId !== dialogId ? rootDialogId : null,
  };
};

const normalizeOrigin = (value: unknown): string =>
  typeof value === "string" ? value.trim().replace(/\/+$/, "") : "";

/**
 * 两个条目是否属于同一归属域：同 owner + 同 serverOrigin（+ 必要时同 space）。
 * 只用于避免跨用户 / 跨源 / 跨空间的误挂，不作为展示分组依据。
 */
export const isSameDialogScope = (
  a: HierarchySidebarItem,
  b: HierarchySidebarItem,
): boolean => {
  const ownerA = dialogIdentity(a)?.userId ?? "";
  const ownerB = dialogIdentity(b)?.userId ?? "";
  if (ownerA !== ownerB) return false;
  if (normalizeOrigin(a.serverOrigin) !== normalizeOrigin(b.serverOrigin)) {
    return false;
  }
  const spaceA = a.spaceId ?? null;
  const spaceB = b.spaceId ?? null;
  return spaceA === spaceB;
};

export type DialogHierarchy = {
  /** parent contentKey → 已载入的直接子对话 contentKey（顺序 = 传入顺序）。 */
  childrenOf: Map<string, string[]>;
  /** 因父对话未载入而留在顶层的子行 contentKey（fallback，可访问）。 */
  detachedByUnloadedParent: Set<string>;
  /** 因自引用 / 循环 / 跨域而无法安全挂载、留在顶层的 contentKey。 */
  detachedByUnsafeLink: Set<string>;
  /** 需要展示为顶层行（未被挂到任何父下）的 contentKey。 */
  topLevelKeys: Set<string>;
  /** 该行是否显示为子行。 */
  isChild: (contentKey: string) => boolean;
  /** 已载入的直接子对话数（下界，不得当作总数对外宣称）。 */
  loadedChildCount: (contentKey: string) => number;
};

const EMPTY_HIERARCHY: DialogHierarchy = {
  childrenOf: new Map(),
  detachedByUnloadedParent: new Set(),
  detachedByUnsafeLink: new Set(),
  topLevelKeys: new Set(),
  isChild: () => false,
  loadedChildCount: () => 0,
};

/**
 * 从「已载入条目」构建父子关系。
 *
 * 规则：
 * 1. 只有 dialog 条目参与（非 dialog 无血缘语义）。
 * 2. 父必须已载入且与子同域（owner + serverOrigin + spaceId），否则不挂：
 *    子留在顶层（可访问 fallback），记入 `detachedByUnloadedParent`。
 * 3. 自引用 / 循环（沿父链走回自己）一律不挂，记入 `detachedByUnsafeLink`。
 * 4. 一次只挂到最近一层已载入祖先，保证「子不在顶层重复出现」。
 * 5. `rootDialogId` 只透传，不参与挂载：它对「中间层未载入」的情况会跳过层级，
 *    那是数据完整性问题，不能靠它伪造父子关系。
 */
export const buildDialogHierarchy = (
  items: readonly HierarchySidebarItem[],
): DialogHierarchy => {
  if (items.length === 0) return EMPTY_HIERARCHY;

  const byContentKey = new Map<string, HierarchySidebarItem>();
  const keyByBareId = new Map<string, string[]>();
  for (const item of items) {
    byContentKey.set(item.contentKey, item);
    const parsed = dialogIdentity(item);
    if (!parsed) continue;
    const bucket = keyByBareId.get(parsed.dialogId);
    if (bucket) bucket.push(item.contentKey);
    else keyByBareId.set(parsed.dialogId, [item.contentKey]);
  }

  /** 在候选父 key 里挑出唯一同域的那一个；0 或多个都视为不可判定。 */
  const resolveParentKey = (
    child: HierarchySidebarItem,
    childLineage: DialogLineage,
  ): string | null => {
    if (!childLineage.parentDialogId) return null;
    const owner = dialogIdentity(child)?.userId;
    if (!owner) return null;
    const candidates = new Set<string>([
      // bare id → 完整 key（同 owner），再加同 bare id 的既有条目。
      buildDialogKey(owner, childLineage.parentDialogId),
      ...(keyByBareId.get(childLineage.parentDialogId) ?? []),
    ]);
    const matches = [...candidates].filter((key) => {
      if (key === child.contentKey) return false;
      const parent = byContentKey.get(key);
      return Boolean(parent) && isSameDialogScope(child, parent!);
    });
    return matches.length === 1 ? matches[0] : null;
  };

  const childrenOf = new Map<string, string[]>();
  const detachedByUnloadedParent = new Set<string>();
  const detachedByUnsafeLink = new Set<string>();
  const isChild = new Set<string>();
  const parentOf = new Map<string, string>();

  for (const item of items) {
    if (!dialogIdentity(item)) continue;
    const lineage = readDialogLineage(item);
    if (!lineage.dialogId) continue;
    if (!lineage.parentDialogId) continue;

    const parentKey = resolveParentKey(item, lineage);
    if (!parentKey) {
      // 有两种「不挂」：父确实没载入（fallback 顶层），或链路不安全。
      const owner = dialogIdentity(item)?.userId;
      const parentLoadedSomewhere = owner
        ? Boolean(
            byContentKey.get(buildDialogKey(owner, lineage.parentDialogId)),
          ) || (keyByBareId.get(lineage.parentDialogId)?.length ?? 0) > 0
        : false;
      if (parentLoadedSomewhere) detachedByUnsafeLink.add(item.contentKey);
      else detachedByUnloadedParent.add(item.contentKey);
      continue;
    }

    // 循环防护：沿父链向上走，若回到自己则整条链不挂。
    const seen = new Set<string>([item.contentKey]);
    let cursor: string | undefined = parentKey;
    let cyclic = false;
    while (cursor) {
      if (seen.has(cursor)) {
        cyclic = true;
        break;
      }
      seen.add(cursor);
      const cursorItem = byContentKey.get(cursor);
      if (!cursorItem) break;
      const cursorParentKey = resolveParentKey(
        cursorItem,
        readDialogLineage(cursorItem),
      );
      if (!cursorParentKey) break;
      cursor = cursorParentKey;
    }
    if (cyclic) {
      detachedByUnsafeLink.add(item.contentKey);
      continue;
    }

    const siblings = childrenOf.get(parentKey);
    if (siblings) siblings.push(item.contentKey);
    else childrenOf.set(parentKey, [item.contentKey]);
    isChild.add(item.contentKey);
    parentOf.set(item.contentKey, parentKey);
  }

  const topLevelKeys = new Set<string>();
  for (const item of items) {
    if (!isChild.has(item.contentKey)) topLevelKeys.add(item.contentKey);
  }

  return {
    childrenOf,
    detachedByUnloadedParent,
    detachedByUnsafeLink,
    topLevelKeys,
    isChild: (contentKey: string) => isChild.has(contentKey),
    loadedChildCount: (contentKey: string) =>
      childrenOf.get(contentKey)?.length ?? 0,
  };
};

/** 「最近活跃」时间戳：未读提示优先，其次更新时间，最后创建时间。 */
export const resolveLastActivity = (item: HierarchySidebarItem): number => {
  const candidates: unknown[] = [
    "unreadAt" in item ? item.unreadAt : undefined,
    item.updatedAt,
    item.createdAt,
  ];
  let best = 0;
  for (const value of candidates) {
    const ms =
      typeof value === "number"
        ? value
        : typeof value === "string"
          ? Date.parse(value)
          : Number.NaN;
    if (Number.isFinite(ms) && ms > best) best = ms;
  }
  return best;
};

export type RecencyGroupId =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "earlier";

export const RECENCY_GROUP_ORDER: readonly RecencyGroupId[] = [
  "today",
  "yesterday",
  "last7",
  "last30",
  "earlier",
];

export type RecencyGroup = {
  id: RecencyGroupId;
  /** 组内条目，按最近活跃降序。 */
  contentKeys: string[];
};

const startOfLocalDay = (ms: number): number => {
  const date = new Date(ms);
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** 本地日历日差（0 = 今天），按本地零点而不是 24h 窗口计算。 */
export const resolveRecencyGroupId = (
  lastActivity: number,
  now: number,
): RecencyGroupId => {
  if (!Number.isFinite(lastActivity) || lastActivity <= 0) return "earlier";
  const today = startOfLocalDay(now);
  const dayStart = startOfLocalDay(lastActivity);
  const diffDays = Math.round((today - dayStart) / DAY_MS);
  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return "last7";
  if (diffDays < 30) return "last30";
  return "earlier";
};

/**
 * 按「今天 / 昨天 / 近 7 天 / 近 30 天 / 更早」分组，组内最近活跃优先。
 * 空组不返回；返回顺序固定为 RECENCY_GROUP_ORDER。
 * 置顶不在此过滤：置顶由独立的 pinned 块展示，调用方传入前自行剔除。
 */
export const groupByRecency = (
  items: readonly HierarchySidebarItem[],
  now: number = Date.now(),
): RecencyGroup[] => {
  const buckets = new Map<RecencyGroupId, Array<{ key: string; at: number }>>();
  for (const item of items) {
    const at = resolveLastActivity(item);
    const id = resolveRecencyGroupId(at, now);
    const bucket = buckets.get(id);
    if (bucket) bucket.push({ key: item.contentKey, at });
    else buckets.set(id, [{ key: item.contentKey, at }]);
  }
  const groups: RecencyGroup[] = [];
  for (const id of RECENCY_GROUP_ORDER) {
    const bucket = buckets.get(id);
    if (!bucket || bucket.length === 0) continue;
    bucket.sort((a, b) => b.at - a.at || a.key.localeCompare(b.key));
    groups.push({ id, contentKeys: bucket.map((entry) => entry.key) });
  }
  return groups;
};

/**
 * agent 排序：置顶优先，其次该 agent 主对话的最近活动，最后自身更新时间。
 * `dialogActivityByAgentKey` 由调用方用「已载入的主对话」算出；缺失即视为无活动。
 */
export const sortAgentsForSidebar = (
  agents: readonly HierarchySidebarItem[],
  dialogActivityByAgentKey: ReadonlyMap<string, number>,
): HierarchySidebarItem[] =>
  [...agents].sort((a, b) => {
    const pinnedDiff = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
    if (pinnedDiff !== 0) return pinnedDiff;
    const activityA = dialogActivityByAgentKey.get(a.contentKey) ?? 0;
    const activityB = dialogActivityByAgentKey.get(b.contentKey) ?? 0;
    if (activityA !== activityB) return activityB - activityA;
    const updatedDiff = resolveLastActivity(b) - resolveLastActivity(a);
    if (updatedDiff !== 0) return updatedDiff;
    return a.contentKey.localeCompare(b.contentKey);
  });

/** 主对话归属：以主对话的 primaryAgentKey 为准，执行 agent（cybots）不构成归属。 */
export const resolveDialogsByAgentKey = (
  items: readonly HierarchySidebarItem[],
): Map<string, HierarchySidebarItem[]> => {
  const map = new Map<string, HierarchySidebarItem[]>();
  for (const item of items) {
    const agentKey =
      "primaryAgentKey" in item && typeof item.primaryAgentKey === "string"
        ? item.primaryAgentKey.trim()
        : "";
    if (!agentKey) continue;
    const bucket = map.get(agentKey);
    if (bucket) bucket.push(item);
    else map.set(agentKey, [item]);
  }
  return map;
};
