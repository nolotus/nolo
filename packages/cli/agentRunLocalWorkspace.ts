import type { AgentRuntimeHostAdapter } from "../agent-runtime/hostAdapter";
// Local workspace inspection helpers for `nolo agent run`. Extracted from
// agentRunCommand.ts.

import type { LocalAgentToolEvent } from "../agent-runtime/localLoopContract";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open } from "node:fs/promises";
import { resolve } from "node:path";
import { readPipeText, spawnProcess } from "./processSpawn";

type ParsedAgentRunArgsLike = {
  runtimeMode?: string;
  cwd?: string;
};

type LocalRunWorkspaceInspection = {
  cwd: string;
  clean: boolean;
  status: string;
  acceptance?: LocalRunAcceptance;
  commit?: {
    hash: string;
    subject: string;
  };
};

/** Runtime observations only. Never infer checks/review from assistant prose. */
export type LocalRunAcceptance = {
  schemaVersion: 1;
  source: "local-runtime";
  capturedAt: string;
  cwd: string;
  base: string | null;
  deliveryHead: string | null;
  workspace: {
    status: "observed" | "unknown";
    fingerprint: string | null;
    changedPaths: string[] | null;
    atomic: false;
  };
  checks: {
    status: "unknown";
    reason: string;
    observations?: LocalCommandObservation[];
  };
  review: { status: "unknown" };
};

export function unknownLocalRunAcceptance(cwd: string, base: string | null): LocalRunAcceptance {
  return {
    schemaVersion: 1, source: "local-runtime", capturedAt: new Date().toISOString(),
    cwd, base, deliveryHead: null,
    workspace: { status: "unknown", fingerprint: null, changedPaths: null, atomic: false },
    checks: { status: "unknown", reason: "No version-bound command execution evidence collected" },
    review: { status: "unknown" },
  };
}

type InspectLocalRunWorkspaceDeps = {
  spawnProcess?: typeof spawnProcess;
  readPipeText?: typeof readPipeText;
  signal?: AbortSignal;
  sampleLimits?: CommandSampleOptions["limits"];
};

async function runGitForLocalSummary(
  args: { cwd: string; gitArgs: string[] },
  deps: InspectLocalRunWorkspaceDeps = {}
) {
  const spawn = deps.spawnProcess ?? spawnProcess;
  const read = deps.readPipeText ?? readPipeText;
  const proc = spawn({
    cmd: ["git", ...args.gitArgs],
    cwd: args.cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    read(proc.stdout),
    read(proc.stderr),
    proc.exited,
  ]);
  if (exitCode !== 0) {
    throw new Error((stderr || stdout || `git ${args.gitArgs.join(" ")} failed`).trim());
  }
  return args.gitArgs.includes("-z") || args.gitArgs.includes("--binary") ? stdout : stdout.trim();
}

export async function inspectLocalRunWorkspace(
  cwd: string,
  deps: InspectLocalRunWorkspaceDeps = {},
  acceptanceBase?: string | null,
): Promise<LocalRunWorkspaceInspection> {
  // Acceptance and its displayed summary share one bounded sample. Never fall
  // back to the unbounded legacy reader when evidence is unavailable.
  if (acceptanceBase !== undefined) {
    const acceptance = unknownLocalRunAcceptance(cwd, acceptanceBase);
    const sample = acceptanceBase === null ? null : await captureBoundedWorkspace(cwd, {
      spawn: deps.spawnProcess, signal: deps.signal, limits: deps.sampleLimits, base: acceptanceBase,
    });
    if (sample) {
      acceptance.deliveryHead = sample.head;
      acceptance.workspace = { status: "observed", fingerprint: sample.fingerprint,
        changedPaths: sample.changedPaths, atomic: false };
    }
    return { cwd, clean: sample ? sample.status.trim() === "" : false,
      status: sample?.status ?? "workspace inspection unavailable (unknown)", acceptance,
      ...(sample?.commit ? { commit: sample.commit } : {}),
    };
  }
  // Legacy summary-only callers retain their existing contract.
  const run = (gitArgs: string[]) => runGitForLocalSummary({ cwd, gitArgs }, deps);
  const status = await run(["status", "--short"]);
  const rawCommit = await run(["log", "-1", "--format=%h%x00%s"]).catch(() => "");
  const [hash, subject] = rawCommit.split("\0");
  return {
    cwd,
    clean: status.trim() === "",
    status,
    ...(hash ? { commit: { hash, subject: subject ?? "" } } : {}),
  };
}

export function shouldPrintLocalRunSummary(args: {
  parsed: ParsedAgentRunArgsLike;
  localRuntimeCwd?: string;
}) {
  return Boolean(args.localRuntimeCwd && args.parsed.runtimeMode === "local");
}

