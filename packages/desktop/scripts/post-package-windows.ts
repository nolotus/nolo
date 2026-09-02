import { withTempDir } from "./codesign-local";
import { readPayloadVersionInfo } from "./payload-version";
import { pruneClassicLevelPrebuilds } from "./prune-native-prebuilds";
import { patchElectrobunWindowsCore } from "./patch-electrobun-windows-core";
import { cp, mkdir, readdir } from "node:fs/promises";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { asOptionalTrimmedString } from "core/optionalString";
import * as rceditModule from "rcedit";

type Rcedit = (exePath: string, options: { icon?: string }) => Promise<void>;

const WINDOWS_DESKTOP_APP_NAME = "Nolo Desktop";
const WINDOWS_DESKTOP_APP_ID = "chat.nolo.desktop";
const WINDOWS_DESKTOP_LAUNCH_SCRIPT_DEST_NAME = "Nolo Desktop.vbs";
const WINDOWS_DESKTOP_SMOKE_APP_NAME = "Nolo Desktop Smoke";
const WINDOWS_DESKTOP_SMOKE_APP_ID = "chat.nolo.desktop.smoke";
const WINDOWS_DESKTOP_SMOKE_LAUNCH_SCRIPT_DEST_NAME = "Nolo Desktop Smoke.vbs";
const WINDOWS_DESKTOP_SMOKE_OUTPUT_BASE_FILENAME = "NoloDesktop-Smoke-Setup";
const WEBVIEW2_BOOTSTRAPPER_URL =
  "https://go.microsoft.com/fwlink/p/?LinkId=2124703";

const rcedit =
  (rceditModule as unknown as { default?: Rcedit; rcedit?: Rcedit }).default ??
  (rceditModule as unknown as { rcedit?: Rcedit }).rcedit ??
  (rceditModule as unknown as Rcedit);

const appIconIcoPath = resolve(import.meta.dir, "../assets/icon.ico");
const windowsLauncherTemplatePath = resolve(import.meta.dir, "../assets/windows-launcher.vbs");
const windowsInstallerTemplatePath = resolve(import.meta.dir, "../assets/windows-installer.iss");
const windowsSmokeArtifactDir = resolve(import.meta.dir, "../smoke-artifacts");
const DEFAULT_WINDOWS_INSTALLER_COMPRESSION = "lzma2/max";
const DEFAULT_WINDOWS_INSTALLER_SOLID_COMPRESSION = "yes";

const resolveWindowsPayloadDir = async (tempDir: string) => {
  const entries = await readdir(tempDir);
  const payloadDir = entries
    .map((name) => join(tempDir, name))
    .find((path) => existsSync(join(path, "Resources", "main.js")) && existsSync(join(path, "bin")));

  if (!payloadDir) {
    throw new Error(`Unable to locate extracted Windows desktop payload in ${tempDir}`);
  }

  return payloadDir;
};

const resolveWindowsInstallerCompression = () => {
  const compression =
    process.env.NOLO_WINDOWS_INSTALLER_COMPRESSION?.trim() ||
    DEFAULT_WINDOWS_INSTALLER_COMPRESSION;
  const solidCompression =
    process.env.NOLO_WINDOWS_INSTALLER_SOLID_COMPRESSION?.trim() ||
    DEFAULT_WINDOWS_INSTALLER_SOLID_COMPRESSION;

  if (
    compression.toLowerCase() === "none" &&
    process.env.NOLO_WINDOWS_INSTALLER_ALLOW_UNCOMPRESSED !== "1"
  ) {
    throw new Error(
      "Refusing to build an uncompressed Windows installer. " +
        "Set NOLO_WINDOWS_INSTALLER_ALLOW_UNCOMPRESSED=1 only for a temporary diagnostic artifact."
    );
  }

  return { compression, solidCompression };
};

const downloadWebView2Bootstrapper = async (destPath: string) => {
  const response = await fetch(WEBVIEW2_BOOTSTRAPPER_URL);
  if (!response.ok) {
    throw new Error(
      `failed to download WebView2 bootstrapper: HTTP ${response.status}`
    );
  }

  const body = new Uint8Array(await response.arrayBuffer());
  if (body.length < 1024 * 1024) {
    throw new Error(
      `downloaded WebView2 bootstrapper is unexpectedly small: ${body.length} bytes`
    );
  }

  writeFileSync(destPath, body);
};

