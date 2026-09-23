import { cpSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { asOptionalTrimmedString } from "core/optionalString";

/**
 * Stable Windows upload-set discovery + normalisation (Electrobun v2).
 *
 * Electrobun v2 emits, inside the current run's build dir:
 *   `Nolo Desktop-Setup.exe`, `Nolo Desktop-Setup.tar.zst`,
 *   `Nolo Desktop-Setup.metadata.json` and the `NoloDesktop/` wrapper payload
 *   (`bin/launcher.exe` + `Resources/<hash>.tar.zst` with the real app inside).
 *
 * The stable release publisher instead requires exactly:
 *   stable-win-x64-NoloDesktop-Setup.exe            canonical installer
 *   stable-win-x64-NoloDesktop-Setup-<version>.exe  immutable versioned copy
 *   stable-win-x64-NoloDesktop-Setup.zip            setup zip（hutch .installer 载荷三件套；Windows 渠道的真实分发物）
 *   stable-win-x64-NoloDesktop-stable.tar.zst       update bundle (payload)
 *   stable-win-x64-update.json                      rich metadata (canary schema)
 *
 * Every layer used to key off v1 names (`*-Setup*.zip`), so the stable channel
 * produced nothing usable. This module is the single place that turns the v2
 * shape into the upload set above.
 *
 * Discovery is deliberately fail-loud and provenance-bound:
 * - only the build dir passed by the caller is scanned; nothing is accepted
 *   from `artifacts/` or any other directory;
 * - a candidate must look like a Nolo Setup artifact (`setup` + `nolo`) and
 *   must never match the WebView2 bootstrapper (`MicrosoftEdgeWebview2Setup.exe`)
 *   or the side-by-side smoke installer;
 * - accepted files must have been produced by the current run (mtime not older
 *   than the run start, minus a small filesystem-granularity tolerance);
 * - only `ENOENT` is treated as an expected IO condition; every other IO error
 *   propagates so a mistake in the discovery path can never look like
 *   "nothing was found".
 */

export const STABLE_WINDOWS_UPSTREAM_SETUP_STEM = "Nolo Desktop-Setup";
export const STABLE_WINDOWS_WRAPPER_DIR_NAME = "NoloDesktop";
export const STABLE_WINDOWS_WRAPPER_LAUNCHER_RELATIVE_PATH = join("bin", "launcher.exe");
export const STABLE_WINDOWS_UPDATE_SCHEMA_VERSION = 1;
export const STABLE_WINDOWS_UPDATE_IDENTIFIER = "chat.nolo.desktop";
export const STABLE_WINDOWS_UPDATE_CHANNEL = "stable";

export const STABLE_WINDOWS_UPLOAD_NAMES = {
  installer: "stable-win-x64-NoloDesktop-Setup.exe",
  setupZip: "stable-win-x64-NoloDesktop-Setup.zip",
  updateBundle: "stable-win-x64-NoloDesktop-stable.tar.zst",
  updateJson: "stable-win-x64-update.json",
} as const;

const FRESHNESS_TOLERANCE_MS = 5_000;

const INSTALLER_PATTERN = /^Nolo Desktop-Setup(?:-[0-9][^\\/]*)?\.exe$/i;
const UPDATE_BUNDLE_PATTERN = /^Nolo Desktop-Setup(?:-[0-9][^\\/]*)?\.tar\.zst$/i;
const METADATA_PATTERN = /^Nolo Desktop-Setup(?:-[0-9][^\\/]*)?\.metadata\.json$/i;

export type StableWindowsDiscoveryErrorCode =
  | "missing_build_dir"
  | "no_fresh_candidates"
  | "stale_candidates"
  | "wrapper_missing"
  | "metadata_missing"
  | "metadata_invalid";

export class StableWindowsDiscoveryError extends Error {
  readonly code: StableWindowsDiscoveryErrorCode;

  constructor(code: StableWindowsDiscoveryErrorCode, message: string) {
    super(message);
    this.name = "StableWindowsDiscoveryError";
    this.code = code;
  }
}

export type StableWindowsUpstreamSet = {
  buildDir: string;
  installerPath: string;
  updateBundlePath: string;
  metadataPath: string | null;
  wrapperDir: string;
  version: string;
  hash: string;
};

export type StableWindowsUploadSet = {
  installerPath: string;
  versionedInstallerPath: string;
  setupZipPath: string;
  updateBundlePath: string;
  updateJsonPath: string;
  version: string;
  hash: string;
};

function isEnoentError(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | null)?.code === "ENOENT";
}

