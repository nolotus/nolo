import type { RootState } from "app/store";
import type { Agent, DialogConfig } from "app/types";
import { selectCurrentServer } from "app/settings/serverSelectors";
import { getIsDesktopApp } from "app/utils/env";
import { selectIdentityToken, selectIdentityUserId } from "identity/selectors";
import { extractCustomId } from "core/prefix";
import { createDialogMessageKeyAndId } from "database/keys";
import {
  addActiveController,
  removeActiveController,
} from "chat/dialog/dialogRuntimeStore";
import {
  initMsgs,
  messageStreaming,
  removeTransientMessage,
  selectAllMsgs,
  setMessages,
} from "chat/messages/messageSlice";
import {
  clearForegroundTurnSettledVisible,
  markForegroundTurnSettledVisible,
  protectTransientForCanonicalHandoff,
  releaseTransientCanonicalHandoff,
  setStreamingMessageId,
} from "chat/messages/messageSessionStore";
import { createForegroundTurnStageLog } from "./foregroundTurnStageLog";
import { createSSEParser } from "ai/chat/parseMultilineSSE";
import { performServerProxyFetchWithRetry } from "ai/chat/serverProxyRetry";
import { canonicalizeToolName } from "ai/tools/toolNameAliases";
import { buildForegroundTurnAdmissionFetchInit } from "./foregroundTurnAdmissionFetch";
import { consumeAgentRunStream } from "./streamTurnStreamConsumer";
import type { AgentRuntimeOptions } from "./types";
import {
  DURABLE_WEB_FOREGROUND_TOOL_NAMES,
  shouldUseServerOwnedWebForegroundTurn,
} from "./serverOwnedWebForegroundEligibility";
import { createServerOwnedToolProjection } from "./serverOwnedToolProjection";
import { waitForNewCanonicalAssistant } from "./serverOwnedWebForegroundHandoff";
import { resolveServerOwnedWebEffectiveToolSurface } from "./serverOwnedWebEffectiveToolSurface";
import { resolveTurnToolContext } from "./turnToolContext";
import {
  applyServerOwnedAssistantStreamPayload,
  EMPTY_SERVER_OWNED_ASSISTANT_STREAM,
} from "./serverOwnedAssistantStream";

export type ServerOwnedWebForegroundTurnArgs = {
  agentKey: string;
  agentConfig?: Agent | null;
  /** Raw user text exactly as durably stored in the dialog. */
  userInput: unknown;
  dialogConfig: DialogConfig;
  runtimeOptions?: AgentRuntimeOptions;
  /** Browser-only context belongs in context layers, never in persisted user text. */
  contextBlocks?: string[];
};

type ThunkLike = {
  dispatch: any;
  getState: () => RootState;
};

/**
 * How long a finished transient stays shielded from initMsgs "replace" while
 * waiting for its canonical DB row. Covers the synchronous handoff window
 * (350ms) plus the 60s late reconciler, with margin. The reconciler releases
 * the guard earlier once canonical is confirmed or reconciliation settles.
 */
export const SERVER_OWNED_CANONICAL_HANDOFF_PROTECT_MS = 65_000;

/**
 * Convert the exact post-filter Web model surface into the authoritative
 * server-owned execution surface for this turn. This is intentionally
 * per-turn: a global durable allowlist would let private/default durable tools
 * appear on the server even when browser admission did not expose them.
 */
export function resolveServerOwnedWebAllowedToolNames(
  toolNames: readonly unknown[],
): string[] {
  return Array.from(
    new Set(
      toolNames
        .filter((name): name is string => typeof name === "string")
        .map((name) => canonicalizeToolName(name))
        .filter((name) => DURABLE_WEB_FOREGROUND_TOOL_NAMES.has(name)),
    ),
  );
}

function detectServerOwnedCandidateSurface(): "web" | "non-web" {
  return typeof window !== "undefined" && typeof document !== "undefined"
    ? "web"
    : "non-web";
}

