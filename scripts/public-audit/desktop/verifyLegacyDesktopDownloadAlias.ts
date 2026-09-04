import { basename, join } from "node:path";
import { createHash } from "node:crypto";
import { readdir } from "node:fs/promises";
import {
  normalizeDesktopReleaseManifest,
  type DesktopReleaseChannel,
  type DesktopReleasePlatform,
} from "../../../packages/app/constants/desktopReleaseManifest";
import { toErrorMessage } from "core/errorMessage";
import { resolveDesktopUpdateJsonUploadName } from "../../release/desktopReleasePublisher";

const [legacyBaseArg, artifactDirArg = "packages/desktop/artifacts", channelArg = "stable"] =
  process.argv.slice(2);

const collectArtifactNames = async (dir: string, prefix: string): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true });
  const names: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      names.push(...(await collectArtifactNames(fullPath, prefix)));
      continue;
    }

    const name = basename(fullPath);
    if (
      name.startsWith(prefix) &&
      [".exe", ".dmg", ".tar.zst", ".zip", ".json", ".patch"].some((suffix) =>
        name.endsWith(suffix)
      )
    ) {
      names.push(name);
    }
  }

  return names;
};

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const readJson = async (
  url: URL,
  log: (message: string) => void,
  fetchImpl: FetchLike,
) => {
  log(`[verify-legacy-desktop-alias] GET ${url}`);
  const response = await fetchImpl(url, {
    method: "GET",
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`[verify-legacy-desktop-alias] ${url} returned ${response.status}`);
  }
  return response.json();
};