/**
 * Loose "is this a Nolo Setup artifact at all" gate. This is the predicate the
 * candidate scan uses BEFORE the strict per-kind patterns, so a lone
 * `MicrosoftEdgeWebview2Setup.exe` (or a smoke installer) can never be accepted
 * even when it is the only `*setup*` file in the directory.
 */
export function isNoloSetupArtifactName(fileName: string): boolean {
  const name = fileName.trim();
  if (!/setup/i.test(name)) return false;
  if (!/nolo/i.test(name)) return false;
  if (/webview2?/i.test(name)) return false;
  if (/smoke/i.test(name)) return false;
  return true;
}

function describeDirEntries(entries: Array<{ name: string }>): string {
  const names = entries.map((entry) => entry.name).sort();
  return names.length > 0 ? names.join(", ") : "(empty)";
}

type VersionHashSource = { version?: string; hash?: string };

function readVersionHashFromFile(path: string, label: string): VersionHashSource | null {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (error) {
    if (isEnoentError(error)) return null;
    throw error;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new StableWindowsDiscoveryError(
      "metadata_invalid",
      `${label} is not valid JSON: ${path}`,
    );
  }
  if (!parsed || typeof parsed !== "object") return null;

  const record = parsed as Record<string, unknown>;
  const version = typeof record.version === "string" ? record.version.trim() : "";
  const hash =
    typeof record.hash === "string"
      ? record.hash.trim()
      : typeof record.buildSha === "string"
        ? record.buildSha.trim()
        : "";
  if (!version && !hash) return null;
  return {
    ...(version ? { version } : {}),
    ...(hash ? { hash } : {}),
  };
}

