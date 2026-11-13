import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { readRunRecord, resolveRunsDir } from "../agentRunControl";
import { evaluateVerdict } from "./reviewVerdict";
import { stripResultFrontMatter } from "../agentRunResultFile";
import type { HostTaskReference } from "./hostTaskEvents";
import type { TaskExecutionContract } from "../../agent-runtime/taskExecutionContract";

/** Created by the trusted host at review dispatch/settlement, never from tool
 * arguments. Hash pins the final result bytes; scope/revision pin what was sent.
 * Existing unstructured summaries/trailers are intentionally NOT approvals.
 */
export type HostReviewBinding = {
  scope: HostTaskReference;
  baseline: string;
  taskPaths: string[];
  revision: string;
  authorRunId: string;
  reviewerRunId: string;
  resultSha256: string;
  /** Required for verification; optional in input so missing evidence returns unknown. */
  dispatchId?: string;
};
export type ReviewEvidenceResult =
  | { status: "verified"; review: NonNullable<TaskExecutionContract["review"]> }
  | { status: "unknown" | "rejected"; reason: string };
export function sameTaskScope(a: HostTaskReference, b: HostTaskReference): boolean {
  return a.taskId === b.taskId && a.dialogId === b.dialogId && resolve(a.workspace) === resolve(b.workspace);
}
export function sameTaskPaths(a: string[], b: string[]): boolean {
  return a.length > 0 && b.length > 0 && JSON.stringify([...new Set(a)].sort()) === JSON.stringify([...new Set(b)].sort());
}
/** Verify the actual host foreground record, not a fabricated child run id. */
export function verifyHostAuthorExecution(scope: HostTaskReference, executionId: string, env: Record<string, string | undefined>): boolean {
  if (!/^[A-Za-z0-9._-]{1,128}$/.test(executionId)) return false;
  try {
    const record = readHostRecord(join(resolveRunsDir(env), "host-review-dispatch", `author-${executionId}.json`));
    return record.executionId === executionId && typeof record.turnId === "string" && !!record.turnId && sameTaskScope(scope, record.scope);
  } catch { return false; }
}
function readHostRecord(path: string): any {
  if (lstatSync(path).isSymbolicLink() || realpathSync(path) !== resolve(path) || !lstatSync(path).isFile() || lstatSync(path).size > 2 * 1024 * 1024) throw new Error("unsafe_host_record");
  return JSON.parse(readFileSync(path, "utf8"));
}
/** Read-only producer over records written by hostReviewDispatch. Missing or
 * pending decisions never become approval. No model claims are accepted here. */
export function collectHostTaskReviewBinding(args: {
  scope: HostTaskReference; baseline: string; taskPaths: string[]; revision: string;
  authorRunId: string; reviewerRunId: string; env: Record<string, string | undefined>;
}): { status: "verified"; binding: HostReviewBinding } | { status: "unknown" | "rejected"; reason: string } {
  try {
    if (!/^[A-Za-z0-9._-]{1,128}$/.test(args.reviewerRunId)) return { status: "unknown", reason: "invalid_review_id" };
    const path = join(resolveRunsDir(args.env), "host-review-dispatch", `${args.reviewerRunId}.json`);
    const intent = readHostRecord(path);
    const decision = readHostRecord(`${path}.decision`);
    if (!/^[A-Za-z0-9._-]{1,128}$/.test(intent.dispatchId)) return { status: "unknown", reason: "invalid_dispatch_id" };
    const binding: HostReviewBinding = { scope: intent.scope, baseline: intent.baseline, taskPaths: intent.taskPaths, revision: intent.revision,
      authorRunId: intent.authorExecutionId, reviewerRunId: intent.reviewerRunId, resultSha256: decision.resultSha256, dispatchId: intent.dispatchId };
    const result = verifyTaskReviewEvidence({ ...args, binding });
    return result.status === "verified" ? { status: "verified", binding } : result;
  } catch { return { status: "unknown", reason: "host_review_records_unavailable" }; }
}
/** Production finalization requires a committed host typed decision, never a
 * provider-authored JSON approval or a result summary alone. */
