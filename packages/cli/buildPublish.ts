import { chmodSync, existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  buildPublishArtifactAssembly,
  inlineWorkspaceDependencies,
} from "./buildPublishArtifactAssembly";
import {
  collectTypeScriptSourceFiles,
  collectWorkspaceDependencies,
  extractExternalImports,
  rewriteCrossPackageImports,
} from "./buildPublishImportAnalysis";
import { buildPublishManifest } from "./publishPackage";

const BUILD_PUBLISH_DIR = dirname(fileURLToPath(import.meta.url));
const REAL_REPO_ROOT = join(BUILD_PUBLISH_DIR, "..", "..");

/**
 * Build a publish-safe CLI artifact in the dist directory.
 *
 * This function:
 * 1. Creates a dist directory
 * 2. Copies source files specified in package.json "files" array
 * 3. Generates a publish-safe package.json (no workspace deps)
 * 4. Inlines workspace dependencies from monorepo packages
 *
 * The output can be published to npm and installed outside the monorepo.
 *
 * @param sourceDir - The CLI package source directory (packages/cli)
 * @param distDir - The output directory (packages/cli/dist)
 */
/**
 * Phase 1 denylist: React Native packages must never enter nolo-cli npm
 * dependencies. React/Redux/Web UI packages are still present in the CLI
 * bundle today and are scheduled for phase 2 detachment; do not add them
 * here until the CLI reachable graph no longer imports them.
 */
export const CLI_PUBLISH_DEPENDENCY_DENYLIST = [
  /^react-native$/,
  /^react-native-.+/,
  /^@react-native-community\//,
  /^@react-native\//,
  /^react$/,
  /^react-dom$/,
  /^slate$/,
];

export const CLI_PUBLISH_DEPENDENCY_ALLOWLIST = [
  "@clack/core",
  "clipboardy",
  "ulid",
  "level",
  "tweetnacl",
  "js-base64",
  "crypto-js",
  "js-yaml",
  "rambda",
  "zod",
];

export function isDeniedCliDependency(depName: string): boolean {
  return CLI_PUBLISH_DEPENDENCY_DENYLIST.some((pattern) => pattern.test(depName));
}

export function isAllowedCliDependency(depName: string): boolean {
  return CLI_PUBLISH_DEPENDENCY_ALLOWLIST.includes(depName);
}

export function filterDeniedCliDependencies(
  deps: Record<string, string>
): Record<string, string> {
  const filtered: Record<string, string> = {};
  for (const [name, version] of Object.entries(deps)) {
    if (!isDeniedCliDependency(name)) {
      filtered[name] = version;
    }
  }
  return filtered;
}

export async function buildPublishArtifact(
  sourceDir: string,
  distDir: string
): Promise<void> {
  const pkgPath = join(sourceDir, "package.json");
  if (!existsSync(pkgPath)) {
    throw new Error(`package.json not found at ${pkgPath}`);
  }

  const sourceManifest = JSON.parse(readFileSync(pkgPath, "utf8"));
  const filesToCopy = sourceManifest.files || [];
  const warn = (message: string, error?: unknown): void => {
    if (error === undefined) {
      console.warn(message);
      return;
    }
    console.warn(message, error);
  };

  const {
    resolvedFilesToCopy,
    inlinedDeps,
    inlinedFiles = [],
    externalDeps,
  } = await buildPublishArtifactAssembly({
    sourceDir,
    distDir,
    filesToCopy,
    extractExternalImports,
    rewriteCrossPackageImports,
    collectWorkspaceDependencies: (entrySourceDir, resolvedFiles) =>
      collectWorkspaceDependencies(entrySourceDir, sourceManifest, resolvedFiles),
    inlineWorkspaceDependencies,
    warn,
  });

  const publishManifest = buildPublishManifest(sourceManifest);
  const repoRoot = join(sourceDir, "..", "..");
  const rootManifest = existsSync(join(repoRoot, "package.json"))
    ? JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"))
    : {};
  const cliExternalDeps = discoverExternalImportsFromCliSourceFiles(
    sourceDir,
    resolvedFilesToCopy,
    rootManifest
  );

  if (inlinedFiles.length > 0) {
    publishManifest.files = Array.from(new Set([...resolvedFilesToCopy, ...inlinedFiles]));
  } else if (inlinedDeps.length > 0) {
    publishManifest.files = Array.from(new Set(resolvedFilesToCopy));
    for (const dep of inlinedDeps) {
      publishManifest.files.push(`${dep}/**/*.ts`);
    }
  } else {
    publishManifest.files = Array.from(new Set(resolvedFilesToCopy));
  }

  if (publishManifest.dependencies) {
    for (const key of Object.keys(publishManifest.dependencies)) {
      if (isDeniedCliDependency(key) || !isAllowedCliDependency(key)) {
        delete publishManifest.dependencies[key];
      }
    }
  }

  if (Object.keys(externalDeps).length > 0) {
    publishManifest.dependencies = publishManifest.dependencies || {};
    for (const [name, version] of Object.entries(externalDeps)) {
      if (!isDeniedCliDependency(name) && !publishManifest.dependencies[name]) {
        publishManifest.dependencies[name] = version;
      }
    }
  }

  if (Object.keys(cliExternalDeps).length > 0) {
    publishManifest.dependencies = publishManifest.dependencies || {};
    for (const [name, version] of Object.entries(cliExternalDeps)) {
      if (!isDeniedCliDependency(name) && isAllowedCliDependency(name) && !publishManifest.dependencies[name]) {
        publishManifest.dependencies[name] = version;
      }
    }
  }

  writeFileSync(
    join(distDir, "package.json"),
    JSON.stringify(publishManifest, null, 2) + "\n"
  );
}

