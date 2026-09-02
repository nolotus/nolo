// 纯展示组件，无 Redux/action 依赖，供游客/分享页使用
// 复用 ToolMessageItem 中已导出的 StatusIcon、safeParse、cssCore
import * as stylex from "@stylexjs/stylex";
import React, { memo, useMemo, useState } from "react";
import { LuChevronDown, LuChevronRight } from "react-icons/lu";
import { StatusIcon, safeParse, withLiteralClass } from "./toolMessageShared";
import ToolMessageContent from "./ToolMessageContent";
import {
  buildRunStreamingAgentHandoffPresentation,
  normalizeToolDisplaySummary,
  shouldToolMessageRowStartCollapsed,
} from "../toolPresentation";
import {
  extractToolCallArgs,
  formatToolRowHeaderSummary,
  resolveToolDisplayName,
} from "./toolDisplayName";
import { buildDialogUrl } from "chat/dialog/dialogUrl";
import { readOnlyToolMessageItemStyles as roStyles } from "./readOnlyToolMessageItemStyles";
import { messagesStyles } from "./messagesStyles";
import { toolMessageStyles } from "./toolMessageStyles";
import "./messagesStylexEscapeHatch.css";

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

export const ReadOnlyToolMessageItem = memo(({ message, conversationTodoEnabled = true }: { message: any; conversationTodoEnabled?: boolean }) => {
  const { content, toolName, isStreaming, toolPayload } = message;
  const rawData = useMemo(() => safeParse(content), [content]);

  const isError =
    toolPayload?.status === "failed" || !!toolPayload?.error || !!rawData?.error;
  const statusStr = isStreaming ? "running" : isError ? "failed" : "success";

  const displaySummary = useMemo(() => {
    return formatToolRowHeaderSummary({
      toolName,
      toolArgs: extractToolCallArgs(toolPayload),
      existingSummary: normalizeToolDisplaySummary(
        toolPayload?.summary || rawData?.summary || toolName || "",
        toolName
      ),
      // Share pages may lack i18n; still resolve via Chinese defaults.
      translate: (key, fallback) =>
        key.startsWith("toolNames.")
          ? resolveToolDisplayName(key.slice("toolNames.".length))
          : fallback,
    });
  }, [toolPayload, rawData, toolName]);

  const [collapsed, setCollapsed] = useState(() =>
    shouldToolMessageRowStartCollapsed({
      toolName,
      content,
      isError,
    })
  );

  if (toolName === "setTodoList" && !conversationTodoEnabled) return null;

  if (toolName === "runStreamingAgent") {
    const handoff = buildRunStreamingAgentHandoffPresentation({
      rawData,
      toolPayload,
      isStreaming,
      isError,
    });

    return (
      <div
        data-hook="messages-esc-tool-row"
        {...withLiteralClass(["tool-msg-row", statusStr, collapsed ? "is-collapsed" : ""].filter(Boolean).join(" "), toolMessageStyles.row, roStyles.rowHandoff)}
      >
        <button
          type="button"
          data-hook="messages-esc-tr-header" {...withLiteralClass("tr-header", toolMessageStyles.header)}
          style={TR_HEADER_BUTTON_STYLE}
          onClick={() => setCollapsed((p) => !p)}
          aria-expanded={!collapsed}
        >
          <div  {...withLiteralClass("tr-main", toolMessageStyles.main)}>
            <div

              {...withLiteralClass(`tr-icon ${statusStr}`, toolMessageStyles.icon)}
            >
              <StatusIcon status={statusStr} toolName={toolName} />
            </div>
            <span data-hook="messages-esc-tr-summary" {...withLiteralClass("tr-summary u-truncate", toolMessageStyles.truncate, toolMessageStyles.summary)}>{handoff.summary}</span>
          </div>
          <div  data-hook="messages-esc-tr-chevron" {...withLiteralClass("tr-chevron", toolMessageStyles.chevron)} aria-hidden="true">
            {collapsed ? <LuChevronRight size={14} aria-hidden="true" /> : <LuChevronDown size={14} aria-hidden="true" />}
          </div>
        </button>

        {!collapsed && (
          <div  {...withLiteralClass("tr-body handoff-tool__body", toolMessageStyles.body, roStyles.handoffBody)}>
            {!handoff.inline && (
              <div  {...withLiteralClass("handoff-tool__detail-row", roStyles.handoffDetailRow)}>
                <span  {...withLiteralClass("handoff-tool__label", roStyles.handoffLabel)}>子 dialog</span>
                {handoff.targetDialogKey ? (
                  <a
                    
                    {...withLiteralClass("handoff-tool__link", roStyles.handoffLink)}
                    href={buildDialogUrl(
                      handoff.targetDialogKey,
                      handoff.targetSpaceId
                    )}
                  >
                    打开对话
                  </a>
                ) : (
                  <span  {...withLiteralClass("handoff-tool__value", roStyles.handoffValue)}>未单独创建</span>
                )}
              </div>
            )}
            <div  {...withLiteralClass("handoff-tool__detail-row", roStyles.handoffDetailRow)}>
              <span  {...withLiteralClass("handoff-tool__label", roStyles.handoffLabel)}>目标 Agent</span>
              <span
                
                {...withLiteralClass("handoff-tool__value", roStyles.handoffValue)}
                title={handoff.agentKey || undefined}
              >
                {handoff.targetLabel}
              </span>
            </div>
            <div  {...withLiteralClass("handoff-tool__detail-row", roStyles.handoffDetailRow)}>
              <span  {...withLiteralClass("handoff-tool__label", roStyles.handoffLabel)}>输入摘要</span>
              <span  {...withLiteralClass("handoff-tool__value", roStyles.handoffValue)}>{handoff.inputSummary}</span>
            </div>
            <div  {...withLiteralClass("handoff-tool__detail-row", roStyles.handoffDetailRow)}>
              <span  {...withLiteralClass("handoff-tool__label", roStyles.handoffLabel)}>状态</span>
              <span  {...withLiteralClass("handoff-tool__value", roStyles.handoffValue)}>{handoff.statusLabel}</span>
            </div>
          </div>
        )}
      </div>
    );
  }
  if (toolName === "ask_user" || rawData?.type === "ask_user") return null;

  return (
    <div
      data-hook="messages-esc-tool-row"
      {...withLiteralClass(`tool-msg-row ${statusStr} ${collapsed ? "is-collapsed" : ""}`, toolMessageStyles.row)}
    >
      <button
        type="button"
        data-hook="messages-esc-tr-header"
        {...withLiteralClass("tr-header", toolMessageStyles.header)}
        style={TR_HEADER_BUTTON_STYLE}
        onClick={() => setCollapsed((p) => !p)}
        aria-expanded={!collapsed}
      >
        <div  {...withLiteralClass("tr-main", toolMessageStyles.main)}>
          <div

            {...withLiteralClass(`tr-icon ${statusStr}`, toolMessageStyles.icon)}
          >
            <StatusIcon status={statusStr} toolName={toolName} />
          </div>
          <span data-hook="messages-esc-tr-summary" {...withLiteralClass("tr-summary u-truncate", toolMessageStyles.truncate, toolMessageStyles.summary)}>{displaySummary}</span>
        </div>
        <div  data-hook="messages-esc-tr-chevron" {...withLiteralClass("tr-chevron", toolMessageStyles.chevron)} aria-hidden="true">
          {collapsed ? <LuChevronRight size={14} aria-hidden="true" /> : <LuChevronDown size={14} aria-hidden="true" />}
        </div>
      </button>

      {!collapsed && (
        <div  {...withLiteralClass("tr-body", toolMessageStyles.body)} data-hook="messages-esc-tr-body">
          <ToolMessageContent
            toolName={toolName}
            rawData={rawData}
            isError={isError}
            t={((_key: string, fallback?: any) =>
              typeof fallback === "string"
                ? fallback
                : fallback?.defaultValue || _key) as any}
            openPreview={() => {}}
            navigateToPage={() => {}}
            conversationTodoEnabled={conversationTodoEnabled}
          />
        </div>
      )}
    </div>
  );
});

export default ReadOnlyToolMessageItem;
