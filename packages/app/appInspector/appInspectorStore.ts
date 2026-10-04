import { useSyncExternalStore } from "react";

export interface AppSelectedNode {
  cssPath: string;
  tagName: string;
  classList: string[];
  textSnippet: string;
  outerHTMLSnippet: string;
  noloLoc?: string;
}

export type PreviewTarget =
  | { kind: "dev"; spaceId?: string; url: string; title?: string }
  | { kind: "artifact"; title?: string; html: string; ref?: string }
  | { kind: "url"; url: string; title?: string };

const listeners = new Set<() => void>();
let version = 0;

let inspecting = false;
let appKey: string | null = null;
let selectedNode: AppSelectedNode | null = null;
/** 本地预览是否占据主区（对话被挤到右侧）。 */
let previewOpen = false;
/** 出菜区 iframe 当前加载的 URL；null = 面板自己起本地预览服务（旧行为）。 */
let previewUrl: string | null = null;
/** 当前分栏工作台的目标载荷（区分开发工程、单文件制品与外部网页）。 */
let previewTarget: PreviewTarget | null = null;

export function isLocalDevUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host === "::1" ||
      host === "[::1]" ||
      (typeof window !== "undefined" && parsed.origin === window.location.origin)
    );
  } catch {
    return false;
  }
}

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

export function setPreviewUrl(next: string | null): void {
  previewUrl = next;
  if (next) {
    previewTarget = isLocalDevUrl(next)
      ? { kind: "dev", url: next }
      : { kind: "url", url: next };
  } else {
    previewTarget = null;
  }
  bump();
}

export function setPreview(open: boolean, url?: string | null): void {
  previewOpen = open;
  if (url !== undefined) {
    previewUrl = url;
    if (url) {
      previewTarget = isLocalDevUrl(url)
        ? { kind: "dev", url }
        : { kind: "url", url };
    } else {
      previewTarget = null;
    }
  }
  if (!open) inspecting = false;
  bump();
}

export function openPreviewTarget(target: PreviewTarget): void {
  previewOpen = true;
  previewTarget = target;
  if (target.kind === "dev" || target.kind === "url") {
    previewUrl = target.url;
  } else {
    previewUrl = null;
  }
  bump();
}

export function getPreviewOpen(): boolean {
  return previewOpen;
}

export function getPreviewUrl(): string | null {
  return previewUrl;
}

export function getPreviewTarget(): PreviewTarget | null {
  return previewTarget;
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

export function useLocalPreviewUrl(): string | null {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return getPreviewUrl();
}

export function useLocalPreviewTarget(): PreviewTarget | null {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return getPreviewTarget();
}

export function resetAppInspectorStoreForTests(): void {
  inspecting = false;
  appKey = null;
  selectedNode = null;
  previewOpen = false;
  previewUrl = null;
  previewTarget = null;
  bump();
}