export async function canRunServerOwnedWebForegroundTurn(
  args: ServerOwnedWebForegroundTurnArgs,
  thunk: ThunkLike,
): Promise<{ eligible: boolean; agentConfig?: Agent }> {
  try {
    let state: RootState;
    let currentServer: string | undefined;
    let token: string | undefined;
    try {
      state = thunk.getState();
      currentServer = selectCurrentServer(state);
      const rawToken = selectIdentityToken(state as never);
      token = typeof rawToken === "string" ? rawToken : undefined;
    } catch {
      return { eligible: false };
    }
    if (!currentServer?.trim() || !token?.trim()) return { eligible: false };

    let agentConfig = args.agentConfig ?? undefined;
    if (!agentConfig) {
      try {
        const { readAndWait } = await import("database/dbSlice");
        agentConfig = await thunk.dispatch(readAndWait(args.agentKey)).unwrap();
      } catch {
        return { eligible: false };
      }
    }
    if (!agentConfig) return { eligible: false };

    const turnToolContext = await resolveTurnToolContext({
      agentConfig,
      dialogConfig: args.dialogConfig,
      userInput: args.userInput,
      state,
      dispatch: thunk.dispatch,
      runtimeOptions: args.runtimeOptions,
    });

    const effectiveToolSurface = resolveServerOwnedWebEffectiveToolSurface({
      agentConfig,
      runtimeOptions: args.runtimeOptions,
      state,
      turnToolContext,
    });

    const eligible = shouldUseServerOwnedWebForegroundTurn({
      surface: detectServerOwnedCandidateSurface(),
      agentConfig: agentConfig as any,
      effectiveToolSurface,
      turnToolContext,
      userInput: args.userInput,
      runtimeOptions: args.runtimeOptions,
      currentServer,
      token,
      isDesktopApp: getIsDesktopApp(),
    });
    if (!eligible) {
      return { eligible: false, agentConfig };
    }

    // The caller already passes this candidate config straight into run().
    // Clone it into the admitted runtime config so the exact surface resolved
    // above crosses the admission→execution boundary without re-resolving
    // references/mentions or hiding state in a side channel.
    return {
      eligible: true,
      agentConfig: {
        ...agentConfig,
        tools: resolveServerOwnedWebAllowedToolNames(effectiveToolSurface.names),
      },
    };
  } catch {
    return { eligible: false };
  }
}

/**
 * Run an ordinary same-server Web chat turn on the existing /api/agent/run
 * foreground execution plane. The server owns canonical assistant/tool rows;
 * browser rows below are live-only projections until canonical persistence is
 * visible locally.
 */
