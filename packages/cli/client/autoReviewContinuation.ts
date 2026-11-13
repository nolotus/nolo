import type { HostTaskReference } from "./hostTaskEvents";

/** Host-only input: created by an explicit task lifecycle entry, never parsed
 * from a title, prompt keywords, or a model's completion claim. The message ID
 * identifies the actual user submission; digest binds its exact content. */
export type AccountTaskStart = {
  taskInstanceId: string;
  userId: string;
  userMessageId: string;
  contentSha256: string;
};
export type AutoReviewStage = "implementation" | "wait-user" | "wait-review" | "decision" | "fix" | "commit" | "merge" | "done" | "blocked";
export type AutoReviewFingerprint = {
  taskInstanceId: string;
  stage: AutoReviewStage;
  revision?: string;
  reviewDecision?: string;
  commitMerge?: string;
  acceptance: "unknown" | "pending" | "accepted" | "waived";
};
/** Durable host metadata. Counters survive wake/restart; duplicate event keys
 * must not spend another round or launch another effect. No scheduler here. */
export type AutoReviewBudget = {
  rounds: number;
  maxRounds: number;
  consecutiveNoProgress: number;
  noProgressLimit: number;
  lastFingerprint?: AutoReviewFingerprint;
  consumedEventKeys: string[];
  /** Extensions (optional, backward compatible): the fingerprint signature the
   * last decision was taken on, the action kind it produced, and the flag that
   * marks an unreadable persisted budget (fail closed, never auto-repaired). */
  lastSignature?: string;
  lastAction?: AutoReviewActionKind;
  corrupt?: boolean;
};
export type AutoReviewReconcileInput = {
  scope: HostTaskReference;
  trigger: { kind: "turn-terminal" | "review-terminal" | "acceptance" | "recovery"; eventKey: string };
  fingerprint: AutoReviewFingerprint;
  budget: AutoReviewBudget;
  /** Authority of the existing host task record. Absent means "unknown" — it is
   * never read as an active grant. Anything but "active" stops the
   * continuation silently (no action, no round, no user noise). */
  authorization?: AutoReviewAuthorization;
  /** Host-verified evidence. A model claim is never evidence: without these
   * fields the continuation cannot reach commit/merge/done. */
  evidence?: AutoReviewEvidence;
};
export type AutoReviewAction =
  | { kind: "continue-author" | "request-review" | "decide-review" | "commit" | "local-merge" }
  | { kind: "wait-user" | "blocked"; reason: string }
  | { kind: "done" | "duplicate" }
  /** Silent stop: authority paused/revoked/unknown or the run was aborted.
   * Distinct from "wait-user" (somebody else must act) and from "blocked"
   * (something failed) so a wake loop can neither retry nor alarm. */
  | { kind: "stopped"; reason: string };

export type AutoReviewActionKind = AutoReviewAction["kind"];
export type AutoReviewAuthorization = "active" | "paused" | "revoked" | "unknown";
export type AutoReviewEvidence = {
  /** Explicit host fact. "unknown" means the host does not assert completion;
   * absent means the host shipped no implementation fact at all (fail closed). */
  implementation?: "complete" | "incomplete" | "unknown";
  revision?: string;
  /** Explicit host fact about the review run. Absent is NOT "none" and NOT
   * "finished": the continuation refuses to dispatch a review on an unknown
   * review status. */
  reviewRun?: "none" | "running" | "finished";
  /** Explicit host-verified verdict. The fingerprint's reviewDecision string is
   * never used for a decision — it is a summary, not evidence. */
  reviewDecision?: { verdict: "APPROVE" | "WARNING" | "BLOCK"; hasCriticalOrHigh?: boolean; revision?: string; reviewerInstanceId?: string };
  commit?: { commitId: string; revision?: string };
  localMerge?: { mergeCommitId: string; sourceCommitId?: string; targetBranch?: string };
  aborted?: boolean;
};
export type AutoReviewReconcileResult = {
  action: AutoReviewAction;
  budget: AutoReviewBudget;
  reason?: string;
  /** True only when the decision spent one automatic round. */
  roundConsumed: boolean;
};

const present = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const MAX_CONSUMED_EVENT_KEYS = 256;
const DEFAULT_NO_PROGRESS_LIMIT = 2;
/** Actions that really do work: they spend an automatic round. Waiting, silent
 * stops, duplicates and blocks do not — a wait must never burn the budget. */
