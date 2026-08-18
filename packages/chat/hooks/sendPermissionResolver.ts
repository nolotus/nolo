import {
  getFinalPrice,
  getPrices,
  hasExplicitAgentPricing,
} from "ai/llm/getPricing";
import type { Agent } from "app/types";

import type { SendPermissionCheck } from "./useSendPermission";

export type AgentLoadState = "idle" | "loading" | "ready" | "error";

type ServerPrices = {
  inputPrice: number;
  inputCacheHitPrice: number;
  outputPrice: number;
} | null;

export function resolveSendPermissionState(input: {
  currentDialogKey: string | null;
  hasDialogConfig: boolean;
  agentKey: string | null;
  agentConfig: Agent | null;
  agentLoadState: AgentLoadState;
  currentUserId: string | null;
  userBalance: number;
  serverPrices: ServerPrices;
}): {
  isLoading: boolean;
  sendPermission: SendPermissionCheck;
} {
  const {
    currentDialogKey,
    hasDialogConfig,
    agentKey,
    agentConfig,
    agentLoadState,
    currentUserId,
    userBalance,
    serverPrices,
  } = input;

  if (currentDialogKey && !hasDialogConfig) {
    return {
      isLoading: true,
      sendPermission: { allowed: false },
    };
  }

  if (agentKey && !agentConfig && agentLoadState === "loading") {
    return {
      isLoading: true,
      sendPermission: { allowed: false },
    };
  }

  if (agentKey && !agentConfig && agentLoadState === "error") {
    return {
      isLoading: false,
      sendPermission: { allowed: false, reason: "AGENT_LOAD_FAILED" },
    };
  }

  // auto 模式对话由调用方用 execution profile 补齐配置，走到这里就是真的没配置：
  // 不再按平台放行，宁可显式报错也不要放出一次注定失败的发送。
  if (!agentConfig) {
    if (process.env.NOLO_DESKTOP === "1") {
      return {
        isLoading: false,
        sendPermission: {
          allowed: true,
          pricing: {
            modelName: "desktop-fallback",
            pricePerMessage: 0,
          },
        },
      };
    }
    return {
      isLoading: false,
      sendPermission: { allowed: false, reason: "NO_CONFIG" },
    };
  }

  const isCustomApi = agentConfig.apiSource === "custom";
  const isCliApi = agentConfig.apiSource === "cli";
  // Subscription OAuth providers (Cursor/ChatGPT/xAI/Antigravity/Claude) are
  // billed by the upstream subscription, not per-token. Treat them as custom
  // (pricePerMessage: 0) so the send-permission gate doesn't block them with
  // "model pricing missing" when apiSource wasn't explicitly set to "custom".
  const SUBSCRIPTION_OAUTH_REFS = new Set([
    "cursor", "chatgpt", "xai", "antigravity", "claude",
  ]);
  const isSubscriptionOAuth = SUBSCRIPTION_OAUTH_REFS.has(
    (agentConfig.apiKeyRef ?? "").trim().toLowerCase()
  );
  // M3: device-local agents (`userId === "local"`) are owned by the device
  // when no Nolo account is active. Logged-in accounts still match by id.
  const isDeviceLocalOwner =
    agentConfig.userId === "local" && !currentUserId;
  const isOwner =
    isDeviceLocalOwner ||
    (!!currentUserId && agentConfig.userId === currentUserId);

  if (!isOwner) {
    const hasWhitelist =
      Array.isArray(agentConfig.whitelist) &&
      agentConfig.whitelist.length > 0;

    if (hasWhitelist) {
      const isUserInWhitelist =
        !!currentUserId && (agentConfig.whitelist ?? []).includes(currentUserId);

      if (!isUserInWhitelist) {
        return {
          isLoading: false,
          sendPermission: { allowed: false, reason: "NOT_IN_WHITELIST" },
        };
      }
    }
  }

  if (isCustomApi || isCliApi || isSubscriptionOAuth) {
    return {
      isLoading: false,
      sendPermission: {
        allowed: true,
        pricing: {
          modelName: agentConfig.model || (isCliApi ? "copilot-cli" : "custom"),
          pricePerMessage: 0,
        },
      },
    };
  }


  if (!serverPrices && !hasExplicitAgentPricing(agentConfig)) {
    return {
      isLoading: false,
      sendPermission: { allowed: false, reason: "NO_MODEL_PRICING" },
    };
  }

  const prices = getPrices(agentConfig, serverPrices ?? null);
  const maxPrice = getFinalPrice(prices);
  const hasEnoughBalance = userBalance >= maxPrice;

  return {
    isLoading: false,
    sendPermission: {
      allowed: hasEnoughBalance,
      reason: hasEnoughBalance ? undefined : "INSUFFICIENT_BALANCE",
      requiredAmount: hasEnoughBalance ? undefined : maxPrice,
      pricing: {
        modelName: agentConfig.model,
        pricePerMessage: maxPrice,
      },
    },
  };
}
