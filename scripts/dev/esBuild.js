// scripts/dev/esBuild.js
// 作用：使用 esbuild 打包前端资源，并生成：
// - public/meta.json：生产构建时输出完整 metafile（开发环境默认关闭以降低内存）
// - public/latest-assets.json：给服务端 SSR 使用的入口 JS/CSS 信息

import { write } from "bun";
import { brotliCompress, gzip } from "node:zlib";
import { copyFile, mkdir, readdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { promisify } from "node:util";
import { config, timestamp, publicPath } from "./esbuild.config";
import { shouldPrecompressWebAssets } from "./webBuildPolicy";
import { publishDevWebBuildSignal } from "./devAssetManifest.js";
import { copyRouteStyles } from "./routeStyles.js";
import { resources as i18nResources } from "../../packages/app/i18n/i18n.config";

const require = createRequire(import.meta.url);
const esbuild = require("esbuild");

const gzipAsync = promisify(gzip);
const brotliCompressAsync = promisify(brotliCompress);
const ASSET_BUILD_MANIFEST_DIR = "public/.asset-builds";
const ASSET_OUTPUT_DIR = "public/assets";
const CLIENT_LOCALE_OUTPUT_DIR = "public/locales";
const PDF_WORKER_SOURCE = (() => {
  try {
    return require.resolve("pdfjs-dist/build/pdf.worker.mjs");
  } catch {
    return "node_modules/pdfjs-dist/build/pdf.worker.mjs";
  }
})();
const PDF_WORKER_OUTPUT = "public/assets/pdf.worker.mjs";
const COMPRESS_MIN_BYTES = 1024;
const COMPRESSIBLE_OUTPUT_RE = /\.(?:js|css|json|svg)$/i;
// StyleX 启用后 dev/prod 都会生成 metafile（供插件定位 CSS asset），
// 但 meta.json 落盘不应随之下放：dev 无消费方且文件多 MB，还会覆盖生产 meta.json，
// 因此 dev 恒跳过写盘（保持 StyleX 引入前的行为）。
const skipMetaJson = process.env.NOLO_WEB_SKIP_META === "1" || timestamp === "dev";

// -----------------------------
// 通用工具
// -----------------------------

/**
 * 计时执行一个异步任务，并输出耗时日志
 */
const measureTime = async (label, action) => {
  const start = performance.now();
  const result = await action();
  const end = performance.now();
  console.log(`${label} 耗时 ${(end - start).toFixed(2)} 毫秒`);
  return result;
};

/**
 * 从 esbuild metafile 中提取入口 JS/CSS 文件
 * 要求输出文件名中包含 entry，例如：
 * - public/assets/entry-xxx.js
 * - public/assets/entry-xxx.css
 */
const toPublicUrl = (path) => {
  if (path.startsWith("/")) return path;
  if (path.startsWith("public/")) return `/${path}`;
  return `/public/${path.replace(/^\/+/, "")}`;
};

const getEntryFiles = (metafile) => {
  const entryFiles = {
    js: "",
    css: "",
    artifactRuntimeJs: "",
    artifactRuntimePreloads: [],
  };

  if (!metafile || !metafile.outputs) {
    console.warn("metafile.outputs 为空，未能找到 entry 文件");
    return entryFiles;
  }

  Object.entries(metafile.outputs).forEach(([path, output]) => {
    if (path.endsWith(".js") && path.includes("artifactRuntime")) {
      entryFiles.artifactRuntimeJs = "/" + path;
      const staticImports = (output.imports || []).flatMap((item) => {
        if (item.kind !== "import-statement" || typeof item.path !== "string") return [];
        return [toPublicUrl(item.path)];
      });
      entryFiles.artifactRuntimePreloads = Array.from(
        new Set([entryFiles.artifactRuntimeJs, ...staticImports])
      );
      return;
    }

    // 只关心包含 entry 的输出文件
    if (!path.includes("entry") && !path.match(/entry[-_\w]*\.(js|css)$/)) {
      return;
    }

    if (path.endsWith(".js")) {
      // 示例：public/assets/entry-xxx.js → /public/assets/entry-xxx.js
      entryFiles.js = "/" + path;
    } else if (path.endsWith(".css")) {
      entryFiles.css = "/" + path;
    }
  });

  if (!entryFiles.js || !entryFiles.css) {
    console.warn(
      "未能在 metafile 中找到完整的 entry js/css，请检查 esbuild.output 配置"
    );
  }

  return entryFiles;
};

const getDevEntryFiles = () => ({
  js: "/public/assets/entry.js",
  css: "/public/assets/entry.css",
  artifactRuntimeJs: "/public/assets/artifactRuntime.js",
  artifactRuntimePreloads: [],
});

const resolveEntryFilesFromOutputDir = async () => {
  const entryFiles = {
    js: "",
    css: "",
    artifactRuntimeJs: "",
    artifactRuntimePreloads: [],
  };

  const entries = await readdir(ASSET_OUTPUT_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (entry.name.startsWith("entry-") && entry.name.endsWith(".js")) {
      entryFiles.js = `/${ASSET_OUTPUT_DIR}/${entry.name}`;
      continue;
    }
    if (entry.name.startsWith("entry-") && entry.name.endsWith(".css")) {
      entryFiles.css = `/${ASSET_OUTPUT_DIR}/${entry.name}`;
      continue;
    }
    if (entry.name.startsWith("artifactRuntime-") && entry.name.endsWith(".js")) {
      entryFiles.artifactRuntimeJs = `/${ASSET_OUTPUT_DIR}/${entry.name}`;
      entryFiles.artifactRuntimePreloads = [entryFiles.artifactRuntimeJs];
    }
  }

  if (!entryFiles.js || !entryFiles.css) {
    console.warn("未能从输出目录中找到完整的 entry js/css，请检查 esbuild 输出结果");
  }

  return entryFiles;
};

const readPreviousAssetManifests = async () => {
  try {
    const entries = await readdir(ASSET_BUILD_MANIFEST_DIR, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && /^\d+\.json$/.test(entry.name))
      .map((entry) => entry.name)
      .sort((a, b) => Number.parseInt(b, 10) - Number.parseInt(a, 10));
  } catch {
    return [];
  }
};

const writeAssetBuildManifest = async (outputs) => {
  if (timestamp === "dev") return;

  await mkdir(ASSET_BUILD_MANIFEST_DIR, { recursive: true });
  const assetFiles = Object.keys(outputs)
    .filter((path) => path.startsWith(`${ASSET_OUTPUT_DIR}/`))
    .filter((path) => !path.endsWith(".map"))
    .sort();

  await writeFile(
    `${ASSET_BUILD_MANIFEST_DIR}/${timestamp}.json`,
    JSON.stringify({ timestamp, files: assetFiles }, null, 2)
  );
};

const readManifestFiles = async (manifestName) => {
  try {
    const manifest = JSON.parse(
      await readFile(`${ASSET_BUILD_MANIFEST_DIR}/${manifestName}`, "utf8")
    );
    return Array.isArray(manifest.files) ? manifest.files.filter((file) => typeof file === "string") : [];
  } catch {
    return [];
  }
};

const listGeneratedAssetFiles = async (dir = ASSET_OUTPUT_DIR) => {
  const result = [];
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return result;
  }

  for (const entry of entries) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      result.push(...(await listGeneratedAssetFiles(path)));
      continue;
    }
    if (entry.isFile()) {
      result.push(path.replace(/\\/g, "/"));
    }
  }

  return result;
};

