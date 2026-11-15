import { t } from "./i18n";
import { existsSync, readFileSync, accessSync, constants, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeServerOrigin } from "core/serverOrigin";
import { DEFAULT_NOLO_SERVER_URL } from "./defaultServer";
import { loadProfileConfig } from "./client/profileConfig";
import { resolveDefaultSpawn, type SpawnFn, type SpawnedProcess } from "./processSpawn";
import { isCompiledBinary } from "./cliEnvHelpers";
import {
  scheduleWindowsSelfUpdate,
  type WindowsUpdateLaunchOptions,
} from "./windowsSelfUpdate";

export type CliReleaseChannel = "alpha" | "latest";

type PackageInfo = {
  name: string;
  version: string;
};

export type CliInstallKind = "npm-global" | "standalone-bundle";

type DoctorInfo = {
  packageName: string;
  version: string;
  entrypoint: string;
  serverUrl: string;
  profileName: string;
  installKind: CliInstallKind;
  updateChannel: CliReleaseChannel;
};

type RunSelfUpdateOptions = {
  output?: NodeJS.WritableStream;
  spawn?: SpawnFn;
  entrypointPath?: string;
  serverUrl?: string;
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
  scheduleWindowsUpdate?: (
    options: WindowsUpdateLaunchOptions,
  ) => { helperPid: number; logPath: string };
};

export type SelfUpdateExecution = {
  exitCode: number;
  disposition: "completed" | "scheduled";
};

type SpawnOutputChunk = string | ArrayBuffer | ArrayBufferView;

function resolvePackageJsonPath(): string | null {
  if (isCompiledBinary()) {
    // In a Bun-compiled binary, import.meta.url points into a virtual
    // bunfs root. Look for a package.json next to the real executable,
    // which native packages ship alongside the binary.
    const execDir = dirname(realpathSync(process.execPath));
    const candidate = join(execDir, "package.json");
    if (existsSync(candidate)) return candidate;
    return null;
  }
  const CLI_DIR = dirname(fileURLToPath(import.meta.url));
  const candidate = join(CLI_DIR, "package.json");
  return existsSync(candidate) ? candidate : null;
}

const PACKAGE_JSON_PATH = resolvePackageJsonPath();

export function getCliInstallChannel(serverUrl?: string | null): CliReleaseChannel {
  const normalized = normalizeServerOrigin(serverUrl);
  if (!normalized) {
    return "latest";
  }
  try {
    const hostname = new URL(normalized).hostname.toLowerCase();
    if (hostname === "us.nolo.chat" || hostname.endsWith(".us.nolo.chat")) {
      return "alpha";
    }
  } catch {
    if (/us\.nolo\.chat/i.test(normalized)) {
      return "alpha";
    }
  }
  return "latest";
}

export function renderProgressBar(percent: number, width = 30): string {
  const pct = Math.max(0, Math.min(100, percent));
  const filledLen = Math.round((width * pct) / 100);
  const emptyLen = width - filledLen;
  const bar = "#".repeat(filledLen) + " ".repeat(emptyLen);
  const pctText = pct.toFixed(1).padStart(5, " ");
  return `[${bar}] ${pctText}%`;
}

export function buildNpmSelfUpdateCommand(channel: CliReleaseChannel = "latest") {
  return ["npm", "install", "-g", `nolo-cli@${channel}`, "--force", "--progress"];
}

/**
 * Resolve the tarball name + extract subdir for the current host platform.
 * Mirrors install-nolo.sh's `uname -sm` case. Returns null on unsupported
 * platforms so the caller can fall back to the npm path or error out.
 */
export function resolveStandaloneBundlePlatform(
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch,
): { tarballName: string; extractSubdir: string } | null {
  if (platform === "linux" && arch === "x64") {
    return { tarballName: "nolo-linux-x64.tar.gz", extractSubdir: "nolo-linux-x64" };
  }
  if (platform === "darwin" && arch === "arm64") {
    return { tarballName: "nolo-darwin-arm64.tar.gz", extractSubdir: "nolo-darwin-arm64" };
  }
  return null;
}

