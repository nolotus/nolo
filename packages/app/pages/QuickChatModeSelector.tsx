// 首页 QuickChat 的 agent 选择器：复用对话页 AgentPickerControl。
// 语义：空选 = 默认档 nolo（builtinAgentCatalog 的 nolo 条目，当前指向
// DeepSeek V4 Flash Vision Exp，原生支持图片输入）；手动选一个 agent
// 即用该 agent 覆盖默认档（quickChatAutoAgentId）。不再有分类相关档位文案。

import React, { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "app/store";
import { setSettings } from "app/settings/settingSlice";
import {
  AgentPickerControl,
  type AgentPickerControlProps,
} from "chat/web/AgentPickerControl";
import { useAgentPickerCandidates } from "chat/hooks/useAgentPickerCandidates";
import {
  buildNoloDefaultAgentOption,
  noloDefaultAgentLabel,
} from "chat/web/noloDefaultAgentOption";
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
      // 与对话页 composer 共用同一个默认档定义（见 noloDefaultAgentOption）。
      defaultOption: buildNoloDefaultAgentOption(t),
      hint: t("quickChat.autoAgent.label", "默认模型 / 切换 Agent"),
      placeholderLabel: noloDefaultAgentLabel(),
      ariaLabel: autoAgentId
        ? undefined
        : `${t("quickChat.mode.triggerLabel", "选择对话模式")}：${noloDefaultAgentLabel()}`,
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