const removeEmptyAssetDirs = async (dir = ASSET_OUTPUT_DIR) => {
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const child = `${dir}/${entry.name}`;
        await removeEmptyAssetDirs(child);
        try {
          await rm(child, { recursive: false });
        } catch {
          // Directory still has live files.
        }
      })
  );
};

const keepRecentAssetBuilds = async (outputs) => {
  const keepCount = Math.max(
    1,
    Number.parseInt(process.env.NOLO_WEB_KEEP_ASSET_BUILDS ?? "2", 10) || 2
  );
  await writeAssetBuildManifest(outputs);

  const manifests = await readPreviousAssetManifests();
  const keepManifests = manifests.slice(0, keepCount);
  const staleManifests = manifests.slice(keepCount);
  const keepFiles = new Set();

  for (const manifestName of keepManifests) {
    for (const file of await readManifestFiles(manifestName)) {
      keepFiles.add(file);
      keepFiles.add(`${file}.br`);
      keepFiles.add(`${file}.gz`);
    }
  }

  const generatedFiles = await listGeneratedAssetFiles();
  const staleFiles = generatedFiles.filter((file) => !keepFiles.has(file));

  await Promise.all(staleFiles.map((file) => unlink(file).catch(() => undefined)));
  await Promise.all(
    staleManifests.map((manifestName) =>
      unlink(`${ASSET_BUILD_MANIFEST_DIR}/${manifestName}`).catch(() => undefined)
    )
  );
  await removeEmptyAssetDirs();

  if (staleFiles.length > 0 || staleManifests.length > 0) {
    console.log(
      `已清理静态资源: files=${staleFiles.length}, manifests=${staleManifests.length}`
    );
  }
};

const precompressAssets = async (outputs) => {
  if (timestamp === "dev") return;

  const files = Object.entries(outputs)
    .filter(([path, output]) => path.startsWith(`${ASSET_OUTPUT_DIR}/`))
    .filter(([path, output]) => !path.endsWith(".map") && COMPRESSIBLE_OUTPUT_RE.test(path))
    .filter(([path, output]) => Number(output.bytes) >= COMPRESS_MIN_BYTES)
    .map(([path]) => path);

  await Promise.all(
    files.map(async (path) => {
      const bytes = await readFile(path);
      const [brBytes, gzBytes] = await Promise.all([
        brotliCompressAsync(bytes),
        gzipAsync(bytes),
      ]);
      await mkdir(dirname(path), { recursive: true });
      await Promise.all([
        writeFile(`${path}.br`, brBytes),
        writeFile(`${path}.gz`, gzBytes),
      ]);
    })
  );

  if (files.length > 0) {
    const originalBytes = files.reduce((sum, path) => sum + (outputs[path]?.bytes ?? 0), 0);
    console.log(
      `已预压缩静态资源: files=${files.length}, original=${originalBytes} bytes`
    );
  }
};

