import { redactSecrets } from "../tui/redactSecrets";
import { withholdIfSecretLike } from "../tui/askTextSanitize";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { readHostTaskWorkspace } from "./hostTaskWorkspace";
import type { LocalCommandObservation } from "../agentRunLocalWorkspace";
import { captureCommandWorkspaceFingerprint } from "../agentRunLocalWorkspace";
import { resolveRunsDir } from "../agentRunControl";
import { createHostAuthorExecution } from "./hostReviewDispatch";
import { createHostTaskController, hostTaskEventsRoot, readHostTask, type HostTaskReference } from "./hostTaskEvents";
import { collectTaskRevisionEvidence } from "./taskRevisionEvidence";
import { collectTaskProgressEvidence, taskContentRevision, type HostImplementationBinding } from "./taskProgressEvidence";
import { collectHostTaskReviewBinding, sameTaskPaths, sameTaskScope } from "./taskReviewEvidence";
import type { TaskExecutionContract } from "../../agent-runtime/taskExecutionContract";

/** In-process host input only. Commands may be selected from the task brief, but
 * tool arguments only propose a plan. The host validates and freezes it against
 * the admitted user task; neither arguments nor prose can claim a passed check. */
export type HostTaskAcceptancePlan = {
  planId: string; baseline: string; taskPaths: string[];
  commands: Array<{ commandId: string; command: string }>;
};
type Observation = LocalCommandObservation & { revision: string };
const digest = (text: string) => createHash("sha256").update(text).digest("hex");
const explicit = (paths: string[]) => paths.length > 0 && paths.every(p => typeof p === "string" && p !== "." && !p.startsWith("/") && !p.includes("\\") && !p.includes("\0") && p.split("/").every(s => s && s !== "." && s !== ".."));

const planPath = (scope: HostTaskReference, env: Record<string, string | undefined>) => join(hostTaskEventsRoot(env), "plans", `${digest(JSON.stringify(scope))}.json`);
export function readHostTaskAcceptancePlan(scope: HostTaskReference, env: Record<string, string | undefined>): HostTaskAcceptancePlan | undefined {
  try {
    const path = planPath(scope, env);
    if (lstatSync(path).isSymbolicLink()) return;
    const saved = JSON.parse(readFileSync(path, "utf8"));
    if (sameTaskScope(saved.scope, scope) && saved.scope.taskInstanceId === scope.taskInstanceId) return saved.plan;
  } catch { /* Missing plan is not completion evidence. */ }
}
/** Host user submission only, never model-supplied tool arguments. */
export function persistHostTaskUserAssignment(scope: HostTaskReference, source: { messageId: string; contentSha256: string }, originalText: string, env: Record<string, string | undefined>) {
  if (digest(originalText) !== source.contentSha256) throw new Error("task_assignment_source_hash_mismatch");
  const state = readHostTask(hostTaskEventsRoot(env), scope);
  if (state.authorization !== "active" || state.taskStart && (state.taskStart.userMessageId !== source.messageId || state.taskStart.contentSha256 !== source.contentSha256)) throw new Error("task_assignment_source_mismatch");
  const redacted = redactSecrets(originalText).replace(/\$nolo[_]cred:[A-Za-z0-9._-]+/g, "⟨credential-reference-redacted⟩");
  const body = withholdIfSecretLike(redacted);
  const evidence = { scope, source, body, bodySha256: digest(body), complete: body === originalText,
    limitation: body === originalText ? undefined : "credential-filtered projection; original text not persisted; do not claim full assignment evidence" };
  const root = join(hostTaskEventsRoot(env), "assignments");
  mkdirSync(root, { recursive: true, mode: 0o700 });
  const path = join(root, `${digest(JSON.stringify(scope))}.json`);
  try { writeFileSync(path, JSON.stringify(evidence), { flag: "wx", mode: 0o600 }); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST" || lstatSync(path).isSymbolicLink() || readFileSync(path, "utf8") !== JSON.stringify(evidence)) throw error;
  }
  return path;
}
export function readHostTaskUserAssignment(scope: HostTaskReference, env: Record<string, string | undefined>) {
  const path = join(hostTaskEventsRoot(env), "assignments", `${digest(JSON.stringify(scope))}.json`);
  try {
    if (lstatSync(path).isSymbolicLink()) return;
    const evidence = JSON.parse(readFileSync(path, "utf8"));
    if (!sameTaskScope(evidence.scope, scope) || evidence.scope.taskInstanceId !== scope.taskInstanceId || digest(evidence.body) !== evidence.bodySha256 || evidence.complete && evidence.bodySha256 !== evidence.source.contentSha256) return;
    return { path, source: evidence.source, complete: evidence.complete, bodySha256: evidence.bodySha256 };
  } catch { return; }
}
/** Read host facts for reviewer context, not a semantic completion certificate. */
export function readHostTaskReviewPlanEvidence(scope: HostTaskReference, env: Record<string, string | undefined>) {
  const plan = readHostTaskAcceptancePlan(scope, env);
  if (!plan) throw new Error("task_acceptance_plan_required_continue_author");
  const planFile = planPath(scope, env);
  const saved = JSON.parse(readFileSync(planFile, "utf8"));
  const observationFile = join(hostTaskEventsRoot(env), "producer", `${digest(JSON.stringify(scope))}.json`);
  let observations: Observation[] = [];
  try {
    if (lstatSync(observationFile).isSymbolicLink()) throw new Error("unsafe_observation_file");
    const record = JSON.parse(readFileSync(observationFile, "utf8"));
    if (sameTaskScope(record.scope, scope) && JSON.stringify(record.plan) === JSON.stringify(plan)) observations = record.observations;
  } catch { /* No execution evidence; reviewer must see not executed. */ }
  return { plan, assignment: readHostTaskUserAssignment(scope, env), source: saved.source, planFile, observationFile: observations.length ? observationFile : undefined, observations };
}
export function validateHostTaskAcceptanceProposal(proposal: unknown): asserts proposal is { taskPaths: string[]; acceptanceCommands: string[] } {
  const a = proposal as { taskPaths?: string[]; acceptanceCommands?: string[] };
  if (!a || Object.keys(a).some(k => !["taskPaths", "acceptanceCommands"].includes(k)) || !Array.isArray(a.taskPaths) || !explicit(a.taskPaths) ||
      !Array.isArray(a.acceptanceCommands) || !a.acceptanceCommands.length || a.acceptanceCommands.some(c => typeof c !== "string" || !c.trim())) throw new Error("task_start_explicit_plan_required");
}

