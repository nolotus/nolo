import { asOptionalFiniteNumber } from "core/optionalNumber";
import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";
import type {
  TaskThreadDialogSummary,
  TaskThreadLoopVerification,
} from "../verify/taskThreadLoopVerifier";
import { projectTaskThreadStatus } from "./taskThreadProjection";

export type TaskThreadMonitorReason =
  | "running_checkpoint_fresh"
  | "dialog_failed"
  | "review_needed"
  | "stale_running_dialog"
  | "evidence_gap"
  | "no_actionable_evidence";

export type TaskThreadMonitorDecision = {
  action: "silent" | "notify";
  reason: TaskThreadMonitorReason;
  message: string;
  evidence: {
    dialogIds: string[];
    staleDialogIds: string[];
    failedDialogIds: string[];
    artifactDialogIds: string[];
  };
  recommendation?: {
    status?: "blocked";
    codeStatus?: "review_needed";
  };
};

function normalizeStatus(value: unknown): string {
  return asTrimmedLowercaseString(value);
}

function parseTimestampMs(value: unknown): number | null {
  const asNumber = asOptionalFiniteNumber(value);
  if (asNumber !== undefined) return asNumber;
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function dialogUpdatedAtMs(dialog: TaskThreadDialogSummary): number | null {
  return parseTimestampMs(dialog.runtimeCheckpoint?.updatedAt) ??
    parseTimestampMs(dialog.sourceRef?.updatedAt);
}

function isRunningDialog(dialog: TaskThreadDialogSummary): boolean {
  const status = normalizeStatus(dialog.status);
  const checkpoint = normalizeStatus(dialog.checkpointStatus);
  return ["running", "active", "pending", "queued"].includes(status) ||
    ["running", "active", "pending", "queued", "progress"].includes(checkpoint);
}

function staleRunningDialogIds(args: {
  dialogs: TaskThreadDialogSummary[];
  nowMs: number;
  staleAfterMs: number;
}): string[] {
  return args.dialogs
    .filter(isRunningDialog)
    .filter((dialog) => {
      const updatedAtMs = dialogUpdatedAtMs(dialog);
      if (updatedAtMs === null) return true;
      return args.nowMs - updatedAtMs > args.staleAfterMs;
    })
    .map((dialog) => dialog.dialogId);
}

export function assessTaskThreadMonitor(
  verification: Pick<TaskThreadLoopVerification, "row" | "activityRefs" | "dialogs">,
  options: {
    nowMs?: number;
    staleAfterMs?: number;
  } = {},
): TaskThreadMonitorDecision {
  const nowMs = options.nowMs ?? Date.now();
  const staleAfterMs = options.staleAfterMs ?? 30 * 60_000;
  const projection = projectTaskThreadStatus(verification);
  const staleDialogIds = staleRunningDialogIds({
    dialogs: verification.dialogs,
    nowMs,
    staleAfterMs,
  });
  const evidence = {
    dialogIds: projection.evidence.dialogIds,
    staleDialogIds,
    failedDialogIds: projection.evidence.failedDialogIds,
    artifactDialogIds: projection.evidence.artifactDialogIds,
  };

  if (projection.state === "blocker_or_failed") {
    return {
      action: "notify",
      reason: "dialog_failed",
      message: "Dialog evidence reports a failed or cancelled task thread.",
      evidence,
      recommendation: { status: "blocked" },
    };
  }

  if (staleDialogIds.length > 0) {
    return {
      action: "notify",
      reason: "stale_running_dialog",
      message: "A running task dialog has no fresh checkpoint.",
      evidence,
    };
  }

  if (projection.state === "in_progress_evidence") {
    return {
      action: "silent",
      reason: "running_checkpoint_fresh",
      message: "Running dialog checkpoint is fresh enough; no taskboard write is needed.",
      evidence,
    };
  }

  if (projection.state === "review_needed") {
    return {
      action: "notify",
      reason: "review_needed",
      message: "Done dialog evidence includes artifacts and should be reviewed.",
      evidence,
      recommendation: { codeStatus: "review_needed" },
    };
  }

  if (projection.state === "evidence_gap") {
    return {
      action: "notify",
      reason: "evidence_gap",
      message: "Task activity exists but dialog/artifact evidence is incomplete.",
      evidence,
    };
  }

  return {
    action: "silent",
    reason: "no_actionable_evidence",
    message: "No actionable task thread evidence found.",
    evidence,
  };
}
