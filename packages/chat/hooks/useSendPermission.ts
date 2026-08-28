import { useAppSelector } from "app/store";
import { useUserId } from "identity";
import { useTranslation } from "react-i18next";
import useAgentConfig from "ai/agent/hooks/useAgentConfig";
import { useCurrentDialogKey } from "chat/dialog/dialogSlice";
import { useCurrentDialogConfig } from "chat/dialog/useCurrentDialogConfig";
import { getActiveDialogAgentId } from "chat/dialog/dialogAgents";
import { resolveDialogAutoAgentConfig } from "chat/dialog/dialogAgentPolicy";
import { getModelPricing } from "ai/llm/getPricing";
import { selectAllMsgs } from "chat/messages/messageSlice";
import { extractCustomId } from "core/prefix";
import { useMemo } from "react";

import { resolveSendPermissionState } from "./sendPermissionResolver";

const EMPTY_MESSAGES: any[] = [];

export interface SendPermissionCheck {
  allowed: boolean;
  reason?:
  | "NO_CONFIG"
  | "AGENT_LOAD_FAILED"
  | "NO_MODEL_PRICING"
  | "INSUFFICIENT_BALANCE"
  | "NOT_IN_WHITELIST";
  requiredAmount?: number;
  pricing?: {
    modelName: string;
    pricePerMessage: number;
  };
}

export const useSendPermission = (userBalance: number = 0) => {
  const { t } = useTranslation("chat");
  const currentUserId = useUserId();
  const currentDialogKey = useCurrentDialogKey();
  const currentDialogConfig = useCurrentDialogConfig();
  const agentKey = getActiveDialogAgentId(currentDialogConfig);
  const { agentConfig: fixedAgentConfig, isLoading, loadState } = useAgentConfig();
  // auto 模式对话没有 Agent 实体，否则会被判成 NO_CONFIG（“智能体配置缺失”），
  // 首页直接开聊的对话在 web 端就没有输入框。
  const agentConfig =
    fixedAgentConfig ?? resolveDialogAutoAgentConfig(currentDialogConfig);
  const currentDialogId = currentDialogKey ? extractCustomId(currentDialogKey) : null;

  const isCustomApi = agentConfig?.apiSource === "custom";
  const isCliApi = agentConfig?.apiSource === "cli";
  // Subscription OAuth providers are billed by upstream subscription, not per-token.
  const SUBSCRIPTION_OAUTH_REFS = new Set([
    "cursor", "chatgpt", "xai", "antigravity", "claude",
  ]);
  const isSubscriptionOAuth = SUBSCRIPTION_OAUTH_REFS.has(
    (agentConfig?.apiKeyRef ?? "").trim().toLowerCase()
  );

  const serverPrices =
    agentConfig && !isCustomApi && !isCliApi && !isSubscriptionOAuth
      ? getModelPricing(agentConfig.provider || "", agentConfig.model)
      : null;

  const resolved = resolveSendPermissionState({
    currentDialogKey,
    hasDialogConfig: !!currentDialogConfig,
    agentKey,
    agentConfig,
    agentLoadState: loadState,
    currentUserId: currentUserId ?? null,
    userBalance,
    serverPrices,
  });

  const messages = useAppSelector((state) =>
    currentDialogId
      ? (selectAllMsgs(state, currentDialogId) ?? EMPTY_MESSAGES)
      : EMPTY_MESSAGES
  );

  const hasInlineHandoffMessage = useMemo(() => {
    return messages.some((message: any) => {
      if (message?.toolName === "runStreamingAgent") {
        let contentObj: any = null;
        try {
          contentObj = typeof message.content === "string"
            ? JSON.parse(message.content)
            : message.content;
        } catch (_) {}
        const inline =
          contentObj?.inline === true ||
          contentObj?.handoff === true ||
          message.toolPayload?.inline === true;
        if (inline) {
          return true;
        }
      }
      return false;
    });
  }, [messages]);

  const dialogConfigAny = currentDialogConfig as any;
  const isHandoffOrInlineDialog =
    dialogConfigAny?.presentationIntent === "handoff_speaker" ||
    dialogConfigAny?.presentationIntent === "inline_result" ||
    dialogConfigAny?.threadKind === "handoff" ||
    dialogConfigAny?.threadKind === "inline" ||
    hasInlineHandoffMessage;

  const isAgentLoadOrConfigError =
    resolved.sendPermission.reason === "AGENT_LOAD_FAILED" ||
    resolved.sendPermission.reason === "NO_CONFIG";

  const finalSendPermission = { ...resolved.sendPermission };
  if (isHandoffOrInlineDialog && isAgentLoadOrConfigError) {
    finalSendPermission.allowed = true;
    finalSendPermission.reason = undefined;
  }

  const getErrorMessage = (
    reason?: SendPermissionCheck["reason"],
    pricing?: SendPermissionCheck["pricing"]
  ) => {
    if (reason === "AGENT_LOAD_FAILED") {
      return t(
        "agentConfigLoadFailed",
        "智能体配置加载失败，请重试。"
      );
    }
    if (reason === "NOT_IN_WHITELIST") {
      return t("notInWhitelist", "您不在该应用的白名单中，无法使用。");
    }
    if (reason === "INSUFFICIENT_BALANCE" && pricing) {
      return t("insufficientBalanceDetailed", {
        modelName: pricing.modelName,
        pricePerMessage: pricing.pricePerMessage.toFixed(2),
        balance: userBalance.toFixed(2),
      });
    }
    return t(
      reason === "NO_CONFIG"
        ? "agentConfigMissing"
        : reason === "NO_MODEL_PRICING"
          ? "modelPricingMissing"
          : "noAvailableAgentMessage"
    );
  };

  return {
    sendPermission: finalSendPermission,
    getErrorMessage,
    isLoading: isLoading || resolved.isLoading,
  };
};
