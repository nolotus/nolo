#!/usr/bin/env bun
// scripts/public-audit/verifyProjection.ts
//
// 纯公开投影 verifier：只读取 public tree 自身，fail-closed 校验本仓库是否是
// 一个合法的 "nolo" public projection（Runtime / Build / Audit 最小集）。
//
// 用法：bun scripts/public-audit/verifyProjection.ts [repoRoot]
// （repoRoot 省略时 = 本文件所在仓的根）
//
// 边界（Phase 2A 契约）：
// - 独立自洽：仅依赖 Node/Bun 标准库，不依赖私有 runtime boundary contract
// - 正向白名单：仅描述公开包清单，不暴露私有包 inventory 与内部拓扑
// - 全树审计：校验 scaffold 完整性、依赖闭包合法性、发布元数据一致性与无敏感/测试资产
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

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
  "scripts/dev/checkDangling.mjs",
  "scripts/public-build/stylexBunPlugin.ts",
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

// 公开投影允许存在的 package 集合（正向白名单 / public packages policy）
const PUBLIC_PACKAGES = new Set([
  "agent-runtime",
  "ai",
  "app",
  "billing",
  "chat",
  "cli",
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
  "render",
  "share",
  "shared",
  "web",
]);

// 凭据/私钥类文件名模式（通用凭据卫生）
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

// 检查非公开或越界模块 import。
// Phase 2A 契约：本函数是 packages/database/databaseBoundaryContract
// 的 isForbiddenDatabaseImport 的超集；一致性由
// scripts/release/publicProjectionBoundary.test.ts 的 drift 防护测试锚定，
// 两套规则任何一侧收紧/放松导致 contract 判禁而本规则漏报时测试即报警。
export function privateOnlyImportRule(specifier: string): string | null {
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
  if (
    normalized === "database/server" ||
    normalized.startsWith("database/server/") ||
    normalized === "packages/database/server" ||
    normalized.startsWith("packages/database/server/") ||
    normalized.includes("/database/server") ||
    /^(?:\.\.\/)+database\/server(?:\/.*)?$/.test(specifier) ||
    /^(?:\.\.\/)+server\/routes(?:\/.*)?$/.test(specifier)
  ) {
    return "packages/database/server";
  }
  return null;
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

  // 1.5 公开 surface 形状：无内部 docs/；.github/workflows 只有本仓生成的 4 个
  // （只断言公开树自身的最终形状，不引用任何私有排除清单或私有布局）。
  if (existsSync(join(rootDir, "docs"))) {
    add("unexpected-subtree: docs/（公开投影不携带内部文档目录）");
  }
  const workflowsDir = join(rootDir, ".github", "workflows");
  if (existsSync(workflowsDir)) {
    const generatedWorkflows = new Set(["ci.yml", "cli-publish.yml", "desktop-build.yml", "version-bump.yml"]);
    for (const entry of await readdir(workflowsDir)) {
      if (!generatedWorkflows.has(entry)) {
        add(`unexpected-workflow: .github/workflows/${entry}（公开 CI 只包含本仓生成的 4 个 workflow）`);
      }
    }
  }

  // 2. packages：正向包白名单校验 / manifest 可解析 / workspace 依赖闭包合法
  const packagesDir = join(rootDir, "packages");
  const packageNames = new Set<string>();
  if (existsSync(packagesDir)) {
    for (const entry of await readdir(packagesDir, { withFileTypes: true })) {
      if (entry.isDirectory()) packageNames.add(entry.name);
    }
    for (const name of packageNames) {
      if (!PUBLIC_PACKAGES.has(name)) {
        add(`unexpected-package: packages/${name}（不在公开包白名单中）`);
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
      // 公开投影只暴露最终 public surface：私有投影 policy 元数据（若出现）
      // 意味着「哪些路径被私有策略排除」的布局知识泄露进了公开仓。
      if (manifest !== null && typeof manifest === "object" && "noloProjection" in manifest) {
        add(`private-policy-leak: packages/${name}/package.json carries noloProjection`);
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