const applyWindowsExecutableIcon = async (exePath: string) => {
  if (!existsSync(exePath)) {
    return;
  }

  try {
    await rcedit(exePath, {
      icon: appIconIcoPath,
    });
  } catch (error: any) {
    console.warn(
      `[desktop] Windows executable icon patch skipped for ${exePath}: ${
        error?.message ?? error
      }`
    );
  }
};

const findInnoSetupCompiler = (): string | null => {
  const candidates = [
    process.env.NOLO_INNO_SETUP_COMPILER,
    process.env.USERPROFILE ? join(process.env.USERPROFILE, "tools", "InnoSetup", "ISCC.exe") : null,
    process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "Programs", "Inno Setup 6", "ISCC.exe") : null,
    process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "Programs", "Inno Setup", "ISCC.exe") : null,
    process.env.ProgramFiles ? join(process.env.ProgramFiles, "Inno Setup 6", "ISCC.exe") : null,
    process.env["ProgramFiles(x86)"]
      ? join(process.env["ProgramFiles(x86)"], "Inno Setup 6", "ISCC.exe")
      : null,
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  const whereResult = Bun.spawnSync(["where", "ISCC.exe"], {
    stdout: "pipe",
    stderr: "ignore",
  });
  if (whereResult.exitCode === 0) {
    const firstMatch = whereResult.stdout.toString("utf8").split(/\r?\n/).find(Boolean);
    if (firstMatch && existsSync(firstMatch)) {
      return firstMatch;
    }
  }

  return null;
};

const renderWindowsInstallerScript = ({
  appId = WINDOWS_DESKTOP_APP_ID,
  appName = WINDOWS_DESKTOP_APP_NAME,
  appIdentifier = appId,
  launchScriptDestName = WINDOWS_DESKTOP_LAUNCH_SCRIPT_DEST_NAME,
  launchScriptPath,
  outputBaseFilename,
  outputDir,
  payloadDir,
  version,
  webView2BootstrapperPath,
}: {
  appId?: string;
  appName?: string;
  appIdentifier?: string;
  launchScriptDestName?: string;
  launchScriptPath: string;
  outputBaseFilename: string;
  outputDir: string;
  payloadDir: string;
  version: string;
  webView2BootstrapperPath: string;
}) => {
  const { compression, solidCompression } = resolveWindowsInstallerCompression();
  const template = readFileSync(windowsInstallerTemplatePath, "utf8");
  return template
    .replaceAll("__APP_NAME__", appName)
    .replaceAll("__APP_VERSION__", version)
    .replaceAll("__APP_ID__", appId)
    .replaceAll("__APP_IDENTIFIER__", appIdentifier)
    .replaceAll("__SOURCE_DIR__", payloadDir)
    .replaceAll("__OUTPUT_DIR__", outputDir)
    .replaceAll("__OUTPUT_BASE_FILENAME__", outputBaseFilename)
    .replaceAll("__SETUP_ICON_FILE__", appIconIcoPath)
    .replaceAll("__LAUNCH_SCRIPT_FILE__", launchScriptPath)
    .replaceAll("__LAUNCH_SCRIPT_DEST_NAME__", launchScriptDestName)
    .replaceAll("__WEBVIEW2_BOOTSTRAPPER_FILE__", webView2BootstrapperPath)
    .replaceAll("__INSTALLER_COMPRESSION__", compression)
    .replaceAll("__INSTALLER_SOLID_COMPRESSION__", solidCompression);
};

const compileWindowsInstaller = async ({
  appId,
  appName,
  launchScriptDestName,
  launchScriptPath,
  outputBaseFilename,
  outputDir,
  payloadDir,
  scriptPath,
  version,
  webView2BootstrapperPath,
}: {
  appId?: string;
  appName?: string;
  launchScriptDestName?: string;
  launchScriptPath: string;
  outputBaseFilename: string;
  outputDir: string;
  payloadDir: string;
  scriptPath: string;
  version: string;
  webView2BootstrapperPath: string;
}) => {
  const innoCompiler = findInnoSetupCompiler();
  if (!innoCompiler) {
    throw new Error(
      "ISCC.exe is required to build the public Windows installer. Install Inno Setup or set NOLO_INNO_SETUP_COMPILER."
    );
  }

  await mkdir(outputDir, { recursive: true });
  writeFileSync(
    scriptPath,
    renderWindowsInstallerScript({
      appId,
      appName,
      launchScriptDestName,
      launchScriptPath,
      outputBaseFilename,
      outputDir,
      payloadDir,
      version,
      webView2BootstrapperPath,
    }),
    "utf8"
  );

  const outputInstallerPath = join(outputDir, `${outputBaseFilename}.exe`);
  if (existsSync(outputInstallerPath)) {
    rmSync(outputInstallerPath, { force: true });
  }

  const compileProc = Bun.spawn([innoCompiler, scriptPath], {
    stdout: "inherit",
    stderr: "inherit",
  });
  const compileExitCode = await compileProc.exited;
  if (compileExitCode !== 0) {
    throw new Error(`Inno Setup compilation failed with exit code ${compileExitCode}`);
  }

  return outputInstallerPath;
};

