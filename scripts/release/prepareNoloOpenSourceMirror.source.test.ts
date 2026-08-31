import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  DENY_DIR_NAMES,
  DENYLIST_FILE_GLOB,
  HARD_DENY_PACKAGES,
  PUBLIC_EXCLUDED_PATHS,
  PUBLIC_PROJECTION_MANIFEST,
  REQUIRED_SCAFFOLD_PATHS,
  SEED_PACKAGES,
  computePackageClosure,
  copyTree,
  extractImportSpecifiers,
  isDeniedFile,
  isForbiddenPrivateImport,
  isPublicExcludedPath,
  prepareNoloOpenSourceMirror,
  resolveImportSpecifier,
  verifyPublicProjectionGate,
} from "./prepareNoloOpenSourceMirror";

const REPO_ROOT = join(import.meta.dir, "../..");

describe("prepareNoloOpenSourceMirror public projection manifest & constants", () => {
  test("derives the public npm dist-tag from projected SemVer instead of the public branch", () => {
    const source = readFileSync(join(REPO_ROOT, "scripts/release/prepareNoloOpenSourceMirror.ts"), "utf8");
    const versionBumpSource = source.slice(source.indexOf("const versionBump ="));
    expect(versionBumpSource).toContain("branches: [main]");
    expect(versionBumpSource).toContain("version.includes('-') ? 'alpha' : 'latest'");
    expect(versionBumpSource).toContain('gh workflow run cli-publish.yml -f dist_tag="$CLI_DIST_TAG"');
    expect(versionBumpSource).not.toContain('if [ "\\${GITHUB_REF}" = "refs/heads/main" ]');
  });

  test("gates public desktop build dispatch on desktop version changes", () => {
    const source = readFileSync(join(REPO_ROOT, "scripts/release/prepareNoloOpenSourceMirror.ts"), "utf8");
    const versionBumpSource = source.slice(source.indexOf("const versionBump ="));
    expect(versionBumpSource).toContain("Decide whether desktop build is needed");
    expect(versionBumpSource).toContain("packages/desktop/package.json");
    expect(versionBumpSource).toContain("if: steps.desktop.outputs.build == 'true'");
    expect(versionBumpSource).toContain('EVENT_NAME: \\${{ github.event_name }}');
    expect(versionBumpSource).toContain('0000000000000000000000000000000000000000');
    expect(versionBumpSource).toContain('git rev-parse --verify --quiet "\\$BEFORE_SHA^{commit}"');
  });

  test("adds a post-publish npm install health check to the public CLI workflow", () => {
    const source = readFileSync(join(REPO_ROOT, "scripts/release/prepareNoloOpenSourceMirror.ts"), "utf8");
    const cliPublishSource = source.slice(source.indexOf("const cliPublish ="));
    expect(cliPublishSource).toContain("npm-install-health:");
    expect(cliPublishSource).toContain("windows-latest");
    expect(cliPublishSource).toContain("node: 26");
    expect(cliPublishSource).toContain('npm install -g "nolo-cli@');
    expect(cliPublishSource).toContain("nolo --version");
    expect(cliPublishSource).toContain("nolo doctor");
  });

  test("keeps the manifest-less desktop Chrome connector in the package closure", async () => {
    expect(await computePackageClosure(REPO_ROOT)).toContain("desktop-chrome-connector");
  });

  test("exports explicit public projection manifest and deny constants", () => {
    expect(PUBLIC_PROJECTION_MANIFEST).toBeDefined();
    expect(PUBLIC_PROJECTION_MANIFEST.seedPackages).toBe(SEED_PACKAGES);
    expect(PUBLIC_PROJECTION_MANIFEST.scriptsToCopy).toEqual(["scripts/dev", "scripts/test", "scripts/release", "scripts/verify", "scripts/ci", "scripts/helpers"]);
    expect(PUBLIC_PROJECTION_MANIFEST.requiredScaffoldPaths).toBe(REQUIRED_SCAFFOLD_PATHS);
    expect(PUBLIC_PROJECTION_MANIFEST.excludedPaths).toBe(PUBLIC_EXCLUDED_PATHS);

    // 1) auth must NOT be in SEED_PACKAGES
    expect((SEED_PACKAGES as readonly string[]).includes("auth")).toBe(false);

    // 5) database and database-engine MUST be preserved in SEED_PACKAGES
    expect((SEED_PACKAGES as readonly string[]).includes("database")).toBe(true);
    expect((SEED_PACKAGES as readonly string[]).includes("database-engine")).toBe(true);
    expect((SEED_PACKAGES as readonly string[]).includes("desktop-chrome-connector")).toBe(true);

    // 2) HARD_DENY_PACKAGES must contain auth, server, etc.
    // billing 不在此列 —— 它和 identity 同模式（index.cloud.ts 委托 auth，
    // index.local.ts 是 no-op），公开集保留 billing 包 + index.local.ts。
    for (const deniedPkg of [
      "auth",
      "server",
      "daemon",
      "nolo-ci",
      "leveldb",
      "remotion-demo",
      "game",
      "rn",
      "cli-darwin-arm64",
    ]) {
      expect(HARD_DENY_PACKAGES.has(deniedPkg)).toBe(true);
    }
    // billing 移出 HARD_DENY
    expect(HARD_DENY_PACKAGES.has("billing")).toBe(false);

    // DENY_DIR_NAMES must contain server & billing subtrees
    expect(DENY_DIR_NAMES.has("server")).toBe(true);
    expect(DENY_DIR_NAMES.has("billing")).toBe(true);

    // PUBLIC_EXCLUDED_PATHS must contain all specified cloud-only UI & admin categories
    const excluded = new Set<string>(PUBLIC_EXCLUDED_PATHS);

    // 1. Pricing
    expect(excluded.has("packages/app/pages/Pricing")).toBe(true);
    expect(excluded.has("packages/app/pages/Pricing.tsx")).toBe(true);

    // 2. Recharge
    expect(excluded.has("packages/app/pages/Recharge.tsx")).toBe(true);
    expect(excluded.has("packages/life/web/RechargeRecord.tsx")).toBe(true);
    expect(excluded.has("packages/life/web/RechargeModal.tsx")).toBe(true);

    // 3. Usage
    expect(excluded.has("packages/app/pages/widgets/UsageWidget.tsx")).toBe(false);
    expect(excluded.has("packages/app/pages/widgets/UsageWidget.css")).toBe(false);
    expect(excluded.has("packages/life/web/Usage.tsx")).toBe(true);
    expect(excluded.has("packages/life/web/UsageChart.tsx")).toBe(true);
    expect(excluded.has("packages/life/web/UsageBarChart.tsx")).toBe(true);
    expect(excluded.has("packages/life/web/UsageRecord.tsx")).toBe(true);

    // 4. Admin
    expect(excluded.has("packages/app/admin")).toBe(true);
    expect(excluded.has("packages/app/pages/ProviderHealthAdmin.tsx")).toBe(true);
    expect(excluded.has("packages/app/pages/ProviderHealthAdmin.css")).toBe(true);

    // 5. EmailAdmin
    expect(excluded.has("packages/app/pages/EmailAdmin.tsx")).toBe(true);
    expect(excluded.has("packages/app/pages/EmailAdmin.css")).toBe(true);
    expect(excluded.has("packages/app/email/AgentEmailE2EPage.tsx")).toBe(true);

    // 6. User management / Invite
    expect(excluded.has("packages/life/web/InviteRewards.tsx")).toBe(true);
    expect(excluded.has("packages/create/space/pages/SpaceInvite.tsx")).toBe(false);
    expect(excluded.has("packages/create/space/components/InviteModal.tsx")).toBe(false);
    expect(excluded.has("packages/create/space/pages/SpaceMembers.tsx")).toBe(false);
    expect(excluded.has("packages/auth/web/UsersPage.tsx")).toBe(true);
    expect(excluded.has("packages/auth/invite.ts")).toBe(true);

    // 7. auth web / cloud-only pages
    expect(excluded.has("packages/auth/web")).toBe(true);
    // lab/date LoginPage/PaymentPromptPage/authGuard 已恢复公开（auth 依赖已迁移到 identity 契约）
  });

  test("isPublicExcludedPath accurately matches cloud-only UI paths and preserves Desktop/CLI/identity/database local", () => {
    // Cloud-only UI & Admin paths must be excluded
    const excludedSamples = [
      "packages/app/pages/Pricing/Price.tsx",
      "packages/app/pages/Pricing/Price.css",
      "packages/app/pages/Pricing.tsx",
      "packages/app/pages/Recharge.tsx",
      "packages/life/web/RechargeRecord.tsx",
      "packages/life/web/RechargeModal.tsx",
      "packages/life/web/Usage.tsx",
      "packages/life/web/UsageChart.tsx",
      "packages/life/web/UsageBarChart.tsx",
      "packages/life/web/UsageRecord.tsx",
      "packages/app/admin/AdminRoute.tsx",
      "packages/app/admin/adminPages.ts",
      "packages/app/pages/ProviderHealthAdmin.tsx",
      "packages/app/pages/EmailAdmin.tsx",
      "packages/app/pages/EmailAdmin.css",
      "packages/app/email/AgentEmailE2EPage.tsx",
      "packages/life/web/InviteRewards.tsx",
      "packages/auth/web/UsersPage.tsx",
      "packages/auth/web/Login.tsx",
    ];

    for (const p of excludedSamples) {
      expect(isPublicExcludedPath(p)).toBe(true);
      // Normalized relative path without packages/ prefix should also match
      const relWithoutPackages = p.replace(/^packages\//, "");
      expect(isPublicExcludedPath(relWithoutPackages)).toBe(true);
    }

    // Regular Desktop / CLI / identity / database local / core app files MUST NOT be excluded
    const preservedSamples = [
      "packages/desktop/src/main.ts",
      "packages/desktop/package.json",
      "packages/cli/src/index.ts",
      "packages/cli/package.json",
      "packages/identity/src/keys.ts",
      "packages/identity/package.json",
      "packages/database/authority/deviceLocal.ts",
      "packages/database/authority/deviceLocal.test.ts",
      "packages/database/userDataLoadDecision.ts",
      "packages/database/package.json",
      "packages/database-engine/index.ts",
      "packages/database-engine/package.json",
      "packages/app/pages/Home.tsx",
      "packages/app/pages/ChatPage.tsx",
      "packages/app/pages/DocPage.tsx",
      "packages/app/settings/prepareUserSetting.ts",
      "packages/chat/ChatPanel.tsx",
      "packages/shared/index.ts",
      "packages/web/entry.tsx",
      "packages/core/index.ts",
      "packages/agent-runtime/index.ts",
    ];

    for (const p of preservedSamples) {
      expect(isPublicExcludedPath(p)).toBe(false);
      const relWithoutPackages = p.replace(/^packages\//, "");
      expect(isPublicExcludedPath(relWithoutPackages)).toBe(false);
    }
  });

  test("copyTree applies exclusion manifest, omitting cloud-only paths while preserving Desktop/CLI/identity/database local", async () => {
    const mockRepoRoot = join(REPO_ROOT, ".tmp/mock-repo-exclusion-test");
    const mockOutDir = join(REPO_ROOT, ".tmp/mock-out-exclusion-test");
    await rm(mockRepoRoot, { recursive: true, force: true });
    await rm(mockOutDir, { recursive: true, force: true });

    // Construct mock directory structure
    const filesToCreate = [
      // Cloud-only UI & admin to be excluded
      "packages/app/pages/Pricing/Price.tsx",
      "packages/app/pages/Pricing/Price.css",
      "packages/app/pages/Recharge.tsx",
      "packages/app/admin/AdminRoute.tsx",
      "packages/app/pages/EmailAdmin.tsx",
      "packages/life/web/InviteRewards.tsx",
      "packages/life/web/UsageBarChart.tsx",

      // Normal Desktop/CLI/identity/database local to be preserved
      "packages/desktop/src/main.ts",
      "packages/desktop/package.json",
      "packages/cli/src/index.ts",
      "packages/identity/src/keys.ts",
      "packages/database/authority/deviceLocal.ts",
      "packages/database/userDataLoadDecision.ts",
      "packages/database-engine/index.ts",
      "packages/app/pages/Home.tsx",
      "packages/app/pages/ChatPage.tsx",
      "packages/lab/date/pages/LoginPage.tsx",
      "packages/app/pages/widgets/UsageWidget.tsx",
      "packages/create/space/pages/SpaceInvite.tsx",
    ];

    for (const rel of filesToCreate) {
      const full = join(mockRepoRoot, rel);
      await mkdir(join(full, ".."), { recursive: true });
      await writeFile(full, `// content of ${rel}`);
    }

    // Run copyTree on packages
    const pkgEntries = ["app", "desktop", "cli", "identity", "database", "database-engine", "life", "create", "lab"];
    for (const pkg of pkgEntries) {
      await copyTree(join(mockRepoRoot, "packages", pkg), join(mockOutDir, "packages", pkg), {
        repoRoot: mockRepoRoot,
        excludedPaths: PUBLIC_EXCLUDED_PATHS,
      });
    }

    // Assert cloud-only excluded files DO NOT exist in mockOutDir
    expect(existsSync(join(mockOutDir, "packages/app/pages/Pricing"))).toBe(false);
    expect(existsSync(join(mockOutDir, "packages/app/pages/Pricing/Price.tsx"))).toBe(false);
    expect(existsSync(join(mockOutDir, "packages/app/pages/Recharge.tsx"))).toBe(false);
    expect(existsSync(join(mockOutDir, "packages/app/admin"))).toBe(false);
    expect(existsSync(join(mockOutDir, "packages/app/admin/AdminRoute.tsx"))).toBe(false);
    expect(existsSync(join(mockOutDir, "packages/app/pages/EmailAdmin.tsx"))).toBe(false);
    expect(existsSync(join(mockOutDir, "packages/life/web/InviteRewards.tsx"))).toBe(false);
    expect(existsSync(join(mockOutDir, "packages/life/web/UsageBarChart.tsx"))).toBe(false);
    // lab/date LoginPage + SpaceInvite 已恢复公开（auth 依赖已迁移）
    expect(existsSync(join(mockOutDir, "packages/lab/date/pages/LoginPage.tsx"))).toBe(true);
    expect(existsSync(join(mockOutDir, "packages/create/space/pages/SpaceInvite.tsx"))).toBe(true);

    // Assert regular Desktop/CLI/identity/database local files ARE preserved in mockOutDir
    expect(existsSync(join(mockOutDir, "packages/desktop/src/main.ts"))).toBe(true);
    expect(existsSync(join(mockOutDir, "packages/desktop/package.json"))).toBe(true);
    expect(existsSync(join(mockOutDir, "packages/cli/src/index.ts"))).toBe(true);
    expect(existsSync(join(mockOutDir, "packages/identity/src/keys.ts"))).toBe(true);
    expect(existsSync(join(mockOutDir, "packages/database/authority/deviceLocal.ts"))).toBe(true);
    expect(existsSync(join(mockOutDir, "packages/database/userDataLoadDecision.ts"))).toBe(true);
    expect(existsSync(join(mockOutDir, "packages/database-engine/index.ts"))).toBe(true);
    expect(existsSync(join(mockOutDir, "packages/app/pages/Home.tsx"))).toBe(true);
    expect(existsSync(join(mockOutDir, "packages/app/pages/ChatPage.tsx"))).toBe(true);

    // Clean up
    await rm(mockRepoRoot, { recursive: true, force: true });
    await rm(mockOutDir, { recursive: true, force: true });
  });

  test("isDeniedFile matches sensitive files and credentials", () => {
    expect(isDeniedFile(".env")).toBe(true);
    expect(isDeniedFile(".env.local")).toBe(true);
    expect(isDeniedFile(".env.production")).toBe(true);
    expect(isDeniedFile(".envrc")).toBe(true);
    // oauthProviders.ts 和 antigravity.ts 不再排除（CLI 构建需要，base64 已拆分）
    expect(isDeniedFile("oauthProviders.ts")).toBe(false);
    expect(isDeniedFile("antigravity.ts")).toBe(false);
    expect(isDeniedFile("cert.pem")).toBe(true);
    expect(isDeniedFile("privkey.key")).toBe(true);
    expect(isDeniedFile("id_rsa.secret")).toBe(true);
    expect(isDeniedFile("my-credentials.json")).toBe(true);
    // serverStoreFactory 不再排除（CLI 构建需要 db.ts，db.ts import serverStoreFactory）
    expect(isDeniedFile("serverStoreFactory.ts")).toBe(false);

    // normal files should not match
    expect(isDeniedFile("index.ts")).toBe(false);
    expect(isDeniedFile("package.json")).toBe(false);
    expect(isDeniedFile("README.md")).toBe(false);
    expect(isDeniedFile("setupDomGlobals.ts")).toBe(false);
    expect(isDeniedFile("db.ts")).toBe(false);
  });

  test("resolveImportSpecifier resolves package-name and relative imports to packages/ paths", () => {
    // Package-name import: "app/pages/Recharge" → "packages/app/pages/Recharge"
    expect(resolveImportSpecifier("app/pages/Recharge", "packages/app/web/routes.tsx"))
      .toBe("packages/app/pages/Recharge");

    // Relative import: "./UsageWidget" from "packages/lab/date/routes.tsx"
    expect(resolveImportSpecifier("./UsageWidget", "packages/lab/date/routes.tsx"))
      .toBe("packages/lab/date/UsageWidget");

    // Relative import with ..: "../admin/adminPages" from "packages/app/pages/ShareImportPage.tsx"
    expect(resolveImportSpecifier("../admin/adminPages", "packages/app/pages/ShareImportPage.tsx"))
      .toBe("packages/app/admin/adminPages");

    // Third-party package: not a packages/ path
    expect(resolveImportSpecifier("react", "packages/app/web/routes.tsx")).toBeNull();
    expect(resolveImportSpecifier("date-fns", "packages/app/web/routes.tsx")).toBeNull();
    expect(resolveImportSpecifier("js-base64", "packages/core/authToken.ts")).toBeNull();

    // Scoped package: not a packages/ path
    expect(resolveImportSpecifier("@nolo/leveldb", "packages/app/web/routes.tsx")).toBeNull();

    // Subpath import of internal package: "core/init" → "packages/core/init"
    expect(resolveImportSpecifier("core/init", "packages/app/pages/ShareImportPage.tsx"))
      .toBe("packages/core/init");

    // Third-party with slash (like "date-fns/format") should not resolve
    // because "date-fns" is not in SEED_PACKAGES
    expect(resolveImportSpecifier("date-fns/format", "packages/app/web/routes.tsx")).toBeNull();
  });

  test("isForbiddenPrivateImport accurately flags private module imports", () => {
    // 4) Forbidden private import checks
    expect(isForbiddenPrivateImport("auth/server").forbidden).toBe(true);
    expect(isForbiddenPrivateImport("auth/server/token").forbidden).toBe(true);
    expect(isForbiddenPrivateImport("packages/auth/server/recharge").forbidden).toBe(true);

    // billing 包和 identity 同模式：消费方 import "billing" 合法（解析到 local no-op），
    // 仅禁止直接 import billing 的 cloud 内部路径（index.cloud 委托 auth/server）。
    expect(isForbiddenPrivateImport("billing").forbidden).toBe(false);
    expect(isForbiddenPrivateImport("billing/index.cloud").forbidden).toBe(true);
    expect(isForbiddenPrivateImport("packages/billing/index.cloud").forbidden).toBe(true);
    expect(isForbiddenPrivateImport("packages/billing").forbidden).toBe(false);

    expect(isForbiddenPrivateImport("packages/auth").forbidden).toBe(true);
    expect(isForbiddenPrivateImport("packages/auth/types").forbidden).toBe(true);
    expect(isForbiddenPrivateImport("auth").forbidden).toBe(true);
    expect(isForbiddenPrivateImport("auth/routes").forbidden).toBe(true);

    expect(isForbiddenPrivateImport("packages/database/server").forbidden).toBe(true);
    expect(isForbiddenPrivateImport("database/server").forbidden).toBe(true);
    expect(isForbiddenPrivateImport("database/server/routes/read").forbidden).toBe(true);

    // serverStoreFactory 不再禁止 import（CLI 构建需要它）
    expect(isForbiddenPrivateImport("database-engine/serverStoreFactory").forbidden).toBe(false);
    expect(isForbiddenPrivateImport("packages/database-engine/serverStoreFactory").forbidden).toBe(false);

    // Public module imports should be allowed
    expect(isForbiddenPrivateImport("database-engine/db").forbidden).toBe(false);
    expect(isForbiddenPrivateImport("database/keys").forbidden).toBe(false);
    expect(isForbiddenPrivateImport("core/clampedInteger").forbidden).toBe(false);
    expect(isForbiddenPrivateImport("desktop/ui").forbidden).toBe(false);
    expect(isForbiddenPrivateImport("react").forbidden).toBe(false);
    expect(isForbiddenPrivateImport("date-fns").forbidden).toBe(false);
  });

  test("extractImportSpecifiers extracts all static, dynamic and require imports", () => {
    const code = `
      import { a } from "auth/server/token";
      import b from 'billing';
      export * from "database/server";
      import("database-engine/serverStoreFactory");
      const c = require("packages/auth");
    `;
    const specifiers = extractImportSpecifiers(code);
    expect(specifiers).toEqual([
      "auth/server/token",
      "billing",
      "database/server",
      "database-engine/serverStoreFactory",
      "packages/auth",
    ]);
  });
});

describe("verifyPublicProjectionGate fail-closed assertions", () => {
  const tmpGateTestDir = join(REPO_ROOT, ".tmp/test-projection-gate-cases");

  const createCleanScaffold = async () => {
    await rm(tmpGateTestDir, { recursive: true, force: true });
    await mkdir(join(tmpGateTestDir, "packages/desktop"), { recursive: true });
    await mkdir(join(tmpGateTestDir, "packages/database"), { recursive: true });
    await mkdir(join(tmpGateTestDir, "scripts/dev"), { recursive: true });
    await mkdir(join(tmpGateTestDir, "scripts/test"), { recursive: true });

    await writeFile(join(tmpGateTestDir, "package.json"), JSON.stringify({ name: "nolo-public" }));
    await writeFile(join(tmpGateTestDir, "bunfig.toml"), "");
    await writeFile(join(tmpGateTestDir, "tsconfig.json"), "{}");
    await writeFile(join(tmpGateTestDir, "scripts/test/setupDomGlobals.ts"), "");
    await writeFile(
      join(tmpGateTestDir, "packages/desktop/package.json"),
      JSON.stringify({ name: "desktop" }),
    );
    await writeFile(
      join(tmpGateTestDir, "packages/database/package.json"),
      JSON.stringify({ name: "database" }),
    );
  };

  test("fails when required scaffold files or directories are missing", async () => {
    await createCleanScaffold();
    await rm(join(tmpGateTestDir, "scripts/test/setupDomGlobals.ts"));

    const result = await verifyPublicProjectionGate({ outDir: tmpGateTestDir });
    expect(result.passed).toBe(false);
    expect(result.violations.some((v) => v.category === "missing-scaffold")).toBe(true);
  });

  test("fails when a hard-denied private package is present (including auth)", async () => {
    await createCleanScaffold();
    await mkdir(join(tmpGateTestDir, "packages/auth"), { recursive: true });
    await writeFile(join(tmpGateTestDir, "packages/auth/package.json"), JSON.stringify({ name: "auth" }));

    const result = await verifyPublicProjectionGate({ outDir: tmpGateTestDir });
    expect(result.passed).toBe(false);
    expect(
      result.violations.some(
        (v) => v.category === "denied-package" && v.path.includes("packages/auth"),
      ),
    ).toBe(true);
  });

  test("fails when a forbidden server or billing subtree is present inside packages", async () => {
    await createCleanScaffold();
    await mkdir(join(tmpGateTestDir, "packages/database/server"), { recursive: true });
    await writeFile(join(tmpGateTestDir, "packages/database/server/db.ts"), "export const db = 1;");

    const result = await verifyPublicProjectionGate({ outDir: tmpGateTestDir });
    expect(result.passed).toBe(false);
    expect(
      result.violations.some(
        (v) => v.category === "denied-subtree" && v.path === "packages/database/server",
      ),
    ).toBe(true);
  });

  test("accepts top-level packages/billing but rejects nested billing subtree", async () => {
    // packages/billing 顶级目录是合法公开包（edition injection 模式）
    await createCleanScaffold();
    await mkdir(join(tmpGateTestDir, "packages/billing"), { recursive: true });
    await writeFile(join(tmpGateTestDir, "packages/billing/index.local.ts"), "export {};");
    let result = await verifyPublicProjectionGate({ outDir: tmpGateTestDir });
    expect(
      result.violations.some((v) => v.path === "packages/billing" && v.category === "denied-subtree"),
    ).toBe(false);

    // 嵌套 billing 子目录（如 packages/server/billing/）是私有子树，必须报错
    await mkdir(join(tmpGateTestDir, "packages/server/billing"), { recursive: true });
    await writeFile(join(tmpGateTestDir, "packages/server/billing/secret.ts"), "export const secret = 1;");
    result = await verifyPublicProjectionGate({ outDir: tmpGateTestDir });
    expect(result.passed).toBe(false);
    expect(
      result.violations.some((v) => v.category === "denied-subtree" && v.path === "packages/server/billing"),
    ).toBe(true);
  });

  test("serverStoreFactory is allowed in public projection (CLI build needs it)", async () => {
    await createCleanScaffold();
    await mkdir(join(tmpGateTestDir, "packages/database-engine"), { recursive: true });
    await writeFile(
      join(tmpGateTestDir, "packages/database-engine/serverStoreFactory.ts"),
      "export function getOrCreateServerStoreRuntime() {}",
    );

    const result = await verifyPublicProjectionGate({ outDir: tmpGateTestDir });
    // serverStoreFactory 不再被禁止：CLI 构建需要 db.ts，db.ts import serverStoreFactory。
    // serverStoreFactory 只依赖 fs/path/level + 同包文件，无 auth/server 依赖。
    expect(
      result.violations.some(
        (v) =>
          v.path === "packages/database-engine/serverStoreFactory.ts" &&
          (v.category === "sensitive-file" || v.category === "denied-subtree"),
      ),
    ).toBe(false);
  });

  test("fails when workspace dependency points to an excluded/denied package", async () => {
    await createCleanScaffold();
    await writeFile(
      join(tmpGateTestDir, "packages/desktop/package.json"),
      JSON.stringify({
        name: "desktop",
        dependencies: {
          auth: "workspace:packages/auth",
        },
      }),
    );

    const result = await verifyPublicProjectionGate({ outDir: tmpGateTestDir });
    expect(result.passed).toBe(false);
    expect(result.violations.some((v) => v.category === "workspace-dependency")).toBe(true);
  });

  test("fails when a sensitive file is detected", async () => {
    await createCleanScaffold();
    await writeFile(join(tmpGateTestDir, "packages/desktop/.env.production"), "SECRET=1");

    const result = await verifyPublicProjectionGate({ outDir: tmpGateTestDir });
    expect(result.passed).toBe(false);
    expect(result.violations.some((v) => v.category === "sensitive-file")).toBe(true);
  });

  test("fails when cloud-only excluded paths are present in projection (e.g. Pricing, Recharge, Usage, Admin, EmailAdmin, Users)", async () => {
    const excludedTestCases = [
      "packages/app/pages/Pricing/Price.tsx",
      "packages/app/pages/Recharge.tsx",
      "packages/app/admin/AdminRoute.tsx",
      "packages/app/pages/EmailAdmin.tsx",
      "packages/life/web/InviteRewards.tsx",
    ];

    for (const relPath of excludedTestCases) {
      await createCleanScaffold();
      const full = join(tmpGateTestDir, relPath);
      await mkdir(join(full, ".."), { recursive: true });
      await writeFile(full, "export const x = 1;");

      const result = await verifyPublicProjectionGate({ outDir: tmpGateTestDir });
      expect(result.passed).toBe(false);
      expect(
        result.violations.some(
          (v) => v.category === "excluded-path" && v.path === relPath,
        ),
      ).toBe(true);
    }
  });

  test("fails when non-test source imports auth/server, billing/index.cloud, packages/auth, or database/server", async () => {
    const forbiddenImports = [
      'import { readOptionalPrincipal } from "auth/server/token";',
      'import { chargeTokenUsageWithLedger } from "billing/index.cloud";',
      'import { useAuth } from "packages/auth";',
      'import { db } from "database/server";',
    ];

    for (const statement of forbiddenImports) {
      await createCleanScaffold();
      await writeFile(join(tmpGateTestDir, "packages/desktop/source.ts"), statement);

      const result = await verifyPublicProjectionGate({ outDir: tmpGateTestDir });
      expect(result.passed).toBe(false);
      expect(
        result.violations.some(
          (v) => v.category === "forbidden-import" && v.path === "packages/desktop/source.ts",
        ),
      ).toBe(true);
    }
  });

  test("billing package import is allowed (edition injection contract)", async () => {
    // import "billing" 合法 —— 公开集解析到 index.local.ts (no-op)
    await createCleanScaffold();
    await writeFile(join(tmpGateTestDir, "packages/desktop/source.ts"), 'import { chargeTokenUsageWithLedger } from "billing";');
    const result = await verifyPublicProjectionGate({ outDir: tmpGateTestDir });
    expect(result.violations.some((v) => v.path === "packages/desktop/source.ts" && v.category === "forbidden-import")).toBe(false);
  });

  test("current source projection passes safety gate (all auth/billing decoupled)", async () => {
    const outDir = join(REPO_ROOT, ".tmp/current-source-projection-pass");
    await rm(outDir, { recursive: true, force: true });
    // Wave 5 完成后，所有 auth/billing import 已迁移到 identity/core 契约，
    // projection gate 应通过。
    await expect(prepareNoloOpenSourceMirror({ repoRoot: REPO_ROOT, outDir })).resolves.toBeUndefined();
    const publicVersionBump = readFileSync(join(outDir, ".github/workflows/version-bump.yml"), "utf8");
    expect(publicVersionBump).toContain("branches: [main]");
    expect(publicVersionBump).toContain("version.includes('-') ? 'alpha' : 'latest'");
    expect(publicVersionBump).toContain('gh workflow run cli-publish.yml -f dist_tag="$CLI_DIST_TAG"');
    await rm(outDir, { recursive: true, force: true });
  });

  test("does not fail for forbidden imports within test files (*.test.ts, *.spec.ts)", async () => {
    await createCleanScaffold();
    await writeFile(
      join(tmpGateTestDir, "packages/desktop/source.test.ts"),
      'import { readOptionalPrincipal } from "auth/server/token";\nimport { chargeTokenUsageWithLedger } from "billing";',
    );

    const result = await verifyPublicProjectionGate({ outDir: tmpGateTestDir });
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });
});
