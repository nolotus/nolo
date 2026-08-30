import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LuActivity,
  LuChevronLeft,
  LuChevronRight,
  LuRefreshCw,
} from "react-icons/lu";
import type { ClientAgentThread } from "ai/agent/web/agentDisplayUtils";
import { useToken } from "identity";
import { selectCurrentServer } from "app/settings/settingSlice";
import { useAppSelector } from "app/store";
import { asOptionalTrimmedString } from "core/optionalString";
import { ChildRunDetailModal } from "./ChildRunDetailModal";
import {
  buildChildThreadsQueryUrl,
  CHILD_RUN_ACTIVE_POLL_MS,
  formatChildRunEvidenceLine,
  formatChildRunStatusLabel,
  parseChildThreadsResponse,
  resolveChildRunLoadState,
  resolveChildRunTitle,
  shouldPollChildRuns,
  type ChildRunStatusLabels,
} from "./childRunObserverState";
import * as stylex from "@stylexjs/stylex";
import { croStyles } from "./childRunObserverStyles";
import "./dialogStylexEscapeHatch.css";

export type ChildRunObserverPanelProps = {
  /** Parent/root dialog id used as parentThreadId filter. */
  parentThreadId: string;
};

export const ChildRunObserverPanel: React.FC<ChildRunObserverPanelProps> = ({
  parentThreadId,
}) => {
  const { t } = useTranslation("chat");
  const token = useToken();
  const server = useAppSelector(selectCurrentServer);
  const parentId = asOptionalTrimmedString(parentThreadId) ?? "";

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

  const [threads, setThreads] = useState<ClientAgentThread[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<ClientAgentThread | null>(
    null,
  );
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  // Never default-open a full rail; user expands when they care, collapses anytime.
  const [isExpanded, setIsExpanded] = useState(false);

  const inflightRef = useRef(0);
  const threadsRef = useRef<ClientAgentThread[]>([]);
  useEffect(() => {
    threadsRef.current = threads;
  }, [threads]);

  const loadState = useMemo(
    () =>
      resolveChildRunLoadState({
        isLoading,
        errorMessage,
        threads,
        hasLoadedOnce,
      }),
    [errorMessage, hasLoadedOnce, isLoading, threads],
  );

  const fetchChildRuns = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!parentId || !token) return;

      const requestId = ++inflightRef.current;
      if (!opts?.silent) {
        setIsLoading(true);
      }

      try {
        const url = buildChildThreadsQueryUrl({
          serverOrigin: String(server ?? ""),
          parentThreadId: parentId,
        });
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await response.json().catch(() => null);
        if (requestId !== inflightRef.current) return;

        if (!response.ok) {
          const parsed = parseChildThreadsResponse(payload, parentId);
          setErrorMessage(
            parsed.ok === false
              ? parsed.error
              : `HTTP ${response.status}`,
          );
          setHasLoadedOnce(true);
          return;
        }

        const parsed = parseChildThreadsResponse(payload, parentId);
        if (!parsed.ok) {
          setErrorMessage(parsed.error);
          setHasLoadedOnce(true);
          return;
        }

        setThreads(parsed.threads);
        setErrorMessage(null);
        setHasLoadedOnce(true);
      } catch (error) {
        if (requestId !== inflightRef.current) return;
        setErrorMessage(
          error instanceof Error
            ? error.message
            : t("childRunObserver.loadFailed"),
        );
        setHasLoadedOnce(true);
      } finally {
        if (requestId === inflightRef.current) {
          setIsLoading(false);
        }
      }
    },
    [parentId, server, t, token],
  );

  // Initial load + parent change.
  useEffect(() => {
    setThreads([]);
    setHasLoadedOnce(false);
    setErrorMessage(null);
    setSelectedThread(null);
    setIsDetailOpen(false);
    setIsExpanded(false);
    void fetchChildRuns();
  }, [fetchChildRuns]);

  // Light refresh while children are active; visibility-triggered refresh.
  useEffect(() => {
    if (!parentId || !token) return;

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void fetchChildRuns({ silent: true });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    let intervalId: ReturnType<typeof setInterval> | null = null;
    if (shouldPollChildRuns(threads)) {
      intervalId = setInterval(() => {
        if (document.visibilityState === "hidden") return;
        if (!shouldPollChildRuns(threadsRef.current)) return;
        void fetchChildRuns({ silent: true });
      }, CHILD_RUN_ACTIVE_POLL_MS);
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (intervalId) clearInterval(intervalId);
    };
  }, [fetchChildRuns, parentId, threads, token]);

  const openChild = (thread: ClientAgentThread) => {
    setSelectedThread(thread);
    setIsDetailOpen(true);
  };

  const closeChild = () => {
    setIsDetailOpen(false);
  };

  if (!parentId || !token) {
    return null;
  }

  // Empty dialogs: no chrome at all. With runs (or load error): compact rail by
  // default; expanded list is optional and always collapsible.
  const shouldShowChrome = threads.length > 0 || loadState === "error";
  const detailModal = (
    <ChildRunDetailModal
      isOpen={isDetailOpen}
      thread={selectedThread}
      onClose={closeChild}
      onThreadUpdated={() => {
        void fetchChildRuns({ silent: true });
      }}
    />
  );

  if (!shouldShowChrome) {
    return detailModal;
  }

  if (!isExpanded) {
    return (
      <>
        <button
          type="button"
          data-hook="dialog-esc-cro-collapsed-rail"
          {...stylex.props(croStyles.collapsedRail)}
          onClick={() => setIsExpanded(true)}
          aria-expanded={false}
          aria-label={t("childRunObserver.expandAriaLabel")}
          title={t("childRunObserver.expandTitle")}
        >
          <LuActivity size={14} aria-hidden="true" />
          <span {...stylex.props(croStyles.collapsedLabel)}>
            {t("childRunObserver.title")}
          </span>
          {threads.length > 0 ? (
            <span {...stylex.props(croStyles.collapsedCount)}>
              {threads.length}
            </span>
          ) : null}
          <LuChevronLeft size={14} aria-hidden="true" />
        </button>
        {detailModal}
      </>
    );
  }

  return (
    <>
      <aside
        {...stylex.props(croStyles.panel)}
        aria-label={t("childRunObserver.panelAriaLabel")}
      >
        <div {...stylex.props(croStyles.header)}>
          <div {...stylex.props(croStyles.titleWrap)}>
            <div {...stylex.props(croStyles.title)}>
              <LuActivity size={14} aria-hidden="true" />
              <span>{t("childRunObserver.title")}</span>
            </div>
            <div {...stylex.props(croStyles.subtitle)}>
              {hasLoadedOnce
                ? t("childRunObserver.subtitleCount", { count: threads.length })
                : t("childRunObserver.subtitleLoading")}
            </div>
          </div>
          <div {...stylex.props(croStyles.headerActions)}>
            <button
              type="button"
              data-hook="dialog-esc-cro-icon-button"
              {...stylex.props(croStyles.iconButton)}
              onClick={() => void fetchChildRuns()}
              disabled={isLoading}
              aria-label={t("childRunObserver.refreshAriaLabel")}
              title={t("childRunObserver.refreshTitle")}
            >
              <LuRefreshCw size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              data-hook="dialog-esc-cro-icon-button"
              {...stylex.props(croStyles.iconButton)}
              onClick={() => setIsExpanded(false)}
              aria-expanded={true}
              aria-label={t("childRunObserver.collapseAriaLabel")}
              title={t("childRunObserver.collapseTitle")}
            >
              <LuChevronRight size={14} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div {...stylex.props(croStyles.body)}>
          {loadState === "loading" ? (
            <div
              {...stylex.props(croStyles.state)}
              role="status"
              aria-live="polite"
            >
              {t("childRunObserver.loading")}
            </div>
          ) : null}

          {loadState === "error" ? (
            <div
              data-hook="dialog-esc-cro-state-error"
              {...stylex.props(croStyles.state)}
              role="alert"
            >
              <div>{errorMessage || t("childRunObserver.loadFailed")}</div>
              <button
                type="button"
                data-hook="dialog-esc-cro-retry"
                {...stylex.props(croStyles.retry)}
                onClick={() => void fetchChildRuns()}
              >
                {t("childRunObserver.retry")}
              </button>
            </div>
          ) : null}

          {loadState === "empty" ? (
            <div {...stylex.props(croStyles.state)} role="status">
              {t("childRunObserver.empty")}
            </div>
          ) : null}

          {loadState === "ready" || (threads.length > 0 && loadState !== "loading") ? (
            <ul {...stylex.props(croStyles.list)}>
              {threads.map((thread) => {
                const status = thread.status;
                // 原变体类 `__status--${status}` 仅以下 5 个有 CSS 规则，
                // 其余状态（unknown 等）无规则，退回基础样式。
                const statusVariant =
                  status === "running"
                    ? croStyles.statusRunning
                    : status === "pending"
                    ? croStyles.statusPending
                    : status === "done"
                    ? croStyles.statusDone
                    : status === "failed"
                    ? croStyles.statusFailed
                    : status === "cancelled"
                    ? croStyles.statusCancelled
                    : undefined;
                return (
                  <li key={thread.threadId}>
                    <button
                      type="button"
                      data-hook="dialog-esc-cro-item"
                      {...stylex.props(croStyles.item)}
                      onClick={() => openChild(thread)}
                    >
                      <div {...stylex.props(croStyles.itemMain)}>
                        <span {...stylex.props(croStyles.itemTitle)}>
                          {resolveChildRunTitle(thread, untitledLabel)}
                        </span>
                        <div {...stylex.props(croStyles.badges)}>
                          {typeof thread.queued === "number" && thread.queued > 0 ? (
                            <span {...stylex.props(croStyles.queuedPill)}>
                              {t("childRunObserver.queuedCount", "{{count}} 条排队中", {
                                count: thread.queued,
                              })}
                            </span>
                          ) : null}
                          <span {...stylex.props(croStyles.status, statusVariant)}>
                            {formatChildRunStatusLabel(status, statusLabels)}
                          </span>
                        </div>
                      </div>
                      <div {...stylex.props(croStyles.agent)}>
                        {thread.primaryAgentKey}
                      </div>
                      <div {...stylex.props(croStyles.evidence)}>
                        {formatChildRunEvidenceLine(
                          thread.runtimeEvidence,
                          status,
                          statusLabels,
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </aside>

      {detailModal}
    </>
  );
};

export default ChildRunObserverPanel;
