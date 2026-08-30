import { build, type BuildOptions, type Plugin } from "esbuild";
import stylexUnplugin from "@stylexjs/unplugin";
import { dirname, join, resolve } from "node:path";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(scriptDir, "../..");

export const SSR_BUNDLE_DIR = join(REPO_ROOT, "packages/server/.render-dist");
export const SSR_BUNDLE_OUTFILE = join(SSR_BUNDLE_DIR, "render.mjs");
export const SSR_ENTRY_PATH = join(REPO_ROOT, "packages/server/render.tsx");

const WORKSPACE_PACKAGES = [
  "agent-runtime",
  "ai",
  "app",
  "auth",
  "billing",
  "chat",
  "cli",
  "client",
  "connector-experimental",
  "core",
  "create",
  "database",
  "database-engine",
  "desktop",
  "desktop-chrome-connector",
  "desktop-runtime",
  "form",
  "identity",
  "integrations",
  "lab",
  "life",
  "oauth",
  "render",
  "server",
  "share",
  "shared",
  "tui",
  "web",
];

function resolveWorkspaceSubpath(pkg: string, subpath: string, repoRoot: string): string | null {
  const basePath = join(repoRoot, "packages", pkg, subpath);

  // 1. 优先尝试扩展名匹配（例如 app/hooks -> packages/app/hooks.ts）
  for (const ext of [".tsx", ".ts", ".jsx", ".js", ".json"]) {
    const withExt = `${basePath}${ext}`;
    if (existsSync(withExt) && statSync(withExt).isFile()) return withExt;
  }

  // 2. 尝试精确文件
  if (existsSync(basePath) && statSync(basePath).isFile()) return basePath;

  // 3. 尝试目录（package.json main/module 或 index.*）
  if (existsSync(basePath) && statSync(basePath).isDirectory()) {
    const pkgJsonPath = join(basePath, "package.json");
    if (existsSync(pkgJsonPath)) {
      try {
        const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
        const main = pkgJson.module || pkgJson.main;
        if (main) {
          const direct = join(basePath, main);
          if (existsSync(direct) && statSync(direct).isFile()) return direct;
          for (const ext of [".tsx", ".ts", ".jsx", ".js"]) {
            const candidate = `${direct}${ext}`;
            if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
          }
        }
      } catch {}
    }
    for (const ext of ["index.tsx", "index.ts", "index.jsx", "index.js"]) {
      const idx = join(basePath, ext);
      if (existsSync(idx) && statSync(idx).isFile()) return idx;
    }
  }

  return null;
}

/**
 * 将工作区 monorepo 内部包名别名（如 app/*, ai/* 等）解析到真实 packages/* 文件路径，
 * 避免在 packages: "external" 模式下被当作外部 node 包排除。
 */
export function createWorkspaceAliasPlugin(repoRoot = REPO_ROOT): Plugin {
  return {
    name: "ssr-workspace-alias",
    setup(buildContext) {
      for (const pkg of WORKSPACE_PACKAGES) {
        const filter = new RegExp(`^${pkg}(/.*)?$`);
        buildContext.onResolve({ filter }, (args) => {
          const subpath = args.path.slice(pkg.length);
          const resolved = resolveWorkspaceSubpath(pkg, subpath, repoRoot);
          if (resolved) {
            return { path: resolved };
          }
          return null;
        });
      }
    },
  };
}

/**
 * SSR 兼容 stub 插件：将仅在浏览器端使用的依赖安全桩化，避免 Node/Bun SSR 环境下因缺少 DOM 全局变量报错。
 */
export function createSsrCompatPlugin(): Plugin {
  return {
    name: "ssr-server-compat-stub",
    setup(buildContext) {
      buildContext.onResolve({ filter: /^pdfjs-dist(\/.*)?$/ }, () => {
        return {
          path: "pdfjs-dist-stub",
          namespace: "ssr-compat-stub",
        };
      });
      buildContext.onLoad({ filter: /.*/, namespace: "ssr-compat-stub" }, () => {
        return {
          contents: `
            export const GlobalWorkerOptions = { workerSrc: "" };
            export const getDocument = () => ({ promise: Promise.resolve({ numPages: 0 }) });
            export default { GlobalWorkerOptions, getDocument };
          `,
          loader: "js",
        };
      });
    },
  };
}

/**
 * StyleX esbuild 插件配置，与客户端 esbuild.config.js 保持 100% 一致
 */
export function createStylexPlugin(): Plugin {
  return stylexUnplugin.esbuild({
    // useCSSLayers: false，因为 unlayered 普通 CSS 会无条件压过 layer 内 StyleX 规则
    useCSSLayers: false,
    importSources: ["@stylexjs/stylex"],
    unstable_moduleResolution: { type: "commonJS" },
  });
}

export function getRenderBundleBuildConfig(options?: {
  repoRoot?: string;
  outfile?: string;
}): BuildOptions {
  const repoRoot = options?.repoRoot || REPO_ROOT;
  const outfile = options?.outfile || SSR_BUNDLE_OUTFILE;

  return {
    entryPoints: [SSR_ENTRY_PATH],
    platform: "node",
    format: "esm",
    target: "es2022",
    bundle: true,
    outfile,
    packages: "external",
    metafile: true,
    jsx: "automatic",
    loader: {
      ".js": "jsx",
      ".webp": "file",
      ".jpg": "file",
      ".png": "file",
      ".svg": "text",
    },
    define: {
      "process.env.PLATFORM": JSON.stringify("web"),
    },
    plugins: [
      createSsrCompatPlugin(),
      createWorkspaceAliasPlugin(repoRoot),
      createStylexPlugin(),
    ],
    logLevel: "warning",
  };
}

export async function buildRenderBundle(options?: {
  repoRoot?: string;
  outfile?: string;
  silent?: boolean;
}) {
  const startedAt = performance.now();
  const outfile = options?.outfile || SSR_BUNDLE_OUTFILE;
  mkdirSync(dirname(outfile), { recursive: true });

  const buildConfig = getRenderBundleBuildConfig(options);
  const result = await build(buildConfig);
  const elapsedMs = Math.round(performance.now() - startedAt);

  if (!options?.silent) {
    console.log(`[ssr-build] SSR render bundle built successfully -> ${outfile} (${elapsedMs}ms)`);
  }

  return { result, outfile, elapsedMs };
}

if (import.meta.main) {
  try {
    await buildRenderBundle();
  } catch (error) {
    console.error("[ssr-build] SSR render bundle build failed:", error);
    process.exit(1);
  }
}