export function verifyTaskReviewEvidence(args: {
  scope: HostTaskReference; baseline: string; taskPaths: string[]; revision: string;
  authorRunId: string; binding?: HostReviewBinding; env: Record<string, string | undefined>;
}): ReviewEvidenceResult {
  const b = args.binding;
  if (!b) return { status: "unknown", reason: "host_review_binding_missing" };
  if (!b.dispatchId) return { status: "unknown", reason: "host_review_dispatch_missing" };
  if (!sameTaskScope(args.scope, b.scope) || args.baseline !== b.baseline || !sameTaskPaths(args.taskPaths, b.taskPaths) ||
      args.revision !== b.revision || args.authorRunId !== b.authorRunId) return { status: "rejected", reason: "review_binding_mismatch" };
  if (!/^[A-Za-z0-9._-]{1,128}$/.test(b.reviewerRunId) || !/^[A-Za-z0-9._-]{1,128}$/.test(b.authorRunId) || b.reviewerRunId === b.authorRunId) return { status: "rejected", reason: "review_not_independent" };
  const author = readRunRecord(b.authorRunId, { env: args.env });
  const run = readRunRecord(b.reviewerRunId, { env: args.env });
  if (((!author || author.runId !== b.authorRunId) && !verifyHostAuthorExecution(args.scope, b.authorRunId, args.env)) || !run || run.runId !== b.reviewerRunId) return { status: "unknown", reason: "run_record_missing" };
  if (run.status !== "done" || run.exitCode !== 0 || !run.resultFile) return { status: "rejected", reason: "review_not_successful_terminal" };
  try {
    // Registry path alone is not authority to read arbitrary files. Restrict to
    // the run's canonical result, disallow symlink files/directories.
    const expected = join(resolveRunsDir(args.env), `${b.reviewerRunId}.result.md`);
    if (resolve(run.resultFile) !== resolve(expected) || lstatSync(expected).isSymbolicLink() ||
        realpathSync(expected) !== resolve(expected) || !lstatSync(expected).isFile() || lstatSync(expected).size > 2 * 1024 * 1024) return { status: "rejected", reason: "unsafe_review_result_path" };
    const bytes = readFileSync(expected);
    if (createHash("sha256").update(bytes).digest("hex") !== b.resultSha256) return { status: "rejected", reason: "review_result_changed" };
    if (b.dispatchId) {
      if (evaluateVerdict(stripResultFrontMatter(bytes.toString("utf8")), args.revision).status !== "OK APPROVE") return { status: "rejected", reason: "review_not_approved" };
      if (!/^[A-Za-z0-9._-]{1,128}$/.test(b.dispatchId)) return { status: "rejected", reason: "invalid_dispatch_id" };
      const root = join(resolveRunsDir(args.env), "host-review-dispatch");
      const path = join(root, `${b.reviewerRunId}.json`);
      const intent = readHostRecord(path);
      const decision = readHostRecord(`${path}.decision`);
      if (!sameTaskScope(intent.scope, args.scope) || intent.baseline !== args.baseline || !sameTaskPaths(intent.taskPaths, args.taskPaths) || intent.revision !== args.revision ||
          intent.authorExecutionId !== b.authorRunId || intent.reviewerRunId !== b.reviewerRunId || intent.dispatchId !== b.dispatchId || (intent.resultSha256 !== undefined && intent.resultSha256 !== b.resultSha256) ||
          readFileSync(join(root, `dispatch-${b.dispatchId}.bound`), "utf8") !== b.reviewerRunId ||
          decision.state !== "committed" || decision.action !== "continue" || decision.dispatchId !== b.dispatchId || decision.runId !== b.reviewerRunId || decision.revision !== args.revision || decision.resultSha256 !== b.resultSha256 ||
          !decision.counts || decision.counts.critical !== 0 || decision.counts.high !== 0 || !Array.isArray(decision.findings) || decision.findings.some((f: any) => f.disposition === "fix")) return { status: "rejected", reason: "host_review_decision_not_verified" };
    }
    // Re-read terminal identity after IO, so a replaced/updated registry entry
    // does not silently inherit a previously observed success.
    const after = readRunRecord(b.reviewerRunId, { env: args.env });
    if (!after || after.runId !== run.runId || after.status !== "done" || after.exitCode !== 0 || after.resultFile !== run.resultFile) return { status: "unknown", reason: "review_run_changed" };
    return { status: "verified", review: { revision: args.revision, reviewerInstanceId: b.reviewerRunId, verdict: "APPROVE", hasCriticalOrHigh: false, evidenceRef: `run:${b.reviewerRunId}:sha256:${b.resultSha256}` } };
  } catch { return { status: "unknown", reason: "review_result_unavailable" }; }
}
