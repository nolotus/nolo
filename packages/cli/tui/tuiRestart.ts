import { realpathSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { isPidGone, type RunRecord } from "../agentRunControl";
import type { TuiState } from "./sessionTypes";

/** Restart is an idle-only process replacement, never a task migration. */
export function getRestartBlocker(state: TuiState, checks: {
  supported: boolean; activeProcesses: boolean; activeRuns: boolean;
}): string | undefined {
  if (!checks.supported) return "当前宿主不支持原地重启。";
  if (checks.activeProcesses || checks.activeRuns) return "后台任务仍在运行或状态未确认，不能重启；请等待任务结束。";
  if (state.attachedImages.length || state.attachedDocs.length || state.attachedSkills.length ||
      state.pendingCwdNotice || state.pendingTranscripts?.length || state.pendingChildRunNotices?.length || state.pendingProcessNotices?.length) {
    return "有未发送附件或待处理通知，不能重启；请先处理。";
  }
  return undefined;
}

export function buildRestartEnv(env: NodeJS.ProcessEnv, state: TuiState): NodeJS.ProcessEnv {
  return {
    ...env,
    // Override the startup snapshot, including an empty value after revocation.
    // Omitting the key would let the next process inherit stale grants.
    NOLO_PERMISSION_GRANTS: (["local", "remote"] as const)
      .filter(bucket => state.permissionGrants?.[bucket] === true).join(","),
    NOLO_CWD: state.cwd,
    NOLO_AGENT: state.agentKey,
    NOLO_AGENT_NAME: state.agentName,
    NOLO_SERVER: state.serverUrl,
    NOLO_RUNTIME_MODE: state.runtimeMode,
    NOLO_DIALOG_ID: state.dialogId ?? "",
    NOLO_DIALOG_KEY: state.dialogKey ?? "",
    NOLO_DIALOG: state.dialogLabel,
    NOLO_TUI_RESTART: "1",
  };
}

/** Orphaned is terminal; old dead running records must not permanently lock restart.
 * Read-only: restart never settles records or signals a worker (signal 0 only).
 */
export function hasRestartBlockingRuns(records: RunRecord[], pidGone = isPidGone): boolean {
  return records.some(run => run.status === "running" &&
    (typeof run.pid !== "number" || run.pid <= 0 || !pidGone(run.pid)));
}

export function buildRestartArgv(args: {
  executable: string; compiled: boolean; entrypoint: string; execArgv: string[];
}): string[] {
  // TUI entry flags describe the original launch, not the current session. In
  // particular --local/--server must not override the restored runtime mode.
  return args.compiled ? [args.executable, "tui"]
    : [args.executable, ...args.execArgv, args.entrypoint, "tui"];
}

export function replaceTuiProcess(executable: string, argv: string[], env: NodeJS.ProcessEnv,
  execve: (file: string, args: string[], env: NodeJS.ProcessEnv) => void = process.execve!,
): void {
  try {
    execve(executable, argv, env);
  } catch (error) {
    throw new Error(`原地重启失败；未启动新进程。对话 ${env.NOLO_DIALOG_ID || "(new)"}；cwd ${env.NOLO_CWD}；${String(error)}`, { cause: error });
  }
}

/** Capture only an invocation path proven to name this binary at startup.
 * Preserve that path (not its realpath) so an installer can swap its symlink.
 */
export function captureRestartExecutable(executable: string, invocation: string,
  lookup: (name: string) => string | null = name => Bun.which(name),
  realpath: (path: string) => string = realpathSync,
): string {
  const candidate = isAbsolute(invocation) ? invocation
    : invocation.includes("/") ? resolve(invocation) : lookup(invocation);
  try {
    if (candidate && realpath(candidate) === realpath(executable)) return candidate;
  } catch { /* Unverifiable invocation: retain the known executable. */ }
  return executable;
}
