import { useSyncExternalStore } from "react";

export interface AppSelectedNode {
  cssPath: string;
  tagName: string;
  classList: string[];
  textSnippet: string;
  outerHTMLSnippet: string;
  noloLoc?: string;
}

const listeners = new Set<() => void>();
let version = 0;

let inspecting = false;
let appKey: string | null = null;
let selectedNode: AppSelectedNode | null = null;
/** 本地预览是否占据主区（对话被挤到右侧）。 */
let previewOpen = false;

const notify = (): void => {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      /* subscriber errors must not break mutators */
    }
  }
};

const bump = (): void => {
  version += 1;
  notify();
};

export function setInspecting(nextInspecting: boolean): void {
  inspecting = nextInspecting;
  bump();
}

export function setSelectedNode(args: { appKey: string; node: AppSelectedNode }): void {
  appKey = args.appKey;
  selectedNode = args.node;
  bump();
}

export function clearSelectedNode(): void {
  selectedNode = null;
  appKey = null;
  bump();
}

export function setPreviewOpen(next: boolean): void {
  previewOpen = next;
  if (!next) {
    inspecting = false;
  }
  bump();
}

export function getPreviewOpen(): boolean {
  return previewOpen;
}

export function getInspecting(): boolean {
  return inspecting;
}

export function getSelectedNode(): AppSelectedNode | null {
  return selectedNode;
}

export function getAppKey(): string | null {
  return appKey;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): number {
  return version;
}

export function useAppInspecting(): boolean {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return getInspecting();
}

export function useAppSelectedNode(): AppSelectedNode | null {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return getSelectedNode();
}

export function useLocalPreviewOpen(): boolean {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return getPreviewOpen();
}

export function resetAppInspectorStoreForTests(): void {
  inspecting = false;
  appKey = null;
  selectedNode = null;
  previewOpen = false;
  bump();
}
