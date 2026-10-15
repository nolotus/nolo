/**
 * transport 分支：custom provider 的 **gemini native** wire
 * （`POST {base}/models/{model}:streamGenerateContent?alt=sse`）。
 *
 * 本文件只做**判别与准备**：`customProviderUrl` + 模型目录 `nativeProtocol` 的
 * gate、`resolveCliOpenAiProviderConfig` 取端点/凭据、工具包解析、
 * `provider.selected` 诊断。真正的执行壳（fetch、SSE 聚合、结果构造、失败记账、
 * `provider.request.*` 诊断）在 `agent-runtime/customNativeProvider.ts`，与桌面本地
 * runtime 共用同一份实现（桌面是直连，不吃服务端翻译，必须在本地执行壳里支持）。
 *
 * 行为与拆分前逐字等价，回归网是 `geminiNativeCustomTransport.test.ts`。
 */
import { findModelConfig } from "../../../ai/llm/providers";
import { createCustomNativeProvider } from "../../../agent-runtime/customNativeProvider";
import { resolveCliOpenAiProviderConfig } from "../localProviderResolver";
import { logLocalRuntimeDiagnostic } from "../localRuntimeDiagnostics";
import { resolveProviderOpenAiToolBundle } from "../localRuntimeTools";
import type { ProviderResolver } from "./providerResolutionContext";

export const resolveGeminiNativeCustomTransport: ProviderResolver = async (ctx) => {
  const { agentConfig, deps, apiKeyRefResolver, credentialBroker, syncFetcher, fetchImpl, recordLocalAvailability, buildProviderOpenAiTools, additionalToolNames } = ctx;
  if (!agentConfig.customProviderUrl || findModelConfig(agentConfig.provider ?? "", agentConfig.model ?? "")?.nativeProtocol !== "gemini") return null;
  const config = await resolveCliOpenAiProviderConfig({ agentConfig, env: deps.env, apiKeyRefResolver, credentialBroker, syncFetcher });
  if (!config.apiKey) return null;
  const { requestedToolNames, tools } = resolveProviderOpenAiToolBundle(agentConfig, deps.env, buildProviderOpenAiTools, additionalToolNames);
  logLocalRuntimeDiagnostic("provider.selected", { agentKey: agentConfig.key, transport: "gemini-native-custom", provider: config.provider, model: config.model, hasApiKey: true });
  return createCustomNativeProvider({
    wire: "gemini",
    model: config.model,
    // 契约端点（chat/completions 形状）；native 路径由共享执行器按 wire 拼。
    endpoint: config.endpoint,
    apiKey: config.apiKey,
    agentConfig,
    tools,
    fetchImpl,
    requestedToolNames,
    serverUrl: ctx.serverUrl,
    authToken: ctx.authToken,
    log: logLocalRuntimeDiagnostic,
    recordAvailability: recordLocalAvailability,
  });
};
