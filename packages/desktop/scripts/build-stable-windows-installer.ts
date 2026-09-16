import * as rceditModule from "rcedit";
import {
  assertRecoveryPayloadComplete,
  collectRecoveryPayloadDiagnostics,
  ensureRecoveryPublicDir,
  findWindowsPayloadDir,
  isFreshBuildOutput,
  resolveWindowsInstallerRecoverySource,
} from "./buildStableWindowsInstallerRecovery";
import {
  StableWindowsDiscoveryError,
  buildStableWindowsUpdateJson,
  discoverStableWindowsUpstreamSet,
  stageStableWindowsUploadSet,
} from "./stableWindowsUploadSet";
import { pruneClassicLevelPrebuilds } from "./prune-native-prebuilds";
import { patchElectrobunWindowsCore } from "./patch-electrobun-windows-core";
import { extractWindowsTarball } from "./windows-tarball-extract";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
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
  // 刻意**不注入** NOLO_DESKTOP_SKIP_PATCH。
  //
  // 历史：这里曾硬编码 `NOLO_DESKTOP_SKIP_PATCH: "1"`，而 workflow 的 stable
  // Windows 步骤也设了同一个变量——两处都设，等于把「启用 delta patch 阶段」
  // 这件事永久关闭。macOS/Linux 的 stable 构建从不设它，且一直成功；Windows
  // 是唯一失败的一条，因此该变量是唯一已知差异（2026-09-14 独立复审 HIGH：
  // 只在 workflow 层删除会被此处重新注入而完全短路）。
  //
  // 注意 `build:stable:electrobun` 与 `build:stable` 是**同一条命令**
  // （`electrobun build --env=stable`），所以本函数与 macOS/Linux 的差异只可能是
  // 环境变量，而不是命令本身。
  const proc = Bun.spawn(["bun", "run", "build:stable:electrobun"], {
    cwd: desktopRoot,
    stdin: "ignore",
    stdout: "inherit",
    stderr: "inherit",
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

/**
 * best-effort cosmetic patch：只负责给可执行文件嵌图标，**不承担运行时完整性校验**。
 * 输入文件缺失时静默返回是有意的（调用方在 gate 之后，缺失已不可能）；图标修补
 * 失败也只 warning，因为图标不影响启动。运行时完整性由
 * `assertRecoveryPayloadComplete` 负责，不要把两者混在一起。
 */
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
  /** 安装落点的 channel 段（%LOCALAPPDATA%\<identifier>\<channel>\app）。 */
  appChannel?: string;
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
    .replaceAll("__APP_CHANNEL__", args.appChannel ?? WINDOWS_DESKTOP_CHANNEL)
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


/**
 * 失败诊断：既打印人类可读日志，也写一份**结构化 JSON 工件**。
 *
 * JSON 落在 `artifacts/diagnostics/`（子目录）：它随平台产物一起被上传成 CI
 * artifact，而发布步骤用 `-maxdepth 1 -type f` 收集 Release 资产，因此**天然**
 * 不会被当成发布物——不需要再维护一份排除名单。
 *
 * 诊断本身绝不允许影响失败原因：写入失败只记一行日志。
 */
function logRecoveryPayloadStructure(payloadDir: string) {
  const diagnostics = collectRecoveryPayloadDiagnostics(payloadDir, {
    buildDir,
    rawTarPath,
  });

  log("[diagnostic] recovery payload structure:");
  log(`[diagnostic] buildDir present=${diagnostics.buildDir.present}: ${diagnostics.buildDir.path}`);
  log(`[diagnostic]   entries: ${diagnostics.buildDir.entries.join(", ") || "<empty>"}`);
  log(`[diagnostic] rawTar present=${diagnostics.rawTar.present}: ${diagnostics.rawTar.path}`);
  log(`[diagnostic] payloadDir present=${diagnostics.payloadDir.present}: ${diagnostics.payloadDir.path}`);
  log(`[diagnostic]   entries: ${diagnostics.payloadDir.entries.join(", ") || "<empty>"}`);
  log(`[diagnostic]   bin/: ${diagnostics.payloadBin.entries.join(", ") || "<empty>"}`);
  log(`[diagnostic]   Resources/: ${diagnostics.payloadResources.entries.join(", ") || "<empty>"}`);
  log(
    `[diagnostic] missing: ${diagnostics.missingFiles.map((issue) => `${issue.path}(${issue.reason})`).join(", ") || "<none>"}`,
  );

  const diagnosticsPath = join(artifactDir, "diagnostics", "desktop-payload-structure.json");
  try {
    mkdirSync(join(artifactDir, "diagnostics"), { recursive: true });
    writeFileSync(diagnosticsPath, `${JSON.stringify(diagnostics, null, 2)}\n`, "utf8");
    log(`[diagnostic] wrote structured diagnostics: ${diagnosticsPath}`);
  } catch (error) {
    log(
      `[diagnostic] failed to write structured diagnostics (${error instanceof Error ? error.message : String(error)}); log output above is authoritative`,
    );
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
    // ensureRecoveryPublicDir 早已写好却一直没有调用点：缺 latest-assets.json 的
    // payload 因此直接进安装器。先自愈可自愈的部分（app runtime + public 资产），
    // 再对**无法自愈**的运行时文件 fail closed。
    ensureRecoveryPublicDir(payloadDir, desktopGeneratedPublicDir);
    // fail closed：恢复是「从半成品里抢救」，必须在编译安装器之前断言运行时齐全。
    // 否则会安静地打出缺 bin/bun.exe 的安装器，直到 Windows 安装后 smoke 才报
    // "Missing installed Bun runtime"（2026-09-14 stable 连败实录）。
    try {
      assertRecoveryPayloadComplete(payloadDir);
    } catch (error) {
      // 失败时打印**真实**目录结构：缺件清单只说「缺什么」，不解释「electrobun
      // 到底留下了什么」。此前只能靠跨 job 的日志拼凑，这里一次给全。
      logRecoveryPayloadStructure(payloadDir);
      throw error;
    }
    await pruneClassicLevelPrebuilds(payloadDir);
    // DLL 的 PE 补丁在 gate 之后执行，故其缺失返回值无需再消费；
    // 若 patch 自身失败会自行 fail loud（见 patch-electrobun-windows-core.ts）。
    patchElectrobunWindowsCore(join(payloadDir, "bin", "ElectrobunCore.dll"));
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
      `${JSON.stringify(
        buildStableWindowsUpdateJson({
          version: versionInfo.version,
          hash: versionInfo.hash,
        }),
        null,
        2,
      )}\n`,
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

/**
 * Stable smoke 安装器直接从「可运行 app 载荷」编译。
 *
 * 事故背景（2026-09-15）：Electrobun v2 产出的 `NoloDesktop/` 只是**自解压 stub**
 * ——它的 `bin/launcher.exe` 是解压器本体，只有在 `.installer/<stem>.*` 邻接载荷
 * 或内嵌载荷存在时才能工作；把 stub 当 app 安装并直接启动会打印
 * "Not a valid self-extracting installer"（官方文档：wrapper 首启时解出内层 app）。
 * 因此 smoke 载荷必须取真实 app：setup payload tar（= 发布 update bundle 同一份
 * 文件 `Nolo Desktop-Setup.tar.zst`）解包后的目录；万一上游把 stub 塞进该 tar，
 * 就再下钻一层取 `Resources/<hash>.tar.zst`。两条路都必须解出可运行布局（fail loud）。
 */
const SMOKE_RUNNABLE_MARKER_PATHS = [join("bin", "bun.exe"), join("Resources", "main.js")];

function hasSmokeRunnableMarker(dir: string): boolean {
  return SMOKE_RUNNABLE_MARKER_PATHS.every((relative) => existsSync(join(dir, relative)));
}

function findSingleInnerStubArchive(dir: string): string | null {
  const resourcesDir = join(dir, "Resources");
  if (!existsSync(resourcesDir)) return null;
  const candidates = readdirSync(resourcesDir).filter((name) => /\.tar\.zst$/i.test(name));
  return candidates.length === 1 ? join(resourcesDir, candidates[0]) : null;
}

async function resolveSmokeRunnablePayloadDir(args: {
  payloadTarballPath: string;
  tempDir: string;
}): Promise<string> {
  const outerTempDir = join(args.tempDir, "runnable-payload");
  mkdirSync(outerTempDir, { recursive: true });
  const payloadDir = await extractWindowsTarball(args.payloadTarballPath, outerTempDir);
  if (hasSmokeRunnableMarker(payloadDir)) {
    log(`smoke payload unfolded a runnable app: ${payloadDir}`);
    return payloadDir;
  }
  const innerArchive = findSingleInnerStubArchive(payloadDir);
  if (!innerArchive) {
    throw new Error(
      "stable smoke payload is neither a runnable app nor a single-wrapper stub: " +
        `${payloadDir} (missing ${SMOKE_RUNNABLE_MARKER_PATHS.join(" + ")} and no single Resources/*.tar.zst)`,
    );
  }
  log(`smoke payload tarball carried a wrapper stub; descending into ${basename(innerArchive)}`);
  const innerTempDir = join(args.tempDir, "runnable-inner");
  mkdirSync(innerTempDir, { recursive: true });
  const innerDir = await extractWindowsTarball(innerArchive, innerTempDir);
  if (!hasSmokeRunnableMarker(innerDir)) {
    throw new Error(`wrapper inner archive did not unfold a runnable app: ${innerDir}`);
  }
  return innerDir;
}

async function compileSmokeInstallerFromRunnablePayload(args: {
  payloadTarballPath: string;
  version: string;
  tempDir: string;
}) {
  const launchScriptPath = join(args.tempDir, "Nolo Desktop Smoke.vbs");
  const webView2BootstrapperPath = join(args.tempDir, "MicrosoftEdgeWebview2Setup.exe");
  const scriptPath = join(args.tempDir, "windows-smoke-installer.iss");

  writeFileSync(launchScriptPath, readFileSync(windowsLauncherTemplatePath, "utf8"), "utf8");
  await downloadWebView2Bootstrapper(webView2BootstrapperPath);

  const payloadDir = await resolveSmokeRunnablePayloadDir({
    payloadTarballPath: args.payloadTarballPath,
    tempDir: args.tempDir,
  });
  await applyWindowsExecutableIcon(join(payloadDir, "bin", "launcher.exe"));

  return compileWindowsInstaller({
    appId: WINDOWS_DESKTOP_SMOKE_APP_ID,
    appName: WINDOWS_DESKTOP_SMOKE_APP_NAME,
    launchScriptDestName: WINDOWS_DESKTOP_SMOKE_LAUNCH_SCRIPT_DEST_NAME,
    launchScriptPath,
    outputBaseFilename: WINDOWS_DESKTOP_SMOKE_OUTPUT_BASE_FILENAME,
    outputDir: smokeArtifactDir,
    payloadDir,
    scriptPath,
    version: args.version,
    webView2BootstrapperPath,
  });
}

rmSync(smokeArtifactDir, { recursive: true, force: true });

const scriptStartedAtMs = Date.now();

const exitCode = await runElectrobunStable();
if (exitCode === 0) {
  // Electrobun v2 自体就产出完整 stable 发布形态（Nolo Desktop-Setup.exe /
  // -Setup.tar.zst / -Setup.metadata.json + NoloDesktop/ wrapper）。发布链要求的
  // 上传集合（规范 installer、versioned exe、update bundle、富 schema
  // update.json）由 stableWindowsUploadSet 从这份**本次构建**的输出规范化而来，
  // 不再依赖 v1 的 -Setup.zip 探测或 recovery 拼接。
  // 仅 typed discovery error（输出缺失/过期/畸形）才回退 recovery——这不是
  // blanket catch：其它 IO / 编程错误直接抛出，绝不当成「什么都没找到」。
  let stagedFromV2 = false;
  const uploadSetTempDir = mkdtempSync(join(tmpdir(), "nolo-desktop-win-upload-set-"));
  try {
    const upstream = discoverStableWindowsUpstreamSet({
      buildDir,
      runStartedAtMs: scriptStartedAtMs,
      fallbackVersion: readDesktopPackageVersion(),
      fallbackHash: process.env.NOLO_BUILD_SHA?.trim() || process.env.GITHUB_SHA?.trim(),
    });
    const stagedUploadSet = stageStableWindowsUploadSet({ upstream, artifactDir });
    const smokeInstallerPath = await compileSmokeInstallerFromRunnablePayload({
      payloadTarballPath: upstream.updateBundlePath,
      version: upstream.version,
      tempDir: uploadSetTempDir,
    });
    log(
      `staged Electrobun v2 stable upload set in ${artifactDir}: ` +
        `${basename(stagedUploadSet.installerPath)}, ${basename(stagedUploadSet.versionedInstallerPath)}, ` +
        `${basename(stagedUploadSet.setupZipPath)}, ${basename(stagedUploadSet.updateBundlePath)}, ` +
        `${basename(stagedUploadSet.updateJsonPath)}`,
    );
    log(`built side-by-side smoke installer from the runnable app payload: ${smokeInstallerPath}`);
    stagedFromV2 = true;
  } catch (error) {
    if (!(error instanceof StableWindowsDiscoveryError)) {
      throw error;
    }
    log(
      `Electrobun v2 stable output was not usable for the upload set (${error.message}); attempting recovery`,
    );
  } finally {
    rmSync(uploadSetTempDir, { recursive: true, force: true });
  }
  if (stagedFromV2) {
    process.exit(0);
  }
  // electrobun 原生 postPackage 并不保证产出 smoke installer（artifact 探测
  // 找不到 -Setup.zip/tarball 时 post-package 直接 exit(0)，smoke-artifacts
  // 目录为空）。stable smoke 步骤无条件期待该文件，缺失即连败
  // （public run 34374530935 等 "Missing Windows setup artifact" 连败）。
  // exit 0 时校验产物，缺失则从 payload 目录补产一次。
  //
  // 不能只凭路径存在就早退：那会让「目录清理失败」或「其它步骤放入旧产物」绕过
  // 后续所有校验（2026-09-14 跨家族复审的 MEDIUM）。该目录在运行 electrobun 前
  // 已被清空，因此「mtime 不早于本次脚本启动」等价于「本次构建产出」。
  const expectedSmokeSetup = join(smokeArtifactDir, `${WINDOWS_DESKTOP_SMOKE_OUTPUT_BASE_FILENAME}.exe`);
  if (isFreshBuildOutput(expectedSmokeSetup, scriptStartedAtMs)) {
    // 早退同样必须验 payload：mtime 只证明「本次产出」，不证明产物内容可用，
    // 而安装器与 payload 同源。
    //
    // 校验失败时**回退 recovery**，而不是直接抛错：recovery 会用同一份 payload
    // 给出精确缺件清单，或在布局变化时真正补产，避免把「本可通过的构建」误杀
    // （2026-09-14 独立复审 HIGH）。回退路径自身仍是 fail closed —— recovery 的
    // 断言会拦住不完整 payload。
    try {
      assertRecoveryPayloadComplete(findWindowsPayloadDir(buildDir));
      process.exit(0);
    } catch (error) {
      log(
        `early-return payload validation failed (${error instanceof Error ? error.message : String(error)}); falling back to recovery`,
      );
    }
  }
  if (existsSync(expectedSmokeSetup)) {
    log(
      `electrobun stable build left a smoke installer at ${expectedSmokeSetup} that could not be accepted as this run's verified output; refusing to reuse it and attempting recovery instead`,
    );
  }
  log("electrobun stable build did not produce the smoke installer; attempting recovery");
  await recoverInstallerFromRawTar();
  process.exit(0);
}

log(`electrobun stable build exited with ${exitCode}; attempting Windows installer recovery`);
await recoverInstallerFromRawTar();
