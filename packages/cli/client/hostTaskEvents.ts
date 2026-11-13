import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import type { BusinessCompletion, TaskExecutionContract } from "../../agent-runtime/taskExecutionContract";

export type HostTaskReference = { taskId: string; workspace: string; dialogId: string; taskInstanceId?: string };
export type HostTaskSource = { kind: "user-control" | "trusted-host"; actorId: string; sourceId: string };
/**
 * Host progress is a FULL snapshot of the contract, never a patch: every evidence
 * field the snapshot omits is cleared. A review/commit/merge recorded earlier stops
 * counting as soon as a newer snapshot does not re-assert it, so clearance can never
 * be inherited from a state the host did not ship again.
 */
type Progress = Pick<TaskExecutionContract, "implementation" | "changes" | "revision" | "authorInstanceId" | "review" | "commit" | "localMerge">;
export type HostTaskChange =
  | { type: "admitted"; role: TaskExecutionContract["role"]; taskStart?: import("./autoReviewContinuation").AccountTaskStart }
  | { type: "authorization"; value: TaskExecutionContract["authorization"] }
  | { type: "acceptance"; value: TaskExecutionContract["acceptance"] }
  | { type: "role"; value: TaskExecutionContract["role"] }
  | { type: "progress"; value: Progress };
type Event = { scope: HostTaskReference; sequence: number; source: HostTaskSource; change: HostTaskChange };
export type HostTaskResolution =
  | { authorization: "unknown"; reason: "missing" | "invalid" | "scope_mismatch" }
  | { authorization: TaskExecutionContract["authorization"]; sequence: number; contract: TaskExecutionContract; taskStart?: import("./autoReviewContinuation").AccountTaskStart };
const nonempty = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
function scopeOf(ref: HostTaskReference): HostTaskReference {
  if (!nonempty(ref.taskId) || !nonempty(ref.workspace) || !nonempty(ref.dialogId)) throw new Error("Invalid host task scope");
  return { taskId: ref.taskId, workspace: resolve(ref.workspace), dialogId: ref.dialogId, ...(ref.taskInstanceId ? { taskInstanceId: ref.taskInstanceId } : {}) };
}
function same(a: HostTaskReference, b: HostTaskReference) { return a.taskId === b.taskId && a.workspace === b.workspace && a.dialogId === b.dialogId && a.taskInstanceId === b.taskInstanceId; }
function validChange(c: HostTaskChange): boolean {
  if (!c || typeof c !== "object") return false;
  switch (c.type) {
    case "admitted": return ["owner", "implementation-leaf"].includes(c.role);
    case "role": return ["owner", "implementation-leaf"].includes(c.value);
    case "authorization": return ["active", "paused", "revoked"].includes(c.value);
    case "acceptance": return ["pending", "waived", "accepted", "unknown"].includes(c.value);
    case "progress": return !!c.value && ["complete", "incomplete", "unknown"].includes(c.value.implementation) && ["changed", "unchanged", "unknown"].includes(c.value.changes);
    default: return false;
  }
}
function reduce(events: Event[], scope: HostTaskReference): HostTaskResolution {
  let contract: TaskExecutionContract | undefined;
  let taskStart: import("./autoReviewContinuation").AccountTaskStart | undefined;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (!e || !e.scope || !e.source) return { authorization: "unknown", reason: "invalid" };
    if (!same(e.scope, scope)) return { authorization: "unknown", reason: "scope_mismatch" };
    if (e.sequence !== i + 1 || !nonempty(e.source?.actorId) || !nonempty(e.source?.sourceId) ||
        !["user-control", "trusted-host"].includes(e.source.kind) || !validChange(e.change)) return { authorization: "unknown", reason: "invalid" };
    const c = e.change;
    if (c.type === "admitted") {
      if (contract) return { authorization: "unknown", reason: "invalid" };
      // Role gates the whole evidence chain, so a user-side admission may only
      // start an owner task — never a self-certifying implementation leaf.
      if (e.source.kind === "user-control" && c.role !== "owner") return { authorization: "unknown", reason: "invalid" };
      taskStart = c.taskStart;
      if (taskStart && (e.source.kind !== "trusted-host" || taskStart.taskInstanceId !== scope.taskInstanceId || taskStart.userId !== e.source.actorId || !nonempty(taskStart.userMessageId) || !/^[a-f0-9]{64}$/.test(taskStart.contentSha256))) return { authorization: "unknown", reason: "invalid" };
      contract = { taskId: scope.taskId, role: c.role, authorization: "active", acceptance: "unknown", implementation: "unknown", changes: "unknown" };
    } else {
      if (!contract) return { authorization: "unknown", reason: "invalid" };
      // Revocation is terminal: no later event may revive the authority (resume,
      // re-accept) or keep rewriting a contract the user already revoked.
      if (contract.authorization === "revoked") return { authorization: "unknown", reason: "invalid" };
      if (c.type === "progress") {
        if (e.source.kind !== "trusted-host") return { authorization: "unknown", reason: "invalid" };
        // Explicit picks prevent a progress payload from overwriting authority.
        const { implementation, changes, revision, authorInstanceId, review, commit, localMerge } = c.value;
        contract = { ...contract, implementation, changes, revision, authorInstanceId, review, commit, localMerge };
      } else if (c.type === "authorization") contract.authorization = c.value;
      else if (c.type === "acceptance") contract.acceptance = c.value;
      else if (c.type === "role") {
        // Role decides whether review/commit/merge are required at all, so only the
        // trusted host may move it; a user-side event must not downgrade an owner task.
        if (e.source.kind !== "trusted-host") return { authorization: "unknown", reason: "invalid" };
        contract.role = c.value;
      }
    }
  }
  return contract ? { authorization: contract.authorization, sequence: events.length, contract, ...(taskStart ? { taskStart } : {}) } : { authorization: "unknown", reason: "missing" };
}
function directory(root: string, ref: HostTaskReference) {
  return join(root, createHash("sha256").update(JSON.stringify(ref)).digest("hex"));
}
export function hostTaskEventsRoot(env: Record<string, string | undefined>): string {
  return join(env.NOLO_HOME || join(homedir(), ".nolo"), "host-task-events");
}
/** Read-only consumer: never accepts authority from a provider/tool payload. */
export function readHostTask(root: string, reference: HostTaskReference): HostTaskResolution {
  try {
    const scope = scopeOf(reference);
    const dir = directory(root, scope);
    let names: string[];
    try { names = readdirSync(dir); } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return { authorization: "unknown", reason: "missing" };
      throw e;
    }
    if (names.some(n => !/^\d{12}\.json$/.test(n))) return { authorization: "unknown", reason: "invalid" };
    return reduce(names.sort().map(n => JSON.parse(readFileSync(join(dir, n), "utf8")) as Event), scope);
  } catch { return { authorization: "unknown", reason: "invalid" }; }
}
/** Trusted in-process host control API, deliberately NOT registered as a model
 * tool, runtimeContext field, or CLI JSON flag. Call only after authenticating
 * the actual user-control source or host lifecycle action. Local disk is inside
 * the host trust boundary; this is not protection against a compromised host.
 */
