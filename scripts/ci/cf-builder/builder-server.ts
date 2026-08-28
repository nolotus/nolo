// CF 容器内构建应用（builder-server.ts）
//
// 职责：在容器内完成 nolo 前端生产构建，并打包成与 CI package_web_artifact 一致的 tar.gz
// 产物，供 /artifact 流式下载（为 Step 3b 回传铺路）。
//
// 构建命令与 runAlphaServerCi.sh 的 build_web() 严格同参：
//   build_web: NODE_ENV=production NOLO_WEB_PRECOMPRESS=1 NOLO_BUILD_SHA="$BUILD_SHA" "$BUN_BIN" run build
// 容器内以 clone 出来的 HEAD 作为 NOLO_BUILD_SHA（等价于 CI 在干净 checkout 上计算出的 SHA）。
//
// 产物路径与 CI 对齐（package_web_artifact 打包的真实清单，位于仓库根 public/ 下，
// 而非此前原型里那 4 个猜测的 dist 目录）：
//   public/latest-assets.json
//   public/meta.json
//   public/assets        （由 latest-assets.json 的 basePath 决定，真实为 "/public/assets/" 归一化后的 "public/assets"）
//   public/locales
//   public/route-styles
//
// 安全：PEM deploy key 只走 /build 的 JSON body（initKey 字段），不进 header；worker 层负责
// 用 X-Builder-Token 鉴权（见 worker.ts）。

import { existsSync, writeFileSync, mkdirSync, readdirSync, statSync, readFileSync } from "node:fs";
import { sanitizeBasePath, isPathContained } from "./paths.ts";

const KEY_PATH = "/tmp/deploy_key";
const REPO = "/work/repo";
const ARTIFACT_TAR = "/work/nolo-web-build.tar.gz";

const sh = (cmd: string, cwd = "/work", extraEnv: Record<string, string> = {}) => {
  const r = Bun.spawnSync(["/bin/bash", "-c", cmd], {
    cwd,
    env: { ...process.env, ...extraEnv },
    stdout: "pipe",
    stderr: "pipe",
  });
  return { code: r.exitCode, out: new TextDecoder().decode(r.stdout), err: new TextDecoder().decode(r.stderr) };
};

const dirSize = (p: string): number => {
  let n = 0;
  try {
    for (const f of readdirSync(p, { recursive: true }) as string[]) {
      try { n += statSync(p + "/" + f).size; } catch {}
    }
  } catch {}
  return n;
};

// 从构建产物读取 basePath（同步，node:fs），经 sanitizeBasePath 归一化与 realpath containment 校验后返回
// 安全相对子路径；校验失败返回 null。
const readAssetBasePath = (root = REPO): string | null => {
  const manifest = root + "/public/latest-assets.json";
  if (!existsSync(manifest)) return null;
  try {
    // HIGH-1：改为 node:fs 同步 API，杜绝 Bun.file().arrayBuffer() 这类未 await 的
    // Promise 在同步函数内被当作已完成值使用（此前 decode 一个 Promise 必然抛错）。
    const assetDir = sanitizeBasePath(
      (JSON.parse(readFileSync(manifest, "utf8")) as { basePath?: unknown }).basePath ?? "",
    );
    if (assetDir === null) return null;
    const fullPath = root + "/" + assetDir;
    // 归一化白名单通过后仍要做「位于 root 下且 realpath 无逃逸」的存在性确认，双保险。
    if (!existsSync(fullPath)) return null;
    if (!isPathContained(root, fullPath)) return null;
    return assetDir;
  } catch {
    return null;
  }
};

// 与 CI package_web_artifact 对齐的产物相对路径清单（相对于仓库根）。
const artifactRelPaths = (root = REPO): string[] | null => {
  const manifest = root + "/public/latest-assets.json";
  if (!existsSync(manifest)) return null;
  const assetDir = readAssetBasePath(root);
  if (assetDir === null) return null;
  const entries = [
    "public/latest-assets.json",
    "public/meta.json",
    assetDir,
    "public/locales",
    "public/route-styles",
  ];
  // 全部存在且 realpath 不逃逸才算可打包；缺任何一个都视为产物不完整。
  if (entries.some((e) => !existsSync(root + "/" + e) || !isPathContained(root, root + "/" + e))) return null;
  return entries;
};