export function formatLocalRunSummary(args: {
  dialogId?: string;
  inspection: LocalRunWorkspaceInspection;
}) {
  return [
    "",
    "[nolo] local run summary",
    `workspace: ${args.inspection.cwd}`,
    ...(args.dialogId ? [`dialog: ${args.dialogId}`] : []),
    ...(args.inspection.commit
      ? [`commit: ${args.inspection.commit.hash} ${args.inspection.commit.subject}`]
      : []),
    `dirty: ${args.inspection.clean ? "clean" : "dirty"}`,
    ...(!args.inspection.clean && args.inspection.status.trim()
      ? [`status:\n${args.inspection.status.trim()}`]
      : []),
    "",
  ].join("\n");
}

export type { LocalRunWorkspaceInspection };

/** Capture the actual initial HEAD before invoking the runner, not HEAD at settlement. */
export type LocalRunBaseCaptureOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
  outputBytes?: number;
  spawn?: typeof spawnProcess;
};

export async function captureLocalRunBase(cwd: string, options: LocalRunBaseCaptureOptions = {}): Promise<string | null> {
  if (options.signal?.aborted) return null;
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, options.timeoutMs ?? 2000);
  let child: ReturnType<typeof spawnProcess> | undefined;
  let bytesRead = 0;
  let onAbort: (() => void) | undefined;
  const stop = () => {
    child?.kill();
    child?.stdout?.destroy();
    child?.stderr?.destroy();
  };
  controller.signal.addEventListener("abort", stop, { once: true });
  const work = async () => {
    child = (options.spawn ?? spawnProcess)({ cmd: ["git", "rev-parse", "HEAD"], cwd,
      stdin: "ignore", stdout: "pipe", stderr: "pipe",
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0" } });
    const read = async (stream: ReturnType<typeof spawnProcess>["stdout"]) => {
      const chunks: Buffer[] = [];
      if (stream) for await (const chunk of stream) {
        if (controller.signal.aborted) throw new Error("base capture cancelled");
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        bytesRead += bytes.length;
        if (bytesRead > (options.outputBytes ?? 4096)) { controller.abort(); throw new Error("base output budget"); }
        chunks.push(bytes);
      }
      return Buffer.concat(chunks).toString("utf8").trim();
    };
    const [head, , code] = await Promise.all([read(child.stdout), read(child.stderr), child.exited]);
    if (controller.signal.aborted || code !== 0 || !/^[a-f0-9]{40,64}$/.test(head)) return null;
    return head;
  };
  try {
    return await Promise.race([work(), new Promise<null>((resolve) => {
      onAbort = () => resolve(null);
      controller.signal.addEventListener("abort", onAbort, { once: true });
      if (controller.signal.aborted) resolve(null);
    })]);
  } catch { return null; }
  finally {
    controller.abort();
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
    controller.signal.removeEventListener("abort", stop);
    if (onAbort) controller.signal.removeEventListener("abort", onAbort);
  }
}

/** A runtime result observation, not a test/review verdict. No command/output text. */
export type LocalCommandObservation = {
  commandFingerprint: string;
  cwd: string;
  cwdSource?: "configured-workspace";
  exitCode: number | "timeout" | "error";
  evidence: string;
  versionBinding: "unknown" | "stale" | "observed-unchanged";
  executionWorkspace?: { before: string | null; after: string | null; atomic: false; limitation: "ABA and external concurrent writes are not excluded" };
  source?: "execShell-tool-result";
  toolCallId?: string;
  capturedAt?: string;
};

export function observeLocalCommandResult(
  event: LocalAgentToolEvent,
  cwd: string,
): LocalCommandObservation | undefined {
  if (event.type !== "tool-result" || event.toolName !== "execShell") return;
  const meta = event.metadata;
  // Only positive synchronous completion is evidence. Detached task completion
  // belongs to a different lifecycle and cannot be inferred from its launch.
  if (!meta || meta.executionState !== "synchronous-complete" || meta.detached === true ||
      meta.aborted === true || typeof meta.command !== "string" ||
      typeof meta.timedOut !== "boolean" ||
      (!meta.timedOut && (typeof meta.exitCode !== "number" || !Number.isInteger(meta.exitCode)))) return;
  return {
    commandFingerprint: `sha256:${createHash("sha256").update(meta.command).digest("hex")}`,
    cwd,
    cwdSource: "configured-workspace",
    exitCode: meta.timedOut ? "timeout" : meta.exitCode as number,
    // Settlement replaces this with the containing result-file JSON pointer.
    evidence: "runtime-tool-result",
    versionBinding: "unknown",
    source: "execShell-tool-result",
    toolCallId: event.toolCallId,
    capturedAt: new Date().toISOString(),
  };
}

export function attachLocalCommandObservations(
  acceptance: LocalRunAcceptance,
  observations: readonly LocalCommandObservation[],
  resultReference: string,
): void {
  if (!observations.length) return;
  const existing = acceptance.checks.observations ?? [];
  acceptance.checks.observations = [...existing, ...observations.map((observation, index) => ({
    ...observation,
    evidence: `${resultReference}#/acceptance/checks/observations/${existing.length + index}`,
  }))];
  acceptance.checks.reason = "Command exits observed; execution cwd is configured only and execution-time version stability is unproven";
}


/** Budgets are per fresh endpoint; never reuse an earlier sample on overflow. */
export const COMMAND_WORKSPACE_SAMPLE_LIMITS = {
  timeoutMs: 2000,
  gitOutputBytes: 1024 * 1024,
  files: 128,
  fileBytes: 1024 * 1024,
  totalFileBytes: 4 * 1024 * 1024,
  concurrentSamples: 1,
} as const;

// Process-local admission only. Other processes have their own budgets; this
// neither locks the workspace nor claims atomicity. Busy callers skip, not queue.
let activeCommandWorkspaceSamples = 0;
type CommandSampleOptions = {
  signal?: AbortSignal;
  limits?: Partial<Record<keyof typeof COMMAND_WORKSPACE_SAMPLE_LIMITS, number>>;
  spawn?: typeof spawnProcess;
  base?: string;
};

/** Endpoint sampling only; bounded, cancellable, never proof against ABA. */
async function captureBoundedWorkspace(
  cwd: string,
  options: CommandSampleOptions = {},
): Promise<{ fingerprint: string; head: string; status: string; changedPaths: string[];
  commit?: { hash: string; subject: string } } | null> {
  if (options.signal?.aborted || activeCommandWorkspaceSamples >= COMMAND_WORKSPACE_SAMPLE_LIMITS.concurrentSamples) return null;
  activeCommandWorkspaceSamples++;
  const limits = { ...COMMAND_WORKSPACE_SAMPLE_LIMITS, ...options.limits };
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, limits.timeoutMs);
  let outputBytes = 0;
  let fileBytes = 0;
  const check = () => { if (controller.signal.aborted) throw new Error("sample cancelled"); };
  const git = async (args: string[]): Promise<Buffer> => {
    check();
    const child = (options.spawn ?? spawnProcess)({
      cmd: ["git", ...args], cwd, stdin: "ignore", stdout: "pipe", stderr: "pipe",
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0" },
    });
    const stop = () => {
      child.kill();
      child.stdout?.destroy();
      child.stderr?.destroy();
    };
    controller.signal.addEventListener("abort", stop, { once: true });
    const read = async (stream: typeof child.stdout) => {
      const chunks: Buffer[] = [];
      if (stream) for await (const chunk of stream) {
        check();
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        outputBytes += bytes.length;
        if (outputBytes > limits.gitOutputBytes) { controller.abort(); throw new Error("git output budget"); }
        chunks.push(bytes);
      }
      return Buffer.concat(chunks);
    };
    try {
      const [stdout, , code] = await Promise.all([read(child.stdout), read(child.stderr), child.exited]);
      check();
      if (code !== 0) throw new Error("git inspection failed");
      return stdout;
    } finally {
      controller.signal.removeEventListener("abort", stop);
      stop();
    }
  };
  const work = async () => {
    const head = await git(["rev-parse", "HEAD"]);
    const root = (await git(["rev-parse", "--show-toplevel"])).toString("utf8").trim();
    const digest = createHash("sha256").update(head);
    const summary = options.base !== undefined ? (await git(["log", "-1", "--format=%h%x00%s"])).toString("utf8").trim() : "";
    const paths = options.base !== undefined ? (await git(["-C", root, "diff", "--name-only", "-z", options.base, "--"]))
      .toString("utf8").split("\0").filter(Boolean) : [];
    if (paths.length > limits.files) throw new Error("base changed file count budget");
    const status = await git(["-C", root, "status", "--porcelain=v1", "-z", "--untracked-files=all"]);
    // Rename records may contribute two paths: overcount conservatively.
    if (status.toString("utf8").split("\0").filter(Boolean).length > limits.files) throw new Error("changed file count budget");
    digest.update(status);
    for (const args of [
      ["diff", "--no-ext-diff", "--no-textconv", "--binary", "HEAD", "--"],
      ["diff", "--cached", "--no-ext-diff", "--no-textconv", "--binary", "HEAD", "--"],
    ]) digest.update(await git(["-C", root, ...args]));
    const names = (await git(["-C", root, "ls-files", "--others", "--exclude-standard", "-z"]))
      .toString("utf8").split("\0").filter(Boolean).sort();
    if (names.length > limits.files) throw new Error("file count budget");
    for (const name of names) {
      check();
      const path = resolve(root, name);
      const stat = await lstat(path);
      check();
      // Symlinks/special files are unknown here rather than following targets.
      if (!stat.isFile() || stat.size > limits.fileBytes || fileBytes + stat.size > limits.totalFileBytes) throw new Error("file budget");
      digest.update(JSON.stringify([name, stat.mode, stat.size]));
      if (stat.size === 0) {
        const after = await lstat(path);
        check();
        if (!after.isFile() || after.size !== 0 || after.ino !== stat.ino || after.mtimeMs !== stat.mtimeMs) throw new Error("racing empty file");
        continue;
      }
      let readBytes = 0;
      const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
      try {
        check();
        const opened = await file.stat();
        check();
        if (!opened.isFile() || opened.ino !== stat.ino || opened.size !== stat.size) throw new Error("racing open");
        const stream = file.createReadStream({ autoClose: false,
          highWaterMark: Math.min(32 * 1024, stat.size), end: stat.size - 1, signal: controller.signal });
        try {
          for await (const chunk of stream) {
            check();
            const bytes = chunk as Buffer;
            readBytes += bytes.length;
            fileBytes += bytes.length;
            if (readBytes > limits.fileBytes || fileBytes > limits.totalFileBytes) throw new Error("read budget");
            digest.update(bytes);
          }
        } finally { stream.destroy(); }
      } finally { await file.close(); }
      const after = await lstat(path);
      check();
      if (readBytes !== stat.size || after.size !== stat.size || after.mtimeMs !== stat.mtimeMs ||
          after.ino !== stat.ino || !after.isFile()) throw new Error("racing file");
    }
    check();
    const [hash, subject] = summary.split("\0");
    return { fingerprint: `sha256:${digest.digest("hex")}`, head: head.toString("utf8").trim(),
      status: status.toString("utf8").replace(/\0/g, "\n"),
      changedPaths: [...new Set([...paths, ...names])].sort(),
      ...(hash ? { commit: { hash, subject: subject ?? "" } } : {}),
    };
  };
  let onAbort: (() => void) | undefined;
  try {
    // Abort wins even if an OS filesystem operation or faulty child never settles.
    const pending = work().finally(() => { activeCommandWorkspaceSamples--; });
    return await Promise.race([pending, new Promise<null>((resolve) => {
      onAbort = () => resolve(null);
      controller.signal.addEventListener("abort", onAbort, { once: true });
      if (controller.signal.aborted) resolve(null);
    })]);
  } catch { return null; }
  finally {
    controller.abort();
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
    if (onAbort) controller.signal.removeEventListener("abort", onAbort);
    // Admission remains held until underlying OS work settles, even when the
    // deadline wins, so a stuck filesystem cannot multiply abandoned scans.
  }
}

