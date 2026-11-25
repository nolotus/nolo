// create/space/epub/epubAssistantStore.ts
//
// 阅读器 → 右侧「文件助手」的上下文桥。沿用仓库现有通道：ObjectAssistantPanel 本来就从
// 独立的外部 store（docStore / tableStore / appInspectorStore）读取当前对象状态，再组成
// runtimeOptions.editingTarget.metadata，由 buildEditingContextSummary 写进 prompt。
// 这里同构地放一个按 contentKey 存放「当前电子书上下文」的最小 store，不新造平行机制。
import { useSyncExternalStore } from "react";
import type { EpubAssistantContext } from "./epubParser";

export interface EpubAssistantSnapshot {
  contentKey: string;
  context: EpubAssistantContext;
}

let snapshot: EpubAssistantSnapshot | null = null;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const notify = () => {
  for (const listener of Array.from(listeners)) {
    try {
      listener();
    } catch (error) {
      console.warn("[epub-assistant] listener failed", error);
    }
  }
};

export const publishEpubAssistantContext = (contentKey: string, context: EpubAssistantContext) => {
  snapshot = { contentKey, context };
  notify();
};

/** 只清理自己发布的那条：切到另一本书时新书已发布，旧书卸载不会误清。 */
export const clearEpubAssistantContext = (contentKey: string) => {
  if (snapshot?.contentKey !== contentKey) return;
  snapshot = null;
  notify();
};

export const getEpubAssistantContext = (contentKey?: string | null): EpubAssistantContext | null =>
  contentKey && snapshot?.contentKey === contentKey ? snapshot.context : null;

export const useEpubAssistantContext = (contentKey?: string | null): EpubAssistantContext | null => {
  const current = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => null
  );
  return contentKey && current?.contentKey === contentKey ? current.context : null;
};
