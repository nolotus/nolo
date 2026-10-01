import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

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
import { initMsgs, selectAllMsgs } from "chat/messages/messageSlice";
import { useToken } from "identity";
import {
  deriveRecoveryDisplayPhase,
  FOREGROUND_ATTACH_HINT_DELAY_MS,
  type RecoveryDisplayPhase,
} from "./foregroundTurnRecoveryDisplay";
import { observeForegroundTurnRecovery } from "./foregroundTurnRecoveryObserver";

const RECOVERY_DISPLAY_DEFAULTS: Record<RecoveryDisplayPhase, string> = {
  attaching: "正在接回回复…",
  running: "服务器仍在生成…",
  interrupted: "连接中断，回复状态未知。",
};

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
 * - idle dialogs do not keep a permanent recovery SSE connection open;
 * - a transport drop is not an execution failure and must not be rendered as
 *   one; the reply-area hint distinguishes attaching / running / interrupted.
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
  const messages = useAppSelector((state) => selectAllMsgs(state, dialogId));

  // Display-only local state for the reply-area hint. The durable store keeps
  // its single `recoveredForegroundTurn` fact; everything here is derived
  // per-attach and cleared by cleanup / terminal / idle discovery.
  const [attachHintElapsed, setAttachHintElapsed] = useState(false);
  const [sawForegroundLifecycle, setSawForegroundLifecycle] = useState(false);
  const [streamDropped, setStreamDropped] = useState(false);
  const [attachSettled, setAttachSettled] = useState(false);
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const replyMaybePending = lastMessage?.role === "user";

  useEffect(() => {
    setAttachHintElapsed(false);
    setSawForegroundLifecycle(false);
    setStreamDropped(false);
    setAttachSettled(false);

    if (!dialogId || !token || !server || hasLocalForegroundOwner) {
      setRecoveredForegroundTurn({
        dialogKey: runtimeDialogKey,
        status: null,
      });
      return;
    }

    const controller = new AbortController();
    let settled = false;
    const attachHintTimer = setTimeout(
      () => setAttachHintElapsed(true),
      FOREGROUND_ATTACH_HINT_DELAY_MS,
    );

    const refreshPersistedMessages = async () => {
      if (settled) return;
      settled = true;
      setAttachSettled(true);
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

    void observeForegroundTurnRecovery({
      controller,
      origin: String(server),
      dialogId,
      token,
      callbacks: {
        onForegroundEvent: (event) => observeForegroundExecutionPayload(event),
        onLifecycle: () => setSawForegroundLifecycle(true),
        onRunning: () =>
          setRecoveredForegroundTurn({
            dialogKey: runtimeDialogKey,
            status: "running",
          }),
        onTerminal: refreshPersistedMessages,
        onIdle: () => {
          setAttachSettled(true);
          setRecoveredForegroundTurn({
            dialogKey: runtimeDialogKey,
            status: null,
          });
          clearForegroundExecutionClientState(dialogId);
        },
        onDropped: () => setStreamDropped(true),
      },
    });

    return () => {
      clearTimeout(attachHintTimer);
      controller.abort();
      setRecoveredForegroundTurn({
        dialogKey: runtimeDialogKey,
        status: null,
      });
      setAttachHintElapsed(false);
      setSawForegroundLifecycle(false);
      setStreamDropped(false);
      setAttachSettled(false);
      // Do NOT clear the execution-id cache here. This cleanup also runs when a
      // recovered observer hands ownership back to a local live controller;
      // clearing here could erase the live stream's freshly observed identity.
      // Terminal events and idle discovery own cache cleanup instead.
    };
  }, [
    dialogId,
    dispatch,
    hasLocalForegroundOwner,
    runtimeDialogKey,
    server,
    token,
  ]);

  const displayPhase = deriveRecoveryDisplayPhase({
    hasLocalForegroundOwner,
    recoveredForegroundTurn,
    sawForegroundLifecycle,
    streamDropped,
    attachSettled,
    attachHintElapsed,
    replyMaybePending,
  });

  if (!displayPhase) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="foreground-turn-recovery"
      data-phase={displayPhase}
      style={{
        padding: "6px 12px",
        fontSize: 12,
        opacity: 0.72,
        textAlign: "center",
      }}
    >
      {t(`foregroundTurnRecovery.${displayPhase}`, {
        defaultValue: RECOVERY_DISPLAY_DEFAULTS[displayPhase],
      })}
    </div>
  );
};

export default ForegroundTurnRecovery;
