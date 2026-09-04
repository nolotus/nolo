#!/usr/bin/env bun
// scripts/public-audit/verifyProjection.ts
//
// 纯公开投影 verifier：只读取 public tree 自身，fail-closed 校验本仓库是否是
// 一个合法的 "nolo" public projection（Runtime / Build / Audit 最小集）。
//
// 用法：bun scripts/public-audit/verifyProjection.ts [repoRoot]
// （repoRoot 省略时 = 本文件所在仓的根）
//
// 边界（刻意保持，Phase 1 契约）：
// - 不包含 private 仓（bun-nolo）的包清单 / 裁剪规则 / sanitization 规则
// - 不包含 provider 价格 rewrite、private provider alias
// - 不包含 private auth/billing 实现拓扑；只声明「公开投影里什么禁止存在」
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { isForbiddenDatabaseImport } from "../../packages/database/databaseBoundaryContract";

const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

// Audit：公开投影必需的 Runtime / Build / Audit 文件（缺失即 fail）
const REQUIRED_FILES = [
  // Runtime / Build scaffold
  "package.json",
  "bunfig.toml",
  "tsconfig.json",
  ".bun-version",
  // Build：web bundle 链（CI web build + desktop pre-build 子进程）
  "scripts/dev/esbuild.config.js",
  "scripts/dev/esBuild.js",
  // Audit：projection verifier 与 release/CI 依赖
  ".github/workflows/ci.yml",
  ".github/workflows/cli-publish.yml",
  ".github/workflows/desktop-build.yml",
  ".github/workflows/version-bump.yml",
  "scripts/public-audit/verifyProjection.ts",
  "scripts/public-audit/verifyReleaseUpdateCompatibility.ts",
  "scripts/public-audit/desktop/smokeInstalledWindowsDesktop.ps1",
  "scripts/public-audit/desktop/verifyLegacyDesktopDownloadAlias.ts",
  "scripts/release/assertProjectionReleaseMetadata.ts",
  "scripts/release/projectionReleaseMetadata.ts",
  "scripts/release/prepareCliPublishPackage.ts",
  "scripts/release/publishDesktopDownloads.ts",
  "scripts/release/desktopReleasePublisher.ts",
  "scripts/release/s3Upload.ts",
  "scripts/ci/runCliPublishPublic.sh",
  "scripts/ci/verifyLinuxDesktopDeps.sh",
  // Release provenance
  "projection-release-metadata.json",
] as const;

// 禁止进入公开投影的包（服务端/收费/鉴权核心与内部工具）。
// packages/server 例外：允许存在，但只允许 entry.ts stub（desktop runtime resolve 需要）。
const FORBIDDEN_PACKAGES = new Set([
  "auth",
  "daemon",
  "nolo-ci",
  "leveldb",
  "remotion-demo",
  "game",
  "rn",
  "cli-darwin-arm64",
]);

// 凭据/私钥类文件名模式（通用凭据卫生，不含 private 仓拓扑信息）
const CREDENTIAL_FILE_PATTERNS: readonly RegExp[] = [
  /^\.env($|\.)/,
  /\.pem$/,
  /\.key$/,
  /\.p12$/,
  /\.pfx$/,
  /\.jks$/,
  /\.cer$/,
  /\.crt$/,
  /\.secret/i,
  /credentials/,
];

// 测试 / eval / fixture 资产：公开投影不承担 test suite
const TEST_ASSET_DIR_NAMES = new Set([
  "__tests__",
  "__fixtures__",
  "__snapshots__",
  "snapshots",
  "goldens",
  "testdata",
]);
const TEST_ASSET_FILE_RE =
  /(\.(?:test|spec)\.(?:ts|tsx|js|jsx|mjs|cjs)$|\.source\.test\.(?:ts|tsx)$|\.cases\.json$|\.snap$)/;

// 遍历目录（跳过构建产物与依赖）
async function walkFiles(
  root: string,
  visit: (relPath: string, fullPath: string) => void | Promise<void>,
): Promise<void> {
  const skip = new Set(["node_modules", ".git", "build", "dist", ".turbo", ".cache", "artifacts"]);
  const stack: string[] = [root];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (skip.has(entry.name)) continue;
      const full = join(dir, entry.name);
      const rel = relative(root, full).split("\\").join("/");
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        visit(rel, full);
      }
    }
  }
}