/**
 * Build the publishable CLI artifact as a single Node-runnable bundle.
 *
 * Runs the source assembly (for dependency discovery and a fallback raw-TS
 * tree), then esbuild-bundles `index.ts` into `index.js` with a
 * `#!/usr/bin/env node` shebang and rewrites the publish manifest so the
 * shipped package only carries the bundled entry plus README.
 */
export async function buildPublishArtifactBundled(
  sourceDir: string,
  distDir: string
): Promise<void> {
  await buildPublishArtifact(sourceDir, distDir);

  const distPkgPath = join(distDir, "package.json");
  const distPkg = JSON.parse(readFileSync(distPkgPath, "utf8"));

  // Phase 2: 只保留含 native prebuild 的包为 external（npm 安装时需要平台 prebuild）。
  // 纯 JS 包全部 inline 进 bundle，配合 code splitting 进独立 chunk，
  // 主入口 --help 不再加载 @reduxjs/toolkit / i18next / iztro 等 web/RN 依赖。
  //
  // ulid 必须保持 external：其 UMD 入口在初始化时调用 require("crypto") 获取安全
  // 随机数。一旦被 esbuild inline 进纯 ESM chunk，require 在 ESM 顶层不可用，
  // detectPrng 的 try/catch 吞掉该异常后抛出
  // "secure crypto unusable, insecure Math.random not allowed"，导致 Node（含
  // Windows Node 26）加载 ulid chunk 即崩。保持 external 后 Node 通过包解析加载
  // ulid 的 CJS/UMD，require("crypto") 在其 CJS 上下文中可用，安全随机数正常工作。
  const PUBLISH_EXTERNAL = [
    "level",           // → classic-level (native .node prebuild)
    "classic-level",   // 直接依赖时也 external
    "ulid",            // UMD 初始化需 require("crypto")，不能 inline 进 ESM chunk
    "tweetnacl",       // CJS 入口 require("crypto")，inline 进 ESM chunk 会触发 Dynamic require 崩溃
    "react-native",
    "react-native/*",
  ];

  await bundleCliEntry({ sourceDir, distDir, external: PUBLISH_EXTERNAL });

  // 发布依赖只留 bundle 产物实际引用的 external 包；其余纯 JS 已 inline。
  // 不能只依据源码可达图保留依赖，因为 tree shaking 可能移除整个 external import。
  const emittedExternalDeps = new Set<string>();
  for (const entry of readdirSync(distDir)) {
    if (!entry.endsWith(".js")) continue;
    const content = readFileSync(join(distDir, entry), "utf8");
    for (const dependency of extractExternalImports(content)) {
      emittedExternalDeps.add(dependency);
    }
    // levelLazyShim uses createRequire so database code stays lazy on --help.
    // esbuild emits that call as `_require("level")` in a split chunk.
    const requirePattern = /\b(?:require|_require|require\d+)\(\s*["']([^"']+)["']\s*\)/g;
    let requireMatch: RegExpExecArray | null;
    while ((requireMatch = requirePattern.exec(content)) !== null) {
      const [dependency] = extractExternalImports(`import ${JSON.stringify(requireMatch[1])}`);
      if (dependency) emittedExternalDeps.add(dependency);
    }
  }
  const publishVersionMap = buildPublishVersionMap(sourceDir);
  const keptDeps: Record<string, string> = {};
  for (const name of ["level", "ulid", "tweetnacl"]) {
    if (!emittedExternalDeps.has(name)) continue;
    const version = distPkg.dependencies?.[name] ?? publishVersionMap[name];
    if (version) keptDeps[name] = version;
  }
  distPkg.dependencies = keptDeps;
  distPkg.files = ["*.js", "README.md"];
  distPkg.bin = { nolo: "index.js" };
  distPkg.module = "index.js";
  delete distPkg.devDependencies;
  delete distPkg.peerDependencies;

  writeFileSync(distPkgPath, JSON.stringify(distPkg, null, 2) + "\n");
}