const ROUND_CONSUMING: ReadonlySet<AutoReviewActionKind> = new Set<AutoReviewActionKind>([
  "continue-author", "request-review", "decide-review", "commit", "local-merge", "done",
]);

export function validAutoReviewFingerprint(fingerprint: AutoReviewFingerprint | undefined): fingerprint is AutoReviewFingerprint {
  if (!fingerprint || typeof fingerprint !== "object") return false;
  if (!present(fingerprint.taskInstanceId)) return false;
  if (!["implementation", "wait-user", "wait-review", "decision", "fix", "commit", "merge", "done", "blocked"].includes(fingerprint.stage)) return false;
  if (!["unknown", "pending", "accepted", "waived"].includes(fingerprint.acceptance)) return false;
  return true;
}

/** Only NEW EVIDENCE counts as progress. The stage and the fingerprint's
 * summary strings (reviewDecision / commitMerge) are not evidence: they change
 * without any host fact being added, so including them would hide a stalled
 * continuation behind a moving summary. */
function progressSignature(fingerprint: AutoReviewFingerprint, evidence: AutoReviewEvidence): string {
  return JSON.stringify([
    fingerprint.acceptance,
    evidence.implementation ?? null, evidence.revision ?? null, evidence.reviewRun ?? null,
    evidence.reviewDecision?.verdict ?? null, evidence.reviewDecision?.hasCriticalOrHigh ?? null,
    evidence.commit?.commitId ?? null, evidence.commit?.revision ?? null,
    evidence.localMerge?.mergeCommitId ?? null, evidence.localMerge?.sourceCommitId ?? null,
  ]);
}

/**
 * Decision over explicit host evidence only. The stage, the fingerprint's
 * reviewDecision string and the fingerprint's commitMerge string are summaries
 * and are never used to conclude "complete", "finished", "approved" or "done".
 */
export function decideAutoReviewAction(fingerprint: AutoReviewFingerprint, evidence: AutoReviewEvidence): { action: AutoReviewAction; reason?: string } {
  if (!evidence.implementation) {
    // No host fact at all: fail closed instead of pushing the pipeline.
    return { action: { kind: "blocked", reason: "implementation_evidence_missing" } };
  }
  if (evidence.implementation !== "complete") {
    // The host states the work is not complete (or does not assert it).
    return { action: { kind: "continue-author" }, reason: "implementation_not_complete" };
  }
  if (fingerprint.acceptance === "pending") return { action: { kind: "wait-user", reason: "acceptance_pending" } };
  if (fingerprint.acceptance === "unknown") return { action: { kind: "wait-user", reason: "acceptance_unknown" } };

  const revision = evidence.revision ?? fingerprint.revision;
  const decision = evidence.reviewDecision;
  if (!decision) {
    if (evidence.reviewRun === "running") return { action: { kind: "wait-user", reason: "review_running" } };
    if (evidence.reviewRun === "finished") return { action: { kind: "decide-review" } };
    if (evidence.reviewRun === "none") {
      if (!present(revision)) return { action: { kind: "blocked", reason: "revision_missing" } };
      return { action: { kind: "request-review" } };
    }
    // Unknown review status: dispatching a review could double-dispatch.
    return { action: { kind: "blocked", reason: "review_status_missing" } };
  }
  if (decision.revision && revision && decision.revision !== revision) {
    return { action: { kind: "request-review" }, reason: "review_stale" };
  }
  if (decision.hasCriticalOrHigh === true) return { action: { kind: "wait-user", reason: "review_high_findings" } };
  if (decision.verdict === "BLOCK") return { action: { kind: "continue-author" }, reason: "review_blocked_fix" };
  if (decision.verdict === "WARNING" && decision.hasCriticalOrHigh !== false) {
    return { action: { kind: "wait-user", reason: "review_warning_high" } };
  }
  if (decision.verdict === "APPROVE" && decision.hasCriticalOrHigh === undefined) {
    // An approval without a findings statement is not a clean approve.
    return { action: { kind: "wait-user", reason: "review_findings_unknown" } };
  }

  const commit = evidence.commit;
  const commitUsable = !!commit && present(commit.commitId) && (!commit.revision || !revision || commit.revision === revision);
  if (!commitUsable) return { action: { kind: "commit" } };
  const merge = evidence.localMerge;
  const mergeUsable = !!merge && present(merge.mergeCommitId) && (!merge.sourceCommitId || merge.sourceCommitId === commit!.commitId);
  if (!mergeUsable) return { action: { kind: "local-merge" } };
  return { action: { kind: "done" } };
}

