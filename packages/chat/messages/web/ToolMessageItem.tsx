import * as stylex from "@stylexjs/stylex";
import React, { memo, useMemo, useState, useEffect, useRef } from "react";
import {
  LuChevronDown,
  LuChevronRight,
  LuCopy,
  LuCode,
  LuTrash2,
  LuCircle,
  LuArrowRight,
} from "react-icons/lu";
import { useTranslation } from "react-i18next";
import { useNavigate } from "app/routing";
import { useAppDispatch, useAppSelector } from "app/store";
import { toast } from "app/utils/toast";

import DocxPreviewDialog from "render/web/ui/modal/DocxPreviewDialog";
import ToolMessageContent from "./ToolMessageContent";
import AskChoicePanelWeb from "./AskChoicePanelWeb";
import Editor from "create/editor/Editor";

import copyToClipboard from "app/utils/clipboard";
import { selectMsgById } from "../messageSlice";
import { useMessageDelete } from "../hooks/useMessageDelete";
import { updateToolMessage } from "../messageSlice";
import { handleSendMessage } from "chat/dialog/dialogSlice";
import { executeToolRun, useToolRunById } from "ai/tools/toolRunStore";
import { markdownToSlate } from "create/editor/transforms/markdownToSlate";
import { streamAgentChatTurn } from "ai/agent/agentSlice";
import { buildDialogUrl } from "chat/dialog/dialogUrl";
import { messagesStyles as styles } from "./messagesStyles";
import { toolMessageStyles as toolStyles, toolMessageStatusStyles } from "./toolMessageStyles";
import "./messagesStylexEscapeHatch.css";
import { safeParse, StatusIcon, withLiteralClass } from "./toolMessageShared";
import {
  buildRunStreamingAgentHandoffPresentation,
  normalizeToolDisplaySummary,
} from "../toolPresentation";
import { shouldShowToolMessageConfirmBanner } from "chat/toolConfirmPolicy";
import { write } from "database/dbSlice";
import { DataType } from "create/types";
import { compactWhitespace } from "core/compactWhitespace";
import { asOptionalTrimmedString } from "core/optionalString";
import { asTrimmedString } from "core/trimmedString";
import {
  createToolNameTranslator,
  extractToolCallArgs,
  formatToolRowHeaderSummary,
} from "./toolDisplayName";

const normalizeParallelPreview = (value: unknown) => {
  const text = asTrimmedString(value);
  if (!text) return "";
  return compactWhitespace(text).slice(0, 160);
};

/** Button reset so `.tr-header` / toggle keep layout when used as `<button>`. */
const TR_HEADER_BUTTON_STYLE: React.CSSProperties = {
  width: "100%",
  margin: 0,
  font: "inherit",
  color: "inherit",
  textAlign: "left",
  background: "transparent",
  appearance: "none",
};

const TR_HEADER_TOGGLE_STYLE: React.CSSProperties = {
  ...TR_HEADER_BUTTON_STYLE,
  width: "auto",
  flex: 1,
  minWidth: 0,
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 6,
  padding: 0,
  border: "none",
  cursor: "pointer",
};

