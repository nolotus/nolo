// 文件路径: ai/chat/fetchUtils.native.ts
// React Native 版 fetch 工具 - 使用 react-native-sse 支持流式传输

import { Agent } from "app/types";
import { toErrorMessage } from "core/errorMessage";
import { asOptionalTrimmedString } from "core/optionalString";
import { API_ENDPOINTS } from "database/config";
import EventSource from 'react-native-sse';
import { buildProviderAuthHeaders } from "../../agent-runtime/providerResolution";
import { performServerProxyFetchWithRetry } from "./serverProxyRetry";
import { resolveAgentCallPlan } from "../../agent-runtime/agentCallPlan";
import { resolveDirectRequestApiKey } from "./resolveDirectRequestApiKey";

interface BodyData {
    model: string;
    messages: any[];
    stream: boolean;
    tools?: any[];
    provider?: string;
}

interface FetchParams {
    agentConfig: Agent;
    api: string;
    bodyData: BodyData;
    currentServer: string;
    token: string;
    signal?: AbortSignal;
    // 仅用于 server-proxy 的 provider-call 证据链路（不会发给上游 provider）
    dialogId?: string;
}

const buildProxyPayload = (
    bodyData: BodyData,
    api: string,
    agentConfig: Agent,
    dialogId?: string
) => {
    const apiSource =
        agentConfig.apiSource === "custom" || agentConfig.apiSource === "cli"
            ? agentConfig.apiSource
            : undefined;
    const provider =
        bodyData.provider ||
        agentConfig.provider ||
        (apiSource === "custom" ? "custom" : undefined);
    // Server-proxy KEY: only transient/raw apiKey. Never hydrate from local broker.
    const apiKey = asOptionalTrimmedString(agentConfig.apiKey);

    return {
        ...bodyData,
        url: api,
        provider,
        agentKey: agentConfig.dbKey,
        ...(asOptionalTrimmedString(dialogId)
            ? { dialogId: asOptionalTrimmedString(dialogId) }
            : {}),
        ...(apiSource ? { apiSource } : {}),
        ...((agentConfig as any).apiKeyHeader ? { apiKeyHeader: (agentConfig as any).apiKeyHeader } : {}),
        KEY: apiKey,
    };
};

interface SSEFetchParams extends FetchParams {
    onChunk: (chunk: string) => void;
    onError: (error: Error) => void;
    onComplete: () => void;
}

/**
 * React Native 版流式 SSE 请求
 * 使用 react-native-sse 库
 *
 * Credential resolution is async; EventSource is created only after a key
 * is resolved (or anonymous is allowed). Cleanup can cancel a pending start.
 */
