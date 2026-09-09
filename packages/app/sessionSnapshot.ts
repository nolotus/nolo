/**
 * @deprecated Legacy compatibility projection.
 * 会话快照桥：旧 app/settings 读端（usage 域卡片、浪点配置、多服务器删除）的过渡镜像。
 *
 * 架构边界说明（Phase 1.1+）：
 * - identity / account / token / balance 的权威读端已迁至 `AccountSessionCore`（`packages/auth/session` 与 `identity` hooks）。
 * - 业务与身份 UI 禁止新增对本文件的依赖。
 * - server / servers 等设置域状态未来将迁移至独立 settings / runtime 快照。
 * - 本文件仅保留供现有 usage/surf widget 等 legacy 消费方兼容使用。
 */
import { useSyncExternalStore } from "react";

export interface SessionSnapshot {
  token: string | null;
  server: string;
  balance: number | undefined;
  userId: string | null;
  /** 远程服务器列表（currentServer + syncServers），供账号删除等多服务器写操作读端使用 */
  servers: string[];
}

export type SnapshotReader = (state: any) => SessionSnapshot;

const EMPTY: SessionSnapshot = {
  token: null,
  server: "",
  balance: undefined,
  userId: null,
  servers: [],
};

interface SessionStoreLike {
  getState(): any;
  subscribe(fn: () => void): () => void;
}

let reader: SnapshotReader | null = null;
let attached: SessionStoreLike | null = null;
let snapshot: SessionSnapshot = EMPTY;
let unsub: (() => void) | null = null;
const listeners = new Set<() => void>();

const emit = () => {
  listeners.forEach((fn) => fn());
};

const readSnapshot = (store: SessionStoreLike): SessionSnapshot =>
  reader ? reader(store.getState()) : EMPTY;

/**
 * 由 createAppStore 传入快照读取函数（store.ts 用现有 selectors 组装）。
 */
export function configureSessionSnapshot(fn: SnapshotReader): void {
  reader = fn;
  if (attached) {
    snapshot = readSnapshot(attached);
    emit();
  }
}

/** 由 createAppStore 在实例创建后调用。返回解绑函数。 */
export function attachSessionSnapshot(store: SessionStoreLike): () => void {
  unsub?.();
  attached = store;
  snapshot = readSnapshot(store);
  unsub = store.subscribe(() => {
    snapshot = readSnapshot(store);
    emit();
  });
  emit();
  return () => {
    unsub?.();
    unsub = null;
    attached = null;
  };
}

/** 快照桥是否已挂载（web 客户端 createAppStore 挂载；RN 等未挂桥环境为 false，调用方需兜底）。 */
export const isSessionSnapshotAttached = (): boolean => attached !== null;

export const getSessionSnapshot = (): SessionSnapshot => snapshot;

export const subscribeSessionSnapshot = (fn: () => void): (() => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

export const useSessionSnapshot = (): SessionSnapshot =>
  // 第三参 getServerSnapshot 必填：/life,/life/usage 为 lazy 路由且无登录门，
  // hydrate 恢复 mount 时若缺它会 throw（W1，2026-08-21 review）。
  useSyncExternalStore(
    subscribeSessionSnapshot,
    getSessionSnapshot,
    getSessionSnapshot
  );
