import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";
import type {
  TaskThreadDialogSummary,
  TaskThreadLoopVerification,
} from "../verify/taskThreadLoopVerifier";

export type TaskThreadProjectionState =
  | "no_evidence"
  | "in_progress_evidence"
  | "review_needed"
  | "done_candidate"
  | "blocker_or_failed"
  | "evidence_gap";

export type TaskThreadProjection = {
  state: TaskThreadProjectionState;
  basis: string[];
  recommendedCodeStatus?: "review_needed";
  evidence: {
    dialogIds: string[];
    artifactDialogIds: string[];
    failedDialogIds: string[];
    runningDialogIds: string[];
  };
};

function normalizeStatus(value: unknown): string {
  return asTrimmedLowercaseString(value);
}

function hasKeys(value: unknown): boolean {
  return Boolean(value) && typeof value === "object" && Object.keys(value as Record<string, unknown>).length > 0;
}

function arrayHasItems(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function hasArtifactEvidence(dialog: TaskThreadDialogSummary): boolean {
  if (arrayHasItems(dialog.artifacts)) return true;
  if (hasKeys(dialog.artifacts)) return true;
  const progress = dialog.runtimeCheckpoint?.workspaceProgress;
  if (!progress || typeof progress !== "object") return false;
  const record = progress as Record<string, unknown>;
  return (
    arrayHasItems(record.changedFiles) ||
    arrayHasItems(record.writtenFiles) ||
    arrayHasItems(record.tests) ||
    Boolean(record.commit)
  );
}

function hasReviewApprovalEvidence(dialog: TaskThreadDialogSummary): boolean {
  const artifacts = dialog.artifacts;
  if (!artifacts || typeof artifacts !== "object") return false;
  const record = artifacts as Record<string, unknown>;
  const review = record.review;
  if (review && typeof review === "object") {
    const reviewRecord = review as Record<string, unknown>;
    return normalizeStatus(reviewRecord.status) === "approved" || normalizeStatus(reviewRecord.decision) === "approved";
  }
  return normalizeStatus(record.reviewStatus) === "approved" || normalizeStatus(record.decision) === "approved";
}

function isRunningDialog(dialog: TaskThreadDialogSummary): boolean {
  const status = normalizeStatus(dialog.status);
  const checkpoint = normalizeStatus(dialog.checkpointStatus);
  return ["running", "active", "pending", "queued"].includes(status) ||
    ["running", "active", "pending", "queued", "progress"].includes(checkpoint);
}

function isFailedDialog(dialog: TaskThreadDialogSummary): boolean {
  const status = normalizeStatus(dialog.status);
  const checkpoint = normalizeStatus(dialog.checkpointStatus);
  return ["failed", "error", "cancelled", "canceled"].includes(status) ||
    ["failed", "error", "cancelled", "canceled"].includes(checkpoint);
}

function isDoneDialog(dialog: TaskThreadDialogSummary): boolean {
  const status = normalizeStatus(dialog.status);
  const checkpoint = normalizeStatus(dialog.checkpointStatus);
  return ["done", "completed", "complete", "success"].includes(status) ||
    ["done", "completed", "complete", "success"].includes(checkpoint);
}

export function projectTaskThreadStatus(
  verification: Pick<TaskThreadLoopVerification, "row" | "activityRefs" | "dialogs">,
): TaskThreadProjection {
  const dialogs = verification.dialogs;
  const running = dialogs.filter(isRunningDialog);
  const failed = dialogs.filter(isFailedDialog);
  const done = dialogs.filter(isDoneDialog);
  const artifactDialogs = dialogs.filter(hasArtifactEvidence);
  const basis: string[] = [];

  if (failed.length > 0) {
    basis.push("dialog failed/error status");
    return {
      state: "blocker_or_failed",
      basis,
      evidence: {
        dialogIds: dialogs.map((dialog) => dialog.dialogId),
        artifactDialogIds: artifactDialogs.map((dialog) => dialog.dialogId),
        failedDialogIds: failed.map((dialog) => dialog.dialogId),
        runningDialogIds: running.map((dialog) => dialog.dialogId),
      },
    };
  }

  if (running.length > 0) {
    basis.push("dialog running/pending checkpoint");
    return {
      state: "in_progress_evidence",
      basis,
      evidence: {
        dialogIds: dialogs.map((dialog) => dialog.dialogId),
        artifactDialogIds: artifactDialogs.map((dialog) => dialog.dialogId),
        failedDialogIds: [],
        runningDialogIds: running.map((dialog) => dialog.dialogId),
      },
    };
  }

  if (done.length > 0 && artifactDialogs.length > 0) {
    const approved = done.some(hasReviewApprovalEvidence);
    basis.push("done dialog with artifact/checkpoint evidence");
    return {
      state: approved || normalizeStatus(verification.row.codeStatus) === "verified"
        ? "done_candidate"
        : "review_needed",
      basis,
      recommendedCodeStatus: approved || normalizeStatus(verification.row.codeStatus) === "verified"
        ? undefined
        : "review_needed",
      evidence: {
        dialogIds: dialogs.map((dialog) => dialog.dialogId),
        artifactDialogIds: artifactDialogs.map((dialog) => dialog.dialogId),
        failedDialogIds: [],
        runningDialogIds: [],
      },
    };
  }

  if (done.length > 0) {
    basis.push("done dialog lacks artifact evidence");
    return {
      state: "evidence_gap",
      basis,
      evidence: {
        dialogIds: dialogs.map((dialog) => dialog.dialogId),
        artifactDialogIds: [],
        failedDialogIds: [],
        runningDialogIds: [],
      },
    };
  }

  if (verification.activityRefs.length === 0) {
    basis.push("no activity refs");
    return {
      state: "no_evidence",
      basis,
      evidence: {
        dialogIds: [],
        artifactDialogIds: [],
        failedDialogIds: [],
        runningDialogIds: [],
      },
    };
  }

  basis.push("activity refs exist but dialogs are unreadable or inconclusive");
  return {
    state: "evidence_gap",
    basis,
    evidence: {
      dialogIds: dialogs.map((dialog) => dialog.dialogId),
      artifactDialogIds: artifactDialogs.map((dialog) => dialog.dialogId),
      failedDialogIds: [],
      runningDialogIds: [],
    },
  };
}
