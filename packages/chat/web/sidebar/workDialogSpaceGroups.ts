import { isTombstoneRecord } from "database/tombstones";
import { isDeviceLocalSpaceBody, isDeviceLocalOwnerId, DEVICE_LOCAL_OWNER_ID } from "database/authority/deviceLocal";
import { parseDialogKey } from "database/dialogKey";
import { pinnedFirst, toTimestamp } from "app/utils/myContentItems";
import spaceLocale from "create/space/space.locale";
import { Language } from "app/i18n/types";
import { normalizeSpaceId } from "database-engine/spaceLinkAccess";
export const OTHER_SPACES_GROUP = "__other_spaces__";
import type { WorkDialogFlatRow } from "./workDialogHierarchyView";

export type WorkDialogSpaceGroup = {
  spaceId: string | null;
  label: string;
  updatedAt: number;
  rows: WorkDialogFlatRow[];
  directoryCount?: number;
  loadedCount?: number;
  directoryUnavailable?: boolean;
};

/** Project the loaded window only; counts are not server totals. */
export function groupWorkDialogsBySpace(
  rows: readonly WorkDialogFlatRow[],
  currentSpaceId: string | null,
  memberSpaces: readonly { spaceId: string; spaceName?: string }[] = [],
  recordNames: ReadonlyMap<string, string> = new Map(),
  labels = { other: spaceLocale[Language.ZH_CN].translation.workspace_other, unassociated: spaceLocale[Language.ZH_CN].translation.workspace_unassociated },
): WorkDialogSpaceGroup[] {
  // Space record names are authoritative; membership is an offline/read-failure fallback.
  const names = new Map(memberSpaces.map(space => [normalizeSpaceId(space.spaceId), space.spaceName?.trim()]));
  for (const [id, name] of recordNames) {
    const key = normalizeSpaceId(id);
    if (key && name.trim()) names.set(key, name.trim());
  }
  const current = normalizeSpaceId(currentSpaceId);
  const groups = new Map<string | null, WorkDialogSpaceGroup>();
  for (const row of rows) {
    const actualSpaceId = normalizeSpaceId(row.item.spaceId);
    const name = actualSpaceId ? names.get(actualSpaceId) : undefined;
    const spaceId = actualSpaceId ? name ? actualSpaceId : OTHER_SPACES_GROUP : null;
    let group = groups.get(spaceId);
    if (!group) {
      group = { spaceId, label: spaceId === OTHER_SPACES_GROUP ? labels.other : name || labels.unassociated, updatedAt: row.updatedAt, rows: [] };
      groups.set(spaceId, group);
    }
    group.updatedAt = Math.max(group.updatedAt, row.updatedAt);
    group.rows.push(row);
  }
  for (const group of groups.values()) {
    group.rows.sort((a, b) => {
      const pinDiff = pinnedFirst(
        { pinned: !a.shared && Boolean(a.item.pinned) },
        { pinned: !b.shared && Boolean(b.item.pinned) },
      );
      return pinDiff || b.updatedAt - a.updatedAt || a.key.localeCompare(b.key);
    });
  }
  return [...groups.values()].sort((a, b) =>
    Number(a.spaceId === null) - Number(b.spaceId === null) ||
    Number(a.spaceId === OTHER_SPACES_GROUP) - Number(b.spaceId === OTHER_SPACES_GROUP) ||
    Number(Boolean(current) && b.spaceId === current) - Number(Boolean(current) && a.spaceId === current) ||
    b.updatedAt - a.updatedAt || (a.spaceId ?? "").localeCompare(b.spaceId ?? ""));
}

/** Saved choices override defaults, including a manually opened unassociated group. */
export function isWorkDialogSpaceGroupExpanded(spaceId: string | null, index: number, saved?: boolean): boolean {
  return saved ?? (spaceId !== null && spaceId !== OTHER_SPACES_GROUP && index < 3);
}

/** Accept only explicit choices for currently loaded groups, never inherited/default values. */
export function projectWorkDialogSpacePreferences(
  value: unknown,
  groups: readonly Pick<WorkDialogSpaceGroup, "spaceId">[],
): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const keys = new Set(groups.map(group => JSON.stringify(group.spaceId)));
  return Object.fromEntries(Object.entries(value).filter(([key, open]) => keys.has(key) && typeof open === "boolean"));
}

/** Per-account/session cache: coalesce in-flight reads and bound stale/failed entries. */
export const WORK_SPACE_NAME_TTL_MS = 30_000;
export function createWorkSpaceNameCache(ttlMs = WORK_SPACE_NAME_TTL_MS) {
  const entries = new Map<string, { at: number; value: Promise<string | null> }>();
  return (scope: string, spaceId: string, readName: () => Promise<unknown>): Promise<string | null> => {
    const key = JSON.stringify([scope, normalizeSpaceId(spaceId)]);
    const cached = entries.get(key);
    if (cached && Date.now() - cached.at < ttlMs) return cached.value;
    const value = Promise.resolve().then(readName).then(name =>
      typeof name === "string" && name.trim() ? name.trim() : null,
    ).catch(() => null);
    entries.set(key, { at: Date.now(), value });
    return value;
  };
}

