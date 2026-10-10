import type { AgentRuntimeToolResult } from "../hostAdapter";
import {
  IMMEDIATE_DETACH_SLEEP_THRESHOLD_SECONDS,
  isImmediateDetachShellCommand,
  resolveShellCommandArg,
} from "../shellCommandPolicy";
import { detectExecShellSynchronousWarnings } from "../execShellCompletionWarnings";
import {
  buildWorkspaceShellPlan,
  findWorkspaceShellEscapeToken,
  buildWorkspaceShellEscapeBlockedResult,
  extractActivity,
  extractInteractiveGhAuthCommand,
  buildInteractiveCommandBlockedResult,
  resolveExecShellTimeoutMs,
  runWorkspaceCommand,
} from "../workspaceShell";
import type { CapabilityExecutionContext, ExecutableCapability, OpenAiCompatibleTool } from "./capability";
import type { ProcessOwner } from "../processOwnership";

export interface ExecShellInput {
  command: string;
  shell?: unknown;
  activity?: unknown;
  input?: unknown;
  /**
   * Immediately detach into a tracked background task (P1 reliable async
   * entry): no 120s synchronous wait, returns {detached:true, taskId}, and
   * the terminal transition resumes the parent conversation with a bounded
   * result capsule. Default false.
   */
  background?: boolean;
  [key: string]: unknown;
}

export function buildExecShellToolDefinition(toolName = "execShell"): OpenAiCompatibleTool {
  return {
    type: "function",
    function: {
      name: toolName,
      description:
        `Execute a shell command from the workspace root. Prefer one compound command (e.g. 'git status && git diff --stat') to perform complete verification in one step instead of multiple small roundtrips. Do not cd into guessed paths; commands already run from the workspace root. Commands block until exit. Long-running commands (sleep over ${IMMEDIATE_DETACH_SLEEP_THRESHOLD_SECONDS}s, dev servers, watchers) automatically detach to background returning {detached: true, pid, label}; for persistent services, prefer launchProcess. On Windows the resolved shell may be Windows PowerShell 5.1 (metadata.shellKind="powershell5"): it does not support '&&'/'||' or $PSStyle — join commands with ';' or split into multiple calls. metadata.shellKind="pwsh" means PowerShell 7+ with full syntax. Read resolvedShell/shellKind from any execShell result before writing Windows-specific syntax. ` +
        `LIFECYCLE CONTRACT (misreading this contract silenced a real dialog for 10 hours): (1) A normal command waits synchronously for at most 120 seconds; if it ends inside that window the call IS finished — a result containing exitCode means the command has already completed, never "still running". (2) Only a result with metadata.detached === true AND a taskId represents a tracked background task that may trigger completion wake-up (terminal completion turn carrying a bounded result capsule); that handle may be waited on with taskWait and will produce a completion notification. (3) Text the command itself prints (LAUNCHED, STARTED, BACKGROUND, ...) is plain stdout with zero lifecycle meaning — never read it as a platform receipt. (4) Shell-level backgrounding (\`&\`, nohup, disown, setsid, self-daemonizing scripts, PowerShell Start-Process) is NOT tracked: those descendants produce no completion notification, and the outer shell finishing tells you nothing about them. Use background: true to turn a finite job into a tracked background task immediately. When a synchronous result's core output was redirected to a file, read that file in the SAME turn — never end the turn promising a later automatic report without a taskId.`,
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "Shell command to run (non-empty).",
          },
          cmd: {
            type: "string",
            description: "Compatibility alias for command.",
          },
          background: {
            type: "boolean",
            description:
              "Immediately detach this command into a tracked background task (no 120s synchronous wait): returns {detached: true, taskId}, and on completion the platform resumes this conversation with a bounded result capsule (exitCode, duration, stdout/stderr tail). Default false. Use for finite jobs (tests, builds, batch) whose result you need later; NOT for dev servers/watchers — use launchProcess for those.",
          },
        },
      },
    },
  };
}

export function normalizeExecShellInput(input: unknown): ExecShellInput {
  if (input === null || input === undefined) {
    throw new Error("execShell requires a non-empty command.");
  }

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) {
      throw new Error("execShell requires a non-empty command.");
    }
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (parsed && typeof parsed === "object") {
          return normalizeExecShellInput(parsed);
        }
      } catch {
        // Not valid JSON, treat as raw command string
      }
    }
    return { command: trimmed };
  }

  if (typeof input === "object") {
    const record = input as Record<string, unknown>;
    let rawCommand = resolveShellCommandArg(record);
    if (typeof rawCommand !== "string" || !rawCommand.trim()) {
      const fallback = record.command ?? record.cmd;
      if (typeof fallback === "string" && fallback.trim()) {
        rawCommand = fallback;
      }
    }
    const command = typeof rawCommand === "string" ? rawCommand.trim() : "";
    if (!command) {
      throw new Error("execShell requires a non-empty command.");
    }
    const activity = extractActivity(record);
    const background = record.background === true
      || (typeof record.background === "string" && record.background.trim().toLowerCase() === "true");
    return {
      command,
      ...(record.shell !== undefined ? { shell: record.shell } : {}),
      ...(activity ? { activity } : {}),
      ...(record.input !== undefined ? { input: record.input } : {}),
      ...(background ? { background: true } : {}),
    };
  }

  throw new Error("execShell requires a non-empty command.");
}

