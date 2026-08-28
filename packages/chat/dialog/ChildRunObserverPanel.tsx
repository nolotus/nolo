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
import "./ChildRunObserverPanel.css";

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
          className="ChildRunObserverPanel__collapsedRail"
          onClick={() => setIsExpanded(true)}
          aria-expanded={false}
          aria-label={t("childRunObserver.expandAriaLabel")}
          title={t("childRunObserver.expandTitle")}
        >
          <LuActivity size={14} aria-hidden="true" />
          <span className="ChildRunObserverPanel__collapsedLabel">
            {t("childRunObserver.title")}
          </span>
          {threads.length > 0 ? (
            <span className="ChildRunObserverPanel__collapsedCount">
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
        className="ChildRunObserverPanel"
        aria-label={t("childRunObserver.panelAriaLabel")}
      >
        <div className="ChildRunObserverPanel__header">
          <div className="ChildRunObserverPanel__titleWrap">
            <div className="ChildRunObserverPanel__title">
              <LuActivity size={14} aria-hidden="true" />
              <span>{t("childRunObserver.title")}</span>
            </div>
            <div className="ChildRunObserverPanel__subtitle">
              {hasLoadedOnce
                ? t("childRunObserver.subtitleCount", { count: threads.length })
                : t("childRunObserver.subtitleLoading")}
            </div>
          </div>
          <div className="ChildRunObserverPanel__headerActions">
            <button
              type="button"
              className="ChildRunObserverPanel__iconButton"
              onClick={() => void fetchChildRuns()}
              disabled={isLoading}
              aria-label={t("childRunObserver.refreshAriaLabel")}
              title={t("childRunObserver.refreshTitle")}
            >
              <LuRefreshCw size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="ChildRunObserverPanel__iconButton"
              onClick={() => setIsExpanded(false)}
              aria-expanded={true}
              aria-label={t("childRunObserver.collapseAriaLabel")}
              title={t("childRunObserver.collapseTitle")}
            >
              <LuChevronRight size={14} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="ChildRunObserverPanel__body">
          {loadState === "loading" ? (
            <div
              className="ChildRunObserverPanel__state"
              role="status"
              aria-live="polite"
            >
              {t("childRunObserver.loading")}
            </div>
          ) : null}

          {loadState === "error" ? (
            <div
              className="ChildRunObserverPanel__state ChildRunObserverPanel__state--error"
              role="alert"
            >
              <div>{errorMessage || t("childRunObserver.loadFailed")}</div>
              <button
                type="button"
                className="ChildRunObserverPanel__retry"
                onClick={() => void fetchChildRuns()}
              >
                {t("childRunObserver.retry")}
              </button>
            </div>
          ) : null}

          {loadState === "empty" ? (
            <div className="ChildRunObserverPanel__state" role="status">
              {t("childRunObserver.empty")}
            </div>
          ) : null}

          {loadState === "ready" || (threads.length > 0 && loadState !== "loading") ? (
            <ul className="ChildRunObserverPanel__list">
              {threads.map((thread) => {
                const status = thread.status;
                const statusClass = `ChildRunObserverPanel__status ChildRunObserverPanel__status--${status}`;
                return (
                  <li key={thread.threadId}>
                    <button
                      type="button"
                      className="ChildRunObserverPanel__item"
                      onClick={() => openChild(thread)}
                    >
                      <div className="ChildRunObserverPanel__itemMain">
                        <span className="ChildRunObserverPanel__itemTitle">
                          {resolveChildRunTitle(thread, untitledLabel)}
                        </span>
                        <div className="ChildRunObserverPanel__badges">
                          {typeof thread.queued === "number" && thread.queued > 0 ? (
                            <span className="ChildRunObserverPanel__queuedPill">
                              {t("childRunObserver.queuedCount", "{{count}} 条排队中", {
                                count: thread.queued,
                              })}
                            </span>
                          ) : null}
                          <span className={statusClass}>
                            {formatChildRunStatusLabel(status, statusLabels)}
                          </span>
                        </div>
                      </div>
                      <div className="ChildRunObserverPanel__agent">
                        {thread.primaryAgentKey}
                      </div>
                      <div className="ChildRunObserverPanel__evidence">
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
