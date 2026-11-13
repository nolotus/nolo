import { readRunRecord, runAgentStopCommand, type RunRecord } from "../agentRunControl";
import { getProcessRegistry, type RegisteredProcess } from "../../agent-runtime/processRegistry";
import { runTaskStop, type TaskStopResult } from "../../agent-runtime/processTaskTools";

export type TaskActionTarget = { kind: "run" | "process"; id: string };
export type TaskActionView = TaskActionTarget & { title: string; status: string; resultPath?: string };
export type TaskActionResult = { outcome: "shown" | "confirmation-required" | "cancelled" | "unauthorized" | "not-found" | "finished" | "changed" | "stop-requested" | "stopped" | "failed" | "invalid"; view?: TaskActionView; reason?: string };
export type TaskActionDeps = {
  readRun?: (id: string, env: NodeJS.ProcessEnv) => RunRecord | null;
  readProcess?: (id: string) => RegisteredProcess | undefined;
  stopRun?: (id: string, env: NodeJS.ProcessEnv) => Promise<{ code: number; confirmed: boolean; finished: boolean }>;
  stopProcess?: (id: string) => Promise<TaskStopResult>;
  confirm?: (view: TaskActionView) => boolean | Promise<boolean>;
  getCurrentDialogId?: () => string | null | undefined;
  probeProcessGroup?: (pgid: number) => "gone" | "alive" | "unknown";
};
export type TaskActionInput = { action: "show" | "stop"; target: TaskActionTarget; dialogId?: string | null; env: NodeJS.ProcessEnv };
function bounded(value: string, max = 200): string { return value.replace(/[\x00-\x1f\x7f-\x9f]/g, " ").slice(0, max); }
const defaultDeps: Required<Pick<TaskActionDeps, "readRun" | "readProcess" | "stopRun" | "stopProcess" | "probeProcessGroup">> = {
  readRun: (id, env) => readRunRecord(id, { env }),
  readProcess: id => getProcessRegistry().getByTaskId(id),
  stopRun: async (id, env) => {
    let output = "";
    const code = await runAgentStopCommand([id], { env, output: { write: text => { output += text; } } });
    return { code, confirmed: code === 0 && output.startsWith(`Stopped ${id} `) && output.includes("process group confirmed gone"), finished: code === 0 && output.startsWith(`Run ${id} is already `) };
  },
  stopProcess: id => runTaskStop({ taskId: id, registry: getProcessRegistry() }),
  probeProcessGroup: pgid => {
    if (!Number.isSafeInteger(pgid) || pgid <= 0) return "unknown";
    try { process.kill(-pgid, 0); return "alive"; }
    catch (error) { return (error as NodeJS.ErrnoException).code === "ESRCH" ? "gone" : "unknown"; }
  },
};
export async function handleTaskAction(input: TaskActionInput, deps: TaskActionDeps = {}): Promise<TaskActionResult> {
  const { action, target, dialogId, env } = input;
  if (!target || !["run", "process"].includes(target.kind) || !/^[A-Za-z0-9][A-Za-z0-9_-]{3,199}$/.test(target.id) || (target.kind === "run" ? !target.id.startsWith("run-") : !target.id.startsWith("ptask-"))) return { outcome: "invalid", reason: "A complete runId or taskId is required." };
  if (!dialogId || !dialogId.trim()) return { outcome: "unauthorized", reason: "No current dialog; ownership cannot be established." };
  const read = () => target.kind === "run" ? (deps.readRun ?? defaultDeps.readRun)(target.id, env) : (deps.readProcess ?? defaultDeps.readProcess)(target.id);
  const first = read();
  if (!first) return { outcome: "not-found" };
  const owned = (record: RunRecord | RegisteredProcess): boolean => target.kind === "run" ? (record as RunRecord).runId === target.id && (record as RunRecord).parentDialogId === dialogId : (record as RegisteredProcess).taskId === target.id && (record as RegisteredProcess).owner?.dialogId === dialogId;
  if (!owned(first)) return { outcome: "unauthorized", reason: "Task has no matching current-dialog owner." };
  const viewOf = (record: RunRecord | RegisteredProcess): TaskActionView => {
    if (target.kind === "run") {
      const run = record as RunRecord;
      return { ...target, title: bounded(run.title || run.agentName || run.agentKey || "Agent run"), status: run.status, ...(run.resultFile && run.resultFile.length <= 1024 && !/[\x00-\x1f\x7f-\x9f]/.test(run.resultFile) ? { resultPath: run.resultFile } : {}) };
    }
    return { ...target, title: "Background process", status: (record as RegisteredProcess).status };
  };
  const view = viewOf(first);
  if (action === "show") return { outcome: "shown", view };
  if (action !== "stop") return { outcome: "invalid" };
  if (first.status !== "running") return { outcome: "finished", view };
  if (!deps.confirm) return { outcome: "confirmation-required", view };
  if (!await deps.confirm(view)) return { outcome: "cancelled", view };
  if (deps.getCurrentDialogId && deps.getCurrentDialogId() !== dialogId) return { outcome: "unauthorized", reason: "Current dialog changed after confirmation." };
  const current = read();
  if (!current) return { outcome: "not-found" };
  if (!owned(current)) return { outcome: "unauthorized", reason: "Task ownership changed after confirmation." };
  const sameIdentity = target.kind === "run" ? (first as RunRecord).startedAt === (current as RunRecord).startedAt && (first as RunRecord).pid === (current as RunRecord).pid && (first as RunRecord).processStartedAt === (current as RunRecord).processStartedAt && (first as RunRecord).agentKey === (current as RunRecord).agentKey : (first as RegisteredProcess).startedAt === (current as RegisteredProcess).startedAt && (first as RegisteredProcess).pid === (current as RegisteredProcess).pid && (first as RegisteredProcess).pgid === (current as RegisteredProcess).pgid;
  if (!sameIdentity) return { outcome: "changed", reason: "Task identity changed after confirmation." };
  const currentView = viewOf(current);
  if (current.status !== "running") return { outcome: "finished", view: currentView };
  try {
    if (target.kind === "run") {
      const result = await (deps.stopRun ?? defaultDeps.stopRun)(target.id, env);
      if (result.finished) return { outcome: "finished", view: currentView };
      return { outcome: result.code === 0 && result.confirmed ? "stopped" : "failed", view: currentView };
    }
    const result = await (deps.stopProcess ?? defaultDeps.stopProcess)(target.id);
    if (result.outcome === "not-found") return { outcome: "not-found" };
    if (result.outcome === "not-stoppable") return { outcome: result.reason === "already-terminal" ? "finished" : "failed", view: { ...currentView, status: result.status } };
    const probe = (deps.probeProcessGroup ?? defaultDeps.probeProcessGroup)((current as RegisteredProcess).pgid);
    return { outcome: probe === "gone" ? "stopped" : "stop-requested", view: currentView };
  } catch { return { outcome: "failed", view: currentView, reason: "Stop operation failed." }; }
}

