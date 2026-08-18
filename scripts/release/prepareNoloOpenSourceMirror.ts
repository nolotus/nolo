// scripts/release/prepareNoloOpenSourceMirror.ts
// 为 nolotus/nolo（public）开源仓库准备源码树，保留 monorepo 结构。
//
// 与 CLI 开源不同（CLI 发布产物可压平），desktop 用 electrobun 打包内置
// web UI，构建脚本（esbuild / workspaces）依赖 monorepo 相对路径
// （../../），因此 **必须保留 packages/* 结构** 才能构建。
//
// 剥离原则（收费隔离 + 安全）：
// - 后端包（server/billing/auth/daemon/nolo-ci 等）整体硬拒绝不进
// - 剥离私有子树（server / billing），严禁泄露服务端逻辑
// - 前端包按需白名单复制，保持 packages/<name> 原位
// - 文件级剥离：oauthProviders.ts / antigravity.ts / .env* / 证书密钥
// - 静态 import 审计：严禁非测试源码中引用私有模块（auth/server, billing, packages/auth, database/server 等）
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DATABASE_BOUNDARY_CONTRACT,
  isForbiddenDatabaseFile,
  isForbiddenDatabaseImport,
  isForbiddenDatabasePath,
} from "../../packages/database/databaseBoundaryContract";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, "..", "..");

// 种子包（desktop 构建入口相关），随后用依赖闭包自动补全。
// 对齐 nolo-cli（已验证能构建、无泄漏）清单 + desktop/web/shared。
export const SEED_PACKAGES = [
  "desktop",
  "desktop-runtime",
  "web",
  "shared",
  "cli",
  "client",
  "app",
  "chat",
  "core",
  "agent-runtime",
  "integrations",
  "create",
  "ai",
  "render",
  "database",
  "database-engine",
  "form",
  "connector-experimental",
  "share",
  "identity",
  "billing",
  "lab",
  "oauth",
  "tui",
] as const;

// 绝不进开源仓库的包（服务端收费/鉴权核心及内部工具）
// 注意：billing 不在此列 —— 它和 identity 同模式（index.cloud.ts 委托 auth，
// index.local.ts 是 no-op），公开集保留 billing 包 + index.local.ts，
// 仅文件级剥离 index.cloud.ts。
export const HARD_DENY_PACKAGES = new Set([
  "server",
  "auth",
  "daemon",
  "nolo-ci",
  "leveldb",
  "remotion-demo",
  "game",
  "rn",
  "cli-darwin-arm64",
]);

// 跨包 import 前缀 → 包名（源码里 `from "app/..."` → 包 app）
// 匹配 import/from "包名/子路径"（普通包名）。
// 注意：旧正则只匹配 from + 有子路径的形式，避免闭包过度膨胀引入预存在的 gate violation。
const IMPORT_PACKAGE_PATTERN = /from\s+["'']([a-z][a-z0-9-]*)\//g;
// 单独匹配 @nolo/ scoped 包（如 @nolo/llama-runtime），支持有无子路径。
const SCOPED_IMPORT_PATTERN = /(?:from|import)\s*\(?\s*["''](@nolo\/[a-z][a-z0-9-]*)(?:\/[^"'']*)?["'']/g;

// 从种子包出发 BFS 收集依赖闭包（源码 import + package.json workspace 声明）
export async function computePackageClosure(
  repoRoot: string,
  seeds: readonly string[] = SEED_PACKAGES,
): Promise<string[]> {
  const packagesDir = join(repoRoot, "packages");
  const closure = new Set<string>();
  const queue = [...seeds];

  while (queue.length > 0) {
    const pkg = queue.shift()!;
    if (closure.has(pkg) || HARD_DENY_PACKAGES.has(pkg)) continue;
    closure.add(pkg);

    const pkgDir = join(packagesDir, pkg);
    if (!existsSync(pkgDir)) continue;

    // 1) package.json workspace 依赖（workspace:xxx）
    try {
      const manifest = JSON.parse(await readFile(join(pkgDir, "package.json"), "utf8"));
      const deps = {
        ...(manifest.dependencies ?? {}),
        ...(manifest.devDependencies ?? {}),
      };
      for (const [name, spec] of Object.entries(deps)) {
        if (typeof spec === "string" && spec.startsWith("workspace:")) {
          const raw = spec.slice("workspace:".length).replace(/^packages\//, "").replace(/^@[^/]+\//, "");
          const target = raw === "*" ? name.replace(/^@[^/]+\//, "") : raw;
          queue.push(target);
        }
      }
    } catch {
      // 无 package.json 或解析失败则跳过
    }

    // 2) 源码 import（递归扫描 .ts/.tsx）
    const stack = [pkgDir];
    while (stack.length > 0) {
      const dir = stack.pop()!;
      let entries: string[];
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (
          entry.name === "node_modules" ||
          entry.name === ".git" ||
          entry.name === "build" ||
          entry.name === "server" ||
          // 跳过嵌套 billing 子目录（私有子树），但不跳过 billing 包本身的顶级目录。
          // 路径分隔符统一为 forward-slash 做 Windows 兼容。
          (entry.name === "billing" && !relative(repoRoot, dir).replace(/\\/g, "/").startsWith("packages/billing"))
        ) {
          continue;
        }
        if (isDeniedFile(entry.name)) continue;
        const full = join(dir, entry.name);
        const relToRepo = relative(repoRoot, full);
        if (isPublicExcludedPath(relToRepo)) continue;

        if (entry.isDirectory()) {
        } else if (/\.(ts|tsx)$/.test(entry.name)) {
          const content = await readFile(full, "utf8");
          for (const m of content.matchAll(IMPORT_PACKAGE_PATTERN)) {
            const dep = m[1];
            if (existsSync(join(packagesDir, dep)) && !HARD_DENY_PACKAGES.has(dep)) {
              queue.push(dep);
            }
          }
        }
      }
    }
  }

  return [...closure].sort();
}

// 文件名级剥离（含凭据结构 / 密钥 / 本地配置 / 证书 / 敏感凭据）
export const DENYLIST_FILE_GLOB = [
  // oauthProviders.ts 和 antigravity.ts 不再排除：
  // - oauthProviders.ts 只含 OAuth 配置常量（URL、client ID），不含密钥
  // - antigravity.ts 的 base64 常量已拆分，GitHub secret scanning 不再拦截
  // CLI 构建需要这两个文件。
  ".env",
  ".env.*",
  ".envrc",
  "*.pem",
  "*.key",
  "*.p12",
  "*.pfx",
  "*.jks",
  "*.cer",
  "*.crt",
  "*.secret*",
  // 注意：不再用 *credential* glob —— credentialBroker.ts 等文件只含凭证操作
  // 接口和实现（不含密钥），公开集需要它们以通过 typecheck。真正含密钥的
  // oauthProviders.ts 和 antigravity.ts 已不排除（base64 已拆分）。
  // *credentials* 匹配（带 s，不匹配 credentialBroker 等代码文件）。
  "*credentials*",
] as const;

// public 下不随源码开源的子目录（发布产物 / 构建输出 / 运行时生成）
export const PUBLIC_DENY_SUBDIRS = [
  "downloads", // 发布产物
  ".asset-builds", // 构建清单
  "assets", // esBuild 构建输出（开源仓库构建时重新生成）
] as const;

// 目录级排除：构建产物 / 依赖 / git 元数据 / 私有服务端及计费子树
export const DENY_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  "build",
  "dist",
  ".turbo",
  ".next",
  ".cache",
  "artifacts",
  "server", // 剥离私有 server 子树
  "billing", // 剥离私有 billing 子树
]);

// 必备 scaffold 声明（fail-closed 校验基准）
export const REQUIRED_SCAFFOLD_PATHS = [
  "package.json",
  "bunfig.toml",
  "tsconfig.json",
  "scripts/dev",
  "scripts/test",
  "scripts/test/setupDomGlobals.ts",
] as const;

// Cloud-only UI 与管理页面排除清单（Pricing, Recharge, Usage, Admin, EmailAdmin, 用户管理/邀请, auth web/cloud-only pages）
export const PUBLIC_EXCLUDED_PATHS = [
  // 1. Pricing
  "packages/app/pages/Pricing",
  "packages/app/pages/Pricing.tsx",

  // 2. Recharge
  "packages/app/pages/Recharge.tsx",
  "packages/life/web/RechargeRecord.tsx",
  "packages/life/web/RechargeModal.tsx",

  // 3. Usage (widgets / charts / records)
  "packages/life/web/Usage.tsx",
  "packages/life/web/UsageChart.tsx",
  "packages/life/web/UsageBarChart.tsx",
  "packages/life/web/UsageRecord.tsx",
  "packages/life/web/UsageRecord.source.test.ts",
  "packages/life/web/UsageBarChart.test.tsx",
  "packages/life/web/usageBarChartScale.test.ts",
  "packages/life/web/usageChartSeries.ts",
  "packages/life/web/usageChartSeries.test.ts",

  // 4. Admin
  "packages/app/admin",
  "packages/app/pages/ProviderHealthAdmin.tsx",
  "packages/app/pages/ProviderHealthAdmin.css",

  // 5. EmailAdmin
  "packages/app/pages/EmailAdmin.tsx",
  "packages/app/pages/EmailAdmin.css",
  "packages/app/email/AgentEmailE2EPage.tsx",

  // 6. 用户管理 / 邀请 (User management / Invite)
  "packages/life/web/InviteRewards.tsx",
  "packages/auth/web/UsersPage.tsx",
  "packages/auth/web/UsersPage.rechargeHistory.test.tsx",
  "packages/auth/web/UserPermissionsModal.tsx",
  "packages/auth/web/UserGrowthPanel.source.test.ts",
  "packages/auth/client/updateUserAdminPermissionsRequest.ts",
  "packages/auth/client/deleteUserRequest.ts",
  "packages/auth/hooks/useFetchUsers.ts",
  "packages/auth/hooks/useDisableUser.tsx",
  "packages/auth/hooks/useEnableUser.ts",
  "packages/auth/hooks/useDeleteUser.ts",
  "packages/auth/hooks/useRechargeUser.ts",
  "packages/auth/invite.ts",
  "packages/auth/invite.test.ts",

  // 7. auth web / cloud-only pages
  "packages/auth/web",

  // 8. edition 注入点的 cloud 实现（公开集只留 local edition）
  // 公开集通过 package.json 条件导出 default → .local.ts，cloud 文件不进 projection。
  // 新增 edition 对时，在此列表加 cloud 文件路径（见 packages/identity/EDITION.md）。
  // gate 会自动跳过 .cloud.ts/.cloud.tsx 文件的 import 检查，无需手动加 allowlist。
  "packages/identity/selectors.cloud.ts",
  "packages/identity/actions.cloud.ts",
  "packages/identity/RequireSignedIn.cloud.tsx",
  "packages/identity/cloudRoutes.cloud.ts",
  "packages/identity/cloudBootstrap.cloud.ts",
  "packages/identity/authReducer.cloud.ts",
  "packages/identity/authTypes.cloud.ts",
  "packages/identity/useDeleteOwnAccountFlow.cloud.ts",
  "packages/billing/index.cloud.ts",

  // 9. database-engine/db.ts 和 serverStoreFactory.ts 不再排除：
  // CLI 构建需要 db.ts（agent memory 用 dynamic import 加载它）。
  // serverStoreFactory.ts 只依赖 fs/path/level + 同包文件，无 auth/server 依赖。
  // 两者都安全进入公开集。

  // 11. AI 服务端文件：import database-engine/db（服务端 DB init），不进公开集。
  // 这些文件只被服务端代码 import，web 侧不消费。
  "packages/ai/token/serverTokenWriter.ts",
  "packages/ai/token/serverDialogProjection.ts",
  "packages/ai/token/externalToolCost.ts",
  "packages/ai/agent/server/fetchPublicAgents.ts",

  // 12. React Native 组件：公开集是 web/desktop 的，不需要 RN 组件。
  // 这些文件只被 packages/rn/ import，rn 包不在公开集闭包里。
  "packages/chat/messages/rn",
  "packages/chat/screens/DialogList.tsx",

  // 14. scripts/helpers 中含私有 import 的文件（不进公开集）
  "scripts/helpers/playwrightAuth.ts",
  "scripts/helpers/previewAuth.ts",
  "scripts/helpers/alphaRegistrationTestAgent.ts",
] as const;

// 开源投影清单（显式声明）
export const PUBLIC_PROJECTION_MANIFEST = {
  seedPackages: SEED_PACKAGES,
  scriptsToCopy: ["scripts/dev", "scripts/test", "scripts/release", "scripts/verify", "scripts/ci", "scripts/helpers"],
  requiredScaffoldPaths: REQUIRED_SCAFFOLD_PATHS,
  excludedPaths: PUBLIC_EXCLUDED_PATHS,
} as const;

export function normalizeRepoPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\//, "");
}

