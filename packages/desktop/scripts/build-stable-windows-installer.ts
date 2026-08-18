import * as rceditModule from "rcedit";
import {
  findWindowsPayloadDir,
  resolveWindowsInstallerRecoverySource,
} from "./buildStableWindowsInstallerRecovery";
import { pruneClassicLevelPrebuilds } from "./prune-native-prebuilds";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

type Rcedit = (exePath: string, options: { icon?: string }) => Promise<void>;

type WindowsVersionInfo = {
  version?: string;
  hash?: string;
  channel?: string;
  baseUrl?: string;
  name?: string;
  identifier?: string;
};

type DesktopPackageJson = {
  version?: string;
};

const WINDOWS_DESKTOP_APP_NAME = "Nolo Desktop";
const WINDOWS_DESKTOP_APP_ID = "chat.nolo.desktop";
const WINDOWS_DESKTOP_APP_FILE_NAME = "NoloDesktop";
const WINDOWS_DESKTOP_LAUNCH_SCRIPT_DEST_NAME = "Nolo Desktop.vbs";
const WINDOWS_DESKTOP_SMOKE_APP_NAME = "Nolo Desktop Smoke";
const WINDOWS_DESKTOP_SMOKE_APP_ID = "chat.nolo.desktop.smoke";
const WINDOWS_DESKTOP_SMOKE_LAUNCH_SCRIPT_DEST_NAME = "Nolo Desktop Smoke.vbs";
const WINDOWS_DESKTOP_SMOKE_OUTPUT_BASE_FILENAME = "NoloDesktop-Smoke-Setup";
const WINDOWS_DESKTOP_CHANNEL = "stable";
const WEBVIEW2_BOOTSTRAPPER_URL =
  "https://go.microsoft.com/fwlink/p/?LinkId=2124703";
const ELECTROBUN_RELEASE_BASE_URL =
  process.env.ELECTROBUN_RELEASE_BASE_URL ?? "https://nolo.chat/public/downloads";

const desktopRoot = resolve(import.meta.dir, "..");
const repoRoot = resolve(desktopRoot, "..", "..");
const artifactDir = join(desktopRoot, "artifacts");
const smokeArtifactDir = join(desktopRoot, "smoke-artifacts");
const buildDir = join(desktopRoot, "build", "stable-win-x64");
const desktopGeneratedPublicDir = join(desktopRoot, ".generated", "public");
const desktopBunEntrypoint = join(desktopRoot, "src", "bun", "index.ts");
// electrobun generates the tar using sanitizeAppName("Nolo Desktop") -> "NoloDesktop",
// so the actual tar name is "NoloDesktop.tar", not "Nolo Desktop-Setup.tar".
const electrobunTarName = "NoloDesktop.tar";
const rawTarPath = join(buildDir, electrobunTarName);
const outputBaseFilename = "stable-win-x64-NoloDesktop-Setup";
const appIconIcoPath = join(desktopRoot, "assets", "icon.ico");
const windowsLauncherTemplatePath = join(desktopRoot, "assets", "windows-launcher.vbs");
const windowsInstallerTemplatePath = join(desktopRoot, "assets", "windows-installer.iss");
const DEFAULT_WINDOWS_INSTALLER_COMPRESSION = "lzma2/max";
const DEFAULT_WINDOWS_INSTALLER_SOLID_COMPRESSION = "yes";
const desktopBunBuildExternals = [
  "react-native",
  "react-native/*",
  "electron",
  "react-native-blob-util",
  "playwright",
  "playwright-core",
  "playwright-core/*",
  "chromium-bidi",
  "chromium-bidi/*",
  "classic-level",
];
const desktopRuntimeCopyEntries = [
  {
    source: join(repoRoot, "node_modules", "abstract-level"),
    target: join("app", "node_modules", "abstract-level"),
  },
  {
    source: join(repoRoot, "node_modules", "classic-level"),
    target: join("app", "node_modules", "classic-level"),
  },
  {
    source: join(repoRoot, "node_modules", "is-buffer"),
    target: join("app", "node_modules", "is-buffer"),
  },
  {
    source: join(repoRoot, "node_modules", "level-supports"),
    target: join("app", "node_modules", "level-supports"),
  },
  {
    source: join(repoRoot, "node_modules", "level-transcoder"),
    target: join("app", "node_modules", "level-transcoder"),
  },
  {
    source: join(repoRoot, "node_modules", "maybe-combine-errors"),
    target: join("app", "node_modules", "maybe-combine-errors"),
  },
  {
    source: join(repoRoot, "node_modules", "module-error"),
    target: join("app", "node_modules", "module-error"),
  },
  {
    source: join(repoRoot, "node_modules", "node-gyp-build"),
    target: join("app", "node_modules", "node-gyp-build"),
  },
  {
    source: join(repoRoot, "packages", "integrations", "x-reader"),
    target: join("integrations", "x-reader"),
  },
];

