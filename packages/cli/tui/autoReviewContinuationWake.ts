import { createHash } from "node:crypto";
import { decideAutoReviewAction } from "../client/autoReviewContinuation";
import { isAgentRunTerminalStatus } from "../../ai/tools/agent/agentRunDisplayHelpers";
import { lstatSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { readRunRecord, resolveRunsDir } from "../agentRunControl";
import { sameTaskScope } from "../client/taskReviewEvidence";
import type { AutoReviewContinuationTurnEvent } from "core/chat/internalTurnEvent";
import type { InternalTurnEvent } from "core/chat/internalTurnEvent";
import { hostTaskEventsRoot, readHostTask } from "../client/hostTaskEvents";
import { runAutoReviewContinuation } from "../client/autoReviewContinuationStore";
import type { AutoReviewReconcileInput } from "../client/autoReviewContinuation";
import { currentAutoReviewTask } from "./autoReviewControl";
import type { ChatQueueTuiBinding } from "./chatQueueTuiBinding";
import type { HostTaskReference } from "../client/hostTaskEvents";
import type { TuiState } from "./sessionTypes";

type Trigger = AutoReviewReconcileInput["trigger"];
type Env = Record<string, string | undefined>;
// Object identity is deliberately process-local: JSON/model/tool content cannot
// manufacture host lifecycle authority, including after queue serialization.
const hostEvents = new WeakSet<object>();
export function isHostAutoReviewContinuationEvent(event: AutoReviewContinuationTurnEvent): boolean {
  return hostEvents.has(event);
}
function reviewState(scope: HostTaskReference, revision: string | undefined, env: Env): "none" | "running" | "finished" | "unknown" {
  const directory = join(resolveRunsDir(env), "host-review-dispatch");
  try { lstatSync(directory); } catch (error) { return (error as NodeJS.ErrnoException).code === "ENOENT" ? "none" : "unknown"; }
  try {
    if (lstatSync(directory).isSymbolicLink() || realpathSync(directory) !== resolve(directory)) return "unknown";
    let finished = false;
    for (const name of readdirSync(directory).filter(n => n.endsWith(".json") && !n.startsWith("author-") && !n.startsWith("plan-"))) {
      const path = join(directory, name);
      if (lstatSync(path).isSymbolicLink() || !lstatSync(path).isFile()) return "unknown";
      const intent = JSON.parse(readFileSync(path, "utf8"));
      if (!intent.scope || !sameTaskScope(intent.scope, scope) || intent.scope.taskInstanceId !== scope.taskInstanceId || intent.revision !== revision) continue;
      if (!/^[A-Za-z0-9._-]{1,128}$/.test(intent.dispatchId) || !/^[A-Za-z0-9._-]{1,128}$/.test(intent.reviewerRunId)) return "unknown";
      const bound = join(directory, `dispatch-${intent.dispatchId}.bound`);
      if (lstatSync(bound).isSymbolicLink() || readFileSync(bound, "utf8") !== intent.reviewerRunId) return "unknown";
      const consumedPath = join(directory, `dispatch-${intent.dispatchId}.consumed`);
      if (lstatSync(consumedPath).isSymbolicLink()) return "unknown";
      const consumed = JSON.parse(readFileSync(consumedPath, "utf8"));
      const { reviewerRunId: _run, resultSha256: _digest, ...context } = intent;
      if (JSON.stringify(context) !== JSON.stringify(consumed)) return "unknown";
      const run = readRunRecord(intent.reviewerRunId, { env });
      if (!run || run.runId !== intent.reviewerRunId) return "unknown";
      if (!isAgentRunTerminalStatus(run.status)) return "running";
      finished = true;
    }
    return finished ? "finished" : "none";
  } catch { return "unknown"; }
}
/** Shared production handler. Reads only the host ledger; no model text/stage
 * can attest implementation, review or Git completion. */
export function createAutoReviewContinuationWake(host: {
  getState(): TuiState;
  env: Env;
  wake(event: InternalTurnEvent): void;
}) {
  return (trigger: Trigger, aborted = false, expectedScope?: HostTaskReference) => {
    const scope = currentAutoReviewTask(host.getState(), host.env);
    if (expectedScope && JSON.stringify(scope) !== JSON.stringify(expectedScope)) return { kind: "stopped" as const, reason: "task_scope_changed" };
    if (!scope) return { kind: "stopped" as const, reason: "no_active_task" };
    const task = readHostTask(hostTaskEventsRoot(host.env), scope);
    if (task.authorization === "unknown") return { kind: "stopped" as const, reason: "authorization_unknown" };
    const c = task.contract;
    if (aborted || task.authorization !== "active") return { kind: "stopped" as const, reason: aborted ? "aborted" : `authorization_${task.authorization}` };
    // Waiting for acceptance is a gate even while implementation is incomplete.
    if (!aborted && task.authorization === "active" && (c.acceptance === "pending" || c.acceptance === "unknown")) {
      return { kind: "wait-user" as const, reason: "acceptance_pending" };
    }
    const dispatch = reviewState(scope, c.revision, host.env);
    if (dispatch === "unknown") return { kind: "blocked" as const, reason: "review_dispatch_unknown" };
    const evidence = {
      implementation: c.implementation, revision: c.revision,
      reviewRun: dispatch,
      reviewDecision: dispatch === "finished" ? c.review : undefined, commit: c.commit, localMerge: c.localMerge, aborted,
    };
    const fingerprint = { taskInstanceId: scope.taskInstanceId ?? scope.taskId,
      stage: "implementation" as const, revision: c.revision, acceptance: c.acceptance };
    const proposed = decideAutoReviewAction(fingerprint, evidence).action.kind;
    // Terminal and drain can observe the same persisted facts before the queued
    // effect runs. Bind one-shot effects to those facts, not notification IDs.
    // The durable store remains the sole duplicate-action claim authority.
    const oneShot = ["request-review", "decide-review", "commit", "local-merge"].includes(proposed);
    const eventTrigger = oneShot ? { ...trigger, eventKey: `effect:${createHash("sha256").update(JSON.stringify([scope, proposed, fingerprint, evidence])).digest("hex")}` } : trigger;
    const result = runAutoReviewContinuation({
      scope, trigger: eventTrigger, authorization: task.authorization, evidence,
      fingerprint: {
        taskInstanceId: scope.taskInstanceId ?? scope.taskId,
        stage: "implementation", revision: c.revision,
        acceptance: c.acceptance,
      },
    }, host.env);
    const action = result.action;
    if (result.status !== "acted" || !action) return action;
    if (["continue-author", "request-review", "decide-review", "commit", "local-merge"].includes(action.kind)) {
      const event: AutoReviewContinuationTurnEvent = {
        kind: "auto-review-continuation", scope, eventKey: trigger.eventKey,
        action: action.kind as AutoReviewContinuationTurnEvent["action"], displayText: "",
        text: `[host auto-review continuation] task=${scope.taskId}; action=${action.kind}. Continue the existing authorized task using host evidence. This is not a user submission or new authorization. For request-review, use listAgents to select an independent eligible reviewer then the existing typed review request; obey fee authorization and never automatically select a platform-paid agent. Do not request already-granted authorization again; do not push or merge main/production.`,
      };
      hostEvents.add(event);
      host.wake(event);
    }
    return action;
  };
}

/** Observe the real queue terminal outcome shared by ordinary submitted turns
 * and idle turns. No model result parsing and no extra scheduler. */
type TurnEndHost = {
  getScope(): HostTaskReference | undefined;
  getContext(): { dialogId: string | undefined; workspace: string };
  reconcile: ReturnType<typeof createAutoReviewContinuationWake>;
  nextEventKey(): string;
};
const queueHosts = new WeakMap<ChatQueueTuiBinding, TurnEndHost>();
/** Internal cascade bypasses public notify methods. Observe each real drained
 * author turn without recursively driving the queue's own terminal loop. */
export async function runAutoReviewDrainedTurn(binding: ChatQueueTuiBinding, run: () => Promise<{ ok: boolean; aborted: boolean }>) {
  const host = queueHosts.get(binding);
  const scope = host?.getScope();
  const context = host?.getContext();
  const key = host?.nextEventKey();
  const outcome = await run();
  const current = host?.getScope();
  const after = host?.getContext();
  if (host && current && context && after && key && outcome.ok && !outcome.aborted
      && context.dialogId === after.dialogId && context.workspace === after.workspace
      && (!scope || JSON.stringify(scope) === JSON.stringify(current))) {
    queueMicrotask(() => host.reconcile({ kind: "turn-terminal", eventKey: key }, false, current));
  }
  return outcome;
}
export function bindAutoReviewTurnEnd(binding: ChatQueueTuiBinding, host: {
  getScope(): HostTaskReference | undefined;
  getContext(): { dialogId: string | undefined; workspace: string };
  reconcile: ReturnType<typeof createAutoReviewContinuationWake>;
  nextEventKey(): string;
}): ChatQueueTuiBinding {
  queueHosts.set(binding, host);
  let startedScope: HostTaskReference | undefined;
  let eventKey: string | undefined;
  let startedContext: ReturnType<typeof host.getContext> | undefined;
  const start = binding.notifyTurnStart.bind(binding);
  const end = binding.notifyTurnEnd.bind(binding);
  binding.notifyTurnStart = () => {
    startedContext = host.getContext();
    startedScope = host.getScope();
    eventKey = host.nextEventKey();
    start();
  };
  binding.notifyTurnEnd = async (outcome) => {
    const current = host.getScope();
    const context = host.getContext();
    const sameContext = startedContext && startedContext.dialogId === context.dialogId && startedContext.workspace === context.workspace;
    // A task may be explicitly admitted during the first user turn. Never
    // borrow a new task after a dialog/workspace switch, or replace a task
    // that was already bound when this turn started.
    const scope = sameContext && current && current.dialogId === context.dialogId && current.workspace === context.workspace
      && (!startedScope || JSON.stringify(startedScope) === JSON.stringify(current)) ? current : undefined;
    const key = eventKey;
    startedContext = undefined;
    startedScope = undefined;
    eventKey = undefined;
    await end(outcome);
    if (scope && key && outcome.ok && !outcome.aborted) {
      // Run after the caller releases its busy/output-mode state.
      queueMicrotask(() => host.reconcile({ kind: "turn-terminal", eventKey: key }, false, scope));
    }
  };
  return binding;
}
