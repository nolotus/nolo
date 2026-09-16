import {
  desktopReleaseManifestPublicPath,
  normalizeDesktopReleaseManifest,
  resolveDesktopManifestChannelFromOrigin,
  type DesktopReleaseChannel,
  type DesktopReleasePlatform,
} from "app/constants/desktopReleaseManifest";
import {
  createDesktopUpdaterSnapshot,
  type DesktopUpdaterOperation,
  type DesktopUpdaterSnapshot,
  type DesktopUpdaterStatusEntry,
} from "core/desktop/desktopUpdaterState";
import type { DesktopUpdaterReleaseArtifact } from "core/desktop/desktopUpdatePolicy";
import {
  resolveDesktopInstallLocation,
  type DesktopInstallLocation,
} from "core/desktop/desktopInstallLocation";
import { homedir } from "node:os";

export type DesktopUpdaterRuntime = {
  BuildConfig: {
    get: () => Promise<unknown>;
  };
  Updater: {
    localInfo: {
      version: () => Promise<string>;
      hash: () => Promise<string>;
      channel: () => Promise<string>;
      baseUrl: () => Promise<string>;
    };
    updateInfo?: () => DesktopUpdaterSnapshot["updateInfo"];
    getStatusHistory: () => DesktopUpdaterSnapshot["statusHistory"];
    clearStatusHistory: () => void;
    checkForUpdate: () => Promise<unknown>;
    downloadUpdate: () => Promise<unknown>;
    applyUpdate: () => Promise<unknown>;
  };
};

export type DesktopUpdaterAction = DesktopUpdaterOperation;

type ReleaseArtifactState = {
  fetchedAt: number;
  artifact: DesktopUpdaterReleaseArtifact | null;
  error: string | null;
};

/** 缓存条目自带 TTL：成功取回用完整 TTL，失败只允许短负缓存。 */
type ManifestCacheEntry = ReleaseArtifactState & { ttlMs: number };

export type DesktopUpdaterActionResult =
  | { ok: true; status: 202; snapshot: DesktopUpdaterSnapshot }
  | { ok: false; status: 409; error: string };

type DesktopUpdaterFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type DesktopUpdaterCoordinatorOptions = {
  loadDesktopRuntime: () => Promise<DesktopUpdaterRuntime>;
  resolvePlatform?: () => DesktopReleasePlatform;
  /** 安装位置判定（默认按 process.execPath 等真实环境推导，测试可注入）。 */
  resolveInstallLocation?: () => DesktopInstallLocation;
  fetchFn?: DesktopUpdaterFetch;
  now?: () => number;
  manifestCacheTtlMs?: number;
  manifestNegativeCacheTtlMs?: number;
  onOperationError?: (operation: DesktopUpdaterAction, error: unknown) => void;
  /**
   * 持久化的「更新退出交接失败」状态（core/desktop/desktopUpdateShutdownStatus）。
   * 有值时并进 statusHistory 使设置页可见；用户新发起 download/apply 时清除。
   */
  readShutdownStatusEntry?: () => DesktopUpdaterStatusEntry | null;
  clearShutdownStatusEntry?: () => void;
};

const DEFAULT_MANIFEST_CACHE_TTL_MS = 30_000;
/**
 * 远端 manifest 拉取失败（HTTP 非 2xx / 网络 / 解析错误）是瞬时故障：
 * 只允许短负缓存，防止把失败当 30s 真值缓存而遮蔽紧随其后的恢复。
 */
const DEFAULT_MANIFEST_NEGATIVE_CACHE_TTL_MS = 5_000;
const LEGACY_MANIFEST_FILE_NAME = "desktop-release-manifest.json";

const resolveDefaultDesktopReleasePlatform = (): DesktopReleasePlatform =>
  process.platform === "win32"
    ? "windows"
    : process.platform === "darwin"
      ? "macos"
      : "linux";

/** Map Electrobun channel names onto the desktop release manifest channel. */
export const mapElectrobunChannelToManifestChannel = (
  channel: string | undefined | null,
): DesktopReleaseChannel | null => {
  if (channel === "canary" || channel === "alpha") return "alpha";
  if (channel === "stable") return "stable";
  return null;
};