export const createWindowsInstallerArtifact = async ({
  artifactDir,
  buildEnv,
}: {
  artifactDir: string;
  buildEnv?: string;
}) => {
  if (buildEnv === "dev") {
    return;
  }

  rmSync(windowsSmokeArtifactDir, { recursive: true, force: true });

  const artifactNames = await readdir(artifactDir);
  const windowsZipName = artifactNames.find(
    (name) => name.includes("-win-") && /^.+-Setup.*\.zip$/i.test(name)
  );
  const windowsTarballName = artifactNames.find(
    (name) =>
      name.includes("-win-") &&
      name.endsWith(".tar.zst") &&
      !name.includes("-Setup")
  );

  if (!windowsZipName || !windowsTarballName) {
    return;
  }

  await withTempDir("nolo-desktop-win-installer-", async (tempDir) => {
    const tarballPath = join(artifactDir, windowsTarballName);
    const extractProc = Bun.spawn(
      ["tar", "--zstd", "-xf", tarballPath, "-C", tempDir],
      {
        stdout: "inherit",
        stderr: "inherit",
      }
    );

    const extractExitCode = await extractProc.exited;
    if (extractExitCode !== 0) {
      throw new Error(`failed to extract ${tarballPath} with exit code ${extractExitCode}`);
    }

    const payloadDir = await resolveWindowsPayloadDir(tempDir);
    await applyWindowsExecutableIcon(join(payloadDir, "bin", "bun.exe"));
    await applyWindowsExecutableIcon(join(payloadDir, "bin", "launcher.exe"));
    await pruneClassicLevelPrebuilds(payloadDir);
    patchElectrobunWindowsCore(join(payloadDir, "bin", "ElectrobunCore.dll"));

    const versionInfo = readPayloadVersionInfo(payloadDir);
    const version = asOptionalTrimmedString(versionInfo?.version) ?? "0.1.0";
    const launchScriptPath = join(tempDir, "Nolo Desktop.vbs");
    writeFileSync(launchScriptPath, readFileSync(windowsLauncherTemplatePath, "utf8"), "utf8");
    const webView2BootstrapperPath = join(tempDir, "MicrosoftEdgeWebview2Setup.exe");
    await downloadWebView2Bootstrapper(webView2BootstrapperPath);

    const outputBaseFilename = windowsZipName.replace(/\.zip$/i, "");
    const outputInstallerPath = await compileWindowsInstaller({
      launchScriptPath,
      outputBaseFilename,
      outputDir: artifactDir,
      payloadDir,
      scriptPath: join(tempDir, "windows-installer.iss"),
      version,
      webView2BootstrapperPath,
    });

    const versionedInstallerPath = join(artifactDir, `${outputBaseFilename}-${version}.exe`);
    await cp(outputInstallerPath, versionedInstallerPath);

    await compileWindowsInstaller({
      appId: WINDOWS_DESKTOP_SMOKE_APP_ID,
      appName: WINDOWS_DESKTOP_SMOKE_APP_NAME,
      launchScriptDestName: WINDOWS_DESKTOP_SMOKE_LAUNCH_SCRIPT_DEST_NAME,
      launchScriptPath,
      outputBaseFilename: WINDOWS_DESKTOP_SMOKE_OUTPUT_BASE_FILENAME,
      outputDir: windowsSmokeArtifactDir,
      payloadDir,
      scriptPath: join(tempDir, "windows-smoke-installer.iss"),
      version,
      webView2BootstrapperPath,
    });
  });
};
