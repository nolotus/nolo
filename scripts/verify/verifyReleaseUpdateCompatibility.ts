/** Static release/update compatibility gate. It never publishes or contacts npm/S3. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getCliInstallChannel, buildNpmSelfUpdateCommand } from "../../packages/cli/updateCommands";

export type ReleaseCompatibilityInputs = {
  cliVersion: string;
  declaredCliVersion: string | undefined;
  cliDownloads: string;
  cliUpdateCommands: string;
  desktopAlpha: string;
  desktopStable: string;
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

  // Desktop workflow checks: 公开仓库用 desktop-build.yml（GitHub Releases + R2），
  // 私有仓库用 desktop-alpha.yml + desktop-release.yml（纯 S3/SSH）。
  // 判断依据：是否引用 GitHub Releases URL。
  const isPublicRepo =
    input.desktopAlpha.includes("github.com/nolotus/nolo/releases") ||
    input.desktopStable.includes("github.com/nolotus/nolo/releases");

  if (!isPublicRepo) {
    for (const [name, workflow, channel, base] of [
      ["desktop alpha", input.desktopAlpha, "--channel alpha", "https://us.nolo.chat/public/downloads"],
      ["desktop stable", input.desktopStable, "--channel stable", "https://nolo.chat/public/downloads"],
    ] as const) {
      if (!workflow.includes(channel)) fail(`${name} publisher channel missing: ${channel}`);
      if (!workflow.includes(base)) fail(`${name} download base missing: ${base}`);
      if (!workflow.includes("legacy alias")) fail(`${name} legacy alias verification missing`);
    }
  } else {
    // 公开仓库：验证 GitHub Releases URL 存在
    if (!input.desktopAlpha.includes("github.com/nolotus/nolo/releases")) {
      fail("desktop build workflow must reference GitHub Releases URL");
    }
  }

  if (!isPublicRepo) {
    // 私有仓库（bun-nolo）：version-bump 跑 semantic-release 决定版本号
    if (!input.versionBump.includes("NOLO_RELEASE_CONFIG: cli")) fail("unified workflow no longer runs CLI semantic-release");
    if (!input.versionBump.includes("NOLO_RELEASE_CONFIG: desktop")) fail("unified workflow no longer runs Desktop semantic-release");
  } else {
    // 公开仓库：版本号从 bun-nolo 同步，不跑 semantic-release（快照式无历史）
    if (input.versionBump.includes("semantic-release")) {
      fail("public repo version-bump must not run semantic-release (version single-sourced from bun-nolo)");
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
  // 公开仓库用 desktop-build.yml（统一 workflow），私有仓库用 desktop-alpha.yml + desktop-release.yml
  const desktopAlpha = readOrEmpty(".github/workflows/desktop-alpha.yml") || readOrEmpty(".github/workflows/desktop-build.yml");
  const desktopStable = readOrEmpty(".github/workflows/desktop-release.yml") || readOrEmpty(".github/workflows/desktop-build.yml");
  validateReleaseUpdateCompatibility({
    cliVersion: cliPackage.version?.trim() ?? "",
    declaredCliVersion: cliDownloads.match(/NOLO_CLI_VERSION\s*=\s*["']([^"']+)["']/)?.[1],
    cliDownloads,
    cliUpdateCommands: read("packages/cli/updateCommands.ts"),
    desktopAlpha,
    desktopStable,
    versionBump: read(".github/workflows/version-bump.yml"),
  });
  console.log(`[release-compat] ok: CLI ${cliPackage.version}, alpha/latest CLI channels, desktop alpha/stable channels`);
}