/** Shared by the busy and idle command dispatchers; null means normal slash handling. */
export async function runTaskSlashCommand(line: string, options: { getDialogId: () => string | null | undefined; env: NodeJS.ProcessEnv; confirm?: TaskActionDeps["confirm"]; deps?: TaskActionDeps }): Promise<string | null> {
  const tokens = line.trim().split(/\s+/);
  if (tokens[0]?.toLowerCase() !== "/tasks" || tokens.length === 1) return null;
  if (tokens.length !== 3 || !["show", "stop"].includes(tokens[1] ?? "")) return "Usage: /tasks show <runId|taskId> | /tasks stop <runId|taskId>";
  const id = tokens[2]!;
  const kind = id.startsWith("run-") ? "run" : id.startsWith("ptask-") ? "process" : null;
  if (!kind) return "A complete runId or taskId is required.";
  const result = await handleTaskAction({ action: tokens[1] as "show" | "stop", target: { kind, id }, dialogId: options.getDialogId(), env: options.env }, { ...options.deps, confirm: options.confirm, getCurrentDialogId: options.getDialogId });
  const view = result.view;
  return [`Task ${result.outcome}`, ...(view ? [`${view.kind}  ${view.title}  ${view.status}  ${view.id}`, ...(view.resultPath ? [`Result: ${view.resultPath}`] : [])] : []), ...(result.reason ? [result.reason] : [])].join("\n");
}
