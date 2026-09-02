import * as stylex from "@stylexjs/stylex";
import React, { useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAppSelector, useAppDispatch } from "app/store";
import {
  useToolRunsByMessageId,
  executeToolRun,
} from "ai/tools/toolRunStore";
import {
  buildConfirmActionGate,
  shouldShowToolMessageConfirmBanner,
  translateGateTitle,
} from "chat/toolConfirmPolicy";
import { messageToolConfirmBarStyles as styles } from "./messageToolConfirmBarStyles";
import { withLiteralClass } from "./toolMessageShared";
import "./messagesStylexEscapeHatch.css";

interface MessageToolConfirmBarProps {
  messageId?: string;
  isRobot: boolean;
}

export const MessageToolConfirmBar: React.FC<MessageToolConfirmBarProps> = ({
  messageId,
  isRobot,
}) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation("chat");
  const EMPTY_TOOL_RUNS = useMemo(() => [], []);

  const liveToolRuns = useToolRunsByMessageId(messageId ?? "");
  const toolRuns = messageId ? liveToolRuns : EMPTY_TOOL_RUNS;

  const confirmRun = useMemo(
    () =>
      toolRuns.find(
        (run) => shouldShowToolMessageConfirmBanner(run.toolName, run)
      ),
    [toolRuns]
  );

  const handleConfirmExecute = useCallback(() => {
    if (!confirmRun) return;
    // 避免重复点击
    if (confirmRun.status === "running") return;
    dispatch(executeToolRun({ id: confirmRun.id }));
  }, [dispatch, confirmRun]);

  if (!isRobot || !confirmRun) return null;

  const { status, toolName, error, input } = confirmRun;
  const actionGate = buildConfirmActionGate(toolName, confirmRun);

  // 按状态决定按钮文案和禁用态
  let buttonLabel = "";
  let buttonDisabled = false;

  if (status === "running") {
    buttonLabel = t("toolConfirm.executing");
    buttonDisabled = true;
  } else if (status === "succeeded") {
    if (toolName === "applyDiff") {
      buttonLabel = t("toolConfirm.patchApplied");
    } else {
      buttonLabel = t("toolConfirm.executed", { name: toolName });
    }
    buttonDisabled = true;
  } else if (status === "failed") {
    if (toolName === "applyDiff") {
      buttonLabel = t("toolConfirm.retryApplyPatch");
    } else {
      buttonLabel = t("toolConfirm.retryExec", { name: toolName });
    }
  } else {
    // pending / 预览后还未真正执行
    if (toolName === "deleteSpaces") {
      buttonLabel = t("toolConfirm.confirmDeleteSpaces");
    } else if (toolName === "applyDiff") {
      buttonLabel = t("toolConfirm.applyPatchDanger");
    } else if (actionGate) {
      buttonLabel = translateGateTitle(t, actionGate);
    } else {
      buttonLabel = t("toolConfirm.confirmExec", { name: toolName });
    }
  }

  // 成功/失败状态行文案
  let statusText: string | null = null;
  let statusClass: "success" | "failed" | null = null;

  if (status === "succeeded") {
    if (toolName === "applyDiff") {
      const filePath = input?.filePath || "";
      statusText = filePath
        ? t("toolConfirm.successPatch", { path: filePath })
        : t("toolConfirm.successExec", { name: "applyDiff" });
    } else {
      statusText = t("toolConfirm.successExec", { name: toolName });
    }
    statusClass = "success";
  } else if (status === "failed") {
    statusText = t("toolConfirm.failure", {
      error: error || t("toolConfirm.unknownError"),
    });
    statusClass = "failed";
  }

  return (
    <>
      <div
      data-testid="tool-confirm-row"
      {...withLiteralClass("tool-confirm-row", styles.row)}
    >
        <button
          type="button"
          data-hook="messages-esc-tool-confirm-button"
          {...withLiteralClass(
            "tool-confirm-button",
            styles.button,
            buttonDisabled && styles.buttonDisabled
          )}
          onClick={handleConfirmExecute}
          disabled={buttonDisabled}
        >
          {buttonLabel}
        </button>
        {statusText && (
          <div
            {...withLiteralClass(
              `tool-confirm-status ${statusClass === "success" ? "success" : "failed"}`,
              styles.status,
              statusClass === "success"
                ? styles.statusSuccess
                : styles.statusFailed
            )}
          >
            {statusText}
          </div>
        )}
      </div>
    </>
  );
};