export const ToolMessageItem = memo(
  ({ message, readOnly = false, conversationTodoEnabled = true }: { message: any; readOnly?: boolean; conversationTodoEnabled?: boolean }) => {
    const { t } = useTranslation("chat");
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const { content, toolName, isStreaming, toolPayload, dbKey } = message;
    // The host passes this flag explicitly so this renderer does not add a new
    // Redux dependency while the state layer is being retired.
    const todoEnabled = conversationTodoEnabled;
    const rawData = useMemo(() => safeParse(content), [content]);

    const isRepairableFailure =
      rawData?.code === "PREFLIGHT_FAILED" && !!rawData?.repairPlan;
    const isError =
      (toolPayload?.status === "failed" ||
        !!toolPayload?.error ||
        !!rawData?.error) &&
      !isRepairableFailure;
    const statusStr = isStreaming
      ? "running"
      : isRepairableFailure
        ? "repairing"
        : isError
          ? "failed"
          : "success";

    const toolRunId = toolPayload?.toolRunId;
    const activeRun = useToolRunById(toolRunId ?? "");

    const displaySummary = useMemo(() => {
      if (isRepairableFailure) {
        const count = Array.isArray(rawData?.issues)
          ? rawData.issues.length
          : 0;
        return t(
          "tool.preflightRepairing",
          "预检发现 {{count}} 个问题，正在自动修复…",
          { count },
        );
      }
      const summarySource =
        (activeRun?.status === "running" && activeRun.outputSummary) ||
        activeRun?.outputSummary ||
        toolPayload?.summary ||
        rawData?.summary ||
        toolName ||
        "";
      return formatToolRowHeaderSummary({
        toolName,
        toolArgs: extractToolCallArgs(toolPayload),
        existingSummary: normalizeToolDisplaySummary(summarySource, toolName),
        translate: createToolNameTranslator((key, options) =>
          String(t(key, options as any)),
        ),
      });
    }, [isRepairableFailure, rawData, activeRun, toolPayload, toolName, t]);

    const renderRunProgress = () => {
      if (!activeRun || activeRun.toolName !== "appDeploy") return null;
      const steps = Array.isArray(activeRun.steps) ? activeRun.steps : [];
      const summary = activeRun.outputSummary?.trim();
      if (!summary && steps.length === 0) return null;

      return (
        <div {...withLiteralClass("tool-run-progress", toolStyles.stepProgress)}>
          {summary && <div  {...withLiteralClass("tr-progress-summary", styles.trProgressSummary)}>{summary}</div>}
          {steps.length > 0 && (
            <div  {...withLiteralClass("tr-step-list", styles.trStepList)}>
              {steps.map((step) => (
                <div key={step.id} {...withLiteralClass(`tr-step is-${step.status}`, styles.trStep)}>
                  <span  {...withLiteralClass("tr-step-dot", styles.trStepDot, step.status === "running" && styles.trStepRunning, step.status === "succeeded" && styles.trStepCompleted, step.status === "failed" && styles.trStepFailed)} />
                  <div  {...withLiteralClass("tr-step-texts", styles.trStepTexts)}>
                    <div  {...withLiteralClass("tr-step-label", styles.trStepLabel)}>{step.label}</div>
                    {step.detail && (
                      <div  {...withLiteralClass("tr-step-detail", styles.trStepDetail)}>{step.detail}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    };

    // 找到触发该 tool 的上游 assistant 消息，用于自动续跑时确定 Agent
    const parentAssistant = useAppSelector((state) =>
      message.parentMessageId
        ? selectMsgById(state, message.parentMessageId)
        : undefined,
    );
    const parentAgentKey: string | undefined = parentAssistant?.cybotKey;

    const showConfirmBanner = shouldShowToolMessageConfirmBanner(
      toolName,
      activeRun,
    );

    const [collapsed, setCollapsed] = useState(() => {
      // 进行中 / 需用户操作 / 失败：展开（失败要让用户看见错误）。
      if (showConfirmBanner || isStreaming || isRepairableFailure || isError)
        return false;
      // 个别工具（如星盘）产品上要求默认可见。
      if (toolName === "ziweiChart") return false;
      // 已完成的工具行默认折叠 —— loop 里只让“当前正在跑”的那行展开，
      // 旧行收起，避免一长串摊开；想看详情再点开。
      return true;
    });
    const userCollapsedOverrideRef = useRef(false);
    const [showDebug, setShowDebug] = useState(false);
    const [preview, setPreview] = useState<{ id: string; name: string } | null>(
      null,
    );

    useEffect(() => {
      if (showConfirmBanner) setCollapsed(false);
    }, [showConfirmBanner]);

    useEffect(() => {
      if (toolName === "ziweiChart") {
        userCollapsedOverrideRef.current = true;
        setCollapsed(false);
      }
    }, [toolName]);

    // 只让当前活动行展开：进行中展开，一完成(success)即折叠；
    // 失败保持展开；用户手动展开/折叠后不再被自动抢回。
    // 基于 statusStr 而非 isStreaming，刷新/历史加载的已完成行也会正确折叠。
    useEffect(() => {
      if (showConfirmBanner) return;
      if (statusStr === "running" || statusStr === "repairing") {
        userCollapsedOverrideRef.current = false;
        setCollapsed(false);
        return;
      }
      if (statusStr === "success" && !userCollapsedOverrideRef.current) {
        setCollapsed(true);
      }
    }, [statusStr, showConfirmBanner]);

    const handleCopy = (e: React.MouseEvent) => {
      e.stopPropagation();
      const txt =
        typeof rawData === "string"
          ? rawData
          : JSON.stringify(rawData, null, 2);
      copyToClipboard(txt, { onSuccess: () => toast.success("Copied") });
    };

    // 点击删除按钮 -> 打开确认弹窗
    const { openConfirm: handleDeleteClick, modal: deleteConfirmModal } =
      useMessageDelete({ dbKey, confirmMessageKey: "delConfirm", t });

    const applyConfirmedToolResult = (result: any) => {
      const nextRawData = result?.rawData ?? {};
      const nextSummary =
        asOptionalTrimmedString(result?.displayData) ??
        (activeRun?.outputSummary || toolPayload?.summary || displaySummary);
      const nextToolPayload = {
        ...(toolPayload ?? {}),
        toolName,
        status: "succeeded",
        input: activeRun?.input ?? toolPayload?.input,
        rawToolCall: toolPayload?.rawToolCall,
        toolRunId,
        summary: nextSummary,
      };
      const changes = {
        content: JSON.stringify(nextRawData),
        isStreaming: false,
        toolName,
        toolRunId,
        toolPayload: nextToolPayload,
      };

      dispatch(updateToolMessage({ id: message.id, changes }));
      if (dbKey) {
        dispatch(
          write({
            data: {
              ...message,
              ...changes,
              type: DataType.MSG,
            },
            customKey: dbKey,
          }),
        );
      }
    };

    // --- conversation Todo ---
    // Keep all hooks above unconditional so toggling the setting cannot change
    // hook order for an already-mounted tool row.
    if (toolName === "setTodoList" && !todoEnabled) {
      return null;
    }

    // --- ask_user ---
    if (toolName === "ask_user" || rawData?.type === "ask_user") {
      if (readOnly) return null; // 只读模式不显示交互选择框
      const isResolved =
        !!rawData?.selected || !!rawData?.cancelled || !!rawData?.answers;
      return (
        <>
          <AskChoicePanelWeb
            rawData={rawData}
            toolPayload={toolPayload}
            dbKey={dbKey}
            interactive={!isResolved && !isStreaming}
            onDelete={handleDeleteClick}
          />
          {deleteConfirmModal}
        </>
      );
    }

    if (toolName === "runStreamingAgent") {
      const handoff = buildRunStreamingAgentHandoffPresentation({
        rawData,
        toolPayload,
        isStreaming,
        isError,
      });

      return (
        <>
          <div

            {...withLiteralClass(`tool-msg-row tool-msg-row--handoff ${statusStr} ${collapsed ? "is-collapsed" : ""}`, toolStyles.row, toolStyles.rowHandoff, collapsed && toolStyles.rowCollapsed, toolMessageStatusStyles[statusStr as keyof typeof toolMessageStatusStyles]?.row)}
          >
            <button
              type="button"
              data-hook="messages-esc-tr-header" {...withLiteralClass("tr-header", toolStyles.header, toolMessageStatusStyles[statusStr as keyof typeof toolMessageStatusStyles]?.header)}
              style={TR_HEADER_BUTTON_STYLE}
              onClick={() => {
                userCollapsedOverrideRef.current = true;
                setCollapsed((p) => !p);
              }}
              aria-expanded={!collapsed}
            >
              <div  {...withLiteralClass("tr-main", toolStyles.main)}>
                <div
                  {...withLiteralClass(`tr-icon ${statusStr}`, toolStyles.icon, toolMessageStatusStyles[statusStr as keyof typeof toolMessageStatusStyles]?.icon)}>
                  <StatusIcon status={statusStr} toolName={toolName} />
                </div>
                <span  data-hook="messages-esc-tr-summary" {...withLiteralClass("tr-summary u-truncate", toolStyles.truncate, toolStyles.summary, toolMessageStatusStyles[statusStr as keyof typeof toolMessageStatusStyles]?.summary)}>{handoff.summary}</span>
              </div>
              <div  aria-hidden="true" data-hook="messages-esc-tr-chevron" {...withLiteralClass("tr-chevron", toolStyles.chevron)}>
                {collapsed ? (
                  <LuChevronRight size={14} />
                ) : (
                  <LuChevronDown size={14} />
                )}
              </div>
            </button>

            {!collapsed && (
              <div  {...withLiteralClass("tr-body handoff-tool__body", toolStyles.body, toolStyles.handoffBody, toolMessageStatusStyles[statusStr as keyof typeof toolMessageStatusStyles]?.body)} data-hook="messages-esc-tr-body">
                {!handoff.inline && (
                  <div {...withLiteralClass("handoff-tool__detail-row", toolStyles.handoffDetailRow)}>
                    <span {...withLiteralClass("handoff-tool__label", toolStyles.handoffLabel)}>子 dialog</span>
                    {handoff.targetDialogKey ? (
                      <button
                        type="button"
                        data-hook="messages-esc-handoff-link" {...withLiteralClass("handoff-tool__link", toolStyles.handoffLink)}
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(
                            buildDialogUrl(
                              handoff.targetDialogKey,
                              handoff.targetSpaceId,
                            ),
                          );
                        }}
                      >
                        <span>打开对话</span>
                        <LuArrowRight size={14} aria-hidden="true" />
                      </button>
                    ) : (
                      <span {...withLiteralClass("handoff-tool__value", toolStyles.handoffValue)}>未单独创建</span>
                    )}
                  </div>
                )}
                <div {...withLiteralClass("handoff-tool__detail-row", toolStyles.handoffDetailRow)}>
                  <span {...withLiteralClass("handoff-tool__label", toolStyles.handoffLabel)}>目标 Agent</span>
                  <span
                    {...withLiteralClass("handoff-tool__value", toolStyles.handoffValue)}
                    title={handoff.agentKey || undefined}
                  >
                    {handoff.targetLabel}
                  </span>
                </div>
                <div {...withLiteralClass("handoff-tool__detail-row", toolStyles.handoffDetailRow)}>
                  <span {...withLiteralClass("handoff-tool__label", toolStyles.handoffLabel)}>输入摘要</span>
                  <span {...withLiteralClass("handoff-tool__value", toolStyles.handoffValue)}>
                    {handoff.inputSummary}
                  </span>
                </div>
                <div {...withLiteralClass("handoff-tool__detail-row", toolStyles.handoffDetailRow)}>
                  <span {...withLiteralClass("handoff-tool__label", toolStyles.handoffLabel)}>状态</span>
                  <span {...withLiteralClass("handoff-tool__value", toolStyles.handoffValue)}>
                    {handoff.statusLabel}
                  </span>
                </div>
              </div>
            )}
          </div>
          {deleteConfirmModal}
        </>
      );
    }

    // --- 普通 tool 卡片 ---
    return (
      <>
        <div
          data-hook="messages-esc-tool-row"
          {...withLiteralClass(`tool-msg-row ${statusStr} ${collapsed ? "is-collapsed" : ""} ${toolName === "appDeploy" ? "tool-msg-row--app-deploy" : ""}`, toolStyles.row, toolName === "appDeploy" && toolStyles.rowAppDeploy, collapsed && toolStyles.rowCollapsed, toolMessageStatusStyles[statusStr as keyof typeof toolMessageStatusStyles]?.row)}
        >
          {/* Header shell stays a div so nested action buttons are valid HTML;
            expand/collapse is a real <button>, not div-onClick. */}
          <div data-hook="messages-esc-tr-header" {...withLiteralClass("tr-header", toolStyles.header, toolMessageStatusStyles[statusStr as keyof typeof toolMessageStatusStyles]?.header)}>
            <button
              type="button"
              
              {...withLiteralClass("tr-header-toggle", toolStyles.headerToggle)}
              style={TR_HEADER_TOGGLE_STYLE}
              onClick={() => {
                userCollapsedOverrideRef.current = true;
                setCollapsed((p) => !p);
              }}
              aria-expanded={!collapsed}
            >
              <div  {...withLiteralClass("tr-main", toolStyles.main)}>
                <div
                  {...withLiteralClass(`tr-icon ${statusStr}`, toolStyles.icon, toolMessageStatusStyles[statusStr as keyof typeof toolMessageStatusStyles]?.icon)}>
                  <StatusIcon status={statusStr} toolName={toolName} />
                </div>
                <span  data-hook="messages-esc-tr-summary" {...withLiteralClass("tr-summary u-truncate", toolStyles.truncate, toolStyles.summary, toolMessageStatusStyles[statusStr as keyof typeof toolMessageStatusStyles]?.summary)}>{displaySummary}</span>
              </div>
              <div  aria-hidden="true" data-hook="messages-esc-tr-chevron" {...withLiteralClass("tr-chevron", toolStyles.chevron)}>
                {collapsed ? (
                  <LuChevronRight size={14} />
                ) : (
                  <LuChevronDown size={14} />
                )}
              </div>
            </button>

            {!readOnly && (
              <div  {...withLiteralClass("tr-actions", toolStyles.actions)}>
                <div data-hook="messages-esc-tr-act-bar" {...withLiteralClass("tr-act-bar", toolStyles.actionBar)}>
                  <button
                    type="button"
                    onClick={handleCopy}
                    data-hook="messages-esc-tr-act-btn"
                    {...withLiteralClass("tr-act-btn", toolStyles.actionButton)}
                    title={t("common:copy", "复制")}
                    aria-label={t("common:copy", "复制")}
                  >
                    <LuCopy size={12} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDebug(!showDebug)}

                    data-hook="messages-esc-tr-act-btn" {...withLiteralClass(`tr-act-btn ${showDebug ? "on" : ""}`, toolStyles.actionButton, showDebug && toolStyles.actionButtonOn)}
                    title={
                      showDebug
                        ? t("hideDebug", "隐藏调试")
                        : t("showDebug", "显示调试")
                    }
                    aria-label={
                      showDebug
                        ? t("hideDebug", "隐藏调试")
                        : t("showDebug", "显示调试")
                    }
                    aria-pressed={showDebug}
                  >
                    <LuCode size={12} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteClick}
                    data-hook="messages-esc-tr-act-btn-danger"
                    {...withLiteralClass("tr-act-btn danger", toolStyles.actionButton)}
                    title={t("delete", "删除")}
                    aria-label={t("delete", "删除")}
                  >
                    <LuTrash2 size={12} aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {!collapsed && (
            <div data-hook="messages-esc-tr-body" {...withLiteralClass("tr-body", toolStyles.body, toolName === "appDeploy" && toolStyles.bodyAppDeploy, toolMessageStatusStyles[statusStr as keyof typeof toolMessageStatusStyles]?.body)}>
              {showConfirmBanner && activeRun && (
                <div  {...withLiteralClass("confirm-banner", toolStyles.confirmBanner)}>
                  <div  {...withLiteralClass("cb-text", toolStyles.confirmText)}>
                    {activeRun.status === "failed" ? (
                      <span {...withLiteralClass("u-error-text", toolStyles.errorText)}>
                        {activeRun.error ||
                          t("tool.failed", "Execution failed")}
                      </span>
                    ) : (
                      <span>
                        {activeRun.status === "running"
                          ? t("tool.executing", "Executing...")
                          : t("tool.requiresApproval", "Requires Approval")}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    data-hook="messages-esc-btn-primary-sm" {...withLiteralClass("btn-primary-sm", toolStyles.primaryButton)}
                    disabled={activeRun.status === "running"}
                    aria-label={
                      activeRun.status === "running"
                        ? t("tool.executing", "Executing...")
                        : undefined
                    }
                    onClick={() => {
                      if (!activeRun) return;
                      dispatch(executeToolRun({ id: activeRun.id }))
                        .unwrap()
                        .then((result) => {
                          applyConfirmedToolResult(result);
                          // 工具真正执行完毕后，自动触发当前 Agent 继续执行
                          if (parentAgentKey) {
                            dispatch(
                              streamAgentChatTurn({
                                agentKey: parentAgentKey,
                                userInput: t("tool.resumePrompt", {
                                  defaultValue:
                                    "请基于刚才工具执行的结果继续完成你之前的计划；如果任务已经完成，请用简洁的方式总结结果。",
                                }),
                              }),
                            );
                          }
                        })
                        .catch(() => {
                          // 失败时不自动续跑
                        });
                    }}
                  >
                    {activeRun.status === "running" ? (
                      <LuCircle {...withLiteralClass("icon-primary", styles.iconPrimary)} aria-hidden="true" />
                    ) : activeRun.status === "failed" ? (
                      t("common.retry", "Retry")
                    ) : toolName === "deleteSpaces" ? (
                      "确认删除"
                    ) : (
                      t("common.run", "Run")
                    )}
                  </button>
                </div>
              )}

              {renderRunProgress()}

              <ToolMessageContent
                toolName={toolName}
                rawData={rawData}
                isError={isError}
                t={t as any}
                openPreview={(id, name) => setPreview({ id, name })}
                navigateToPage={(id) => navigate(`/${id}`)}
                toolArgs={extractToolCallArgs(toolPayload)}
                conversationTodoEnabled={todoEnabled}
              />
            </div>
          )}

          {showDebug && (
            <div  {...withLiteralClass("debug-box", toolStyles.debugBox)}>
              <pre>{JSON.stringify(toolPayload || rawData, null, 2)}</pre>
            </div>
          )}

          {preview && (
            <DocxPreviewDialog
              isOpen
              onClose={() => setPreview(null)}
              pageKey={preview.id}
              fileName={preview.name}
            />
          )}
        </div>
        {deleteConfirmModal}
      </>
    );
  },
);

export default ToolMessageItem;