/**
 * Pick the tarball download base for a release channel. alpha pulls from
 * us.nolo.chat (where new bundles land first), latest pulls from nolo.chat.
 * Mirrors install-nolo.sh's NOLO_INSTALL_REPO default.
 */
export function resolveStandaloneBundleRepoBase(channel: CliReleaseChannel): string {
  return channel === "alpha" ? "https://us.nolo.chat" : "https://nolo.chat";
}

/**
 * Build the manual-update hint shown by `nolo doctor`. For standalone-bundle
 * installs this points at the install.sh curl pipe instead of npm.
 */
export function buildStandaloneManualUpdateHint(channel: CliReleaseChannel): string {
  const repoBase = resolveStandaloneBundleRepoBase(channel);
  if (channel === "alpha") {
    // 主站只把 install-nolo.sh 这个别名对外提供，脚本本身与渠道无关：
    // alpha 必须靠 env 显式选择，否则拿到的是 stable 固定对象。
    return `curl -fsSL ${repoBase}/install-nolo.sh | NOLO_INSTALL_CHANNEL=alpha sh`;
  }
  return `curl -fsSL ${repoBase}/install-nolo.sh | sh`;
}

/**
 * Fixed tarball name for a release channel. Mirrors install-nolo.sh's
 * NOLO_INSTALL_CHANNEL: latest → nolo-<platform>.tar.gz, alpha →
 * nolo-<platform>-alpha.tar.gz. The two names are disjoint on purpose: a
 * failed alpha download must never fall back onto a stable bundle (or the
 * other way round). Versioned copies keep the release's original name, which
 * already carries `-alpha.N`, so they are not suffixed here.
 */
export function buildStandaloneBundleTarballName(
  tarballName: string,
  channel: CliReleaseChannel,
): string {
  if (channel !== "alpha") return tarballName;
  const suffix = ".tar.gz";
  const stem = tarballName.endsWith(suffix)
    ? tarballName.slice(0, -suffix.length)
    : tarballName;
  return `${stem}-alpha.tar.gz`;
}

/**
 * Resolve the install directory for the standalone binary symlink. Mirrors
 * install-nolo.sh's install_dir(): prefer /usr/local/bin if writable, else
 * ~/.local/bin, else ~/.nolo/bin. We cannot use dirname(process.execPath)
 * because in a Bun --compile binary process.execPath resolves the symlink to
 * the real binary under ~/.nolo/<platform>/, not the symlink location on PATH.
 */
function resolveStandaloneInstallDir(): string {
  const candidates = [
    "/usr/local/bin",
    join(homedir(), ".local/bin"),
    join(homedir(), ".nolo/bin"),
  ];
  for (const dir of candidates) {
    if (!existsSync(dir)) continue;
    try {
      accessSync(dir, constants.W_OK);
      return dir;
    } catch {
      // exists but not writable — try next candidate (matches install.sh -w)
      continue;
    }
  }
  // Last resort: ~/.nolo/bin (install.sh creates it if missing).
  return join(homedir(), ".nolo/bin");
}

export function readPackageInfo(): PackageInfo {
  if (PACKAGE_JSON_PATH) {
    try {
      const raw = readFileSync(PACKAGE_JSON_PATH, "utf8");
      const parsed = JSON.parse(raw) as Partial<PackageInfo>;
      return {
        name: parsed.name || "nolo-cli",
        version: parsed.version || "0.0.0",
      };
    } catch {
      // Fall through to env defaults.
    }
  }
  return {
    name: process.env.NOLO_CLI_PACKAGE_NAME || "nolo-cli",
    version: process.env.NOLO_CLI_VERSION || "0.0.0",
  };
}

export function buildCliVersionText(info: PackageInfo) {
  return `${info.name} ${info.version}`;
}

export function buildSelfUpdateCommand(serverUrl?: string | null) {
  return buildNpmSelfUpdateCommand(getCliInstallChannel(serverUrl));
}

