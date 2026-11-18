import { isAbortError } from "core/abortError";
import { toErrorMessage } from "core/errorMessage";
import { asTrimmedString } from "core/trimmedString";
import type { LocalAgentTurnInput } from "../../agent-runtime/localLoop";
import type { AgentRuntimeMessageContent } from "../../agent-runtime/types";
import type {
  DesktopAgentRuntimeAgentConfigSnapshot,
  DesktopAgentRuntimeDialogHistorySnapshot,
} from "../../agent-runtime/desktopRequestSnapshot";
import {
  assertDesktopAgentRuntimeTurnBodyHasNoRawSecrets,
  buildDesktopAgentRuntimeAgentConfigSnapshot,
  buildDesktopAgentRuntimeDialogHistorySnapshot,
} from "../../agent-runtime/desktopRequestSnapshot";
import type {
  LocalAgentToolEvent,
  LocalAgentTurnResult,
} from "../../agent-runtime/localLoop";
import { readStreamChunk } from "../../ai/chat/streamReader";

export type DesktopAgentRuntimeTurnResult =
  | {
      ok: true;
      result: LocalAgentTurnResult;
    }
  | {
      ok: false;
      error: string;
    };

type RunDesktopAgentRuntimeTurnArgs = {
  agentRef: string;
  input: AgentRuntimeMessageContent;
  userMessages?: LocalAgentTurnInput["userMessages"];
  /**
   * Request-scoped context blocks (project context, browse context…). Reach the
   * model as system-prompt layers on the host; never become part of `input`, so
   * they are never persisted as the user message.
   */
  contextBlocks?: string[];
  runtimeContext?: Record<string, any> | null;
  continueDialogId?: string;
  /**
   * Exact parent dialog dbKey known to the client. Lets the host read the
   * dialog record without re-deriving `dialog-${userId}-` from its own env.
   */
  dialogKey?: string;
  cwd?: string;
  restrictShellToWorkspace?: boolean;
  workspaceToolsHint?: boolean;
  /**
   * Pre-built allowlisted snapshot, or a full agent record the client will sanitize.
   * Prefer passing the already-built snapshot from streamAgentChatTurn.
   */
  agentConfigSnapshot?: DesktopAgentRuntimeAgentConfigSnapshot | Record<string, unknown> | null;
  /**
   * Optional dialog history from webview state when host LevelDB has no dialog.
   */
  dialogHistorySnapshot?: DesktopAgentRuntimeDialogHistorySnapshot | null;
  /**
   * Raw client messages used to build dialogHistorySnapshot when snapshot is not pre-built.
   */
  dialogMessages?: unknown[];
  /**
   * Webview session bearer for the desktop turn endpoint.
   *
   * The host reads the caller's identity from `Authorization: Bearer …` (or the
   * `nolo_auth_token` cookie) — `desktopAgentRuntimeTurnHandler.resolveDesktopTurnRequestEnv`.
   * The desktop webview never writes that cookie (desktopTokenManager keeps the
   * session in localStorage only), so without this header the host env has no
   * AUTH_TOKEN and every platform-model turn fails with AUTH_NO_TOKEN even
   * though the UI is signed in. Header-only: never part of the JSON body
   * (`assertDesktopAgentRuntimeTurnBodyHasNoRawSecrets`).
   */
  authToken?: string;
  /** User stop / dialog abort. Cancels fetch + body reader when the webview stalls. */
  signal?: AbortSignal;
  /**
   * Client-side no-event watchdog (safety net; the runtime compaction/LLM
   * deadline stays primary). When set, a stream idle gap longer than this
   * surfaces as an `error` event instead of hanging forever. Off by default.
   */
  noEventWatchdogMs?: number;
  fetchImpl?: typeof fetch;
};

/** Stable client error when a provided agent config cannot be snapshotted for the turn. */
export const DESKTOP_AGENT_CONFIG_SNAPSHOT_BUILD_FAILED =
  "desktop_agent_config_snapshot_invalid";

