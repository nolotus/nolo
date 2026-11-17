import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LuActivity,
  LuChevronLeft,
  LuChevronRight,
  LuRefreshCw,
} from "react-icons/lu";
import { DialogAgentSummary } from "ai/agent/web/DialogAgentSummary";
import type { Agent } from "app/types";
import type { Message } from "chat/messages/types";
import { childRunObserverFallback } from "./childRunObserverLabels";
import { projectPersistedChildRuns } from "./persistedChildRuns";
import { useLocation, useNavigate } from "app/routing";
import { resolveAgentRunStatusKind } from "core/agentRunStatusKind";
import { resolveAgentRunStatusLabel } from "chat/messages/toolPresentation";
import { buildDialogUrl } from "./dialogUrl";
import { useMediaQuery } from "app/hooks/useMediaQuery";
import type { ClientAgentThread } from "ai/agent/web/agentDisplayUtils";
import { useToken } from "identity";
import { selectCurrentServer } from "app/settings/settingSlice";
import { useAppSelector } from "app/store";
import { asOptionalTrimmedString } from "core/optionalString";
import { ChildRunDetailModal, type ChildRunDetailTarget } from "./ChildRunDetailModal";
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
  mainAgentKey?: string;
  builtinAgent?: Agent | null;
  messages?: readonly Message[];
  dialogKey?: string;
};

