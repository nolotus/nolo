import type { SpaceContent } from "app/types";
import { extractCustomId } from "core/prefix";
import { asTrimmedNonEmptyStringArray } from "core/stringArray";

export type SidebarVisibleType =
  | "dialog"
  | "page"
  | "image"
  | "document"
  | "video"
  | "audio"
  | "table"
  | "file"
  | "app"
  | "agent"
  | "scheduled";

export const ALL_SIDEBAR_VISIBLE_TYPES: SidebarVisibleType[] = [
  "dialog",
  "page",
  "image",
  "document",
  "video",
  "audio",
  "table",
  "file",
  "app",
  "agent",
  "scheduled",
];

export const SIDEBAR_VISIBLE_TYPES_SEARCH_PARAM = "types";

const LEGACY_DEFAULT_SIDEBAR_VISIBLE_TYPES: SidebarVisibleType[] = [
  "dialog",
  "page",
  "table",
];

export const DEFAULT_SIDEBAR_VISIBLE_TYPES: SidebarVisibleType[] = [
  ...LEGACY_DEFAULT_SIDEBAR_VISIBLE_TYPES,
  "app",
];

/** Primary row — mirrors My Content PRIMARY_CONTENT_TAB_IDS (minus "all"). */
export const SPACE_HOME_TOPBAR_VISIBLE_TYPES: SidebarVisibleType[] = [
  "agent",
  "dialog",
  "page",
  "app",
  "table",
];

/** Attachment sub-row — mirrors My Content ATTACHMENT_SUB_TAB_IDS. */
export const SPACE_ATTACHMENT_SUB_TYPES: SidebarVisibleType[] = [
  "image",
  "document",
  "video",
  "audio",
  "file",
];

/** @deprecated Prefer SPACE_ATTACHMENT_SUB_TYPES; kept for files-route defaults. */
export const SPACE_FILE_TOPBAR_VISIBLE_TYPES: SidebarVisibleType[] = [
  ...SPACE_ATTACHMENT_SUB_TYPES,
];

/** Home "全部": primary content + attachments (same breadth as My Content all). */
export const SPACE_ALL_CONTENT_TYPES: SidebarVisibleType[] = [
  ...SPACE_HOME_TOPBAR_VISIBLE_TYPES,
  ...SPACE_ATTACHMENT_SUB_TYPES,
];

const isSpaceAttachmentType = (
  type: SidebarVisibleType
): boolean => SPACE_ATTACHMENT_SUB_TYPES.includes(type);

export const areOnlySpaceAttachmentTypes = (
  types: readonly SidebarVisibleType[]
): boolean =>
  types.length > 0 && types.every((type) => isSpaceAttachmentType(type));

const collectSidebarVisibleTypes = (
  values: readonly string[]
): SidebarVisibleType[] => {
  const valueSet = new Set(values);
  return ALL_SIDEBAR_VISIBLE_TYPES.filter((type) => valueSet.has(type));
};

export const normalizeSidebarVisibleTypes = (
  values: Iterable<string | null | undefined> | null | undefined,
  fallback: readonly SidebarVisibleType[] = DEFAULT_SIDEBAR_VISIBLE_TYPES
): SidebarVisibleType[] => {
  const normalizedFallback = collectSidebarVisibleTypes([...fallback]);
  const safeFallback =
    normalizedFallback.length > 0
      ? normalizedFallback
      : [...DEFAULT_SIDEBAR_VISIBLE_TYPES];

  if (!values) {
    return [...safeFallback];
  }

  const tokens = asTrimmedNonEmptyStringArray([...values]);

  if (tokens.length === 0) {
    return [...safeFallback];
  }

  if (tokens.includes("all")) {
    return [...ALL_SIDEBAR_VISIBLE_TYPES];
  }

  const normalized = collectSidebarVisibleTypes(tokens);
  return normalized.length > 0 ? normalized : [...safeFallback];
};

export const parseSidebarVisibleTypesSearchParam = (
  rawValue: string | null | undefined
): SidebarVisibleType[] | null => {
  if (typeof rawValue !== "string") {
    return null;
  }

  const tokens = rawValue
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  if (tokens.length === 0) {
    return null;
  }

  if (tokens.includes("all")) {
    return [...ALL_SIDEBAR_VISIBLE_TYPES];
  }

  const normalized = collectSidebarVisibleTypes(tokens);
  return normalized.length > 0 ? normalized : null;
};

export const serializeSidebarVisibleTypesSearchParam = (
  visibleTypes: readonly SidebarVisibleType[]
): string | null => {
  const normalized = collectSidebarVisibleTypes([...visibleTypes]);
  if (normalized.length === 0) {
    return null;
  }

  return areSidebarVisibleTypesEqual(normalized, ALL_SIDEBAR_VISIBLE_TYPES)
    ? "all"
    : normalized.join(",");
};

