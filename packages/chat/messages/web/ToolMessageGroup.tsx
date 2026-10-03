import React, {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { LuChevronDown, LuChevronRight } from "react-icons/lu";
import { StatusIcon, safeParse, withLiteralClass } from "./toolMessageShared";
import ToolMessageContent from "./ToolMessageContent";
import { messagesStyles } from "./messagesStyles";
import { toolMessageStyles as toolStyles } from "./toolMessageStyles";
import "./messagesStylexEscapeHatch.css";
import {
  buildActivityTimeline,
  createToolNameTranslator,
  type ActivityTimelineAction,
  type ActivityTimelinePhase,
} from "./toolDisplayName";
import ToolCallRow from "./ToolCallRow";
import {
  buildToolCallPresentation,
  formatToolGroupStatusSummary,
  resolveToolCallMode,
  summarizeToolCallStatuses,
} from "./toolCallPresentation";

/** Button reset so `.tr-header` keeps layout when used as `<button>`. */
const TR_HEADER_BUTTON_STYLE: React.CSSProperties = {
  width: "100%",
  margin: 0,
  font: "inherit",
  color: "inherit",
  textAlign: "left",
  background: "transparent",
  appearance: "none",
};

/** Placeholder phase titles from buildActivityTimeline — never show in UI. */
const GENERIC_PHASE_TITLES = new Set(["执行工具步骤", "工具"]);

function isVisibleTodoMessage(message: any, enabled: boolean): boolean {
  return enabled || message?.toolName !== "setTodoList";
}

/** Stick to bottom while within this distance of the body scroller end. */
const BODY_STICK_BOTTOM_PX = 56;

function isGenericPhaseTitle(title: string | undefined): boolean {
  const t = (title || "").trim();
  return !t || GENERIC_PHASE_TITLES.has(t);
}

function isNearBodyBottom(el: HTMLElement): boolean {
  return el.scrollHeight - el.clientHeight - el.scrollTop <= BODY_STICK_BOTTOM_PX;
}

/** Pin body scroller to newest step; ignore synthetic scroll events this causes. */
function pinBodyToBottom(
  el: HTMLElement,
  stickToBottomRef: { current: boolean },
  ignoreScrollRef: { current: number }
) {
  if (!stickToBottomRef.current) return;
  const maxTop = Math.max(0, el.scrollHeight - el.clientHeight);
  if (el.scrollTop >= maxTop - 1) return;
  // Count expected synthetic scroll events (some engines fire more than one).
  ignoreScrollRef.current += 2;
  el.scrollTop = el.scrollHeight;
  // Safety clear if no scroll event is delivered (already at bottom / no overflow).
  // rAF guard: bun+jsdom exposes a requestAnimationFrame that throws when
  // called (no real frame loop); fall back to a microtask-free no-op.
  try {
    const raf = (globalThis as { requestAnimationFrame?: (cb: () => void) => number }).requestAnimationFrame;
    if (!raf) return;
    raf(() => {
      if (ignoreScrollRef.current > 0) ignoreScrollRef.current -= 1;
    });
  } catch {
    // rAF unavailable in this environment; ignore-counter cleanup is best-effort.
  }
}

export interface ToolMessageGroupProps {
  messages: any[];
  activityMessages?: any[];
  /**
   * When true, the group may auto-collapse. Parent should set this only after
   * a final assistant reply has landed (or a new user turn started). While
   * false, the group stays expanded so users keep seeing the trajectory.
   */
  canCollapse?: boolean;
  readOnly?: boolean;
  conversationTodoEnabled?: boolean;
}

export const ToolMessageGroup = memo(
  ({
    messages,
    activityMessages,
    canCollapse = false,
    conversationTodoEnabled = true,
  }: ToolMessageGroupProps) => {
    const { t } = useTranslation("chat");
    const [expandedActions, setExpandedActions] = useState<Set<string>>(
      () => new Set()
    );
    const [expandedPhases, setExpandedPhases] = useState<Set<string>>(
      () => new Set()
    );
    /** User manually toggled collapse; stops auto open/close until status flips. */
    const userOverrideRef = useRef(false);
    const sawOpenTurnRef = useRef(!canCollapse);
    /** Body scroller: follow newest steps unless the user scrolls up. */
    const bodyRef = useRef<HTMLDivElement>(null);
    /** Inner content measured by ResizeObserver (scroller itself does not resize at max-height). */
    const bodyContentRef = useRef<HTMLDivElement>(null);
    const stickToBottomRef = useRef(true);
    /** Skip N onScroll updates caused by our own pinBodyToBottom writes. */
    const ignoreBodyScrollRef = useRef(0);
    /** Epoch for the latest user row disclosure; suppresses only its RO pass. */
    const disclosureEpochRef = useRef(0);
    const suppressDisclosurePinRef = useRef(-1);

    const toolNameTranslator = useMemo(
      () =>
        createToolNameTranslator((key, options) => {
          // No String() coercion here: a non-string t() return (i18n miss
          // variants / test-double t implementations that hand back the
          // options object) must fall through to the zh fallback inside
          // createToolNameTranslator instead of rendering "[object Object]".
          const value: unknown = t(key, options as any);
          return typeof value === "string" ? value : "";
        }),
      [t]
    );

    // Single visibility pass (P0.5): every displayed state — header summary
    // counts, card status (messageStatus/overallStatus), and the fallback
    // body — MUST derive from this same filtered list, so a hidden setTodoList
    // can never leak its status, count, failure, or body into the group.
    const visibleMessages = useMemo(
      () => messages.filter((msg) => isVisibleTodoMessage(msg, conversationTodoEnabled)),
      [messages, conversationTodoEnabled]
    );

    // Compact header summary: total / running / failed calls (i18n-aware).
    // This summary owns the ONLY count in the header — the old wrench count
    // badge was a duplicate and is gone (P0.5). Durations live on the rows,
    // never on the header.
    const summary = useMemo(() => {
      return formatToolGroupStatusSummary(
        summarizeToolCallStatuses(visibleMessages),
        toolNameTranslator
      );
    }, [visibleMessages, toolNameTranslator]);

    /** Ordinary calls → flat presentation model (pure mapping). */
    const toToolCallPresentation = (msg: any) =>
      buildToolCallPresentation(msg, toolNameTranslator);

    /**
     * Artifact-class tools (setTodoList/TodoCard, applyDiff/DiffViewer, image
     * cards, appDeploy …) keep their dedicated ToolMessageContent renderer,
     * ALWAYS mounted — they must never degrade into a disabled flat row that
     * hides the card body after the call settles.
     */
    const renderArtifactDetail = (msg: any) => (
      <div
        key={msg.id ?? msg.dbKey ?? msg.tool_call_id ?? msg.toolCallId}
        {...withLiteralClass("tool-group__item", toolStyles.groupItem)}
      >
        <ToolMessageContent
          toolName={msg.toolName}
          rawData={safeParse(msg.content)}
          isError={
            msg.toolPayload?.status === "failed" ||
            !!msg.toolPayload?.error ||
            !!safeParse(msg.content)?.error
          }
          t={t}
          openPreview={() => {}}
          navigateToPage={() => {}}
          presentation="groupDetail"
          conversationTodoEnabled={conversationTodoEnabled}
        />
      </div>
    );

    /** Artifact/handoff/interactive tools never go through flat rows. */
    const isRowModeMessage = (msg: any) =>
      resolveToolCallMode(msg?.toolName) === "row";

    const timeline = useMemo(() => {
      return buildActivityTimeline(
        (activityMessages ?? messages).filter((message: any) =>
          isVisibleTodoMessage(message, conversationTodoEnabled),
        ),
      );
    }, [activityMessages, conversationTodoEnabled, messages]);

    const messageStatus = useMemo(() => {
      let hasRunning = false;
      let lastSettledStatus: "failed" | "success" | null = null;
      // P0.5: derive from the SAME visible list as the summary/body — a
      // hidden setTodoList failure must not fail the whole card.
      for (const msg of visibleMessages) {
        const rawData = safeParse(msg.content);
        const isError =
          msg.toolPayload?.status === "failed" ||
          !!msg.toolPayload?.error ||
          !!rawData?.error;
        if (msg.isStreaming && !canCollapse) hasRunning = true;
        else lastSettledStatus = isError ? "failed" : "success";
      }
      if (hasRunning) return "running";
      return lastSettledStatus ?? "success";
    }, [visibleMessages, canCollapse]);

    const hasTimeline = timeline.phases.length > 0;
    /** Only generic placeholder phase(s) — show flat actions, no phase chrome. */
    const useFlatActions =
      hasTimeline &&
      timeline.phases.every((phase) => isGenericPhaseTitle(phase.title));
    const flatActions = useMemo(
      () => timeline.phases.flatMap((phase) => phase.actions),
      [timeline.phases]
    );
    // A generic timeline may omit signal-less messages; ordinary grouped calls
    // must still render every visible row, especially when a second tool
    // streams in after a single-flat call.
    const flatMessages = useMemo(
      () => visibleMessages.filter((message) => isRowModeMessage(message)),
      [visibleMessages]
    );
    const namedPhases = useMemo(
      () => timeline.phases.filter((phase) => !isGenericPhaseTitle(phase.title)),
      [timeline.phases]
    );
    // Header icon reflects THIS group's tools only — not "awaiting final reply".
    // Expand/collapse is controlled by `canCollapse`; do not fake-spin settled tools.
    const overallStatus = useMemo(() => {
      if (canCollapse && messageStatus !== "running") {
        if (messageStatus === "failed") return "failed";
        return "success";
      }
      if (!hasTimeline) return messageStatus;
      if (!canCollapse && timeline.phases.some((phase) => phase.status === "running"))
        return "running";
      // Mixed-failure settled turn: if any phase succeeded after a failure,
      // keep the card neutral so the final answer stays dominant.
      // Also check action-level status because a single implicit phase that
      // contains both failed and successful actions is merged to "failed" by
      // buildActivityTimeline, which would otherwise paint the whole card red.
      const allActions = timeline.phases.flatMap((phase) => phase.actions);
      const hasFailedAction = allActions.some((action) => action.status === "failed");
      const hasSuccessAction = allActions.some((action) => action.status === "success");
      if (hasFailedAction && hasSuccessAction) return messageStatus;
      if (messageStatus === "failed") return "failed";
      if (timeline.phases.some((phase) => phase.status === "success"))
        return "success";
      if (timeline.phases.some((phase) => phase.status === "failed"))
        return "failed";
      if (timeline.completedPhases < timeline.totalPhases) return "pending";
      return "success";
    }, [hasTimeline, messageStatus, timeline]);

    // Default: open while waiting for the final reply; closed for historical turns.
    const [expanded, setExpanded] = useState(() => !canCollapse);

    // Expand for the whole turn; collapse only once the final reply is ready.
    useEffect(() => {
      if (!canCollapse) {
        userOverrideRef.current = false;
        setExpanded(true);
        sawOpenTurnRef.current = true;
        // New active turn: always follow the latest step as tools stream in.
        stickToBottomRef.current = true;
        return;
      }
      // Final reply landed (or historical load) → auto-collapse unless user toggled.
      if (!userOverrideRef.current) {
        setExpanded(false);
      }
    }, [canCollapse]);

    const actionCount = useFlatActions
      ? flatActions.length
      : namedPhases.reduce((n, phase) => n + phase.actions.length, 0);
    const isSingleOrdinaryRow =
      visibleMessages.length === 1 &&
      namedPhases.length === 0 &&
      isRowModeMessage(visibleMessages[0]);
    const showBody = expanded && !isSingleOrdinaryRow;

    // Keep the compact body scroller pinned to the newest step while streaming.
    // max-height caps the body; without pin, new tools append below the fold.
    useLayoutEffect(() => {
      if (!expanded) return;
      const el = bodyRef.current;
      if (!el) return;

      pinBodyToBottom(el, stickToBottomRef, ignoreBodyScrollRef);
      // Running action details / fonts can settle one frame later — pin again.
      // rAF guard: bun+jsdom/SSR-like environments may lack a working rAF;
      // the synchronous pin above already keeps the scroller usable.
      try {
        const rafImpl = (globalThis as { requestAnimationFrame?: (cb: () => void) => number }).requestAnimationFrame;
        if (!rafImpl) return;
        const raf = rafImpl(() => {
          pinBodyToBottom(el, stickToBottomRef, ignoreBodyScrollRef);
        });
        return () => {
          if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(raf);
        };
      } catch {
        return;
      }
    }, [
      expanded,
      messages,
      activityMessages,
      timeline,
      expandedActions,
      expandedPhases,
      useFlatActions,
      actionCount,
      namedPhases.length,
      overallStatus,
    ]);

    // Content height can grow after layout (running action detail) without a
    // messages identity change — observe the inner wrapper, not the scroller box.
    useEffect(() => {
      if (!expanded) return;
      const el = bodyRef.current;
      const content = bodyContentRef.current;
      if (!el || !content) return;

      const ResizeObserverImpl = (
        globalThis as unknown as { ResizeObserver?: new (cb: ResizeObserverCallback) => ResizeObserver }
      ).ResizeObserver;
      if (!ResizeObserverImpl) return;

      let ro: ResizeObserver;
      try {
        ro = new ResizeObserverImpl(() => {
          if (
            suppressDisclosurePinRef.current >= 0 &&
            suppressDisclosurePinRef.current === disclosureEpochRef.current
          ) {
            suppressDisclosurePinRef.current = -1;
            return;
          }
          pinBodyToBottom(el, stickToBottomRef, ignoreBodyScrollRef);
        });
      } catch {
        return;
      }
      ro.observe(content);
      return () => ro.disconnect();
    }, [expanded, showBody, useFlatActions, actionCount]);

    const handleBodyScroll = () => {
      if (ignoreBodyScrollRef.current > 0) {
        ignoreBodyScrollRef.current = 0;
      }
      const el = bodyRef.current;
      if (!el) return;
      stickToBottomRef.current = isNearBodyBottom(el);
    };

    const handleHeaderToggle = () => {
      userOverrideRef.current = true;
      const next = !expanded;
      if (next) {
        stickToBottomRef.current = true;
      }
      setExpanded(next);
    };

    const handleUserRowDisclosure = (_rowExpanded: boolean) => {
      disclosureEpochRef.current += 1;
      suppressDisclosurePinRef.current = disclosureEpochRef.current;
    };

    // A new message/activity projection is runtime growth, not disclosure.
    // Clear the one-shot suppression before the next observer pass so a new
    // tool or streaming output can resume follow-latest behavior.
    useLayoutEffect(() => {
      suppressDisclosurePinRef.current = -1;
    }, [messages, activityMessages]);

    const toggleAction = (actionId: string) => {
      setExpandedActions((prev) => {
        const next = new Set(prev);
        if (next.has(actionId)) next.delete(actionId);
        else next.add(actionId);
        return next;
      });
    };

    const togglePhase = (phaseId: string) => {
      setExpandedPhases((prev) => {
        const next = new Set(prev);
        if (next.has(phaseId)) next.delete(phaseId);
        else next.add(phaseId);
        return next;
      });
    };

    const renderAction = (action: ActivityTimelineAction) => {
      const isActionExpanded =
        expandedActions.has(action.id) || action.status === "running";
      const rawData = safeParse((action.message as any)?.content);
      const isError =
        (action.message as any)?.toolPayload?.status === "failed" ||
        !!(action.message as any)?.toolPayload?.error ||
        !!rawData?.error;
      return (
        <div
          key={action.id}

          {...withLiteralClass(`tr-action tr-action--${action.status}`, toolStyles.action)}
        >
          <button
            type="button"
            data-hook="messages-esc-tr-action-row"
            {...withLiteralClass("tr-action-row", toolStyles.actionRow)}
            onClick={(event) => {
              event.stopPropagation();
              toggleAction(action.id);
            }}
          >
            <span {...withLiteralClass(`tr-action-dot tr-action-dot--${action.status}`, toolStyles.actionDot, action.status === "success" && toolStyles.actionDotSuccess, action.status === "running" && toolStyles.actionDotRunning, action.status === "failed" && toolStyles.actionDotFailed)} />
            <span  {...withLiteralClass("tr-action-label u-truncate", toolStyles.truncate, toolStyles.actionLabel)}>{action.label}</span>
            <span  aria-hidden="true" data-hook="messages-esc-tr-action-chevron" {...withLiteralClass("tr-action-chevron", toolStyles.actionChevron)}>
              {isActionExpanded ? (
                <LuChevronDown size={13} />
              ) : (
                <LuChevronRight size={13} />
              )}
            </span>
          </button>
          {isActionExpanded && (
            <div  {...withLiteralClass("tr-action-detail", toolStyles.actionDetail)}>
              <ToolMessageContent
                toolName={(action.message as any)?.toolName}
                rawData={rawData}
                isError={isError}
                t={t}
                openPreview={() => {}}
                navigateToPage={() => {}}
                presentation="groupDetail"
                conversationTodoEnabled={conversationTodoEnabled}
              />
            </div>
          )}
        </div>
      );
    };

    const renderPhase = (phase: ActivityTimelinePhase) => {
      const canExpand = phase.actions.length > 0;
      const isPhaseExpanded =
        expandedPhases.has(phase.id) || phase.status === "running";

      return (
        <div
          key={phase.id}

          data-hook="messages-esc-tr-phase" {...withLiteralClass(`tr-phase tr-phase--${phase.status}${isPhaseExpanded ? " tr-phase--expanded" : ""}`, toolStyles.action)}
        >
          <button
            type="button"
            data-hook="messages-esc-tr-phase-row"
            {...withLiteralClass("tr-phase-row", toolStyles.phaseRow)}
            onClick={(event) => {
              event.stopPropagation();
              if (canExpand) togglePhase(phase.id);
            }}
            aria-expanded={canExpand ? isPhaseExpanded : undefined}
            disabled={!canExpand}
          >
            <span {...withLiteralClass(`tr-phase-status tr-phase-status--${phase.status}`, toolStyles.phaseStatus, phase.status === "running" && toolStyles.phaseStatusRunning, phase.status === "failed" && toolStyles.phaseStatusFailed)}>
              <StatusIcon status={phase.status} toolName="" />
            </span>
            <span  {...withLiteralClass("tr-phase-main", toolStyles.phaseMain)}>
              <span  {...withLiteralClass("tr-phase-title u-truncate", toolStyles.truncate, toolStyles.phaseTitle)}>{phase.title}</span>
              {phase.actions.length > 1 && (
                <span  {...withLiteralClass("tr-phase-meta", toolStyles.phaseMeta)}>
                  {phase.actions.length} 个动作
                </span>
              )}
            </span>
            {canExpand && (
              <span  aria-hidden="true" {...withLiteralClass("tr-phase-chevron", toolStyles.phaseChevron)}>
                {isPhaseExpanded ? (
                  <LuChevronDown size={13} />
                ) : (
                  <LuChevronRight size={13} />
                )}
              </span>
            )}
          </button>
          {isPhaseExpanded && canExpand && (
            <div  {...withLiteralClass("tr-action-list", toolStyles.actionList)}>{phase.actions.map(renderAction)}</div>
          )}
        </div>
      );
    };

    const headerMain = (
      <div  {...withLiteralClass("tr-main", toolStyles.main)}>
        <div {...withLiteralClass(`tr-icon ${overallStatus}`, toolStyles.icon)}>
          <StatusIcon status={overallStatus} toolName="" />
        </div>
        {/* Single count semantic: the i18n summary owns the call count. */}
        <span  data-hook="messages-esc-tr-summary" {...withLiteralClass("tr-summary u-truncate", toolStyles.truncate, toolStyles.summary)}>{summary}</span>
      </div>
    );

    return (
      <div
        data-hook="messages-esc-tool-row"
        {...withLiteralClass(`tool-msg-row ${overallStatus} ${expanded ? "" : "is-collapsed"}`, toolStyles.row)}
      >
        {!isSingleOrdinaryRow && <button
          type="button"
          data-hook="messages-esc-tr-header" {...withLiteralClass("tr-header", toolStyles.header)}
          style={TR_HEADER_BUTTON_STYLE}
          onClick={handleHeaderToggle}
          aria-expanded={expanded}
          aria-label={expanded ? "收起活动详情" : "展开活动详情"}
        >
          {headerMain}
          <div  aria-hidden="true" data-hook="messages-esc-tr-chevron" {...withLiteralClass("tr-chevron", toolStyles.chevron)}>
            {expanded ? (
              <LuChevronDown size={14} />
            ) : (
              <LuChevronRight size={14} />
            )}
          </div>
        </button>}

        {isSingleOrdinaryRow ? (
          <ToolCallRow
            key={visibleMessages[0].id ?? visibleMessages[0].dbKey ?? visibleMessages[0].tool_call_id ?? visibleMessages[0].toolCallId}
            presentation={toToolCallPresentation(visibleMessages[0])}
            message={visibleMessages[0]}
            t={t}
            conversationTodoEnabled={conversationTodoEnabled}
            onUserDisclosureChange={handleUserRowDisclosure}
          />
        ) : null}

        {showBody && (
          <div
            ref={bodyRef}
            data-hook="messages-esc-tr-body"
            {...withLiteralClass(
              `tr-body tool-group__body${namedPhases.length > 0 ? "" : " tool-group__body--flat"}`,
              namedPhases.length > 0 ? toolStyles.groupBody : toolStyles.groupBodyFlat
            )}
            onScroll={handleBodyScroll}
          >
            <div ref={bodyContentRef} className="tr-body-content">
              {useFlatActions && visibleMessages.length > 0 ? (
                <div  {...withLiteralClass("tool-call-flat-list", toolStyles.flatList)}>
                  {visibleMessages.map((message) =>
                    isRowModeMessage(message) ? (
                      <ToolCallRow
                        key={message.id ?? message.dbKey ?? message.tool_call_id ?? message.toolCallId}
                        presentation={toToolCallPresentation(message)}
                        message={message}
                        t={t}
                        conversationTodoEnabled={conversationTodoEnabled}
                        onUserDisclosureChange={handleUserRowDisclosure}
                      />
                    ) : (
                      renderArtifactDetail(message)
                    )
                  )}
                </div>
              ) : namedPhases.length > 0 ? (
                <div  {...withLiteralClass("tr-phase-list", toolStyles.phaseList)}>{namedPhases.map(renderPhase)}</div>
              ) : (
                visibleMessages.map((msg) =>
                  isRowModeMessage(msg) ? (
                    <ToolCallRow
                      key={msg.id ?? msg.dbKey ?? msg.tool_call_id ?? msg.toolCallId}
                      presentation={toToolCallPresentation(msg)}
                      message={msg}
                      t={t}
                      conversationTodoEnabled={conversationTodoEnabled}
                      onUserDisclosureChange={handleUserRowDisclosure}
                    />
                  ) : (
                    renderArtifactDetail(msg)
                  )
                )
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

export default ToolMessageGroup;
