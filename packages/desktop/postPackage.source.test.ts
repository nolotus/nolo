import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const postPackageSource = readFileSync(
  new URL("./scripts/post-package.ts", import.meta.url),
  "utf8"
);
const windowsPostPackageSource = readFileSync(
  new URL("./scripts/post-package-windows.ts", import.meta.url),
  "utf8"
);
const linuxPostPackageSource = readFileSync(
  new URL("./scripts/post-package-linux.ts", import.meta.url),
  "utf8"
);
const electrobunConfigSource = readFileSync(
  new URL("./electrobun.config.ts", import.meta.url),
  "utf8"
);
const windowsInstallerSource = readFileSync(
  new URL("./assets/windows-installer.iss", import.meta.url),
  "utf8"
);
const windowsLauncherSource = readFileSync(
  new URL("./assets/windows-launcher.vbs", import.meta.url),
  "utf8"
);
const verifyMacAppBundleSource = readFileSync(
  new URL("../../scripts/verify/desktop/verifyMacAppBundle.sh", import.meta.url),
  "utf8"
);
const verifyMacDmgArtifactSource = readFileSync(
  new URL("../../scripts/verify/desktop/verifyMacDmgArtifact.sh", import.meta.url),
  "utf8"
);
const verifyDesktopMacLocalArtifactsSource = readFileSync(
  new URL("../../scripts/verify/desktop/verifyDesktopMacLocalArtifacts.sh", import.meta.url),
  "utf8"
);
const smokeInstalledWindowsDesktopSource = readFileSync(
  new URL("../../scripts/verify/desktop/smokeInstalledWindowsDesktop.ps1", import.meta.url),
  "utf8"
);
const windowsStableInstallerBuildSource = readFileSync(
  new URL("./scripts/build-stable-windows-installer.ts", import.meta.url),
  "utf8"
);
const desktopVersionSource = readFileSync(
  new URL("./desktopVersion.ts", import.meta.url),
  "utf8"
);

