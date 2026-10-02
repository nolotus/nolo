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
  selectAllMsgs,
  setMessages,
} from "chat/messages/messageSlice";
import { setStreamingMessageId } from "chat/messages/messageSessionStore";
import { createSSEParser } from "ai/chat/parseMultilineSSE";
import { performServerProxyFetchWithRetry } from "ai/chat/serverProxyRetry";
import { buildForegroundTurnAdmissionFetchInit } from "./foregroundTurnAdmissionFetch";
import { consumeAgentRunStream } from "./streamTurnStreamConsumer";
import type { AgentRuntimeOptions } from "./types";
import { shouldUseServerOwnedWebForegroundTurn } from "./serverOwnedWebForegroundEligibility";
import { createServerOwnedAskUserProjection } from "./serverOwnedAskUserProjection";
import { waitForNewCanonicalAssistant } from "./serverOwnedWebForegroundHandoff";

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

function detectServerOwnedCandidateSurface(): "web" | "non-web" {
  // This path is allowed only from a real DOM Web runtime. React Native and TUI
  // must never qualify merely because they have a token/currentServer. Desktop
  // WebViews do have a DOM, but are independently rejected by isDesktopApp.
  return typeof window !== "undefined" && typeof document !== "undefined"
    ? "web"
    : "non-web";
}

export async function canRunServerOwnedWebForegroundTurn(
  args: ServerOwnedWebForegroundTurnArgs,
  thunk: ThunkLike,
): Promise<{ eligible: boolean; agentConfig?: Agent }> {
  // 准入试探是**发送路径上的前置检查**，必须 fail-safe：凭据缺失、状态不完整或判定抛错
  // 都只能静默降级回客户端路径，绝不该把「发送」本身打断（2026-10-02 review 指出的缺陷：
  // 原实现先派发 readAndWait 再校凭据，且未保护会抛的选择器）。
  try {
    let currentServer: string | undefined;
    let token: string | undefined;
    try {
      const state = thunk.getState();
      currentServer = selectCurrentServer(state);
      token = selectIdentityToken(state as never);
    } catch {
      // 部分初始化上下文（微前端 / 单测 / 早期挂载）里 settings 可能还没挂载，选择器会抛。
      return { eligible: false };
    }
    // 凭据优先：没有服务器或令牌时不必去读 agent config（也避免多一次 DB 派发）。
    if (!currentServer?.trim() || !token?.trim()) return { eligible: false };

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

    return {
      eligible: shouldUseServerOwnedWebForegroundTurn({
        surface: detectServerOwnedCandidateSurface(),
        agentConfig: agentConfig as any,
        userInput: args.userInput,
        runtimeOptions: args.runtimeOptions,
        currentServer,
        token,
        isDesktopApp: getIsDesktopApp(),
      }),
      agentConfig,
    };
  } catch {
    return { eligible: false };
  }
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

  // Snapshot the rows that pre-date this turn. The server persists canonical
  // assistant/tool rows under its own ids, so a later new assistant id is the
  // handoff proof. This avoids treating initMsgs' local-first early return as
  // proof that the canonical server row is already visible.
  const initialMessageIds = new Set(
    (selectAllMsgs(thunk.getState() as any, dialogId) as Array<{ id?: string }>)
      .map((message) => message?.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0),
  );

  const userId = selectIdentityUserId(thunk.getState() as never);
  const { key: transientKey, messageId: transientId } =
    createDialogMessageKeyAndId(dialogId);
  const controller = new AbortController();
  const loopKey = `server-owned:${dialogId}:${transientId}`;
  let accumulated = "";
  let sawDone = false;

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

    sawDone = true;

    // Do not delete the visible transient before canonical history is actually
    // present. initMsgs is local-first: unwrap() may resolve from local rows while
    // remote revalidation is still running. Wait for that revalidation to project
    // this turn's canonical assistant, then remove the transient. This turns the
    // old delete -> blank -> reload sequence into visible -> canonical -> delete.
    let canonicalVisible = false;
    try {
      await thunk.dispatch(initMsgs({ dialogId })).unwrap();
      canonicalVisible = !!(await waitForNewCanonicalAssistant({
        readMessages: () =>
          selectAllMsgs(thunk.getState() as any, dialogId) as any[],
        initialMessageIds,
        transientId,
        expectedText: accumulated,
      }));
    } catch (error) {
      console.warn("[chat] server-owned canonical handoff refresh failed", {
        dialogId,
        error,
      });
    }

    if (canonicalVisible) {
      askUserProjection.cleanup();
      thunk.dispatch(removeTransientMessage({ id: transientId, dialogId }));
    } else {
      // The server has already declared done, so deleting the only visible answer
      // would recreate the reported bug. Preserve the assistant projection as a
      // terminal UI fallback. Transient ask_user cards are safe to discard here:
      // without canonical history they must not remain interactive or appear live.
      askUserProjection.cleanup();
      const transient = (selectAllMsgs(thunk.getState() as any, dialogId) as any[])
        .find((message) => message?.id === transientId);
      if (transient) {
        thunk.dispatch(
          setMessages({
            dialogId,
            messages: [{ ...transient, isStreaming: false }],
          }),
        );
      }
      setStreamingMessageId(dialogId, null);
      console.warn(
        "[chat] server-owned canonical message not visible after done; keeping transient projection",
        { dialogId, transientId },
      );
    }

    return { serverOwned: true };
  } finally {
    thunk.dispatch(
      removeActiveController({
        messageId: loopKey,
        dialogKey,
      }),
    );

    // Before a server terminal frame the projection is non-authoritative and must
    // be cleared so recovery can take over. After `done`, handoff logic above owns
    // cleanup: unconditional removal here used to erase a complete visible answer
    // before canonical history was available.
    if (!sawDone) {
      askUserProjection.cleanup();
      thunk.dispatch(removeTransientMessage({ id: transientId, dialogId }));
    }
  }
}
