import { mkdirSync, readFileSync, writeFileSync, renameSync, lstatSync } from "node:fs";
import { join, dirname } from "node:path";
import { EventEmitter } from "node:events";
import { admitHostTaskWorkspace } from "../client/hostTaskWorkspace";
import { createHash, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { createHostTaskController, hostTaskEventsRoot, readHostTask, type HostTaskReference, type HostTaskResolution } from "../client/hostTaskEvents";
import { resolveTuiLearnOperatorUserId } from "./learnPrompt";
import type { TuiState } from "./sessionTypes";

export const AUTO_REVIEW_SCOPE = "仅当前任务：独立 review、修复、commit、本地 alpha merge；不授权 push、main/production merge、release、回滚或删除。";
type Env = Record<string, string | undefined>;
const acceptanceEvents = new EventEmitter();
export function onAutoReviewAcceptance(listener: (reference: HostTaskReference, sequence: number) => void): () => void {
  acceptanceEvents.on("accepted", listener);
  return () => { acceptanceEvents.off("accepted", listener); };
}

/** Trusted current pointer inside the existing host task store. Never selects
 * an instance by timestamp, directory order, or model-supplied title. */
function bindingPath(userId: string, dialogId: string, workspace: string, env: Env) {
  return join(hostTaskEventsRoot(env), "current-bindings", createHash("sha256").update(JSON.stringify([userId, dialogId, resolve(workspace)])).digest("hex") + ".json");
}
export function bindCurrentAutoReviewTask(userId: string, reference: HostTaskReference, env: Env): void {
  const task = readHostTask(hostTaskEventsRoot(env), reference);
  if (!userId || task.authorization !== "active" || task.taskStart?.userId !== userId || !reference.taskInstanceId) throw new Error("task_current_binding_invalid");
  const path = bindingPath(userId, reference.dialogId, reference.workspace, env);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const tmp = `${path}.${randomUUID()}.tmp`;
  writeFileSync(tmp, JSON.stringify({ userId, reference }), { flag: "wx", mode: 0o600 });
  renameSync(tmp, path);
}
/** Wake callers use this read-only API. Paused is returned to retain its gate;
 * revoked, corrupt, foreign and missing records never become active. */
export function restoreCurrentAutoReviewTask(userId: string, dialogId: string, workspace: string, env: Env): HostTaskReference | undefined {
  try {
    const path = bindingPath(userId, dialogId, workspace, env);
    if (lstatSync(path).isSymbolicLink()) return undefined;
    const stored = JSON.parse(readFileSync(path, "utf8"));
    const ref = stored.reference as HostTaskReference;
    if (stored.userId !== userId || ref.dialogId !== dialogId || resolve(ref.workspace) !== resolve(workspace) || !ref.taskInstanceId) return undefined;
    const task = readHostTask(hostTaskEventsRoot(env), ref);
    if (task.authorization === "unknown" || task.taskStart?.userId !== userId) return undefined;
    return task.authorization === "active" || task.authorization === "paused" ? ref : undefined;
  } catch { return undefined; }
}
export function currentAutoReviewTask(state: TuiState, env: Env): HostTaskReference | undefined {
  const userId = resolveTuiLearnOperatorUserId(env);
  if (!userId || !state.dialogId) return undefined;
  const restored = restoreCurrentAutoReviewTask(userId, state.dialogId, state.cwd, env);
  // Legacy slash tasks retain their deterministic identity; instance tasks must
  // use the persisted current pointer, never an in-memory guess.
  if (!restored) {
    try { lstatSync(bindingPath(userId, state.dialogId, state.cwd, env)); return undefined; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") return undefined; }
  }
  const reference = restored ?? referenceFor(userId, state.dialogId, state.cwd);
  // Authority comes from the host event log, not from TUI state: `/auto-review off`
  // revokes the task but keeps the record, and a revoked (or missing) record must
  // not be attached to later ordinary turns. Attaching it would make every tool
  // call fail with authorization_revoked / authorization_unknown, i.e. the dialog
  // would lose all tools. A turn that already started keeps its own reference:
  // client/hostTaskBinding re-reads the log before every tool call, so revocation
  // still stops tools that have not started yet (see
  // packages/cli/client/hostTaskBinding.test.ts). Paused stays attached on purpose:
  // pause is a temporary halt inside the scope, off ends the scope.
  let resolution: HostTaskResolution;
  try {
    resolution = readHostTask(hostTaskEventsRoot(env), reference);
  } catch {
    return undefined;
  }
  if (resolution.authorization !== "active" && resolution.authorization !== "paused") return undefined;
  return reference;
}
function referenceFor(userId: string, dialogId: string, workspace: string): HostTaskReference {
  // User ownership is part of task identity; another login cannot borrow it.
  const id = createHash("sha256").update(JSON.stringify([userId, dialogId, resolve(workspace), "local-alpha-v1"])).digest("hex");
  return { taskId: `tui-local-alpha-v1-${id}`, workspace: resolve(workspace), dialogId };
}
/** Called only by the direct-user slash branch. Never consume model/tool JSON. */
export function applyAutoReviewControl(line: string, state: TuiState, env: Env): { state: TuiState; output: string } {
  const parts = line.trim().split(/\s+/);
  const command = parts[1] ?? "status";
  const fail = (output: string) => ({ state, output });
  if (parts.length > 2 || !["status", "on", "pause", "resume", "off", "accept", "waive"].includes(command)) {
    return fail("用法：/auto-review status|on|pause|resume|off|accept|waive");
  }
  const userId = resolveTuiLearnOperatorUserId(env);
  if (!userId) return fail("auto-review：当前登录身份未知，未写入任何授权。");
  if (state.dialogOwnerId && state.dialogOwnerId !== userId) return fail("auto-review：当前 dialog 不属于当前登录用户，未写入授权。");
  if (!state.dialogId) return fail("auto-review：当前尚无 dialog，请先建立对话；未创建授权。");
  let persisted: HostTaskReference | undefined;
  try {
    const path = bindingPath(userId, state.dialogId, state.cwd, env);
    if (lstatSync(path).isSymbolicLink()) return fail("auto-review：current binding 不安全。");
    const binding = JSON.parse(readFileSync(path, "utf8"));
    if (binding.userId !== userId || binding.reference.dialogId !== state.dialogId || resolve(binding.reference.workspace) !== resolve(state.cwd)) return fail("auto-review：current binding 作用域不符。");
    persisted = binding.reference;
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") return fail("auto-review：current binding 不可用。"); }
  const reference = persisted ?? referenceFor(userId, state.dialogId, state.cwd);
  const root = hostTaskEventsRoot(env);
  const current = readHostTask(root, reference);
  const nextState = { ...state, autoReviewTask: { userId, reference } };
  const describe = (auth: string, acceptance: string) => `auto-review：${auth}；验收：${acceptance}。${AUTO_REVIEW_SCOPE}`;
  // `status` (and the bare command) is a strictly read-only query: it must not
  // create a binding, must not append events and must not create authorization.
  // A binding written by a read-only query would attach a reference that has no
  // record and seal every tool call of the dialog with authorization_unknown.
  if (command === "status") {
    if (current.authorization === "unknown") return fail("auto-review：未开启（无可信当前任务记录）。");
    return { state, output: describe(current.authorization, current.contract.acceptance) };
  }
  if (current.authorization === "unknown" && (command !== "on" || current.reason !== "missing")) return fail("auto-review：无可信当前任务记录；只有 /auto-review on 可以创建任务授权。");
  if (command === "on" && current.authorization !== "unknown") return { state: nextState, output: `auto-review：任务记录已存在，状态 ${current.authorization}；恢复请显式使用 resume。${AUTO_REVIEW_SCOPE}` };
  if (command === "resume" && current.authorization === "revoked") return fail("auto-review：当前任务授权已撤销，不能 resume；请在新的 dialog 开启新任务。");
  const controller = createHostTaskController(root, { kind: "user-control", actorId: userId, sourceId: `tui-control-${randomUUID()}` });
  try {
    if (command === "on") {
      const workspace = admitHostTaskWorkspace(reference, env);
      if (workspace.status !== "ready") return fail(`auto-review：blocked；${workspace.reason ?? "工作区归属未知"}；未创建授权。`);
    }
    const sequence = current.authorization === "unknown" ? 0 : current.sequence;
    const change = command === "on" ? { type: "admitted" as const, role: "owner" as const }
      : command === "accept" || command === "waive" ? { type: "acceptance" as const, value: command === "accept" ? "accepted" as const : "waived" as const }
      : { type: "authorization" as const, value: command === "pause" ? "paused" as const : command === "off" ? "revoked" as const : "active" as const };
    const next = controller.append(reference, sequence, change);
    if ((command === "accept" || command === "waive") && next.authorization !== "unknown") {
      // Emit only after the durable append succeeds; listener failures cannot
      // turn a persisted user decision into a reported save failure.
      queueMicrotask(() => acceptanceEvents.emit("accepted", reference, next.sequence));
    }
    return { state: nextState, output: describe(next.authorization, next.authorization === "unknown" ? "unknown" : next.contract.acceptance) };
  } catch {
    return fail("auto-review：事件保存失败或 sequence 冲突，未宣告操作成功；请用 status 检查。");
  }
}