export const ChildRunObserverPanel: React.FC<ChildRunObserverPanelProps> = ({
  parentThreadId,
  mainAgentKey,
  builtinAgent,
  messages,
  dialogKey,
}) => {
  const { t, i18n } = useTranslation("chat");
  const label = (key: Parameters<typeof childRunObserverFallback>[1]) =>
    t(`childRunObserver.${key}`, childRunObserverFallback(i18n.resolvedLanguage ?? i18n.language, key));
  const navigate = useNavigate();
  const location = useLocation();
  const token = useToken();
  const server = useAppSelector(selectCurrentServer);
  const serverOrigin = String(server ?? "").replace(/\/+$/, "");
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
  const persistedRuns = useMemo(() => dialogKey && messages ? projectPersistedChildRuns(messages, dialogKey) : [], [dialogKey, messages]);
  const untitledLabel = t("childRunObserver.defaultTitle");

  const [threads, setThreads] = useState<ClientAgentThread[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<ChildRunDetailTarget | null>(
    null,
  );
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [persistedDetail, setPersistedDetail] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<"progress" | "history">("progress");
  // Desktop opens the split view; mobile starts compact.
  const isDesktop = useMediaQuery("(min-width: 961px)");
  // Remember manual intent separately for each layout; entering mobile defaults
  // compact without discarding the desktop choice (and vice versa).
  const [expandedByLayout, setExpandedByLayout] = useState<{ desktop?: boolean; mobile?: boolean }>({});
  const layout = isDesktop ? "desktop" : "mobile";
  const isExpanded = expandedByLayout[layout] ?? isDesktop;
  const setIsExpanded = (expanded: boolean) => {
    setExpandedByLayout((previous) => ({ ...previous, [layout]: expanded }));
  };

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
        const response = await fetch(buildChildThreadsQueryUrl({ serverOrigin, parentThreadId: parentId }), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const parsed = parseChildThreadsResponse(await response.json().catch(() => null), parentId);
        if (requestId !== inflightRef.current) return;
        if (!response.ok || !parsed.ok) {
          setErrorMessage(parsed.ok ? `HTTP ${response.status}` : parsed.error);
        } else {
          setThreads(parsed.threads);
          setErrorMessage(null);
        }
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
    [parentId, serverOrigin, t, token],
  );

  // Initial load + parent change.
  useEffect(() => {
    setThreads([]);
    setHasLoadedOnce(false);
    setErrorMessage(null);
    setSelectedThread(null);
    setIsDetailOpen(false);
    void fetchChildRuns();
    return () => { ++inflightRef.current; };
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
    setPersistedDetail(false);
    setSelectedThread(thread);
    setIsDetailOpen(true);
  };

  const closeChild = () => {
    setIsDetailOpen(false);
  };

  const active = (status?: string) => resolveAgentRunStatusKind(status) === "active";
  const historyPriority = (status?: string) =>
    ["failed", "timeout", "orphaned"].includes(status ?? "") ? 0 : resolveAgentRunStatusKind(status) === "abnormal" ? 1 : 2;
  const failuresFirst = (left: { status?: string }, right: { status?: string }) => historyPriority(left.status) - historyPriority(right.status);
  const workingThreads = threads.filter((thread) => thread.status === "running" || thread.status === "pending");
  const savedActive = persistedRuns.filter((run) => active(run.status));
  const historyThreads = threads.filter((thread) => !workingThreads.includes(thread)).sort(failuresFirst);
  const historyRuns = persistedRuns.filter((run) => !active(run.status)).sort(failuresFirst);
  const historyRows = [
    ...historyThreads.map((thread) => ({ status: thread.status, thread, run: null })),
    ...historyRuns.map((run) => ({ status: run.status, thread: null, run })),
  ].sort(failuresFirst);
  const historyCount = historyRows.length;
  const renderRun = (run: (typeof persistedRuns)[number]) => (
<li key={run.runId}>
                  <div {...stylex.props(croStyles.childIdentity)}>
                    {run.agentKey ? <DialogAgentSummary agentKey={run.agentKey} serverOrigin={serverOrigin} /> : <span>{run.agentName ?? run.runId}</span>}
                  </div>
                  <div {...stylex.props(croStyles.item)}>
                    <div {...stylex.props(croStyles.itemTitle)}>{run.title ?? run.runId}</div>
                    <div {...stylex.props(croStyles.evidence)}>{run.runId}</div>
                    <div {...stylex.props(croStyles.evidence)}>{resolveAgentRunStatusLabel(run.status, (key, fallback) => t(key, fallback))} · {label("persistedSnapshot")}</div>
                    {run.dialogKey ? <button type="button" onClick={() => navigate(`${buildDialogUrl(run.dialogKey!)}${location.search || ""}`)}>{label("openChildPage")}</button> : run.childDialogId ? (
                      <button type="button" onClick={() => {
                        setPersistedDetail(true);
                        setSelectedThread({ threadId: run.childDialogId!, dialogId: run.childDialogId, title: run.title, primaryAgentKey: run.agentKey ?? "", status: run.status });
                        setIsDetailOpen(true);
                      }}>{label("viewDetails")}</button>
                    ) : null}
                  </div>
                </li>
  );
  const renderThread = (thread: ClientAgentThread) => (
    <li key={thread.threadId}>
      <div {...stylex.props(croStyles.childIdentity)}>
        <DialogAgentSummary agentKey={thread.primaryAgentKey} serverOrigin={serverOrigin} />
      </div>
      <button type="button" {...stylex.props(croStyles.item)} onClick={() => openChild(thread)}>
        <div {...stylex.props(croStyles.itemMain)}>
          <span {...stylex.props(croStyles.itemTitle)}>{resolveChildRunTitle(thread, untitledLabel)}</span>
          <div {...stylex.props(croStyles.badges)}>
            {typeof thread.queued === "number" && thread.queued > 0 ? <span {...stylex.props(croStyles.queuedPill)}>{t("childRunObserver.queuedCount", "{{count}} 条排队中", { count: thread.queued })}</span> : null}
            <span {...stylex.props(croStyles.status, thread.status === "running" ? croStyles.statusRunning : thread.status === "pending" ? croStyles.statusPending : thread.status === "done" ? croStyles.statusDone : thread.status === "failed" ? croStyles.statusFailed : thread.status === "cancelled" ? croStyles.statusCancelled : undefined)}>{formatChildRunStatusLabel(thread.status, statusLabels)}</span>
          </div>
        </div>
        <div {...stylex.props(croStyles.evidence)}>{formatChildRunEvidenceLine(thread.runtimeEvidence, thread.status, statusLabels)}</div>
      </button>
    </li>
  );

  if (!parentId || !token) {
    return null;
  }

  // Empty dialogs reserve no width. Errors remain discoverable, and children
  // open the split view on desktop with an optional compact rail on mobile.
  const shouldShowChrome = threads.length > 0 || persistedRuns.length > 0 || loadState === "error";
  const detailModal = (
    <ChildRunDetailModal
      isOpen={isDetailOpen}
      thread={selectedThread}
      readOnly={persistedDetail}
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
          {threads.length + persistedRuns.length > 0 ? (
            <span {...stylex.props(croStyles.collapsedCount)}>
              {threads.length + persistedRuns.length}
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
        {(threads.length > 0 || persistedRuns.length > 0) && mainAgentKey ? (
          <section {...stylex.props(croStyles.mainAgent)} aria-label={t("childRunObserver.mainAgent")}>
            <h2 {...stylex.props(croStyles.sectionLabel)}>{t("childRunObserver.mainAgent")}</h2>
            <DialogAgentSummary key={mainAgentKey} agentKey={mainAgentKey} builtinAgent={builtinAgent} serverOrigin={serverOrigin} />
          </section>
        ) : null}
        <div {...stylex.props(croStyles.header)}>
          <div {...stylex.props(croStyles.titleWrap)}>
            <div {...stylex.props(croStyles.title)}>
              <LuActivity size={14} aria-hidden="true" />
              <span>{t("childRunObserver.title")}</span>
            </div>
            <div {...stylex.props(croStyles.subtitle)}>
              {hasLoadedOnce
                ? t("childRunObserver.subtitleCount", { count: threads.length + persistedRuns.length })
                : t("childRunObserver.subtitleLoading")}
            </div>
          </div>
          <div {...stylex.props(croStyles.headerActions)}>
            <button
              type="button"
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
          <div {...stylex.props(croStyles.groupControls)}>
            <button type="button" aria-pressed={selectedGroup === "progress"} onClick={() => setSelectedGroup("progress")} {...stylex.props(croStyles.groupButton, selectedGroup === "progress" && croStyles.groupButtonSelected)}>
              {label("inProgressGroup")} ({workingThreads.length + savedActive.length})
            </button>
            <button type="button" aria-pressed={selectedGroup === "history"} onClick={() => setSelectedGroup("history")} {...stylex.props(croStyles.groupButton, selectedGroup === "history" && croStyles.groupButtonSelected)}>
              {label("historyGroup")} ({historyCount})
            </button>
          </div>
          {selectedGroup === "progress" ? <div>
            <ul {...stylex.props(croStyles.list)}>{workingThreads.map(renderThread)}</ul>
            {savedActive.length > 0 ? <section>
              <h2 {...stylex.props(croStyles.sectionLabel)}>{label("savedActiveGroup")} ({savedActive.length})</h2>
              <ul {...stylex.props(croStyles.list)} aria-label={label("persistedRuns")}>{savedActive.map(renderRun)}</ul>
            </section> : null}
          </div> : <ul {...stylex.props(croStyles.list)} aria-label={label("persistedRuns")}>{historyRows.map((row) => row.thread ? renderThread(row.thread) : row.run ? renderRun(row.run) : null)}</ul>}

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
              {...stylex.props(croStyles.state, croStyles.stateError)}
              role="alert"
            >
              <div>{errorMessage || t("childRunObserver.loadFailed")}</div>
              <button
                type="button"
                {...stylex.props(croStyles.retry)}
                onClick={() => void fetchChildRuns()}
              >
                {t("childRunObserver.retry")}
              </button>
            </div>
          ) : null}

          {loadState === "empty" && messages && messages.length > 0 && persistedRuns.length === 0 ? (
            <div {...stylex.props(croStyles.state)} role="status">
              {t("childRunObserver.empty")}
            </div>
          ) : null}


        </div>
      </aside>

      {detailModal}
    </>
  );
};

export default ChildRunObserverPanel;