export async function runServerOwnedWebForegroundTurn(
  args: ServerOwnedWebForegroundTurnArgs & { agentConfig: Agent },
  thunk: ThunkLike,
): Promise<{ serverOwned: true; aborted?: true; detached?: true }> {
  const state = thunk.getState();
  const currentServer = String(selectCurrentServer(state) ?? "").replace(/\/+$/, "");
  const token = selectIdentityToken(state as never);
  if (!currentServer || !token) {
    throw new Error("Server-owned foreground turn requires an authenticated server");
  }

  const dialogKey = args.dialogConfig.dbKey;
  const dialogId = args.dialogConfig.id ?? (dialogKey ? extractCustomId(dialogKey) : "");
  if (!dialogId || !dialogKey) {
    throw new Error("Server-owned foreground turn requires an existing dialog");
  }

  const userInput = typeof args.userInput === "string" ? args.userInput : "";
  if (!userInput.trim()) {
    throw new Error("Server-owned foreground turn requires text input");
  }

  const initialMessageIds = new Set(
    (selectAllMsgs(thunk.getState() as any, dialogId) as Array<{ id?: string }>)
      .map((message) => message?.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0),
  );

  const userId = selectIdentityUserId(thunk.getState() as never);
  const { key: transientKey, messageId: transientId } = createDialogMessageKeyAndId(dialogId);
  const controller = new AbortController();
  const loopKey = `server-owned:${dialogId}:${transientId}`;
  let assistantStream = EMPTY_SERVER_OWNED_ASSISTANT_STREAM;
  let sawDone = false;
  let clientControllerReleased = false;
  /** Visible 收工（done 帧已消费）。与所有权门相互独立。 */
  let visibleFinalized = false;
  let sawFirstDelta = false;
  let observedExecutionId = "";
  /**
   * Whether the canonical row was visible within the short handoff window.
   * Declared in the turn scope on purpose: the sibling `finally` prints it in
   * the per-turn SUMMARY (declared inside the `try` block it threw a
   * ReferenceError on every turn exit and swallowed the SUMMARY).
   */
  let canonicalVisible = false;
  // t0 for the latency stage log: created during turn setup, immediately before
  // the run request (`run-fetch-start` mark = offset from here).
  const stageLog = createForegroundTurnStageLog({
    turnKey: loopKey,
    // This path's server run identity IS the dialogId; executionId stays in the
    // SUMMARY detail to tell multiple runs of the same dialog apart.
    runId: dialogId,
    dialogKey,
    dialogId,
    base: currentServer,
  });

  const toolProjection = createServerOwnedToolProjection({
    dialogId,
    dispatch: thunk.dispatch,
    messageMetadata: {
      cybotKey: args.agentKey,
      agentKey: args.agentKey,
      userId,
    },
    supportedToolNames: DURABLE_WEB_FOREGROUND_TOOL_NAMES,
    keepReadOnlyUntilCanonical: ["ask_user", "show_interaction"],
  });

  const projectAssistant = () => {
    thunk.dispatch(
      messageStreaming({
        id: transientId,
        dialogId,
        dbKey: transientKey,
        role: "assistant",
        content: assistantStream.text,
        thinkContent: assistantStream.thinking,
        cybotKey: args.agentKey,
        agentKey: args.agentKey,
        userId,
      }),
    );
  };

  const releaseClientController = () => {
    if (clientControllerReleased) return;
    clientControllerReleased = true;
    // Ownership gate release stays exactly where it was: after the short
    // canonical-handoff attempt. Clear the visible-settled flag in the same
    // step, and AFTER the controller is gone, so the projection is already idle
    // and clearing can never flash "正在处理…" back on.
    thunk.dispatch(removeActiveController({ messageId: loopKey, dialogKey }));
    clearForegroundTurnSettledVisible(dialogId);
    stageLog.stage("controller-release");
  };

  /**
   * Visible 收工 on the SSE `done` frame (idempotent). The stream tail — server
   * persistence, billing, stream close — keeps being read to EOF and the
   * send/Stop ownership gate stays held by the still-registered active
   * controller; this only stops the VISIBLE busy projection (cursor + pending
   * row) and shields the finished transient for the canonical handoff. It never
   * releases the next turn and never claims the message is persisted.
   *
   * The transient is shielded BEFORE the cursor stops: initMsgs.fulfilled
   * resolves writeMode="replace" whenever the dialog has no streaming rows, and
   * a lagging DB snapshot would wipe this transient off screen before its
   * canonical row is visible (2026-10-03 flicker). TTL covers the 350ms sync
   * window + the 60s late reconciler with margin; the reconciler releases the
   * guard explicitly when it settles.
   */
  const finalizeVisibleProjectionOnDone = () => {
    if (visibleFinalized) return;
    visibleFinalized = true;
    protectTransientForCanonicalHandoff(
      dialogId,
      transientId,
      SERVER_OWNED_CANONICAL_HANDOFF_PROTECT_MS,
    );
    finishTransientImmediately();
    markForegroundTurnSettledVisible(dialogId);
  };

  const finishTransientImmediately = () => {
    const transient = (selectAllMsgs(thunk.getState() as any, dialogId) as any[])
      .find((message) => message?.id === transientId);
    if (transient) {
      thunk.dispatch(
        setMessages({
          dialogId,
          messages: [{
            ...transient,
            content: assistantStream.text,
            thinkContent: assistantStream.thinking,
            isStreaming: false,
          }],
        }),
      );
    }
    setStreamingMessageId(dialogId, null);
  };

  const removeTransientWhenCanonicalArrives = () => {
    void waitForNewCanonicalAssistant({
      readMessages: () => selectAllMsgs(thunk.getState() as any, dialogId) as any[],
      initialMessageIds,
      transientId,
      // The server persists a new assistant trace segment after every tool
      // boundary. Fingerprint only the final segment here; the live transient
      // intentionally keeps the concatenated presentation until canonical rows
      // replace it.
      expectedText: assistantStream.segmentText,
      expectedThinking: assistantStream.segmentThinking,
      expectedAgentKey: args.agentKey,
      timeoutMs: 60_000,
      pollMs: 100,
    }).then((canonical) => {
      if (!canonical) return;
      toolProjection.cleanup();
      thunk.dispatch(removeTransientMessage({ id: transientId, dialogId }));
    }).catch(() => {
      // Best-effort late reconciliation only. A later full history reload still
      // has enough canonical information to recover without re-running the turn.
    }).finally(() => {
      // Stop shielding the transient from initMsgs replace once reconciliation
      // settled — either the canonical row is in (transient removed above) or
      // the protection TTL is the only remaining backstop against a stuck guard.
      releaseTransientCanonicalHandoff(dialogId, transientId);
    });
  };

  thunk.dispatch(addActiveController({ messageId: loopKey, controller, dialogKey }));
  projectAssistant();

  const allowedToolNames = resolveServerOwnedWebAllowedToolNames(
    Array.isArray(args.agentConfig.tools) ? args.agentConfig.tools : [],
  );
  const body = JSON.stringify({
    agentKey: args.agentKey,
    userInput,
    stream: true,
    persistDialog: true,
    continueDialogId: dialogId,
    runtimeContext: {
      surface: "web",
      host: "browser",
      runtime: "react",
      entrypoint: "chat-dialog-server-owned",
      capabilities: [
        "streaming",
        "dialog-ui",
        "durable-foreground",
        "client-user-prepersisted",
        "durable-tool-cards",
      ],
      // This is the exact post-filter surface produced during admission, not a
      // global durable superset. Server-private defaults and machine tools are
      // injected before this constraint, then intersected back to this turn's
      // admitted names. Direct run() callers are sanitized again above.
      allowedToolNames,
      ...(args.dialogConfig.agentMode === "auto"
        ? { dialogAgentMode: "auto" as const }
        : { dialogAgentMode: "fixed" as const }),
    },
    ...(args.runtimeOptions ? { runtimeOptions: args.runtimeOptions } : {}),
    ...(args.contextBlocks?.length ? { contextBlocks: args.contextBlocks } : {}),
    ...(args.dialogConfig.spaceId ? { spaceId: args.dialogConfig.spaceId } : {}),
  });

  const init = buildForegroundTurnAdmissionFetchInit({
    body,
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      Authorization: `Bearer ${token}`,
    },
    signal: controller.signal,
  });

  stageLog.stage(
    "run-fetch-start",
    `endpoint=${currentServer}/api/agent/run agentKey=${args.agentKey}`,
  );
  try {
    let response: Response;
    try {
      response = await performServerProxyFetchWithRetry({
        execute: () => fetch(`${currentServer}/api/agent/run`, init),
        signal: controller.signal,
        retryNetworkErrors: false,
        logPrefix: "[serverOwnedWebForegroundTurn]",
      });
    } catch (error) {
      if (controller.signal.aborted) return { serverOwned: true, aborted: true };
      console.warn("[chat] server-owned foreground detached before response", {
        dialogId,
        error,
      });
      return { serverOwned: true, detached: true };
    }

    stageLog.stage("headers", `status=${response.status} ok=${response.ok}`);
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(text || `Agent run failed (${response.status})`);
    }
    const reader = response.body?.getReader();
    if (!reader) {
      stageLog.stage("no-stream-body");
      return { serverOwned: true, detached: true };
    }

    const parseSSE = createSSEParser();
    const decoder = new TextDecoder();
    const outcome = await consumeAgentRunStream({
      reader,
      decoder,
      parseChunk: (raw) => parseSSE(raw),
      isAborted: () => controller.signal.aborted,
      signal: controller.signal,
      isDoneEvent: (payload) => payload?.type === "done",
      onAbort: async () => {},
      onPayload: (payload) => {
        if (payload?.type === "dialog") {
          observedExecutionId =
            typeof payload.executionId === "string"
              ? payload.executionId.trim()
              : "";
        }
        if (payload?.type === "error") {
          return { reject: payload.message || "Agent execution failed" };
        }

        toolProjection.handlePayload(payload);

        const nextAssistantStream = applyServerOwnedAssistantStreamPayload(
          assistantStream,
          payload,
        );
        if (nextAssistantStream !== assistantStream) {
          assistantStream = nextAssistantStream;
          projectAssistant();
          if (!sawFirstDelta && payload?.type !== "done") {
            sawFirstDelta = true;
            stageLog.stage(
              "first-delta",
              `payloadType=${payload?.type} executionId=${observedExecutionId}`,
            );
          }
        }
        if (payload?.type === "done" && !visibleFinalized) {
          // Visible 收工 here — the SSE tail (persist + billing + close) is
          // still ahead, so keep reading to EOF for the commit gate.
          stageLog.stage("done-frame", `executionId=${observedExecutionId}`);
          finalizeVisibleProjectionOnDone();
        }
      },
    });

    stageLog.stage(
      "eof",
      outcome.outcome === "streamEnded"
        ? `outcome=streamEnded sawDone=${outcome.sawDone} executionId=${observedExecutionId}`
        : `outcome=${outcome.outcome}`,
    );

    if (outcome.outcome === "aborted") return { serverOwned: true, aborted: true };
    if (outcome.outcome === "rejected") throw new Error(outcome.message);
    if (!outcome.sawDone) return { serverOwned: true, detached: true };

    sawDone = true;

    // Visible 收工 already ran on the `done` frame (idempotent; this is the
    // fallback for a stream that ended without the frame). The active
    // controller stays registered through the canonical-handoff window: it is
    // the send/Stop ownership gate until this turn function settles, so a new
    // turn can never race the previous server-side canonical commit.
    finalizeVisibleProjectionOnDone();

    try {
      // Full dialog key + the run-ownership base. The key keeps this read on the
      // dialog's own record instead of keyless namespace scanning; the base this
      // run wrote to is only the PREFERRED source (read first for the early
      // view) and never an exclusive authority — the full reconcile still
      // merges every configured base.
      stageLog.stage("init-msgs-start", `dialogKey=${dialogKey}`);
      const initMsgsStartedAt = Date.now();
      await thunk.dispatch(
        initMsgs({
          dialogId,
          dialogKey,
          preferredServerOrigin: currentServer,
        }),
      ).unwrap();
      stageLog.stage("init-msgs-end", `ms=${Date.now() - initMsgsStartedAt}`);
      // The answer is already visibly complete. Give local/remote history only a
      // short synchronous opportunity to replace the transient; slow persistence
      // continues in the bounded late reconciler and must not block the next turn.
      canonicalVisible = !!(await waitForNewCanonicalAssistant({
        readMessages: () => selectAllMsgs(thunk.getState() as any, dialogId) as any[],
        initialMessageIds,
        transientId,
        expectedText: assistantStream.segmentText,
        expectedThinking: assistantStream.segmentThinking,
        expectedAgentKey: args.agentKey,
        timeoutMs: 350,
        pollMs: 25,
      }));
    } catch (error) {
      console.warn("[chat] server-owned canonical handoff refresh failed", {
        dialogId,
        error,
      });
    }

    if (canonicalVisible) {
      releaseTransientCanonicalHandoff(dialogId, transientId);
      toolProjection.cleanup();
      thunk.dispatch(removeTransientMessage({ id: transientId, dialogId }));
    } else {
      // Preserve the finished transient as a no-blank fallback, but keep looking
      // for the delayed canonical row. initMsgs remote revalidation merges rows;
      // without this late reconciliation both ids could otherwise remain visible.
      toolProjection.cleanup();
      removeTransientWhenCanonicalArrives();
      console.warn(
        "[chat] server-owned canonical message not visible after done; keeping finished transient until canonical arrives",
        { dialogId, transientId },
      );
    }

    return { serverOwned: true };
  } finally {
    releaseClientController();
    // A turn whose visible projection already settled at `done` keeps its
    // finished transient: the authoritative answer was received, so deleting it
    // on a post-`done` tail error would blank a completed reply.
    if (!sawDone && !visibleFinalized) {
      releaseTransientCanonicalHandoff(dialogId, transientId);
      toolProjection.cleanup();
      thunk.dispatch(removeTransientMessage({ id: transientId, dialogId }));
    }
    // `done` consumed but the stream tail failed / was cancelled: KEEP the
    // completed answer (deleting it would blank a finished reply), while still
    // doing the tool-transient cleanup and the bounded late reconciliation of
    // the normal post-done path. The 65s TTL only expires the
    // canonical-handoff guard; it never clears tool transients nor
    // de-duplicates a late canonical row.
    if (visibleFinalized && !sawDone) {
      toolProjection.cleanup();
      removeTransientWhenCanonicalArrives();
    }
    stageLog.summary(
      controller.signal.aborted
        ? "aborted"
        : sawDone
          ? "done"
          : visibleFinalized
            ? "done-visible-only"
            : "no-done",
      `runId=${dialogId} executionId=${observedExecutionId}` +
        ` canonicalVisible=${canonicalVisible} settledVisible=${visibleFinalized}`,
    );
  }
}
