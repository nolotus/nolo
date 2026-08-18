// packages/desktop-runtime/entry.ts
// 独立的单机运行时入口：启动本地 HTTP server，注册桌面运行时路由 + 静态文件托管。
// 不依赖任何云端私有模块（auth/billing/cloud-server）。
// desktop 客户端直接 import 此入口，公开仓库可独立 build。

import { serve, file as bunFile } from "bun";
import { join } from "node:path";
import { desktopRuntimeRoutes, prewarmDesktopRuntimeRoutes } from "./desktopRuntimeRoutes";

const HTTP_PORT = Number(process.env.HTTP_PORT ?? 80);
const HTTP_HOST = process.env.PLATFORM_SERVER_HOST ?? "127.0.0.1";
const publicDir = process.env.NOLO_PUBLIC_DIR ?? join(process.cwd(), "public");

let httpServer: ReturnType<typeof serve> | null = null;
let bootPromise: Promise<void> | null = null;

/**
 * 启动单机运行时 HTTP server。
 * - 注册桌面运行时 API 路由（/api/desktop/*）
 * - serve 静态前端文件（NOLO_PUBLIC_DIR）
 * - 响应 HEAD / 供 waitForServer 探测
 */
export const bootstrapServer = async (): Promise<void> => {
  if (bootPromise) return bootPromise;

  bootPromise = (async () => {
    // 将 desktopRuntimeRoutes 转为 Bun.serve 的 routes 格式
    const routes: Record<string, Record<string, Function>> = {};
    for (const route of desktopRuntimeRoutes) {
      const key = route.path;
      routes[key] = route.handlers;
    }

    httpServer = serve({
      port: HTTP_PORT,
      hostname: HTTP_HOST,
      routes,
      fetch: async (req: Request) => {
        const url = new URL(req.url);

        // HEAD / → 200 for waitForServer probe
        if (req.method === "HEAD" && url.pathname === "/") {
          return new Response(null, { status: 200 });
        }

        // Serve static files from publicDir (with path traversal protection)
        const rawPath = url.pathname === "/" ? "index.html" : url.pathname;
        const resolvedPath = join(publicDir, rawPath);
        if (!resolvedPath.startsWith(publicDir)) {
          return new Response("Forbidden", { status: 403 });
        }
        const file = bunFile(resolvedPath);
        if (await file.exists()) {
          return new Response(file);
        }

        // SPA fallback: return index.html for non-file routes
        const indexFile = bunFile(join(publicDir, "index.html"));
        if (await indexFile.exists()) {
          return new Response(indexFile);
        }

        return new Response("Not Found", { status: 404 });
      },
    });

    console.log(`[desktop-runtime] listening on ${HTTP_HOST}:${HTTP_PORT}`);

    // 预热桌面运行时路由懒加载模块
    prewarmDesktopRuntimeRoutes();
  })();

  return bootPromise;
};

export const shutdownServer = async (): Promise<void> => {
  if (httpServer) {
    httpServer.stop(false);
    httpServer = null;
  }
  bootPromise = null;
};

// Autostart（与私有仓库 server/entry.ts 行为对齐）
if (import.meta.hot) {
  if (!(globalThis as any).__serverBootstrapped) {
    (globalThis as any).__serverBootstrapped = true;
    bootstrapServer();
  }
} else if (process.env.NOLO_SERVER_AUTOSTART !== "0") {
  bootstrapServer();
}