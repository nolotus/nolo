import React, { memo, useId, useState } from "react";
import { LuChevronDown, LuChevronRight } from "react-icons/lu";
import { asOptionalTrimmedString } from "core/optionalString";
import ToolMessageContent from "./ToolMessageContent";
import { safeParse, StatusIcon, withLiteralClass } from "./toolMessageShared";
import { toolMessageStyles as toolStyles } from "./toolMessageStyles";
import "./messagesStylexEscapeHatch.css";
import type { ToolCallPresentation } from "./toolCallPresentation";
import {
  formatToolExecutionLocationLine,
  isQuietDetailTool,
  isToolCallFailed,
} from "./toolCallPresentation";
import {
  isMediaJobPendingConfirmation,
  toolMessageNeedsDefaultExpansion,
} from "../toolPresentation";
import { createToolNameTranslator, extractToolCallArgs } from "./toolDisplayName";

/**
 * Flat, expandable row for one ordinary grouped tool call (Phase 1).
 *
 * Anatomy mirrors the timeline action rows: native `<button>` header (free
 * Enter/Space keyboard support) + collapsible detail body that reuses
 * ToolMessageContent's groupDetail renderers. Running rows auto-open (except
 * quiet-detail tools like execShell/readFile, which stay folded TUI-style), a
 * user toggle always wins afterwards — same rule as buildActivityTimeline actions.
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
  /** Called only for explicit user disclosure changes, not status auto-open. */
  onUserDisclosureChange?: (expanded: boolean) => void;
}

const ATTENTION_DEFAULT_LABELS: Record<string, string> = {
  failure: "失败",
  blocked: "已阻塞",
  permission: "需要授权",
  "delete-confirmation": "等待删除确认",
};

function resolveAttentionLabel(
  kind: string,
  t?: (key: string, fallback: string) => string
): string {
  const fallback = ATTENTION_DEFAULT_LABELS[kind] ?? kind;
  if (typeof t !== "function") return fallback;
  try {
    const key = `toolActivity.attention.${kind}`;
    const res = t(key, fallback);
    const translated = typeof res === "string" ? asOptionalTrimmedString(res) : undefined;
    if (!translated || translated === key) return fallback;
    return translated;
  } catch {
    return fallback;
  }
}

function resolveUnknownStatusLabel(
  t?: (key: string, fallback: string) => string
): string {
  const fallback = "状态未知";
  if (typeof t !== "function") return fallback;
  try {
    const key = "toolActivity.unknown";
    const res = t(key, fallback);
    const translated = typeof res === "string" ? asOptionalTrimmedString(res) : undefined;
    if (!translated || translated === key) return fallback;
    return translated;
  } catch {
    return fallback;
  }
}

export const ToolCallRow = memo(
  ({
    presentation,
    message,
    t,
    onUserDisclosureChange,
  }: ToolCallRowProps) => {
    const detailId = `tool-call-row-detail-${useId()}`;
    /** null = follow the status-derived default; boolean = user decided. */
    const [userExpanded, setUserExpanded] = useState<boolean | null>(null);
    // Quiet-detail tools (execShell/readFile) stay folded even while running
    // (TUI parity) — long terminal output / file contents must not flood the
    // chat; one click opens the body. Other rows keep running auto-open.
    // 未决交互卡（报价待选档）必须默认展开：它需要用户操作，藏起来等于阻塞流程。
    // 用户手动 toggle 之后（userExpanded !== null）一律以用户为准。
    const expanded =
      userExpanded ??
      (toolMessageNeedsDefaultExpansion(message) ||
        (presentation.status === "running" &&
          !isQuietDetailTool(message?.toolName)));

    const rawData = safeParse(message?.content);
    // 媒体任务 start 被确认闸门拦下是「待确认」，不是失败（旧载荷 content 里带
    // { error: "*_requires_confirmation" }，不能据此判红）。
    const isPendingConfirmation = isMediaJobPendingConfirmation({
      toolName: message?.toolName ?? message?.toolPayload?.toolName,
      rawData,
      toolPayload: message?.toolPayload,
    });
    const isError =
      !isPendingConfirmation &&
      isToolCallFailed(message);

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
            status={presentation.status === "unknown" ? "pending" : presentation.status}
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
          {presentation.status === "unknown" && (
            <span className="tool-call-attention">
              {resolveUnknownStatusLabel(t)}
            </span>
          )}
          {presentation.attention?.map(({ kind }) => (
            <span key={kind} className="tool-call-attention" role="status">
              {resolveAttentionLabel(kind, t)}
            </span>
          ))}
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
            {/* F1: actual execution host (server-projected). Always rendered —
                unknown state shows "执行位置未知", never blank. Distinct from the
                dialog's intended runtimeBinding.target. */}
            <div
              data-hook="messages-esc-tool-call-row-exec-location"
              {...withLiteralClass(
                "tool-call-row__exec-location",
                toolStyles.execLocation
              )}
            >
              {formatToolExecutionLocationLine(
                presentation.executionLocation,
                createToolNameTranslator(t)
              )}
            </div>
            <ToolMessageContent
              toolName={message?.toolName}
              rawData={rawData}
              isError={isError}
              t={t}
              openPreview={() => {}}
              navigateToPage={() => {}}
              presentation="groupDetail"
              toolArgs={extractToolCallArgs(message?.toolPayload)}
              toolRunId={message?.toolPayload?.toolRunId ?? message?.toolRunId}
            />
          </div>
        )}
      </div>
    );
  }
);

export default ToolCallRow;
