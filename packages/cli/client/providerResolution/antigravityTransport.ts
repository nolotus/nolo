/**
 * transport 分支：Antigravity（Google Cloud Code Assist）——CCA wire，非 OpenAI 兼容
 *
 * 由 localRuntimeAdapter 原先 940 行的 resolveProviderBase 拆出，逻辑逐字保留。
 * 未命中本通道返回 null，交给 resolveLocalProvider 链上的下一条。
 */
import type { AgentRuntimeToolCall } from "../../../agent-runtime";
import {
  resolveAntigravityFinishReason,
} from "../../../agent-runtime/antigravityCloudCodeProvider";
import { invokeAntigravity, isAntigravityInvocationAbortError } from "../../../agent-runtime/antigravityInvocation";
import { isAntigravityOAuthAgent } from "../../../agent-runtime/antigravityOAuth";
import {
  resolveLocalAntigravityCredential,
} from "../../../agent-runtime/antigravityCredential";
import { readOAuthCredential } from "../../../agent-runtime/oauthTokenStore";
import { logLocalRuntimeDiagnostic, summarizeOpenAiToolNames } from "../localRuntimeDiagnostics";
import { fetchWithTransientRetry } from "../localRuntimeFetchRetry";
import { resolveProviderOpenAiToolBundle } from "../localRuntimeTools";
import { toErrorMessage } from "core/errorMessage";
import { summarizeEndpoint } from "core/summarizeEndpoint";
import { resolveLocalUserId } from "../cliAgentConfigHelpers";
import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";
import type { ProviderResolver } from "./providerResolutionContext";