export type WorkSpaceRecord = {
  name?: string;
  userId?: string;
  ownerId?: string;
  categories?: Record<string, { name: string; order: number } | null>;
  contents?: Record<string, { contentKey: string; categoryId?: string | null; order?: number; title?: string; type?: string; updatedAt?: number | string; fileCategory?: string; deleted?: boolean; deletedAt?: number | string } | null>;
};
export type WorkCategoryGroup = { id: string | null; label: string; rows: WorkDialogFlatRow[] };

/** Only authoritative space contents assign categories; absent/dangling links stay reachable. */
export function groupWorkDialogsByCategory(rows: readonly WorkDialogFlatRow[], record?: WorkSpaceRecord | null): WorkCategoryGroup[] {
  const categories = Object.entries(record?.categories ?? {}).filter((entry): entry is [string, { name: string; order: number }] => Boolean(entry[1]?.name?.trim()));
  if (!categories.length) return [{ id: null, label: "", rows: [...rows] }];
  const links = new Map(Object.values(record?.contents ?? {}).filter(link => link && typeof link.contentKey === "string").map(link => [link!.contentKey, link!]));
  const known = new Set(categories.map(([id]) => id));
  const buckets = new Map<string | null, WorkDialogFlatRow[]>();
  for (const row of rows) {
    const linked = links.get(row.key)?.categoryId;
    const id = linked && known.has(linked) ? linked : null;
    buckets.set(id, [...(buckets.get(id) ?? []), row]);
  }
  const result: WorkCategoryGroup[] = categories.sort((a, b) => a[1].order - b[1].order || a[1].name.localeCompare(b[1].name) || a[0].localeCompare(b[0])).map(([id, category]) => ({ id, label: category.name, rows: buckets.get(id) ?? [] })).filter(group => group.rows.length);
  const rest = buckets.get(null);
  if (rest?.length) result.push({ id: null, label: "", rows: rest });
  for (const group of result) group.rows.sort((a, b) => {
    const orderDiff = (links.get(a.key)?.order ?? Number.MAX_SAFE_INTEGER) - (links.get(b.key)?.order ?? Number.MAX_SAFE_INTEGER);
    if (orderDiff !== 0) return orderDiff;
    const pinDiff = pinnedFirst(
      { pinned: !a.shared && Boolean(a.item.pinned) },
      { pinned: !b.shared && Boolean(b.item.pinned) },
    );
    return pinDiff || b.updatedAt - a.updatedAt || a.key.localeCompare(b.key);
  });
  return result;
}

/** Same session-scoped request serves names and categories; failed records expire together. */
export function createWorkSpaceRecordCache(ttlMs = WORK_SPACE_NAME_TTL_MS) {
  const entries = new Map<string, { at: number; value: Promise<WorkSpaceRecord | null> }>();
  return (scope: string, spaceId: string, read: () => Promise<WorkSpaceRecord | null>): Promise<WorkSpaceRecord | null> => {
    const key = JSON.stringify([scope, normalizeSpaceId(spaceId)]);
    const cached = entries.get(key);
    if (cached && Date.now() - cached.at < ttlMs) return cached.value;
    const value = Promise.resolve().then(read).catch(() => null);
    entries.set(key, { at: Date.now(), value });
    return value;
  };
}

/** Directory membership is independent of an object's owning spaceId. A directory
 * summary is a read-only link, never proof of access to the referenced object. */
