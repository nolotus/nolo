import { basename, join } from "node:path";
import { createHash } from "node:crypto";
import { readdir } from "node:fs/promises";
import {
  normalizeDesktopReleaseManifest,
  type DesktopReleaseChannel,
  type DesktopReleasePlatform,
} from "../../../packages/app/constants/desktopReleaseManifest";
import { toErrorMessage } from "core/errorMessage";
import { type DesktopPublishS3Config, resolveDesktopUpdateJsonUploadName } from "../../release/desktopReleasePublisher";

import { getS3ObjectSizeByRange, readS3Object } from "../../release/s3Upload";

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

export const readS3Config = (
  env: Record<string, string | undefined>,
  channel: DesktopReleaseChannel,
): DesktopPublishS3Config | undefined => {
  const keys = ["ENDPOINT", "BUCKET", "REGION", "ACCESS_KEY_ID", "SECRET_ACCESS_KEY"] as const;
  const values = keys.map((key) => env[`DESKTOP_DOWNLOAD_S3_${key}`]?.trim());
  if (values.every((value) => !value)) return undefined;
  if (values.some((value) => !value)) throw new Error("[verify-legacy-desktop-alias] Incomplete DESKTOP_DOWNLOAD_S3 configuration");
  return {
    storage: "s3",
    channel,
    endpoint: values[0]!,
    bucket: values[1]!,
    region: values[2]!,
    accessKeyId: values[3]!,
    secretAccessKey: values[4]!,
    pathPrefix: "",
    publicBase: "",
  };
};

export async function verifyLegacyDesktopDownloadAlias(args: {
  legacyBaseUrl: string;
  artifactDir?: string;
  channel?: string;
  log?: (message: string) => void;
  fetchImpl?: FetchLike;
  env?: Record<string, string | undefined>;
}) {
  const channelArg = args.channel ?? "stable";
  const artifactDirArg = args.artifactDir ?? "packages/desktop/artifacts";
  const prefix =
    channelArg === "stable" ? "stable-" : channelArg === "alpha" ? "canary-" : undefined;
  const log = args.log ?? (() => {});
  const fetchImpl = args.fetchImpl ?? fetch;
  const config = readS3Config(args.env ?? process.env, channelArg as DesktopReleaseChannel);
  let verifiedCount = 0;
  let skippedCount = 0;
  const publicAllowed = (response: Response, url: URL, head = false) => {
    if (response.status === 403) {
      skippedCount++;
      log(`[verify-legacy-desktop-alias] WARNING ${url} returned 403; skipping public URL check`);
      return false;
    }
    if (!response.ok && !(head && response.status >= 300 && response.status < 400)) {
      throw new Error(`[verify-legacy-desktop-alias] ${url} returned ${response.status}`);
    }
    return true;
  };
  const readText = async (name: string): Promise<string | undefined> => {
    if (config) {
      const text = await readS3Object({ config, uploadName: name, fetchFn: fetchImpl as typeof fetch });
      if (text !== null) {
        verifiedCount++;
        return text;
      }
    }
    const url = new URL(`${legacyBase}/${name}`);
    log(`[verify-legacy-desktop-alias] GET ${url}`);
    const response = await fetchImpl(url, { method: "GET", headers: { accept: "application/json" } });
    if (!publicAllowed(response, url)) return undefined;
    const text = await response.text();
    verifiedCount++;
    return text;
  };

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
    if (config) {
      const size = await getS3ObjectSizeByRange({ config, uploadName: name, fetchFn: fetchImpl as typeof fetch });
      if (size !== null) {
        if (size <= 0) throw new Error(`[verify-legacy-desktop-alias] ${name} is empty`);
        verifiedCount++;
        continue;
      }
    }
    const url = new URL(`${legacyBase}/${name}`);
    log(`[verify-legacy-desktop-alias] HEAD ${url}`);
    const response = await fetchImpl(url, { method: "HEAD" });
    if (publicAllowed(response, url, true)) verifiedCount++;
  }

  const channel = channelArg as DesktopReleaseChannel;
  const readManifest = async (name: string) => {
    const text = await readText(name);
    if (text === undefined) return undefined;
    const manifest = normalizeDesktopReleaseManifest(JSON.parse(text));
    if (!manifest) throw new Error(`[verify-legacy-desktop-alias] ${name} is invalid`);
    if (manifest.channel !== channel) {
      throw new Error(`[verify-legacy-desktop-alias] ${name} channel ${manifest.channel} does not match expected ${channel}`);
    }
    return manifest;
  };
  const channelManifest = await readManifest(channelManifestName);
  const legacyManifest = await readManifest("desktop-release-manifest.json");
  const manifest = channelManifest ?? legacyManifest;

  for (const platform of ["windows", "linux", "macos"] as const) {
    const updateJsonName = resolveDesktopUpdateJsonUploadName({ channel, platform });
    if (!fileNames.has(updateJsonName)) continue;

    const updateJsonText = await readText(updateJsonName);
    if (updateJsonText === undefined) continue;
    const updateJsonBytes = new TextEncoder().encode(updateJsonText);
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

    if (!manifest) continue;
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

  if (verifiedCount === 0) {
    throw new Error(
      `[verify-legacy-desktop-alias] No alias items were actually verified: ${config ? "S3 did not find the corresponding objects" : "S3 is not configured"}, and all public URL checks returned 403; skippedCount=${skippedCount}`,
    );
  }
  if (skippedCount > 0) {
    log(`[verify-legacy-desktop-alias] WARNING SUMMARY: skippedCount=${skippedCount} checks skipped because public URLs returned 403; verifiedCount=${verifiedCount}`);
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
