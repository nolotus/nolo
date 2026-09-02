// 文件: render/web/ui/toastStore.ts
//
// Toast 的状态存储（无 JSX、无样式、无 DOM 依赖的纯 TS）。
//
// 为什么单独成文件：app/utils/toast.ts 这类非 UI 模块（以及它的下游
// ai/token/saveTokenRecord → CLI / agent run worker）只需要 toastManager，
// 不需要组件。此前 toastManager 住在 Toast.tsx，而它静态 import
// toast.styles.ts——StyleX 的 create/keyframes 是编译期 API，bun 裸运行时
// （非 test、非 esbuild bundle）加载即崩：
// "Unexpected 'stylex.keyframes' call at runtime"。
// 2026-09-02 stylex-phase3 合入 alpha 后，本地 run worker 经
// cli → saveTokenRecord → app/utils/toast → Toast.tsx → toast.styles.ts
// 链条启动即崩（review 通道整体不可用）。拆分后非 UI 下游只接本文件，
// StyleX 载体留在组件侧。

import type { ReactNode } from "react";

export type ToastType = "success" | "error" | "loading" | "default";

export interface InternalToast {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  action?: { label: string; onClick: () => void };
  position?: { x: number; y: number };
  type?: ToastType;
  icon?: ReactNode;
  timeout?: number;
  phase: "entering" | "visible" | "exiting";
}

type Listener = () => void;

// Must match the CSS transition duration (.toast-root transition) so exits
// finish before the node is removed.
const EXIT_MS = 320;

// requestAnimationFrame 在裸 bun（CLI / run worker）里不存在；这些环境下
// toast 永远不会被渲染，用 setTimeout 兜底保证调用方不崩。
const raf: (cb: () => void) => void =
  typeof globalThis.requestAnimationFrame === "function"
    ? (cb) => globalThis.requestAnimationFrame(cb)
    : (cb) => {
        setTimeout(cb, 16);
      };

export class ToastStore {
  private toasts: InternalToast[] = [];
  private listeners = new Set<Listener>();
  private nextId = 0;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): InternalToast[] => this.toasts;

  add(item: {
    id?: string;
    title: ReactNode;
    description?: ReactNode;
    action?: { label: string; onClick: () => void };
    position?: { x: number; y: number };
    type?: ToastType;
    icon?: ReactNode;
    timeout?: number;
  }): string {
    const id = item.id ?? `toast-${++this.nextId}`;
    const filtered = this.toasts.filter((t) => t.id !== id);
    const entry: InternalToast = { ...item, id, phase: "entering" };
    this.toasts = [...filtered, entry];
    this.notify();

    // entering → visible next frame; removing data-starting-style fires the
    // CSS enter transition.
    raf(() =>
      raf(() => {
        this.toasts = this.toasts.map((t) =>
          t.id === id ? { ...t, phase: "visible" } : t,
        );
        this.notify();
      }),
    );

    if (item.timeout && item.timeout > 0) {
      setTimeout(() => this.close(id), item.timeout);
    }

    return id;
  }

  close(id?: string) {
    if (id) {
      if (!this.toasts.some((t) => t.id === id)) return;
      this.toasts = this.toasts.map((t) =>
        t.id === id ? { ...t, phase: "exiting" } : t,
      );
    } else {
      this.toasts = this.toasts.map((t) => ({ ...t, phase: "exiting" }));
    }
    this.notify();
    setTimeout(() => {
      this.toasts = id ? this.toasts.filter((t) => t.id !== id) : [];
      this.notify();
    }, EXIT_MS);
  }

  private notify = () => {
    this.listeners.forEach((fn) => fn());
  };
}

// Module-level toast manager — usable from outside React (toast.ts adapter).
export const toastManager = new ToastStore();