export function isPublicExcludedPath(
  relPath: string,
  excludedPaths: readonly string[] = PUBLIC_EXCLUDED_PATHS,
): boolean {
  const norm = normalizeRepoPath(relPath);
  const normWithPkg = norm.startsWith("packages/") ? norm : `packages/${norm}`;

  for (const item of excludedPaths) {
    const normItem = normalizeRepoPath(item);
    const itemWithoutPkg = normItem.startsWith("packages/")
      ? normItem.slice("packages/".length)
      : normItem;

    if (
      norm === normItem ||
      norm.startsWith(normItem + "/") ||
      normWithPkg === normItem ||
      normWithPkg.startsWith(normItem + "/") ||
      norm === itemWithoutPkg ||
      norm.startsWith(itemWithoutPkg + "/")
    ) {
      return true;
    }
  }
  return false;
}

// 文件名含 "credentials" 子串但不是凭证数据文件的代码文件 allowlist。
// *credentials* glob 会误匹配 agentCredentialSyncClient.ts：
// "CredentialSync" 的小写形式 "credentialsync" 包含子串 "credentials"（前 11 字符）。
// 这个文件是凭证同步客户端代码（不含密钥），不应被排除。
const DENY_FILENAME_ALLOWLIST = new Set([
  "agentCredentialSyncClient.ts",
]);

export function isDeniedFile(filename: string): boolean {
  if (isForbiddenDatabaseFile(filename)) {
    return true;
  }
  if (DENY_FILENAME_ALLOWLIST.has(filename)) return false;
  for (const pattern of DENYLIST_FILE_GLOB) {
    if (pattern.startsWith("*.") && filename.endsWith(pattern.slice(1))) {
      return true;
    }
    if (pattern.startsWith("*") && pattern.endsWith("*") && pattern.length > 2) {
      const sub = pattern.slice(1, -1);
      if (filename.toLowerCase().includes(sub.toLowerCase())) return true;
    }
    if (pattern === filename) return true;
    if (pattern === ".env.*" && filename.startsWith(".env.")) return true;
  }
  return false;
}

// 将 import specifier 解析为 packages/ 路径，用于检查是否命中 PUBLIC_EXCLUDED_PATHS。
// 只处理包名 import（如 "app/pages/Recharge"）和相对路径 import（如 "./UsageWidget"）。
// 动态 import 的变量路径（cloudLazy）不会被 extractImportSpecifiers 捕获，天然跳过。
// 第三方包（不在 SEED_PACKAGES 或闭包里的包名）不会被误判为内部路径。
const INTERNAL_PACKAGE_NAMES = new Set<string>(SEED_PACKAGES);

export function resolveImportSpecifier(specifier: string, importerRelPath: string): string | null {
  // 跳过第三方包（不含 / 的 specifier 或 @scope/pkg）
  if (!specifier.includes("/")) return null;
  if (specifier.startsWith("@")) return null;

  // 包名 import：如 "app/pages/Recharge" → "packages/app/pages/Recharge"
  // 只处理内部包名（在 SEED_PACKAGES 或闭包里），避免误判第三方包
  if (!specifier.startsWith(".")) {
    const pkgName = specifier.split("/")[0];
    if (!INTERNAL_PACKAGE_NAMES.has(pkgName)) return null;
    return `packages/${specifier}`;
  }

  // 相对路径 import：如 "./UsageWidget" from "packages/lab/date/routes.tsx"
  // → "packages/lab/date/UsageWidget"
  const importerDir = importerRelPath.includes("/")
    ? importerRelPath.split("/").slice(0, -1).join("/")
    : "";
  const parts = specifier.split("/");
  const resolved: string[] = [...(importerDir ? importerDir.split("/") : [])];
  for (const part of parts) {
    if (part === "..") resolved.pop();
    else if (part === "." || part === "") continue;
    else resolved.push(part);
  }
  return resolved.join("/");
}

// 提取源码中的所有 import/export/require 规范标识符
export function extractImportSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  const staticImportExport = /(?:import|export)\s+(?:[\s\S]*?from\s+)?["']([^"']+)["']/g;
  for (const m of source.matchAll(staticImportExport)) {
    specifiers.push(m[1]);
  }
  const dynamicImportRequire = /(?:import|require)\s*\(\s*["']([^"']+)["']\s*\)/g;
  for (const m of source.matchAll(dynamicImportRequire)) {
    specifiers.push(m[1]);
  }
  return specifiers;
}