export function resolveSelfUpdateServerUrl(
  env: NodeJS.ProcessEnv = process.env,
  override?: string,
) {
  if (override?.trim()) {
    return normalizeServerOrigin(override);
  }
  const fromEnv = env.NOLO_SERVER || env.BASE_URL;
  if (typeof fromEnv === "string" && fromEnv.trim()) {
    return normalizeServerOrigin(fromEnv);
  }
  const profile = loadProfileConfig();
  const profileUrl = profile?.profiles?.[profile.currentProfile]?.serverUrl;
  if (profileUrl?.trim()) {
    return normalizeServerOrigin(profileUrl);
  }
  return DEFAULT_NOLO_SERVER_URL;
}

export function buildCliDoctorText(info: DoctorInfo) {
  return [
    t("updateDoctorTitle"),
    "---------------",
    t("updateDoctorVersion", info.packageName, info.version),
    t("updateDoctorInstall", info.installKind),
    t("updateDoctorChannel", info.updateChannel),
    t("updateDoctorEntry", info.entrypoint),
    t("updateDoctorServer", info.serverUrl),
    t("updateDoctorProfile", info.profileName),
    t("updateDoctorCommand"),
    "",
    t("updateDoctorDiff"),
    t("updateDoctorOlder"),
    "",
    t("updateDoctorManual", info.installKind === "standalone-bundle" ? buildStandaloneManualUpdateHint(info.updateChannel) : buildNpmSelfUpdateCommand(info.updateChannel).join(" ")),
  ].join("\n");
}

function isRunSelfUpdateOptions(
  value: NodeJS.WritableStream | RunSelfUpdateOptions,
): value is RunSelfUpdateOptions {
  return (
    typeof value === "object" &&
    value !== null &&
    ("output" in value ||
      "spawn" in value ||
      "entrypointPath" in value ||
      "serverUrl" in value ||
      "env" in value ||
      "platform" in value ||
      "scheduleWindowsUpdate" in value)
  );
}

async function forwardSpawnOutput(
  stream: AsyncIterable<SpawnOutputChunk> | null | undefined,
  output: NodeJS.WritableStream,
) {
  if (!stream) {
    return;
  }

  for await (const chunk of stream) {
    output.write(normalizeSpawnChunk(chunk));
  }
}

function normalizeSpawnChunk(
  chunk: SpawnOutputChunk,
): string | Uint8Array<ArrayBufferLike> {
  if (typeof chunk === "string" || chunk instanceof Uint8Array) {
    return chunk;
  }

  if (chunk instanceof ArrayBuffer) {
    return new Uint8Array(chunk);
  }

  return new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
}

/**
 * Run a self-spawned shell command and forward its stdout/stderr into the
 * given output stream. Returns the process exit code. Mirrors the spawn
 * plumbing used by the npm path so update output is visible in both the
 * TUI sink and inherited-stdio production mode.
 */
async function runShellScript(
  script: string,
  {
    output,
    spawn,
    env,
    cwd,
    useCustomSink,
  }: {
    output: NodeJS.WritableStream;
    spawn: SpawnFn;
    env: NodeJS.ProcessEnv;
    cwd?: string;
    useCustomSink: boolean;
  },
): Promise<number> {
  const proc: SpawnedProcess = spawn({
    cmd: ["sh", "-c", script],
    cwd,
    // Capture mode (TUI sink): ignore stdin — the TUI's own decoder is
    // reading the tty, and a child that reads stdin would race it for keys.
    // The inherit branch is unreachable inside the TUI (useCustomSink is
    // always true there) and stays the correct choice for `nolo update`.
    stdin: useCustomSink ? "ignore" : "inherit",
    stdout: useCustomSink ? "pipe" : "inherit",
    stderr: useCustomSink ? "pipe" : "inherit",
    env,
  });

  if (!useCustomSink) {
    return proc.exited;
  }

  const [exitCode] = await Promise.all([
    proc.exited,
    forwardSpawnOutput(proc.stdout, output),
    forwardSpawnOutput(proc.stderr, output),
  ]);
  return exitCode;
}

