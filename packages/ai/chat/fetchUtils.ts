import { buildProxyPayload } from "./buildProxyPayload";
import { isAgentCredentialShared } from "../../shared/providerSecrets";
// 文件路径: ai/chat/fetchUtils.ts
import { Agent } from "app/types";
import { toErrorMessage } from "core/errorMessage";

import { API_ENDPOINTS } from "database/config";
import { buildProviderAuthHeaders } from "../../agent-runtime/providerResolution";
import { performServerProxyFetchWithRetry } from "./serverProxyRetry";
import { resolveAgentCallPlan } from "../../agent-runtime/agentCallPlan";
import { resolveDirectRequestApiKey } from "./resolveDirectRequestApiKey";
import { DirectApiKeyResolutionError } from "./resolveDirectRequestApiKey";
import { fetchServerSyncedCredential as fetchSyncedCredential } from "./agentCredentialSyncClient";
import { getLocalProviderSecret } from "../agent/providerSecrets";

interface BodyData {
  model: string;
  messages: any[];
  stream: boolean;
  tools?: any[];
  provider?: string;
}

interface FetchParams {
  /** Compact callers need the original timeout/cancellation/provider fields. */
  preserveStructuredError?: boolean;
  agentConfig: Agent;
  api: string;
  bodyData: BodyData;
  currentServer: string;
  token: string;
  signal?: AbortSignal; // signal 是可选的
  // 仅用于 server-proxy 的 provider-call 证据链路（不会发给上游 provider）
  dialogId?: string;
  /** 重试进度上报（UI 展示「自动重试 N/M · Xs」）。 */
  onRetry?: (info: {
    attempt: number;
    maxAttempts: number;
    delayMs: number;
  }) => void;
}

const fetchDirectly = async (params: FetchParams): Promise<Response> => {
  const { api, agentConfig, bodyData, signal, currentServer, token, dialogId } = params;
  try {
    const apiKey = await resolveDirectRequestApiKey(agentConfig, {
      syncFetcher: currentServer && token
        ? (ref) => fetchSyncedCredential({ currentServer, authToken: token }, ref)
        : undefined,
      providerSecretFetcher: isAgentCredentialShared(agentConfig) && currentServer && token
        ? async (ref) => {
            const presetId = ref.startsWith("provider-key:") ? ref.slice("provider-key:".length) : ref;
            const local = getLocalProviderSecret(presetId);
            if (local) return local;
            try {
              const response = await fetch(`${currentServer}/api/user-secrets/get?presetId=${encodeURIComponent(presetId)}`, { headers: { Authorization: `Bearer ${token}` } });
              if (!response.ok) return null;
              return ((await response.json()) as { value?: string }).value ?? null;
            } catch { return null; }
          }
        : undefined,
    });
    const authHeaders = buildProviderAuthHeaders({
      endpoint: api,
      apiKey: apiKey ?? "",
      apiKeyHeader: (agentConfig as any).apiKeyHeader,
      sessionId: dialogId || (agentConfig as any).dbKey || (agentConfig as any).key,
    });
    return await fetch(api, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
        ...(api.includes("openrouter.ai") ? {
          "HTTP-Referer": "https://nolo.chat",
          "X-Title": "nolo"
        } : {})
      },
      body: JSON.stringify(bodyData),
      signal, // 可选参数，直接传递
    });
  } catch (error: any) {
    if (
      !(error instanceof DirectApiKeyResolutionError) &&
      (error as any)?.kind !== "credential_missing"
    ) {
      console.error("[fetchDirectly] 网络请求失败:", error);
    }
    throw error; // 抛出错误，交给上层处理
  }
};

const fetchWithServerProxy = async ({
  currentServer,
  api,
  bodyData,
  agentConfig,
  token,
  signal,
  dialogId,
  onRetry,
}: FetchParams): Promise<Response> => {
  try {
    const payload = buildProxyPayload(bodyData, api, agentConfig, dialogId);
    return await performServerProxyFetchWithRetry({
      signal,
      onRetry,
      execute: () =>
        fetch(`${currentServer}${API_ENDPOINTS.CHAT}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // 使用 Authorization 头传递 token
          },
          body: JSON.stringify(payload),
          signal,
        }),
    });
  } catch (error: any) {
    console.error("[fetchWithServerProxy] 网络请求失败:", error);
    throw error; // 抛出错误，交给上层处理
  }
};
export const formatFriendlyNetworkErrorMessage = (error: unknown): string => {
  if (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    navigator.onLine === false
  ) {
    return "网络连接已断开，请检查网络连接后重试";
  }
  const rawMessage = toErrorMessage(error);
  if (
    /failed to fetch|networkerror|network error|econnrefused|econnreset|socket hang up/i.test(
      rawMessage
    )
  ) {
    return "网络请求失败，请检查网络连接或代理/VPN设置";
  }
  return rawMessage;
};

export const performFetchRequest = async (
  params: FetchParams
): Promise<Response> => {
  let direct = false;
  try {
    // Preserve the old shouldUseServerProxy(agentConfig, bodyData.provider)
    // request-provider override semantics.
    const { agentConfig, bodyData } = params;
    const credentialRef = "credentialRef" in agentConfig && typeof agentConfig.credentialRef === "string"
      ? agentConfig.credentialRef : undefined;
    const plan = resolveAgentCallPlan({
      key: "",
      provider: bodyData.provider || agentConfig.provider,
      model: agentConfig.model,
      apiSource: agentConfig.apiSource,
      cliProvider: agentConfig.cliProvider ?? undefined,
      customProviderUrl: agentConfig.customProviderUrl,
      apiKey: agentConfig.apiKey ?? undefined,
      apiKeyRef: agentConfig.apiKeyRef,
      credentialRef,
      credentialSynced: agentConfig.credentialSynced,
      useServerProxy: agentConfig.useServerProxy,
    }, undefined, { canResolveLocalCredential: true });
    direct = plan.transport === "direct";
    return direct ? await fetchDirectly(params) : await fetchWithServerProxy(params);
  } catch (error: any) {
    if (
      error instanceof DirectApiKeyResolutionError ||
      (error as any)?.kind === "credential_missing"
    ) {
      throw error;
    }
    console.error("[performFetchRequest] 请求过程中发生错误:", error);
    if (params.preserveStructuredError || params.signal?.aborted || error?.name === "AbortError") throw error;
    const rawMessage = toErrorMessage(error);
    const friendlyMsg = direct && /failed to fetch|networkerror|network error|load failed/i.test(rawMessage) &&
      !(typeof navigator !== "undefined" && navigator.onLine === false)
      ? "网络请求失败：浏览器直连服务商时，可能被服务商的跨域限制（CORS）拦截。"
      : formatFriendlyNetworkErrorMessage(error);
    throw new Error(
      friendlyMsg.startsWith("网络请求失败")
        ? friendlyMsg
        : `网络请求失败: ${friendlyMsg}`
    );
  }
};

// SSE 流式请求参数（与 native 版本保持一致的接口）
interface SSEFetchParams extends FetchParams {
  onChunk: (chunk: string) => void;
  onError: (error: Error) => void;
  onComplete: () => void;
}

/**
 * Web 版流式 SSE 请求 - 占位函数
 * Web 版不使用此函数，而是使用 performFetchRequest + ReadableStream
 * 此函数仅为类型兼容而存在
 */
export const performSSEFetchRequest = (_params: SSEFetchParams): (() => void) => {
  throw new Error('performSSEFetchRequest should not be called on web platform');
};

/**
 * 标识当前是否为 React Native 环境
 * Web 版返回 false
 */
export const isNativeSSE = false;
