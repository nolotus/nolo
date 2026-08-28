import { describe, expect, it } from "bun:test";

import { desktopRuntimeRoutes } from "./desktopRuntimeRoutes";
import { prewarmDesktopRuntimeRoutes } from "./desktopRuntimeRoutes";

describe("desktopRuntimeRoutes 懒加载", () => {
  it("GET handler 是异步函数（首次命中触发动态 import）", () => {
    const updaterGet = desktopRuntimeRoutes["/api/desktop-updater"]?.GET;
    expect(typeof updaterGet).toBe("function");
    // lazy wrapper 应该是 async function，返回 Promise
    expect(updaterGet?.constructor?.name).toBe("AsyncFunction");
  });

  it("POST handler 是异步函数", () => {
    const clipboardPost = desktopRuntimeRoutes["/api/desktop/clipboard"]?.POST;
    expect(typeof clipboardPost).toBe("function");
    expect(clipboardPost?.constructor?.name).toBe("AsyncFunction");
  });

  it("OPTIONS 仍是同步的（不触发 lazy import）", () => {
    const options = desktopRuntimeRoutes["/api/desktop-updater"]?.OPTIONS;
    expect(typeof options).toBe("function");
    // OPTIONS 不是 async——它由 createApiRouteFamily 生成，与 handler 无关
    expect(options?.constructor?.name).not.toBe("AsyncFunction");
  });

  it("local-connector 路由保留原有独立懒加载", () => {
    const handler =
      desktopRuntimeRoutes["/api/desktop/local-connector/start"]?.POST;
    expect(typeof handler).toBe("function");
    expect(handler?.constructor?.name).toBe("AsyncFunction");
  });
});

describe("prewarmDesktopRuntimeRoutes 条件预加载", () => {
  // prewarmDesktopRuntimeRoutes 内部用 process.env.NOLO_DESKTOP 判定，测试里改 env
  // 只能在单进程内顺序执行；这两个 it 各自设置/还原 env。
  it("非桌面模式（NOLO_DESKTOP !== 1）跳过预加载，不抛错", () => {
    const orig = process.env.NOLO_DESKTOP;
    process.env.NOLO_DESKTOP = undefined;
    try {
      // 不应抛异常
      expect(() => prewarmDesktopRuntimeRoutes()).not.toThrow();
    } finally {
      process.env.NOLO_DESKTOP = orig;
    }
  });

  it("桌面模式（NOLO_DESKTOP=1）触发预加载，不抛错", () => {
    const orig = process.env.NOLO_DESKTOP;
    process.env.NOLO_DESKTOP = "1";
    try {
      expect(() => prewarmDesktopRuntimeRoutes()).not.toThrow();
    } finally {
      process.env.NOLO_DESKTOP = orig;
    }
  });
});