/** POSIX npm bootstrap/update: retain the global package and all managed builds. */
export function buildManagedNpmUpdateScript(channel: CliReleaseChannel): string {
  return `set -eu
PREFIX=$(npm prefix -g)
ENTRY="$PREFIX/bin/nolo"
ROOT="\${NOLO_HOME:-$HOME/.nolo}/cli/versions"
mkdir -p "$ROOT" "\${ENTRY%/*}"
STAGING=$(mktemp -d "$ROOT/npm.XXXXXXXX")
# npm writes only into the newly reserved prefix, never the global package.
npm install -g --prefix "$STAGING" ${shellQuote(`nolo-cli@${channel}`)} --progress
PACKAGE="$STAGING/lib/node_modules/nolo-cli"
node -e 'const p=require(process.argv[1]); if(p.name!=="nolo-cli" || !/^[0-9]+\\.[0-9]+\\.[0-9]+(?:[-+][0-9A-Za-z.+-]+)?$/.test(p.version)) process.exit(1)' "$PACKAGE/package.json"
VERSION_TEXT=$("$PACKAGE/index.js" -v)
case "$VERSION_TEXT" in
  "nolo-cli "*) ;;
  *) echo "Error: invalid staged CLI version" >&2; exit 1 ;;
esac
# Fail before touching the live entry. Version is a health check, not identity:
# every install has a unique permanent prefix, including same-version builds.
EXPECTED=$(node -p 'require(process.argv[1]).version' "$PACKAGE/package.json")
[ "$VERSION_TEXT" = "nolo-cli $EXPECTED" ]
if [ -d "$ENTRY" ] || { [ -e "$ENTRY" ] && [ ! -L "$ENTRY" ]; }; then echo "Error: refusing non-symlink entrypoint; retain it and migrate explicitly" >&2; exit 1; fi
LINK="$ENTRY.new.$$"
if [ -e "$LINK" ] || [ -L "$LINK" ]; then exit 1; fi
ln -s "$PACKAGE/index.js" "$LINK"
mv -f "$LINK" "$ENTRY"
echo "nolo updated to $ENTRY"
`;
}

type StandaloneUpdateScriptArgs = {
  tarballUrl: string;
  fallbackUrl: string;
  extractDir: string;
  symlinkPath: string;
  currentVersion: string;
};