const rcedit =
  (rceditModule as unknown as { default?: Rcedit; rcedit?: Rcedit }).default ??
  (rceditModule as unknown as { rcedit?: Rcedit }).rcedit ??
  (rceditModule as unknown as Rcedit);

function log(message: string) {
  console.log(`[desktop-windows-stable] ${message}`);
}

function resolveWindowsInstallerCompression() {
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
        "Set NOLO_WINDOWS_INSTALLER_ALLOW_UNCOMPRESSED=1 only for a temporary diagnostic artifact.",
    );
  }

  return { compression, solidCompression };
}

function readDesktopPackageVersion() {
  const packageJsonPath = join(desktopRoot, "package.json");
  const parsed = JSON.parse(readFileSync(packageJsonPath, "utf8")) as DesktopPackageJson;
  const version = parsed.version?.trim();
  if (!version) {
    throw new Error(`Missing desktop package version in ${packageJsonPath}`);
  }
  return version;
}

function resolveRecoveryBuildHash() {
  const hash = process.env.NOLO_BUILD_SHA?.trim() || process.env.GITHUB_SHA?.trim();
  if (!hash) {
    throw new Error("Missing NOLO_BUILD_SHA/GITHUB_SHA for Windows installer recovery");
  }
  return hash;
}

function completeRecoveryVersionInfo(
  versionInfo: Pick<WindowsVersionInfo, "version" | "hash"> & Partial<WindowsVersionInfo>,
): Required<WindowsVersionInfo> {
  const version = versionInfo.version?.trim();
  const hash = versionInfo.hash?.trim();
  if (!version) {
    throw new Error("Missing version for Windows installer recovery metadata");
  }
  if (!hash) {
    throw new Error("Missing hash for Windows installer recovery metadata");
  }

  return {
    version,
    hash,
    channel: versionInfo.channel?.trim() || WINDOWS_DESKTOP_CHANNEL,
    baseUrl: versionInfo.baseUrl?.trim() || ELECTROBUN_RELEASE_BASE_URL,
    name: versionInfo.name?.trim() || WINDOWS_DESKTOP_APP_FILE_NAME,
    identifier: versionInfo.identifier?.trim() || WINDOWS_DESKTOP_APP_ID,
  };
}

async function runElectrobunStable() {
  const proc = Bun.spawn(["bun", "run", "build:stable:electrobun"], {
    cwd: desktopRoot,
    stdin: "ignore",
    stdout: "inherit",
    stderr: "inherit",
    env: {
      ...process.env,
      NOLO_DESKTOP_SKIP_PATCH: "1",
    },
  });
  return proc.exited;
}

