import type { RootState } from "app/store";
import type { Agent, DialogConfig } from "app/types";
import { selectCurrentServer } from "app/settings/settingSlice";
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
} from "chat/messages/messageSlice";
import { createSSEParser } from "ai/chat/parseMultilineSSE";
import { performServerProxyFetchWithRetry } from "ai/chat/serverProxyRetry";
import { buildForegroundTurnAdmissionFetchInit } from "./foregroundTurnAdmissionFetch";
import { consumeAgentRunStream } from "./streamTurnStreamConsumer";
import type { AgentRuntimeOptions } from "./types";
import { shouldUseServerOwnedWebForegroundTurn } from "./serverOwnedWebForegroundEligibility";
import { createServerOwnedAskUserProjection } from "./serverOwnedAskUserProjection";

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

export async function canRunServerOwnedWebForegroundTurn(
  args: ServerOwnedWebForegroundTurnArgs,
  thunk: ThunkLike,
): Promise<{ eligible: boolean; agentConfig?: Agent }> {
  let agentConfig = args.agentConfig ?? undefined;
  if (!agentConfig) {
    try {
      const { readAndWait } = await import("database/dbSlice");
      agentConfig = await thunk.dispatch(readAndWait(args.agentKey)).unwrap();
    } catch {
      // If the config is not locally resolvable, keep the established client path.
      return { eligible: false };
    }
  }

  const state = thunk.getState();
  const currentServer = selectCurrentServer(state);
  const token = selectIdentityToken(state as never);
  return {
    eligible: shouldUseServerOwnedWebForegroundTurn({
      agentConfig: agentConfig as any,
      userInput: args.userInput,
      runtimeOptions: args.runtimeOptions,
      currentServer,
      token,
      isDesktopApp: getIsDesktopApp(),
    }),
    agentConfig,
  };
}

/**
 * Run an ordinary same-server Web chat turn on the existing /api/agent/run
 * foreground execution plane.
 *
 * The caller has already durably persisted the user row. The server continuation
 * path detects that matching tail user and does not duplicate it; assistant/tool
 * rows and billing are authoritative on the server. Browser disconnect is
 * therefore a detach, not a turn failure.
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
  const dialogId =
    args.dialogConfig.id ?? (dialogKey ? extractCustomId(dialogKey) : "");
  if (!dialogId || !dialogKey) {
    throw new Error("Server-owned foreground turn requires an existing dialog");
  }

  const userInput = typeof args.userInput === "string" ? args.userInput : "";
  if (!userInput.trim()) {
    throw new Error("Server-owned foreground turn requires text input");
  }

  const userId = selectIdentityUserId(thunk.getState() as never);
  const { key: transientKey, messageId: transientId } =
    createDialogMessageKeyAndId(dialogId);
  const controller = new AbortController();
  const loopKey = `server-owned:${dialogId}:${transientId}`;
  let accumulated = "";

  const askUserProjection = createServerOwnedAskUserProjection({
    dialogId,
    dispatch: thunk.dispatch,
    messageMetadata: {
      cybotKey: args.agentKey,
      agentKey: args.agentKey,
      userId,
    },
  });

  thunk.dispatch(
    addActiveController({
      messageId: loopKey,
      controller,
      dialogKey,
    }),
  );
  thunk.dispatch(
    messageStreaming({
      id: transientId,
      dialogId,
      dbKey: transientKey,
      role: "assistant",
      content: "",
      cybotKey: args.agentKey,
      agentKey: args.agentKey,
      userId,
    }),
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
        "ask-user-tool-card",
      ],
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

  try {
    let response: Response;
    try {
      response = await performServerProxyFetchWithRetry({
        execute: () => fetch(`${currentServer}/api/agent/run`, init),
        signal: controller.signal,
        // This is an at-most-once foreground admission. A network error is
        // ambiguous: the server may already own the execution, so never POST it again.
        retryNetworkErrors: false,
        logPrefix: "[serverOwnedWebForegroundTurn]",
      });
    } catch (error) {
      if (controller.signal.aborted) return { serverOwned: true, aborted: true };
      // Ambiguous admission/transport loss: do not synthesize an assistant error
      // and do not retry. Once the local owner is released, ForegroundTurnRecovery
      // can discover the server execution; if none exists, the incomplete-turn
      // stopgap remains the user-visible fallback.
      console.warn("[chat] server-owned foreground detached before response", {
        dialogId,
        error,
      });
      return { serverOwned: true, detached: true };
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(text || `Agent run failed (${response.status})`);
    }
    const reader = response.body?.getReader();
    if (!reader) {
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
      onAbort: async () => {
        // Exact server Stop is sent by the shared UI stop hook. This local abort
        // only releases the browser reader and transient projection.
      },
      onPayload: (payload) => {
        if (payload?.type === "error") {
          // Once headers/foreground identity exist, an error event is an
          // authoritative server terminal rather than a client transport error.
          return { reject: payload.message || "Agent execution failed" };
        }

        // Project ask_user while the server executes, but keep that transient row
        // read-only. The durable row loaded after `done` is the only interactive
        // copy, avoiding persistence races on a browser-generated dbKey.
        askUserProjection.handlePayload(payload);

        if (payload?.type === "text" && typeof payload.content === "string") {
          accumulated += payload.content;
          thunk.dispatch(
            messageStreaming({
              id: transientId,
              dialogId,
              dbKey: transientKey,
              role: "assistant",
              content: accumulated,
              cybotKey: args.agentKey,
              agentKey: args.agentKey,
              userId,
            }),
          );
        }
      },
    });

    if (outcome.outcome === "aborted") {
      return { serverOwned: true, aborted: true };
    }
    if (outcome.outcome === "rejected") {
      throw new Error(outcome.message);
    }
    if (!outcome.sawDone) {
      // Transport ended without a terminal frame. The execution may still be
      // alive in the server shadow, so treat this as detach rather than failure.
      return { serverOwned: true, detached: true };
    }

    // Server persistence is authoritative. Drop every transient projection and
    // reload the durable trace in one go: cleanup → remove → initMsgs is
    // deliberate, because loading canonical rows first would show two cards at
    // once (transient + canonical) for one round trip. A sub-second gap is the
    // lesser artifact; the finally block below keeps the cleanup idempotent.
    askUserProjection.cleanup();
    thunk.dispatch(removeTransientMessage({ id: transientId, dialogId }));
    await thunk.dispatch(initMsgs({ dialogId })).unwrap();
    return { serverOwned: true };
  } finally {
    thunk.dispatch(
      removeActiveController({
        messageId: loopKey,
        dialogKey,
      }),
    );
    askUserProjection.cleanup();
    // The projection is never authoritative. Success reloads canonical server
    // rows above; abort/detach/non-2xx must not leave an empty or stale assistant
    // row behind while recovery or the incomplete-turn fallback takes over.
    thunk.dispatch(removeTransientMessage({ id: transientId, dialogId }));
  }
}
