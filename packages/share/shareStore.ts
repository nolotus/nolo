// 路径: share/shareStore.ts
// 职责：社区分享列表的客户端状态——module store + useSyncExternalStore，
// 从 Redux 剥离（原 shareSlice.ts）。
//
// SSR 安全设计：
// - client 进程级单例持有客户端 hydration 后的状态。
// - server 端并发请求不能共享这个单例（会串数据），故 render.tsx 在模块
//   顶层 registerShareSSROverride(() => getShareSSROverride()) 注册一个 ALS
//   getter；服务端渲染期间 getState() 优先返回 ALS 里的 per-request 状态，
//   读不到时才回退 client 单例。
// - SSR 渲染路径绝不在共享 client 单例上写（setSSRCommunityShares 只在
//   web/entry.tsx 客户端 boot 时调用）；服务端的预载结果通过 preloadSSRData
//   的返回值 + ALS 传入，并在 serializeState 里作为 `share` 字段下发。

import { useSyncExternalStore } from "react";
import type { ShareSummary } from "share/types";

export interface ShareCommunitySharesState {
  loading: boolean;
  error: string | null;
  data: ShareSummary[];
  nextCursor?: string;
}

export interface ShareStoreState {
  communityShares: ShareCommunitySharesState;
}

export type ShareSSROverrideGetter = () => ShareStoreState | null;

const createInitialState = (): ShareStoreState => ({
  communityShares: {
    loading: false,
    error: null,
    data: [],
    nextCursor: undefined,
  },
});

// --- 进程级 client 单例（hydration 后由 web/entry.tsx 写入） ---
let clientState: ShareStoreState = createInitialState();

// --- 服务端 SSR override 注册槽（render.tsx 顶层注册一次） ---
let ssrOverrideGetter: ShareSSROverrideGetter | null = null;

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
 * 服务端注册一个 ALS getter：返回当前请求的 share 状态或 null。
 * Client 永远不调用。render.tsx 模块顶层调用一次。
 */
export function registerShareSSROverride(getter: ShareSSROverrideGetter): void {
  ssrOverrideGetter = getter;
}

/**
 * 读取当前状态：SSR override（ALS）非空时优先返回 per-request 状态，
 * 否则回退 client 单例。SSR 渲染路径只读不写 client 单例。
 */
export function getState(): ShareStoreState {
  if (ssrOverrideGetter) {
    const override = ssrOverrideGetter();
    if (override) return override;
  }
  return clientState;
}

// --- Mutators（仅 client boot 调用） ---

/**
 * 客户端 hydration 后写入 SSR 预载的社区分享；server 渲染期不调用。
 * 注意：SSR override 激活时若误调用，这里只写 client 单例——
 * server 预载结果走 ALS，不会污染跨请求。
 */
export function setSSRCommunityShares(args: {
  data: ShareSummary[];
  nextCursor?: string;
}): void {
  clientState = {
    communityShares: {
      loading: false,
      error: null,
      data: Array.isArray(args.data) ? args.data : [],
      nextCursor: args.nextCursor,
    },
  };
  bump();
}

// --- Sync reads（与旧 selector 行为一致：只返回 { data, nextCursor }） ---

export function getSSRCommunityShares(): {
  data: ShareSummary[];
  nextCursor?: string;
} {
  const { communityShares } = getState();
  return {
    data: communityShares.data,
    ...(communityShares.nextCursor !== undefined
      ? { nextCursor: communityShares.nextCursor }
      : {}),
  };
}

// --- useSyncExternalStore ---

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): string {
  const { communityShares } = getState();
  return JSON.stringify({
    data: communityShares.data,
    nextCursor: communityShares.nextCursor ?? null,
  });
}

export function useSSRCommunityShares(): {
  data: ShareSummary[];
  nextCursor?: string;
} {
  // Third arg = getServerSnapshot so SSR/hydration use the same content snapshot
  // (version counters would mismatch between ALS server render and client boot).
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return getSSRCommunityShares();
}

export function resetShareStoreForTests(): void {
  clientState = createInitialState();
  ssrOverrideGetter = null;
  bump();
}