export async function captureCommandWorkspaceFingerprint(cwd: string, options: CommandSampleOptions = {}): Promise<string | null> {
  return (await captureBoundedWorkspace(cwd, options))?.fingerprint ?? null;
}

export function wrapLocalCommandWorkspaceObservation(
  adapter: AgentRuntimeHostAdapter,
  cwd: string,
  bindings: Map<string, Pick<LocalCommandObservation, "versionBinding" | "executionWorkspace">>,
  capture: (cwd: string, options?: CommandSampleOptions) => Promise<string | null> = captureCommandWorkspaceFingerprint,
  signal?: AbortSignal,
): AgentRuntimeHostAdapter {
  const safeCapture = (callSignal?: AbortSignal) => capture(cwd, { signal: signal ?? callSignal }).catch(() => null);
  return {
    ...adapter,
    async executeTool(call, options) {
      if (call.name !== "execShell") return adapter.executeTool.call(adapter, call, options);
      // Explicit background launches have no synchronous checked version.
      try {
        if (JSON.parse(call.arguments).background === true) return adapter.executeTool.call(adapter, call, options);
      } catch { /* Executor owns argument validation; invalid input cannot create evidence. */ }
      const before = await safeCapture(options?.abortSignal);
      const result = await adapter.executeTool.call(adapter, call, options);
      // Do not sample detached/background work as though it already completed.
      if (result.metadata?.executionState === "synchronous-complete" &&
          result.metadata.detached !== true && result.metadata.aborted !== true) {
        const after = await safeCapture(options?.abortSignal);
        bindings.set(call.id, {
          versionBinding: !before || !after ? "unknown" : before === after ? "observed-unchanged" : "stale",
          executionWorkspace: { before, after, atomic: false,
            limitation: "ABA and external concurrent writes are not excluded" },
        });
      }
      return result;
    },
  };
}