/**
 * Build the publishable CLI artifact as a standalone compiled binary.
 *
 * This produces a Bun `--compile` executable named `nolo` inside `distDir`.
 * The bundled `index.js` is retained as a fallback, but the published native
 * package should expose the binary via `bin.nolo`.
 *
 * Native-only dynamic imports (React Native, Playwright, Electron) are left
 * external because they are unreachable in CLI mode and cannot be parsed by
 * the Bun bundler.
 */
export async function buildPublishArtifactCompiled(
  sourceDir: string,
  distDir: string,
  target?: string,
): Promise<void> {
  await buildPublishArtifactBundled(sourceDir, distDir);

  const sourceEntryPath = join(sourceDir, "index.ts");
  const binaryPath = join(distDir, "nolo");
  if (!existsSync(sourceEntryPath)) {
    throw new Error(`CLI source entry not found: ${sourceEntryPath}`);
  }

  const external = [
    "react-native",
    "react-native/*",
    "react-native-blob-util",
    "playwright",
    "playwright-core",
    "electron",
    "chromium-bidi",
    "chromium-bidi/*",
  ];

  // Alias node-gyp-build → nodeGypBuildShim.ts so the compiled binary
  // resolves classic-level's native .node from the bundled prebuilds
  // directory rather than from a baked __dirname that fails in bunfs.
  // We invoke a separate bun process (compileRunner.ts) that calls
  // Bun.build with the alias plugin, because calling Bun.build directly
  // from within `bun test` causes intermittent module-resolution failures.
  const shimAbsPath = join(BUILD_PUBLISH_DIR, "nodeGypBuildShim.ts");
  const compileRunnerPath = join(BUILD_PUBLISH_DIR, "compileRunner.ts");
  const tsconfigPath = join(REAL_REPO_ROOT, "tsconfig.json");

  // Bun.build compile: use CompileBuildOptions object form so outfile
  // is honored (boolean true ignores top-level outfile and writes to ./cli).
  // target format requires "bun-" prefix (e.g. "bun-linux-x64").
  const compileEnv = {
    ...process.env,
    NOLO_COMPILE_ENTRY: sourceEntryPath,
    NOLO_COMPILE_OUTFILE: binaryPath,
    NOLO_COMPILE_TARGET: target ?? "",
    NOLO_COMPILE_EXTERNAL: JSON.stringify(external),
    NOLO_COMPILE_SHIM: shimAbsPath,
    NOLO_COMPILE_TSCONFIG: tsconfigPath,
  };

  const result = spawnSync("bun", [compileRunnerPath], {
    cwd: REAL_REPO_ROOT,
    encoding: "utf8",
    env: compileEnv,
  });

  if (result.status !== 0) {
    throw new Error(
      `bun compile failed (status ${result.status}): ${result.stderr || result.stdout || "unknown error"}`,
    );
  }

  chmodSync(binaryPath, 0o755);
}