export const resolveAntigravityTransport: ProviderResolver = async (ctx) => {
  const {
    agentConfig,
    deps,
    fetchImpl,
    loopbackRequest,
    additionalToolNames,
    buildProviderOpenAiTools,
    recordLocalAvailability,
    apiKeyRefResolver,
  } = ctx;
  const legacyCredentialMigration = { enableLegacyMigration: true } as const;

  // Antigravity (Google Cloud Code Assist) is not OpenAI-compatible: local
  // direct `/chat/completions` against daily-cloudcode-pa returns HTTP 404.
  // Mirror server agent-run loop: CCA wire + local oauth refresh.
  if (isAntigravityOAuthAgent(agentConfig)) {
    const credentialOwnerUserId = resolveLocalUserId(deps.env) || "local";
    const apiKeyRef = asTrimmedLowercaseString(agentConfig.apiKeyRef);
    const isApiKeyRef = apiKeyRef.startsWith("api-key:");

    // 构建时快速失败：凭证完全缺失或缺少 metadata.projectId 时保留明确指引。
    const initialCredential = await resolveLocalAntigravityCredential({
      credentialOwnerUserId,
      apiKeyRefResolver,
      apiKeyRef: agentConfig.apiKeyRef,
      readCredential: () => readOAuthCredential("antigravity", undefined, legacyCredentialMigration),
      migration: legacyCredentialMigration,
    });

    const { requestedToolNames, tools } = resolveProviderOpenAiToolBundle(
      agentConfig,
      deps.env,
      buildProviderOpenAiTools,
      additionalToolNames,
    );

    logLocalRuntimeDiagnostic("provider.selected", {
      agentKey: agentConfig.key,
      transport: "antigravity-cloud-code",
      apiSource: agentConfig.apiSource ?? null,
      provider: agentConfig.provider ?? "google-antigravity",
      model: agentConfig.model ?? null,
      customProviderEndpoint:
        summarizeEndpoint(agentConfig.customProviderUrl) ?? null,
      hasApiKey: true,
      hasProjectId: Boolean(initialCredential?.projectId),
    });

    return {
      model: agentConfig.model || "gemini-3.1-pro",
      complete: async (messages, options) => {
        const openAiBody = {
          model: agentConfig.model || "gemini-3.1-pro",
          messages,
          stream: false,
          ...(tools.length > 0 ? { tools } : {}),
        };
        logLocalRuntimeDiagnostic("provider.request.start", {
          agentKey: agentConfig.key,
          transport: "antigravity-cloud-code",
          model: openAiBody.model,
          messageCount: messages.length,
          toolCount: tools.length,
          requestedToolNames,
          openAiToolNames: summarizeOpenAiToolNames(tools),
        });

        // Invocation lifecycle seam：lazy 请求启动 + fiber/abort 真实取消 +
        // 401/403 一次 refresh-retry（仅 credential 实际变化才重试）。
        // credential source 保持 local（resolveLocalAntigravityCredential）。
        // transport retry（fetchWithTransientRetry）与 stream retry 维持现状。
        const resolveLocalCredential = async ({ forceRefresh }: { forceRefresh: boolean }) =>
          resolveLocalAntigravityCredential({
            credentialOwnerUserId,
            apiKeyRefResolver,
            apiKeyRef: agentConfig.apiKeyRef,
            readCredential: () => readOAuthCredential("antigravity", undefined, legacyCredentialMigration),
            migration: legacyCredentialMigration,
            forceRefresh,
          });

        let result;
        try {
          result = await invokeAntigravity({
            agentConfig,
            resolveCredential: resolveLocalCredential,
            // 非 OAuth（api-key ref）不重试：metered key 没有 refresh 语义。
            supportsAuthRetry: !isApiKeyRef,
            openAiBody,
            ...(options?.signal ? { signal: options.signal } : {}),
            // whole-invocation timeout 透传：seam 最外层 timeoutOption 统一 interrupt
            // 整个 orchestration（resolve/attempt/refresh 共享预算）并真实 abort fetch/SSE。
            ...(typeof options?.timeoutMs === "number" ? { timeoutMs: options.timeoutMs } : {}),
            onTextDelta: options?.onTextDelta,
            onReasoningDelta: options?.onReasoningDelta,
            fetchImpl: ((url: string | URL | Request, init?: RequestInit) =>
              fetchWithTransientRetry(fetchImpl, url, init, {
                sleep: deps.sleep,
                loopbackRequest,
              })) as unknown as typeof fetch,
          });
        } catch (error) {
          if (isAntigravityInvocationAbortError(error)) throw error;
          logLocalRuntimeDiagnostic("provider.request.result", {
            agentKey: agentConfig.key,
            transport: "antigravity-cloud-code",
            ok: false,
            error: toErrorMessage(error),
          });
          throw error;
        }

        await recordLocalAvailability(result.status, result.body);
        if (result.providerFailure) {
          logLocalRuntimeDiagnostic("provider.request.failure", {
            agentKey: agentConfig.key,
            transport: "antigravity-cloud-code",
            code: result.providerFailure.code,
            providerReason: result.providerFailure.providerReason,
            retryable: result.providerFailure.retryable,
          });
          return {
            content: "",
            model: agentConfig.model || "gemini-3.1-pro",
            provider: agentConfig.provider || "google-antigravity",
            finish_reason: "error",
            stream_complete: true,
            error: true,
            errorMessage: result.providerFailure.message,
            providerEvents: result.providerEvents,
            providerFailure: result.providerFailure,
            runtimeProviderFailure: result.runtimeProviderFailure,
            trace: messages,
          };
        }
        if (result.status < 200 || result.status >= 300) {
          const errMsg =
            result.body &&
            typeof result.body === "object" &&
            result.body.error &&
            typeof (result.body.error as { message?: unknown }).message ===
              "string"
              ? (result.body.error as { message: string }).message
              : JSON.stringify(result.body);
          throw new Error(
            `local antigravity provider failed: HTTP ${result.status} ${errMsg}`,
          );
        }
        // AntigravitySemanticResult is the primary source of truth;
        // legacy result.body serves as a compatibility / assertion fallback.
        const choice = Array.isArray(result.body?.choices)
          ? (result.body.choices[0] as
              | {
                  finish_reason?: string | null;
                  message?: {
                    content?: string | null;
                    tool_calls?: AgentRuntimeToolCall[];
                    reasoning_content?: string | null;
                  };
                }
              | undefined)
          : undefined;
        const message = choice?.message ?? {};
        const tool_calls =
          Array.isArray(result.toolCalls) && result.toolCalls.length > 0
            ? result.toolCalls
            : Array.isArray(message.tool_calls)
              ? message.tool_calls
              : undefined;
        const content =
          typeof result.text === "string"
            ? result.text
            : typeof message.content === "string"
              ? message.content
              : message.content == null
                ? ""
                : String(message.content);
        // thinking 模型的 reasoning-only / length 截断轮：reasoning_content 是
        // localLoop 区分「模型在思考（可 repair）」与「真·空轮」的唯一信号。
        const reasoning_content =
          typeof result.reasoningContent === "string"
            ? result.reasoningContent
            : typeof (message as { reasoning_content?: unknown }).reasoning_content === "string"
              ? (message as { reasoning_content: string }).reasoning_content
              : undefined;
        const finish_reason =
          tool_calls && tool_calls.length > 0
            ? "tool_calls"
            : typeof result.finishReason === "string"
              ? resolveAntigravityFinishReason(result.finishReason)
              : typeof choice?.finish_reason === "string"
                ? choice.finish_reason
                : undefined;
        const usage = (result.usage ?? result.body?.usage) as Record<string, any> | undefined;

        logLocalRuntimeDiagnostic("provider.request.result", {
          agentKey: agentConfig.key,
          transport: "antigravity-cloud-code",
          ok: true,
          contentChars: content.length,
          toolCallCount: tool_calls?.length ?? 0,
        });
        return {
          content,
          model: agentConfig.model || "gemini-3.1-pro",
          provider: agentConfig.provider || "google-antigravity",
          ...(tool_calls ? { tool_calls } : {}),
          ...(reasoning_content ? { reasoning_content } : {}),
          finish_reason,
          stream_complete: true,
          ...(usage ? { usage } : {}),
          trace: messages,
          providerEvents: result.providerEvents,
          ...(result.providerFailure ? { providerFailure: result.providerFailure } : {}),
          ...(result.runtimeProviderFailure ? { runtimeProviderFailure: result.runtimeProviderFailure } : {}),
        };
      },
    };
  }
  return null;
};
