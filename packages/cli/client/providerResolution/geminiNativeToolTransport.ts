/**
 * transport 分支：Gemini 3 + tools 的 native generateContent 路由（platform proxy 传不了 thought_signature）
 *
 * 由 localRuntimeAdapter 原先 940 行的 resolveProviderBase 拆出，逻辑逐字保留。
 * 未命中本通道返回 null，交给 resolveLocalProvider 链上的下一条。
 */
import type { AgentRuntimeResult } from "../../../agent-runtime";
import { accumulateGeminiChunks, buildGeminiGenerateContentRequest, isGemini3Model, resolveGeminiModelQuirks, shouldUseGeminiNativeToolRoute } from "../../../agent-runtime/geminiNativeShared";
import { resolveToolImagePolicy } from "../../../ai/llm/agentCapabilities";
import { parseSseDataLineJson } from "../../../agent-runtime/sseDataLine";
import { readSseDataValues } from "../../../agent-runtime/sseFrames";
import { resolvePlatformChatProviderConfig, shouldUsePlatformChatProvider } from "../../agentRuntimeLocal";
import { logLocalRuntimeDiagnostic } from "../localRuntimeDiagnostics";
import { resolveProviderOpenAiToolBundle } from "../localRuntimeTools";
import type { ProviderResolver } from "./providerResolutionContext";

export const resolveGeminiNativeToolTransport: ProviderResolver = async (ctx) => {
  const { agentConfig, deps, fetchImpl, additionalToolNames, buildProviderOpenAiTools, apiKeyRefResolver, credentialBroker, syncFetcher, recordLocalAvailability } = ctx;
  // Gemini 3 系列 + tools → 走 native generateContent 以支持 thought_signature
  // Platform proxy 的 OpenAI-compatible 路径无法传递 thought_signature
  if (
    shouldUsePlatformChatProvider(deps.env, agentConfig) &&
    isGemini3Model(agentConfig.model ?? "") &&
    agentConfig.provider === "google"
  ) {
    const providerConfig = await resolvePlatformChatProviderConfig({
      agentConfig,
      env: deps.env,
      apiKeyRefResolver,
      credentialBroker,
      syncFetcher,
    });
    const { requestedToolNames, tools } = resolveProviderOpenAiToolBundle(
      agentConfig,
      deps.env,
      buildProviderOpenAiTools,
      additionalToolNames,
    );

    // 只有本地有 API key 时才走 native route；
    // platform agent（无本地 key）由 server 端 chatHandler 的 native 路由处理
    if (
      tools.length > 0 &&
      providerConfig.apiKey &&
      shouldUseGeminiNativeToolRoute(
        agentConfig.provider ?? "",
        agentConfig.model ?? "",
        tools,
        () => false, // CLI 端不区分 image 模型
      )
    ) {
      logLocalRuntimeDiagnostic("provider.selected", {
        agentKey: agentConfig.key,
        transport: "gemini-native-tool",
        apiSource: agentConfig.apiSource ?? null,
        provider: providerConfig.provider,
        model: providerConfig.model,
        hasApiKey: Boolean(providerConfig.apiKey),
      });
      return {
        model: providerConfig.model,
        complete: async (messages, options) => {
          // 实际上游模型名 = providerConfig.model（下面 URL 里那个）。
          // 闸门判的是 agentConfig.model，两者此前相等（plan.model =
          // agentConfig.model），但平台 remap 后可能分歧；quirks 描述的是**上游
          // 模型**对 SKIP_THOUGHT_SIGNATURE 的接受度，所以哨兵判据必须锚在这个
          // 名字上，而不是闸门那个。与 customNativeProvider / 服务端 googleNativeChat
          // 用同一判据：gemini-3.5 / flash-preview 严格档收到哨兵会 400，
          // 或更隐蔽地回空 STOP 帧（0 completion tokens，模型假死沉默）。
          const model = providerConfig.model;
          const supportsToolImages = resolveToolImagePolicy({
            routeKind: "gemini-native",
            provider: providerConfig.usageProvider ?? providerConfig.provider,
            model: providerConfig.model,
            customProviderUrl: providerConfig.endpoint,
            hasVision: (agentConfig as any).hasVision,
          }).supportsToolImages;
          const requestBody = buildGeminiGenerateContentRequest({
            messages: messages as unknown[],
            tools: tools as unknown[],
            maxTokens: typeof agentConfig.max_tokens === "number"
              ? agentConfig.max_tokens
              : undefined,
            temperature: typeof agentConfig.temperature === "number"
              ? agentConfig.temperature
              : undefined,
            attachSkipThoughtSignature:
              resolveGeminiModelQuirks(model).allowsThoughtSignatureSentinel,
            supportsToolImages,
          });

          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;

          logLocalRuntimeDiagnostic("provider.request.start", {
            agentKey: agentConfig.key,
            transport: "gemini-native-tool",
            model,
            messageCount: messages.length,
            toolCount: tools.length,
            requestedToolNames,
          });

          const res = await fetchImpl(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": providerConfig.apiKey ?? "",
            },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(120000),
          });

          if (!res.ok) {
            const errText = await res.text();
            logLocalRuntimeDiagnostic("provider.request.failed", {
              agentKey: agentConfig.key,
              transport: "gemini-native-tool",
              status: res.status,
              error: errText.slice(0, 200),
            });
            // 把上游 HTTP 结论落进可用性记录：429 → 冷却该凭证；其他错误
            // status 也照实记录，由 recordLocalAvailability 内部决定语义。
            await recordLocalAvailability(res.status, errText);
            throw new Error(
              `gemini native tool provider failed: HTTP ${res.status} ${errText.slice(0, 500)}`,
            );
          }

          const chunks = await readSseDataValues(res, parseSseDataLineJson);
          const { text, toolCalls, usage } = accumulateGeminiChunks(chunks);

          if (text && options?.onTextDelta) {
            options.onTextDelta(text);
          }

          const result: AgentRuntimeResult = {
            content: text,
            model,
            tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
            finish_reason: toolCalls.length > 0 ? "tool_calls" : "stop",
            stream_complete: true,
            ...(usage ? { usage } : {}),
            trace: messages,
          };
          logLocalRuntimeDiagnostic("provider.request.result", {
            agentKey: agentConfig.key,
            transport: "gemini-native-tool",
            ok: true,
            contentChars: text.length,
            toolCallCount: toolCalls.length,
          });
          // 成功响应 = 上游可用：清掉该凭证的 429 冷却（对齐 devinTransport）。
          await recordLocalAvailability(200);
          return result;
        },
      };
    }
  }
  return null;
};
