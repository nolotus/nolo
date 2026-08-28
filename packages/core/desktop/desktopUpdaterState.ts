import type { DesktopReleasePlatform } from "../../app/constants/desktopReleaseManifest";
import {
  assessDesktopUpdateCandidate,
  type DesktopUpdateAssessment,
  type DesktopUpdaterReleaseArtifact,
} from "./desktopUpdatePolicy";

export type DesktopUpdaterOperation = "check" | "download" | "apply";

export type DesktopUpdaterStatusEntry = {
  status: string;
  message: string;
  timestamp: number;
  details?: {
    progress?: number;
    bytesDownloaded?: number;
    totalBytes?: number;
  };
};

export type DesktopUpdaterLocalInfo = {
  version: string;
  hash: string;
  channel: string;
  baseUrl: string;
};

export type DesktopUpdaterUpdateInfo = {
  version?: string;
  hash?: string;
  updateAvailable?: boolean;
  updateReady?: boolean;
  error?: string;
} | null;

export type DesktopUpdaterSummaryPhase =
  | "not_checked"
  | "checking"
  | "update_available"
  | "downloading"
  | "ready_to_install"
  | "applying"
  | "up_to_date"
  | "invalid_remote"
  | "error";

export type DesktopUpdaterSummary = {
  phase: DesktopUpdaterSummaryPhase;
  tone: "neutral" | "info" | "success" | "error";
  isBusy: boolean;
  hasChecked: boolean;
  primaryAction: "download" | "apply" | null;
  showToolbarButton: boolean;
  toolbarTitle: "Download update" | "Install update" | null;
  statusMessage: string | null;
};

export type DesktopUpdaterSnapshot = {
  desktop: true;
  platform: DesktopReleasePlatform;
  activeOperation: DesktopUpdaterOperation | null;
  localInfo: DesktopUpdaterLocalInfo;
  buildConfig: unknown;
  updateInfo: DesktopUpdaterUpdateInfo;
  latestStatus: DesktopUpdaterStatusEntry | null;
  statusHistory: DesktopUpdaterStatusEntry[];
  releaseArtifact: DesktopUpdaterReleaseArtifact | null;
  manifestError: string | null;
  assessment: DesktopUpdateAssessment;
  summary: DesktopUpdaterSummary;
};

export type DesktopUpdaterSnapshotInput = Omit<
  DesktopUpdaterSnapshot,
  "summary" | "assessment"
>;

const normalizeError = (value: string | undefined) => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

export function deriveDesktopUpdaterSummary(
  input: Pick<
    DesktopUpdaterSnapshotInput,
    | "platform"
    | "activeOperation"
    | "localInfo"
    | "updateInfo"
    | "latestStatus"
    | "releaseArtifact"
    | "manifestError"
  >
): DesktopUpdaterSummary {
  const latestStatusCode = input.latestStatus?.status ?? null;
  const updateError = normalizeError(input.updateInfo?.error);
  const isBusy = Boolean(input.activeOperation);
  const assessment = assessDesktopUpdateCandidate({
    platform: input.platform,
    localInfo: input.localInfo,
    updateInfo: input.updateInfo,
    releaseArtifact: input.releaseArtifact,
    manifestError: input.manifestError,
  });

  let phase: DesktopUpdaterSummaryPhase;
  if (updateError || latestStatusCode === "error") {
    phase = "error";
  } else if (input.activeOperation === "apply") {
    phase = "applying";
  } else if (input.activeOperation === "download") {
    phase = "downloading";
  } else if (input.activeOperation === "check" || latestStatusCode === "checking") {
    phase = "checking";
  } else if (assessment.phase === "invalid_remote") {
    phase = "invalid_remote";
  } else if (assessment.phase === "ready_to_install") {
    phase = "ready_to_install";
  } else if (assessment.phase === "update_available") {
    phase = "update_available";
  } else if (latestStatusCode === "no-update") {
    phase = "up_to_date";
  } else {
    phase = "not_checked";
  }

  const primaryAction =
    phase === "ready_to_install" ? "apply" : phase === "update_available" ? "download" : null;

  return {
    phase,
    tone:
      phase === "error"
        ? "error"
        : phase === "invalid_remote"
        ? "error"
        : phase === "ready_to_install"
          ? "success"
          : phase === "checking" ||
              phase === "update_available" ||
              phase === "downloading" ||
              phase === "applying"
            ? "info"
            : "neutral",
    isBusy,
    hasChecked: phase !== "not_checked",
    primaryAction,
    showToolbarButton: Boolean(primaryAction),
    toolbarTitle:
      primaryAction === "apply"
        ? "Install update"
        : primaryAction === "download"
          ? "Download update"
          : null,
    statusMessage: updateError ?? assessment.message ?? input.latestStatus?.message ?? null,
  };
}

export function createDesktopUpdaterSnapshot(
  input: DesktopUpdaterSnapshotInput
): DesktopUpdaterSnapshot {
  const assessment = assessDesktopUpdateCandidate({
    platform: input.platform,
    localInfo: input.localInfo,
    updateInfo: input.updateInfo,
    releaseArtifact: input.releaseArtifact,
    manifestError: input.manifestError,
  });

  return {
    ...input,
    assessment,
    summary: deriveDesktopUpdaterSummary(input),
  };
}