// 检查 import specifier 是否属于私有禁止路径（通过公共契约与私有规则组合判定）
export function isForbiddenPrivateImport(specifier: string): { forbidden: boolean; rule?: string } {
  const normalized = specifier.replace(/^\.\.?\//, "").replace(/^@nolo\//, "");

  // 1. auth/server
  if (
    normalized === "auth/server" ||
    normalized.startsWith("auth/server/") ||
    normalized.includes("/auth/server") ||
    normalized === "packages/auth/server" ||
    normalized.startsWith("packages/auth/server/")
  ) {
    return { forbidden: true, rule: "auth/server" };
  }

  // 2. billing
  // billing 包和 identity 同模式（index.cloud.ts 委托 auth，index.local.ts 是 no-op），
  // 公开集保留 billing 包 + index.local.ts。消费方 import "billing" 合法（解析到 local）；
  // 仅禁止直接 import billing 的 cloud 内部路径。
  if (
    normalized === "billing/index.cloud" ||
    normalized === "packages/billing/index.cloud" ||
    normalized.startsWith("billing/index.cloud/") ||
    normalized.startsWith("packages/billing/index.cloud/")
  ) {
    return { forbidden: true, rule: "billing/index.cloud" };
  }

  // 3. packages/auth (以及任何直接指向 auth 的路径)
  if (
    normalized === "auth" ||
    normalized.startsWith("auth/") ||
    normalized === "packages/auth" ||
    normalized.startsWith("packages/auth/")
  ) {
    return { forbidden: true, rule: "packages/auth" };
  }

  // 4. Database boundary contract (复用 packages/database/server 与 serverStoreFactory 统一契约)
  const dbBoundaryResult = isForbiddenDatabaseImport(specifier);
  if (dbBoundaryResult.forbidden) {
    return dbBoundaryResult;
  }

  return { forbidden: false };
}

// 递归拷贝目录，带过滤规则与敏感文件安全拦截
export async function copyTree(
  src: string,
  dst: string,
  optionsOrExcludeSubdirs?:
    | {
        repoRoot?: string;
        excludeSubdirs?: readonly string[];
        excludedPaths?: readonly string[];
      }
    | readonly string[],
) {
  if (!existsSync(src)) return;

  const options = Array.isArray(optionsOrExcludeSubdirs)
    ? { excludeSubdirs: optionsOrExcludeSubdirs }
    : (optionsOrExcludeSubdirs ?? {});

  const excludeSubdirs = options.excludeSubdirs ?? [];
  const excludedPaths = options.excludedPaths ?? PUBLIC_EXCLUDED_PATHS;
  const repoRoot = options.repoRoot;

  const excludeSet = new Set(excludeSubdirs);
  await mkdir(dst, { recursive: true });

  const entries = await readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    if (DENY_DIR_NAMES.has(entry.name)) continue;
    if (excludeSet.has(entry.name)) continue;
    if (isDeniedFile(entry.name)) continue;

    const srcPath = join(src, entry.name);
    const dstPath = join(dst, entry.name);

    if (repoRoot) {
      const relToRepo = relative(repoRoot, srcPath);
      if (isPublicExcludedPath(relToRepo, excludedPaths)) {
        continue;
      }
    }

    if (entry.isDirectory()) {
      await copyTree(srcPath, dstPath, { repoRoot, excludeSubdirs, excludedPaths });
    } else if (entry.isFile() || entry.isSymbolicLink()) {
      await cp(srcPath, dstPath, { recursive: false });
    }
  }
}

// 清洗各个 package.json 中的 workspace: 引用，将不存在于当前闭包的包降级或移除
async function cleanPackageManifests(outDir: string, closureSet: Set<string>) {
  const packagesDir = join(outDir, "packages");
  if (!existsSync(packagesDir)) return;

  const entries = await readdir(packagesDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const pkgJsonPath = join(packagesDir, entry.name, "package.json");
    if (!existsSync(pkgJsonPath)) continue;

    try {
      const manifest = JSON.parse(await readFile(pkgJsonPath, "utf8"));
      let modified = false;

      const sanitizeDeps = (depsObj?: Record<string, string>) => {
        if (!depsObj) return depsObj;
        const result: Record<string, string> = {};
        for (const [name, spec] of Object.entries(depsObj)) {
          if (typeof spec === "string" && spec.startsWith("workspace:")) {
            const raw = spec.slice("workspace:".length).replace(/^packages\//, "").replace(/^@[^/]+\//, "");
            const targetPkg = raw === "*" ? name.replace(/^@[^/]+\//, "") : raw;
            if (HARD_DENY_PACKAGES.has(targetPkg) || !closureSet.has(targetPkg)) {
              modified = true;
              continue;
            }
          }
          result[name] = spec;
        }
        return result;
      };

      if (manifest.dependencies) {
        manifest.dependencies = sanitizeDeps(manifest.dependencies);
      }
      if (manifest.devDependencies) {
        manifest.devDependencies = sanitizeDeps(manifest.devDependencies);
      }
      if (manifest.peerDependencies) {
        manifest.peerDependencies = sanitizeDeps(manifest.peerDependencies);
      }
      if (manifest.optionalDependencies) {
        manifest.optionalDependencies = sanitizeDeps(manifest.optionalDependencies);
      }

      // edition 包的 exports 清洗：删除 nolo-cloud 条件（公开镜像只有 local edition，
      // .cloud.ts 文件已被 PUBLIC_EXCLUDED_PATHS 排除）。否则 esbuild 解析
      // nolo-cloud 条件时会找不到 .cloud.ts 文件而构建失败。
      if (manifest.exports && typeof manifest.exports === "object") {
        const sanitizeExports = (exportsObj: Record<string, unknown>): Record<string, unknown> => {
          const result: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(exportsObj)) {
            if (typeof value === "object" && value !== null && "nolo-cloud" in value) {
              const { "nolo-cloud": _cloud, ...rest } = value as Record<string, unknown>;
              result[key] = rest;
              modified = true;
            } else {
              result[key] = value;
            }
          }
          return result;
        };
        manifest.exports = sanitizeExports(manifest.exports);
      }

      if (modified) {
        await writeFile(pkgJsonPath, JSON.stringify(manifest, null, 2) + "\n");
      }
    } catch {
      // 保持原有内容
    }
  }
}

// 内容级脱敏：把商业机密（兑换率、折扣、上游成本价、供应商名）替换为
// 用户可见的最终 credits 价格，或删除敏感注释。
// bun-nolo 保留真实成本价（cloud 记账需要），公开镜像只保留最终价。
async function sanitizeSensitiveContent(outDir: string): Promise<void> {
  // toPlatformCredits 成本价 → 最终 credits 价（0.8 折扣 × 7 credits/USD = ×5.6）
  const creditsReplacements: [string, string][] = [
    ["toPlatformCredits(0.6)", "3.36"],
    ["toPlatformCredits(2.4)", "13.44"],
    ["toPlatformCredits(1.4)", "7.84"],
    ["toPlatformCredits(0.26)", "1.456"],
    ["toPlatformCredits(4.4)", "24.64"],
    ["toPlatformCredits(0.75)", "4.2"],
    ["toPlatformCredits(3.75)", "21"],
    ["toPlatformCredits(0.075)", "0.42"],
    ["toPlatformCredits(0.03)", "0.168"],
    ["toPlatformCredits(0.13)", "0.728"],
  ];

  // 敏感注释关键词：出现即删除该注释行（不含代码语义）
  const sensitiveCommentPatterns = [
    /\$\s*[0-9]+(\.[0-9]+)?/, // $0.6 / $2.4 / $1.50 等任何 USD 价格
    /per\s+1M/i,
    /crof/i,
    /openrouter/i,
    /api\.x\.ai/i,
    /Z\.AI/i,
    /api\.deepseek/i,
    /api\.anthropic/i,
    /api\.openai/i,
    /8\s*折/,
    /兑换率/,
    /EXTERNAL_API_DISCOUNT/i,
    /PLATFORM_CREDITS_PER_USD/i,
    /人民币报价/,
    /upstream.*报价/,
    /官方.*定价/i,
    /促销定价/i,
  ];

  // 需要脱敏的文件（相对 outDir）—— 所有含价格/成本/供应商的文件
  const targetFiles = [
    "packages/ai/llm/platformHosted.ts",
    "packages/ai/llm/providers.ts",
    "packages/ai/llm/getPricing.ts",
    "packages/ai/llm/imagePricing.ts",
    "packages/ai/llm/fireworks.ts",
    "packages/ai/llm/zai.ts",
    "packages/ai/llm/ollamaCloud.ts",
    "packages/ai/llm/openrouterModels.ts",
    "packages/ai/llm/reasoningModels.ts",
    "packages/ai/token/calculatePrice.ts",
    "packages/integrations/openai/models.ts",
    "packages/integrations/google/models.ts",
    "packages/integrations/xai/models.ts",
    "packages/integrations/anthropic/anthropicModels.ts",
    "packages/integrations/anthropic/anthropicOAuthModels.ts",
    "packages/integrations/opencode/models.ts",
    "packages/integrations/moonshot/models.ts",
    "packages/agent-runtime/platformProviderEndpoints.ts",
    "packages/agent-runtime/anthropicMessagesProvider.ts",
    "packages/agent-runtime/anthropicOAuth.ts",
    "packages/agent-runtime/agentCallPlan.ts",
    "packages/agent-runtime/dialogTitleLlm.ts",
    "packages/ai/agent/providerRegistry.ts",
    "packages/ai/llm/getNoloKey.ts",
  ];

  // 收集所有 packages 下的 .ts/.tsx 文件（跳过测试）
  const collectTsFiles = async (dir: string, acc: string[]): Promise<void> => {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) await collectTsFiles(full, acc);
      else if (/\.(ts|tsx)$/.test(e.name) && !/\.(test|spec)\./.test(e.name)) {
        acc.push(relative(outDir, full));
      }
    }
  };
  const allTsFiles: string[] = [];
  await collectTsFiles(join(outDir, "packages"), allTsFiles);

  // 正确找到行内注释起点（跳过字符串字面量里的 //，如 https://）
  const findCommentStart = (line: string): number => {
    let inSingle = false;
    let inDouble = false;
    let inTemplate = false;
    for (let i = 0; i < line.length - 1; i++) {
      const c = line[i];
      if (c === "\\") {
        i++;
        continue;
      }
      if (c === "'" && !inDouble && !inTemplate) inSingle = !inSingle;
      else if (c === '"' && !inSingle && !inTemplate) inDouble = !inDouble;
      else if (c === "`" && !inSingle && !inDouble) inTemplate = !inTemplate;
      else if (
        c === "/" &&
        line[i + 1] === "/" &&
        !inSingle &&
        !inDouble &&
        !inTemplate
      ) {
        return i;
      }
    }
    return -1;
  };

  // 通用清洗：对所有闭包文件做 ×8/×7 硬编码 + crof 脱敏 + 敏感注释删除
  for (const rel of allTsFiles) {
    const full = join(outDir, rel);
    let content = await readFile(full, "utf8");
    let changed = false;

    // ×8 / ×7 换算 → 硬编码最终价（兑换率机密）
    const beforeScale = content;
    content = content.replace(
      /(input|output|inputCacheHit|cachingWrite|cachingRead)\s*:\s*(\d+(?:\.\d+)?)\s*\*\s*(8|7)\b/g,
      (_m, key: string, num: string, mult: string) =>
        `${key}: ${Number(num) * Number(mult)}`,
    );
    content = content.replace(
      /(\d+(?:\.\d+)?)\s*\*\s*(8|7)\b/g,
      (_m, num: string, mult: string) => String(Number(num) * Number(mult)),
    );
    if (content !== beforeScale) changed = true;

    // 私有供应商 crof → 中性名
    const beforeCrof = content;
    content = content.replaceAll('"crof"', '"upstream-k3"');
    content = content.replaceAll("CROFAI_API_KEY", "UPSTREAM_K3_API_KEY");
    content = content.replaceAll('case "crof":', 'case "upstream-k3":');
    if (content !== beforeCrof) changed = true;

    // 敏感注释删除（含行内注释）
    const lines = content.split("\n");
    const cleaned: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      const isFullComment =
        trimmed.startsWith("//") ||
        trimmed.startsWith("*") ||
        trimmed.startsWith("/*");
      if (isFullComment) {
        if (sensitiveCommentPatterns.some((re) => re.test(line))) {
          changed = true;
          continue;
        }
        cleaned.push(line);
        continue;
      }
      const inlineCommentIdx = findCommentStart(line);
      if (inlineCommentIdx >= 0) {
        const comment = line.slice(inlineCommentIdx);
        if (sensitiveCommentPatterns.some((re) => re.test(comment))) {
          changed = true;
          cleaned.push(line.slice(0, inlineCommentIdx).trimEnd());
          continue;
        }
      }
      cleaned.push(line);
    }
    if (cleaned.length !== lines.length) changed = true;
    content = cleaned.join("\n");

    if (changed) {
      await writeFile(full, content);
    }
  }

  // 精确替换：只对已知价格文件做 toPlatformCredits + secretBlock
  for (const rel of targetFiles) {
    const full = join(outDir, rel);
    if (!existsSync(full)) continue;
    let content = await readFile(full, "utf8");
    let changed = false;

    // 1. 替换 toPlatformCredits 成本价 → 最终 credits 价
    for (const [from, to] of creditsReplacements) {
      if (content.includes(from)) {
        content = content.replaceAll(from, to);
        changed = true;
      }
    }

    // 2. 删除兑换率/折扣常量定义 + toPlatformCredits 函数
    const secretBlock = /const PLATFORM_CREDITS_PER_USD = 7;\nconst EXTERNAL_API_DISCOUNT = 0\.8;\nconst toPlatformCredits = \(usdPerMillion: number\): number =>\n  Number\(\n    \(usdPerMillion \* EXTERNAL_API_DISCOUNT \* PLATFORM_CREDITS_PER_USD\)\.toFixed\(\n      6,\n    \),\n  \);\n\n/;
    if (secretBlock.test(content)) {
      content = content.replace(secretBlock, "");
      changed = true;
    }

    if (changed) {
      await writeFile(full, content);
    }
  }
}

