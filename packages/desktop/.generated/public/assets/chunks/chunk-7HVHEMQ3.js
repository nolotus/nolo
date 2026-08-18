import {
  asTrimmedNonEmptyStringArray
} from "/public/assets/chunks/chunk-SM3EH4JD.js";

// packages/create/space/sidebarVisibleTypes.ts
var ALL_SIDEBAR_VISIBLE_TYPES = [
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
  "scheduled"
];
var SIDEBAR_VISIBLE_TYPES_SEARCH_PARAM = "types";
var LEGACY_DEFAULT_SIDEBAR_VISIBLE_TYPES = [
  "dialog",
  "page",
  "table"
];
var DEFAULT_SIDEBAR_VISIBLE_TYPES = [
  ...LEGACY_DEFAULT_SIDEBAR_VISIBLE_TYPES,
  "app"
];
var SPACE_HOME_TOPBAR_VISIBLE_TYPES = [
  "agent",
  "dialog",
  "page",
  "app",
  "table"
];
var SPACE_ATTACHMENT_SUB_TYPES = [
  "image",
  "document",
  "video",
  "audio",
  "file"
];
var SPACE_FILE_TOPBAR_VISIBLE_TYPES = [
  ...SPACE_ATTACHMENT_SUB_TYPES
];
var SPACE_ALL_CONTENT_TYPES = [
  ...SPACE_HOME_TOPBAR_VISIBLE_TYPES,
  ...SPACE_ATTACHMENT_SUB_TYPES
];
var isSpaceAttachmentType = (type) => SPACE_ATTACHMENT_SUB_TYPES.includes(type);
var areOnlySpaceAttachmentTypes = (types) => types.length > 0 && types.every((type) => isSpaceAttachmentType(type));
var collectSidebarVisibleTypes = (values) => {
  const valueSet = new Set(values);
  return ALL_SIDEBAR_VISIBLE_TYPES.filter((type) => valueSet.has(type));
};
var normalizeSidebarVisibleTypes = (values, fallback = DEFAULT_SIDEBAR_VISIBLE_TYPES) => {
  const normalizedFallback = collectSidebarVisibleTypes([...fallback]);
  const safeFallback = normalizedFallback.length > 0 ? normalizedFallback : [...DEFAULT_SIDEBAR_VISIBLE_TYPES];
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
var parseSidebarVisibleTypesSearchParam = (rawValue) => {
  if (typeof rawValue !== "string") {
    return null;
  }
  const tokens = rawValue.split(",").map((token) => token.trim()).filter((token) => token.length > 0);
  if (tokens.length === 0) {
    return null;
  }
  if (tokens.includes("all")) {
    return [...ALL_SIDEBAR_VISIBLE_TYPES];
  }
  const normalized = collectSidebarVisibleTypes(tokens);
  return normalized.length > 0 ? normalized : null;
};
var serializeSidebarVisibleTypesSearchParam = (visibleTypes) => {
  const normalized = collectSidebarVisibleTypes([...visibleTypes]);
  if (normalized.length === 0) {
    return null;
  }
  return areSidebarVisibleTypesEqual(normalized, ALL_SIDEBAR_VISIBLE_TYPES) ? "all" : normalized.join(",");
};
var areSidebarVisibleTypesEqual = (left, right) => left.length === right.length && left.every((value, index) => value === right[index]);
var pickSidebarVisibleTypes = (current, allowed, fallback = allowed) => {
  const allowedSet = new Set(allowed);
  const filtered = normalizeSidebarVisibleTypes(current, fallback).filter(
    (type) => allowedSet.has(type)
  );
  return filtered.length > 0 ? filtered : [...fallback];
};
var withExclusiveSidebarVisibleType = (current, type, allowed, fallback = allowed) => {
  if (!allowed.includes(type)) {
    return pickSidebarVisibleTypes(current, allowed, fallback);
  }
  const selected = pickSidebarVisibleTypes(current, allowed, fallback);
  if (selected.length === 1 && selected[0] === type) {
    return [...fallback];
  }
  return [type];
};
var matchesSidebarVisibleType = (item, type) => {
  const itemType = item.type?.toLowerCase();
  const contentKey = typeof item.contentKey === "string" ? item.contentKey : "";
  if (type === "agent") {
    return itemType === "agent";
  }
  if (type === "app") {
    return itemType === "app" || contentKey.startsWith("app-");
  }
  if (type === "scheduled") {
    return itemType === "agent-automation" || contentKey.startsWith("agent-automation-") || itemType === "task" || contentKey.startsWith("task-");
  }
  if (type === "dialog") {
    return itemType === type && item.triggerType !== "scheduled_run" && item.triggerType !== "automation_run" && !item.parentTaskKey && !item.parentAutomationKey && // 子对话（由 startAgentRun/callAgent 派发的后台子任务）默认折叠到父对话下，
    // 不在平铺列表里单独显示；通过父行的折叠展开机制访问。
    !item.parentDialogId;
  }
  if (type === "file") {
    return itemType === "file" || itemType === "image";
  }
  if (type === "image") {
    return itemType === "image" || itemType === "file" && item.fileCategory === "image" || contentKey.startsWith("image-");
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
var matchesSidebarVisibleTypes = (item, visibleTypes) => normalizeSidebarVisibleTypes(visibleTypes).some(
  (type) => matchesSidebarVisibleType(item, type)
);

export {
  SIDEBAR_VISIBLE_TYPES_SEARCH_PARAM,
  DEFAULT_SIDEBAR_VISIBLE_TYPES,
  SPACE_HOME_TOPBAR_VISIBLE_TYPES,
  SPACE_ATTACHMENT_SUB_TYPES,
  SPACE_FILE_TOPBAR_VISIBLE_TYPES,
  SPACE_ALL_CONTENT_TYPES,
  areOnlySpaceAttachmentTypes,
  parseSidebarVisibleTypesSearchParam,
  serializeSidebarVisibleTypesSearchParam,
  areSidebarVisibleTypesEqual,
  pickSidebarVisibleTypes,
  withExclusiveSidebarVisibleType,
  matchesSidebarVisibleTypes
};
