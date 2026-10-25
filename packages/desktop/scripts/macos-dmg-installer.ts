import { cp, mkdir, readdir, symlink } from "node:fs/promises";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { basename, join } from "node:path";
import { buildMacosDmgInstallerTheme } from "./macos-dmg-theme";
import { getMacosDmgInstallerCopyForBuild } from "./macos-dmg-i18n";
import { renderMacosDmgBackgroundPng } from "./macos-dmg-background";
import { adhocCodesignAppBundle, shouldAdhocCodesign } from "./codesign-local";

const escapeAppleScript = (value: string) => value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');

const run = async (command: string[], options?: { cwd?: string }) => {
  const proc = Bun.spawn(command, {
    cwd: options?.cwd,
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`${command.join(" ")} failed with exit code ${exitCode}`);
  }
};

const resolveDmgVolumeName = (appDisplayName: string, buildEnv?: string) => {
  const base = appDisplayName.replace(/[^A-Za-z0-9._-]/g, "");
  if (buildEnv === "canary" && !base.endsWith("-canary")) {
    return `${base}-canary`;
  }
  return base;
};

const findDmgSourceInChannelDir = async (channelDir: string) => {
  const entries = await readdir(channelDir);
  const appBundleName = entries.find((name) => name.endsWith(".app"));
  if (!appBundleName) {
    return null;
  }

  const stableSuffixDmg = entries.find((name) => name.endsWith("-stable.dmg"));
  const plainDmg = entries.find((name) => name.endsWith(".dmg") && !name.endsWith("-stable.dmg"));
  const dmgPath = stableSuffixDmg
    ? join(channelDir, stableSuffixDmg)
    : plainDmg
      ? join(channelDir, plainDmg)
      : null;

  return {
    appBundleName,
    appBundlePath: join(channelDir, appBundleName),
    dmgPath,
  };
};

const extractAppFromDmg = async (dmgPath: string, appBundleName: string, workDir: string) => {
  const mountDir = join(workDir, "mount");
  await mkdir(mountDir, { recursive: true });
  await run(["hdiutil", "attach", dmgPath, "-mountpoint", mountDir, "-nobrowse", "-quiet"]);

  try {
    const sourceApp = join(mountDir, appBundleName);
    if (!existsSync(sourceApp)) {
      throw new Error(`Expected app bundle not found in dmg: ${sourceApp}`);
    }
    const extractedApp = join(workDir, appBundleName);
    await run(["ditto", sourceApp, extractedApp]);
    return extractedApp;
  } finally {
    await run(["hdiutil", "detach", mountDir, "-quiet"]).catch(() => undefined);
  }
};

const waitForFinderDisk = async (volumeName: string, timeoutMs = 30_000) => {
  const escaped = escapeAppleScript(volumeName);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const probe = Bun.spawnSync(
      [
        "osascript",
        "-e",
        `tell application "Finder" to return exists disk "${escaped}"`,
      ],
      { stdout: "pipe", stderr: "ignore" },
    );
    if (probe.exitCode === 0 && probe.stdout.toString("utf8").trim() === "true") {
      return;
    }
    await Bun.sleep(500);
  }
  throw new Error(`Finder did not see mounted disk "${volumeName}" within ${timeoutMs}ms`);
};

const applyFinderWindowLayout = async (
  volumeName: string,
  appBundleName: string,
  mountPoint: string,
) => {
  const { width, height } = buildMacosDmgInstallerTheme(getMacosDmgInstallerCopyForBuild());
  const appX = Math.round(width * 0.22);
  const appsX = Math.round(width * 0.68);
  const iconY = Math.round(height * 0.46);
  const backgroundPosix = join(mountPoint, ".background", "installer-background.png");

  const script = `
tell application "Finder"
  tell disk "${escapeAppleScript(volumeName)}"
    open
    set current view of container window to icon view
    set toolbar visible of container window to false
    set statusbar visible of container window to false
    set bounds of container window to {120, 120, ${120 + width}, ${120 + height}}
    set theViewOptions to the icon view options of container window
    set arrangement of theViewOptions to not arranged
    set icon size of theViewOptions to 96
    set background picture of theViewOptions to POSIX file "${escapeAppleScript(backgroundPosix)}"
    set position of item "${escapeAppleScript(appBundleName)}" of container window to {${appX}, ${iconY}}
    set position of item "Applications" of container window to {${appsX}, ${iconY}}
    close
    open
    update without registering applications
    delay 2
    close
  end tell
end tell
`;

  await run(["osascript", "-e", script]);
};


export type CreateBrandedMacosDmgOptions = {
  channelDir: string;
  artifactDir: string;
  platformPrefix: string;
  buildEnv?: string;
  appDisplayName?: string;
};

