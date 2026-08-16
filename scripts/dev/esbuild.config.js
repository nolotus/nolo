// esbuild.config.js
// 目标：开发 / 生产 保持几乎一致的打包行为，只保留少数必要差异

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isProduction } from "../../packages/app/utils/env.ts";

const configDir = dirname(fileURLToPath(import.meta.url));
const runtimeCompatBrowserStub = join(
  configDir,
  "../../packages/agent-runtime/runtimeCompat.browser.stub.ts",
);
const fileCredentialBrokerBrowserStub = join(
  configDir,
  "../../packages/agent-runtime/fileCredentialBroker.browser.stub.ts",
);
const oauthTokenStoreBrowserStub = join(
  configDir,
  "../../packages/agent-runtime/oauthTokenStore.browser.stub.ts",
);
const clipHeadAndTailBrowserStub = join(
  configDir,
  "../../packages/core/clipHeadAndTail.browser.stub.ts",
);
const skillDiscoveryBrowserStub = join(
  configDir,
  "../../packages/agent-runtime/skillDiscovery.browser.stub.ts",
);

// Browser and dev web builds both use platform: "browser"; stub node-only modules here.
const agentRuntimeBrowserCompatPlugin = {
  name: "agent-runtime-browser-compat-stub",
  setup(build) {
    build.onResolve({ filter: /runtimeCompat$/ }, (args) => {
      if (!/[\\/]agent-runtime[\\/]/.test(args.importer)) return;
      return { path: runtimeCompatBrowserStub };
    });
    // fileCredentialBroker / oauthTokenStore use node:fs — never bundle real impl into web.
    build.onResolve({ filter: /fileCredentialBroker(\.ts)?$/ }, (args) => {
      if (args.kind === "entry-point") return;
      // Allow the stub file itself and tests under agent-runtime to resolve normally
      // only when importing the browser stub path.
      if (args.path.includes("fileCredentialBroker.browser.stub")) return;
      return { path: fileCredentialBrokerBrowserStub };
    });
    build.onResolve({ filter: /oauthTokenStore(\.ts)?$/ }, (args) => {
      if (args.kind === "entry-point") return;
      if (args.path.includes("oauthTokenStore.browser.stub")) return;
      return { path: oauthTokenStoreBrowserStub };
    });
    // clipHeadAndTail 用 node:fs/path/os 落盘临时日志，不能进 web 构建；
    // 重定向到浏览器 stub（裁剪语义一致，仅去掉临时落盘）。
    build.onResolve({ filter: /core\/clipHeadAndTail$/ }, (args) => {
      if (args.kind === "entry-point") return;
      if (args.path.includes("clipHeadAndTail.browser.stub")) return;
      return { path: clipHeadAndTailBrowserStub };
    });
    // skillDiscovery 用 node:fs/path 扫描 SKILL.md，不能进 web 构建；
    // 重定向到浏览器 stub（所有导出为安全 no-op）。
    build.onResolve({ filter: /skillDiscovery(\.ts)?$/ }, (args) => {
      if (args.kind === "entry-point") return;
      if (args.path.includes("skillDiscovery.browser.stub")) return;
      return { path: skillDiscoveryBrowserStub };
    });
  },
};
const INPUT_ENTRY = "./packages/web/entry.tsx";
const ARTIFACT_RUNTIME_ENTRY = "./packages/web/artifactRuntime.tsx";
const ENABLE_WEB_SOURCEMAP = process.env.NOLO_WEB_SOURCEMAP === "1";
const ENABLE_WEB_MINIFY =
  process.env.NOLO_WEB_SKIP_MINIFY === "1" ? false : isProduction;
const ENABLE_WEB_METAFILE =
  process.env.NOLO_WEB_SKIP_METAFILE === "1"
    ? false
    : isProduction || process.env.NOLO_WEB_METAFILE === "1";

/**
 * 统一的构建标识：
 * - 生产：每次构建仍生成 buildId，用于 manifest 历史和资源清理
 * - 开发：固定为 "dev"，保证 SSR 可稳定指向 /public/assets/entry.js
 */
const buildId = isProduction ? Date.now().toString() : "dev";
export const timestamp = buildId;
/**
 * 输出目录名：
 * - 生产和开发都使用稳定目录 public/assets
 * - 文件名自身带内容 hash；发布后未变更文件继续命中浏览器缓存
 */
const assetDirName = "assets";

export const outdir = `public/${assetDirName}`;
export const publicPath = `/public/${assetDirName}/`;

/**
 * 公共（环境无关）的基础配置
 */
const baseConfig = {
  entryPoints: [INPUT_ENTRY, ARTIFACT_RUNTIME_ENTRY],
  outdir,
  publicPath,

  // 始终启用打包 / 代码分割 / tree-shaking
  bundle: true,
  splitting: true,
  format: "esm",
  platform: "browser",
  target: ["es2020"],
  treeShaking: true,
  metafile: ENABLE_WEB_METAFILE,
  legalComments: "none",

  define: {
    "process.env.PLATFORM": JSON.stringify("web"),
    "process.env.NODE_ENV": JSON.stringify(
      isProduction ? "production" : "development"
    ),
    "process.env.GOOGLE_MAPS_API_KEY": JSON.stringify(
      process.env.GOOGLE_MAPS_API_KEY || ""
    ),
    "process.env.MAPS_API_KEY": JSON.stringify(process.env.MAPS_API_KEY || ""),
  },

  loader: {
    ".js": "jsx",
    ".webp": "file",
    ".jpg": "file",
    ".png": "file",
    ".svg": "text", // SVG 当作字符串，交给 React 组件或 innerHTML 处理
  },

  resolveExtensions: [".tsx", ".ts", ".jsx", ".js"],
  conditions: ["browser", "nolo-cloud", "default"],

  // chunk 始终带 hash，方便强缓存
  chunkNames: "chunks/[name]-[hash]",

  // Web 构建中排除 RN 生态的一些依赖
  external: ["react-native*"],

  plugins: [agentRuntimeBrowserCompatPlugin],
};

/**
 * 环境相关的差异：集中放在这里，便于维护
 */
const envSpecificConfig = isProduction
  ? {
      // 生产：压缩、无 sourcemap（或按需调整），记录 metafile
      minify: ENABLE_WEB_MINIFY,
      sourcemap: false,
      entryNames: "[name]-[hash]",
      assetNames: "assets/[name]-[hash]",
    }
  : {
      minify: false,
      sourcemap: ENABLE_WEB_SOURCEMAP,
      sourcesContent: ENABLE_WEB_SOURCEMAP,
      entryNames: "[name]",
      // ✅ 关键：dev 也让静态资源带 hash，这样可放心强缓存
      assetNames: "assets/[name]-[hash]",
    };

/**
 * 最终导出的 ESBuild 配置
 */
export const config = {
  ...baseConfig,
  ...envSpecificConfig,
};