describe("desktop post-package source contract", () => {
  it("does not mutate release artifacts during dev watch builds", () => {
    expect(postPackageSource).toContain('if (buildEnv === "dev")');
    expect(postPackageSource.indexOf('if (buildEnv === "dev")')).toBeLessThan(
      postPackageSource.indexOf("syncMacArtifactTarballsFromWrapper"),
    );
  });

  it("builds the public Windows installer through Inno Setup", () => {
    expect(windowsPostPackageSource).toContain("ISCC.exe");
    expect(windowsPostPackageSource).toContain("windows-installer.iss");
    expect(postPackageSource).toContain("createWindowsInstallerArtifact");
  });

  it("keeps Windows installers compressed by default and blocks accidental uncompressed releases", () => {
    expect(windowsInstallerSource).toContain("Compression=__INSTALLER_COMPRESSION__");
    expect(windowsInstallerSource).toContain(
      "SolidCompression=__INSTALLER_SOLID_COMPRESSION__"
    );
    for (const source of [windowsPostPackageSource, windowsStableInstallerBuildSource]) {
      expect(source).toContain('DEFAULT_WINDOWS_INSTALLER_COMPRESSION = "lzma2/max"');
      expect(source).toContain('DEFAULT_WINDOWS_INSTALLER_SOLID_COMPRESSION = "yes"');
      expect(source).toContain("NOLO_WINDOWS_INSTALLER_COMPRESSION");
      expect(source).toContain("NOLO_WINDOWS_INSTALLER_SOLID_COMPRESSION");
      expect(source).toContain("NOLO_WINDOWS_INSTALLER_ALLOW_UNCOMPRESSED");
      expect(source).toContain("Refusing to build an uncompressed Windows installer");
      expect(source).toContain('compression.toLowerCase() === "none"');
      expect(source).toContain('replaceAll("__INSTALLER_COMPRESSION__", compression)');
      expect(source).toContain(
        'replaceAll("__INSTALLER_SOLID_COMPRESSION__", solidCompression)'
      );
    }
  });

  it("builds a side-by-side Windows smoke installer so CI does not touch the operator install", () => {
    expect(windowsInstallerSource).toContain("#define LaunchScriptDestName");
    expect(windowsInstallerSource).toContain('DestName: "{#LaunchScriptDestName}"');
    expect(windowsInstallerSource).toContain('Name: "{userprograms}\\{#AppName}.lnk"');
    expect(windowsInstallerSource).toContain('Parameters: """{app}\\{#LaunchScriptDestName}"""');
    expect(windowsInstallerSource).toContain("$noloInstallPattern = ''*__APP_NAME__*''");
    expect(windowsInstallerSource).toContain("$noloDataPattern = ''*__APP_IDENTIFIER__*''");
    expect(windowsInstallerSource).toContain("__APP_IDENTIFIER__' + '\\stable\\app'");

    for (const source of [windowsPostPackageSource, windowsStableInstallerBuildSource]) {
      expect(source).toContain('WINDOWS_DESKTOP_SMOKE_APP_NAME = "Nolo Desktop Smoke"');
      expect(source).toContain('WINDOWS_DESKTOP_SMOKE_APP_ID = "chat.nolo.desktop.smoke"');
      expect(source).toContain(
        'WINDOWS_DESKTOP_SMOKE_LAUNCH_SCRIPT_DEST_NAME = "Nolo Desktop Smoke.vbs"'
      );
      expect(source).toContain(
        'WINDOWS_DESKTOP_SMOKE_OUTPUT_BASE_FILENAME = "NoloDesktop-Smoke-Setup"'
      );
      expect(source).toContain("compileWindowsInstaller");
      expect(source).toContain("smoke-artifacts");
      expect(source).toContain("{ recursive: true, force: true }");
    }

    expect(smokeInstalledWindowsDesktopSource).toContain("NOLO_DESKTOP_SMOKE_SETUP");
    expect(smokeInstalledWindowsDesktopSource).toContain("NOLO_DESKTOP_SMOKE_LAUNCHER");
    expect(smokeInstalledWindowsDesktopSource).toContain("$usesIsolatedSmokeInstaller");
    expect(smokeInstalledWindowsDesktopSource).toContain(
      "self-hosted installed desktop smoke uses isolated installer identity"
    );
  });

  it("packages the WebView2 bootstrapper so users do not install renderer prerequisites manually", () => {
    expect(windowsPostPackageSource).toContain("WEBVIEW2_BOOTSTRAPPER_URL");
    expect(windowsPostPackageSource).toContain("https://go.microsoft.com/fwlink/p/?LinkId=2124703");
    expect(windowsPostPackageSource).toContain("downloadWebView2Bootstrapper");
    expect(windowsInstallerSource).toContain("#define WebView2BootstrapperFile");
    expect(windowsInstallerSource).toContain('DestName: "MicrosoftEdgeWebview2Setup.exe"');
    expect(windowsInstallerSource).toContain('Parameters: "/silent /install"');
    expect(windowsInstallerSource).toContain("Check: not IsWebView2RuntimeInstalled");
    expect(windowsInstallerSource).toContain("F3017226-FE2A-4295-8BDF-00C3A9A7E4C5");
  });

  it("publishes a versioned Windows installer name for human downloads", () => {
    expect(electrobunConfigSource).toContain("version: DESKTOP_APP_VERSION");
    expect(desktopVersionSource).toContain('new URL("./package.json", import.meta.url)');
    expect(windowsPostPackageSource).toContain("versionedInstallerPath");
    expect(windowsPostPackageSource).toContain('`${outputBaseFilename}-${version}.exe`');
    expect(windowsStableInstallerBuildSource).toContain("recoverInstallerFromRawTar");
    expect(windowsStableInstallerBuildSource).toContain("stable-win-x64-update.json");
    expect(windowsStableInstallerBuildSource).toContain("build:stable:electrobun");
  });

  it("keeps Linux RPM packaging opt-in so official tar/update publishing never depends on it", () => {
    expect(linuxPostPackageSource).toContain('process.env.NOLO_DESKTOP_BUILD_RPM !== "1"');
    expect(linuxPostPackageSource).toContain(
      "RPM generation is opt-in; publishing Linux tar artifacts"
    );
    expect(postPackageSource).toContain("createLinuxRpmArtifact");
    // Official Linux required artifacts remain tar.zst + update metadata; RPM is experimental.
    expect(linuxPostPackageSource.indexOf('NOLO_DESKTOP_BUILD_RPM !== "1"')).toBeLessThan(
      linuxPostPackageSource.indexOf('["which", "rpmbuild"]')
    );
    expect(postPackageSource).toContain("Optional RPM generation failed; continuing");
    expect(postPackageSource).toMatch(
      /try \{\s*await createLinuxRpmArtifact\(\{ artifactDir, buildEnv \}\);\s*\} catch \(error\)/
    );
  });

  it("packages Linux RPM paths without whitespace and installs the bundled icon", () => {
    expect(linuxPostPackageSource).toContain(
      'import { buildLinuxDesktopEntry } from "../src/bun/linuxDesktopEntry";'
    );
    expect(linuxPostPackageSource.match(/buildLinuxDesktopEntry/g)).toHaveLength(3);
    expect(linuxPostPackageSource).toContain(
      'cp -aL "%{_sourcedir}/nolo-desktop-linux/${innerFolder}"*'
    );
    expect(linuxPostPackageSource).toContain(
      "$RPM_BUILD_ROOT/opt/nolo-desktop/Resources/appIcon.png"
    );
    expect(linuxPostPackageSource).toContain("/opt/nolo-desktop");
    expect(linuxPostPackageSource).not.toContain("$RPM_BUILD_ROOT/opt/Nolo Desktop");
  });

  it("defaults Linux delta patches off and keeps an explicit force path", () => {
    expect(electrobunConfigSource).toContain('platform === "linux"');
    expect(electrobunConfigSource).toContain('env.NOLO_DESKTOP_FORCE_PATCH === "1"');
    expect(electrobunConfigSource).toContain('env.NOLO_DESKTOP_SKIP_PATCH === "1"');
  });

  it("recovers the Windows stable installer from an existing payload directory when the raw tar is missing", () => {
    expect(windowsStableInstallerBuildSource).toContain("resolveWindowsInstallerRecoverySource");
    expect(windowsStableInstallerBuildSource).toContain('kind === "payload-dir"');
    expect(windowsStableInstallerBuildSource).toContain("findWindowsPayloadDir(tempDir)");
    expect(windowsStableInstallerBuildSource).toContain("basename(recoverySource.path)");
    expect(windowsStableInstallerBuildSource).toContain('readDesktopPackageVersion()');
    expect(windowsStableInstallerBuildSource).toContain('process.env.NOLO_BUILD_SHA');
    expect(windowsStableInstallerBuildSource).toContain('join(payloadDir, "Resources", "version.json")');
    expect(windowsStableInstallerBuildSource).toContain("completeRecoveryVersionInfo");
    expect(windowsStableInstallerBuildSource).toContain("ensureRecoveryAppRuntime");
    expect(windowsStableInstallerBuildSource).toContain("Bun.build");
    expect(windowsStableInstallerBuildSource).toContain('entrypoints: [desktopBunEntrypoint]');
    expect(windowsStableInstallerBuildSource).toContain('target: "bun"');
    expect(windowsStableInstallerBuildSource).toContain('format: "esm"');
    expect(windowsStableInstallerBuildSource).toContain("desktopBunBuildExternals");
    expect(windowsStableInstallerBuildSource).toContain("desktopRuntimeCopyEntries");
    expect(windowsStableInstallerBuildSource).toContain('join(resourcesDir, "app", "bun", "index.js")');
    expect(windowsStableInstallerBuildSource).toContain('channel: versionInfo.channel?.trim() || WINDOWS_DESKTOP_CHANNEL');
    expect(windowsStableInstallerBuildSource).toContain('name: versionInfo.name?.trim() || WINDOWS_DESKTOP_APP_FILE_NAME');
    expect(windowsStableInstallerBuildSource).toContain('identifier: versionInfo.identifier?.trim() || WINDOWS_DESKTOP_APP_ID');
    expect(windowsStableInstallerBuildSource).toContain(
      'baseUrl: versionInfo.baseUrl?.trim() || ELECTROBUN_RELEASE_BASE_URL'
    );
    expect(windowsStableInstallerBuildSource).toContain("completed recovery version metadata");
    expect(windowsStableInstallerBuildSource).toContain('join(payloadDir, "Resources", "app", "public")');
    expect(windowsStableInstallerBuildSource).toContain("latest-assets.json");
    expect(windowsStableInstallerBuildSource).toContain('Missing NOLO_BUILD_SHA/GITHUB_SHA for Windows installer recovery');
  });

  it("recognizes canary Windows setup zip artifacts before generating the public installer", () => {
    expect(windowsPostPackageSource).toContain('/^.+-Setup.*\\.zip$/i.test(name)');
    expect(windowsPostPackageSource).not.toContain('name.endsWith("-Setup.zip")');
    expect(smokeInstalledWindowsDesktopSource).toContain('-Filter "*Setup*.exe"');
  });

  it("applies the Windows app icon to packaged executables before building the installer", () => {
    expect(windowsPostPackageSource).toContain('import * as rceditModule from "rcedit"');
    expect(windowsPostPackageSource).toContain("default?: Rcedit");
    expect(windowsPostPackageSource).toContain("rcedit?: Rcedit");
    expect(windowsPostPackageSource).toContain("applyWindowsExecutableIcon");
    expect(windowsPostPackageSource).toContain("Windows executable icon patch skipped");
    expect(windowsPostPackageSource).toContain('join(payloadDir, "bin", "launcher.exe")');
  });

  it("includes integration modules in packaged desktop resources", () => {
    expect(electrobunConfigSource).toContain('"../../packages/desktop-chrome-connector"');
    expect(electrobunConfigSource).toContain('"../../packages/integrations/xhs-reader"');
  });

  it("does not bake llama runtime config into install-relative Windows payload paths", () => {
    expect(windowsPostPackageSource).not.toContain("copyWindowsLocalModelConfig");
    expect(windowsPostPackageSource).not.toContain(
      'join(payloadDir, "Resources", "app", "logs", "llama-supervisor", "local-model.json")'
    );
    expect(windowsPostPackageSource).not.toContain(
      'join(payloadDir, "bin", "logs", "llama-supervisor", "local-model.json")'
    );
  });

  it("keeps the Windows installer on the standard app path and cleans runtime logs on uninstall", () => {
    expect(windowsInstallerSource).toContain("UsePreviousAppDir=no");
    expect(windowsInstallerSource).toContain('DefaultDirName={localappdata}\\Programs\\{#AppName}');
    expect(windowsInstallerSource).toContain(
      "function QuoteForPowerShellSingleQuotedString(value: String): String;"
    );
    expect(windowsInstallerSource).not.toContain("StringChangeEx(");
    expect(windowsInstallerSource).toContain("function PrepareToInstall(var NeedsRestart: Boolean): String;");
    expect(windowsInstallerSource).toContain("StopRunningInstalledBunAt(WizardDirValue);");
    expect(windowsInstallerSource).toContain("Get-Process bun -ErrorAction SilentlyContinue");
    expect(windowsInstallerSource).toContain("Stop-Process -Force");
    expect(windowsInstallerSource).toContain('[InstallDelete]');
    expect(windowsInstallerSource).toContain('Name: "{userprograms}\\{#AppName}.lnk"');
    expect(windowsInstallerSource).toContain('[UninstallDelete]');
    expect(windowsInstallerSource).toContain('Name: "{app}\\bin\\app.log"');
    expect(windowsInstallerSource).toContain(
      'Name: "{localappdata}\\__APP_IDENTIFIER__\\launcher.log"'
    );
  });

  it("repairs old Windows installs by stopping stale Nolo Desktop processes and cleaning runtime cache", () => {
    expect(windowsInstallerSource).toContain("procedure StopStaleNoloProcesses();");
    expect(windowsInstallerSource).toContain("procedure CleanStaleRuntimeCache();");
    expect(windowsInstallerSource).toContain("StopStaleNoloProcesses();");
    expect(windowsInstallerSource).toContain("CleanStaleRuntimeCache();");
    expect(windowsInstallerSource).toContain('[repair] Starting Windows desktop repair hotfix');
    expect(windowsInstallerSource).toContain('[repair] Windows desktop repair hotfix completed');
  });

  it("stops stale Nolo processes by path without killing unrelated Bun apps", () => {
    expect(windowsInstallerSource).toContain("$noloInstallPattern = ''*__APP_NAME__*''");
    expect(windowsInstallerSource).toContain("$noloDataPattern = ''*__APP_IDENTIFIER__*''");
    expect(windowsInstallerSource).toContain('Get-Process -Name bun,launcher');
    expect(windowsInstallerSource).toContain('Where-Object { $_.Path -and');
    expect(windowsInstallerSource).toContain("''wscript.exe'', ''cscript.exe'', ''cmd.exe'', ''msedgewebview2.exe''");
    expect(windowsInstallerSource).toContain('Invoke-CimMethod -MethodName Terminate');
  });

  it("preserves stable user data while removing stale runtime app cache on repair", () => {
    expect(windowsInstallerSource).toContain('__APP_IDENTIFIER__');
    expect(windowsInstallerSource).toContain('\\stable\\app');
    expect(windowsInstallerSource).toContain('\\stable\\data');
    expect(windowsInstallerSource).toContain('DelTree(stableAppDir, True, True, True)');
    expect(windowsInstallerSource).toContain('Preserved user data directory');
    expect(windowsInstallerSource).not.toContain('DelTree(stableDataDir');
    expect(windowsInstallerSource).toContain('No stale runtime app cache found to clean');
  });
  it("uses a PowerShell-version independent Windows check in installed desktop smoke", () => {
    expect(smokeInstalledWindowsDesktopSource).toContain("RuntimeInformation");
    expect(smokeInstalledWindowsDesktopSource).toContain("OSPlatform]::Windows");
  });

  it("fails installed desktop smoke early when the fixed smoke port is already occupied", () => {
    expect(smokeInstalledWindowsDesktopSource).toContain("Assert-SmokePortAvailable");
    expect(smokeInstalledWindowsDesktopSource).toContain("Assert-IsolatedInstalledSmokeRunner");
    expect(smokeInstalledWindowsDesktopSource).toContain(
      "NOLO_ALLOW_INSTALLED_DESKTOP_SMOKE_ON_SELF_HOSTED"
    );
    expect(smokeInstalledWindowsDesktopSource).toContain("TcpListener");
    expect(smokeInstalledWindowsDesktopSource).toContain("probing smoke port $Port via TcpListener bind");
    expect(smokeInstalledWindowsDesktopSource).toContain("Desktop smoke port $Port is already in use or unavailable");
    expect(smokeInstalledWindowsDesktopSource).toContain("$desktopSmokePort = 34333");
    expect(smokeInstalledWindowsDesktopSource).toContain('$smokeRunId = if ($env:GITHUB_RUN_ID)');
    expect(smokeInstalledWindowsDesktopSource).toContain('Join-Path $env:RUNNER_TEMP "Nolo Desktop Smoke $smokeRunId"');
    expect(smokeInstalledWindowsDesktopSource).toContain('release smoke skips prior process-tree cleanup');
    expect(smokeInstalledWindowsDesktopSource).toContain("Stop-SmokeInstalledProcesses");
    expect(smokeInstalledWindowsDesktopSource).toContain("Windows installer timed out after $smokeInstallerTimeoutSec seconds.");
    expect(smokeInstalledWindowsDesktopSource).toContain("Get-SmokeInstalledProcessIds");
    expect(smokeInstalledWindowsDesktopSource).toContain("Get-SmokeScriptRootProcessIds");
    expect(smokeInstalledWindowsDesktopSource).toContain("if ($isReleaseSmoke)");
    expect(smokeInstalledWindowsDesktopSource).toContain("Stop-SmokeInstalledProcesses -IncludeScriptRoots");
    expect(smokeInstalledWindowsDesktopSource).toContain("if ($IncludeScriptRoots)");
    expect(smokeInstalledWindowsDesktopSource).toContain('taskkill.exe');
    expect(smokeInstalledWindowsDesktopSource).toContain('Write-Host "[smoke]');
    expect(smokeInstalledWindowsDesktopSource).toContain('NOLO_DESKTOP_SMOKE_PROBE = "1"');
    expect(smokeInstalledWindowsDesktopSource).toContain("Wait-ForSmokeProbeCompletion");
    expect(smokeInstalledWindowsDesktopSource).toContain("Launcher log:");
    expect(smokeInstalledWindowsDesktopSource).toContain("Read-SmokeLog");
    expect(smokeInstalledWindowsDesktopSource.indexOf("function Read-SmokeLog")).toBeLessThan(
      smokeInstalledWindowsDesktopSource.indexOf("function Wait-ForDesktopHealth")
    );
  });

  it("launches the Windows VBS entry through wscript instead of executing the script directly", () => {
    expect(windowsInstallerSource).toContain('Filename: "{sys}\\wscript.exe"');
    expect(windowsInstallerSource).toContain('Parameters: """{app}\\{#LaunchScriptDestName}"""');
    expect(windowsLauncherSource).toContain('entryPath = appDir & "\\Resources\\main.js"');
    expect(windowsLauncherSource).toContain('logPath = logDir & "\\launcher.log"');
    expect(windowsLauncherSource).toContain('logPath = logDir & "\\Nolo Desktop launcher.log"');
    expect(windowsLauncherSource).toContain("Function CanAppendLog(path)");
    expect(windowsLauncherSource).toContain("If Not CanAppendLog(logPath) Then");
    expect(windowsLauncherSource).toContain("logEnabled = False");
    expect(windowsLauncherSource).toContain('>> " & Chr(34) & logPath & Chr(34) & " 2>&1"');
    expect(windowsLauncherSource).toContain("/v:on /d /c");
    expect(windowsLauncherSource).toContain("[launcher] Process exited code !ERRORLEVEL!");
    expect(windowsLauncherSource).not.toContain('entryPath = appDir & "\\Resources\\app\\bun\\index.js"');
  });

  it("requires stapled notarization tickets for strict macOS release verification", () => {
    expect(verifyMacAppBundleSource).toContain("xcrun stapler validate -v");
    expect(verifyMacDmgArtifactSource).toContain("xcrun stapler validate -v");
    expect(verifyMacDmgArtifactSource).toContain("context:primary-signature");
  });

  it("verifies standalone macOS app tarballs as flat launchable apps, not wrapper self-extractors", () => {
    expect(postPackageSource).toContain("standaloneArtifactTarballs");
    expect(postPackageSource).toContain("findWrapperInnerArchive");
    expect(postPackageSource).toContain("cp(innerArchivePath, join(artifactDir, tarballName))");
    expect(verifyDesktopMacLocalArtifactsSource).toContain("Contents/MacOS/launcher");
    expect(verifyDesktopMacLocalArtifactsSource).toContain("Contents/Resources/main.js");
    expect(verifyDesktopMacLocalArtifactsSource).toContain("wrapper self-extraction tarball");
  });
});