export function projectWorkSpaceDirectories(
  rows: readonly WorkDialogFlatRow[], currentSpaceId: string | null,
  memberships: readonly { spaceId: string; spaceName?: string }[],
  records: ReadonlyMap<string, WorkSpaceRecord>, labels: { other: string; unassociated: string },
  include: (row: WorkDialogFlatRow) => boolean = () => true,
): WorkDialogSpaceGroup[] {
  const names = new Map([...records].flatMap(([id, record]) => record.name?.trim() ? [[id, record.name.trim()] as const] : []));
  const fallback = groupWorkDialogsBySpace(rows.filter(include), currentSpaceId, memberships, names, labels);
  const result = fallback.filter(group => !group.spaceId || group.spaceId === OTHER_SPACES_GROUP);
  const byKey = new Map(rows.map(row => [row.key, row]));
  for (const member of memberships) {
    const id = normalizeSpaceId(member.spaceId);
    if (!id) continue;
    const record = records.get(id);
    if (!record?.contents) {
      const group = fallback.find(group => group.spaceId === id);
      if (group) result.push({ ...group, directoryUnavailable: true });

      continue;
    }
    const entries = new Map(Object.values(record.contents).filter(entry => entry && entry.contentKey && !isTombstoneRecord(entry)).map(entry => [entry!.contentKey, entry!]));
    const projected: WorkDialogFlatRow[] = [];
    let loaded = 0;
    for (const [key, entry] of entries) {
      const cached = byKey.get(key);
      if (cached && isTombstoneRecord(cached.item)) continue;
      const type = entry.type || cached?.item.type;
      if (!type) continue;
      const isPinned = Boolean((entry as any)?.pinned ?? cached?.item.pinned);
      const item = { ...cached?.item, ...entry, contentKey: key, type, title: entry.title || cached?.item.title || key, spaceId: id, pinned: isPinned } as WorkDialogFlatRow["item"];
      const row = { key, item, updatedAt: toTimestamp(entry.updatedAt ?? 0) || cached?.updatedAt || 0, shared: !cached || cached.shared || normalizeSpaceId(cached.item.spaceId) !== id };
      if (include(row)) { projected.push(row); if (cached) loaded++; }
    }
    const label = record.name?.trim() || member.spaceName?.trim();
    if (!label) continue;
    if (projected.length || entries.size === 0) result.push({
      spaceId: id,
      label,
      rows: projected.sort((a,b) => {
        const pinDiff = pinnedFirst(
          { pinned: !a.shared && Boolean(a.item.pinned) },
          { pinned: !b.shared && Boolean(b.item.pinned) },
        );
        return pinDiff || b.updatedAt-a.updatedAt || a.key.localeCompare(b.key);
      }),
      updatedAt: Math.max(0,...projected.map(row=>row.updatedAt)),
      directoryCount: entries.size,
      loadedCount: loaded
    });
  }
  return result.sort((a,b) => Number(a.spaceId===null)-Number(b.spaceId===null) || Number(a.spaceId===OTHER_SPACES_GROUP)-Number(b.spaceId===OTHER_SPACES_GROUP) || b.updatedAt-a.updatedAt);
}

/**
 * 行的所有权证据来源。`unknown` 只表示「还没读到实际证据」，不是「没权限」：
 * 缓存缺失、目录行不在已加载窗口、实体 spaceId 与目录不一致都不能推出无权限。
 */
export type RowOwnership = "own" | "other" | "unknown";

export type ContentRowCapability = {
  ownership: RowOwnership;
  /** 删除内容本体（tombstone + 服务端删除）。只有正证据的自有内容才允许。 */
  canDeleteContent: boolean;
  /** 空间内的管理动作（分类、空间级整理）。别人内容不因此获得本体删除权。 */
  canManageInSpace: boolean;
  /** 既非自有、也没有空间管理权 → 行级只读。 */
  readOnly: boolean;
  /** 需要读取实际实体（记录 owner）才能判定；期间不授予本体删除。 */
  needsOwnershipEvidence: boolean;
};

/**
 * 用可核实的证据判定行归属。**权威所有者优先**，冲突时以更强证据为准：
 *   1. 实际实体记录的 `userId/ownerId`（最权威，读到即终局，不再被 key/条目覆盖）
 *   2. 已加载条目自带身份（远端 summary 的 `userId/ownerUserId`）
 *   3. key 内嵌归属（`dialog-<userId>-…` / `page-<userId>-…`）
 *   4. 设备本地（无任何矛盾证据时才按本地 owner 处理）
 * 明确不看：目录缓存是否命中、实体 `spaceId` 是否等于目录空间（那是缓存/漂移状态，
 * 不是权限证据）。
 */
