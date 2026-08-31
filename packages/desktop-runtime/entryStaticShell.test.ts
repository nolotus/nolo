// entryStaticShell.test.ts
// 桌面 embedded server 静态服务 + SPA HTML 壳回归测试。
//
// 背景：desktop-runtime 从 server 抽包后，entry.ts 的 fetch fallback 曾假设
// public/index.html 存在且不剥离 /public 前缀，导致打包桌面端白屏
// （/ 与 /public/assets/* 全部 404）。本测试钉死修复后的契约：
// 1. /public/<path> 剥前缀后映射到 NOLO_PUBLIC_DIR/<path>
// 2. / 与任意 SPA 路由返回动态生成的 HTML 壳（引用 latest-assets.json 的入口 JS/CSS）
// 3. 壳注入 window.__NOLO_DESKTOP__ 与 window.__NOLO_ASSETS__（对齐私有仓库 render.tsx）
// 4. 未知 /api/* 仍 404，不落 SPA 文档；路径穿越被拒绝
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";

const PORT = 33199;
const BASE = `http://127.0.0.1:${PORT}`;

let tempPublicDir: string;
let shutdown: (() => Promise<void>) | undefined;

beforeAll(async () => {
  tempPublicDir = mkdtempSync(join(tmpdir(), "nolo-desktop-entry-test-"));
  writeFileSync(
    join(tempPublicDir, "latest-assets.json"),
    JSON.stringify({
      basePath: "/public/assets/",
      js: "/public/assets/entry-TESTHASH.js",
      css: "/public/assets/entry-TESTHASH.css",
      artifactRuntimeJs: "/public/assets/artifactRuntime-TESTHASH.js",
      buildTime: "2026-08-31T00:00:00.000Z",
    })
  );
  mkdirSync(join(tempPublicDir, "assets"), { recursive: true });
  writeFileSync(join(tempPublicDir, "assets", "entry-TESTHASH.js"), "// entry stub");
  writeFileSync(join(tempPublicDir, "assets", "entry-TESTHASH.css"), "body{}");
  writeFileSync(join(tempPublicDir, "favicon.svg"), "<svg/>");

  // entry.ts 在模块顶层读取这些 env —— 必须在 import 之前设置。
  process.env.NOLO_PUBLIC_DIR = tempPublicDir;
  process.env.HTTP_PORT = String(PORT);
  process.env.PLATFORM_SERVER_HOST = "127.0.0.1";
  process.env.NOLO_SERVER_AUTOSTART = "0";

  const entry = await import("./entry");
  await entry.bootstrapServer();
  shutdown = entry.shutdownServer;
});

afterAll(async () => {
  await shutdown?.();
  rmSync(tempPublicDir, { recursive: true, force: true });
});

describe("desktop-runtime entry static shell", () => {
  it("serves /public/* assets with the prefix stripped (no double /public)", async () => {
    const res = await fetch(`${BASE}/public/assets/entry-TESTHASH.js`);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("max-age=3600");
    expect(await res.text()).toBe("// entry stub");
  });

  it("serves the bare /public path and normalizes double slashes", async () => {
    // "/public" (no trailing slash) resolves to publicDir itself → SPA shell.
    expect((await fetch(`${BASE}/public`)).headers.get("content-type")).toContain("text/html");
    const doubleSlash = await fetch(`${BASE}//public//assets/entry-TESTHASH.js`);
    expect(doubleSlash.status).toBe(200);
  });

  it("serves / and arbitrary SPA routes with a generated HTML shell", async () => {
    for (const path of ["/", "/dialog/abc", "/spaces"]) {
      const res = await fetch(`${BASE}${path}`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/html");
      const html = await res.text();
      expect(html).toContain('<div id="root"></div>');
      expect(html).toContain('src="/public/assets/entry-TESTHASH.js"');
      expect(html).toContain('href="/public/assets/entry-TESTHASH.css"');
    }
  });

  it("injects desktop mode and artifact runtime globals into the shell", async () => {
    const html = await (await fetch(`${BASE}/`)).text();
    expect(html).toContain("window.__NOLO_DESKTOP__=true");
    expect(html).toContain("artifactRuntime-TESTHASH.js");
    // edition 留空：客户端 bundle 自行判定，避免 conditions 不一致触发白屏守卫
    expect(html).not.toContain("__NOLO_EDITION__");
  });

  it("keeps unknown /api/* routes 404 (never SPA fallthrough)", async () => {
    const res = await fetch(`${BASE}/api/definitely-not-a-route`);
    expect(res.status).toBe(404);
  });

  it("never serves files outside publicDir on traversal attempts", async () => {
    // %2f 不被 URL 层解码 → join 后是字面文件名（不存在）→ SPA 壳，而非 passwd 内容。
    // 显式 ../ 会被 fetch/URL 规范化消解；startsWith(publicDir + "/") 防护兜底。
    const res = await fetch(`${BASE}/public/..%2f..%2f..%2fetc%2fpasswd`);
    const body = await res.text();
    expect(body).not.toContain("root:");
    expect(res.headers.get("content-type")).toContain("text/html");
  });
});
