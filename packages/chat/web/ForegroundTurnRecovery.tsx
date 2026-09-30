import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { createSSEParser } from "ai/chat/parseMultilineSSE";
import {
  clearForegroundExecutionClientState,
  observeForegroundExecutionPayload,
} from "ai/agent/foregroundExecutionClientState";
import { selectCurrentServer } from "app/settings/settingSlice";
import { useAppDispatch, useAppSelector } from "app/store";
import {
  setRecoveredForegroundTurn,
  useActiveControllers,
  useRecoveredForegroundTurn,
} from "chat/dialog/dialogSlice";
import { useCurrentDialogConfig } from "chat/dialog/useCurrentDialogConfig";
import { initMsgs } from "chat/messages/messageSlice";
import { useToken } from "identity";

const FOREGROUND_STATUS_EVENT = "foreground_turn_status";
const FOREGROUND_TERMINAL_EVENT = "foreground_turn_terminal";
const FOREGROUND_DISCOVERY_TIMEOUT_MS = 1_500;

/**
 * Recovery observer for a server-owned current-dialog turn.
 *
 * Normal online typing still uses the original foreground response stream.
 * This observer stays dormant while this tab owns a local controller. After
 * refresh/tab reopen that controller is gone, so we attach to the durable
 * dialog event channel instead.
 *
 * P0/P1 recovery contract:
 * - never re-POST the user turn;
 * - show that the detached turn is still alive;
 * - retain the server executionId so Stop targets this exact turn;
 * - when it reaches a terminal event, reload persisted dialog messages;
 * - idle dialogs do not keep a permanent recovery SSE connection open.
 */
export const ForegroundTurnRecovery: React.FC<{ dialogId: string }> = ({
  dialogId,
}) => {
  const { t } = useTranslation("chat");
  const dispatch = useAppDispatch();
  const token = useToken();
  const server = useAppSelector(selectCurrentServer);
  const dialogConfig = useCurrentDialogConfig();
  const runtimeDialogKey = dialogConfig?.dbKey ?? null;
  const activeControllers = useActiveControllers(runtimeDialogKey);
  const recoveredForegroundTurn = useRecoveredForegroundTurn(runtimeDialogKey);
  const hasLocalForegroundOwner = Object.keys(activeControllers).length > 0;

  useEffect(() => {
    if (!dialogId || !token || !server || hasLocalForegroundOwner) {
      setRecoveredForegroundTurn({
        dialogKey: runtimeDialogKey,
        status: null,
      });
      return;
    }

    const controller = new AbortController();
    const parseSSE = createSSEParser();
    let settled = false;
    let sawForegroundLifecycle = false;

    const discoveryTimer = setTimeout(() => {
      if (!sawForegroundLifecycle && !settled) {
        setRecoveredForegroundTurn({
          dialogKey: runtimeDialogKey,
          status: null,
        });
        clearForegroundExecutionClientState(dialogId);
        controller.abort("foreground-recovery-idle");
      }
    }, FOREGROUND_DISCOVERY_TIMEOUT_MS);

    const refreshPersistedMessages = async () => {
      if (settled) return;
      settled = true;
      setRecoveredForegroundTurn({
        dialogKey: runtimeDialogKey,
        status: null,
      });
      try {
        await dispatch(initMsgs({ dialogId })).unwrap();
      } catch {
        // The normal dialog bootstrap/error surface remains authoritative.
      }
    };

    const observe = async () => {
      try {
        const origin = String(server).replace(/\/+$/, "");
        const response = await fetch(
          `${origin}/api/events/dialog-${encodeURIComponent(dialogId)}`,
          {
            method: "GET",
            headers: {
              Accept: "text/event-stream",
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          },
        );
        if (!response.ok || !response.body) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            for (const event of parseSSE(chunk)) {
              if (!event || typeof event !== "object") continue;

              // Live and recovery streams feed one execution-id cache. This
              // keeps a recovered Stop scoped to the turn the user actually
              // observed without making the cache execution authority.
              observeForegroundExecutionPayload(event);

              const type = typeof event.type === "string" ? event.type : "";
              if (type === FOREGROUND_TERMINAL_EVENT) {
                sawForegroundLifecycle = true;
                clearTimeout(discoveryTimer);
                await refreshPersistedMessages();
                return;
              }
              if (
                type === FOREGROUND_STATUS_EVENT &&
                event.status === "running"
              ) {
                sawForegroundLifecycle = true;
                clearTimeout(discoveryTimer);
                setRecoveredForegroundTurn({
                  dialogKey: runtimeDialogKey,
                  status: "running",
                });
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.warn("[chat] foreground turn recovery observer disconnected", {
          dialogId,
          error,
        });
      }
    };

    void observe();
    return () => {
      clearTimeout(discoveryTimer);
      controller.abort();
      setRecoveredForegroundTurn({
        dialogKey: runtimeDialogKey,
        status: null,
      });
      // Do NOT clear the execution-id cache here. This cleanup also runs when a
      // recovered observer hands ownership back to a local live controller;
      // clearing here could erase the live stream's freshly observed identity.
      // Terminal events and idle discovery own cache cleanup instead.
    };
  }, [dialogId, dispatch, hasLocalForegroundOwner, runtimeDialogKey, server, token]);

  if (recoveredForegroundTurn !== "running") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        padding: "6px 12px",
        fontSize: 12,
        opacity: 0.72,
        textAlign: "center",
      }}
    >
      {t("foregroundTurnRecovery.running", {
        defaultValue: "AI is still running…",
      })}
    </div>
  );
};

export default ForegroundTurnRecovery;
