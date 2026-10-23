import { applyBuiltinAgentRuntimeOverride } from "agent-runtime/builtinPlatformAgentConfigs";
import React from "react";
import { DialogTrigger, Button as RACButton } from "react-aria-components";
import { useTranslation } from "react-i18next";
import { Popover } from "render/web/ui/Popover";
import { useAppSelector } from "app/store";
import { useFetchData } from "app/hooks";
import { useDialogContextUsage } from "chat/dialog/useDialogContextUsage";
import { selectCurrentDialogTokens } from "chat/dialog/dialogSlice";
import { useCurrentDialogConfig } from "chat/dialog/useCurrentDialogConfig";
import { getActiveDialogAgentId } from "chat/dialog/dialogAgents";
import type { Agent } from "app/types";
import { DialogUsagePanel } from "./DialogUsagePanel";
import {
  getContextWindowUsagePercent,
} from "chat/dialog/dialogUsageFormat";

export const DialogUsageTrigger: React.FC = () => {
  const { t } = useTranslation(["common", "chat"]);

  const tokenStats = useAppSelector(selectCurrentDialogTokens);
  const dialogConfig = useCurrentDialogConfig();
  const agentId = getActiveDialogAgentId(dialogConfig);
  const { data: agent } = useFetchData<Agent>(agentId || undefined);
  // 内置 agent 的 model 以 catalog 为准：数据库里可能是过期值（刻意不迁移），
  // 直接拿它算窗口会显示一个和实际运行模型不符的容量。
  const resolvedAgent =
    agent && agentId ? applyBuiltinAgentRuntimeOverride(agentId, agent) : agent;
  // 通道感知的 context window：devin 通道用通道真值表（未登记 id 回落全局表），
  // 其余通道走全局 MODEL_LOOKUP_MAP。切换小窗口模型后这里会立即反映真实容量。
  const occupancy = useDialogContextUsage(resolvedAgent, dialogConfig?.summary);
  const { contextWindow } = occupancy;
  const percent = contextWindow
    ? getContextWindowUsagePercent(occupancy.tokens, contextWindow)
    : undefined;

  // Only estimates carry the estimate badge; unknown windows never get a percent.
  const percentLabel = percent === undefined
    ? t("chat:contextWindowUnknown")
    : t("chat:contextOccupancyPercent", { percent });
  const percentEstimate = t("chat:contextUsageEstimate", "est.");

  return (
    <DialogTrigger>
      <RACButton
        className="dialog-usage-trigger composer-drawer__mini-progress"
        aria-label={percentLabel}
        {...{
          title: percentLabel,
        } as any}
      >
        <div className="composer-drawer__mini-progress-track">
          <div
            className="composer-drawer__mini-progress-fill"
            style={{ width: `${Math.min(100, Math.max(0, percent ?? 0))}%` }}
          />
        </div>
        <span className="composer-drawer__mini-progress-text">
          {percent === undefined ? t("chat:contextWindowUnknown") : `${percent}%`}
          <span className="composer-drawer__mini-progress-estimate">
            {occupancy.estimated ? percentEstimate : ""}
          </span>
        </span>
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
          compressionCount={dialogConfig?.compressionCount ?? 0}
        />
      </Popover>
    </DialogTrigger>
  );
};
