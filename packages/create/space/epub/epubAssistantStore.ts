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

export interface EpubPromptDraft {
  contentKey: string;
  text: string;
}

let snapshot: EpubAssistantSnapshot | null = null;
let promptDraftSnapshot: EpubPromptDraft | null = null;
const listeners = new Set<() => void>();
const promptDraftListenersByKey = new Map<string, Set<() => void>>();

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

const notifyPromptDraft = (contentKey: string) => {
  const keyListeners = promptDraftListenersByKey.get(contentKey);
  if (!keyListeners) return;
  for (const listener of Array.from(keyListeners)) {
    try {
      listener();
    } catch (error) {
      console.warn("[epub-assistant] prompt draft listener failed", error);
    }
  }
};

export const subscribeEpubPromptDraft = (
  contentKey: string,
  listener: () => void
): (() => void) => {
  if (!contentKey) return () => {};
  let set = promptDraftListenersByKey.get(contentKey);
  if (!set) {
    set = new Set();
    promptDraftListenersByKey.set(contentKey, set);
  }
  set.add(listener);
  return () => {
    set?.delete(listener);
    if (set && set.size === 0) {
      promptDraftListenersByKey.delete(contentKey);
    }
  };
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

/**
 * 发布一次性「引用问 AI」输入框草稿（仅按 contentKey 存进本 store 并通知对应书籍的订阅者，
 * 不再全局广播覆盖其他对话）。由匹配的右侧助手面板在对话就绪后消费并定向送入对应 dialogId。
 */
export const publishEpubPromptDraft = (contentKey: string, text: string): void => {
  if (!contentKey || !text) return;
  const previousKey = promptDraftSnapshot?.contentKey;
  promptDraftSnapshot = { contentKey, text };
  if (previousKey && previousKey !== contentKey) {
    notifyPromptDraft(previousKey);
  }
  notifyPromptDraft(contentKey);
};

export const getEpubPromptDraft = (contentKey?: string | null): string | null =>
  contentKey && promptDraftSnapshot?.contentKey === contentKey ? promptDraftSnapshot.text : null;

export const useEpubPromptDraft = (contentKey?: string | null): string | null => {
  return useSyncExternalStore(
    (listener) => (contentKey ? subscribeEpubPromptDraft(contentKey, listener) : () => {}),
    () => (contentKey && promptDraftSnapshot?.contentKey === contentKey ? promptDraftSnapshot.text : null),
    () => null
  );
};

export const consumeEpubPromptDraft = (contentKey?: string | null): string | null => {
  if (!contentKey || promptDraftSnapshot?.contentKey !== contentKey) return null;
  const text = promptDraftSnapshot.text;
  promptDraftSnapshot = null;
  notifyPromptDraft(contentKey);
  return text;
};

/** 只清理自己发布的那条：切到另一本书时新书已发布，旧书卸载不会误清。 */
export const clearEpubPromptDraft = (contentKey: string): void => {
  if (promptDraftSnapshot?.contentKey !== contentKey) return;
  promptDraftSnapshot = null;
  notifyPromptDraft(contentKey);
};
