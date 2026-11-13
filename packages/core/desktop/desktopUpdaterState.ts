import type { DesktopReleasePlatform } from "../../app/constants/desktopReleaseManifest";
import {
  assessDesktopUpdateCandidate,
  type DesktopUpdateAssessment,
  type DesktopUpdaterReleaseArtifact,
} from "./desktopUpdatePolicy";
import type { DesktopInstallLocation } from "./desktopInstallLocation";

/** 非受管理安装（/opt、%LOCALAPPDATA%\Programs、手动解压等）的引导文案。 */
export const EXTERNAL_INSTALL_MESSAGE =
  "当前为系统/手动安装，应用内更新不可用；请到「客户端下载」页获取新版本。";

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
  | "external_install"
  | "downloading"
  | "ready_to_install"
  | "applying"
  | "up_to_date"
  | "ahead_of_channel"
  | "invalid_remote"
  | "error";

export type DesktopUpdaterSummary = {
  phase: DesktopUpdaterSummaryPhase;
  tone: "neutral" | "info" | "success" | "error";
  isBusy: boolean;
  hasChecked: boolean;
  primaryAction: "download" | "apply" | null;
  /**
   * error 态下由 core 裁决的可重试动作。UI 只触发它，不自行判断该重试什么。
   * 非 error 态为 null；下载/安装仍受候选与安装位置安全门约束。
   */
  retryAction: DesktopUpdaterOperation | null;
  showToolbarButton: boolean;
  toolbarTitle: "Download update" | "Install update" | null;
  statusMessage: string | null;
};

export type DesktopUpdaterSnapshot = {
  desktop: true;
  platform: DesktopReleasePlatform;
  /** 运行中安装是否位于 electrobun 受管理更新目录（决定能否应用内更新）。 */
  installLocation: DesktopInstallLocation;
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

const getSummaryTone = (phase: DesktopUpdaterSummaryPhase): DesktopUpdaterSummary["tone"] => {
  if (phase === "error" || phase === "invalid_remote") return "error";
  if (phase === "ahead_of_channel" || phase === "ready_to_install") return "success";
  if (
    ["checking", "update_available", "downloading", "applying", "external_install"].includes(phase)
  )
    return "info";
  return "neutral";
};

export function deriveDesktopUpdaterSummary(
  input: Pick<
    DesktopUpdaterSnapshotInput,
    | "platform"
    | "installLocation"
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
  const installLocation = input.installLocation ?? "managed";
  const isBusy = Boolean(input.activeOperation);
  const assessment = assessDesktopUpdateCandidate({
    platform: input.platform,
    localInfo: input.localInfo,
    updateInfo: input.updateInfo,
    releaseArtifact: input.releaseArtifact,
    manifestError: input.manifestError,
  });

  let phase: DesktopUpdaterSummaryPhase;
  if (input.activeOperation === "apply") {
    phase = "applying";
  } else if (input.activeOperation === "download") {
    phase = "downloading";
  } else if (input.activeOperation === "check") {
    phase = "checking";
  } else if (updateError || latestStatusCode === "error") {
    phase = "error";
  } else if (latestStatusCode === "checking") {
    phase = "checking";
  } else if (assessment.phase === "ahead_of_channel") {
    phase = "ahead_of_channel";
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

  // 非受管理安装（deb/rpm → /opt；Windows 安装器 → %LOCALAPPDATA%\Programs；手动解压等）：
  // 检查更新可用，但 electrobun 会拒绝下载/应用。提前降级成引导态，绝不给必然失败的按钮。
  if (
    installLocation === "external" &&
    (phase === "update_available" || phase === "ready_to_install")
  ) {
    phase = "external_install";
  }

  const primaryAction =
    phase === "ready_to_install" ? "apply" : phase === "update_available" ? "download" : null;

  // 执行端仅在 primaryAction 放行时接受下载/安装；error 先检查重建候选，
  // 随后仍由 assessment 与安装位置门决定是否开放下载/安装。
  const retryAction: DesktopUpdaterOperation | null = phase === "error" ? "check" : null;

  // 按钮显隐：可动作态、忙态（下载/安装中）、error 态都露出；
  // 其余静止态（未检查/检查中/已最新/领先/无效/外部安装）保持隐藏。
  const showToolbarButton =
    Boolean(primaryAction) ||
    phase === "downloading" ||
    phase === "applying" ||
    phase === "error";

  return {
    phase,
    tone: getSummaryTone(phase),
    isBusy,
    hasChecked: phase !== "not_checked",
    primaryAction,
    retryAction,
    showToolbarButton,
    toolbarTitle:
      primaryAction === "apply"
        ? "Install update"
        : primaryAction === "download"
          ? "Download update"
          : null,
    // error 态优先展示 runtime 的失败原文，不再回落成 assessment 的「有新版本」文案。
    statusMessage:
      (isBusy ? null : updateError) ??
      (phase === "external_install"
        ? EXTERNAL_INSTALL_MESSAGE
        : phase === "error"
          ? input.latestStatus?.message ?? assessment.message ?? null
          : assessment.message ?? input.latestStatus?.message ?? null),
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