export function buildDesktopAgentRuntimeTurnBody(args: RunDesktopAgentRuntimeTurnArgs) {
  const continueDialogId = asTrimmedString(args.continueDialogId);

  let agentConfigSnapshot: DesktopAgentRuntimeAgentConfigSnapshot | undefined;
  if (args.agentConfigSnapshot && typeof args.agentConfigSnapshot === "object") {
    // Accept either a pre-built snapshot or a raw agent record.
    // Fail closed: when the client was given a config for the local Desktop path,
    // never silently omit the snapshot (host LevelDB is empty for owner=local).
    const built = buildDesktopAgentRuntimeAgentConfigSnapshot(
      args.agentConfigSnapshot,
      args.agentRef,
    );
    if (!built) {
      throw new Error(DESKTOP_AGENT_CONFIG_SNAPSHOT_BUILD_FAILED);
    }
    agentConfigSnapshot = built;
  }

  let dialogHistorySnapshot: DesktopAgentRuntimeDialogHistorySnapshot | undefined;
  if (args.dialogHistorySnapshot && typeof args.dialogHistorySnapshot === "object") {
    dialogHistorySnapshot = args.dialogHistorySnapshot;
  } else if (Array.isArray(args.dialogMessages) && continueDialogId) {
    dialogHistorySnapshot =
      buildDesktopAgentRuntimeDialogHistorySnapshot({
        dialogId: continueDialogId,
        messages: args.userMessages?.length
          ? args.dialogMessages.filter((message: any) => !args.userMessages!.some(user => user.cliMessageId === message.id))
          : args.dialogMessages,
        currentInput: args.userMessages?.length ? undefined : args.input,
      }) ?? undefined;
  }

  const body = {
    agentRef: args.agentRef,
    input: args.input,
    ...(args.userMessages?.length ? { userMessages: args.userMessages } : {}),
    ...(Array.isArray(args.contextBlocks) && args.contextBlocks.length > 0
      ? { contextBlocks: args.contextBlocks }
      : {}),
    ...(args.runtimeContext ? { runtimeContext: args.runtimeContext } : {}),
    ...(continueDialogId ? { continueDialogId } : {}),
    ...(continueDialogId && asTrimmedString(args.dialogKey)
      ? { dialogKey: asTrimmedString(args.dialogKey) }
      : {}),
    ...(args.cwd ? { cwd: args.cwd } : {}),
    ...(args.restrictShellToWorkspace ? { restrictShellToWorkspace: true } : {}),
    ...(args.workspaceToolsHint ? { workspaceToolsHint: true } : {}),
    ...(agentConfigSnapshot ? { agentConfigSnapshot } : {}),
    ...(dialogHistorySnapshot ? { dialogHistorySnapshot } : {}),
  };

  assertDesktopAgentRuntimeTurnBodyHasNoRawSecrets(body);
  return body;
}

function normalizeDesktopAgentRuntimeTurnError(data: any) {
  return typeof data?.error === "string"
    ? data.error
    : "Failed to run desktop agent runtime turn";
}

/**
 * Pre-delta turn phase carried by a desktop SSE `status` frame. Mirrors the
 * runtime `turn-phase` observation (see agent-runtime/executionObservation.ts).
 * `scope` traces whether the phase belongs to the initial (pre-first-LLM) or
 * in-loop compaction pass.
 */
export type DesktopTurnPhase = "validating-context" | "compacting" | "waiting-provider";

export type DesktopStreamEvent =
  | { type: "delta"; text: string }
  | { type: "thinking"; content: string }
  | { type: "status"; phase: DesktopTurnPhase; scope?: "initial" | "in-loop" }
  | { type: "tool"; event: LocalAgentToolEvent }
  /**
   * Turn-scoped ACTUAL tool execution location (F2), projected by the desktop
   * runtime host (detectMachineInfo + turn workspace → projectToolExecutionLocation).
   * Distinct from the dialog's intended runtimeBinding.target: this is where the
   * tool actually ran, not where the user asked it to run. `{status:"unknown"}`
   * is an explicit honest value, not missing data.
   */
  | { type: "execution_location"; location: unknown }
  /**
   * Block 3b: pending action gate pushed by the desktop runtime host
   * (confirm / handoff / input). Carries only id/kind/title/body/payload —
   * never credential material. Routed to the in-memory gate channel, not to
   * the transcript.
   */
  | {
      type: "action_gate";
      gate: {
        id: string;
        kind: "confirm" | "handoff" | "input";
        title: string;
        body?: string;
        payload?: unknown;
      };
    }
  | { type: "done"; result: LocalAgentTurnResult }
  | { type: "error"; error: string };