export const createBrandedMacosDmg = async ({
  channelDir,
  artifactDir,
  platformPrefix,
  buildEnv,
  appDisplayName = "Nolo Desktop",
}: CreateBrandedMacosDmgOptions) => {
  if (process.platform !== "darwin") {
    return;
  }

  const source = await findDmgSourceInChannelDir(channelDir);
  if (!source) {
    console.log(`[desktop] skipping branded dmg: no .app bundle in ${channelDir}`);
    return;
  }

  const workDir = join(channelDir, ".branded-dmg-work");
  rmSync(workDir, { recursive: true, force: true });
  await mkdir(workDir, { recursive: true });

  const appBundlePath = source.dmgPath
    ? await extractAppFromDmg(source.dmgPath, source.appBundleName, workDir)
    : source.appBundlePath;

  const backgroundPath = await renderMacosDmgBackgroundPng(join(workDir, "installer-background.png"));
  const stagingDir = join(workDir, "staging");
  await mkdir(stagingDir, { recursive: true });
  await mkdir(join(stagingDir, ".background"), { recursive: true });
  await cp(appBundlePath, join(stagingDir, source.appBundleName), { recursive: true });
  // DMG 里真正被安装的是 staging 里的这份 .app 副本。ad-hoc 模式下必须对它
  // 再签一次：postWrap 签的是构建目录里的 .app，而这里的来源可能是 electrobun
  // 自己打的 DMG（其内 .app 是 postWrap 之前的副本），签名状态不可假定。
  // Apple Silicon 上未签名的可执行文件会被 Gatekeeper 判为「已损坏」且不可绕过。
  if (shouldAdhocCodesign()) {
    await adhocCodesignAppBundle(join(stagingDir, source.appBundleName));
  }
  await cp(backgroundPath, join(stagingDir, ".background", "installer-background.png"));
  await symlink("/Applications", join(stagingDir, "Applications"));

  const volumeName = resolveDmgVolumeName(appDisplayName, buildEnv);
  const tempDmg = join(workDir, "temp.dmg");
  const outputDmg = join(
    artifactDir,
    buildEnv === "canary" || platformPrefix.includes("canary")
      ? `${platformPrefix}-NoloDesktop-canary.dmg`
      : `${platformPrefix}-NoloDesktop.dmg`,
  );

  await run([
    "hdiutil",
    "create",
    "-volname",
    volumeName,
    "-srcfolder",
    stagingDir,
    "-ov",
    "-format",
    "UDRW",
    tempDmg,
  ]);

  const defaultMount = join("/Volumes", volumeName);
  await run(["hdiutil", "attach", tempDmg, "-nobrowse", "-quiet"]);
  await waitForFinderDisk(volumeName);

  try {
    await applyFinderWindowLayout(volumeName, source.appBundleName, defaultMount);
  } finally {
    await run(["hdiutil", "detach", defaultMount, "-force", "-quiet"]).catch(() => undefined);
    await Bun.sleep(1500);
  }

  if (existsSync(outputDmg)) {
    rmSync(outputDmg);
  }

  await run(["hdiutil", "convert", tempDmg, "-format", "ULFO", "-o", outputDmg]);

  if (process.env.ELECTROBUN_DEVELOPER_ID) {
    await run([
      "codesign",
      "--force",
      "--verbose",
      "--timestamp",
      "--sign",
      process.env.ELECTROBUN_DEVELOPER_ID,
      outputDmg,
    ]);
  } else if (shouldAdhocCodesign()) {
    // DMG 自身的签名只影响「下载的 DMG 被当成独立可执行体」的场景，Gatekeeper
    // 判定的是 DMG 里的 .app（上面已用 ad-hoc 签过并通过 --verify --strict）。
    // 这里仍补一次 ad-hoc 签名：仓库既有的 verifyMacDmgArtifact.sh 会对发布的
    // DMG 跑 codesign --verify，未签名的 DMG 会让那条校验直接失败。
    //
    // 失败即中止，不静默继续：签名步骤被静默吞掉时，owner 看到的日志会以为
    // 产物已签名，而真正的签名状态要到用户安装时才暴露——那时已经发布出去了。
    for (const command of [
      ["codesign", "--force", "--sign", "-", outputDmg],
      ["codesign", "--verify", "--verbose=2", outputDmg],
    ]) {
      const proc = Bun.spawn(command, { stdout: "pipe", stderr: "pipe" });
      const [stdout, stderr] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
      ]);
      const exitCode = await proc.exited;
      const rawOutput = [stdout, stderr]
        .map((chunk) => chunk.trim())
        .filter(Boolean)
        .join("\n");
      console.log(
        `[desktop] dmg codesign: ${command.join(" ")} (exit ${exitCode})\n${rawOutput}`
      );
      if (exitCode !== 0) {
        throw new Error(
          `ad-hoc 签名 dmg 失败（${command.join(" ")}，退出码 ${exitCode}）：${rawOutput || "(codesign produced no output)"}\n` +
            `DMG 自身签名失败，macOS 用户从浏览器下载该 DMG 时可能看到「无法验证开发者」提示，` +
            `仓库的 verifyMacDmgArtifact.sh 也会在 codesign --verify 上失败。` +
            `构建中止，不发布签名状态不可控的产物。`
        );
      }
    }
  }

  rmSync(workDir, { recursive: true, force: true });
  if (source.dmgPath && existsSync(source.dmgPath)) {
    rmSync(source.dmgPath);
  }

  console.log(`[desktop] branded macOS dmg created at ${outputDmg}`);
};