// private-only import specifier（最小公开边界声明，与数据库边界契约组合判定）
function privateOnlyImportRule(specifier: string): string | null {
  const normalized = specifier.replace(/^\.\.?\//, "").replace(/^@nolo\//, "");
  if (
    normalized === "auth/server" ||
    normalized.startsWith("auth/server/") ||
    normalized.includes("/auth/server")
  ) {
    return "auth/server";
  }
  if (normalized === "auth" || normalized.startsWith("auth/") || normalized.startsWith("packages/auth")) {
    return "packages/auth";
  }
  if (
    normalized === "billing/index.cloud" ||
    normalized.startsWith("billing/index.cloud/") ||
    normalized.startsWith("packages/billing/index.cloud")
  ) {
    return "billing/index.cloud";
  }
  const db = isForbiddenDatabaseImport(specifier);
  return db.forbidden ? (db.rule ?? "database-boundary") : null;
}

function isPathLikeFileToken(token: string): boolean {
  return /\.(ts|tsx|js|jsx|mjs|cjs|sh|ps1)$/.test(token);
}

export async function verifyProjection(
  rootDir: string = DEFAULT_ROOT,
): Promise<{ passed: boolean; violations: string[] }> {
  const violations: string[] = [];
  const add = (msg: string) => violations.push(msg);

  // 1. 必需 scaffold / build / audit 文件
  for (const rel of REQUIRED_FILES) {
    if (!existsSync(join(rootDir, rel))) add(`missing-required: ${rel}`);
  }

  // 2. packages：禁止包 / manifest 可解析 / workspace 依赖闭包合法
  const packagesDir = join(rootDir, "packages");
  const packageNames = new Set<string>();
  if (existsSync(packagesDir)) {
    for (const entry of await readdir(packagesDir, { withFileTypes: true })) {
      if (entry.isDirectory()) packageNames.add(entry.name);
    }
    for (const name of packageNames) {
      if (FORBIDDEN_PACKAGES.has(name)) add(`forbidden-package: packages/${name}`);
      if (name === "server") {
        // 只允许 entry.ts stub
        for (const f of await readdir(join(packagesDir, "server"))) {
          if (f !== "entry.ts") add(`forbidden-package-content: packages/server/${f}（只允许 entry.ts stub）`);
        }
        continue;
      }
      if (name === "desktop-chrome-connector") {
        // manifest-less package（公开依赖闭包的合法成员，见 bun-nolo 回归测试），
        // 无 manifest 可解析；文件级扫描仍由第 5 节全树扫描覆盖。
        continue;
      }
      const manifestPath = join(packagesDir, name, "package.json");
      if (!existsSync(manifestPath)) {
        add(`missing-manifest: packages/${name}/package.json`);
        continue;
      }
      let manifest: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
      try {
        manifest = JSON.parse(await readFile(manifestPath, "utf8"));
      } catch (error) {
        add(`manifest-parse: packages/${name}/package.json (${error instanceof Error ? error.message : String(error)})`);
        continue;
      }
      for (const depField of ["dependencies", "devDependencies"] as const) {
        for (const [depName, spec] of Object.entries(manifest[depField] ?? {})) {
          if (typeof spec !== "string" || !spec.startsWith("workspace:")) continue;
          const raw = spec.slice("workspace:".length);
          const target = raw === "*" ? depName.replace(/^@[^/]+\//, "") : raw.replace(/^packages\//, "").replace(/^@[^/]+\//, "");
          if (!packageNames.has(target)) {
            add(`broken-workspace-dep: packages/${name} ${depName} -> ${spec}（目标包不在投影中）`);
          }
        }
      }
    }
  } else {
    add("missing-required: packages/");
  }

  // 3. root manifest 可解析 + scripts 引用的文件必须存在
  let rootScripts: Record<string, string> = {};
  try {
    const rootManifest = JSON.parse(await readFile(join(rootDir, "package.json"), "utf8"));
    rootScripts = rootManifest.scripts ?? {};
  } catch (error) {
    add(`manifest-parse: package.json (${error instanceof Error ? error.message : String(error)})`);
  }
  for (const [scriptName, cmd] of Object.entries(rootScripts)) {
    if (typeof cmd !== "string") continue;
    for (const m of cmd.matchAll(/[.\/\w@-]+/g)) {
      const token = m[0];
      if (!isPathLikeFileToken(token)) continue;
      if (!existsSync(join(rootDir, token.replace(/^\.\//, "")))) {
        add(`script-dangling-ref: scripts["${scriptName}"] -> ${token}`);
      }
    }
  }

  // 4. projection release metadata 一致性
  const metadataPath = join(rootDir, "projection-release-metadata.json");
  if (existsSync(metadataPath)) {
    try {
      const meta = JSON.parse(await readFile(metadataPath, "utf8"));
      const sourceSha = String(meta?.provenance?.sourceSha ?? "");
      if (!/^[0-9a-f]{40}$/.test(sourceSha)) {
        add(`release-metadata: provenance.sourceSha 不是 40-hex（got "${sourceSha}"）`);
      }
      const components = ["cli", "desktop"] as const;
      for (const comp of components) {
        const declared = meta?.components?.[comp];
        if (!declared || typeof declared.version !== "string" || declared.version.length === 0) {
          add(`release-metadata: components.${comp}.version 缺失`);
          continue;
        }
        if (!["alpha", "beta", "stable", "main", "latest"].includes(String(declared.channel))) {
          add(`release-metadata: components.${comp}.channel 非法（${declared.channel}）`);
        }
        if (!["none", "release"].includes(String(declared.releaseIntent))) {
          add(`release-metadata: components.${comp}.releaseIntent 非法（${declared.releaseIntent}）`);
        }
      }
      // 与组件 manifest 无漂移
      const cliPkg = JSON.parse(await readFile(join(rootDir, "packages/cli/package.json"), "utf8"));
      if (meta?.components?.cli?.version !== cliPkg.version) {
        add(`release-metadata: cli version ${meta?.components?.cli?.version} 与 packages/cli/package.json ${cliPkg.version} 漂移`);
      }
      const desktopPkg = JSON.parse(await readFile(join(rootDir, "packages/desktop/package.json"), "utf8"));
      if (meta?.components?.desktop?.version !== desktopPkg.version) {
        add(`release-metadata: desktop version ${meta?.components?.desktop?.version} 与 packages/desktop/package.json ${desktopPkg.version} 漂移`);
      }
    } catch (error) {
      add(`release-metadata: 解析失败（${error instanceof Error ? error.message : String(error)}）`);
    }
  }

  // 5. 全树扫描：凭据文件 / 测试与 eval 资产 / private-only import
  const importSpecifierRe = /(?:from\s+|import\s*\(?\s*|require\s*\(\s*)["']([^"']+)["']/g;
  await walkFiles(rootDir, async (rel, full) => {
    const base = rel.split("/").pop() ?? rel;
    for (const pattern of CREDENTIAL_FILE_PATTERNS) {
      if (pattern.test(base)) add(`credential-file: ${rel}`);
    }
    if (TEST_ASSET_FILE_RE.test(base)) add(`test-asset: ${rel}`);
    const segments = rel.split("/");
    for (const seg of segments) {
      if (TEST_ASSET_DIR_NAMES.has(seg)) add(`test-asset-dir: ${rel}`);
    }
    if (/\.(ts|tsx)$/.test(base) && existsSync(full)) {
      const content = await readFile(full, "utf8");
      for (const m of content.matchAll(importSpecifierRe)) {
        const rule = privateOnlyImportRule(m[1]);
        if (rule) add(`private-import: ${rel} -> "${m[1]}"（${rule}）`);
      }
    }
  });

  return { passed: violations.length === 0, violations };
}

if (import.meta.main) {
  const rootArg = process.argv[2];
  const root = rootArg ? resolve(rootArg) : DEFAULT_ROOT;
  const result = await verifyProjection(root);
  if (!result.passed) {
    console.error(`[verify-projection] FAIL：${result.violations.length} 个违规：`);
    for (const v of result.violations) console.error(`  - ${v}`);
    process.exit(1);
  }
  console.log(`[verify-projection] ok：${root} 是合法的 public projection（Runtime/Build/Audit）`);
}
