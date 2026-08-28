// 路径: ai/agent/publicAgentsSSRAls.ts
// 职责：服务端 SSR 专用——用 AsyncLocalStorage 隔离每个请求的公开 Agent 列表
// 状态，避免进程级 module 单例在并发请求间串数据（cross-request leakage）。
// 镜像 Wave4 share/shareSSRAls.ts。
//
// 仅 server 使用；client bundle 永远不会 import 这个文件。
// render.tsx 在模块顶层 registerPublicAgentsSSROverride(() => getPublicAgentsSSROverride())，
// 并在每次请求里 runWithPublicAgentsSSR(pubAgentsState, () => render...) 包住整段渲染。

import { AsyncLocalStorage } from "node:async_hooks";
import type { PublicAgentsSSRState } from "./publicAgentsSSRStore";

const publicAgentsSSRAls = new AsyncLocalStorage<PublicAgentsSSRState>();

/**
 * 在给定的 pubAgents 状态上下文里执行 fn；fn 内部（含 await 的 async 边界）
 * 通过 getPublicAgentsSSROverride() 都能读到同一份 per-request 状态。
 * Node ALS 跨 await 自动继承，故流式渲染的 IIFE 也在上下文内。
 */
export function runWithPublicAgentsSSR<T>(
  state: PublicAgentsSSRState,
  fn: () => T
): T {
  return publicAgentsSSRAls.run(state, fn);
}

/**
 * 返回当前请求上下文里的 pubAgents 状态；不在 runWithPublicAgentsSSR 上下文里时返回 null。
 */
export function getPublicAgentsSSROverride(): PublicAgentsSSRState | null {
  return publicAgentsSSRAls.getStore() ?? null;
}