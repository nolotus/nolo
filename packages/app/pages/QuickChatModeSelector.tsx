// 首页 QuickChat 的 agent 选择器：复用对话页 AgentPickerControl。
// 语义已简化为「默认自动（flash）+ 手动指定 agent」：空选 = 默认自动（无图→flash，
// 有图→kimi）；手动选一个 agent 即用该 agent 覆盖自动路由（quickChatAutoAgentId）。
// 不再有分类相关档位文案。

import React, { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "app/store";
import { setSettings } from "app/settings/settingSlice";
import {
  AgentPickerControl,
  type AgentPickerControlProps,
} from "chat/web/AgentPickerControl";
import { useAgentPickerCandidates } from "chat/hooks/useAgentPickerCandidates";
import type { QuickChatMode } from "./quickChatFlow";

interface QuickChatModeSelectorProps {
  mode: QuickChatMode;
  onModeChange: (mode: QuickChatMode) => void;
  surface?: "default" | "home-primary" | "space-home-compact";
}

const QuickChatModeSelector: React.FC<QuickChatModeSelectorProps> = ({
  mode: _mode,
  onModeChange: _onModeChange,
  surface = "default",
}) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const autoAgentId =
    useAppSelector(
      (state) => state.settings?.quickChatAutoAgentId as string | undefined,
    ) || "";

  const { candidates } = useAgentPickerCandidates({
    activeAgentId: autoAgentId || null,
    limit: 30,
  });

  const handleSelect = useCallback(
    (agentKey: string) => {
      dispatch(setSettings({ quickChatAutoAgentId: agentKey }));
    },
    [dispatch],
  );

  const pickerProps = useMemo<AgentPickerControlProps>(
    () => ({
      candidates,
      activeAgentKey: autoAgentId || null,
      onSelect: handleSelect,
      defaultOption: {
        label: t("quickChat.mode.auto", "自动"),
        description: t("quickChat.autoAgent.default", "默认"),
      },
      hint: t("quickChat.autoAgent.label", "自动模式 Agent"),
      placeholderLabel: t("quickChat.mode.auto", "自动"),
      ariaLabel: autoAgentId
        ? undefined
        : `${t("quickChat.mode.triggerLabel", "选择对话模式")}：${t("quickChat.mode.auto", "自动")}`,
      className: "quick-chat-agent-picker",
    }),
    [autoAgentId, candidates, handleSelect, t],
  );

  return (
    <div
      className="quick-chat-mode-selector"
      data-surface={surface}
      data-mode="auto"
      data-auto-agent={autoAgentId ? "true" : undefined}
    >
      <AgentPickerControl {...pickerProps} />
    </div>
  );
};

export default QuickChatModeSelector;