/**
 * Reconcile one host event against the durable budget. Pure: the caller owns
 * persistence (see autoReviewContinuationStore.ts) so a restart cannot reset
 * the round counter and a duplicate event cannot spend a second round.
 */
export function reconcileAutoReviewContinuation(input: AutoReviewReconcileInput): AutoReviewReconcileResult {
  const budget = input.budget;
  const fingerprint = input.fingerprint;
  const evidence = input.evidence ?? {};
  const eventKey = input.trigger?.eventKey ?? "";
  const authorization = input.authorization ?? "unknown";
  const noProgressLimit = budget.noProgressLimit > 0 ? budget.noProgressLimit : DEFAULT_NO_PROGRESS_LIMIT;

  if (budget.corrupt) {
    // An unreadable persisted budget fails closed: no repair, no reset, no round.
    return { action: { kind: "blocked", reason: "budget_corrupt" }, budget, roundConsumed: false };
  }
  if (!present(eventKey)) {
    return { action: { kind: "blocked", reason: "invalid_event_key" }, budget, roundConsumed: false };
  }
  // Same event twice: no second effect, no second round.
  if (budget.consumedEventKeys.includes(eventKey)) {
    return { action: { kind: "duplicate" }, budget, roundConsumed: false };
  }
  const withEvent = (next: AutoReviewBudget): AutoReviewBudget => {
    const keys = [...next.consumedEventKeys, eventKey];
    return { ...next, consumedEventKeys: keys.length > MAX_CONSUMED_EVENT_KEYS ? keys.slice(keys.length - MAX_CONSUMED_EVENT_KEYS) : keys };
  };
  const finish = (action: AutoReviewAction, patch: Partial<AutoReviewBudget>, roundConsumed: boolean, reason?: string): AutoReviewReconcileResult => {
    const next = withEvent({ ...budget, ...patch, rounds: budget.rounds + (roundConsumed ? 1 : 0) });
    return { action, budget: next, reason, roundConsumed };
  };

  if (!validAutoReviewFingerprint(fingerprint)) {
    return finish({ kind: "blocked", reason: "invalid_fingerprint" }, {}, false, "invalid_fingerprint");
  }
  if (input.scope?.taskInstanceId && fingerprint.taskInstanceId !== input.scope.taskInstanceId) {
    return finish({ kind: "blocked", reason: "scope_mismatch" }, {}, false, "scope_mismatch");
  }
  // Authority gates: paused / revoked / unknown / aborted stop silently.
  if (authorization !== "active") {
    const reason = authorization === "paused" ? "authorization_paused"
      : authorization === "revoked" ? "authorization_revoked" : "authorization_unknown";
    return finish({ kind: "stopped", reason }, {}, false, reason);
  }
  if (evidence.aborted) return finish({ kind: "stopped", reason: "aborted" }, {}, false, "aborted");
  if (budget.rounds >= budget.maxRounds) {
    return finish({ kind: "blocked", reason: "budget_exhausted" }, {}, false, "budget_exhausted");
  }

  const decision = decideAutoReviewAction(fingerprint, evidence);
  const signature = progressSignature(fingerprint, evidence);
  const isWait = decision.action.kind === "wait-user";
  let consecutiveNoProgress = budget.consecutiveNoProgress;
  let lastSignature = budget.lastSignature;
  let lastAction = budget.lastAction;
  let blocked: AutoReviewAction | undefined;
  if (!isWait) {
    // A waiting state is not "no progress": somebody else has to move first.
    consecutiveNoProgress = signature === lastSignature ? consecutiveNoProgress + 1 : 0;
    if (consecutiveNoProgress >= noProgressLimit) blocked = { kind: "blocked", reason: "no_progress" };
    lastSignature = signature;
    lastAction = decision.action.kind;
  }
  const action = blocked ?? decision.action;
  const roundConsumed = !blocked && ROUND_CONSUMING.has(action.kind);
  return finish(action, { consecutiveNoProgress, lastSignature, lastAction }, roundConsumed, blocked ? "no_progress" : decision.reason);
}