function readPayloadVersion(payloadDir: string): Required<WindowsVersionInfo> {
  const versionJsonPath = join(payloadDir, "Resources", "version.json");
  if (!existsSync(versionJsonPath)) {
    const fallbackVersionInfo = completeRecoveryVersionInfo({
      version: readDesktopPackageVersion(),
      hash: resolveRecoveryBuildHash(),
    });
    writeFileSync(`${versionJsonPath}`, `${JSON.stringify(fallbackVersionInfo, null, 2)}\n`, "utf8");
    return fallbackVersionInfo;
  }

  const parsed = JSON.parse(readFileSync(versionJsonPath, "utf8")) as WindowsVersionInfo;
  const versionInfo = completeRecoveryVersionInfo(parsed);
  if (!parsed.version?.trim()) {
    throw new Error(`Missing version in ${versionJsonPath}`);
  }
  if (!parsed.hash?.trim()) {
    throw new Error(`Missing hash in ${versionJsonPath}`);
  }

  if (
    parsed.channel !== versionInfo.channel ||
    parsed.baseUrl !== versionInfo.baseUrl ||
    parsed.name !== versionInfo.name ||
    parsed.identifier !== versionInfo.identifier
  ) {
    writeFileSync(versionJsonPath, `${JSON.stringify(versionInfo, null, 2)}\n`, "utf8");
    log(`completed recovery version metadata: ${versionJsonPath}`);
  }

  return versionInfo;
}

async function ensureRecoveryAppRuntime(payloadDir: string) {
  const resourcesDir = join(payloadDir, "Resources");
  const bundledEntryPath = join(resourcesDir, "app", "bun", "index.js");
  if (!existsSync(bundledEntryPath)) {
    const buildResult = await Bun.build({
      entrypoints: [desktopBunEntrypoint],
      outdir: join(resourcesDir, "app", "bun"),
      target: "bun",
      format: "esm",
      external: desktopBunBuildExternals,
      naming: "index.js",
      minify: true,
      sourcemap: "none",
    });

    if (!buildResult.success) {
      const messages = buildResult.logs.map((entry) => entry.message).join("\n");
      throw new Error(`Failed to rebuild Windows recovery Bun entrypoint:\n${messages}`);
    }

    if (!existsSync(bundledEntryPath)) {
      throw new Error(`Windows recovery rebuilt Bun entrypoint is missing: ${bundledEntryPath}`);
    }

    log(`rebuilt recovery Bun entrypoint: ${bundledEntryPath}`);
  }

  for (const entry of desktopRuntimeCopyEntries) {
    if (!existsSync(entry.source)) {
      throw new Error(`Missing desktop recovery runtime copy source: ${entry.source}`);
    }
    const targetPath = join(resourcesDir, entry.target);
    rmSync(targetPath, { recursive: true, force: true });
    mkdirSync(dirname(targetPath), { recursive: true });
    cpSync(entry.source, targetPath, { recursive: true, force: true });
  }
}

function ensureRecoveryPublicDir(payloadDir: string) {
  const packagedPublicDir = join(payloadDir, "Resources", "app", "public");
  const packagedLatestAssetsPath = join(packagedPublicDir, "latest-assets.json");
  if (existsSync(packagedLatestAssetsPath)) {
    return;
  }

  if (!existsSync(desktopGeneratedPublicDir)) {
    throw new Error(
      `Missing desktop generated public assets for Windows installer recovery: ${desktopGeneratedPublicDir}`,
    );
  }

  rmSync(packagedPublicDir, { recursive: true, force: true });
  mkdirSync(join(payloadDir, "Resources", "app"), { recursive: true });
  cpSync(desktopGeneratedPublicDir, packagedPublicDir, { recursive: true, force: true });

  if (!existsSync(packagedLatestAssetsPath)) {
    throw new Error(
      `Windows installer recovery copied public assets but latest-assets.json is still missing: ${packagedLatestAssetsPath}`,
    );
  }

  log(`restored packaged public assets for recovery payload: ${packagedPublicDir}`);
}

async function applyWindowsExecutableIcon(exePath: string) {
  if (!existsSync(exePath)) {
    return;
  }

  try {
    await rcedit(exePath, {
      icon: appIconIcoPath,
    });
  } catch (error: any) {
    console.warn(
      `[desktop-windows-stable] Windows executable icon patch skipped for ${exePath}: ${
        error?.message ?? error
      }`,
    );
  }
}

