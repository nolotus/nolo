/** Static release/update compatibility gate. It never publishes or contacts npm/S3. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getCliInstallChannel, buildNpmSelfUpdateCommand } from "../../packages/cli/updateCommands";

export type ReleaseCompatibilityInputs = {
  cliVersion: string;
  declaredCliVersion: string | undefined;
  cliDownloads: string;
  cliUpdateCommands: string;
  versionBump: string;
};

function fail(message: string): never {
  throw new Error(`[release-compat] ${message}`);
}

export function validateReleaseUpdateCompatibility(input: ReleaseCompatibilityInputs): void {
  if (!input.cliVersion || input.cliVersion !== input.declaredCliVersion) {
    fail(`CLI package version (${input.cliVersion || "missing"}) does not match NOLO_CLI_VERSION (${input.declaredCliVersion || "missing"})`);
  }

  if (!input.cliDownloads.includes('export type CliReleaseChannel = "alpha" | "latest"')) {
    fail("CLI release channel type must retain alpha and latest");
  }
  if (!input.cliDownloads.includes("https://us.nolo.chat") || !input.cliDownloads.includes("https://nolo.chat")) {
    fail("CLI installers must retain alpha/stable server origins");
  }

  const alphaCommand = buildNpmSelfUpdateCommand(getCliInstallChannel("https://us.nolo.chat"));
  const stableCommand = buildNpmSelfUpdateCommand(getCliInstallChannel("https://nolo.chat"));
  if (alphaCommand.join(" ") !== "npm install -g nolo-cli@alpha --force --progress") {
    fail(`CLI alpha self-update command changed: ${alphaCommand.join(" ")}`);
  }
  if (stableCommand.join(" ") !== "npm install -g nolo-cli@latest --force --progress") {
    fail(`CLI stable self-update command changed: ${stableCommand.join(" ")}`);
  }
  if (!input.cliUpdateCommands.includes("getCliInstallChannel") || !input.cliUpdateCommands.includes("buildNpmSelfUpdateCommand")) {
    fail("CLI self-update routing functions are missing");
  }

  // Desktop/CLI 发布已迁移到公开镜像仓库 nolotus/nolo。
  // 本 verify 脚本在 bun-nolo（私有）与 nolo（公开）两侧都会运行，两侧 version-bump
  // 的职责不同，需按仓库类型自适应：
  //   - 私有(bun-nolo)：version-bump 跑 semantic-release 决定版本号（单源），
  //     不再 dispatch 已删除的发布 workflow（cli-npm-publish / desktop-alpha / desktop-release）。
  //   - 公开(nolo)：版本号从 bun-nolo 快照同步而来，version-bump 不跑 semantic-release，
  //     只 dispatch cli-publish / desktop-build 完成免费发布。
  const isPublicMirror = !input.versionBump.includes("NOLO_RELEASE_CONFIG");

  if (isPublicMirror) {
    // 公开镜像：版本号单源自 bun-nolo，不得跑 semantic-release。
    if (input.versionBump.includes("semantic-release")) {
      fail("public repo version-bump must not run semantic-release (version single-sourced from bun-nolo)");
    }
    if (input.versionBump.includes("NOLO_RELEASE_CONFIG")) {
      fail("public repo version-bump must not run component semantic-release passes");
    }
  } else {
    // 私有仓库：版本号单源在此，须同时跑 CLI 与 desktop 的 semantic-release。
    if (!input.versionBump.includes("NOLO_RELEASE_CONFIG: cli")) fail("unified workflow no longer runs CLI semantic-release");
    if (!input.versionBump.includes("NOLO_RELEASE_CONFIG: desktop")) fail("unified workflow no longer runs Desktop semantic-release");
    // 版本号在 bun-nolo 单源，nolo 快照不跑 semantic-release；私有仓不得再 dispatch
    // 已删除的发布 workflow（已迁移到 nolo）。
    if (input.versionBump.includes("gh workflow run cli-npm-publish.yml")) {
      fail("private version-bump must no longer dispatch removed cli-npm-publish workflow");
    }
    if (input.versionBump.includes("gh workflow run desktop-release.yml") || input.versionBump.includes("gh workflow run desktop-alpha.yml")) {
      fail("private version-bump must no longer dispatch removed desktop workflows (desktop publishes from nolo mirror)");
    }
  }
}

if (import.meta.main) {
  const root = resolve(import.meta.dir, "../..");
  const read = (path: string) => readFileSync(resolve(root, path), "utf8");
  const readOrEmpty = (path: string) => {
    try { return readFileSync(resolve(root, path), "utf8"); } catch { return ""; }
  };
  const cliPackage = JSON.parse(read("packages/cli/package.json")) as { version?: string };
  const cliDownloads = read("packages/app/constants/cliDownloads.ts");
  validateReleaseUpdateCompatibility({
    cliVersion: cliPackage.version?.trim() ?? "",
    declaredCliVersion: cliDownloads.match(/NOLO_CLI_VERSION\s*=\s*["']([^"']+)["']/)?.[1],
    cliDownloads,
    cliUpdateCommands: read("packages/cli/updateCommands.ts"),
    versionBump: read(".github/workflows/version-bump.yml"),
  });
  console.log(`[release-compat] ok: CLI ${cliPackage.version}, alpha/latest CLI channels`);
}
