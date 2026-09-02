// packages/desktop-runtime/entry.ts
// 独立的单机运行时入口：启动本地 HTTP server，注册桌面运行时路由 + 静态文件托管。
// 不依赖任何云端私有模块（auth/billing/cloud-server）。
// desktop 客户端直接 import 此入口，公开仓库可独立 build。

import { serve, file as bunFile } from "bun";
import { join, resolve, sep } from "node:path";
import { readFileSync } from "node:fs";
import { desktopRuntimeRoutes, prewarmDesktopRuntimeRoutes } from "./desktopRuntimeRoutes";

const HTTP_PORT = Number(process.env.HTTP_PORT ?? 80);
const HTTP_HOST = process.env.PLATFORM_SERVER_HOST ?? "127.0.0.1";
const publicDir = process.env.NOLO_PUBLIC_DIR ?? join(process.cwd(), "public");

/**
 * esBuild 从不产出 index.html —— HTML 壳由服务端动态生成（与私有仓库 SSR 链路一致）。
 * 这里读取构建产物清单，为 SPA 文档注入入口 JS/CSS 与 artifact runtime 位置。
 */
type DesktopShellAssets = { js: string; css: string; artifactRuntimeJs: string };

const FALLBACK_SHELL_ASSETS: DesktopShellAssets = {
  js: "/public/assets/entry.js",
  css: "/public/assets/entry.css",
  artifactRuntimeJs: "",
};

const readShellAssets = (): DesktopShellAssets => {
  try {
    const parsed = JSON.parse(readFileSync(join(publicDir, "latest-assets.json"), "utf8")) as {
      js?: string;
      css?: string;
      artifactRuntimeJs?: string;
    };
    return {
      js: parsed.js || FALLBACK_SHELL_ASSETS.js,
      css: parsed.css || FALLBACK_SHELL_ASSETS.css,
      artifactRuntimeJs: parsed.artifactRuntimeJs || "",
    };
  } catch (error) {
    // Fail loud-ish: a corrupt/missing manifest used to silently white-screen the
    // desktop app. Surface it, then fall back to the (predictably 404) stubs.
    console.warn("[desktop-runtime] failed to read latest-assets.json", error);
    return FALLBACK_SHELL_ASSETS;
  }
};

// Local copy of packages/server/render.tsx serializeInlineJson. desktop-runtime
// must not import from packages/server (private cloud deps), so the escape set
// is mirrored here — keep the two in sync when changing either side.
const serializeInlineJson = (value: unknown): string =>
  JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");

// Assets are fixed at build time; read the manifest once and reuse it for the
// lifetime of the server instead of hitting the filesystem on every request.
let shellAssetsCache: DesktopShellAssets | null = null;
const getShellAssets = (): DesktopShellAssets =>
  shellAssetsCache ?? (shellAssetsCache = readShellAssets());

const renderDesktopShellHtml = (): string => {
  const assets = getShellAssets();
  // 与私有仓库 render.tsx 桌面模式注入对齐：isDesktopApp 依赖 window.__NOLO_DESKTOP__，
  // artifact runtime 依赖 window.__NOLO_ASSETS__。edition 留空由客户端 bundle 自行判定，
  // 避免 conditions 不一致触发 entry.tsx 的 edition mismatch 白屏守卫。
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>Nolo</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <link rel="icon" href="/public/favicon.svg" type="image/svg+xml" />
  <link rel="stylesheet" href="${assets.css}" />
  <script>window.__NOLO_DESKTOP__=true;</script>
  <script>window.__NOLO_ASSETS__=${serializeInlineJson({
    artifactRuntimeJs: assets.artifactRuntimeJs,
    artifactRuntimePreloads: [],
  })};</script>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="${assets.js}"></script>
</body>
</html>`;
};

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
    // createApiRouteFamily already returns Bun.serve's path -> handlers map.
    const routes = desktopRuntimeRoutes;

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

        // Unknown API routes must never fall through to the SPA document.
        // This keeps server-only developer tools unavailable in the standalone runtime.
        if (url.pathname.startsWith("/api/")) {
          return new Response("Not Found", { status: 404 });
        }

        // Static assets live under /public/* — strip the prefix before joining
        // publicDir (mirrors the legacy publicRequestHandler contract, which
        // removes "/public" instead of treating it as a directory inside publicDir).
        let relativePath = url.pathname;
        if (relativePath === "/public") {
          relativePath = "/";
        } else if (relativePath.startsWith("/public/")) {
          relativePath = relativePath.slice("/public".length);
        }

        // Serve direct files from publicDir. Guard with startsWith(publicDirPrefix)
        // so join/resolve results outside the public dir (traversal attempts) never reach
        // the filesystem; "/" itself resolves to publicDir and falls through to the
        // SPA shell below.
        const publicDirPrefix = publicDir.endsWith(sep) ? publicDir : `${publicDir}${sep}`;
        const cleanRelative = relativePath.replace(/^[/\\]+/, "");
        const resolvedPath = resolve(publicDir, cleanRelative);
        if (resolvedPath.startsWith(publicDirPrefix)) {
          const file = bunFile(resolvedPath);
          if (await file.exists()) {
            // Same cache contract as the legacy publicRequestHandler; assets are
            // content-hashed so a long max-age is safe across app updates.
            return new Response(file, {
              headers: { "Cache-Control": "max-age=3600" },
            });
          }
        }

        // SPA fallback: the app is a client-rendered SPA — serve the generated
        // HTML shell for any non-file route (including "/").
        return new Response(renderDesktopShellHtml(), {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      },
    });

    console.log(`[desktop-runtime] listening on ${HTTP_HOST}:${HTTP_PORT}`);

    // 暴露 server 实例给 requestRemoteAddress（globalThis.__httpServer）：
    // loopback 信任判定依赖 server.requestIP 的真实对端地址，拿不到实例时
    // 一律 fail-closed，导致所有 trusted-desktop API 403。与私有仓库
    // server/entry.ts 的全局注入约定保持一致。
    (globalThis as { __httpServer?: unknown }).__httpServer = httpServer;

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
  (globalThis as { __httpServer?: unknown }).__httpServer = null;
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
