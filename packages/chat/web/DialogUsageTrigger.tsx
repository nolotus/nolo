import React from "react";
import { DialogTrigger, Button as RACButton } from "react-aria-components";
import { useTranslation } from "react-i18next";
import { Popover } from "render/web/ui/Popover";
import { DialogUsageGaugeIcon } from "./DialogUsageGaugeIcon";
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

export const DialogUsageTrigger: React.FC = () => {
  const { t } = useTranslation(["common", "chat"]);

  const tokenStats = useAppSelector(selectCurrentDialogTokens);
  const dialogConfig = useCurrentDialogConfig();
  const agentId = getActiveDialogAgentId(dialogConfig);
  const { data: agent } = useFetchData<Agent>(agentId || undefined);
  const contextWindow = getModelContextWindow(agent?.model || "");

  const totalTokens = getDialogTokenTotal(
    tokenStats?.inputTokens ?? 0,
    tokenStats?.outputTokens ?? 0
  );

  return (
    <DialogTrigger>
      <RACButton
        className="dialog-usage-trigger"
        aria-label={t("chat:dialogUsageTitle", "会话用量")}
        {...{ title: t("chat:dialogUsageTitle", "会话用量") } as any}
      >
        <DialogUsageGaugeIcon
          size={22}
          fillPercent={
            contextWindow > 0 && totalTokens > 0
              ? getContextWindowUsagePercent(totalTokens, contextWindow)
              : undefined
          }
        />
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
