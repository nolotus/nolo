export type DesktopReleaseChannel = "alpha" | "stable";
export type DesktopReleasePlatform = "windows" | "linux" | "macos";

export type DesktopReleaseUpdateMeta = {
  url: string;
  sha256: string;
  size: number;
  version: string;
  hash: string;
};

export type DesktopReleaseArtifact = {
  url: string;
  size: number;
  sha256?: string;
  version?: string;
  buildSha?: string;
  publishedAt?: string;
  updateMeta?: DesktopReleaseUpdateMeta;
};

export type DesktopReleaseManifest = {
  schemaVersion: 1;
  channel: DesktopReleaseChannel;
  updatedAt: string;
  artifacts: Partial<Record<DesktopReleasePlatform, DesktopReleaseArtifact>>;
};

export const DESKTOP_RELEASE_MANIFEST_DB_KEY = "desktop-release-manifest";
export const DESKTOP_RELEASE_MANIFEST_PUBLIC_PATH =
  "/public/downloads/desktop-release-manifest.json";

export function desktopReleaseManifestPublicPath(
  channel?: DesktopReleaseChannel,
): string {
  if (channel === "alpha" || channel === "stable") {
    return `/public/downloads/desktop-release-manifest.${channel}.json`;
  }
  return DESKTOP_RELEASE_MANIFEST_PUBLIC_PATH;
}

export function desktopReleaseManifestDbKey(
  channel?: DesktopReleaseChannel,
): string {
  if (channel === "alpha" || channel === "stable") {
    return `desktop-release-manifest.${channel}`;
  }
  return DESKTOP_RELEASE_MANIFEST_DB_KEY;
}

/** us.nolo.chat → alpha; everything else (incl. missing/invalid) → stable. */
export function resolveDesktopManifestChannelFromOrigin(
  origin?: string | null,
): DesktopReleaseChannel {
  if (typeof origin !== "string") return "stable";
  const trimmed = origin.trim();
  if (!trimmed) return "stable";
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (url.hostname === "us.nolo.chat") return "alpha";
  } catch {
    // fall through to stable
  }
  return "stable";
}

/**
 * Authoritative public downloads base for SSR/remote manifest reads.
 * Matches ELECTROBUN_RELEASE_BASE_URL / getClientDownloadChannel host convention.
 */
export const DESKTOP_RELEASE_PUBLIC_DOWNLOAD_BASES = {
  alpha: "https://us.nolo.chat/public/downloads",
  stable: "https://nolo.chat/public/downloads",
} as const satisfies Record<DesktopReleaseChannel, string>;

export function resolveDesktopReleasePublicBase(
  channel: DesktopReleaseChannel,
): string {
  return DESKTOP_RELEASE_PUBLIC_DOWNLOAD_BASES[channel];
}

export function resolveDesktopReleaseManifestRemoteUrl(
  channel: DesktopReleaseChannel,
): string {
  const base = resolveDesktopReleasePublicBase(channel).replace(/\/+$/, "");
  const fileName = desktopReleaseManifestPublicPath(channel).split("/").pop()!;
  return `${base}/${fileName}`;
}

export function resolveLegacyDesktopReleaseManifestRemoteUrl(
  channel: DesktopReleaseChannel,
): string {
  const base = resolveDesktopReleasePublicBase(channel).replace(/\/+$/, "");
  return `${base}/${DESKTOP_RELEASE_MANIFEST_PUBLIC_PATH.split("/").pop()!}`;
}

export function isDesktopReleaseChannel(value: unknown): value is DesktopReleaseChannel {
  return value === "alpha" || value === "stable";
}

export function isDesktopReleasePlatform(value: unknown): value is DesktopReleasePlatform {
  return value === "windows" || value === "linux" || value === "macos";
}

export function normalizeDesktopReleaseManifest(
  value: unknown,
): DesktopReleaseManifest | null {
  if (!value || typeof value !== "object") return null;
  const manifest = value as Partial<DesktopReleaseManifest>;
  if (manifest.schemaVersion !== 1 || !isDesktopReleaseChannel(manifest.channel)) {
    return null;
  }
  if (!manifest.artifacts || typeof manifest.artifacts !== "object") {
    return null;
  }

  const artifacts: DesktopReleaseManifest["artifacts"] = {};
  for (const platform of ["windows", "linux", "macos"] as const) {
    const artifact = manifest.artifacts[platform];
    if (!artifact || typeof artifact !== "object") continue;
    if (typeof artifact.url !== "string" || typeof artifact.size !== "number") continue;
    let updateMeta: DesktopReleaseUpdateMeta | undefined;
    const rawUpdateMeta = (artifact as Record<string, unknown>).updateMeta;
    if (
      rawUpdateMeta &&
      typeof rawUpdateMeta === "object" &&
      typeof (rawUpdateMeta as Record<string, unknown>).url === "string" &&
      typeof (rawUpdateMeta as Record<string, unknown>).sha256 === "string" &&
      typeof (rawUpdateMeta as Record<string, unknown>).size === "number" &&
      typeof (rawUpdateMeta as Record<string, unknown>).version === "string" &&
      typeof (rawUpdateMeta as Record<string, unknown>).hash === "string"
    ) {
      const meta = rawUpdateMeta as Record<string, unknown>;
      updateMeta = {
        url: meta.url as string,
        sha256: meta.sha256 as string,
        size: meta.size as number,
        version: meta.version as string,
        hash: meta.hash as string,
      };
    }

    artifacts[platform] = {
      url: artifact.url,
      size: artifact.size,
      ...(typeof artifact.sha256 === "string" ? { sha256: artifact.sha256 } : {}),
      ...(typeof artifact.version === "string" ? { version: artifact.version } : {}),
      ...(typeof artifact.buildSha === "string" ? { buildSha: artifact.buildSha } : {}),
      ...(typeof artifact.publishedAt === "string" ? { publishedAt: artifact.publishedAt } : {}),
      ...(updateMeta ? { updateMeta } : {}),
    };
  }

  return {
    schemaVersion: 1,
    channel: manifest.channel,
    updatedAt:
      typeof manifest.updatedAt === "string"
        ? manifest.updatedAt
        : new Date(0).toISOString(),
    artifacts,
  };
}