Bun.serve({
  port: 8080,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === "POST" && url.pathname === "/build") {
      const body = (await req.json().catch(() => ({}))) as any;
      const initKey = body.initKey || "";
      if (initKey.includes("PRIVATE KEY")) writeFileSync(KEY_PATH, initKey + "\n", { mode: 0o600 });
      if (!existsSync(KEY_PATH)) return Response.json({ error: "not initialized" }, { status: 500 });

      const branch = (body.branch || "alpha").toString().replace(/[^a-zA-Z0-9._-]/g, "");
      mkdirSync("/work", { recursive: true });
      const t0 = Date.now();
      const steps: any[] = [];
      const logf = "/work/build.log";
      const log = (m: string) => sh(`echo "$(date +%H:%M:%S) ${m}" >> ${logf}`);
      const step = (name: string, cmd: string, cwd = "/work") => {
        log(`START ${name}`);
        const r = sh(cmd, cwd, { GIT_SSH_COMMAND: `ssh -i ${KEY_PATH} -o StrictHostKeyChecking=accept-new` });
        steps.push({ name, code: r.code, tail: r.out.slice(-250) + " | " + r.err.slice(-250) });
        log(`END ${name} code=${r.code}`);
        return r.code === 0;
      };

      if (!step("clone", `rm -rf repo && git clone --depth 1 --branch ${branch} git@github.com:nolotus/bun-nolo.git repo && cd repo && git rev-parse HEAD`))
        return Response.json({ error: "clone failed", steps }, { status: 500 });
      if (!step("install", "bun install", REPO))
        return Response.json({ error: "install failed", steps }, { status: 500 });

      const head = sh(`cd ${REPO} && git rev-parse HEAD`).out.trim();
      // build 与 CI build_web 同参：NODE_ENV=production NOLO_WEB_PRECOMPRESS=1 NOLO_BUILD_SHA=${head}
      if (!step("build", `NODE_ENV=production NOLO_WEB_PRECOMPRESS=1 NOLO_BUILD_SHA=${head} bun run build`, REPO))
        return Response.json({ error: "build failed", steps, head }, { status: 500 });

      // 真实产物路径：与 package_web_artifact 打包清单一致（仓库根 public/ 下）。
      const artifacts = artifactRelPaths();
      if (!artifacts)
        return Response.json({ error: "artifact incomplete", steps, head }, { status: 500 });

      // 打成与 CI 一致的 tar.gz：tar -C <repo-root> 相对路径，与 main_package_web_artifact 同构。
      // HIGH-2：解析出的 basePath 已由 readAssetBasePath 白名单校验，仅出现在「存在性判断」
      // 与下方 tar 的 -C 参数里；-C 固定用常量 REPO（非外部输入），相对路径全部来自
      // artifactRelPaths 的白名单产物清单，绝无裸拼外部值进 bash -c 字符串。
      log("START pack");
      const pack = sh(`tar -czf ${ARTIFACT_TAR} -C ${REPO} ${artifacts.join(" ")}`);
      steps.push({
        name: "pack artifact",
        code: pack.code,
        tail: (pack.out || pack.err).slice(-250),
      });
      log(`END pack code=${pack.code}`);
      if (pack.code !== 0)
        return Response.json({ error: "artifact pack failed", steps, head, tail: pack.err.slice(-250) }, { status: 500 });

      const artifactSizeMB = existsSync(ARTIFACT_TAR) ? Math.round(statSync(ARTIFACT_TAR).size / 1e6) : null;
      return Response.json({
        ok: true,
        head,
        durationSec: Math.round((Date.now() - t0) / 1000),
        steps,
        artifactPaths: artifacts,
        artifactTar: ARTIFACT_TAR,
        artifactSizeMB,
        artifactSizeBytes: existsSync(ARTIFACT_TAR) ? statSync(ARTIFACT_TAR).size : null,
      });
    }

    // 流式下载 tar.gz 产物（Step 3b 回传的载体）。未构建或打包失败时 404。
    if (req.method === "GET" && url.pathname === "/artifact") {
      if (!existsSync(ARTIFACT_TAR))
        return Response.json({ error: "no artifact" }, { status: 404 });
      const file = Bun.file(ARTIFACT_TAR);
      return new Response(file.stream(), {
        headers: {
          "Content-Type": "application/gzip",
          "Content-Length": String(file.size),
          "Content-Disposition": 'attachment; filename="nolo-web-build.tar.gz"',
        },
      });
    }

    if (url.pathname === "/status") {
      const artifacts = artifactRelPaths();
      const st = {
        keyReady: existsSync(KEY_PATH),
        repo: existsSync(REPO + "/package.json"),
        head: existsSync(REPO) ? sh(`cd ${REPO} && git rev-parse HEAD 2>/dev/null`).out.trim() : "",
        nodeModulesMB: existsSync(REPO + "/node_modules") ? Math.round(dirSize(REPO + "/node_modules") / 1e6) : 0,
        artifactsReady: artifacts !== null,
        artifactPaths: artifacts,
        artifactTarReady: existsSync(ARTIFACT_TAR),
        artifactSizeMB: existsSync(ARTIFACT_TAR) ? Math.round(statSync(ARTIFACT_TAR).size / 1e6) : 0,
        buildLog: existsSync("/work/build.log") ? sh("tail -8 /work/build.log").out : "",
      };
      return Response.json(st);
    }

    return Response.json({ bun: Bun.version, ready: existsSync(KEY_PATH) });
  },
});
