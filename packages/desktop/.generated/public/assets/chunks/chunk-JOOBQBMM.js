import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/core/prefix.ts
var extractKeyPart = (key, index) => {
  const parts = key.split("-");
  if (index < 2) {
    return parts[index];
  }
  return parts.slice(index).join("-");
};
var extractUserId = (key) => {
  const parts = key.split("-");
  if (parts.length === 2) {
    return parts[0];
  }
  if (parts[0] === "user" && parts[1] === "pref" && parts.length >= 3) {
    return parts[2];
  }
  return extractKeyPart(key, 1);
};
var extractCustomId = (key) => {
  if (key.startsWith("dialog-") && !key.includes("-msg-")) {
    const lastDash = key.lastIndexOf("-");
    return lastDash >= 0 ? key.slice(lastDash + 1) : key;
  }
  return extractKeyPart(key, 2);
};

// packages/core/compactWhitespace.ts
function compactWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

// packages/chat/dialog/dialogRuntimeTypes.ts
var GLOBAL_DIALOG_RUNTIME_KEY = "__global__";

// packages/chat/dialog/dialogRuntimeStore.ts
var import_react = __toESM(require_react());
var createEmptyTokenStats = () => ({
  inputTokens: 0,
  outputTokens: 0,
  totalCost: 0
});
var createEmptyDialogRuntimeState = () => ({
  tokens: createEmptyTokenStats(),
  pendingFiles: [],
  activeControllers: {},
  pendingRawData: {},
  loopStopReason: null,
  pendingUserInputQueue: []
});
var activeDialogKey = null;
var configError = null;
var runtimeByKey = {
  [GLOBAL_DIALOG_RUNTIME_KEY]: createEmptyDialogRuntimeState()
};
var listeners = /* @__PURE__ */ new Set();
var version = 0;
var notify = () => {
  version += 1;
  for (const listener of listeners) {
    try {
      listener();
    } catch {
    }
  }
};
var action = (type, payload) => ({ type, payload });
function setActiveDialogKey(key) {
  activeDialogKey = key;
  configError = null;
  notify();
}
function getActiveDialogKey() {
  return activeDialogKey;
}
function setDialogConfigError(error) {
  configError = error;
  notify();
}
function getDialogConfigError() {
  return configError;
}
var resolveDialogRuntimeKey = (dialogKey) => dialogKey ?? activeDialogKey ?? GLOBAL_DIALOG_RUNTIME_KEY;
var ensureDialogRuntimeState = (dialogKey) => {
  const runtimeKey = resolveDialogRuntimeKey(dialogKey);
  if (!runtimeByKey[runtimeKey]) {
    runtimeByKey[runtimeKey] = createEmptyDialogRuntimeState();
  }
  return runtimeByKey[runtimeKey];
};
function resetDialogRuntimeSessionState(dialogKey) {
  const runtime = ensureDialogRuntimeState(dialogKey);
  runtime.tokens = createEmptyTokenStats();
  runtime.loopStopReason = null;
  runtime.pendingUserInputQueue = [];
  notify();
}
function addPendingFile(payload) {
  const targetRuntimeKey = payload.targetDialogKey ?? payload.runtimeDialogKey ?? (payload.type === "dialog" ? activeDialogKey : payload.dialogKey);
  const runtime = ensureDialogRuntimeState(targetRuntimeKey);
  if (!runtime.pendingFiles.some((f) => f.id === payload.id)) {
    runtime.pendingFiles.push(payload);
    notify();
  }
  return action("dialogRuntime/addPendingFile", payload);
}
function removePendingFile(fileId) {
  const runtime = ensureDialogRuntimeState();
  const fileToRemove = runtime.pendingFiles.find((f) => f.id === fileId);
  if (fileToRemove) {
    if (fileToRemove.pageKey) {
      delete runtime.pendingRawData[fileToRemove.pageKey];
    }
    runtime.pendingFiles = runtime.pendingFiles.filter(
      (file) => file.id !== fileId
    );
    notify();
  }
  return action("dialogRuntime/removePendingFile", fileId);
}
function clearPendingAttachments(payload) {
  if (payload?.all) {
    Object.values(runtimeByKey).forEach((runtime2) => {
      runtime2.pendingFiles = [];
      runtime2.pendingRawData = {};
    });
    notify();
    return action("dialogRuntime/clearPendingAttachments", payload);
  }
  const runtime = ensureDialogRuntimeState(payload?.dialogKey);
  runtime.pendingFiles = [];
  runtime.pendingRawData = {};
  notify();
  return action("dialogRuntime/clearPendingAttachments", payload);
}
function setLoopStopReason(payload) {
  const runtime = ensureDialogRuntimeState(payload.dialogKey);
  runtime.loopStopReason = payload.reason;
  notify();
  return action("dialogRuntime/setLoopStopReason", payload);
}
function clearDialogRuntimeState(payload) {
  delete runtimeByKey[payload.dialogKey];
  notify();
  return action("dialogRuntime/clearDialogRuntimeState", payload);
}
function addActiveController(payload) {
  const runtime = ensureDialogRuntimeState(payload.dialogKey);
  runtime.activeControllers[payload.messageId] = payload.controller;
  notify();
  return action("dialogRuntime/addActiveController", payload);
}
function removeActiveController(payload) {
  const normalized = typeof payload === "string" ? { messageId: payload } : payload;
  const runtime = ensureDialogRuntimeState(normalized.dialogKey);
  delete runtime.activeControllers[normalized.messageId];
  notify();
  return action("dialogRuntime/removeActiveController", normalized);
}
function clearActiveControllers(payload) {
  if (payload?.all) {
    Object.values(runtimeByKey).forEach((runtime2) => {
      runtime2.activeControllers = {};
    });
    notify();
    return action("dialogRuntime/clearActiveControllers", payload);
  }
  const runtime = ensureDialogRuntimeState(payload?.dialogKey);
  runtime.activeControllers = {};
  notify();
  return action("dialogRuntime/clearActiveControllers", payload);
}
function enqueueUserInput(payload) {
  const normalized = typeof payload === "string" ? { text: payload } : payload;
  const runtime = ensureDialogRuntimeState(normalized.dialogKey);
  runtime.pendingUserInputQueue.push(normalized.text);
  notify();
  return action("dialogRuntime/enqueueUserInput", normalized);
}
function dequeueUserInput(payload) {
  const runtime = ensureDialogRuntimeState(payload?.dialogKey);
  runtime.pendingUserInputQueue.shift();
  notify();
  return action("dialogRuntime/dequeueUserInput", payload);
}
function clearPendingUserInputQueue(payload) {
  if (payload?.all) {
    Object.values(runtimeByKey).forEach((runtime2) => {
      runtime2.pendingUserInputQueue = [];
    });
    notify();
    return action("dialogRuntime/clearPendingUserInputQueue", payload);
  }
  const runtime = ensureDialogRuntimeState(payload?.dialogKey);
  runtime.pendingUserInputQueue = [];
  notify();
  return action("dialogRuntime/clearPendingUserInputQueue", payload);
}
function tokenUsageLiveUpdate(payload) {
  const runtime = ensureDialogRuntimeState(payload.dialogKey);
  runtime.tokens.inputTokens += payload.input_tokens;
  runtime.tokens.outputTokens += payload.output_tokens;
  runtime.tokens.totalCost += payload.cost ?? 0;
  notify();
  return action("dialogRuntime/tokenUsageLiveUpdate", payload);
}
function addPageReferenceToRuntime(payload) {
  const runtime = ensureDialogRuntimeState(payload.dialogKey);
  runtime.pendingFiles.push(payload.reference);
  if (payload.rawData?.pageKey) {
    runtime.pendingRawData[payload.rawData.pageKey] = payload.rawData;
  }
  notify();
}
function applyUpdateTokensFulfilled(payload) {
  const runtime = runtimeByKey[payload.dialogKey];
  if (!runtime) return;
  runtime.tokens.inputTokens = Math.max(
    0,
    runtime.tokens.inputTokens - (payload.input_tokens ?? 0)
  );
  runtime.tokens.outputTokens = Math.max(
    0,
    runtime.tokens.outputTokens - (payload.output_tokens ?? 0)
  );
  runtime.tokens.totalCost = Math.max(
    0,
    runtime.tokens.totalCost - (payload.cost ?? 0)
  );
  notify();
}
function applyClearDialogStateRuntime() {
  const previousDialogKey = activeDialogKey;
  const previousRuntime = previousDialogKey ? runtimeByKey[previousDialogKey] : null;
  const globalRuntime = ensureDialogRuntimeState(GLOBAL_DIALOG_RUNTIME_KEY);
  if (previousRuntime) {
    if (previousRuntime.pendingFiles.length > 0) {
      globalRuntime.pendingFiles = previousRuntime.pendingFiles;
      previousRuntime.pendingFiles = [];
    }
    previousRuntime.pendingRawData = {};
    previousRuntime.pendingUserInputQueue = [];
  }
  activeDialogKey = null;
  configError = null;
  globalRuntime.pendingRawData = {};
  globalRuntime.pendingUserInputQueue = [];
  notify();
}
function deleteDialogRuntime(dialogKey) {
  delete runtimeByKey[dialogKey];
  notify();
}
function abortActiveControllers(args) {
  const runtimes = args?.all ? Object.values(runtimeByKey) : [ensureDialogRuntimeState(args?.dialogKey)];
  runtimes.forEach((runtime) => {
    Object.values(runtime.activeControllers).forEach(
      (controller) => controller.abort()
    );
  });
}
function getDialogRuntimeState(dialogKey) {
  return runtimeByKey[resolveDialogRuntimeKey(dialogKey)] ?? createEmptyDialogRuntimeState();
}
function getPendingFiles(dialogKey) {
  return getDialogRuntimeState(dialogKey).pendingFiles;
}
function getActiveControllers(dialogKey) {
  return getDialogRuntimeState(dialogKey).activeControllers;
}
function getPendingRawData(dialogKey) {
  return getDialogRuntimeState(dialogKey).pendingRawData;
}
function getDialogRuntimeTokens(dialogKey) {
  return getDialogRuntimeState(dialogKey).tokens;
}
function getPendingRawDataByPageKey(pageKey) {
  return getDialogRuntimeState().pendingRawData[pageKey];
}
function getPendingUserInputQueue(dialogKey) {
  return getDialogRuntimeState(dialogKey).pendingUserInputQueue;
}
function getLoopStopReason(dialogKey) {
  return getDialogRuntimeState(dialogKey).loopStopReason;
}
var selectDialogRuntimeByKey = (_state, dialogKey) => getDialogRuntimeState(dialogKey);
var selectPendingFiles = (_state, dialogKey) => getPendingFiles(dialogKey);
var selectActiveControllers = (_state, dialogKey) => getActiveControllers(dialogKey);
var selectPendingRawData = (_state, dialogKey) => getPendingRawData(dialogKey);
var selectDialogRuntimeTokens = (_state, dialogKey) => getDialogRuntimeTokens(dialogKey);
var selectPendingRawDataByPageKey = (_state, pageKey) => getPendingRawDataByPageKey(pageKey);
var selectPendingUserInputQueue = (_state, dialogKey) => getPendingUserInputQueue(dialogKey);
var selectLoopStopReason = (_state, dialogKey) => getLoopStopReason(dialogKey);
var selectCurrentDialogKey = (_state) => getActiveDialogKey();
var selectConfigError = (_state) => getDialogConfigError();
function subscribe(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function getSnapshot() {
  return version;
}
function usePendingFiles(dialogKey) {
  (0, import_react.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
  return getPendingFiles(dialogKey);
}
function useActiveControllers(dialogKey) {
  (0, import_react.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
  return getActiveControllers(dialogKey);
}
function usePendingUserInputQueue(dialogKey) {
  (0, import_react.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
  return getPendingUserInputQueue(dialogKey);
}
function useLoopStopReason(dialogKey) {
  (0, import_react.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
  return getLoopStopReason(dialogKey);
}
function useDialogRuntimeTokens(dialogKey) {
  (0, import_react.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
  return getDialogRuntimeTokens(dialogKey);
}
function useCurrentDialogKey() {
  (0, import_react.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
  return getActiveDialogKey();
}
function useDialogConfigError() {
  (0, import_react.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
  return getDialogConfigError();
}

export {
  extractUserId,
  extractCustomId,
  compactWhitespace,
  GLOBAL_DIALOG_RUNTIME_KEY,
  setActiveDialogKey,
  getActiveDialogKey,
  setDialogConfigError,
  resetDialogRuntimeSessionState,
  addPendingFile,
  removePendingFile,
  clearPendingAttachments,
  setLoopStopReason,
  clearDialogRuntimeState,
  addActiveController,
  removeActiveController,
  clearActiveControllers,
  enqueueUserInput,
  dequeueUserInput,
  clearPendingUserInputQueue,
  tokenUsageLiveUpdate,
  addPageReferenceToRuntime,
  applyUpdateTokensFulfilled,
  applyClearDialogStateRuntime,
  deleteDialogRuntime,
  abortActiveControllers,
  getDialogRuntimeTokens,
  getPendingUserInputQueue,
  getLoopStopReason,
  selectDialogRuntimeByKey,
  selectPendingFiles,
  selectActiveControllers,
  selectPendingRawData,
  selectDialogRuntimeTokens,
  selectPendingRawDataByPageKey,
  selectPendingUserInputQueue,
  selectLoopStopReason,
  selectCurrentDialogKey,
  selectConfigError,
  usePendingFiles,
  useActiveControllers,
  usePendingUserInputQueue,
  useLoopStopReason,
  useDialogRuntimeTokens,
  useCurrentDialogKey,
  useDialogConfigError
};