export async function verifyLegacyDesktopDownloadAlias(args: {
  legacyBaseUrl: string;
  artifactDir?: string;
  channel?: string;
  log?: (message: string) => void;
  fetchImpl?: FetchLike;
}) {
  const channelArg = args.channel ?? "stable";
  const artifactDirArg = args.artifactDir ?? "packages/desktop/artifacts";
  const prefix =
    channelArg === "stable" ? "stable-" : channelArg === "alpha" ? "canary-" : undefined;
  const log = args.log ?? (() => {});
  const fetchImpl = args.fetchImpl ?? fetch;

  if (!prefix) {
    throw new Error(`[verify-legacy-desktop-alias] Unsupported channel: ${channelArg}`);
  }

  const legacyBase = args.legacyBaseUrl.replace(/\/+$/, "");
  const channelManifestName = `desktop-release-manifest.${channelArg}.json`;
  const fileNames = new Set<string>([
    "desktop-release-manifest.json",
    channelManifestName,
  ]);

  for (const name of await collectArtifactNames(artifactDirArg, prefix)) {
    fileNames.add(name);
  }

  if (fileNames.size === 0) {
    throw new Error(`[verify-legacy-desktop-alias] No matching desktop artifacts found in ${artifactDirArg}`);
  }

  for (const name of Array.from(fileNames).sort()) {
    const url = new URL(`${legacyBase}/${name}`);
    log(`[verify-legacy-desktop-alias] HEAD ${url}`);
    const response = await fetchImpl(url, { method: "HEAD" });
    if (!response.ok) {
      throw new Error(`[verify-legacy-desktop-alias] ${url} returned ${response.status}`);
    }
  }

  const channel = channelArg as DesktopReleaseChannel;
  const channelManifestUrl = new URL(`${legacyBase}/${channelManifestName}`);
  const legacyManifestUrl = new URL(`${legacyBase}/desktop-release-manifest.json`);
  const channelManifest = normalizeDesktopReleaseManifest(
    await readJson(channelManifestUrl, log, fetchImpl),
  );
  const legacyManifest = normalizeDesktopReleaseManifest(
    await readJson(legacyManifestUrl, log, fetchImpl),
  );
  if (!channelManifest) {
    throw new Error(`[verify-legacy-desktop-alias] ${channelManifestName} is invalid`);
  }
  if (!legacyManifest) {
    throw new Error("[verify-legacy-desktop-alias] desktop-release-manifest.json is invalid");
  }
  if (channelManifest.channel !== channel) {
    throw new Error(
      `[verify-legacy-desktop-alias] channel manifest channel ${channelManifest.channel} does not match expected ${channel}`,
    );
  }
  if (legacyManifest.channel !== channel) {
    throw new Error(
      `[verify-legacy-desktop-alias] legacy manifest channel ${legacyManifest.channel} does not match expected ${channel}`,
    );
  }
  const manifest = channelManifest;

  for (const platform of ["windows", "linux", "macos"] as const) {
    const updateJsonName = resolveDesktopUpdateJsonUploadName({ channel, platform });
    if (!fileNames.has(updateJsonName)) continue;

    const updateJsonUrl = new URL(`${legacyBase}/${updateJsonName}`);
    log(`[verify-legacy-desktop-alias] GET ${updateJsonUrl}`);
    const updateJsonResponse = await fetchImpl(updateJsonUrl, {
      method: "GET",
      headers: { accept: "application/json" },
    });
    if (!updateJsonResponse.ok) {
      throw new Error(`[verify-legacy-desktop-alias] ${updateJsonUrl} returned ${updateJsonResponse.status}`);
    }
    const updateJsonBytes = await updateJsonResponse.arrayBuffer();
    const updateMetadata = JSON.parse(new TextDecoder().decode(updateJsonBytes)) as {
      version?: unknown;
      hash?: unknown;
    };
    if (typeof updateMetadata.version !== "string" || !updateMetadata.version.trim()) {
      throw new Error(`[verify-legacy-desktop-alias] ${updateJsonName} is missing version`);
    }
    if (typeof updateMetadata.hash !== "string" || !updateMetadata.hash.trim()) {
      throw new Error(`[verify-legacy-desktop-alias] ${updateJsonName} is missing hash`);
    }

    const artifact = manifest.artifacts[platform];
    if (!artifact) {
      throw new Error(
        `[verify-legacy-desktop-alias] manifest is missing ${platform} artifact for ${updateJsonName}`,
      );
    }
    if (!artifact.version?.trim()) {
      throw new Error(
        `[verify-legacy-desktop-alias] manifest ${platform} artifact is missing version`,
      );
    }
    if (artifact.version !== updateMetadata.version) {
      throw new Error(
        `[verify-legacy-desktop-alias] manifest version ${artifact.version} does not match ${updateJsonName} version ${updateMetadata.version}`,
      );
    }

    // Phase 3: validate updateMeta against published update.json
    if (artifact.updateMeta) {
      const meta = artifact.updateMeta;
      const metaBasename = new URL(meta.url, "https://dummy").pathname.split("/").pop();
      if (metaBasename !== updateJsonName) {
        throw new Error(
          `[verify-legacy-desktop-alias] ${platform} updateMeta.url basename ${metaBasename} does not match expected ${updateJsonName}`,
        );
      }
      if (meta.version !== updateMetadata.version) {
        throw new Error(
          `[verify-legacy-desktop-alias] ${platform} updateMeta.version ${meta.version} does not match published ${updateJsonName} version ${updateMetadata.version}`,
        );
      }
      if (meta.hash !== updateMetadata.hash) {
        throw new Error(
          `[verify-legacy-desktop-alias] ${platform} updateMeta.hash does not match published ${updateJsonName} hash`,
        );
      }
      const actualSize = updateJsonBytes.byteLength;
      if (meta.size !== actualSize) {
        throw new Error(
          `[verify-legacy-desktop-alias] ${platform} updateMeta.size ${meta.size} does not match published ${updateJsonName} size ${actualSize}`,
        );
      }
      const actualSha256 = createHash("sha256").update(new Uint8Array(updateJsonBytes)).digest("hex");
      if (meta.sha256 !== actualSha256) {
        throw new Error(
          `[verify-legacy-desktop-alias] ${platform} updateMeta.sha256 does not match published ${updateJsonName} sha256 ${actualSha256}`,
        );
      }
    }
  }

  log("[verify-legacy-desktop-alias] OK");
}

if (import.meta.main) {
  if (!legacyBaseArg) {
    console.error(
      "[verify-legacy-desktop-alias] Usage: bun verifyLegacyDesktopDownloadAlias.ts <legacy-base-url> [artifact-dir] [channel]"
    );
    process.exit(1);
  }

  try {
    await verifyLegacyDesktopDownloadAlias({
      legacyBaseUrl: legacyBaseArg,
      artifactDir: artifactDirArg,
      channel: channelArg,
      log: console.log,
    });
  } catch (error) {
    console.error(toErrorMessage(error));
    process.exit(1);
  }
}
