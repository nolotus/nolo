/** Host-owned snapshot. Never derive this contract from prompt text or model output.
 * Evidence references must be verified by the host; this module does not execute Git
 * or authenticate references. It only checks consistency of the supplied snapshot.
 */
export type TaskExecutionContract = {
  taskId: string;
  role: "owner" | "implementation-leaf";
  authorization: "active" | "paused" | "revoked";
  acceptance: "pending" | "waived" | "accepted" | "unknown";
  implementation: "complete" | "incomplete" | "unknown";
  changes: "changed" | "unchanged" | "unknown";
  /** Revision covers all task-owned changes, including untracked files. */
  revision?: string;
  authorInstanceId?: string;
  review?: {
    revision: string;
    reviewerInstanceId: string;
    verdict: "APPROVE" | "WARNING" | "BLOCK";
    hasCriticalOrHigh: boolean;
    evidenceRef: string;
  };
  commit?: { revision: string; commitId: string; evidenceRef: string };
  localMerge?: { sourceCommitId: string; targetBranch: string; mergeCommitId: string; evidenceRef: string };
};

export type BusinessCompletionReason =
  | "stopped" | "execution_failed" | "budget_exhausted" | "invalid_contract"
  | "authorization_paused" | "authorization_revoked"
  | "acceptance_pending" | "acceptance_unknown" | "implementation_incomplete"
  | "changes_unknown" | "revision_missing" | "review_missing" | "review_stale"
  | "review_not_independent" | "review_rejected" | "commit_missing" | "commit_stale"
  | "local_merge_missing" | "local_merge_mismatch";

export type BusinessCompletion = {
  taskId: string;
  status: "completed" | "incomplete" | "blocked" | "waiting";
  reasons: BusinessCompletionReason[];
};

export type TaskExecutionOutcome = {
  stopped?: boolean;
  executionFailed?: boolean;
  budgetExhausted?: boolean;
};

const present = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

/** No contract => legacy semantics, not an implicit authorization or completion. */
export function evaluateTaskExecutionContract(
  contract: TaskExecutionContract | undefined,
  outcome: TaskExecutionOutcome = {},
): BusinessCompletion | undefined {
  if (!contract) return undefined;
  const result = (status: BusinessCompletion["status"], ...reasons: BusinessCompletionReason[]): BusinessCompletion =>
    ({ taskId: contract.taskId, status, reasons });
  // Cancellation takes priority over every supplied success claim.
  if (outcome.stopped) return result("blocked", "stopped");
  if (!present(contract.taskId) ||
      !["owner", "implementation-leaf"].includes(contract.role) ||
      !["active", "paused", "revoked"].includes(contract.authorization) ||
      !["pending", "waived", "accepted", "unknown"].includes(contract.acceptance) ||
      !["complete", "incomplete", "unknown"].includes(contract.implementation) ||
      !["changed", "unchanged", "unknown"].includes(contract.changes)) {
    return result("blocked", "invalid_contract");
  }
  if (contract.authorization === "revoked") return result("blocked", "authorization_revoked");
  if (contract.authorization === "paused") return result("blocked", "authorization_paused");
  if (outcome.executionFailed) return result("blocked", "execution_failed");
  if (outcome.budgetExhausted) return result("incomplete", "budget_exhausted");
  if (contract.implementation !== "complete") return result("incomplete", "implementation_incomplete");
  if (contract.acceptance === "pending") return result("waiting", "acceptance_pending");
  if (contract.acceptance === "unknown") return result("blocked", "acceptance_unknown");
  if (contract.changes === "unknown") return result("incomplete", "changes_unknown");
  // A leaf completes its own brief, not the parent's integration obligations.
  if (contract.role === "implementation-leaf" || contract.changes === "unchanged") return result("completed");
  if (!present(contract.revision)) return result("incomplete", "revision_missing");
  const review = contract.review;
  if (!review || !present(review.evidenceRef)) return result("incomplete", "review_missing");
  if (review.revision !== contract.revision) return result("incomplete", "review_stale");
  if (!present(contract.authorInstanceId) || !present(review.reviewerInstanceId) ||
      review.reviewerInstanceId === contract.authorInstanceId) return result("blocked", "review_not_independent");
  if (review.verdict !== "APPROVE" || review.hasCriticalOrHigh !== false) return result("blocked", "review_rejected");
  const commit = contract.commit;
  if (!commit || !present(commit.commitId) || !present(commit.evidenceRef)) return result("incomplete", "commit_missing");
  if (commit.revision !== contract.revision) return result("incomplete", "commit_stale");
  const merge = contract.localMerge;
  if (!merge || !present(merge.targetBranch) || !present(merge.mergeCommitId) || !present(merge.evidenceRef)) {
    return result("incomplete", "local_merge_missing");
  }
  if (merge.sourceCommitId !== commit.commitId) return result("incomplete", "local_merge_mismatch");
  return result("completed");
}
