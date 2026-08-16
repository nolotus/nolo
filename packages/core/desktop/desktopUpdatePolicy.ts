import type {
  DesktopReleaseArtifact,
  DesktopReleasePlatform,
} from "../../app/constants/desktopReleaseManifest";

type DesktopUpdaterLocalInfoLike = {
  version: string;
  hash: string;
};

type DesktopUpdaterRemoteInfoLike = {
  version?: string;
  hash?: string;
  updateAvailable?: boolean;
  updateReady?: boolean;
  error?: string;
} | null;

export type DesktopUpdaterReleaseArtifact = DesktopReleaseArtifact & {
  platform: DesktopReleasePlatform;
};

export type DesktopUpdateAssessmentCode =
  | "not_checked"
  | "update_available"
  | "ready_to_install"
  | "remote_downgrade"
  | "same_version_republish"
  | "manifest_unavailable"
  | "manifest_version_missing"
  | "manifest_version_mismatch"
  | "remote_version_missing"
  | "version_parse_failed";

export type DesktopUpdateAssessment = {
  phase:
    | "not_checked"
    | "update_available"
    | "ready_to_install"
    | "invalid_remote";
  code: DesktopUpdateAssessmentCode;
  message: string | null;
  primaryAction: "download" | "apply" | null;
};

const DESKTOP_VERSION_PATTERN =
  /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?$/;

type ParsedDesktopVersion = {
  numbers: [number, number, number];
  prerelease: string | null;
};

function normalizeDesktopVersion(value: string | undefined): ParsedDesktopVersion | null {
  const normalized = value?.trim();
  if (!normalized) return null;
  const match = DESKTOP_VERSION_PATTERN.exec(normalized);
  if (!match) return null;
  return {
    numbers: [
      Number.parseInt(match[1]!, 10),
      Number.parseInt(match[2]!, 10),
      Number.parseInt(match[3]!, 10),
    ],
    prerelease: match[4] ?? null,
  };
}

function comparePrereleases(leftTag: string, rightTag: string): number {
  const leftParts = leftTag.split(".");
  const rightParts = rightTag.split(".");
  const minLen = Math.min(leftParts.length, rightParts.length);

  for (let i = 0; i < minLen; i += 1) {
    const a = leftParts[i]!;
    const b = rightParts[i]!;
    if (a === b) continue;

    const aNum = Number.parseInt(a, 10);
    const bNum = Number.parseInt(b, 10);
    const aIsNum = !Number.isNaN(aNum) && String(aNum) === a;
    const bIsNum = !Number.isNaN(bNum) && String(bNum) === b;

    if (aIsNum && bIsNum) {
      return aNum - bNum;
    }
    if (aIsNum && !bIsNum) {
      return -1;
    }
    if (!aIsNum && bIsNum) {
      return 1;
    }
    return a.localeCompare(b);
  }

  return leftParts.length - rightParts.length;
}

export function compareDesktopVersions(left: string, right: string) {
  const leftParsed = normalizeDesktopVersion(left);
  const rightParsed = normalizeDesktopVersion(right);
  if (!leftParsed || !rightParsed) return null;

  for (let index = 0; index < 3; index += 1) {
    const delta = leftParsed.numbers[index]! - rightParsed.numbers[index]!;
    if (delta !== 0) return delta;
  }

  if (leftParsed.prerelease === null && rightParsed.prerelease !== null) {
    return 1;
  }
  if (leftParsed.prerelease !== null && rightParsed.prerelease === null) {
    return -1;
  }
  if (leftParsed.prerelease !== null && rightParsed.prerelease !== null) {
    return comparePrereleases(leftParsed.prerelease, rightParsed.prerelease);
  }

  return 0;
}

function invalidAssessment(
  code: Exclude<DesktopUpdateAssessmentCode, "not_checked" | "update_available" | "ready_to_install">,
  message: string,
): DesktopUpdateAssessment {
  return {
    phase: "invalid_remote",
    code,
    message,
    primaryAction: null,
  };
}

export function assessDesktopUpdateCandidate(args: {
  platform: DesktopReleasePlatform;
  localInfo: DesktopUpdaterLocalInfoLike;
  updateInfo: DesktopUpdaterRemoteInfoLike;
  releaseArtifact: DesktopUpdaterReleaseArtifact | null;
  manifestError: string | null;
}): DesktopUpdateAssessment {
  const updateInfo = args.updateInfo;
  if (!updateInfo || (!updateInfo.updateAvailable && !updateInfo.updateReady)) {
    return {
      phase: "not_checked",
      code: "not_checked",
      message: null,
      primaryAction: null,
    };
  }

  const remoteVersion = updateInfo.version?.trim();
  if (!remoteVersion) {
    return invalidAssessment(
      "remote_version_missing",
      `Blocked remote desktop update for ${args.platform}: update metadata is missing a version.`,
    );
  }

  const versionDelta = compareDesktopVersions(remoteVersion, args.localInfo.version);
  if (versionDelta === null) {
    return invalidAssessment(
      "version_parse_failed",
      `Blocked remote desktop update for ${args.platform}: cannot compare installed version ${args.localInfo.version} with remote version ${remoteVersion}.`,
    );
  }

  if (versionDelta < 0) {
    return invalidAssessment(
      "remote_downgrade",
      `Blocked remote desktop update for ${args.platform}: remote version ${remoteVersion} is older than installed version ${args.localInfo.version}.`,
    );
  }

  if (versionDelta === 0 && updateInfo.hash && updateInfo.hash !== args.localInfo.hash) {
    return invalidAssessment(
      "same_version_republish",
      `Blocked remote desktop update for ${args.platform}: same-version different-hash republishes are not allowed. Bump the desktop version before publishing stable updates.`,
    );
  }

  if (updateInfo.updateReady) {
    return {
      phase: "ready_to_install",
      code: "ready_to_install",
      message: `Downloaded desktop update ${remoteVersion} is ready to install.`,
      primaryAction: "apply",
    };
  }

  if (args.manifestError || !args.releaseArtifact) {
    return invalidAssessment(
      "manifest_unavailable",
      `Blocked remote desktop update for ${args.platform}: the desktop release manifest is unavailable, so version ${remoteVersion} cannot be verified.`,
    );
  }

  if (!args.releaseArtifact.version?.trim()) {
    return invalidAssessment(
      "manifest_version_missing",
      `Blocked remote desktop update for ${args.platform}: the desktop release manifest is missing a version for the published artifact.`,
    );
  }

  const manifestDelta = compareDesktopVersions(args.releaseArtifact.version, remoteVersion);
  if (manifestDelta === null || manifestDelta !== 0) {
    return invalidAssessment(
      "manifest_version_mismatch",
      `Blocked remote desktop update for ${args.platform}: manifest version ${args.releaseArtifact.version} does not match update metadata version ${remoteVersion}.`,
    );
  }

  return {
    phase: "update_available",
    code: "update_available",
    message: `Desktop update ${remoteVersion} is available.`,
    primaryAction: "download",
  };
}