function shellQuote(value: string): string {
  return "'" + value.replace(/'/g, "'\\''") + "'";
}

/** POSIX sh only: no pipefail, pipelines, or GNU-only mv flags. */
export function buildStandaloneUpdateScript(args: StandaloneUpdateScriptArgs): string {
  const curl = "curl -fL --progress-bar --connect-timeout 20 --max-time 600 --speed-limit 1 --speed-time 60";
  return `set -eu
EXTRACT_DIR=${shellQuote(args.extractDir)}
ENTRY=${shellQuote(args.symlinkPath)}
CURRENT_VERSION=${shellQuote(args.currentVersion)}
if [ -L "$EXTRACT_DIR" ]; then
  echo "Error: refusing symlink bundle directory" >&2
  exit 1
fi
# mktemp reserves a fresh directory even for rebuilds of the same version.
mkdir -p "$EXTRACT_DIR.versions"
STAGING=$(mktemp -d "$EXTRACT_DIR.versions/build.XXXXXXXX")
LINK="$ENTRY.new.$$"
if [ -e "$LINK" ] || [ -L "$LINK" ]; then
  echo "Error: update link staging path already exists" >&2
  exit 1
fi
# Failed staged bundles are retained too; no old runtime is ever removed.
echo ${shellQuote(`Downloading nolo from ${args.tarballUrl}...`)}
if ! ${curl} ${shellQuote(args.tarballUrl)} -o "$STAGING/bundle.tar.gz"; then
  ${args.tarballUrl !== args.fallbackUrl
    ? `echo ${shellQuote(`Primary source unavailable, trying ${args.fallbackUrl}...`)}
  if ! ${curl} ${shellQuote(args.fallbackUrl)} -o "$STAGING/bundle.tar.gz"; then
    echo "Error: download failed" >&2
    exit 1
  fi`
    : `echo "Error: download failed" >&2
  exit 1`}
fi
tar -xzf "$STAGING/bundle.tar.gz" -C "$STAGING"
chmod +x "$STAGING/nolo"
# A failing, empty or malformed version response must not touch the live install.
VERSION_TEXT=$("$STAGING/nolo" -v)
case "$VERSION_TEXT" in
  "nolo-cli "*) VERSION=\${VERSION_TEXT#nolo-cli } ;;
  *) VERSION=$VERSION_TEXT ;;
esac
CORE=\${VERSION%%[-+]*}
MAJOR=\${CORE%%.*}
REST=\${CORE#*.}
MINOR=\${REST%%.*}
PATCH=\${REST#*.}
case "$MAJOR:$MINOR:$PATCH" in
  *[!0-9:]*|:*|*::*|*:) echo "Error: invalid bundle version" >&2; exit 1 ;;
esac
if [ "$CORE" != "$MAJOR.$MINOR.$PATCH" ]; then
  echo "Error: invalid bundle version" >&2
  exit 1
fi
case "$VERSION" in
  *[!0-9A-Za-z.+-]*) echo "Error: invalid bundle version" >&2; exit 1 ;;
esac
case "$CURRENT_VERSION" in
  "nolo-cli "*) CUR_VER=\${CURRENT_VERSION#nolo-cli } ;;
  *) CUR_VER=$CURRENT_VERSION ;;
esac
CUR_CORE=\${CUR_VER%%[-+]*}
CUR_MAJOR=\${CUR_CORE%%.*}
CUR_REST=\${CUR_CORE#*.}
CUR_MINOR=\${CUR_REST%%.*}
CUR_PATCH=\${CUR_REST#*.}
if [ -n "$CUR_MAJOR" ] && [ -n "$CUR_MINOR" ] && [ -n "$CUR_PATCH" ]; then
  case "$CUR_MAJOR:$CUR_MINOR:$CUR_PATCH" in
    *[!0-9:]*|:*|*::*|*:) ;;
    *)
      if [ "$CUR_CORE" = "$CUR_MAJOR.$CUR_MINOR.$CUR_PATCH" ]; then
        is_downgrade=0
        if [ "$MAJOR" -lt "$CUR_MAJOR" ]; then
          is_downgrade=1
        elif [ "$MAJOR" -eq "$CUR_MAJOR" ]; then
          if [ "$MINOR" -lt "$CUR_MINOR" ]; then
            is_downgrade=1
          elif [ "$MINOR" -eq "$CUR_MINOR" ]; then
            if [ "$PATCH" -lt "$CUR_PATCH" ]; then
              is_downgrade=1
            fi
          fi
        fi
        if [ "$is_downgrade" = 1 ]; then
          echo "Error: refusing downgrade from $CURRENT_VERSION to $VERSION" >&2
          exit 11
        fi
      fi
      ;;
  esac
fi
mkdir -p "\${ENTRY%/*}"
if [ -d "$ENTRY" ] || { [ -e "$ENTRY" ] && [ ! -L "$ENTRY" ]; }; then
  echo "Error: refusing non-symlink entrypoint; retain it and migrate explicitly" >&2
  exit 1
fi
# The staged path becomes permanent. Never rename the running bundle.
ln -s "$STAGING/nolo" "$LINK"
mv -f "$LINK" "$ENTRY"
echo "nolo updated to $ENTRY"
`;
}

/**
 * Update a standalone-bundle install (Bun `--compile` binary installed via
 * install-nolo.sh) by re-running the same curl+tar+symlink flow as the
 * installer. No npm/bun package manager involved — the bundle is a
 * self-contained binary fetched from the download host.
 *
 * Mirrors install-nolo.sh: download tarball → extract to a fresh ~/.nolo/<platform>.versions/build.<unique>/
 * → atomically swap the symlink in the install dir.
 */
export async function runStandaloneBundleUpdate(
  options: RunSelfUpdateOptions,
): Promise<number> {
  const output = options.output ?? process.stdout;
  const spawn: SpawnFn = options.spawn ?? resolveDefaultSpawn();
  const env = options.env ?? process.env;
  const serverUrl = resolveSelfUpdateServerUrl(env, options.serverUrl);
  const channel = getCliInstallChannel(serverUrl);

  const platform = resolveStandaloneBundlePlatform();
  if (!platform) {
    output.write(
      t("updateUnsupported", process.platform, process.arch, buildStandaloneManualUpdateHint(channel)),
    );
    return 1;
  }

  const { tarballName, extractSubdir } = platform;
  const repoBase = resolveStandaloneBundleRepoBase(channel);
  // Channel-specific fixed name: the mirror fallback reuses the very same name,
  // so a failed download can only ever retry the same channel.
  const bundleName = buildStandaloneBundleTarballName(tarballName, channel);
  const tarballUrl = `${repoBase}/public/downloads/${bundleName}`;
  const fallbackUrl = `https://nolo.chat/public/downloads/${bundleName}`;

  const extractDir = join(homedir(), ".nolo", extractSubdir);
  const installDir = env.NOLO_INSTALL_DIR || resolveStandaloneInstallDir();
  const symlinkPath = join(installDir, "nolo");

  const script = buildStandaloneUpdateScript({
    tarballUrl,
    fallbackUrl,
    extractDir,
    symlinkPath,
    currentVersion: readPackageInfo().version,
  });

  output.write(`\n${t("updateInstallerTitle")}\n`);
  output.write(`-----------------------------------------\n`);
  output.write(`${t("updateBundleTarget", channel)}\n`);
  output.write(`${t("updateBundleDownloading")}\n`);

  const useCustomSink = options.output !== undefined;
  const exitCode = await runShellScript(script, {
    output,
    spawn,
    env,
    useCustomSink,
  });

  if (exitCode === 10) {
    output.write(`  ${renderProgressBar(100.0)}\n`);
    return 0;
  }

  if (exitCode === 0) {
    output.write(`  ${renderProgressBar(100.0)}\n`);
    output.write(`${t("updateCompleted")}\n\n`);
  }

  return exitCode;
}

// ─── Update availability check ─────────────────────────────────────────────
// AI-assisted development ships new CLI versions constantly (alpha channel
// pushes a release on every merge), so the TUI welcome page nudges users to
// upgrade when the npm dist-tag for their channel is ahead of the installed
// version. The check is best-effort: any failure (offline, registry hiccup,
// malformed payload) resolves to null so the TUI stays silent rather than
// nagging on flaky networks.

export type CliUpdateInfo = {
  latestVersion: string;
  channel: CliReleaseChannel;
};

/** Set NOLO_CLI_NO_UPDATE_CHECK=1 to disable the startup update check. */
export const NOLO_UPDATE_CHECK_KILL_SWITCH = "NOLO_CLI_NO_UPDATE_CHECK";

type ParsedVersion = { main: number[]; pre: string[] };

function parseCliVersion(raw: string): ParsedVersion | null {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(raw.trim());
  if (!match) return null;
  return {
    main: [Number(match[1]), Number(match[2]), Number(match[3])],
    pre: match[4] ? match[4].split(".") : [],
  };
}

/**
 * Compare two CLI versions ("0.24.0", "0.24.0-alpha.5") as semver-ish,
 * returning -1 / 0 / 1. Pre-release suffixes sort below the release they
 * prefix ("0.24.0-alpha.5" < "0.24.0"), matching npm dist-tag semantics so
 * the alpha channel can still surface a newer alpha.
 */
export function compareCliVersions(a: string, b: string): number {
  const pa = parseCliVersion(a);
  const pb = parseCliVersion(b);
  // Malformed input falls back to lexicographic order instead of NaN poison.
  if (!pa || !pb) return a.localeCompare(b);
  for (let i = 0; i < 3; i++) {
    if (pa.main[i] !== pb.main[i]) return pa.main[i] < pb.main[i] ? -1 : 1;
  }
  if (pa.pre.length === 0 && pb.pre.length === 0) return 0;
  if (pa.pre.length === 0) return 1;
  if (pb.pre.length === 0) return -1;
  const len = Math.max(pa.pre.length, pb.pre.length);
  for (let i = 0; i < len; i++) {
    const x = pa.pre[i];
    const y = pb.pre[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (x === y) continue;
    const xn = /^\d+$/.test(x) ? Number(x) : NaN;
    const yn = /^\d+$/.test(y) ? Number(y) : NaN;
    if (!Number.isNaN(xn) && !Number.isNaN(yn)) return xn < yn ? -1 : 1;
    if (!Number.isNaN(xn)) return -1; // numeric identifiers sort below alphanumeric
    if (!Number.isNaN(yn)) return 1;
    return x < y ? -1 : 1;
  }
  return 0;
}

export type CliUpdateCheckOptions = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
};

/**
 * 一次版本探测的三态结果。
 *
 * `current` 与 `unknown` 必须分开：只有确知"已是最新"才允许跳过安装；检查
 * 失败（离线/超时/开关关闭）不得替用户否决一次正常操作（误判"不可用"才是
 * 事故，误判"可用"只是多跑一次安装）。
 */
export type CliUpdateProbe =
  | { kind: "available"; latestVersion: string; channel: CliReleaseChannel }
  | { kind: "current"; channel: CliReleaseChannel }
  | {
      kind: "unknown";
      reason: "disabled" | "unparsable-version" | "network" | "invalid-payload";
    };

/**
 * Probe the npm registry for a newer `nolo-cli` on the channel implied by the
 * server origin (us.nolo.chat → alpha, else latest).
 *
 * 与 checkForCliUpdate 的区别只有一处：把"确知已最新"和"无法判断"分开返回。
 */
export async function probeCliUpdate(
  currentVersion: string | undefined,
  serverUrl?: string | null,
  options: CliUpdateCheckOptions = {},
): Promise<CliUpdateProbe> {
  const env = options.env ?? process.env;
  // per-key fallback 与 refreshGitStatus 的 kill switch 一致：显式 env 缺键时
  // 仍尊重进程级开关（workspace 测试常传 env: {}）。
  if (
    (env[NOLO_UPDATE_CHECK_KILL_SWITCH] ?? process.env[NOLO_UPDATE_CHECK_KILL_SWITCH]) === "1"
  ) {
    return { kind: "unknown", reason: "disabled" };
  }
  const channel = getCliInstallChannel(serverUrl);
  // 当前版本缺失或不可解析（本地开发/未知安装）时不比较，避免误报。
  if (!currentVersion || !parseCliVersion(currentVersion)) {
    return { kind: "unknown", reason: "unparsable-version" };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 2000;

  try {
    const res = await fetchImpl(
      `https://registry.npmjs.org/nolo-cli/${channel}`,
      {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { accept: "application/json" },
      },
    );
    if (!res.ok) return { kind: "unknown", reason: "network" };
    const data = (await res.json()) as { version?: string };
    const latestVersion = data.version;
    // 两侧版本都必须可解析才比较：registry 返回非法版本（或恶意 payload）
    // 时不得进入字典序 fallback，否则可能把垃圾字符串当成"更新版本"误报。
    if (!latestVersion || !parseCliVersion(latestVersion)) {
      return { kind: "unknown", reason: "invalid-payload" };
    }
    if (compareCliVersions(latestVersion, currentVersion) <= 0) {
      return { kind: "current", channel };
    }
    return { kind: "available", latestVersion, channel };
  } catch {
    // Offline / timeout / malformed payload: stay silent, never nag.
    return { kind: "unknown", reason: "network" };
  }
}

/**
 * Best-effort check against the npm registry for a newer `nolo-cli` on the
 * channel implied by the server origin (us.nolo.chat → alpha, else latest).
 * Resolves to null when there is no newer version or the check cannot
 * complete — callers must treat null as "no prompt".
 */
export async function checkForCliUpdate(
  currentVersion: string | undefined,
  serverUrl?: string | null,
  options: CliUpdateCheckOptions = {},
): Promise<CliUpdateInfo | null> {
  const probe = await probeCliUpdate(currentVersion, serverUrl, options);
  return probe.kind === "available"
    ? { latestVersion: probe.latestVersion, channel: probe.channel }
    : null;
}

export async function runSelfUpdateDetailed(
  outputOrOptions?: NodeJS.WritableStream | RunSelfUpdateOptions,
): Promise<SelfUpdateExecution> {
  const options =
    outputOrOptions === undefined
      ? {}
      : isRunSelfUpdateOptions(outputOrOptions)
        ? outputOrOptions
        : { output: outputOrOptions };

  // Standalone-bundle installs (Bun --compile binary via install-nolo.sh) take
  // a different update path: re-fetch the platform tarball and swap the
  // symlink, no npm/bun package manager involved. Route before touching npm
  // so sh-installed users without npm get a working `nolo update`.
  if (isCompiledBinary()) {
    return {
      exitCode: await runStandaloneBundleUpdate(options),
      disposition: "completed",
    };
  }

  const output = options.output ?? process.stdout;
  const spawn: SpawnFn = options.spawn ?? resolveDefaultSpawn();
  const env = options.env ?? process.env;
  const serverUrl = resolveSelfUpdateServerUrl(env, options.serverUrl);

  const channel = getCliInstallChannel(serverUrl);
  const command = buildNpmSelfUpdateCommand(channel);

  if ((options.platform ?? process.platform) === "win32") {
    const packageInfo = readPackageInfo();
    const entrypointPath =
      options.entrypointPath ?? fileURLToPath(import.meta.url);
    const schedule = options.scheduleWindowsUpdate ?? scheduleWindowsSelfUpdate;
    try {
      const scheduled = schedule({
        channel,
        currentVersion: packageInfo.version,
        entrypointPath,
        env,
      });
      output.write(`\n${t("updateInstallerTitle")}\n`);
      output.write(`-----------------------------------------\n`);
      output.write(`${t("updateNpmTarget", channel)}\n`);
      output.write(`${t("updateScheduled", String(scheduled.helperPid))}\n`);
      output.write(`${t("updateKeepUsing")}\n`);
      output.write(`${t("updateBackground")}\n`);
      output.write(`${t("updateCheckLog", scheduled.logPath)}\n\n`);
      return { exitCode: 0, disposition: "scheduled" };
    } catch (error) {
      output.write(
        `${t("updateScheduleFailed", error instanceof Error ? error.message : String(error))}\n`,
      );
      output.write(
        `${t("updateManualClose", command.join(" "))}\n`,
      );
      return { exitCode: 1, disposition: "completed" };
    }
  }

  output.write(`\n${t("updateInstallerTitle")}\n`);
  output.write(`-----------------------------------------\n`);
  output.write(`${t("updateNpmTarget", channel)}\n`);
  output.write(`${t("updateNpmDownloading")}\n`);

  const exitCode = await runShellScript(buildManagedNpmUpdateScript(channel), {
    output, spawn, env, useCustomSink: options.output !== undefined,
  });
  if (exitCode === 0) {
    output.write(`  ${renderProgressBar(100.0)}\n`);
    output.write(`${t("updateCompleted")}\n\n`);
  }
  return { exitCode, disposition: "completed" };
}

/** Backward-compatible numeric API used by the non-interactive command registry. */
export async function runSelfUpdate(
  outputOrOptions?: NodeJS.WritableStream | RunSelfUpdateOptions,
): Promise<number> {
  return (await runSelfUpdateDetailed(outputOrOptions)).exitCode;
}