export const resolveDesktopManifestUrl = (
  baseUrl: string,
  channel?: DesktopReleaseChannel,
) => {
  const resolvedChannel =
    channel ?? resolveDesktopManifestChannelFromOrigin(baseUrl);
  const fileName = desktopReleaseManifestPublicPath(resolvedChannel).split("/").pop()!;
  return `${baseUrl.replace(/\/+$/, "")}/${fileName}`;
};

const resolveLegacyDesktopManifestUrl = (baseUrl: string) =>
  `${baseUrl.replace(/\/+$/, "")}/${LEGACY_MANIFEST_FILE_NAME}`;

const latestStatus = (runtime: DesktopUpdaterRuntime) => {
  const history = runtime.Updater.getStatusHistory();
  return history.length > 0 ? history[history.length - 1] : null;
};

export function createDesktopUpdaterCoordinator(
  options: DesktopUpdaterCoordinatorOptions,
) {
  let activeOperation: DesktopUpdaterAction | null = null;
  let activeTask: Promise<void> | null = null;
  const manifestCache = new Map<string, ManifestCacheEntry>();
  const fetcher = options.fetchFn ?? fetch;
  const now = options.now ?? Date.now;
  const manifestCacheTtlMs =
    options.manifestCacheTtlMs ?? DEFAULT_MANIFEST_CACHE_TTL_MS;
  const manifestNegativeCacheTtlMs =
    options.manifestNegativeCacheTtlMs ?? DEFAULT_MANIFEST_NEGATIVE_CACHE_TTL_MS;
  const resolvePlatform =
    options.resolvePlatform ?? resolveDefaultDesktopReleasePlatform;
  const resolveInstallLocation =
    options.resolveInstallLocation ??
    (() =>
      resolveDesktopInstallLocation({
        platform:
          process.platform === "win32"
            ? "win"
            : process.platform === "darwin"
              ? "macos"
              : "linux",
        execPath: process.execPath,
        homeDir: homedir(),
        xdgDataHome: process.env.XDG_DATA_HOME ?? null,
        localAppData: process.env.LOCALAPPDATA ?? null,
      }));
  const onOperationError =
    options.onOperationError ??
    ((operation, error) => {
      console.error(`[desktop-updater] ${operation} failed`, error);
    });

  const fetchManifestJson = async (
    url: string,
    expectedChannel: DesktopReleaseChannel,
  ) => {
    const response = await fetcher(url, {
      method: "GET",
      headers: {
        accept: "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const manifest = normalizeDesktopReleaseManifest(await response.json());
    if (!manifest) {
      throw new Error("invalid manifest payload");
    }
    if (manifest.channel !== expectedChannel) {
      throw new Error(
        `manifest channel ${manifest.channel} !== expected ${expectedChannel}`,
      );
    }
    return manifest;
  };

  const readPublishedReleaseArtifact = async (
    baseUrl: string,
    platform: DesktopReleasePlatform,
    electrobunChannel?: string,
  ): Promise<ReleaseArtifactState> => {
    const manifestChannel =
      mapElectrobunChannelToManifestChannel(electrobunChannel) ??
      resolveDesktopManifestChannelFromOrigin(baseUrl);
    const cacheKey = `${manifestChannel}:${platform}:${baseUrl.replace(/\/+$/, "")}`;
    const cached = manifestCache.get(cacheKey);
    if (cached && now() - cached.fetchedAt < cached.ttlMs) {
      return cached;
    }

    try {
      const preferredUrl = resolveDesktopManifestUrl(baseUrl, manifestChannel);
      const legacyUrl = resolveLegacyDesktopManifestUrl(baseUrl);
      let manifest;
      try {
        manifest = await fetchManifestJson(preferredUrl, manifestChannel);
      } catch (preferredError) {
        if (preferredUrl === legacyUrl) throw preferredError;
        manifest = await fetchManifestJson(legacyUrl, manifestChannel);
      }

      const artifact = manifest.artifacts[platform];
      const result = {
        fetchedAt: now(),
        artifact: artifact ? { platform, ...artifact } : null,
        error: artifact ? null : `manifest is missing a ${platform} artifact`,
      };
      manifestCache.set(cacheKey, { ...result, ttlMs: manifestCacheTtlMs });
      return result;
    } catch (error) {
      // 瞬时失败只做短负缓存：窗口内避免每次快照都打远端，窗口一过立即重试，
      // 不把失败当成完整 TTL 的「真值」缓存。
      const result = {
        fetchedAt: now(),
        artifact: null,
        error:
          error instanceof Error
            ? error.message
            : "failed to fetch desktop release manifest",
      };
      manifestCache.set(cacheKey, {
        ...result,
        ttlMs: manifestNegativeCacheTtlMs,
      });
      return result;
    }
  };

  const getSnapshot = async () => {
    const runtime = await options.loadDesktopRuntime();
    const { BuildConfig, Updater } = runtime;
    const [buildConfig, version, hash, channel, baseUrl] = await Promise.all([
      BuildConfig.get().catch(() => null),
      Updater.localInfo.version(),
      Updater.localInfo.hash(),
      Updater.localInfo.channel(),
      Updater.localInfo.baseUrl(),
    ]);
    const platform = resolvePlatform();
    const updateInfo = Updater.updateInfo?.() ?? null;
    const shouldLoadReleaseArtifact = Boolean(
      updateInfo?.updateAvailable || updateInfo?.updateReady,
    );
    const releaseArtifactState = shouldLoadReleaseArtifact
      ? await readPublishedReleaseArtifact(baseUrl, platform, channel)
      : { artifact: null, error: null };

    // 历史合并：持久化的交接失败记录排在最前（时间上早于本会话的运行时记录）。
    // 只动 statusHistory 不动 latestStatus，避免影响 summary 的 phase 推导。
    const runtimeHistory = Updater.getStatusHistory() ?? [];
    const persistedShutdownEntry = options.readShutdownStatusEntry?.();
    const statusHistory =
      persistedShutdownEntry &&
      !runtimeHistory.some(
        (entry) =>
          entry.status === persistedShutdownEntry.status &&
          entry.timestamp === persistedShutdownEntry.timestamp,
      )
        ? [persistedShutdownEntry, ...runtimeHistory]
        : runtimeHistory;

    return createDesktopUpdaterSnapshot({
      desktop: true,
      platform,
      installLocation: resolveInstallLocation(),
      activeOperation,
      localInfo: {
        version,
        hash,
        channel,
        baseUrl,
      },
      buildConfig,
      updateInfo,
      latestStatus: latestStatus(runtime),
      statusHistory,
      releaseArtifact: releaseArtifactState.artifact,
      manifestError: releaseArtifactState.error,
    } as Parameters<typeof createDesktopUpdaterSnapshot>[0]);
  };

  const startOperation = (
    operation: DesktopUpdaterAction,
    executor: () => Promise<void>,
    resetHistory = false,
  ) => {
    if (activeTask) {
      return false;
    }

    activeOperation = operation;
    activeTask = (async () => {
      try {
        if (resetHistory) {
          const runtime = await options.loadDesktopRuntime();
          runtime.Updater.clearStatusHistory();
        }
        await executor();
      } finally {
        activeOperation = null;
        activeTask = null;
      }
    })();

    activeTask.catch((error) => {
      onOperationError(operation, error);
    });

    return true;
  };

  const runAction = async (
    action: DesktopUpdaterAction,
  ): Promise<DesktopUpdaterActionResult> => {
    const snapshot = await getSnapshot();
    if (action !== "check" && snapshot.summary.primaryAction !== action) {
      return {
        ok: false,
        status: 409,
        error:
          snapshot.summary.statusMessage ??
          `Desktop updater is not ready to ${action} right now.`,
      };
    }

    const started = startOperation(
      action,
      async () => {
        const runtime = await options.loadDesktopRuntime();
        if (action === "check") {
          await runtime.Updater.checkForUpdate();
          return;
        }
        if (action === "download") {
          await runtime.Updater.downloadUpdate();
        } else {
          await runtime.Updater.applyUpdate();
        }
        // 下载/安装被 runtime 接受（操作成功完成）才算对上次交接失败的重试
        // 成功，此时才清除持久化失败记录。预检 409 拒绝或操作抛错都不会走到
        // 这里，旧失败记录保留（或被下一次成功的重试替换）。
        options.clearShutdownStatusEntry?.();
      },
      action === "check",
    );
    if (!started) {
      return {
        ok: false,
        status: 409,
        error: `Desktop updater is already busy with ${
          activeOperation ?? "another operation"
        }.`,
      };
    }

    return {
      ok: true,
      status: 202,
      snapshot: await getSnapshot(),
    };
  };

  return {
    getSnapshot,
    runAction,
  };
}