export const areSidebarVisibleTypesEqual = (
  left: readonly SidebarVisibleType[],
  right: readonly SidebarVisibleType[]
): boolean =>
  left.length === right.length && left.every((value, index) => value === right[index]);

export const pickSidebarVisibleTypes = (
  current: readonly SidebarVisibleType[] | null | undefined,
  allowed: readonly SidebarVisibleType[],
  fallback: readonly SidebarVisibleType[] = allowed
): SidebarVisibleType[] => {
  const allowedSet = new Set(allowed);
  const filtered = normalizeSidebarVisibleTypes(current, fallback).filter((type) =>
    allowedSet.has(type)
  );
  return filtered.length > 0 ? filtered : [...fallback];
};

export const withExclusiveSidebarVisibleType = (
  current: readonly SidebarVisibleType[],
  type: SidebarVisibleType,
  allowed: readonly SidebarVisibleType[],
  fallback: readonly SidebarVisibleType[] = allowed
): SidebarVisibleType[] => {
  if (!allowed.includes(type)) {
    return pickSidebarVisibleTypes(current, allowed, fallback);
  }

  const selected = pickSidebarVisibleTypes(current, allowed, fallback);
  if (selected.length === 1 && selected[0] === type) {
    return [...fallback];
  }

  return [type];
};

export type ChildDialogCheckableItem = {
  id?: string;
  contentKey?: string;
  parentDialogId?: string | null;
};

export const resolveDialogItemId = (
  item?: ChildDialogCheckableItem | null
): string => {
  if (!item) return "";
  if (typeof item.id === "string" && item.id.trim()) {
    return item.id.trim();
  }
  if (typeof item.contentKey === "string" && item.contentKey.trim()) {
    const raw = item.contentKey.trim();
    return raw.startsWith("dialog-") ? extractCustomId(raw) : raw;
  }
  return "";
};

/**
 * 判定一个 SpaceContent 是否为子对话项。
 * 必须满足：
 * 1. parentDialogId 非空
 * 2. parentDialogId !== 自身记录 id（防 CLI 等历史脏数据自引用把普通对话误当成子对话隐藏/折叠）
 */
export function isChildDialogItem(
  item?: (Partial<SpaceContent> & { id?: string }) | null
): boolean {
  if (!item) return false;
  const parentId =
    typeof item.parentDialogId === "string" ? item.parentDialogId.trim() : "";
  if (!parentId) return false;
  const selfId = resolveDialogItemId(item);
  if (selfId && parentId === selfId) {
    return false;
  }
  return true;
}

export const matchesSidebarVisibleType = (
  item: SpaceContent,
  type: SidebarVisibleType
): boolean => {
  const itemType = (item.type as string | undefined)?.toLowerCase();
  const contentKey = typeof item.contentKey === "string" ? item.contentKey : "";
  if (type === "agent") {
    return itemType === "agent";
  }
  if (type === "app") {
    return itemType === "app" || contentKey.startsWith("app-");
  }
  if (type === "scheduled") {
    return (
      itemType === "agent-automation" ||
      contentKey.startsWith("agent-automation-") ||
      itemType === "task" ||
      contentKey.startsWith("task-")
    );
  }
  if (type === "dialog") {
    return (
      itemType === type &&
      item.triggerType !== "scheduled_run" &&
      item.triggerType !== "automation_run" &&
      !item.parentTaskKey &&
      !item.parentAutomationKey &&
      // 子对话（由 startAgentRun 派发的后台子任务）默认折叠到父对话下，
      // 不在平铺列表里单独显示；通过父行的折叠展开机制访问。
      // 自引用记录（parentDialogId === 自身 id）按普通对话平铺显示。
      !isChildDialogItem(item)
    );
  }
  if (type === "file") {
    return itemType === "file" || itemType === "image";
  }
  if (type === "image") {
    return (
      itemType === "image" ||
      (itemType === "file" && item.fileCategory === "image") ||
      contentKey.startsWith("image-")
    );
  }
  if (type === "document") {
    return itemType === "file" && item.fileCategory === "document";
  }
  if (type === "video") {
    return itemType === "file" && item.fileCategory === "video";
  }
  if (type === "audio") {
    return itemType === "file" && item.fileCategory === "audio";
  }
  return itemType === type;
};

export const matchesSidebarVisibleTypes = (
  item: SpaceContent,
  visibleTypes: readonly SidebarVisibleType[]
): boolean =>
  normalizeSidebarVisibleTypes(visibleTypes).some((type) =>
    matchesSidebarVisibleType(item, type)
  );
