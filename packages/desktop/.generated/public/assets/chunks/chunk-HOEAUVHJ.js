import {
  asTrimmedString
} from "/public/assets/chunks/chunk-PN3BZAFX.js";

// packages/chat/web/sidebar/recentlyCreatedStore.ts
var FLASH_TTL_MS = 2500;
var keys = /* @__PURE__ */ new Set();
var clearTimers = /* @__PURE__ */ new Map();
var listeners = /* @__PURE__ */ new Set();
var version = 0;
var notify = () => {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
    }
  }
};
var bump = () => {
  version += 1;
  notify();
};
function markRecentlyCreated(contentKey) {
  const key = asTrimmedString(contentKey);
  if (!key) return;
  const existingTimer = clearTimers.get(key);
  if (existingTimer !== void 0) {
    clearTimeout(existingTimer);
    clearTimers.delete(key);
  }
  const wasPresent = keys.has(key);
  keys.add(key);
  if (!wasPresent) {
    bump();
  }
  const timer = setTimeout(() => {
    clearTimers.delete(key);
    clearRecentlyCreated(key);
  }, FLASH_TTL_MS);
  clearTimers.set(key, timer);
}
function clearRecentlyCreated(contentKey) {
  const key = asTrimmedString(contentKey);
  if (!key) return;
  const existingTimer = clearTimers.get(key);
  if (existingTimer !== void 0) {
    clearTimeout(existingTimer);
    clearTimers.delete(key);
  }
  if (!keys.has(key)) return;
  keys.delete(key);
  bump();
}
function isRecentlyCreated(contentKey) {
  const key = asTrimmedString(contentKey);
  if (!key) return false;
  return keys.has(key);
}
function hasRecentlyCreated() {
  return keys.size > 0;
}
function getSnapshot() {
  return version;
}
function subscribe(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export {
  markRecentlyCreated,
  isRecentlyCreated,
  hasRecentlyCreated,
  getSnapshot,
  subscribe
};