/** Proposal is semantic input, never a claim that checks passed. Host pins the
 * actual admitted baseline/source. Scope and commands cannot shrink on a wake. */
export function installHostTaskAcceptancePlan(scope: HostTaskReference, proposal: unknown, source: { messageId: string; contentSha256: string }, env: Record<string, string | undefined>) {
  validateHostTaskAcceptanceProposal(proposal);
  const a = proposal;
  const workspace = readHostTaskWorkspace(scope, env);
  const state = readHostTask(hostTaskEventsRoot(env), scope);
  if (state.authorization !== "active" || !source.messageId.trim() || !/^[a-f0-9]{64}$/.test(source.contentSha256)) throw new Error("task_plan_user_source_required");
  if (workspace.status !== "ready" || workspace.existingDirtyPaths.length) throw new Error("task_start_clean_baseline_required");
  for (const path of a.taskPaths) {
    const absolute = resolve(workspace.repoRoot, path);
    const local = relative(scope.workspace, absolute);
    if (local.startsWith("..") || local === "") throw new Error("task_path_outside_workspace");
    // Parent symlinks must not export bytes outside the admitted repository.
    let parent = absolute;
    while (parent !== workspace.repoRoot) {
      try { if (lstatSync(parent).isSymbolicLink()) throw new Error("task_path_symlink"); } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; }
      const next = resolve(parent, ".."); if (next === parent) throw new Error("task_path_outside_repository"); parent = next;
    }
    try { if (!lstatSync(absolute).isFile() || lstatSync(absolute).isSymbolicLink()) throw new Error("task_paths_must_be_files"); }
    catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; }
  }
  const plan: HostTaskAcceptancePlan = { planId: digest(JSON.stringify({ source, proposal: a })), baseline: workspace.baseline, taskPaths: [...new Set(a.taskPaths)].sort(),
    commands: [...new Set(a.acceptanceCommands)].map((command, i) => ({ commandId: `acceptance-${i}`, command })) };
  const existing = readHostTaskAcceptancePlan(scope, env);
  if (existing) {
    if (JSON.stringify(existing) !== JSON.stringify(plan)) throw new Error("task_plan_already_bound");
    return existing;
  }
  const root = join(hostTaskEventsRoot(env), "plans"); mkdirSync(root, { recursive: true, mode: 0o700 });
  writeFileSync(planPath(scope, env), JSON.stringify({ scope, source, plan }), { flag: "wx", mode: 0o600 });
  return plan;
}
export async function collectHostTaskPlannedWorkspace(scope: HostTaskReference, env: Record<string, string | undefined>) {
  const plan = readHostTaskAcceptancePlan(scope, env);
  if (!plan || !explicit(plan.taskPaths)) throw new Error("task_acceptance_plan_required_continue_author");
  const evidence = await collectTaskRevisionEvidence({ cwd: scope.workspace, baseline: plan.baseline, taskPaths: plan.taskPaths });
  if (!evidence.complete) throw new Error("task_revision_incomplete");
  return { scope, baseline: plan.baseline, taskPaths: plan.taskPaths, revision: taskContentRevision(evidence) };
}

