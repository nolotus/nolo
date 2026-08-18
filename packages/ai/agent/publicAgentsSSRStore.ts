// 路径: ai/agent/publicAgentsSSRStore.ts
// 职责：首页 SSR 公开 Agent 列表（原 agentSlice.pubAgents）的客户端状态——
// module store + useSyncExternalStore，从 Redux 剥离（Wave5，镜像 Wave4 shareStore）。
//
// SSR 安全设计：
// - client 进程级单例持有客户端 hydration 后的状态。
// - server 端并发请求不能共享这个单例（会串数据），故 render.tsx 在模块
//   顶层 registerPublicAgentsSSROverride(() => getPublicAgentsSSROverride())
//   注册一个 ALS getter；服务端渲染期间 getState() 优先返回 ALS 里的
//   per-request 状态，读不到时才回退 client 单例。
// - SSR 渲染路径绝不在共享 client 单例上写（setSSRPublicAgents 只在
//   web/entry.tsx 客户端 boot 时调用）；服务端的预载结果通过 preloadSSRData
//   的返回值 + ALS 传入，并在 serializeState 里作为 `agent.pubAgents` 字段下发
//   （保留旧 Redux key shape，方便 entry.tsx 解析）。

import { useSyncExternalStore } from "react";
import type { Agent } from "app/types";

export interface PublicAgentsSSRState {
  loading: boolean;
  error: string | null;
  data: Agent[];
}

export type PublicAgentsSSROverrideGetter = () => PublicAgentsSSRState | null;

const createInitialState = (): PublicAgentsSSRState => ({
  loading: false,
  error: null,
  data: [],
});

// --- 进程级 client 单例（hydration 后由 web/entry.tsx 写入） ---
let clientState: PublicAgentsSSRState = createInitialState();

// --- 服务端 SSR override 注册槽（render.tsx 顶层注册一次） ---
let ssrOverrideGetter: PublicAgentsSSROverrideGetter | null = null;

const listeners = new Set<() => void>();

const notify = (): void => {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      /* subscriber errors must not break mutators */
    }
  }
};

// Content-snapshot store (getSnapshot JSON) — no version counter needed.
const bump = (): void => {
  notify();
};

/**
 * 服务端注册一个 ALS getter：返回当前请求的 pubAgents 状态或 null。
 * Client 永远不调用。render.tsx 模块顶层调用一次。
 */
export function registerPublicAgentsSSROverride(
  getter: PublicAgentsSSROverrideGetter
): void {
  ssrOverrideGetter = getter;
}

/**
 * 读取当前状态：SSR override（ALS）非空时优先返回 per-request 状态，
 * 否则回退 client 单例。SSR 渲染路径只读不写 client 单例。
 */
export function getState(): PublicAgentsSSRState {
  if (ssrOverrideGetter) {
    const override = ssrOverrideGetter();
    if (override) return override;
  }
  return clientState;
}

/**
 * 客户端 hydration 后写入 SSR 预载的公开 Agent 列表；server 渲染期不调用。
 * 注意：SSR override 激活时若误调用，这里只写 client 单例——
 * server 预载结果走 ALS，不会污染跨请求。
 */
export function setSSRPublicAgents(data: Agent[]): void {
  clientState = {
    loading: false,
    error: null,
    data: Array.isArray(data) ? data : [],
  };
  bump();
}

/** 同步读取当前公开 Agent 列表（与旧 selectSSRPublicAgents 行为一致）。 */
export function getSSRPublicAgents(): Agent[] {
  return getState().data;
}

// --- useSyncExternalStore ---

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Content snapshot string for hydrate-safe useSyncExternalStore
 * (JSON of data ids/length). 用内容快照而非 version 计数器，避免 ALS 服务端
 * 渲染与客户端 boot 之间 version 不一致导致 hydration mismatch。
 */
export function getSnapshot(): string {
  const { data } = getState();
  return JSON.stringify({ len: data.length, ids: data.map((a) => a?.id ?? null) });
}

export function useSSRPublicAgents(): Agent[] {
  // Third arg = getServerSnapshot so SSR/hydration use the same content snapshot
  // (version counters would mismatch between ALS server render and client boot).
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return getSSRPublicAgents();
}

export function resetPublicAgentsSSRStoreForTests(): void {
  clientState = createInitialState();
  ssrOverrideGetter = null;
  bump();
}