export const performSSEFetchRequest = (params: SSEFetchParams): (() => void) => {
    const {
        agentConfig,
        api,
        bodyData,
        currentServer,
        token,
        signal,
        dialogId,
        onChunk,
        onError,
        onComplete,
    } = params;

    let es: EventSource | null = null;
    let isCompleted = false;
    let cancelled = false;

    const cleanup = () => {
        cancelled = true;
        if (!isCompleted) {
            isCompleted = true;
            es?.close();
            es = null;
        }
    };

    void (async () => {
        try {
            // 确定请求 URL 和 headers
            const useProxy =
                resolveAgentCallPlan(
                    { ...agentConfig, provider: bodyData.provider || agentConfig.provider } as any,
                    {},
                ).transport === "server-proxy";
            const url = useProxy ? `${currentServer}${API_ENDPOINTS.CHAT}` : api;

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream',
                'Cache-Control': 'no-cache',
            };

            if (api.includes("openrouter.ai")) {
                headers["HTTP-Referer"] = "https://nolo.chat";
                headers["X-Title"] = "nolo";
            }

            let requestBody: any;

            if (useProxy) {
                headers['Authorization'] = `Bearer ${token}`;
                requestBody = buildProxyPayload(bodyData, api, agentConfig, dialogId);
            } else {
                const directApiKey = await resolveDirectRequestApiKey(agentConfig);
                if (cancelled) return;
                Object.assign(
                    headers,
                    buildProviderAuthHeaders({
                        endpoint: api,
                        apiKey: directApiKey ?? "",
                        apiKeyHeader: (agentConfig as any).apiKeyHeader,
                    }),
                );
                requestBody = bodyData;
            }

            if (cancelled) return;

            console.log('[SSE Native] Creating EventSource for:', url);

            es = new EventSource(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(requestBody),
                pollingInterval: 0,
            });

            // 处理消息事件
            es.addEventListener('message', (event: any) => {
                // console.log('[SSE Native] Message event received:', event);
                if (event.data) {
                    // console.log('[SSE Native] Chunk data:', event.data.substring(0, 100));
                    // 包装成 SSE 格式
                    onChunk(`data: ${event.data}\n\n`);
                }
            });

            // 处理打开事件
            es.addEventListener('open', () => {
                console.log('[SSE Native] Connection opened');
            });

            // 处理错误
            es.addEventListener('error', (event: any) => {
                console.error('SSE Error event:', event);

                // react-native-sse 有时会把结束信号当做 error 发送 (xhrStatus 200, but type error)
                // 或者简单的网络错误

                // 如果是正常结束（有些实现会把 close 当 error 发）
                if (event.type === 'error' && !event.message && !event.xhrStatus) {
                    // 可能是连接关闭
                    console.log('[SSE Native] Empty error event, treating as close/complete');
                    if (!isCompleted) {
                        onComplete();
                        cleanup();
                    }
                    return;
                }

                if (!isCompleted) {
                    // 检查是否包含 [DONE] 或者 status 200 但解析失败
                    if (event.message?.includes('[DONE]')) {
                        onComplete();
                    } else {
                        onError(new Error(event.message || 'SSE connection error'));
                    }
                    cleanup();
                }
            });

            // 处理关闭
            es.addEventListener('close', () => {
                console.log('[SSE Native] Connection closed');
                if (!isCompleted) {
                    onComplete();
                    cleanup();
                }
            });
        } catch (error: any) {
            if (cancelled || isCompleted) return;
            onError(error instanceof Error ? error : new Error(String(error)));
            cleanup();
        }
    })();

    // 处理 abort signal
    if (signal) {
        signal.addEventListener('abort', () => {
            // console.log('[SSE Native] Aborted by signal');
            cleanup();
            onComplete();
        });
    }

    // 返回 cleanup 函数
    return cleanup;
};

/**
 * React Native 版普通 fetch 请求 (非流式)
 * 保持与 web 版相同的接口
 */
const fetchDirectly = async ({
    api,
    agentConfig,
    bodyData,
    signal,
}: Omit<FetchParams, "currentServer" | "token">): Promise<Response> => {
    try {
        const apiKey = await resolveDirectRequestApiKey(agentConfig);
        const authHeaders = buildProviderAuthHeaders({
            endpoint: api,
            apiKey: apiKey ?? "",
            apiKeyHeader: (agentConfig as any).apiKeyHeader,
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
            signal,
        });
    } catch (error: any) {
        console.error("[fetchDirectly] 网络请求失败:", error);
        throw error;
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
}: FetchParams): Promise<Response> => {
    try {
        const payload = buildProxyPayload(bodyData, api, agentConfig, dialogId);
        return await performServerProxyFetchWithRetry({
            signal,
            execute: () =>
                fetch(`${currentServer}${API_ENDPOINTS.CHAT}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(payload),
                    signal,
                }),
        });
    } catch (error: any) {
        console.error("[fetchWithServerProxy] 网络请求失败:", error);
        throw error;
    }
};

export const formatFriendlyNetworkErrorMessage = (error: unknown): string => {
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
    try {
        const planConfig = {
            ...params.agentConfig,
            provider: params.bodyData.provider || params.agentConfig.provider,
        };
        return resolveAgentCallPlan(planConfig as any, {}).transport ===
            "server-proxy"
            ? await fetchWithServerProxy(params)
            : await fetchDirectly(params);
    } catch (error: any) {
        console.error("[performFetchRequest] 请求过程中发生错误:", error);
        const friendlyMsg = formatFriendlyNetworkErrorMessage(error);
        throw new Error(
            friendlyMsg.startsWith("网络请求失败")
                ? friendlyMsg
                : `网络请求失败: ${friendlyMsg}`
        );
    }
};

/**
 * 标识当前是 React Native 环境
 */
export const isNativeSSE = true;