export function createHostTaskProgressProducer(args: {
  scope: () => HostTaskReference | undefined; env: Record<string, string | undefined>; turnId: string;
  plan?: HostTaskAcceptancePlan; authorExecutionId?: string;
}) {
  let observations: Observation[] = [];
  let author = args.authorExecutionId;
  let scopeKey: string | undefined;
  async function context() {
    const scope = args.scope();
    const plan = scope ? readHostTaskAcceptancePlan(scope, args.env) ?? args.plan : undefined;
    if (!scope || !plan || !explicit(plan.taskPaths) || !plan.planId.trim() || !plan.commands.length ||
      new Set(plan.commands.map(c => c.commandId)).size !== plan.commands.length || plan.commands.some(c => !c.commandId.trim() || !c.command.trim())) return;
    const evidence = await collectTaskRevisionEvidence({ cwd: scope.workspace, baseline: plan.baseline, taskPaths: plan.taskPaths });
    if (!evidence.complete || evidence.baseline.resolvedSha !== plan.baseline) return;
    const key = digest(JSON.stringify(scope));
    const root = join(hostTaskEventsRoot(args.env), "producer");
    const path = join(root, `${key}.json`);
    if (scopeKey !== key) {
      scopeKey = key;
      try {
        if (!lstatSync(path).isSymbolicLink()) {
          const saved = JSON.parse(readFileSync(path, "utf8"));
          if (sameTaskScope(saved.scope, scope) && JSON.stringify(saved.plan) === JSON.stringify(plan)) {
            observations = saved.observations;
            author ??= saved.author;
          }
        }
      } catch { /* No previous host observations. */ }
    }
    author ??= createHostAuthorExecution(args.env, scope, args.turnId);
    return { scope, plan, revision: taskContentRevision(evidence), root, path, author };
  }
  return {
    async observe(observation: LocalCommandObservation) {
      const c = await context();
      if (!c || observation.source !== "execShell-tool-result" || !observation.toolCallId) return;
      observations.push({ ...observation, revision: c.revision });
      mkdirSync(c.root, { recursive: true, mode: 0o700 });
      writeFileSync(c.path, JSON.stringify({ scope: c.scope, plan: c.plan, author: c.author, observations }), { mode: 0o600 });
    },
    async provide(contract: TaskExecutionContract): Promise<TaskExecutionContract | undefined> {
      const scope = args.scope();
      if (!scope) return;
      const c = await context();
      let progress: Awaited<ReturnType<typeof collectTaskProgressEvidence>>["progress"] = { implementation: "unknown", changes: "unknown" };
      if (c) {
        const fingerprint = await captureCommandWorkspaceFingerprint(scope.workspace);
        // HEAD/index changes at commit do not invalidate identical checked bytes.
        // The observation's before/after fence and D content revision both apply.
        const commands = c.plan.commands.flatMap(command => {
          const observation = observations.findLast(o => o.commandFingerprint === `sha256:${digest(command.command)}` && o.revision === c.revision);
          if (!observation) return [];
          const valid = observation.versionBinding === "observed-unchanged" && !!fingerprint && !!observation.executionWorkspace?.before && observation.executionWorkspace.before === observation.executionWorkspace.after;
          return [{ commandId: command.commandId, command: command.command, workspace: observation.cwd, revision: observation.revision,
            status: valid && observation.exitCode === 0 ? "done" as const : "failed" as const, exitCode: typeof observation.exitCode === "number" ? observation.exitCode : null }];
        });
        const implementationBinding: HostImplementationBinding = { scope, baseline: c.plan.baseline, taskPaths: c.plan.taskPaths, revision: c.revision, authorRunId: c.author, implementationComplete: true,
          acceptancePlan: { planId: c.plan.planId, requiredCommandIds: c.plan.commands.map(c => c.commandId) }, commands };
        // Any new dirty path outside the frozen file set invalidates coverage.
        const status = execFileSync("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"], { cwd: scope.workspace, encoding: "utf8", timeout: 15000 });
        const rows = status.split("\0").filter(Boolean);
        const committedPaths = execFileSync("git", ["diff", "--name-only", "-z", c.plan.baseline, "HEAD"], { cwd: scope.workspace, encoding: "utf8", timeout: 15000 }).split("\0").filter(Boolean);
        if (rows.some(row => !c.plan.taskPaths.includes(row.slice(3))) || committedPaths.some(path => !c.plan.taskPaths.includes(path))) implementationBinding.commands = [];
        let reviewBinding;
        const root = join(resolveRunsDir(args.env), "host-review-dispatch");
        try {
          for (const name of readdirSync(root).filter(n => n.endsWith(".json") && !n.startsWith("author-"))) {
            const intent = JSON.parse(readFileSync(join(root, name), "utf8"));
            if (!sameTaskScope(intent.scope, scope) || !sameTaskPaths(intent.taskPaths, c.plan.taskPaths) || intent.revision !== c.revision) continue;
            const result = collectHostTaskReviewBinding({ scope, baseline: c.plan.baseline, taskPaths: c.plan.taskPaths, revision: c.revision, authorRunId: intent.authorExecutionId, reviewerRunId: intent.reviewerRunId, env: args.env });
            if (result.status === "verified") reviewBinding = result.binding;
          }
        } catch { /* Missing/pending review never approves. */ }
        // Candidate object ids come from git, never command stdout or model claims.
        const git = (...argv: string[]) => execFileSync("git", ["--no-optional-locks", ...argv], { cwd: scope.workspace, encoding: "utf8", timeout: 15000,
          env: { ...process.env, GIT_DIR: undefined, GIT_WORK_TREE: undefined, GIT_INDEX_FILE: undefined, GIT_COMMON_DIR: undefined, GIT_OBJECT_DIRECTORY: undefined, GIT_ALTERNATE_OBJECT_DIRECTORIES: undefined, GIT_NO_REPLACE_OBJECTS: "1" } }).trim();
        let commitId: string | undefined, localMergeCommitId: string | undefined;
        if (reviewBinding) {
          try {
            const head = git("rev-parse", "HEAD");
            let alpha: string | undefined;
            try { alpha = git("rev-parse", "--verify", "refs/heads/alpha"); } catch {}
            if (!alpha) { if (head !== c.plan.baseline) commitId = head; }
            else {
              const parents = git("rev-list", "--parents", "-n", "1", alpha).split(" ");
              if (parents.length === 3 && (head === alpha || head === parents[2])) { commitId = parents[2]; localMergeCommitId = alpha; }
              else if (head !== c.plan.baseline) commitId = head;
            }
          } catch { /* No local integration ref yet. */ }
        }
        progress = (await collectTaskProgressEvidence({ scope, baseline: c.plan.baseline, taskPaths: c.plan.taskPaths, authorRunId: reviewBinding?.authorRunId ?? c.author, env: args.env, implementationBinding: { ...implementationBinding, authorRunId: reviewBinding?.authorRunId ?? c.author }, reviewBinding, commitId, localMergeCommitId })).progress;
      }
      const state = readHostTask(hostTaskEventsRoot(args.env), scope);
      if (state.authorization === "unknown") return;
      const next = createHostTaskController(hostTaskEventsRoot(args.env), { kind: "trusted-host", actorId: "host-task-progress-producer", sourceId: args.turnId }).append(scope, state.sequence, { type: "progress", value: progress });
      return next.authorization === "unknown" ? undefined : { ...contract, ...next.contract };
    },
  };
}
