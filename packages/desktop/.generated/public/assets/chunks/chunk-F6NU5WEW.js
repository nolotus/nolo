import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/appInspector/appInspectorStore.ts
var import_react = __toESM(require_react());
var listeners = /* @__PURE__ */ new Set();
var version = 0;
var inspecting = false;
var appKey = null;
var selectedNode = null;
var previewOpen = false;
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
function setInspecting(nextInspecting) {
  inspecting = nextInspecting;
  bump();
}
function setSelectedNode(args) {
  appKey = args.appKey;
  selectedNode = args.node;
  bump();
}
function clearSelectedNode() {
  selectedNode = null;
  appKey = null;
  bump();
}
function setPreviewOpen(next) {
  previewOpen = next;
  if (!next) {
    inspecting = false;
  }
  bump();
}
function getPreviewOpen() {
  return previewOpen;
}
function getInspecting() {
  return inspecting;
}
function getSelectedNode() {
  return selectedNode;
}
function subscribe(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function getSnapshot() {
  return version;
}
function useAppInspecting() {
  (0, import_react.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
  return getInspecting();
}
function useAppSelectedNode() {
  (0, import_react.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
  return getSelectedNode();
}
function useLocalPreviewOpen() {
  (0, import_react.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
  return getPreviewOpen();
}

export {
  setInspecting,
  setSelectedNode,
  clearSelectedNode,
  setPreviewOpen,
  useAppInspecting,
  useAppSelectedNode,
  useLocalPreviewOpen
};
