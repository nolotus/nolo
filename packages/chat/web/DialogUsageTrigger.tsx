import { applyBuiltinAgentRuntimeOverride } from "agent-runtime/builtinPlatformAgentConfigs";
import React from "react";
import { DialogTrigger, Button as RACButton } from "react-aria-components";
import { useTranslation } from "react-i18next";
import { Popover } from "render/web/ui/Popover";
import { useAppSelector } from "app/store";
import { useFetchData } from "app/hooks";
import { getModelContextWindow } from "ai/llm/getModelContextWindow";
import { selectCurrentDialogTokens } from "chat/dialog/dialogSlice";
import { useCurrentDialogConfig } from "chat/dialog/useCurrentDialogConfig";
import { getActiveDialogAgentId } from "chat/dialog/dialogAgents";
import type { Agent } from "app/types";
import { DialogUsagePanel } from "./DialogUsagePanel";
import {
  getContextWindowUsagePercent,
  getDialogTokenTotal,
} from "chat/dialog/dialogUsageFormat";

export const DialogUsageTrigger: React.FC<{ usagePercentOverride?: number }> = ({
  usagePercentOverride,
}) => {
  const { t } = useTranslation(["common", "chat"]);

  const tokenStats = useAppSelector(selectCurrentDialogTokens);
  const dialogConfig = useCurrentDialogConfig();
  const agentId = getActiveDialogAgentId(dialogConfig);
  const { data: agent } = useFetchData<Agent>(agentId || undefined);
  // 内置 agent 的 model 以 catalog 为准：数据库里可能是过期值（刻意不迁移），
  // 直接拿它算窗口会显示一个和实际运行模型不符的容量。
  const resolvedAgent =
    agent && agentId ? applyBuiltinAgentRuntimeOverride(agentId, agent) : agent;
  const contextWindow = getModelContextWindow(resolvedAgent?.model || "");

  const totalTokens = getDialogTokenTotal(
    tokenStats?.inputTokens ?? 0,
    tokenStats?.outputTokens ?? 0
  );

  const percent =
    typeof usagePercentOverride === "number"
      ? usagePercentOverride
      : contextWindow > 0 && totalTokens > 0
        ? getContextWindowUsagePercent(totalTokens, contextWindow)
        : undefined;

  if (typeof percent !== "number" || percent <= 0) return null;

  return (
    <DialogTrigger>
      <RACButton
        className="dialog-usage-trigger composer-drawer__mini-progress"
        aria-label={t("chat:contextUsagePercent", "上下文用量 {{percent}}%", {
          percent,
        })}
        {...{
          title: t("chat:contextUsagePercent", "上下文用量 {{percent}}%", {
            percent,
          }),
        } as any}
      >
        <div className="composer-drawer__mini-progress-track">
          <div
            className="composer-drawer__mini-progress-fill"
            style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
          />
        </div>
        <span className="composer-drawer__mini-progress-text">{percent}%</span>
      </RACButton>
      <Popover
        placement="top end"
        hideArrow
        offset={10}
        className="dialog-usage-popover"
      >
        <DialogUsagePanel
          tokenStats={tokenStats}
          contextWindow={contextWindow}
          compressionCount={dialogConfig?.compressionCount ?? 0}
        />
      </Popover>
    </DialogTrigger>
  );
};
