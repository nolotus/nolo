import { applyBuiltinAgentRuntimeOverride } from "agent-runtime/builtinPlatformAgentConfigs";
import React from "react";
import { DialogTrigger, Button as RACButton } from "react-aria-components";
import { useTranslation } from "react-i18next";
import { Popover } from "render/web/ui/Popover";
import { useAppDispatch, useAppSelector } from "app/store";
import { useFetchData } from "app/hooks";
import { useDialogContextUsage } from "chat/dialog/useDialogContextUsage";
import { selectCurrentDialogTokens } from "chat/dialog/dialogSlice";
import { useCurrentDialogConfig } from "chat/dialog/useCurrentDialogConfig";
import { getActiveDialogAgentId } from "chat/dialog/dialogAgents";
import { useCurrentDialogKey } from "chat/dialog/dialogRuntimeStore";
import { updateDialogSummaryAction } from "chat/dialog/actions/updateDialogSummaryAction";
import type { Agent } from "app/types";
import { DialogUsagePanel } from "./DialogUsagePanel";
import {
  formatCompactTokenCount,
  getContextWindowUsagePercent,
} from "chat/dialog/dialogUsageFormat";

export const DialogUsageTrigger: React.FC = () => {
  const { t } = useTranslation(["common", "chat"]);

  const dispatch = useAppDispatch();
  const dialogKey = useCurrentDialogKey();
  const tokenStats = useAppSelector(selectCurrentDialogTokens);
  const dialogConfig = useCurrentDialogConfig();
  const agentId = getActiveDialogAgentId(dialogConfig);
  const { data: agent, isLoading, error } = useFetchData<Agent>(agentId || undefined);
  // 内置 agent 的 model 以 catalog 为准：数据库里可能是过期值（刻意不迁移），
  // 直接拿它算窗口会显示一个和实际运行模型不符的容量。
  const resolvedAgent =
    agent && agentId ? applyBuiltinAgentRuntimeOverride(agentId, agent) : agent;
  const occupancy = useDialogContextUsage(resolvedAgent, dialogConfig?.summary, { isLoading: isLoading || (!!agentId && !agent && !error) });
  const { contextWindow, windowState } = occupancy;
  const percent = windowState === "known" && contextWindow
    ? getContextWindowUsagePercent(occupancy.tokens, contextWindow)
    : undefined;
  const chipLabel = windowState === "loading"
    ? t("chat:contextUsageLoadingChip")
    : windowState === "unknown"
      ? t(occupancy.estimated ? "chat:contextUsageUnknownChipEstimated" : "chat:contextUsageUnknownChip", { tokens: formatCompactTokenCount(occupancy.tokens) })
      : t(occupancy.estimated ? "chat:contextUsageEstimatedChip" : "chat:contextUsageKnownChip", { percent });
  const accessibleLabel = windowState === "loading"
    ? t("chat:contextUsageLoading")
    : t("chat:contextUsageChipLabel", { usage: chipLabel });
  // Use the unrounded ratio so 69.5% does not expose the >=70% action.
  const canCompact = windowState === "known" && !!contextWindow && occupancy.tokens / contextWindow >= 0.7;
  const compactContext = () => {
    if (!dialogKey) return;
    void dispatch(async (
      dispatch: (action: unknown) => Promise<unknown>,
      getState: () => unknown,
      extra: unknown
    ) => {
      const thunkApi = { dispatch, getState, extra };
      await updateDialogSummaryAction({ dialogKey, force: true, reason: "manual" }, thunkApi);
    });
  };

  return (
    <DialogTrigger>
      <RACButton
        className="dialog-usage-trigger composer-drawer__mini-progress"
        aria-label={accessibleLabel}
        // RAC ButtonProps 不接受 title，当前实现也会过滤它；保留兼容传参，读屏依赖 aria-label。
        {...{ title: accessibleLabel } as any}
      >
        {windowState === "known" && (
          <div className="composer-drawer__mini-progress-track">
            <div
              className="composer-drawer__mini-progress-fill"
              style={{ width: `${percent}%` }}
            />
          </div>
        )}
        <span className="composer-drawer__mini-progress-text">{chipLabel}</span>
      </RACButton>
      <Popover
        placement="top end"
        hideArrow
        offset={10}
        className="dialog-usage-popover"
      >
        <DialogUsagePanel
          tokenStats={tokenStats}
          contextTokens={occupancy.tokens}
          estimated={occupancy.estimated}
          contextWindow={contextWindow}
          windowState={windowState}
          compressionCount={dialogConfig?.compressionCount ?? 0}
        />
        {canCompact && (
          <RACButton className="dialog-usage-popover__compact" onPress={compactContext} isDisabled={!dialogKey}>
            {t("chat:contextUsageCompact")}
          </RACButton>
        )}
      </Popover>
    </DialogTrigger>
  );
};