export function discoverStableWindowsUpstreamSet(args: {
  buildDir: string;
  /** Provenance baseline: files older than this (minus tolerance) are rejected. */
  runStartedAtMs: number;
  toleranceMs?: number;
  /** Last-resort version/hash when neither metadata source carries them. */
  fallbackVersion?: string;
  fallbackHash?: string;
}): StableWindowsUpstreamSet {
  const { buildDir } = args;
  const toleranceMs = args.toleranceMs ?? FRESHNESS_TOLERANCE_MS;
  const rejections: string[] = [];

  let entries: Array<{ name: string; isFile(): boolean; isDirectory(): boolean }>;
  try {
    entries = readdirSync(buildDir, { withFileTypes: true });
  } catch (error) {
    if (isEnoentError(error)) {
      throw new StableWindowsDiscoveryError(
        "missing_build_dir",
        `Stable Windows build directory is missing: ${buildDir}. ` +
          `Electrobun must produce its v2 output before the upload set can be staged.`,
      );
    }
    throw error;
  }

  const isFreshCandidateFile = (path: string, name: string): boolean => {
    let stat;
    try {
      stat = statSync(path);
    } catch (error) {
      if (isEnoentError(error)) {
        rejections.push(`${name}: disappeared while checking build provenance`);
        return false;
      }
      throw error;
    }
    if (!stat.isFile()) return false;
    if (stat.mtimeMs < args.runStartedAtMs - toleranceMs) {
      rejections.push(
        `${name}: stale candidate, mtime ${new Date(stat.mtimeMs).toISOString()} ` +
          `predates this build run (started ${new Date(args.runStartedAtMs).toISOString()})`,
      );
      return false;
    }
    return true;
  };

  const fileNameEntries = entries.filter((entry) => entry.isFile());

  // Record every `*setup*` file that looks dangerous or non-Nolo so a failed
  // discovery explains itself instead of silently selecting the wrong binary.
  for (const entry of fileNameEntries) {
    if (!/setup/i.test(entry.name)) continue;
    if (!isNoloSetupArtifactName(entry.name)) {
      rejections.push(
        `${entry.name}: refused (${
          /webview/i.test(entry.name)
            ? "WebView2 bootstrapper must never be selected as the Nolo installer"
            : "does not look like a Nolo Setup artifact"
        })`,
      );
    }
  }

  const pickFreshCandidate = (pattern: RegExp): string | null => {
    const candidates = fileNameEntries
      .map((entry) => entry.name)
      .filter((name) => isNoloSetupArtifactName(name) && pattern.test(name));
    const accepted = candidates.filter((name) =>
      isFreshCandidateFile(join(buildDir, name), name),
    );
    if (accepted.length === 0) return null;
    // Canonical stem sorts first (`Nolo Desktop-Setup.exe` before any
    // `-<semver>` variant), so the plain name wins deterministically.
    accepted.sort((a, b) => a.length - b.length || a.localeCompare(b));
    return accepted[0];
  };

  const installerName = pickFreshCandidate(INSTALLER_PATTERN);
  const updateBundleName = pickFreshCandidate(UPDATE_BUNDLE_PATTERN);
  const metadataName = pickFreshCandidate(METADATA_PATTERN);

  if (!installerName || !updateBundleName) {
    const missing = [
      !installerName ? `"${STABLE_WINDOWS_UPSTREAM_SETUP_STEM}.exe"` : null,
      !updateBundleName ? `"${STABLE_WINDOWS_UPSTREAM_SETUP_STEM}.tar.zst"` : null,
    ]
      .filter((value): value is string => Boolean(value))
      .join(" and ");
    throw new StableWindowsDiscoveryError(
      rejections.some((line) => line.includes("stale candidate"))
        ? "stale_candidates"
        : "no_fresh_candidates",
      `Electrobun v2 stable output is missing its fresh ${missing} in ${buildDir}. ` +
        `Build dir entries: ${describeDirEntries(entries)}.` +
        (rejections.length > 0 ? ` Rejected candidates: ${rejections.join("; ")}.` : ""),
    );
  }

  const wrapperDir = join(buildDir, STABLE_WINDOWS_WRAPPER_DIR_NAME);
  let wrapperStat;
  try {
    wrapperStat = statSync(wrapperDir);
  } catch (error) {
    if (isEnoentError(error)) {
      throw new StableWindowsDiscoveryError(
        "wrapper_missing",
        `Electrobun v2 wrapper payload directory is missing: ${wrapperDir}. ` +
          `Build dir entries: ${describeDirEntries(entries)}.`,
      );
    }
    throw error;
  }
  if (!wrapperStat.isDirectory()) {
    throw new StableWindowsDiscoveryError(
      "wrapper_missing",
      `Electrobun v2 wrapper payload path is not a directory: ${wrapperDir}.`,
    );
  }

  const requireWrapperFile = (path: string, description: string) => {
    let stat;
    try {
      stat = statSync(path);
    } catch (error) {
      if (isEnoentError(error)) {
        throw new StableWindowsDiscoveryError(
          "wrapper_missing",
          `${description} is missing from the wrapper payload: ${path}.`,
        );
      }
      throw error;
    }
    if (!stat.isFile()) {
      throw new StableWindowsDiscoveryError(
        "wrapper_missing",
        `${description} is not a file in the wrapper payload: ${path}.`,
      );
    }
  };

  requireWrapperFile(
    join(wrapperDir, STABLE_WINDOWS_WRAPPER_LAUNCHER_RELATIVE_PATH),
    "Wrapper launcher",
  );

  let resourceEntries: Array<{ name: string; isFile(): boolean }>;
  try {
    resourceEntries = readdirSync(join(wrapperDir, "Resources"), { withFileTypes: true });
  } catch (error) {
    if (isEnoentError(error)) {
      throw new StableWindowsDiscoveryError(
        "wrapper_missing",
        `Wrapper payload Resources directory is missing: ${join(wrapperDir, "Resources")}.`,
      );
    }
    throw error;
  }
  const innerArchiveCount = resourceEntries.filter(
    (entry) => entry.isFile() && /\.tar\.zst$/i.test(entry.name),
  ).length;
  if (innerArchiveCount === 0) {
    throw new StableWindowsDiscoveryError(
      "wrapper_missing",
      `Wrapper payload has no inner Resources/*.tar.zst app archive: ${join(wrapperDir, "Resources")}.`,
    );
  }

  const metadataPath = metadataName ? join(buildDir, metadataName) : null;
  const metadataSources: Array<{ label: string; path: string }> = [];
  if (metadataPath) {
    metadataSources.push({ label: "upstream build metadata", path: metadataPath });
  }
  metadataSources.push({
    label: "wrapper payload metadata",
    path: join(wrapperDir, "Resources", "metadata.json"),
  });

  let version = "";
  let hash = "";
  const metadataSourcesTried: string[] = [];
  for (const source of metadataSources) {
    if (version && hash) break;
    metadataSourcesTried.push(`${source.label} (${source.path})`);
    const found = readVersionHashFromFile(source.path, source.label);
    if (!found) continue;
    if (!version && found.version) version = found.version;
    if (!hash && found.hash) hash = found.hash;
  }
  if (!version) version = args.fallbackVersion?.trim() ?? "";
  if (!hash) hash = args.fallbackHash?.trim() ?? "";

  if (!version || !hash) {
    throw new StableWindowsDiscoveryError(
      "metadata_missing",
      `Unable to resolve {version, hash} for the stable Windows upload set ` +
        `(version="${version}", hash="${hash}"). Metadata sources tried: ` +
        `${metadataSourcesTried.join("; ")}.`,
    );
  }

  return {
    buildDir,
    installerPath: join(buildDir, installerName),
    updateBundlePath: join(buildDir, updateBundleName),
    metadataPath,
    wrapperDir,
    version,
    hash,
  };
}

