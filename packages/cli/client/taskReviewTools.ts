import { lstatSync, mkdirSync, readFileSync, writeFileSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { resolveRunsDir } from "../agentRunControl";
import { readHostTaskReviewPlanEvidence, collectHostTaskPlannedWorkspace, readHostTaskAcceptancePlan } from "./hostTaskProgressProducer";
import { createHash, randomUUID } from "node:crypto";
import { collectHostTaskWorkspace } from "./hostTaskWorkspace";
import { validateHostReviewDispatch, withHostReviewDispatch, recordHostTaskReviewDecision, type HostReviewDispatchContext } from "./hostReviewDispatch";
import type { HostTaskReference } from "./hostTaskEvents";

export type TaskReviewDecision = {
  dispatchId: string; runId: string; revision: string; resultSha256: string;
  action: "continue" | "fix" | "stop";
  rationale: string;
  findings: Array<{ id: string; disposition: "accepted" | "fix" | "disputed"; rationale: string }>;
};
/** Only the host may install this binding, after resolving account opt-in and
 * its current scope/stop overrides. Model arguments never supply authority. */
export type TaskReviewHost = {
  scope: HostTaskReference;
  authorExecutionId: string;
  authorize(): Promise<void>;

};
type Call = { id?: string; name?: string; arguments?: unknown; args?: unknown };
type Result = { content: string; metadata?: Record<string, unknown> };
export function createTaskReviewExecutors(deps: {
  env: Record<string, string | undefined>;
  host?: TaskReviewHost;
  start: (call: any) => Promise<Result>;
}) {
  const host = async () => {
    if (!deps.host) throw Object.assign(new Error("Task review requires a registered local host scope and account authorization binding"), { code: "task_review_host_unavailable" });
    await deps.host.authorize();
    return deps.host;
  };
  const argsOf = (call: Call): any => {
    const value = call.arguments ?? call.args;
    return typeof value === "string" ? JSON.parse(value) : value;
  };
  return {
    requestTaskReview: async (call: Call): Promise<Result> => {
      const h = await host();
      const a = argsOf(call);
      if (!a || typeof a.reviewerAgentKey !== "string" || !a.reviewerAgentKey.trim()) throw new Error("reviewerAgentKey required");
      if (!readHostTaskAcceptancePlan(h.scope, deps.env)) throw new Error("task_plan_required");
      const workspace = await collectHostTaskWorkspace(h.scope, deps.env);
      if (workspace.status !== "ready") throw new Error(`task_review_workspace_unavailable: ${workspace.reason}`);
      const c = readHostTaskAcceptancePlan(h.scope, deps.env) ? await collectHostTaskPlannedWorkspace(h.scope, deps.env) : workspace.context;
      if (c.taskPaths.includes(".")) throw new Error("task_acceptance_plan_required_continue_author");
      if (a.revision !== c.revision) throw new Error("task_review_revision_changed");
      const facts = readHostTaskReviewPlanEvidence(h.scope, deps.env);
      if (!facts.assignment || facts.assignment.source.messageId !== facts.source?.messageId || facts.assignment.source.contentSha256 !== facts.source?.contentSha256) throw new Error("task_assignment_evidence_unavailable");
      const dispatchId = randomUUID();
      const evidenceRoot = join(resolveRunsDir(deps.env), "host-review-dispatch");
      mkdirSync(evidenceRoot, { recursive: true, mode: 0o700 });
      const evidenceFile = join(evidenceRoot, `plan-${dispatchId}.json`);
      const checks = facts.plan.commands.map(command => {
        const fingerprint = `sha256:${createHash("sha256").update(command.command).digest("hex")}`;
        const index = facts.observations.findLastIndex(o => o.commandFingerprint === fingerprint && o.revision === c.revision);
        const observation = facts.observations[index];
        return { ...command, status: observation ? "observed (not a semantic pass)" : "not executed / evidence unavailable",
          ...(observation ? { observation, evidenceRef: `${evidenceFile}#/checks/${facts.plan.commands.indexOf(command)}/observation`, originalEvidenceRef: `${facts.observationFile}#/observations/${index}` } : {}) };
      });
      writeFileSync(evidenceFile, JSON.stringify({ scope: h.scope, baseline: c.baseline, revision: c.revision, taskPaths: c.taskPaths, planId: facts.plan.planId,
        userSource: facts.source, assignment: facts.assignment, planFile: facts.planFile, checks }), { flag: "wx", mode: 0o600 });
      const task = `Read-only review of worktree ${h.scope.workspace}. Files/scope: ${JSON.stringify(c.taskPaths)}. Revision: ${c.revision}. Host planId: ${facts.plan.planId}. Host evidence: ${evidenceFile}.\nAll acceptanceCommands: ${JSON.stringify(checks.map(({ commandId, command, status, evidenceRef }) => ({ commandId, command, status, evidenceRef })))}.\nRead the host-captured user assignment JSON at ${facts.assignment.path} using readFile. Verify SHA-256 of its body equals ${facts.assignment.bodySha256}; original source hash: ${facts.source.contentSha256}. Assignment completeness: ${facts.assignment.complete ? "complete; body hash must also equal original source hash" : "INCOMPLETE credential-filtered projection; original source hash cannot be verified from the redacted body; do not claim full evidence"}; the frozen plan is a model proposal, not proof of task completeness. Verify that the explicit files and ALL planned checks cover the user's assigned scope and that checks meaningfully exercise the required behavior. Inspect host observations in the evidence file (toolCallId, revision, exit/status, workspace before/after). Exit 0, including true, does not prove implementation complete. If coverage/check effectiveness is insufficient, record a concrete finding; if required assignment/evidence is unavailable, return status incomplete with reason. Return one JSON object, no fence: {"schemaVersion":1,"revision":"${c.revision}","status":"completed" or "incomplete","findings":[{"id":"M-1","severity":"MEDIUM","file":"path","line":1,"evidence":"observable evidence or reproduction","impact":"concrete consequence"}]}. Use findings:[] if none. incomplete requires a nonempty reason; completed must not contain reason. No verdict or separate report; put every issue in findings. The host computes approval. Do not invent findings to fill the schema. Do not edit files.`;
      const dispatch: HostReviewDispatchContext & { planId: string; planEvidenceFile: string } = { ...c, authorExecutionId: h.authorExecutionId,
        dispatchId, planId: facts.plan.planId, planEvidenceFile: evidenceFile, toolCallId: call.id || randomUUID(), target: { agentKey: a.reviewerAgentKey, task } };
      await validateHostReviewDispatch(dispatch, deps.env, h.scope.workspace);
      // Reuse the existing start executor's reviewer identity/fees/launch gates,
      // durable one-shot consumption, run binding and terminal wake mechanism.
      // 跨档理由（真实原因，不是权限/费用豁免）：reviewer 身份由宿主 review 派发固定
      // （a.reviewerAgentKey，且校验过不同于作者），review 独立性不允许为对齐 difficulty
      // 临时换一个同档 agent，所以这里按该 reviewer 自己的模型档位启动。
      // 宿主侧无法在自调用里补参，闸门若按默认 difficulty 拦下就等于停掉整条 review。
      const selectionReason = `Host review dispatch: reviewer ${a.reviewerAgentKey} is fixed by the host task-review seam and was validated as an agent other than the author ${h.authorExecutionId} (review independence), so the reviewer's own model tier is used as-is rather than swapping to a difficulty-matched agent.`;
      const result = await withHostReviewDispatch(dispatch, () => deps.start({ ...call, id: dispatch.toolCallId, name: "startAgentRun", arguments: JSON.stringify({
        agentKey: a.reviewerAgentKey, title: "Task review", task, readOnly: true, parentDialogId: h.scope.dialogId, cwd: h.scope.workspace,
        selectionReason,
      }) }));
      return { ...result, content: JSON.stringify({ dispatchId: dispatch.dispatchId, revision: dispatch.revision, launch: result.content }) };
    },
    recordTaskReviewDecision: async (call: Call): Promise<Result> => {
      const h = await host();
      const a = argsOf(call);
      if (!a || !["continue", "fix", "stop"].includes(a.action) ||
          !["dispatchId", "runId", "revision", "rationale"].every(k => typeof a[k] === "string" && a[k].trim()) ||
          !/^[a-f0-9]{64}$/.test(a.resultSha256) || !Array.isArray(a.findings) ||
          a.findings.some((f: any) => !f || typeof f.id !== "string" || !f.id.trim() || !["accepted", "fix", "disputed"].includes(f.disposition) || typeof f.rationale !== "string" || !f.rationale.trim())) throw new Error("invalid_task_review_decision");
      if (!/^[A-Za-z0-9._-]{1,128}$/.test(a.runId)) throw new Error("review_decision_binding_mismatch");
      const intentPath = join(resolveRunsDir(deps.env), "host-review-dispatch", `${a.runId}.json`);
      if (lstatSync(intentPath).isSymbolicLink() || realpathSync(intentPath) !== resolve(intentPath)) throw new Error("unsafe_review_plan_binding");
      const intent = JSON.parse(readFileSync(intentPath, "utf8"));
      const plan = readHostTaskAcceptancePlan(h.scope, deps.env);
      if (!plan || intent.planId !== plan.planId) throw new Error("review_decision_plan_mismatch");
      // This is a semantic decision, not a regex APPROVE callback. The host
      // verifies all identities/digest/current revision before durable acceptance.
      await recordHostTaskReviewDecision(h.scope, a, deps.env);
      return { content: JSON.stringify({ recorded: true, action: a.action, dispatchId: a.dispatchId }) };
    },
  };
}
