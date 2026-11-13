import { resolve } from "node:path";
import type { BusinessCompletion } from "../../agent-runtime/taskExecutionContract";
import { hostTaskEventsRoot, readHostTask, type HostTaskReference } from "./hostTaskEvents";
import { collectHostTaskWorkspace, type HostTaskWorkspaceEvidence } from "./hostTaskWorkspace";
import { collectHostTaskPlannedWorkspace, readHostTaskAcceptancePlan } from "./hostTaskProgressProducer";

export type HostTaskWorkspaceAssessmentInput = {
  reference?: HostTaskReference;
  workspace: string;
  dialogId: string;
  env: Record<string, string | undefined>;
  evidence?: unknown;
};
export type HostTaskWorkspaceBlocker = {
  exitCode: 1;
  hostTaskWorkspaceBlocker: string;
  businessCompletion: BusinessCompletion;
};
const object = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
const present = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

/** Shared gate/binding identity: a valid record in another turn is not this task. */
export function resolveCurrentHostTaskReference(input: Omit<HostTaskWorkspaceAssessmentInput, "evidence">): HostTaskReference | undefined {
  const ref = input.reference;
  if (!ref || !present(ref.taskId) || !present(ref.workspace) || !present(ref.dialogId) ||
      ref.dialogId !== input.dialogId || resolve(ref.workspace) !== resolve(input.workspace) ||
      readHostTask(hostTaskEventsRoot(input.env), ref).authorization === "unknown") return undefined;
  return structuredClone(ref);
}

/** Pre-provider assessment only; never grants task, review or completion authority.
 * Undefined means no workspace blocker, NOT a successful task assessment.
 * The caller must persist and return the same host-owned blocker before running a provider.
 */
export async function assessHostTaskWorkspace(input: HostTaskWorkspaceAssessmentInput): Promise<HostTaskWorkspaceBlocker | undefined> {
  const ref = resolveCurrentHostTaskReference(input);
  if (!ref) return undefined;
  const root = hostTaskEventsRoot(input.env);
  const blocked = (reason: string, businessReason: "invalid_contract" | "authorization_paused" | "authorization_revoked" = "invalid_contract"): HostTaskWorkspaceBlocker => ({
    exitCode: 1, hostTaskWorkspaceBlocker: reason,
    businessCompletion: { taskId: ref.taskId, status: "blocked", reasons: [businessReason] },
  });
  // The TUI supplies a directory snapshot; typed review may supply planned files.
  // Validate the snapshot in all cases, then independently validate the host plan.
  const fresh = await collectHostTaskWorkspace(ref, input.env);
  const plan = readHostTaskAcceptancePlan(ref, input.env);
  let planned: HostTaskWorkspaceEvidence | undefined;
  if (plan) {
    try { planned = { status: "ready", context: await collectHostTaskPlannedWorkspace(ref, input.env) }; }
    catch { planned = { status: "blocked", reason: "task_planned_workspace_unavailable" }; }
  }
  // Collection awaits filesystem work; authorization may have changed meanwhile.
  const authority = readHostTask(root, ref).authorization;
  if (authority === "paused" || authority === "revoked") return blocked(`authorization_${authority}`, `authorization_${authority}`);
  if (authority !== "active") return blocked("task_authority_unavailable");
  const supplied = object(input.evidence);
  if (supplied?.status === "blocked") return blocked(present(supplied.reason) ? supplied.reason : "workspace_blocked");
  if (fresh.status === "blocked") return blocked(fresh.reason);
  if (planned?.status === "blocked") return blocked(planned.reason);
  if (planned?.status === "ready" && planned.context.baseline !== fresh.context.baseline) {
    return blocked("task_plan_baseline_mismatch");
  }
  const context = object(supplied?.context);
  const scope = object(context?.scope);
  if (supplied?.status !== "ready" || !context || !scope ||
      scope.taskId !== ref.taskId || scope.dialogId !== ref.dialogId ||
      scope.taskInstanceId !== ref.taskInstanceId || !present(scope.workspace) ||
      resolve(scope.workspace) !== resolve(ref.workspace)) return blocked("workspace_evidence_mismatch");
  // Match one complete canonical representation; never mix a plan's paths with
  // a snapshot's revision or accept caller-selected paths for collection.
  const matches = (canonical: typeof fresh.context) =>
    context.baseline === canonical.baseline && context.revision === canonical.revision &&
    Array.isArray(context.taskPaths) && context.taskPaths.length === canonical.taskPaths.length &&
    context.taskPaths.every((path, index) => path === canonical.taskPaths[index]);
  if (!matches(fresh.context) && !(planned?.status === "ready" && matches(planned.context))) {
    return blocked("workspace_evidence_mismatch");
  }
  return undefined;
}