/**
 * The single update-metadata contract for the stable channel, byte-identical in
 * shape to what the published canary channel ships. Never write the simplified
 * `{version, hash, platform, arch}` variant again.
 */
export function buildStableWindowsUpdateJson(args: { version: string; hash: string }) {
  return {
    schemaVersion: STABLE_WINDOWS_UPDATE_SCHEMA_VERSION,
    identifier: STABLE_WINDOWS_UPDATE_IDENTIFIER,
    channel: STABLE_WINDOWS_UPDATE_CHANNEL,
    version: args.version,
    hash: args.hash,
    platform: "win",
    arch: "x64",
    artifact: { file: STABLE_WINDOWS_UPLOAD_NAMES.updateBundle },
  };
}

/**
 * Normalise the discovered upstream set into the publishable upload set inside
 * `artifactDir`. IO failures propagate untouched: a build that cannot write its
 * upload set must fail, not publish a partial set.
 */
export function stageStableWindowsUploadSet(args: {
  upstream: StableWindowsUpstreamSet;
  artifactDir: string;
  /**
   * 正式 stable 安装器（由可运行 app 载荷编译出的 Inno .exe）。提供时用它生成
   * canonical installer + 版本化副本；缺省回落到上游 `Nolo Desktop-Setup.exe`
   * stub 拷贝（recovery 兼容路径——那条路仍只能交出 stub）。
   *
   * **必填**。缺省回落 stub 会让「发布了一个不能装的 stable」重新发生（1.6MB
   * 自解压壳没有邻接 `.installer/` 载荷装不起来），而那正是本次修复要消灭的
   * 形态；唯一兜底（size gate）在发布期才响，代价是一次完整的失败发布。
   * 传空视为调用方缺陷，直接抛错而不是静默降级。
   */
  installerSourcePath: string;
}): StableWindowsUploadSet {
  const { upstream, artifactDir } = args;
  const source = asOptionalTrimmedString(args.installerSourcePath);
  if (!source) {
    throw new Error(
      "stageStableWindowsUploadSet requires installerSourcePath: the stable channel ships an Inno installer, never the upstream self-extracting stub.",
    );
  }
  mkdirSync(artifactDir, { recursive: true });

  const installerSourcePath = source;
  const installerPath = join(artifactDir, STABLE_WINDOWS_UPLOAD_NAMES.installer);
  // 同路径自拷贝在 Node/Bun 都抛 ERR_FS_CP_EINVAL。调用方（build-stable 快乐
  // 路径）把编译产物放在独立目录，正常不会撞上；这里仍显式短路，防止任何未来
  // 调用方把产物直接写进 artifactDir 又把同一路径当 source 传进来。
  if (resolve(installerSourcePath) !== resolve(installerPath)) {
    cpSync(installerSourcePath, installerPath);
  }

  const versionedInstallerPath = join(
    artifactDir,
    STABLE_WINDOWS_UPLOAD_NAMES.installer.replace(/\.exe$/i, `-${upstream.version}.exe`),
  );
  if (resolve(installerSourcePath) !== resolve(versionedInstallerPath)) {
    cpSync(installerSourcePath, versionedInstallerPath);
  }

  const updateBundlePath = join(artifactDir, STABLE_WINDOWS_UPLOAD_NAMES.updateBundle);
  cpSync(upstream.updateBundlePath, updateBundlePath);

  // hutch 的 Setup zip（内含 stem 匹配的 .installer/{metadata.json,tar.zst} 三件套）
  // 是 Windows 渠道的真实分发物（官方文档：Hutch emits a Setup ZIP on Windows）。
  // v1 重编译路径因文件名不含 "-win-" 从未认领它，导致 stable 发布只有裸 extractor
  // 可发（被 MIN_WIN_INSTALLER_BYTES 正确拦下，public run 34934170719）；这里按渠道
  // 前缀改名落位。缺 zip 属发布形态错误——直接失败（本轮 CI 与本地测试都要求它存在）。
  const hutchZipCandidates = readdirSync(artifactDir).filter(
    (name) => /NoloDesktop-Setup(?:-[0-9][^/]*)?\.zip$/i.test(name) && !name.startsWith("stable-"),
  );
  if (hutchZipCandidates.length !== 1) {
    throw new Error(
      `expected exactly one hutch Setup zip in ${artifactDir}, found: ` +
        (hutchZipCandidates.length > 0 ? hutchZipCandidates.join(", ") : "none"),
    );
  }
  const setupZipPath = join(artifactDir, STABLE_WINDOWS_UPLOAD_NAMES.setupZip);
  cpSync(join(artifactDir, hutchZipCandidates[0]), setupZipPath);

  const updateJsonPath = join(artifactDir, STABLE_WINDOWS_UPLOAD_NAMES.updateJson);
  writeFileSync(
    updateJsonPath,
    `${JSON.stringify(
      buildStableWindowsUpdateJson({ version: upstream.version, hash: upstream.hash }),
      null,
      2,
    )}\n`,
    "utf8",
  );

  return {
    installerPath,
    versionedInstallerPath,
    setupZipPath,
    updateBundlePath,
    updateJsonPath,
    version: upstream.version,
    hash: upstream.hash,
  };
}

/** Discover + stage in one step; used by the stable Windows build entry points. */
export function discoverAndStageStableWindowsUploadSet(args: {
  buildDir: string;
  artifactDir: string;
  runStartedAtMs: number;
  fallbackVersion?: string;
  fallbackHash?: string;
  /** 同 stageStableWindowsUploadSet：必填，stable 只发 Inno 安装器。 */
  installerSourcePath: string;
}): StableWindowsUploadSet {
  const upstream = discoverStableWindowsUpstreamSet({
    buildDir: args.buildDir,
    runStartedAtMs: args.runStartedAtMs,
    fallbackVersion: args.fallbackVersion,
    fallbackHash: args.fallbackHash,
  });
  return stageStableWindowsUploadSet({
    upstream,
    artifactDir: args.artifactDir,
    installerSourcePath: args.installerSourcePath,
  });
}