export function resolveRowOwnership(input: {
  contentKey: string;
  type?: string | null;
  /** 已加载条目上的身份（对话 summary 的 userId / ownerUserId）。 */
  itemUserId?: string | null;
  /** 实际实体记录里读到的 userId / ownerId（已核实）。 */
  entityOwnerId?: string | null;
  /** 当前用户。 */
  userId: string | null | undefined;
  /** 设备本地数据（local owner 或 local 空间体）：其内容归属本地 owner。 */
  isDeviceLocal?: boolean;
}): RowOwnership {
  const { contentKey, type, itemUserId, entityOwnerId, userId, isDeviceLocal } = input;
  const currentUserId = typeof userId === "string" ? userId.trim() : "";
  if (!currentUserId) return "unknown";
  const isLocalActor = isDeviceLocalOwnerId(currentUserId);
  // "local" 是设备本地 owner：本地优先模型里它属于本机用户（mergeHistoryItems 与
  // deleteContentFromSpaceAction 都按此处理），不是「他人实体」。
  const isOwnOwner = (owner: string): boolean =>
    owner === currentUserId || owner === DEVICE_LOCAL_OWNER_ID;

  // 1. 实际实体记录：权威证据，读到即终局（他人 owner 不会被 key/条目/本地空间翻盘）。
  const ownerFromEntity = typeof entityOwnerId === "string" ? entityOwnerId.trim() : "";
  if (ownerFromEntity) return isOwnOwner(ownerFromEntity) ? "own" : "other";

  // 2. 已加载条目自带身份。
  const ownerFromItem = typeof itemUserId === "string" ? itemUserId.trim() : "";
  if (ownerFromItem) return isOwnOwner(ownerFromItem) ? "own" : "other";

  // 3. key 内嵌归属。page key 约定是 `page-<userId>-<id>`（删除端样本删除的
  //    isOwnerByKey 也按此判定）；agent/table/file 的第二段是内容自身 id，不能当 userId。
  if (contentKey.startsWith("page-")) {
    return contentKey.startsWith(`page-${currentUserId}-`) ? "own" : "other";
  }
  if ((type ?? "").toLowerCase() === "dialog") {
    const keyOwner = parseDialogKey(contentKey)?.userId;
    if (typeof keyOwner === "string" && keyOwner.trim()) {
      return isOwnOwner(keyOwner.trim()) ? "own" : "other";
    }
  }

  // 4. 没有任何矛盾证据时才按设备本地归属处理。
  if (isDeviceLocal || isLocalActor) return "own";
  return "unknown";
}

export function resolveContentRowCapability(input: {
  ownership: RowOwnership;
  spaceManageable: boolean;
}): ContentRowCapability {
  const canDeleteContent = input.ownership === "own";
  const canManageInSpace = canDeleteContent || input.spaceManageable;
  return {
    ownership: input.ownership,
    canDeleteContent,
    canManageInSpace,
    readOnly: !canDeleteContent && !canManageInSpace,
    needsOwnershipEvidence: input.ownership === "unknown",
  };
}

/**
 * 空间管理权：比「能改分类」更严——在成员资格之上再要求空间所有者身份或
 * owner/admin 角色。普通成员/guest 不算管理者：他们看不到别人内容的管理入口，
 * 更不能删除别人的内容本体。
 */
export function isSpaceManager({
  spaceId,
  userId,
  memberSpaces = [],
  record,
}: {
  spaceId: string | null;
  userId: string | null | undefined;
  memberSpaces?: readonly { spaceId: string; userId?: string; role?: string; ownerId?: string }[];
  record?: (WorkSpaceRecord & { ownerId?: string }) | null;
}): boolean {
  if (!spaceId) return false;
  if (!canManageSpaceCategories({ spaceId, userId, memberSpaces, record })) return false;
  const normalizedTarget = normalizeSpaceId(spaceId);
  if (!normalizedTarget) return false;
  const member = memberSpaces.find(m => normalizeSpaceId(m.spaceId) === normalizedTarget);
  if (isDeviceLocalSpaceBody(record) || isDeviceLocalSpaceBody(member)) return true;
  const currentUserId = typeof userId === "string" ? userId.trim() : "";
  if (!currentUserId) return false;
  const owner = [record?.ownerId, record?.userId, member?.ownerId, member?.userId]
    .find((value) => typeof value === "string" && value.trim());
  if (owner && owner.trim() === currentUserId) return true;
  return member?.role === "owner" || member?.role === "admin";
}

/** Determine whether a space's categories may be created, renamed or deleted by the user. */
export function canManageSpaceCategories({
  spaceId,
  userId,
  memberSpaces = [],
  record,
}: {
  spaceId: string | null;
  userId: string | null | undefined;
  memberSpaces?: readonly { spaceId: string; userId?: string; role?: string; ownerId?: string }[];
  record?: WorkSpaceRecord | null;
}): boolean {
  if (!spaceId || spaceId === OTHER_SPACES_GROUP) return false;
  if (record && (isTombstoneRecord(record) || (record as { deleted?: boolean }).deleted || (record as { tombstone?: boolean }).tombstone)) return false;
  const normalizedTarget = normalizeSpaceId(spaceId);
  if (!normalizedTarget) return false;

  const member = memberSpaces.find(m => normalizeSpaceId(m.spaceId) === normalizedTarget);
  const isLocal = isDeviceLocalOwnerId(userId) || isDeviceLocalSpaceBody(record) || isDeviceLocalSpaceBody(member);
  if (isLocal) return true;
  if (!userId) return false;

  if (!member) return false;
  if (member.userId && member.userId !== userId) return false;
  if (member.role === "guest") return false;

  const recordMembers = (record as { members?: string[] } | undefined)?.members;
  if (Array.isArray(recordMembers) && !recordMembers.includes(userId)) {
    return false;
  }
  return true;
}