export async function* runDesktopAgentRuntimeTurnStream({
  fetchImpl = fetch,
  signal,
  noEventWatchdogMs,
  authToken,
  ...args
}: RunDesktopAgentRuntimeTurnArgs): AsyncGenerator<DesktopStreamEvent, void, unknown> {
  try {
    if (signal?.aborted) {
      yield { type: "error", error: "The operation was aborted." };
      return;
    }

    // Destructured out of `args` above so the bearer never reaches the JSON
    // body; the host only accepts it as a request header.
    const trimmedAuthToken = asTrimmedString(authToken) ?? "";

    const response = await fetchImpl("/api/desktop/agent-runtime/turn", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(trimmedAuthToken ? { Authorization: `Bearer ${trimmedAuthToken}` } : {}),
      },
      body: JSON.stringify(buildDesktopAgentRuntimeTurnBody(args)),
      signal,
    });

    if (!response.ok) {
      const data = await response.clone().json().catch(() => null);
      yield {
        type: "error",
        error: data
          ? normalizeDesktopAgentRuntimeTurnError(data)
          : `HTTP ${response.status}: ${response.statusText}`,
      };
      return;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/event-stream")) {
      const data = await response.json().catch(() => ({}));
      if (data?.ok === false) {
        yield { type: "error", error: normalizeDesktopAgentRuntimeTurnError(data) };
      } else if (data?.result) {
        yield { type: "done", result: data.result as LocalAgentTurnResult };
      } else {
        yield { type: "error", error: "Desktop runtime response did not include a result" };
      }
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: "error", error: "Response body reader not available" };
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";
    const readLine = (line: string) => {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) return null;
      try {
        return JSON.parse(trimmed.slice(6)) as DesktopStreamEvent;
      } catch (e) {
        console.error("[desktop-client] Failed to parse stream line:", trimmed, e);
        return null;
      }
    };

    try {
      while (true) {
        if (signal?.aborted) {
          yield { type: "error", error: "The operation was aborted." };
          return;
        }
        const { done, value } = await readStreamChunk(reader, {
          signal,
          ...(noEventWatchdogMs && noEventWatchdogMs > 0
            ? {
                timeoutMs: noEventWatchdogMs,
                timeoutErrorMessage: `Desktop turn stream stalled: no event within ${noEventWatchdogMs}ms`,
              }
            : {}),
        });
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const event = readLine(line);
          if (event) yield event;
        }
      }
      buffer += decoder.decode();
      const event = readLine(buffer);
      if (event) yield event;
    } catch (error) {
      if (isAbortError(error) || signal?.aborted) {
        yield { type: "error", error: "The operation was aborted." };
        return;
      }
      yield {
        type: "error",
        error: toErrorMessage(error),
      };
    } finally {
      try {
        await reader.cancel();
      } catch {
        /* ignore */
      }
      try {
        reader.releaseLock();
      } catch {
        /* ignore */
      }
    }
  } catch (error) {
    if (isAbortError(error) || signal?.aborted) {
      yield { type: "error", error: "The operation was aborted." };
      return;
    }
    yield {
      type: "error",
      error: toErrorMessage(error),
    };
  }
}

export async function runDesktopAgentRuntimeTurn(
  args: RunDesktopAgentRuntimeTurnArgs
): Promise<DesktopAgentRuntimeTurnResult> {
  try {
    let finalResult: LocalAgentTurnResult | null = null;
    let errorMsg: string | null = null;

    for await (const event of runDesktopAgentRuntimeTurnStream(args)) {
      if (event.type === "done") {
        finalResult = event.result;
      } else if (event.type === "error") {
        errorMsg = event.error;
      }
    }

    if (errorMsg) {
      return { ok: false, error: errorMsg };
    }
    if (!finalResult) {
      return { ok: false, error: "Stream closed without a result" };
    }

    return { ok: true, result: finalResult };
  } catch (error) {
    return {
      ok: false,
      error: toErrorMessage(error),
    };
  }
}
