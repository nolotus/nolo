// packages/chat/web/useMessageInputDeleteConfirm.ts
// Pending delete tool-run confirmation above the message composer.

import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch } from "app/store";
import { write } from "database/dbSlice";
import { DataType } from "create/types";
import { streamAgentChatTurn } from "ai/agent/agentSlice";
import { executeToolRun } from "ai/tools/toolRunStore";
import { updateToolMessage } from "../messages/messageSlice";
import {
  buildConfirmActionGate,
  collectDeleteConfirmIds,
  getDeleteConfirmConfig,
  parseDeleteConfirmPreview,
  resolveDeleteConfirmLabel,
  translateGateTitle,
} from "chat/toolConfirmPolicy";

export function useMessageInputDeleteConfirm(input: {
  allToolRuns: any[];
  currentMessages: any[];
}) {
  const { allToolRuns, currentMessages } = input;
  const dispatch = useAppDispatch();
  const { t } = useTranslation("chat");
  const [dismissedConfirmRunIds, setDismissedConfirmRunIds] = useState<
    Set<string>
  >(() => new Set());

  const pendingDeleteRun = useMemo(
    () =>
      [...allToolRuns]
        .reverse()
        .find(
          (run) =>
            !!getDeleteConfirmConfig(run.toolName) &&
            run.interaction === "confirm" &&
            (run.status === "pending" ||
              run.status === "running" ||
              run.status === "failed") &&
            !dismissedConfirmRunIds.has(run.id)
        ),
    [allToolRuns, dismissedConfirmRunIds]
  );
  const pendingDeleteConfig = getDeleteConfirmConfig(
    pendingDeleteRun?.toolName
  );

  const pendingDeleteMessage = useMemo(
    () =>
      pendingDeleteRun
        ? currentMessages.find(
            (message: any) =>
              message?.toolPayload?.toolRunId === pendingDeleteRun.id
          )
        : null,
    [currentMessages, pendingDeleteRun]
  );

  const pendingDeletePreview = useMemo(() => {
    return parseDeleteConfirmPreview(pendingDeleteMessage?.content);
  }, [pendingDeleteMessage]);

  const pendingDeleteActionGate = useMemo(
    () => buildConfirmActionGate(pendingDeleteRun?.toolName, pendingDeleteRun),
    [pendingDeleteRun]
  );

  const pendingDeleteLabel = useMemo(() => {
    const fallback =
      pendingDeleteRun?.input?.query ||
      pendingDeleteMessage?.toolPayload?.summary ||
      (pendingDeleteActionGate
        ? translateGateTitle(t, pendingDeleteActionGate)
        : undefined) ||
      (pendingDeleteConfig?.fallbackLabel
        ? t(pendingDeleteConfig.fallbackLabel)
        : undefined) ||
      t("toolConfirm.fallbackMatched");
    return resolveDeleteConfirmLabel({
      config: pendingDeleteConfig,
      preview: pendingDeletePreview,
      fallback,
      translateMultiple: ({ title, count, entity }) =>
        t("toolConfirm.deleteLabelMultiple", {
          title,
          count,
          entity: t(entity),
        }),
    });
  }, [
    pendingDeleteActionGate,
    pendingDeleteConfig,
    pendingDeleteMessage,
    pendingDeletePreview,
    pendingDeleteRun,
    t,
  ]);

  const pendingDeleteFailureLabel = useMemo(
    () =>
      pendingDeleteConfig?.failureLabel
        ? t(pendingDeleteConfig.failureLabel)
        : "",
    [pendingDeleteConfig, t]
  );

  const handleConfirmDelete = useCallback(() => {
    if (!pendingDeleteRun || !pendingDeleteConfig) return;
    const confirmedIds = collectDeleteConfirmIds({
      config: pendingDeleteConfig,
      preview: pendingDeletePreview,
    });
    if (confirmedIds.length === 0) return;
    dispatch(
      executeToolRun({
        id: pendingDeleteRun.id,
        inputOverride: {
          ...(pendingDeleteRun.input ?? {}),
          [pendingDeleteConfig.confirmedInputKey]: confirmedIds,
        },
      })
    )
      .unwrap()
      .then((result: any) => {
        const toolMessage = pendingDeleteMessage;
        const nextSummary =
          (typeof result?.displayData === "string" &&
            result.displayData.trim()) ||
          pendingDeleteRun.outputSummary ||
          toolMessage?.toolPayload?.summary ||
          t(pendingDeleteConfig.executedSummary);
        if (toolMessage?.id) {
          const changes = {
            content: JSON.stringify(result?.rawData ?? {}),
            isStreaming: false,
            toolName: pendingDeleteRun.toolName,
            toolRunId: pendingDeleteRun.id,
            toolPayload: {
              ...(toolMessage.toolPayload ?? {}),
              toolName: pendingDeleteRun.toolName,
              status: "succeeded",
              input: pendingDeleteRun.input,
              rawToolCall: toolMessage.toolPayload?.rawToolCall,
              toolRunId: pendingDeleteRun.id,
              summary: nextSummary,
            },
          };
          dispatch(
            updateToolMessage({ id: toolMessage.id, changes: changes as any })
          );
          if (toolMessage.dbKey) {
            dispatch(
              write({
                data: {
                  ...toolMessage,
                  ...changes,
                  type: DataType.MSG,
                },
                customKey: toolMessage.dbKey,
              })
            );
          }
        }

        const parentAssistant = currentMessages.find(
          (message: any) => message?.id === pendingDeleteRun.messageId
        );
        const parentAgentKey = parentAssistant?.cybotKey;
        if (parentAgentKey) {
          dispatch(
            streamAgentChatTurn({
              agentKey: parentAgentKey,
              userInput: t("tool.resumePrompt", {
                defaultValue:
                  "请基于刚才工具执行的结果继续完成你之前的计划；如果任务已经完成，请用简洁的方式总结结果。",
              }),
            })
          );
        }
      })
      .catch(() => undefined);
  }, [
    currentMessages,
    dispatch,
    pendingDeleteConfig,
    pendingDeleteMessage,
    pendingDeletePreview,
    pendingDeleteRun,
    t,
  ]);

  const handleDismissDelete = useCallback(() => {
    if (!pendingDeleteRun) return;
    setDismissedConfirmRunIds((prev) => {
      const next = new Set(prev);
      next.add(pendingDeleteRun.id);
      return next;
    });
  }, [pendingDeleteRun]);

  return {
    pendingDeleteRun,
    pendingDeleteConfig,
    pendingDeletePreview,
    pendingDeleteLabel,
    pendingDeleteFailureLabel,
    handleConfirmDelete,
    handleDismissDelete,
  };
}