export const execShellCapability: ExecutableCapability<ExecShellInput, AgentRuntimeToolResult> = {
  name: "execShell",

  getToolDefinition(toolName = "execShell"): OpenAiCompatibleTool {
    return buildExecShellToolDefinition(toolName);
  },

  normalizeInput(input: unknown): ExecShellInput {
    return normalizeExecShellInput(input);
  },

  async invoke(
    ctx: CapabilityExecutionContext,
    normalized: ExecShellInput,
  ): Promise<AgentRuntimeToolResult> {
    const workspaceRoot = ctx.workspaceRoot || process.cwd();
    const command = normalized.command;

    if (ctx.restrictToWorkspace) {
      const escapeToken = findWorkspaceShellEscapeToken(command);
      if (escapeToken) {
        return buildWorkspaceShellEscapeBlockedResult({ command, token: escapeToken });
      }
    }

    const interactiveAuthCommand = extractInteractiveGhAuthCommand(command);
    if (interactiveAuthCommand) {
      const blocked = buildInteractiveCommandBlockedResult(interactiveAuthCommand);
      return {
        ...blocked,
        metadata: {
          ...blocked.metadata,
          ...(normalized.activity ? { activity: normalized.activity } : {}),
        },
      };
    }

    const shellPlan = buildWorkspaceShellPlan({
      toolName: "execShell",
      command,
      shell: normalized.shell,
    });

    // P1 reliable async entry: background:true skips the synchronous wait
    // entirely (detachMs 0 → immediate promotion through the existing
    // registry.add → promote() → terminal completion-turn path). Explicit
    // request wins over the smart-detach heuristic.
    const background = normalized.background === true;

    const result = await runWorkspaceCommand({
      workspaceRoot,
      command: shellPlan.argv,
      timeoutMs: resolveExecShellTimeoutMs(ctx.commandTimeoutMs),
      outputLimit: ctx.commandOutputLimit,
      commandPrefix: ctx.commandPrefix,
      abortSignal: ctx.abortSignal,
      detachMs: background
        ? 0
        : isImmediateDetachShellCommand({ command })
          ? 0
          : ctx.detachMs,
      stdin: typeof normalized.input === "string" ? normalized.input : undefined,
      // Ownership of the turn that invoked this command: an auto-detached
      // command keeps its parent dialog so its terminal can resume that
      // conversation (see processOwnership.ts). Absent ctx.owner = unowned.
      owner: (ctx.owner as ProcessOwner | null | undefined) ?? null,
    });

    // P0 same-shape warnings: only for synchronous completions (a detached or
    // spawn-failed call never reached the "looks async but is not" confusion
    // this guardrail exists for). Warn-only: the command is never rewritten.
    // The resolved shell is passed through so shell-specific operators are
    // read correctly (PowerShell's lone `&` is a call operator, not
    // backgrounding).
    const warnings = result.detached || result.spawnFailed
      ? []
      : detectExecShellSynchronousWarnings(command, {
          resolvedShell: shellPlan.resolvedShell,
        });

    return {
      content: warnings.length > 0
        ? [result.content, ...warnings.map((warning) => warning.message)].join("\n\n")
        : result.content,
      metadata: {
        command,
        exitCode: result.exitCode,
        timedOut: result.timedOut,
        resolvedShell: shellPlan.resolvedShell,
        ...(shellPlan.shellKind ? { shellKind: shellPlan.shellKind } : {}),
        ...(result.aborted ? { aborted: true } : {}),
        ...(result.detached
          ? {
              detached: true,
              pid: result.pid,
              label: result.label,
              // Phase 0: stable taskId from the pre-registered Execution
              // Envelope (additive; existing detached fields untouched).
              taskId: result.taskId,
              status: "running" as const,
              // P0 machine-readable execution state: an explicit positive
              // signal instead of requiring the model to infer "not detached"
              // from absence. Mirrors the real lifecycle contract.
              executionState: "detached" as const,
              trackedBackgroundTask: true,
              completionNotification: "terminal-resume" as const,
            }
          : {
              // P0 machine-readable execution state: the command already
              // finished inside the synchronous window; no background task
              // exists, so no completion notification will ever arrive.
              executionState: "synchronous-complete" as const,
              trackedBackgroundTask: false,
              completionNotification: "none" as const,
            }),
        ...(normalized.activity ? { activity: normalized.activity } : {}),
      },
    };
  },
};