function findInnoSetupCompiler() {
  const candidates = [
    process.env.NOLO_INNO_SETUP_COMPILER,
    process.env.USERPROFILE
      ? join(process.env.USERPROFILE, "tools", "InnoSetup", "ISCC.exe")
      : null,
    process.env.LOCALAPPDATA
      ? join(process.env.LOCALAPPDATA, "Programs", "Inno Setup 6", "ISCC.exe")
      : null,
    process.env.LOCALAPPDATA
      ? join(process.env.LOCALAPPDATA, "Programs", "Inno Setup", "ISCC.exe")
      : null,
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
}

async function downloadWebView2Bootstrapper(destPath: string) {
  const response = await fetch(WEBVIEW2_BOOTSTRAPPER_URL);
  if (!response.ok) {
    throw new Error(`failed to download WebView2 bootstrapper: HTTP ${response.status}`);
  }

  const body = new Uint8Array(await response.arrayBuffer());
  if (body.length < 1024 * 1024) {
    throw new Error(
      `downloaded WebView2 bootstrapper is unexpectedly small: ${body.length} bytes`,
    );
  }

  writeFileSync(destPath, body);
}

function renderWindowsInstallerScript(args: {
  appId?: string;
  appName?: string;
  appIdentifier?: string;
  launchScriptDestName?: string;
  launchScriptPath: string;
  outputBaseFilename?: string;
  outputDir: string;
  payloadDir: string;
  version: string;
  webView2BootstrapperPath: string;
}) {
  const { compression, solidCompression } = resolveWindowsInstallerCompression();
  const template = readFileSync(windowsInstallerTemplatePath, "utf8");
  const appId = args.appId ?? WINDOWS_DESKTOP_APP_ID;
  return template
    .replaceAll("__APP_NAME__", args.appName ?? WINDOWS_DESKTOP_APP_NAME)
    .replaceAll("__APP_VERSION__", args.version)
    .replaceAll("__APP_ID__", appId)
    .replaceAll("__APP_IDENTIFIER__", args.appIdentifier ?? appId)
    .replaceAll("__SOURCE_DIR__", args.payloadDir)
    .replaceAll("__OUTPUT_DIR__", args.outputDir)
    .replaceAll("__OUTPUT_BASE_FILENAME__", args.outputBaseFilename ?? outputBaseFilename)
    .replaceAll("__SETUP_ICON_FILE__", appIconIcoPath)
    .replaceAll("__LAUNCH_SCRIPT_FILE__", args.launchScriptPath)
    .replaceAll(
      "__LAUNCH_SCRIPT_DEST_NAME__",
      args.launchScriptDestName ?? WINDOWS_DESKTOP_LAUNCH_SCRIPT_DEST_NAME,
    )
    .replaceAll("__WEBVIEW2_BOOTSTRAPPER_FILE__", args.webView2BootstrapperPath)
    .replaceAll("__INSTALLER_COMPRESSION__", compression)
    .replaceAll("__INSTALLER_SOLID_COMPRESSION__", solidCompression);
}

async function compileWindowsInstaller(args: {
  appId?: string;
  appName?: string;
  launchScriptDestName?: string;
  launchScriptPath: string;
  outputBaseFilename?: string;
  outputDir: string;
  payloadDir: string;
  scriptPath: string;
  version: string;
  webView2BootstrapperPath: string;
}) {
  const innoCompiler = findInnoSetupCompiler();
  if (!innoCompiler) {
    throw new Error(
      "ISCC.exe is required to build the public Windows installer. Install Inno Setup or set NOLO_INNO_SETUP_COMPILER.",
    );
  }

  mkdirSync(args.outputDir, { recursive: true });
  writeFileSync(args.scriptPath, renderWindowsInstallerScript(args), "utf8");

  const outputInstallerPath = join(
    args.outputDir,
    `${args.outputBaseFilename ?? outputBaseFilename}.exe`,
  );
  if (existsSync(outputInstallerPath)) {
    rmSync(outputInstallerPath, { force: true });
  }

  const compileProc = Bun.spawn([innoCompiler, args.scriptPath], {
    stdout: "inherit",
    stderr: "inherit",
  });
  const compileExitCode = await compileProc.exited;
  if (compileExitCode !== 0) {
    throw new Error(`Inno Setup compilation failed with exit code ${compileExitCode}`);
  }

  return outputInstallerPath;
}

async function extractTar(tarPath: string, tempDir: string) {
  const proc = Bun.spawn(["tar", "-xf", tarPath, "-C", tempDir], {
    cwd: repoRoot,
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`failed to extract ${tarPath} with exit code ${exitCode}`);
  }
}

async function recoverInstallerFromRawTar() {
  if (process.platform !== "win32") {
    throw new Error("Windows installer recovery is only supported on Windows.");
  }

  const recoverySource = resolveWindowsInstallerRecoverySource({
    buildDir,
    rawTarPath,
  });

  log(
    recoverySource.kind === "payload-dir"
      ? `recovering installer from existing payload directory: ${recoverySource.path}`
      : `recovering installer from raw payload tar: ${recoverySource.path}`,
  );
  mkdirSync(artifactDir, { recursive: true });

  const tempDir = mkdtempSync(join(tmpdir(), "nolo-desktop-win-installer-recovery-"));
  try {
    if (recoverySource.kind === "payload-dir") {
      cpSync(recoverySource.path, join(tempDir, basename(recoverySource.path)), {
        recursive: true,
      });
    } else {
      await extractTar(recoverySource.path, tempDir);
    }

    const payloadDir = findWindowsPayloadDir(tempDir);
    await ensureRecoveryAppRuntime(payloadDir);
    await pruneClassicLevelPrebuilds(payloadDir);
    await applyWindowsExecutableIcon(join(payloadDir, "bin", "bun.exe"));
    await applyWindowsExecutableIcon(join(payloadDir, "bin", "launcher.exe"));

    const versionInfo = readPayloadVersion(payloadDir);
    const launchScriptPath = join(tempDir, "Nolo Desktop.vbs");
    const webView2BootstrapperPath = join(tempDir, "MicrosoftEdgeWebview2Setup.exe");
    const installerScriptPath = join(tempDir, "windows-installer.iss");

    writeFileSync(launchScriptPath, readFileSync(windowsLauncherTemplatePath, "utf8"), "utf8");
    await downloadWebView2Bootstrapper(webView2BootstrapperPath);
    const outputInstallerPath = await compileWindowsInstaller({
      launchScriptPath,
      outputDir: artifactDir,
      payloadDir,
      scriptPath: installerScriptPath,
      version: versionInfo.version,
      webView2BootstrapperPath,
    });

    const versionedInstallerPath = join(
      artifactDir,
      `${outputBaseFilename}-${versionInfo.version}.exe`,
    );
    cpSync(outputInstallerPath, versionedInstallerPath);
    writeFileSync(
      join(artifactDir, "stable-win-x64-update.json"),
      `${JSON.stringify({
        version: versionInfo.version,
        hash: versionInfo.hash,
        platform: "win",
        arch: "x64",
      })}\n`,
      "utf8",
    );

    await compileWindowsInstaller({
      appId: WINDOWS_DESKTOP_SMOKE_APP_ID,
      appName: WINDOWS_DESKTOP_SMOKE_APP_NAME,
      launchScriptDestName: WINDOWS_DESKTOP_SMOKE_LAUNCH_SCRIPT_DEST_NAME,
      launchScriptPath,
      outputBaseFilename: WINDOWS_DESKTOP_SMOKE_OUTPUT_BASE_FILENAME,
      outputDir: smokeArtifactDir,
      payloadDir,
      scriptPath: join(tempDir, "windows-smoke-installer.iss"),
      version: versionInfo.version,
      webView2BootstrapperPath,
    });

    log(`recovered ${outputInstallerPath}`);
    log(`wrote stable-win-x64-update.json with hash ${versionInfo.hash}`);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

rmSync(smokeArtifactDir, { recursive: true, force: true });

const exitCode = await runElectrobunStable();
if (exitCode === 0) {
  process.exit(0);
}

log(`electrobun stable build exited with ${exitCode}; attempting Windows installer recovery`);
await recoverInstallerFromRawTar();
