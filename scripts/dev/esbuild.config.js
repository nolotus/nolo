// esbuild.config.js
// 目标：开发 / 生产 保持几乎一致的打包行为，只保留少数必要差异

import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
import stylexUnplugin from "@stylexjs/unplugin";
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
// StyleX 支持开关：默认开启，NOLO_WEB_STYLEX=0 可整体关闭（插件不注册、metafile 回到原策略）。
export const ENABLE_STYLEX = process.env.NOLO_WEB_STYLEX !== "0";
const ENABLE_WEB_METAFILE_BASE =
  process.env.NOLO_WEB_SKIP_METAFILE === "1"
    ? false
    : isProduction || process.env.NOLO_WEB_METAFILE === "1";
// StyleX 插件依赖 metafile 定位 esbuild 产出的 CSS asset（见 @stylexjs/unplugin README），
// 因此启用 StyleX 时 dev/prod 都强制 metafile: true
//（dev 以少量额外内存换取 StyleX CSS 能注入到正确的 CSS 产物）。
const ENABLE_WEB_METAFILE = ENABLE_STYLEX || ENABLE_WEB_METAFILE_BASE;

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

// StyleX esbuild 插件（ENABLE_STYLEX 关闭时为 null，plugins 数组里会被过滤掉）。
// useCSSLayers: StyleX 规则输出到 CSS @layer，便于与普通 CSS 的层叠顺序共存；
// unstable_moduleResolution: StyleX 运行时按 CommonJS 语义解析，与 esbuild bundle 行为对齐。
const stylexEsbuildPlugin = ENABLE_STYLEX
  ? stylexUnplugin.esbuild({
      useCSSLayers: true,
      importSources: ["@stylexjs/stylex"],
      unstable_moduleResolution: { type: "commonJS" },
    })
  : null;

/**
 * StyleX CSS 重定向插件（必须注册在 stylexEsbuildPlugin 之后）。
 *
 * 背景：@stylexjs/unplugin 的 esbuild 适配在 onEnd 里把聚合出的 StyleX CSS
 * 追加到「metafile 里第一个 .css 输出」（或 index.css / style.css）。
 * 本仓库是 splitting 构建，metafile 里有上百个路由 chunk CSS，"第一个"
 * 恰好是某个懒加载路由 chunk —— 规则只在该路由被访问时才加载，
 * 而始终加载的 entry CSS 反而没有 StyleX 规则（2026-08-28 实测踩坑）。
 * 且其 cssInjectionTarget 选项在 esbuild 适配器里并未被使用（见 lib/esbuild.js）。
 *
 * 本插件在 stylex 插件的 onEnd 之后跑：
 * 1) 把同一份 CSS（__stylexCollectCss 幂等，多次调用结果一致）追加到 entry CSS
 *    （dev: public/assets/entry.css；prod: public/assets/entry-<hash>.css）；
 * 2) 从 stylex 插件误追加的 chunk 文件里把这段 CSS 摘掉，避免规则在两个文件重复。
 */
// 收集实例：@stylexjs/unplugin 的 esbuild 适配返回的插件对象只有 {name, setup}，
// __stylexCollectCss 在闭包里拿不到；而 lib/core.js 导出的 unpluginFactory 可以
// 再实例化一个同配置的「收集实例」——transform 的规则池存在 globalThis 共享 store，
// 两个实例的 __stylexCollectCss() 输出完全一致（幂等）。
// 注意：exports map 未导出 ./lib/*，需经包主入口定位 lib/ 目录再 require core.js。
let stylexCollectInstance = null;
if (ENABLE_STYLEX) {
  try {
    const corePath = join(
      dirname(require.resolve("@stylexjs/unplugin")),
      "core.js",
    );
    const { unpluginFactory } = require(corePath);
    stylexCollectInstance = unpluginFactory(
      {
        useCSSLayers: true,
        importSources: ["@stylexjs/stylex"],
        unstable_moduleResolution: { type: "commonJS" },
      },
      { framework: "esbuild" },
    );
  } catch (error) {
    console.warn("[stylex] 创建收集实例失败，CSS 重定向将不可用:", error);
  }
}

const stylexEsbuildCssRedirectPlugin = {
  name: "stylex-css-redirect-to-entry",
  setup(build) {
    build.onEnd((result) => {
      try {
        const css = stylexCollectInstance?.__stylexCollectCss?.();
        if (!css) return;
        const meta = result?.metafile;
        if (!meta?.outputs) return;
        const cssOutputs = Object.keys(meta.outputs).filter((f) =>
          f.endsWith(".css"),
        );
        if (cssOutputs.length === 0) return;
        // 与 @stylexjs/unplugin lib/esbuild.js 的 onEnd 选择逻辑保持一致
        const misTarget =
          cssOutputs.find((f) => /(^|\/)index\.css$/.test(f)) ||
          cssOutputs.find((f) => /(^|\/)style\.css$/.test(f)) ||
          cssOutputs[0];
        // entry CSS：dev 固定名 entry.css；prod 带 hash entry-<hash>.css
        const entryCss = cssOutputs.find((f) =>
          /(^|\/)entry(-[A-Za-z0-9_-]+)?\.css$/.test(f),
        );
        if (!entryCss) return;
        const toAbs = (p) => (isAbsolute(p) ? p : join(process.cwd(), p));
        // 1) 追加到 entry CSS（已包含则跳过，避免重复构建时重复追加）
        const entryPath = toAbs(entryCss);
        const entryContent = readFileSync(entryPath, "utf8");
        if (!entryContent.includes(css)) {
          writeFileSync(
            entryPath,
            entryContent ? `${entryContent}\n${css}` : css,
            "utf8",
          );
        }
        // 2) 从误追加的 chunk 文件里摘掉（目标就是 entry CSS 本身时跳过）
        if (misTarget !== entryCss) {
          const misPath = toAbs(misTarget);
          const misContent = readFileSync(misPath, "utf8");
          if (misContent.includes(css)) {
            const stripped = misContent
              .replace(css, "")
              .replace(/\n+$/, "\n");
            writeFileSync(misPath, stripped, "utf8");
          }
        }
      } catch (error) {
        console.warn("[stylex-css-redirect] onEnd 重定向失败:", error);
      }
    });
  },
};

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
  external: ["react-native*", "life/web/InviteRewards", "life/LifeSidebar", "app/pages/Pricing/Price", "app/pages/Recharge", "create/space/pages/SpaceInvite", "app/email/AgentEmailE2EPage"],

  plugins: [
    agentRuntimeBrowserCompatPlugin,
    // StyleX（@stylexjs/unplugin 的 esbuild 适配器）：
    // - 构建期用 Babel 编译 stylex.create / stylex.props（仅对 import 了 stylex 源的文件生效）；
    // - 构建结束后把聚合出的 StyleX CSS 追加到 metafile 定位的 CSS 产物（即 entry CSS）。
    // 详见 node_modules/@stylexjs/unplugin/README.md 的 esbuild 一节。
    ...(stylexEsbuildPlugin
      ? [stylexEsbuildPlugin, stylexEsbuildCssRedirectPlugin]
      : []),
  ],
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
