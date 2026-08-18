// 路径: share/shareSSRAls.ts
// 职责：服务端 SSR 专用——用 AsyncLocalStorage 隔离每个请求的 share 状态，
// 避免进程级 module 单例在并发请求间串数据（cross-request leakage）。
//
// 仅 server 使用；client bundle 永远不会 import 这个文件。
// render.tsx 在模块顶层 registerShareSSROverride(() => getShareSSROverride())，
// 并在每次请求里 runWithShareSSR(shareState, () => render...) 包住整段渲染。

import { AsyncLocalStorage } from "node:async_hooks";
import type { ShareStoreState } from "./shareStore";

const shareSSRAls = new AsyncLocalStorage<ShareStoreState>();

/**
 * 在给定的 share 状态上下文里执行 fn；fn 内部（含 await 的 async 边界）
 * 通过 getShareSSROverride() 都能读到同一份 per-request 状态。
 * Node ALS 跨 await 自动继承，故流式渲染的 IIFE 也在上下文内。
 */
export function runWithShareSSR<T>(state: ShareStoreState, fn: () => T): T {
  return shareSSRAls.run(state, fn);
}

/**
 * 返回当前请求上下文里的 share 状态；不在 runWithShareSSR 上下文里时返回 null。
 */
export function getShareSSROverride(): ShareStoreState | null {
  return shareSSRAls.getStore() ?? null;
}