const copyPdfWorker = async () => {
  await mkdir(ASSET_OUTPUT_DIR, { recursive: true });
  await copyFile(PDF_WORKER_SOURCE, PDF_WORKER_OUTPUT);
};

const writeClientLocaleFiles = async () => {
  await mkdir(CLIENT_LOCALE_OUTPUT_DIR, { recursive: true });
  await Promise.all(
    Object.entries(i18nResources).map(([language, namespaces]) =>
      writeFile(
        `${CLIENT_LOCALE_OUTPUT_DIR}/${encodeURIComponent(language)}.json`,
        JSON.stringify(namespaces)
      )
    )
  );
};

// -----------------------------
// 主构建流程
// -----------------------------

export const runMetaBuild = async () => {
  const totalStart = performance.now();

  // 1. esbuild + independent prep (route-styles / locales) share the wall clock.
  // PDF worker is copied *after* asset cleanup so keepRecentAssetBuilds does not
  // delete public/assets/pdf.worker.mjs (it is not in the esbuild metafile).
  const [result] = await Promise.all([
    measureTime("esbuild 构建", () => esbuild.build(config)),
    measureTime("复制路由级样式", copyRouteStyles),
    measureTime("写入客户端语言包", writeClientLocaleFiles),
  ]);

  if (result.metafile && !skipMetaJson) {
    // Compact JSON: production meta is multi-MB; pretty-print only costs size/I/O.
    await measureTime("写入 meta.json", () =>
      write("public/meta.json", JSON.stringify(result.metafile))
    );
  } else if (result.metafile && skipMetaJson) {
    console.log("跳过写入 meta.json；当前构建只需要 latest-assets.json");
  }

  // 2. 提取入口 JS / CSS。开发环境默认不用 metafile，直接走固定 entry 路径。
  const assets =
    result.metafile
      ? getEntryFiles(result.metafile)
      : timestamp === "dev"
        ? getDevEntryFiles()
        : await resolveEntryFilesFromOutputDir();

  const buildInfo = {
    // 资源基础路径（与服务端路由匹配）
    basePath: publicPath,

    // 入口文件的完整 URL 路径（供服务端注入 <script>/<link>）
    js: assets.js, // 例: "/public/assets/entry-abc123.js"
    css: assets.css, // 例: "/public/assets/entry-def456.css"
    artifactRuntimeJs: assets.artifactRuntimeJs,
    artifactRuntimePreloads: assets.artifactRuntimePreloads,

    // 版本 / 构建信息
    timestamp,
    buildTime: new Date().toISOString(),
    buildSha: process.env.NOLO_BUILD_SHA || process.env.GITHUB_SHA || null,
  };

  // 3. 写入 latest-assets.json（开发固定 entry 路径）
  if (timestamp === "dev") {
    await measureTime("发布 dev web 构建信号", () =>
      publishDevWebBuildSignal()
    );
  } else {
    await measureTime("写入 latest-assets.json", () =>
      write("public/latest-assets.json", JSON.stringify(buildInfo, null, 2))
    );
  }
  if (result.metafile && shouldPrecompressWebAssets({ timestamp })) {
    await measureTime("预压缩静态资源", () => precompressAssets(result.metafile.outputs));
  } else if (result.metafile && timestamp !== "dev") {
    console.log("跳过静态资源预压缩；设置 NOLO_WEB_PRECOMPRESS=1 可为 release 构建生成 .br/.gz");
  }
  // dev 产物用固定文件名（entry.js / entry.css，无 hash），没有"历史构建"可清理；
  // 启用 StyleX 后 dev 也会开 metafile，但清理逻辑只针对生产的 hash 产物。
  if (result.metafile && timestamp !== "dev") {
    await measureTime("清理历史 assets", () => keepRecentAssetBuilds(result.metafile.outputs));
  }
  if (timestamp !== "dev") {
    // 悬空引用检测（esbuild splitting+minify 缺陷防护，2026-08-21 生产事故）
    // 警告模式：检出候选仅告警不失败，人工确认（已知误报：第三方库方法名/字符串/正则）。
    await measureTime("检测悬空引用", async () => {
      const { execFileSync } = await import("node:child_process");
      try {
        execFileSync(process.execPath, ["scripts/dev/checkDangling.mjs", ASSET_OUTPUT_DIR, "--warn"], {
          stdio: "inherit",
        });
      } catch (error) {
        console.warn("[checkDangling] 运行失败（不影响构建）:", error instanceof Error ? error.message : error);
      }
    });
  }
  await measureTime("复制 PDF worker", copyPdfWorker);

  const totalEnd = performance.now();
  console.log(`总耗时 ${(totalEnd - totalStart).toFixed(2)} 毫秒`);
  console.log("构建信息:", buildInfo);
};

// 直接执行构建
runMetaBuild();