export function createHostTaskController(root: string, source: HostTaskSource) {
  if (!nonempty(source.actorId) || !nonempty(source.sourceId) || !["user-control", "trusted-host"].includes(source.kind)) throw new Error("Invalid host source");
  const boundSource = { ...source };
  if (root.trim().length === 0) throw new Error("Invalid host event store root");
  return {
    append(reference: HostTaskReference, expectedSequence: number, change: HostTaskChange): HostTaskResolution {
      const scope = scopeOf(reference);
      const state = readHostTask(root, scope);
      if (!Number.isSafeInteger(expectedSequence) || expectedSequence < 0 ||
          (state.authorization === "unknown" ? state.reason !== "missing" || expectedSequence !== 0 : state.sequence !== expectedSequence)) throw new Error("Host task sequence conflict or invalid history");
      const dir = directory(root, scope);
      const previous: Event[] = expectedSequence ? readdirSync(dir).sort().map(n => JSON.parse(readFileSync(join(dir, n), "utf8"))) : [];
      const event: Event = { scope, sequence: expectedSequence + 1, source: boundSource, change };
      const next = reduce([...previous, event], scope);
      if (next.authorization === "unknown") throw new Error("Invalid host task transition");
      mkdirSync(dir, { recursive: true, mode: 0o700 });
      // Exclusive immutable sequence slots prevent concurrent writers silently
      // overwriting each other. Partial/corrupt writes fail closed on read.
      writeFileSync(join(dir, `${String(event.sequence).padStart(12, "0")}.json`), JSON.stringify(event), { flag: "wx", mode: 0o600 });
      return next;
    },
  };
}
export function unknownTaskCompletion(taskId: string): BusinessCompletion {
  return { taskId, status: "blocked", reasons: ["invalid_contract"] };
}