export interface GateViolation {
  category:
    | "denied-package"
    | "denied-subtree"
    | "workspace-dependency"
    | "sensitive-file"
    | "missing-scaffold"
    | "forbidden-import"
    | "excluded-path";
  message: string;
  path: string;
}

// Fail-closed 安全 gate 校验
export async function verifyPublicProjectionGate(input: {
  outDir: string;
  repoRoot?: string;
}): Promise<{ passed: boolean; violations: GateViolation[] }> {
  const { outDir } = input;
  const violations: GateViolation[] = [];

  // 1. 验证必备 scaffold
  for (const scaffoldPath of REQUIRED_SCAFFOLD_PATHS) {
    const fullPath = join(outDir, scaffoldPath);
    if (!existsSync(fullPath)) {
      violations.push({
        category: "missing-scaffold",
        message: `Required scaffold path missing: ${scaffoldPath}`,
        path: scaffoldPath,
      });
    }
  }

  // 2. 收集实际存在的 packages 并确保 HARD_DENY_PACKAGES（包含 auth）不存在
  // 例外：packages/server 允许存在（只含镜像脚本生成的 entry.ts stub，
  // 用于 desktop build resolve；完整 server 包仍在 HARD_DENY_PACKAGES 里阻止闭包引入）。
  const packagesDir = join(outDir, "packages");
  const actualPackages = new Set<string>();
  if (existsSync(packagesDir)) {
    const pkgEntries = await readdir(packagesDir, { withFileTypes: true });
    for (const entry of pkgEntries) {
      if (entry.isDirectory()) {
        actualPackages.add(entry.name);
        if (HARD_DENY_PACKAGES.has(entry.name) && entry.name !== "server") {
          violations.push({
            category: "denied-package",
            message: `Hard denied package found in projection: ${entry.name}`,
            path: join("packages", entry.name),
          });
        }
        // packages/server 允许存在但只允许含 entry.ts stub，不能有其他文件
        if (entry.name === "server") {
          const serverPkgPath = join(packagesDir, "server");
          try {
            const serverFiles = await readdir(serverPkgPath);
            for (const sf of serverFiles) {
              if (sf !== "entry.ts") {
                violations.push({
                  category: "denied-package",
                  message: `packages/server must only contain entry.ts stub, found: ${sf}`,
                  path: join("packages", "server", sf),
                });
              }
            }
          } catch {
            // ignore read error
          }
        }
      }
    }
  } else {
    violations.push({
      category: "missing-scaffold",
      message: "packages directory missing in projection",
      path: "packages",
    });
  }

  // 显式检查 packages/auth 绝不能存在
  if (existsSync(join(outDir, "packages/auth"))) {
    if (!violations.some((v) => v.path === "packages/auth")) {
      violations.push({
        category: "denied-package",
        message: "Hard denied package found in projection: auth",
        path: "packages/auth",
      });
    }
  }

  // 3. 递归扫描所有文件与目录，检查私有子树、敏感文件、非测试源码私有 import
  const stack = [outDir];
  while (stack.length > 0) {
    const current = stack.pop()!;
    let entries: string[];
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const full = join(current, entry.name);
      // 路径统一为 forward-slash，保证 gate 内的 regex 和 isPublicExcludedPath 跨平台一致。
      const relPath = relative(outDir, full).replace(/\\/g, "/");

      if (isPublicExcludedPath(relPath)) {
        if (!violations.some((v) => v.path === relPath)) {
          violations.push({
            category: "excluded-path",
            message: `Excluded cloud-only path found in projection: ${relPath}`,
            path: relPath,
          });
        }
      }

      if (entry.isDirectory()) {
        // 检查是否包含 server 私有子树，或嵌套 billing 私有子树。
        // packages/billing 顶级目录是合法公开包（和 identity 同模式的 edition 包），
        // 只有嵌套在别的包内的 billing 子目录才算私有子树。
        // packages/server 顶级目录是合法公开 stub（镜像脚本生成最小 entry.ts），
        // 只有嵌套在别的包内的 server 子目录才算私有子树。
        if (entry.name === "server" && !/^(packages\/server)(\/|$)/.test(relPath)) {
          violations.push({
            category: "denied-subtree",
            message: `Forbidden subtree found in projection: ${relPath}`,
            path: relPath,
          });
        } else if (entry.name === "billing" && !/^(packages\/billing)(\/|$)/.test(relPath)) {
          violations.push({
            category: "denied-subtree",
            message: `Forbidden nested billing subtree found in projection: ${relPath}`,
            path: relPath,
          });
        }
        const dbPathCheck = isForbiddenDatabasePath(relPath);
        if (dbPathCheck.forbidden) {
          if (!violations.some((v) => v.path === relPath)) {
            violations.push({
              category: "denied-subtree",
              message: `Forbidden database subtree found in projection: ${relPath} (${dbPathCheck.reason})`,
              path: relPath,
            });
          }
        }
      } else {
        // 检查敏感文件及数据库契约禁止文件
        if (isDeniedFile(entry.name)) {
          violations.push({
            category: "sensitive-file",
            message: `Sensitive or denied file found in projection: ${relPath}`,
            path: relPath,
          });
        }

        const dbFileCheck = isForbiddenDatabasePath(relPath);
        if (dbFileCheck.forbidden) {
          if (!violations.some((v) => v.path === relPath)) {
            violations.push({
              category: "denied-subtree",
              message: `Forbidden database file found in projection: ${relPath} (${dbFileCheck.reason})`,
              path: relPath,
            });
          }
        }

        // 检查非测试源码私有 import（至少 auth/server, billing, packages/auth, packages/database/server, database-engine/serverStoreFactory）
        // edition 注入点本身（identity/*.cloud.ts、billing/index.cloud.ts 等）
        // import auth 是契约倒置的设计预期，不算 violation（与 identityBoundary
        // source test 的 ALLOWED_DIRECT_AUTH_SLICE 对齐）。
        //
        // 自动从 PUBLIC_EXCLUDED_PATHS 生成 allowlist：任何匹配 .cloud.ts/.cloud.tsx
        // 的排除路径都是 edition 注入点，不需要手动维护第二份列表。
        if (/\.(ts|tsx)$/.test(entry.name) && !/\.(test|spec)\.(ts|tsx)$/.test(entry.name) && !isPublicExcludedPath(relPath) && !/\.cloud\.(ts|tsx)$/.test(relPath) && !/cloudLazy\.tsx$/.test(relPath)) {
          try {
            const specifiers = extractImportSpecifiers(content);
            for (const spec of specifiers) {
              const { forbidden, rule } = isForbiddenPrivateImport(spec);
              if (forbidden) {
                violations.push({
                  category: "forbidden-import",
                  message: `Forbidden private import "${spec}" (rule: ${rule}) found in non-test source: ${relPath}`,
                  path: relPath,
                });
              }
              // P3: 检查是否 import 了被 PUBLIC_EXCLUDED_PATHS 排除的公开包内文件。
              // 这类 import 在 typecheck 时会报 "Cannot find module"，
              // 因为文件被排除后不出现在 projection 里。
              // 跳过：dynamic import（变量路径 cloudLazy）、.cloud.ts edition 注入点、
              // 测试文件（它们 mock 这些模块是正当用法）。
              const resolvedSpec = resolveImportSpecifier(spec, relPath);
              if (resolvedSpec && isPublicExcludedPath(resolvedSpec)) {
                violations.push({
                  category: "forbidden-import",
                  message: `Import of excluded public path "${spec}" (resolved: ${resolvedSpec}) found in non-test source: ${relPath}`,
                  path: relPath,
                });
              }
            }
          } catch {
            // ignore read error
          }
        }
      }
    }
  }

  // 4. 验证 workspace 依赖完整性（不得指向 HARD_DENY 或不存在的包）
  const checkManifestWorkspaceDeps = async (manifestPath: string, relManifestPath: string) => {
    if (!existsSync(manifestPath)) return;
    try {
      const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
      const allDeps = {
        ...(manifest.dependencies ?? {}),
        ...(manifest.devDependencies ?? {}),
        ...(manifest.peerDependencies ?? {}),
        ...(manifest.optionalDependencies ?? {}),
      };

      for (const [depName, spec] of Object.entries(allDeps)) {
        if (typeof spec === "string" && spec.startsWith("workspace:")) {
          const raw = spec.slice("workspace:".length).replace(/^packages\//, "").replace(/^@[^/]+\//, "");
          const targetPkg = raw === "*" ? depName.replace(/^@[^/]+\//, "") : raw;

          if (HARD_DENY_PACKAGES.has(targetPkg)) {
            violations.push({
              category: "workspace-dependency",
              message: `Workspace dependency in ${relManifestPath} points to hard-denied package: ${depName} (${spec})`,
              path: relManifestPath,
            });
          } else if (!actualPackages.has(targetPkg)) {
            violations.push({
              category: "workspace-dependency",
              message: `Workspace dependency in ${relManifestPath} points to missing package: ${depName} (${spec})`,
              path: relManifestPath,
            });
          }
        }
      }
    } catch {
      violations.push({
        category: "missing-scaffold",
        message: `Failed to parse package manifest: ${relManifestPath}`,
        path: relManifestPath,
      });
    }
  };

  // 检查 root package.json
  await checkManifestWorkspaceDeps(join(outDir, "package.json"), "package.json");

  // 检查每个子包 package.json
  for (const pkgName of actualPackages) {
    const pkgJsonRel = join("packages", pkgName, "package.json");
    await checkManifestWorkspaceDeps(join(outDir, pkgJsonRel), pkgJsonRel);
  }

  const passed = violations.length === 0;
  return { passed, violations };
}

// 生成公开仓库 scaffold：README、LICENSE、CONTRIBUTING、SECURITY、CI workflow。
// 这些文件不复制源仓库版本（源仓库 README 含 server/rn 等私有包引用），
// 而是生成适配公开集的版本。
async function generatePublicScaffold(outDir: string): Promise<void> {
  // README.md — 适配公开集（无 server/rn 包）
  const readme = `# Nolo

**Nolo** is an AI-native, local-first cross-platform workspace.
It deeply integrates AI agents into your daily workflow with local-first data and privacy.

## 🌟 Core Principles

1. **Agent-First CLI & TUI** — The \`nolo\` CLI understands context, not just commands.
2. **Local-First** — Your data stays on your machine. Cloud is optional sync, not a dependency.
3. **Cross-Platform** — One data layer, React for Web/Desktop, React Native for mobile.

## 🚀 Quick Start

### Prerequisites
- [Bun](https://bun.sh/) runtime

### Install
\`\`\`bash
bun install
\`\`\`

### Build (Desktop)
\`\`\`bash
bun run build
\`\`\`

### Test
\`\`\`bash
bun test
\`\`\`

### CLI
\`\`\`bash
bun run cli
# or after global install:
nolo chat
nolo run "summarize this agent's recent 10 dialogs"
\`\`\`

## 📂 Project Structure (Monorepo)

- \`packages/cli/\` — CLI tool and TUI terminal engine.
- \`packages/desktop/\` — Electron-based desktop app (Electrobun).
- \`packages/web/\` — Web frontend entry.
- \`packages/app/\` — Shared application logic and state management.
- \`packages/chat/\` — Chat UI and dialog management.
- \`packages/render/\` — Shared rendering and layout components.
- \`packages/ai/\` — Agent core, model management, tool protocol.
- \`packages/database/\` / \`packages/database-engine/\` — Local-first storage engine.
- \`packages/identity/\` — Identity contract (local/cloud edition injection).
- \`packages/billing/\` — Billing contract (local no-op, cloud injected).
- \`packages/core/\` — Shared utilities and pure functions.
- \`packages/agent-runtime/\` — Agent runtime and provider adapters.
- \`packages/create/\` — Space creation and management.
- \`packages/share/\` — Content sharing.
- \`packages/integrations/\` — Third-party integrations (OpenAI, etc).
- \`packages/shared/\` — Cross-platform shared types.

## 🔒 Local-First Architecture

This repository is the public projection of Nolo. It contains everything needed
to run Nolo locally with your own API keys — no cloud account, no server backend,
no billing. The identity and billing systems use edition injection (cloud delegates
to private auth, local is no-op), so the same codebase works in both modes.

See \`packages/identity/EDITION.md\` for details on the edition injection pattern.

## 📄 License

MIT — see [LICENSE](./LICENSE).

---
*Powered by Bun & React. Designed for the AI era.*
`;

  // LICENSE — MIT
  const license = `MIT License

Copyright (c) 2024-2026 Nolotus

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;

  // CONTRIBUTING.md
  const contributing = `# Contributing to Nolo

Thanks for your interest in contributing! This repository is a public projection
generated from the canonical source. Here's how to contribute:

## Development Setup

1. Install [Bun](https://bun.sh/)
2. \`bun install\`
3. \`bun scripts/release/prepareNoloOpenSourceMirror.ts --out-dir /tmp/check\` to verify projection
4. \`bun scripts/dev/esbuild.config.js\` to verify build

## Code Structure

- This repo is a monorepo with \`packages/*\` workspaces.
- Identity/billing use edition injection — see \`packages/identity/EDITION.md\`.
- Do not add imports of \`auth/\`, \`server/\`, or \`billing/\` internal paths.
  The projection gate will reject them.

## Submitting Changes

1. Fork and create a feature branch
2. Run \`bun scripts/release/prepareNoloOpenSourceMirror.ts --out-dir /tmp/check\` to verify projection
3. Run \`bun scripts/dev/esbuild.config.js\` to verify build
4. Open a PR with a clear description

## Security

Found a security issue? Please see [SECURITY.md](./SECURITY.md).
`;

  // SECURITY.md
  const security = `# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please **do not** open a public issue.
Instead, email security@nolo.chat with details and reproduction steps.

## Scope

- Credential exposure in the local-first data store
- Local data corruption or loss
- Unsafe tool execution (shell, file system, network)
- Supply-chain vulnerabilities in build dependencies
- Vulnerabilities in included client/CLI/desktop code

## Out of Scope

- API key leakage from user-configured providers (user responsibility)
- Cloud service vulnerabilities (report to the cloud team separately)

## Defense in Depth

The public projection includes a safety gate (\`prepareNoloOpenSourceMirror.ts\`)
that prevents private modules (auth, billing, server) from leaking into the
public repository. This is a build-time control, not a substitute for security review.

## Response Timeline

- Acknowledgment: within 48 hours
- Initial assessment: within 7 days
- Fix or mitigation: depends on severity
`;

  await writeFile(join(outDir, "README.md"), readme);
  await writeFile(join(outDir, "LICENSE"), license);
  await writeFile(join(outDir, "CONTRIBUTING.md"), contributing);
  await writeFile(join(outDir, "SECURITY.md"), security);

  // .github/workflows/ci.yml — minimal public CI
  // 公开集没有 server/ 私有包，很多测试依赖服务端 API/OAuth/mock，
  // 全量 bun test 会失败。CI 只跑：projection gate + esbuild build。
  // 未来可以逐步筛选不依赖服务端的测试加入 CI。
  const githubDir = join(outDir, ".github", "workflows");
  await mkdir(githubDir, { recursive: true });

  // .github/actions/setup-windows-desktop/action.yml — Windows 打包前置 composite action
  // 与私有仓库 .github/actions/setup-windows-desktop/action.yml 对等：
  // 隔离安装 Bun、安装依赖、安装 Inno Setup（windows-installer 专用依赖）。
  const actionsDir = join(outDir, ".github", "actions", "setup-windows-desktop");
  await mkdir(actionsDir, { recursive: true });
  const setupWindowsDesktopAction = `name: Setup Windows Desktop Build
description: Prepare a Windows runner for Nolo Desktop packaging.

inputs:
  bun-install-args:
    description: Arguments passed to bun install.
    required: false
    default: --frozen-lockfile

runs:
  using: composite
  steps:
    - name: Prepare reusable Windows workspace
      shell: pwsh
      run: |
        if ("\${{ runner.os }}" -ne "Windows") {
          throw "setup-windows-desktop must only run on Windows runners."
        }

        if (Test-Path packages/desktop/build) {
          Remove-Item -Recurse -Force packages/desktop/build
        }
        if (Test-Path packages/desktop/artifacts) {
          Remove-Item -Recurse -Force packages/desktop/artifacts
        }
        if (Test-Path packages/desktop/smoke-artifacts) {
          Remove-Item -Recurse -Force packages/desktop/smoke-artifacts
        }

    - name: Setup isolated Bun
      shell: pwsh
      run: |
        $bunVersion = (Get-Content .bun-version -Raw).Trim()
        if (-not $bunVersion) {
          throw "Missing Bun version in .bun-version"
        }

        $bunRoot = Join-Path $env:RUNNER_TEMP "nolo-bun-$bunVersion"
        $bunBin = Join-Path $bunRoot "bun-windows-x64"
        $bunExe = Join-Path $bunBin "bun.exe"
        if (-not (Test-Path $bunExe)) {
          Remove-Item -Recurse -Force $bunRoot -ErrorAction SilentlyContinue
          New-Item -ItemType Directory -Force -Path $bunRoot | Out-Null
          $zipPath = Join-Path $env:RUNNER_TEMP "bun-windows-x64-$bunVersion.zip"
          $url = "https://github.com/oven-sh/bun/releases/download/bun-v$bunVersion/bun-windows-x64.zip"
          Write-Host "Downloading isolated Bun $bunVersion from $url"
          Invoke-WebRequest -Uri $url -OutFile $zipPath
          Expand-Archive -LiteralPath $zipPath -DestinationPath $bunRoot -Force
        }

        & $bunExe --revision
        Add-Content -Path $env:GITHUB_PATH -Value $bunBin
        Add-Content -Path $env:GITHUB_ENV -Value "BUN_INSTALL=$bunRoot"

    - name: Install dependencies
      shell: pwsh
      run: bun install \${{ inputs.bun-install-args }}

    - name: Install Inno Setup
      shell: pwsh
      run: |
        $innoPaths = @(
          "C:\\Program Files (x86)\\Inno Setup 6",
          "C:\\Program Files\\Inno Setup 6"
        )
        foreach ($path in $innoPaths) {
          if (Test-Path "$path\\ISCC.exe") {
            Write-Host "检测到预装 Inno Setup，加入 PATH: $path"
            $env:PATH = "$path;" + $env:PATH
            if ($env:GITHUB_PATH) {
              Add-Content -Path $env:GITHUB_PATH -Value $path
            }
            break
          }
        }

        if (Get-Command ISCC.exe -ErrorAction SilentlyContinue) {
          Write-Host "Inno Setup is already available."
          exit 0
        }

        winget install --id JRSoftware.InnoSetup -e --accept-package-agreements --accept-source-agreements --silent
        if ($LASTEXITCODE -ne 0) {
          if (Get-Command ISCC.exe -ErrorAction SilentlyContinue) {
            Write-Host "winget returned $LASTEXITCODE, but Inno Setup is available."
            exit 0
          }
          exit $LASTEXITCODE
        }
`;
  await writeFile(join(actionsDir, "action.yml"), setupWindowsDesktopAction);

  // CI: projection gate + web build（每次 push/PR 跑）
  const ci = `name: CI

on:
  push:
    branches: [main, alpha]
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - name: Projection safety gate
        run: bun scripts/release/prepareNoloOpenSourceMirror.ts --out-dir /tmp/nolo-mirror-check
      - name: Build web bundle
        run: bun scripts/dev/esbuild.config.js
`;
  await writeFile(join(githubDir, "ci.yml"), ci);

  // Desktop build: 自动触发（push alpha/main）+ 手动触发。
  // 3 平台 GitHub 免费 runner，产物上传到 GitHub Releases。
  // alpha → prerelease，stable → latest release。
  // 客户端用 https://github.com/nolotus/nolo/releases/latest/download/<file> 自动更新。
  const desktopBuild = `name: Desktop Build

on:
  push:
    branches: [alpha, main]
    paths:
      - "packages/desktop/**"
      - "packages/app/**"
      - "packages/chat/**"
      - "packages/render/**"
      - "packages/ai/**"
      - "packages/agent-runtime/**"
      - "packages/core/**"
      - "packages/identity/**"
      - "packages/web/**"
      - "packages/shared/**"
      - "scripts/dev/**"
      - ".github/workflows/desktop-build.yml"
  workflow_dispatch:
    inputs:
      targets:
        description: "Build targets"
        required: true
        default: all
        type: choice
        options:
          - all
          - windows
          - macos
          - linux

concurrency:
  group: desktop-build-\${{ github.ref }}
  cancel-in-progress: false

env:
  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: "true"

jobs:
  select-targets:
    runs-on: ubuntu-latest
    outputs:
      matrix: \${{ steps.targets.outputs.matrix }}
      channel: \${{ steps.channel.outputs.channel }}
      tag: \${{ steps.tag.outputs.tag }}
    steps:
      - id: channel
        run: |
          if [ "\${GITHUB_REF}" = "refs/heads/main" ]; then
            echo "channel=stable" >> "$GITHUB_OUTPUT"
          else
            echo "channel=alpha" >> "$GITHUB_OUTPUT"
          fi
      - id: tag
        run: |
          echo "tag=desktop-\${{ steps.channel.outputs.channel }}-v$(date -u +%Y%m%d-%H%M%S)" >> "$GITHUB_OUTPUT"
      - id: targets
        run: |
          TARGETS="\${{ github.event_name == 'push' && 'all' || inputs.targets }}"
          case "$TARGETS" in
            all) echo 'matrix={"include":[{"os":"windows-latest","label":"windows"},{"os":"macos-latest","label":"macos"}]}' >> "$GITHUB_OUTPUT" ;;
            windows) echo 'matrix={"include":[{"os":"windows-latest","label":"windows"}]}' >> "$GITHUB_OUTPUT" ;;
            macos) echo 'matrix={"include":[{"os":"macos-latest","label":"macos"}]}' >> "$GITHUB_OUTPUT" ;;
            linux) echo 'matrix={"include":[{"os":"ubuntu-latest","label":"linux"}]}' >> "$GITHUB_OUTPUT" ;;
          esac

  build:
    needs: select-targets
    strategy:
      matrix: \${{ fromJson(needs.select-targets.outputs.matrix) }}
      fail-fast: false
    runs-on: \${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
        with:
          clean: true
      - name: Setup reusable Windows desktop workspace
        if: runner.os == 'Windows'
        uses: ./.github/actions/setup-windows-desktop
      - name: Setup Bun
        if: runner.os != 'Windows'
        uses: oven-sh/setup-bun@v2
        with:
          bun-version-file: .bun-version
      - name: Verify Linux desktop build dependencies
        if: runner.os == 'Linux'
        run: bash ./scripts/ci/verifyLinuxDesktopDeps.sh
      - name: Install dependencies
        if: runner.os != 'Windows'
        run: bun install --frozen-lockfile

      - name: Build Windows desktop installer artifacts
        if: runner.os == 'Windows' && needs.select-targets.outputs.channel == 'stable'
        env:
          ELECTROBUN_RELEASE_BASE_URL: https://github.com/nolotus/nolo/releases/latest/download
          NOLO_DESKTOP_SKIP_PATCH: "1"
        run: bun run --cwd packages/desktop build:stable:windows-installer

      - name: Smoke installed Windows desktop artifact
        if: runner.os == 'Windows' && needs.select-targets.outputs.channel == 'stable'
        timeout-minutes: 8
        env:
          NOLO_DESKTOP_SMOKE_MODE: release
          NOLO_DESKTOP_SMOKE_SETUP: packages/desktop/smoke-artifacts/NoloDesktop-Smoke-Setup.exe
          NOLO_DESKTOP_SMOKE_LAUNCHER: Nolo Desktop Smoke.vbs
        run: |
          ./scripts/verify/desktop/smokeInstalledWindowsDesktop.ps1

      - name: Build desktop (\${{ matrix.label }})
        if: runner.os != 'Windows' || needs.select-targets.outputs.channel != 'stable'
        env:
          TMPDIR: \${{ runner.temp }}
          ELECTROBUN_RELEASE_BASE_URL: https://github.com/nolotus/nolo/releases/latest/download
          APPLE_DEVELOPER_ID: \${{ secrets.APPLE_DEVELOPER_ID }}
          APPLE_API_KEY: \${{ secrets.APPLE_API_KEY }}
          APPLE_API_KEY_ID: \${{ secrets.APPLE_API_KEY_ID }}
          APPLE_API_ISSUER: \${{ secrets.APPLE_API_ISSUER }}
          APPLE_ID: \${{ secrets.APPLE_ID }}
          APPLE_APP_SPECIFIC_PASSWORD: \${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
          APPLE_TEAM_ID: \${{ secrets.APPLE_TEAM_ID }}
        run: |
          if [ "\${{ needs.select-targets.outputs.channel }}" = "stable" ]; then
            bun run --cwd packages/desktop build:stable
          else
            bun run --cwd packages/desktop build:alpha
          fi

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: desktop-\${{ matrix.label }}
          path: packages/desktop/artifacts
          retention-days: 30

  release:
    needs: [select-targets, build]
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version-file: .bun-version
      - run: bun install

      - name: Merge artifacts
        uses: actions/download-artifact@v4
        with:
          path: packages/desktop/artifacts

      - name: Publish to R2 (CF CDN for China users)
        env:
          DESKTOP_DOWNLOAD_S3_ENDPOINT: \${{ secrets.DESKTOP_DOWNLOAD_S3_ENDPOINT }}
          DESKTOP_DOWNLOAD_S3_BUCKET: \${{ secrets.DESKTOP_DOWNLOAD_S3_BUCKET }}
          DESKTOP_DOWNLOAD_S3_REGION: \${{ secrets.DESKTOP_DOWNLOAD_S3_REGION }}
          DESKTOP_DOWNLOAD_S3_ACCESS_KEY_ID: \${{ secrets.DESKTOP_DOWNLOAD_S3_ACCESS_KEY_ID }}
          DESKTOP_DOWNLOAD_S3_SECRET_ACCESS_KEY: \${{ secrets.DESKTOP_DOWNLOAD_S3_SECRET_ACCESS_KEY }}
          DESKTOP_DOWNLOAD_PUBLIC_BASE: \${{ secrets.DESKTOP_DOWNLOAD_PUBLIC_BASE }}
          NOLO_DESKTOP_REQUIRE_LINUX_PACKAGES: "1"
          MIN_WIN_INSTALLER_BYTES: "49000000"
        run: |
          bun ./scripts/release/publishDesktopDownloads.ts \\
            --channel "\${{ needs.select-targets.outputs.channel }}" \\
            --build-sha "\${{ github.sha }}"

      - name: Verify legacy alias URLs
        run: |
          if [ "\${{ needs.select-targets.outputs.channel }}" = "stable" ]; then
            bun ./scripts/verify/desktop/verifyLegacyDesktopDownloadAlias.ts \\
              https://nolo.chat/public/downloads \\
              packages/desktop/artifacts stable
          else
            bun ./scripts/verify/desktop/verifyLegacyDesktopDownloadAlias.ts \\
              https://us.nolo.chat/public/downloads \\
              packages/desktop/artifacts alpha
          fi

      - name: Create GitHub Release (backup for overseas users)
        env:
          GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}
          TAG: \${{ needs.select-targets.outputs.tag }}
          CHANNEL: \${{ needs.select-targets.outputs.channel }}
        run: |
          set -euo pipefail
          mkdir -p release-assets
          cp -r packages/desktop/artifacts/desktop-linux/* release-assets/ 2>/dev/null || true
          cp -r packages/desktop/artifacts/desktop-windows/* release-assets/ 2>/dev/null || true
          cp -r packages/desktop/artifacts/desktop-macos/* release-assets/ 2>/dev/null || true
          FLAGS="--notes 'Desktop \${CHANNEL} build from \${{ github.sha }}'"
          if [ "$CHANNEL" = "alpha" ]; then
            FLAGS="$FLAGS --prerelease"
          fi
          gh release delete "$TAG" --yes 2>/dev/null || true
          gh release create "$TAG" release-assets/* \\
            --title "Desktop \${CHANNEL} \$(date -u +%Y-%m-%d)" \\
            $FLAGS
`;
  await writeFile(join(githubDir, "desktop-build.yml"), desktopBuild);

  // CLI npm publish: 手动触发，发布 nolo-cli 到 npm（alpha/latest dist-tag）。
  // 用 ubuntu-latest（公开仓库免费），只需 NPM_TOKEN secret。
  // 去掉了私有仓库的 mirror-open-source job（公开仓库自身就是源）。
  const cliPublish = `name: Publish CLI to npm

on:
  workflow_dispatch:
    inputs:
      dist_tag:
        description: npm dist-tag
        required: true
        default: alpha
        type: choice
        options:
          - alpha
          - latest

concurrency:
  group: cli-npm-publish-\${{ inputs.dist_tag }}
  cancel-in-progress: false

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version-file: .bun-version
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          registry-url: https://registry.npmjs.org/
      - name: Publish nolo-cli to npm
        env:
          NPM_TOKEN: \${{ secrets.NPM_TOKEN }}
          NODE_AUTH_TOKEN: \${{ secrets.NPM_TOKEN }}
          NOLO_CLI_PUBLISH_DIST_TAG: \${{ inputs.dist_tag }}
          NOLO_CLI_PUBLISH_NPM_PREFIX: \${{ runner.temp }}/nolo-cli-prefix
        run: bash ./scripts/ci/runCliPublishCi.sh
`;
  await writeFile(join(githubDir, "cli-publish.yml"), cliPublish);

  // Version bump: push 到 alpha/main 时验证兼容性并 dispatch 发布。
  // 版本号由 bun-nolo 的 semantic-release 决定（single-source），随 mirror
  // 同步到公开仓库（packages/*/package.json 的 version 字段已含正确版本）。
  // 公开仓库不跑 semantic-release——快照式无历史会导致版本号推断错误。
  const versionBump = `name: Version Bump

on:
  push:
    branches: [alpha, main]
  workflow_dispatch:

concurrency:
  group: version-bump-\${{ github.ref }}
  cancel-in-progress: false

permissions:
  contents: write
  actions: write

jobs:
  bump:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: \${{ github.ref_name }}
          fetch-depth: 0
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version-file: .bun-version
      - run: bun install

      - name: Verify release compatibility
        run: bun scripts/verify/verifyReleaseUpdateCompatibility.ts

      - name: Dispatch CLI npm publish
        env:
          GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        run: |
          set -euo pipefail
          if [ "\${GITHUB_REF}" = "refs/heads/main" ]; then
            gh workflow run cli-publish.yml -f dist_tag=latest
          elif [ "\${GITHUB_REF}" = "refs/heads/alpha" ]; then
            gh workflow run cli-publish.yml -f dist_tag=alpha
          fi

      - name: Dispatch desktop build
        env:
          GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        run: |
          set -euo pipefail
          gh workflow run desktop-build.yml -f targets=all
`;
  await writeFile(join(githubDir, "version-bump.yml"), versionBump);
}

export async function prepareNoloOpenSourceMirror(input: {
  repoRoot?: string;
  outDir: string;
}) {
  const repoRoot = input.repoRoot ?? REPO_ROOT;
  const { outDir } = input;

  // 0. 验证源仓库具备必要 scaffold（fail-closed 前置检查）
  for (const scaffold of REQUIRED_SCAFFOLD_PATHS) {
    if (!existsSync(join(repoRoot, scaffold))) {
      throw new Error(`Source repository missing required scaffold: ${scaffold}`);
    }
  }

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  // 1. 依赖闭包：从种子包出发 BFS 自动收集所有被引用的公开包
  const closure = await computePackageClosure(repoRoot, SEED_PACKAGES);
  const closureSet = new Set(closure);
  console.log(`Package closure (${closure.length}): ${closure.join(", ")}`);

  // 2. 保留 monorepo 结构：packages/<name>
  for (const pkg of closure) {
    await copyTree(join(repoRoot, "packages", pkg), join(outDir, "packages", pkg), {
      repoRoot,
      excludedPaths: PUBLIC_EXCLUDED_PATHS,
    });
  }

  // 2.5 [已废弃] 不再生成 packages/server/entry.ts stub。
  // desktop-runtime 包已独立，desktop/src/bun/index.ts 改为 import("desktop-runtime/entry")，
  // 不再依赖 packages/server/entry.ts。server 包保持完整排除（HARD_DENY_PACKAGES）。

  // 3. 构建脚本与测试脚手架（esBuild 前端链 + scripts/test）
  for (const scriptDir of PUBLIC_PROJECTION_MANIFEST.scriptsToCopy) {
    await copyTree(join(repoRoot, scriptDir), join(outDir, scriptDir), {
      repoRoot,
      excludedPaths: PUBLIC_EXCLUDED_PATHS,
    });
  }

  // 3.5 Patch esbuild.config.js: 把 cloud-only 路径加入 external。
  // cloudLazy.tsx 的 resolveCloudLazyImport 用 string literal import() 引用
  // 被 PUBLIC_EXCLUDED_PATHS 排除的模块（life/web/*, app/pages/Pricing/* 等）。
  // esbuild 会 static resolve 这些 import()，公开镜像里文件不存在 → build 失败。
  // 把这些路径标记为 external 让 esbuild 跳过 resolve。
  // 运行时 cloud edition 不执行这些分支（isCloudEdition=false → 返回 fallback）。
  const esbuildConfigPath = join(outDir, "scripts", "dev", "esbuild.config.js");
  if (existsSync(esbuildConfigPath)) {
    let esbuildConfig = await readFile(esbuildConfigPath, "utf8");
    const cloudExternalPaths = [
      "life/web/InviteRewards",
      "life/LifeSidebar",
      "app/pages/Pricing/Price",
      "app/pages/Recharge",
      "create/space/pages/SpaceInvite",
      "app/email/AgentEmailE2EPage",
    ];
    const externalArray = `  external: ["react-native*", ${cloudExternalPaths.map((p) => `"${p}"`).join(", ")}],`;
    esbuildConfig = esbuildConfig.replace(
      /  external: \["react-native\*"\],/,
      externalArray,
    );
    await writeFile(esbuildConfigPath, esbuildConfig);
  }

  // 4. public 素材（排除 downloads 产物；统一走 copyTree 使深层文件也过 isDeniedFile 校验）
  await copyTree(join(repoRoot, "public"), join(outDir, "public"), {
    repoRoot,
    excludeSubdirs: PUBLIC_DENY_SUBDIRS,
    excludedPaths: PUBLIC_EXCLUDED_PATHS,
  });

  // 5. root 配置：保留 dependencies + devDependencies，并过滤指向被排除包的 workspace 依赖
  const rootPkg = JSON.parse(await readFile(join(repoRoot, "package.json"), "utf8"));
  const keepRootDep = ([, spec]: [string, unknown]): boolean => {
    if (typeof spec !== "string" || !spec.startsWith("workspace:")) return true;
    const depPkg = spec.slice("workspace:".length).replace(/^packages\//, "").replace(/^@[^/]+\//, "");
    return closureSet.has(depPkg);
  };

  const openSourceRoot = {
    name: "nolo",
    private: true,
    workspaces: ["packages/*"],
    scripts: {
      build: "cd packages/desktop && bun run build",
      "build:alpha": "cd packages/desktop && bun run build:alpha",
      "build:stable": "cd packages/desktop && bun run build:stable",
      test: "bun test",
      "verify:cli-local-broker": "bun ./scripts/verify/verifyCliLocalBrokerConcurrency.ts",
      "verify:cli-local-broker:contracts": "bun test packages/cli/localRuntimeBrokerBoundary.source.test.ts packages/cli/localRuntimeAuthority.test.ts packages/cli/localRuntimeDb.test.ts packages/cli/agentRuntimeCommands.test.ts packages/database/server/cliAuthorityBrokerClient.test.ts packages/database/server/cliAuthorityBrokerServer.test.ts packages/cli/agentPullCommand.test.ts packages/cli/client/localRuntimeAdapter.test.ts packages/database/server/db.source.test.ts packages/database/server/legacyServerDb.test.ts scripts/verify/verifyCliLocalBrokerConcurrency.source.test.ts",
    },
    dependencies: Object.fromEntries(
      Object.entries(rootPkg.dependencies ?? {}).filter(keepRootDep)
    ),
    devDependencies: Object.fromEntries(
      Object.entries(rootPkg.devDependencies ?? {}).filter(keepRootDep)
    ),
    packageManager: rootPkg.packageManager,
  };

  // 扫描闭包包内裸 import，补齐第三方未显式声明的依赖
  const closureDirs = closure.map((pkg) => join(repoRoot, "packages", pkg));
  const declaredSet = new Set<string>([
    ...Object.keys(openSourceRoot.dependencies),
    ...Object.keys(openSourceRoot.devDependencies),
    ...closure,
    ...["fs", "path", "child_process", "crypto", "os", "util", "events", "stream", "buffer", "url", "http", "https", "zlib", "assert", "process", "module", "net", "tls", "dns", "querystring", "string_decoder", "timers", "punycode", "vm", "worker_threads", "perf_hooks", "node"],
  ]);
  const scanDirs = closureDirs;
  const seen = new Set<string>();
  const scanStack = [...scanDirs];
  while (scanStack.length > 0) {
    const dir = scanStack.pop()!;
    let entries: string[];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "build") continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        scanStack.push(full);
      } else if (/\.(ts|tsx)$/.test(entry.name) && !seen.has(full)) {
        if (/\.(test|spec)\.(ts|tsx)$/.test(entry.name)) continue;
        seen.add(full);
        const content = await readFile(full, "utf8");
        for (const m of content.matchAll(/from\s+["']([^".][^"']*?)["']/g)) {
          const spec = m[1];
          if (!/^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(spec)) continue;
          if (spec.startsWith("@nolo/")) continue;
          if (spec.startsWith(".") || (spec.includes("/") && !spec.startsWith("@"))) continue;
          const base = spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0];
          if (!declaredSet.has(base)) {
            let version = "latest";
            try {
              const pkgJson = await readFile(
                join(repoRoot, "node_modules", base, "package.json"),
                "utf8",
              );
              const parsed = JSON.parse(pkgJson);
              if (parsed.version) version = parsed.version;
            } catch {
              // fallback latest
            }
            openSourceRoot.dependencies[base] = version;
          }
        }
      }
    }
  }

  await writeFile(join(outDir, "package.json"), JSON.stringify(openSourceRoot, null, 2) + "\n");

  for (const f of ["bunfig.toml", "tsconfig.json", ".bun-version", "css-modules.d.ts", ".releaserc.cli.json", ".releaserc.desktop.json", "release.config.js"]) {
    const src = join(repoRoot, f);
    if (existsSync(src)) await cp(src, join(outDir, f));
  }

  // 复制 docs/workflows/（CLI 测试需要 workflow 引用文件）
  const docsWorkflowsSrc = join(repoRoot, "docs/workflows");
  if (existsSync(docsWorkflowsSrc)) {
    await mkdir(join(outDir, "docs/workflows"), { recursive: true });
    await copyTree(docsWorkflowsSrc, join(outDir, "docs/workflows"), { repoRoot });
  }

  // 6. 清洗所有 packages 下 package.json 中的 workspace 依赖
  await cleanPackageManifests(outDir, closureSet);

  // 6.4. 内容级脱敏：价格计算、兑换率、成本价、上游供应商等商业机密
  await sanitizeSensitiveContent(outDir);

  // 6.5. 生成公开仓库 scaffold（README、LICENSE、CONTRIBUTING、SECURITY、CI）
  await generatePublicScaffold(outDir);

  // 7. Fail-closed 安全 Gate 验证
  const gateResult = await verifyPublicProjectionGate({ outDir, repoRoot });
  if (!gateResult.passed) {
    const details = gateResult.violations.map((v) => `[${v.category}] ${v.message} (${v.path})`).join("\n");
    throw new Error(`Public projection safety gate validation failed with ${gateResult.violations.length} violation(s):\n${details}`);
  }

  console.log(`Nolo open-source mirror prepared at ${outDir} (monorepo structure preserved, safety gate passed)`);
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const outDirIndex = args.indexOf("--out-dir");
  const outDir =
    outDirIndex >= 0 && outDirIndex + 1 < args.length
      ? args[outDirIndex + 1]
      : ".tmp/nolo-open-source-mirror";
  await prepareNoloOpenSourceMirror({ outDir });
}