async function bundleCliEntry(args: {
  sourceDir: string;
  distDir: string;
  external: string[];
}): Promise<void> {
  const entryPath = join(args.sourceDir, "index.ts");
  const outPath = join(args.distDir, "index.js");
  if (!existsSync(entryPath)) {
    throw new Error(`CLI entry not found: ${entryPath}`);
  }

  const config = {
    entryPoints: [entryPath],
    outdir: args.distDir,
    bundle: true,
    splitting: true,
    platform: "node",
    format: "esm",
    target: "node22",
    external: args.external,
    alias: {
      level: join(args.sourceDir, "levelLazyShim.mjs"),
      // bun:sqlite 是 Bun 内置模块，Node 运行时无等价实现；CLI 可达图（经
      // database-engine/serverStoreFactory 的 sqlite driver）默认走 level，不
      // 实例化 sqlite Database。仅当用户显式设置 NOLO_SERVER_AUTHORITY_DRIVER=sqlite
      // 时才会触发 shim 抛错——这是有意的显式失败（防静默损坏），错误信息会
      // 指导移除该环境变量（见 bunSqliteLazyShim.mjs）。
      "bun:sqlite": join(args.sourceDir, "bunSqliteLazyShim.mjs"),
    },
    legalComments: "none",
    sourcemap: false,
    logLevel: "warning",
  };

  const runner = `const {buildSync}=require("esbuild");const c=JSON.parse(process.env.NOLO_ESBUILD_CONFIG||"{}");buildSync(c);`;
  const result = spawnSync("node", ["-e", runner], {
    cwd: REAL_REPO_ROOT,
    env: { ...process.env, NOLO_ESBUILD_CONFIG: JSON.stringify(config) },
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(
      `esbuild CLI bundle failed (status ${result.status}): ${result.stderr || result.stdout || "unknown error"}`
    );
  }

  // code splitting 的 banner 会污染 chunk；手动给入口加 shebang
  const entryOut = join(args.distDir, "index.js");
  if (existsSync(entryOut)) {
    const content = readFileSync(entryOut, "utf8");
    if (!content.startsWith("#!")) {
      writeFileSync(entryOut, "#!/usr/bin/env node\n" + content);
    }
  }
}

/**
 * Resolve a name → version map from the repo-root and CLI package manifests,
 * skipping workspace: ranges. Used to attach publish versions to external
 * packages that reach the bundle through inlined workspace dependencies.
 */
function buildPublishVersionMap(sourceDir: string): Record<string, string> {
  const versionMap: Record<string, string> = {};
  const repoRoot = join(sourceDir, "..", "..");
  const manifestPaths = [
    join(repoRoot, "package.json"),
    join(sourceDir, "package.json"),
  ];

  for (const manifestPath of manifestPaths) {
    if (!existsSync(manifestPath)) continue;
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    for (const field of ["dependencies", "devDependencies", "peerDependencies"]) {
      const entries = manifest[field];
      if (entries && typeof entries === "object") {
        for (const [name, version] of Object.entries(entries)) {
          if (typeof version === "string" && !version.startsWith("workspace:") && !versionMap[name]) {
            versionMap[name] = version;
          }
        }
      }
    }
  }

  return versionMap;
}

function discoverExternalImportsFromCliSourceFiles(
  sourceDir: string,
  filesToCopy: string[],
  rootManifest: Record<string, any>
): Record<string, string> {
  const versionMap: Record<string, string> = {};
  const pkgPath = join(sourceDir, "package.json");
  const sourceManifest = existsSync(pkgPath) ? JSON.parse(readFileSync(pkgPath, "utf8")) : {};

  for (const manifest of [rootManifest, sourceManifest]) {
    for (const field of ["dependencies", "devDependencies", "peerDependencies"]) {
      const entries = manifest[field];
      if (entries && typeof entries === "object") {
        for (const [name, version] of Object.entries(entries)) {
          if (typeof version === "string" && !version.startsWith("workspace:") && !versionMap[name]) {
            versionMap[name] = version;
          }
        }
      }
    }
  }

  const discoveredNames = new Set<string>();
  for (const filePath of collectTypeScriptSourceFiles(sourceDir, filesToCopy)) {
    const content = readFileSync(filePath, "utf8");
    for (const importName of extractExternalImports(content)) {
      discoveredNames.add(importName);
    }
  }

  const finalDeps: Record<string, string> = {};
  for (const name of Array.from(discoveredNames).sort()) {
    if (!isDeniedCliDependency(name) && isAllowedCliDependency(name) && versionMap[name]) {
      finalDeps[name] = versionMap[name];
    }
  }

  return finalDeps;
}

export { rewriteCrossPackageImports } from "./buildPublishImportAnalysis";
