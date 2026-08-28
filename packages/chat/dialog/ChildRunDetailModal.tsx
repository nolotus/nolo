import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ClientAgentThread } from "ai/agent/web/agentDisplayUtils";
import { useToken } from "identity";
import { selectCurrentServer } from "app/settings/settingSlice";
import { useAppSelector } from "app/store";
import { isAbortError } from "core/abortError";
import { Dialog } from "render/web/ui/modal/Dialog";
import {
  buildDialogReadUrl,
  formatChildRunEvidenceLine,
  formatChildRunStatusLabel,
  parseDialogReadResponse,
  resolveAppendDialogKey,
  resolveChildDialogId,
  resolveChildDialogKey,
  resolveChildRunTitle,
  type ChildRunDetailMessage,
  type ChildRunStatusLabels,
} from "./childRunObserverState";
import { AppendInstructionControl } from "./AppendInstructionControl";
import "./ChildRunObserverPanel.css";

type ChildRunDetailModalProps = {
  isOpen: boolean;
  thread: ClientAgentThread | null;
  onClose: () => void;
  onThreadUpdated?: () => void;
};

type DetailLoadState = "idle" | "loading" | "ready" | "error";

/**
 * Read-only child dialog surface. Loads via /api/dialog-read only —
 * does not touch global current-dialog Redux state.
 */
export const ChildRunDetailModal: React.FC<ChildRunDetailModalProps> = ({
  isOpen,
  thread,
  onClose,
  onThreadUpdated,
}) => {
  const { t } = useTranslation("chat");
  const token = useToken();
  const server = useAppSelector(selectCurrentServer);

  const statusLabels = useMemo<ChildRunStatusLabels>(
    () => ({
      pending: t("childRunObserver.statusPending"),
      running: t("childRunObserver.statusRunning"),
      done: t("childRunObserver.statusDone"),
      failed: t("childRunObserver.statusFailed"),
      cancelled: t("childRunObserver.statusCancelled"),
      unknown: t("childRunObserver.statusUnknown"),
    }),
    [t],
  );
  const untitledLabel = t("childRunObserver.defaultTitle");

  const [loadState, setLoadState] = useState<DetailLoadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dialogTitle, setDialogTitle] = useState<string | null>(null);
  const [dialogStatus, setDialogStatus] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChildRunDetailMessage[]>([]);

  const threadId = thread?.threadId ?? null;

  useEffect(() => {
    if (!isOpen || !thread || !token) {
      return;
    }

    const dialogId = resolveChildDialogId(thread);
    if (!dialogId) {
      setLoadState("error");
      setErrorMessage(t("childRunObserver.missingDialogId"));
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    setLoadState("loading");
    setErrorMessage(null);
    setMessages([]);
    setDialogTitle(null);
    setDialogStatus(thread.status ?? null);

    void (async () => {
      try {
        const dialogKey = resolveChildDialogKey(thread);
        const response = await fetch(buildDialogReadUrl(String(server ?? "")), {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            dialogId,
            ...(dialogKey ? { dialogKey } : {}),
            limit: 40,
          }),
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => null);
        if (cancelled) return;

        const parsed = parseDialogReadResponse(payload);
        if (!response.ok || !parsed.ok) {
          setLoadState("error");
          setErrorMessage(
            parsed.ok === false
              ? parsed.error
              : `HTTP ${response.status}`,
          );
          return;
        }

        setDialogTitle(parsed.title);
        setDialogStatus(parsed.status ?? thread.status ?? null);
        setMessages(parsed.messages);
        setLoadState("ready");
      } catch (error) {
        if (cancelled) return;
        if (isAbortError(error)) return;
        setLoadState("error");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : t("childRunObserver.detailLoadFailed"),
        );
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [isOpen, server, t, thread, threadId, token]);

  if (!thread) return null;

  const fallbackTitle = resolveChildRunTitle(thread, untitledLabel);
  const title = dialogTitle ?? fallbackTitle;
  const statusLabel = formatChildRunStatusLabel(
    dialogStatus ?? thread.status,
    statusLabels,
  );
  const evidenceLine = formatChildRunEvidenceLine(
    thread.runtimeEvidence,
    dialogStatus ?? thread.status,
    statusLabels,
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="large"
      showClose
      bodyClassName="ChildRunDetailModal__body"
    >
      <div className="ChildRunDetailModal__meta">
        <span>
          {t("childRunObserver.detailStatus")} <strong>{statusLabel}</strong>
        </span>
        <span>
          {t("childRunObserver.detailAgent")} <strong>{thread.primaryAgentKey}</strong>
        </span>
        {thread.threadId ? (
          <span>
            {t("childRunObserver.detailThread")} <strong>{thread.threadId}</strong>
          </span>
        ) : null}
      </div>

      <div className="ChildRunDetailModal__evidence" role="status">
        {evidenceLine}
      </div>

      {loadState === "loading" ? (
        <div className="ChildRunDetailModal__state" role="status" aria-live="polite">
          {t("childRunObserver.detailLoading")}
        </div>
      ) : null}

      {loadState === "error" ? (
        <div
          className="ChildRunDetailModal__state ChildRunDetailModal__state--error"
          role="alert"
        >
          {errorMessage || t("childRunObserver.detailLoadFailed")}
        </div>
      ) : null}

      {loadState === "ready" && messages.length === 0 ? (
        <div className="ChildRunDetailModal__state" role="status">
          {t("childRunObserver.detailEmpty")}
        </div>
      ) : null}

      {messages.length > 0 ? (
        <div
          className="ChildRunDetailModal__messages"
          aria-label={t("childRunObserver.messagesAriaLabel")}
        >
          {messages.map((message) => (
            <article key={message.id} className="ChildRunDetailModal__message">
              <div className="ChildRunDetailModal__messageRole">
                {message.role || "message"}
              </div>
              <div
                className={
                  message.content
                    ? "ChildRunDetailModal__messageBody"
                    : "ChildRunDetailModal__messageBody ChildRunDetailModal__messageBody--empty"
                }
              >
                {message.content || t("childRunObserver.emptyContent")}
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <div className="ChildRunDetailModal__footer">
        <AppendInstructionControl
          dialogKey={resolveAppendDialogKey(thread)}
          status={dialogStatus ?? thread.status}
          queued={thread.queued}
          className="ChildRunDetailModal__append"
          onSuccess={(result) => {
            if (result.status) {
              setDialogStatus(result.status);
            } else if (result.mode === "continue") {
              setDialogStatus("running");
            }
            onThreadUpdated?.();
          }}
        />
      </div>
    </Dialog>
  );
};

export default ChildRunDetailModal;
