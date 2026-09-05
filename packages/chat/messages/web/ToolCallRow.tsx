import React, { memo, useId, useState } from "react";
import { LuChevronDown, LuChevronRight } from "react-icons/lu";
import ToolMessageContent from "./ToolMessageContent";
import { safeParse, StatusIcon, withLiteralClass } from "./toolMessageShared";
import { toolMessageStyles as toolStyles } from "./toolMessageStyles";
import "./messagesStylexEscapeHatch.css";
import type { ToolCallPresentation } from "./toolCallPresentation";

/**
 * Flat, expandable row for one ordinary grouped tool call (Phase 1).
 *
 * Anatomy mirrors the timeline action rows: native `<button>` header (free
 * Enter/Space keyboard support) + collapsible detail body that reuses
 * ToolMessageContent's groupDetail renderers. Running rows auto-open, a user
 * toggle always wins afterwards — same rule as buildActivityTimeline actions.
 * No spinning loaders; terminal states use the shared StatusIcon dot.
 *
 * Flex contract (P1): status icon / verb / diff meta / duration / chevron keep
 * intrinsic width; the target is the MAIN flexible column (flex:1 +
 * min-width:0, clips for real via the shared toolStyles.truncate entry;
 * u-truncate stays as a legacy DOM anchor). Context is the weakest signal:
 * shrinkable under an explicit max-width cap, hidden on very narrow
 * viewports. Visual hierarchy: status → verb → target (primary) → context
 * (muted) → meta/duration/chevron.
 *
 * Interaction: the header is its own hover/focus unit —
 * messages-esc-tool-call-row-header (light hover + focus-visible ring in
 * messagesStylexEscapeHatch.css) — deliberately not the legacy timeline
 * action-row hook, so the old timeline hover can never override the flat
 * row's own states.
 */
export interface ToolCallRowProps {
  presentation: ToolCallPresentation;
  /** Original tool message; feeds the groupDetail renderer when expanded. */
  message: any;
  t: (key: string, options?: any) => string;
  conversationTodoEnabled?: boolean;
  /** Called only for explicit user disclosure changes, not status auto-open. */
  onUserDisclosureChange?: (expanded: boolean) => void;
}

export const ToolCallRow = memo(
  ({
    presentation,
    message,
    t,
    conversationTodoEnabled = true,
    onUserDisclosureChange,
  }: ToolCallRowProps) => {
    const detailId = `tool-call-row-detail-${useId()}`;
    /** null = follow the status-derived default; boolean = user decided. */
    const [userExpanded, setUserExpanded] = useState<boolean | null>(null);
    const expanded = userExpanded ?? presentation.status === "running";

    const rawData = safeParse(message?.content);
    const isError =
      message?.toolPayload?.status === "failed" ||
      !!message?.toolPayload?.error ||
      !!rawData?.error;

    return (
      <div
        data-hook="messages-esc-tool-call-row"
        {...withLiteralClass(
          `tool-call-row tool-call-row--${presentation.status}${
            expanded ? " tool-call-row--expanded" : ""
          }`,
          toolStyles.action
        )}
      >
        <button
          type="button"
          data-hook="messages-esc-tool-call-row-header"
          {...withLiteralClass("tool-call-row__header", toolStyles.rowHeader)}
          onClick={
            presentation.expandable
              ? () => {
                  const nextExpanded = !expanded;
                  setUserExpanded(nextExpanded);
                  onUserDisclosureChange?.(nextExpanded);
                }
              : undefined
          }
          aria-expanded={presentation.expandable ? expanded : undefined}
          aria-controls={presentation.expandable ? detailId : undefined}
          disabled={!presentation.expandable || undefined}
        >
          <StatusIcon
            status={presentation.status}
            toolName={presentation.toolName}
            errorMessage={presentation.errorMessage}
          />
          <span
            {...withLiteralClass(
              "tool-call-row__verb u-truncate",
              toolStyles.rowVerb
            )}
          >
            {presentation.verb}
          </span>
          {presentation.context ? (
            <span
              {...withLiteralClass(
                "tool-call-row__context u-truncate",
                toolStyles.rowContext,
                toolStyles.truncate
              )}
            >
              {presentation.context}
            </span>
          ) : null}
          {presentation.target ? (
            <span
              {...withLiteralClass(
                "tool-call-row__target u-truncate",
                toolStyles.rowTarget,
                toolStyles.truncate
              )}
            >
              {presentation.target}
            </span>
          ) : null}
          {presentation.meta?.diff ? (
            <span
              data-hook="messages-esc-tool-call-row-meta-diff"
              {...withLiteralClass("tool-call-row__meta-diff", toolStyles.duration)}
            >
              <span {...withLiteralClass("tool-call-row__diff-add")}>
                +{presentation.meta.diff.added}
              </span>
              <span {...withLiteralClass("tool-call-row__diff-remove")}>
                −{presentation.meta.diff.removed}
              </span>
            </span>
          ) : null}
          {presentation.duration ? (
            <span
              data-hook="messages-esc-tool-call-row-duration"
              {...withLiteralClass("tool-call-row__duration", toolStyles.duration)}
            >
              {presentation.duration}
            </span>
          ) : null}
          {presentation.expandable && (
            <span
              aria-hidden="true"
              data-hook="messages-esc-tool-call-row-chevron"
              {...withLiteralClass("tool-call-row__chevron", toolStyles.actionChevron)}
            >
              {expanded ? <LuChevronDown size={13} /> : <LuChevronRight size={13} />}
            </span>
          )}
        </button>
        {expanded && (
          <div
            id={detailId}
            {...withLiteralClass("tool-call-row__body", toolStyles.rowDetail)}
          >
            <ToolMessageContent
              toolName={message?.toolName}
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
  }
);

export default ToolCallRow;
