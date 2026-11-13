import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { readRunRecord } from "../agentRunControl";
import { collectTaskRevisionEvidence, type TaskRevisionEvidence } from "./taskRevisionEvidence";
import { sameTaskPaths, sameTaskScope, verifyHostAuthorExecution, verifyTaskReviewEvidence, type HostReviewBinding } from "./taskReviewEvidence";
import type { HostTaskReference } from "./hostTaskEvents";
import type { TaskExecutionContract } from "../../agent-runtime/taskExecutionContract";

export type VerifiedTaskProgress = Pick<TaskExecutionContract, "implementation" | "changes" | "revision" | "authorInstanceId" | "review" | "commit" | "localMerge">;
/** Host attests completion of the implementation brief, not approval to commit.
 * Never accept this binding from a provider response or tool JSON.
 */
export type HostImplementationBinding = {
  scope: HostTaskReference; baseline: string; taskPaths: string[]; revision: string;
  authorRunId: string; resultSha256?: string; implementationComplete: true;
  /** Host-selected acceptance plan for this brief. Selection/coverage is a
   * trusted-host prerequisite, not inferred from successful arbitrary commands.
   * Plan and observations are bound to this binding's workspace/revision. */
  acceptancePlan?: { planId: string; requiredCommandIds: string[] };
  /** Actual host command observations; never populate from model arguments. */
  commands?: Array<{ commandId: string; command: string; workspace: string; revision: string; status: "done" | "failed" | "running"; exitCode: number | null }>;
};
export type TaskProgressEvidenceInput = {
  scope: HostTaskReference; baseline: string; taskPaths: string[]; authorRunId: string;
  env: Record<string, string | undefined>;
  implementationBinding?: HostImplementationBinding;
  reviewBinding?: HostReviewBinding;
  commitId?: string;
  localMergeCommitId?: string;
};
const exec = promisify(execFile);
async function git(cwd: string, args: string[]): Promise<Buffer> {
  const env = { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_NO_REPLACE_OBJECTS: "1" };
  for (const key of ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_COMMON_DIR", "GIT_OBJECT_DIRECTORY", "GIT_ALTERNATE_OBJECT_DIRECTORIES"]) delete (env as Record<string, unknown>)[key];
  const result = await exec("git", ["--no-optional-locks", ...args], { cwd, env, encoding: "buffer", timeout: 15000, maxBuffer: 16 * 1024 * 1024 });
  return result.stdout;
}
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
/** Content revision intentionally excludes index/staging flags: committing the
 * reviewed bytes must not invalidate review merely by changing the index. */
export function taskContentRevision(evidence: TaskRevisionEvidence): string {
  return sha(Buffer.from(JSON.stringify({
    baseline: evidence.baseline.resolvedSha,
    entries: evidence.entries.map(e => ({ path: e.path, baselineMode: e.baselineMode, baselineHash: e.baselineHash, mode: e.worktreeMode, hash: e.worktreeHash })).sort((a, b) => a.path.localeCompare(b.path)),
  })));
}
const oid = (s: string | undefined): s is string => !!s && /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(s);
function inScope(path: string, paths: string[]) { return paths.some(p => path === p || path.startsWith(`${p}/`)); }

/** Read-only, conservative full snapshot. Missing fields are cleared, not carried
 * forward from an earlier progress event. No index writes or Git mutations.
 */
export async function collectTaskProgressEvidence(args: TaskProgressEvidenceInput): Promise<{ progress: VerifiedTaskProgress; reasons: string[] }> {
  const progress: VerifiedTaskProgress = { implementation: "unknown", changes: "unknown", revision: undefined, authorInstanceId: undefined, review: undefined, commit: undefined, localMerge: undefined };
  const reasons: string[] = [];
  try {
    if (!args.scope.taskId || !args.scope.dialogId || !oid(args.baseline) || !/^[A-Za-z0-9._-]{1,128}$/.test(args.authorRunId)) throw new Error("invalid_task_scope_or_baseline");
    // Workspace snapshots may use ["."] for collection; that does not attest
    // ownership of every repository path. Caller must supply explicit task paths.
    if (args.taskPaths.includes(".")) throw new Error("explicit_task_paths_required");
    if (!args.taskPaths.length || args.taskPaths.some(p => !p || p.startsWith("/") || p.split("/").some(s => !s || s === "." || s === "..") || p.includes("\\") || p.includes("\0"))) throw new Error("invalid_task_paths");
    const revision = await collectTaskRevisionEvidence({ cwd: args.scope.workspace, baseline: args.baseline, taskPaths: args.taskPaths });
    if (!revision.complete || revision.baseline.resolvedSha !== args.baseline) throw new Error("revision_incomplete");
    // Workspace must itself be the repository/worktree root, not an arbitrary
    // subdirectory whose path allowlist would acquire a different meaning.
    if (realpathSync(args.scope.workspace) !== realpathSync(revision.repoRoot)) throw new Error("workspace_not_repo_root");
    progress.revision = taskContentRevision(revision);
    progress.changes = revision.entries.some(e => e.baselineHash !== e.worktreeHash || e.baselineMode !== e.worktreeMode) ? "changed" : "unchanged";
    const b = args.implementationBinding;
    if (!b) reasons.push("implementation_binding_missing");
    else if (!sameTaskScope(b.scope, args.scope) || b.baseline !== args.baseline || !sameTaskPaths(b.taskPaths, args.taskPaths) || b.authorRunId !== args.authorRunId || b.revision !== progress.revision || b.implementationComplete !== true) reasons.push("implementation_binding_mismatch");
    else {
      const run = readRunRecord(args.authorRunId, { env: args.env });
      const identity = verifyHostAuthorExecution(args.scope, args.authorRunId, args.env) || run?.runId === args.authorRunId && run.status === "done" && run.exitCode === 0;
      if (!identity) reasons.push("implementation_run_not_verified");
      else if (!b.acceptancePlan?.planId.trim() || !b.acceptancePlan.requiredCommandIds.length ||
          b.acceptancePlan.requiredCommandIds.some(id => !id.trim()) || new Set(b.acceptancePlan.requiredCommandIds).size !== b.acceptancePlan.requiredCommandIds.length ||
          !b.commands || b.acceptancePlan.requiredCommandIds.some(id => b.commands!.filter(c => c.commandId === id).length !== 1)) reasons.push("implementation_acceptance_plan_not_verified");
      else if (!b.commands?.length || b.commands.some(c => !c.commandId || !c.command.trim() || resolve(c.workspace) !== resolve(args.scope.workspace) || c.revision !== progress.revision || c.status !== "done" || c.exitCode !== 0)) reasons.push("implementation_commands_not_verified");
      else { progress.implementation = "complete"; progress.authorInstanceId = args.authorRunId; }
    }
    const review = verifyTaskReviewEvidence({ ...args, revision: progress.revision, binding: args.reviewBinding });
    if (review.status === "verified") progress.review = review.review;
    else reasons.push(review.reason);
    if (args.commitId) {
      if (review.status !== "verified") throw new Error("commit_review_not_verified");
      if (!oid(args.commitId)) throw new Error("invalid_commit_id");
      if (args.commitId === args.baseline) throw new Error("commit_is_baseline");
      await git(revision.repoRoot, ["merge-base", "--is-ancestor", args.baseline, args.commitId]);
      const head = (await git(revision.repoRoot, ["rev-parse", "HEAD"])).toString().trim();
      await git(revision.repoRoot, ["merge-base", "--is-ancestor", args.commitId, head]);
      const changed = (await git(revision.repoRoot, ["diff", "--name-only", "-z", args.baseline, args.commitId])).toString().split("\0").filter(Boolean);
      if (changed.some(p => !inScope(p, args.taskPaths))) throw new Error("commit_contains_out_of_scope_changes");
      const tree = new Map<string, { mode: string; object: string }>();
      for (const row of (await git(revision.repoRoot, ["ls-tree", "-rz", args.commitId])).toString().split("\0").filter(Boolean)) {
        const match = /^(\d+) blob ([a-f0-9]+)\t([\s\S]+)$/.exec(row);
        if (match && inScope(match[3]!, args.taskPaths)) tree.set(match[3]!, { mode: match[1]!, object: match[2]! });
        else if (!match && args.taskPaths.some(p => row.endsWith(`\t${p}`))) throw new Error("unsupported_commit_entry");
      }
      for (const entry of revision.entries) {
        const committed = tree.get(entry.path);
        if (entry.worktreeHash === null) { if (committed) throw new Error("commit_content_mismatch"); }
        else if (!committed || committed.mode !== entry.worktreeMode || sha(await git(revision.repoRoot, ["cat-file", "blob", committed.object])) !== entry.worktreeHash) throw new Error("commit_content_mismatch");
        tree.delete(entry.path);
      }
      if (changed.some(path => !revision.entries.some(entry => entry.path === path))) throw new Error("commit_has_unobserved_paths");
      progress.commit = { revision: progress.revision, commitId: args.commitId, evidenceRef: `git:${args.commitId}` };
      if (args.localMergeCommitId) {
        if (!oid(args.localMergeCommitId)) throw new Error("invalid_merge_id");
        const parents = (await git(revision.repoRoot, ["rev-list", "--parents", "-n", "1", args.localMergeCommitId])).toString().trim().split(" ");
        if (parents.length !== 3 || parents[2] !== args.commitId) throw new Error("not_task_no_ff_merge");
        await git(revision.repoRoot, ["merge-base", "--is-ancestor", args.localMergeCommitId, "refs/heads/alpha"]);
        const alphaFirstParents = (await git(revision.repoRoot, ["rev-list", "--first-parent", "refs/heads/alpha"])).toString().trim().split("\n");
        if (!alphaFirstParents.includes(args.localMergeCommitId)) throw new Error("merge_not_on_alpha_first_parent");
        await git(revision.repoRoot, ["merge-base", "--is-ancestor", args.baseline, parents[1]!]);
        // Alpha may contain unrelated work. Only task paths must match review.
        const taskDiff = (await git(revision.repoRoot, ["diff", "--name-only", "-z", args.commitId, args.localMergeCommitId, "--", ...args.taskPaths.map(p => `:(literal)${p}`)])).toString();
        if (taskDiff) throw new Error("merge_task_content_differs");
        progress.localMerge = { sourceCommitId: args.commitId, targetBranch: "alpha", mergeCommitId: args.localMergeCommitId, evidenceRef: `git:${args.localMergeCommitId}:refs/heads/alpha` };
      }
    } else reasons.push("commit_missing");
    const after = await collectTaskRevisionEvidence({ cwd: args.scope.workspace, baseline: args.baseline, taskPaths: args.taskPaths });
    if (!after.complete || taskContentRevision(after) !== progress.revision) throw new Error("revision_changed_during_verification");
  } catch (e) {
    reasons.push(e instanceof Error ? e.message : "evidence_unavailable");
    // Partial evidence must not be used as a successful whole snapshot.
    progress.implementation = "unknown";
    progress.changes = "unknown";
    progress.revision = undefined;
    progress.authorInstanceId = undefined;
    progress.review = undefined;
    progress.commit = undefined;
    progress.localMerge = undefined;
  }
  return { progress, reasons };
}
