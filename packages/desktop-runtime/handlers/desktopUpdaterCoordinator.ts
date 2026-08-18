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
} from "core/desktop/desktopUpdaterState";
import type { DesktopUpdaterReleaseArtifact } from "core/desktop/desktopUpdatePolicy";

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
  fetchFn?: DesktopUpdaterFetch;
  now?: () => number;
  manifestCacheTtlMs?: number;
  onOperationError?: (operation: DesktopUpdaterAction, error: unknown) => void;
};

const DEFAULT_MANIFEST_CACHE_TTL_MS = 30_000;
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
  const manifestCache = new Map<string, ReleaseArtifactState>();
  const fetcher = options.fetchFn ?? fetch;
  const now = options.now ?? Date.now;
  const manifestCacheTtlMs =
    options.manifestCacheTtlMs ?? DEFAULT_MANIFEST_CACHE_TTL_MS;
  const resolvePlatform =
    options.resolvePlatform ?? resolveDefaultDesktopReleasePlatform;
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
    if (cached && now() - cached.fetchedAt < manifestCacheTtlMs) {
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
      manifestCache.set(cacheKey, result);
      return result;
    } catch (error) {
      const result = {
        fetchedAt: now(),
        artifact: null,
        error:
          error instanceof Error
            ? error.message
            : "failed to fetch desktop release manifest",
      };
      manifestCache.set(cacheKey, result);
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

    return createDesktopUpdaterSnapshot({
      desktop: true,
      platform,
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
      statusHistory: Updater.getStatusHistory(),
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
        } else if (action === "download") {
          await runtime.Updater.downloadUpdate();
        } else {
          await runtime.Updater.applyUpdate();
        }
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
