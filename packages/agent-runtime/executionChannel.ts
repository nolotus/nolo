// packages/agent-runtime/executionChannel.ts
//
// Generic execution channel: wraps ANY prepared `ExecutionBackend` lease into
// the provider-neutral `ExecutionToolChannel` consumed by the tool loop, so
// bwrap / Instabox / sbx / Cloud Run share one tool-execution path instead of
// each shipping its own tool dispatcher.
//
// This module is deliberately primitive-only: it knows how to turn a tool call
// into one `ExecutionRequest` and how to turn one `ExecutionResult` back into
// the string handed to the model. It must not import the server package (the
// container-side helper protocol lives there and is injected by the caller via
// `helper`).
//
// Failure contract: nothing here throws. Every failure is encoded as the
// JSON envelope `{"ok":false,"error":"<reason>"}` (plus `"stderr"` when the
// backend produced diagnostic text), because the channel's return value goes
// straight back to the model.
//
// Error vocabulary (stable — callers may match on these prefixes):
//   aborted            the caller's signal was already/soon aborted
//   invalid_command    execShell without a usable `command` string
//   tool_not_supported no helper bridge was supplied for a non-shell tool
//   helper_argv_invalid buildArgv returned a malformed argv
//   backend_error      backend.execute threw; `stderr` carries its message
//   backend_rejected   ok:false without an exit code
//   exit_code:<n>      the command ran and exited non-zero (`exit_code:null`
//                      when the process was signalled instead of exiting)

import type {
  ExecutionBackend,
  ExecutionLease,
  ExecutionRequest,
  ExecutionResult,
} from "./executionBackend";
import type { ExecutionToolChannel } from "./executionWorkload";

/** Tool name whose arguments carry a shell command string. */
export const EXECUTION_SHELL_TOOL = "execShell";

/** Kept short: this text is handed to the model, not written to a log. */
const STDERR_DETAIL_LIMIT = 400;

/**
 * Bridge to a container-internal file-tool helper (e.g. the server package's
 * `workspace-tool.mjs`). Injected rather than imported so agent-runtime keeps
 * no dependency on the server package.
 */
export type ExecutionHelperBridge = {
  /** Absolute path of the helper inside the lease's filesystem. */
  path: string;
  /**
   * Map one file-class tool call to an argv.
   * Return `{ok:false,error}` to reject the call (surfaced verbatim to the model).
   */
  buildArgv: (
    toolName: string,
    args: Record<string, unknown>,
  ) => { ok: true; argv: string[] } | { ok: false; error: string };
};

export type CreateExecutionChannelArgs = {
  backend: ExecutionBackend;
  /** A lease returned by `backend.prepare(ticket)`; never re-created here. */
  lease: ExecutionLease;
  /** Default per-request budget handed to the backend. */
  timeoutMs?: number;
  /** Optional file-tool mapping; without it only execShell is supported. */
  helper?: ExecutionHelperBridge;
};

type OutputStreams = { stdout: string; stderr: string };

function encodeFailure(error: string, stderr?: string): string {
  const envelope: { ok: false; error: string; stderr?: string } = { ok: false, error };
  const detail = stderr?.trim();
  if (detail) envelope.stderr = detail.slice(0, STDERR_DETAIL_LIMIT);
  return JSON.stringify(envelope);
}

/** Backends report their streams as `output: {stdout, stderr}`; a bare string
 * output is treated as stdout so a minimal backend still works. */
function readStreams(output: unknown): OutputStreams {
  if (typeof output === "string") return { stdout: output, stderr: "" };
  if (!output || typeof output !== "object") return { stdout: "", stderr: "" };
  const record = output as Record<string, unknown>;
  return {
    stdout: typeof record.stdout === "string" ? record.stdout : "",
    stderr: typeof record.stderr === "string" ? record.stderr : "",
  };
}

function describeMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, STDERR_DETAIL_LIMIT);
}

/** Success is the only state that yields raw stdout: unknown/absent exit codes
 * are tolerated, but an explicit failure or non-zero code is not. */
function isFailure(result: ExecutionResult): boolean {
  if (result.ok === false) return true;
  return !(result.exitCode === undefined || result.exitCode === 0);
}

function failureReason(result: ExecutionResult): string {
  if (typeof result.exitCode === "number") return `exit_code:${result.exitCode}`;
  if (result.exitCode === null) return "exit_code:null";
  return "backend_rejected";
}

/**
 * Build one tool channel bound to `lease`.
 *
 * The returned channel is fail-closed: an unknown tool, an aborted signal, a
 * rejected/errored backend or a non-zero exit all come back as an `ok:false`
 * envelope instead of a thrown error.
 */
export function createExecutionChannel(
  args: CreateExecutionChannelArgs,
): ExecutionToolChannel {
  const { backend, lease, timeoutMs, helper } = args;

  return async (toolName, toolArgs, signal) => {
    if (signal?.aborted) return encodeFailure("aborted");

    let argv: string[];
    if (toolName === EXECUTION_SHELL_TOOL) {
      const command = toolArgs?.command;
      if (typeof command !== "string" || command.length === 0) {
        return encodeFailure("invalid_command");
      }
      argv = ["bash", "-lc", command];
    } else if (helper) {
      const built = helper.buildArgv(toolName, toolArgs ?? {});
      if (!built.ok) return encodeFailure(built.error || "tool_not_supported");
      const mapped = built.argv;
      if (
        !Array.isArray(mapped) ||
        mapped.length === 0 ||
        mapped.some((entry) => typeof entry !== "string" || entry.length === 0)
      ) {
        return encodeFailure("helper_argv_invalid");
      }
      // buildArgv may return the full command line (helper path among the
      // first two entries) or just the arguments; never prepend twice.
      const carriesHelperPath = mapped[0] === helper.path || mapped[1] === helper.path;
      argv = carriesHelperPath ? mapped : [helper.path, ...mapped];
    } else {
      return encodeFailure("tool_not_supported");
    }

    const request: ExecutionRequest = {
      kind: "command",
      argv,
      ...(timeoutMs === undefined ? {} : { timeoutMs }),
    };

    let result: ExecutionResult;
    try {
      result = await backend.execute(lease, request);
    } catch (error) {
      // An abort is reported as an abort, not as a backend fault.
      if (signal?.aborted) return encodeFailure("aborted");
      return encodeFailure("backend_error", describeMessage(error));
    }

    // The backend cannot observe our signal, so a cancellation that arrived
    // while it was running still wins over a completed command.
    if (signal?.aborted) return encodeFailure("aborted");

    const streams = readStreams(result.output);
    if (isFailure(result)) {
      return encodeFailure(failureReason(result), streams.stderr);
    }
    return streams.stdout;
  };
}
