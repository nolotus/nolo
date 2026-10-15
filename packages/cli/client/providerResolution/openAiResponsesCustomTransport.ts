/**
 * transport 分支：custom provider 的 **OpenAI Responses** wire（`POST {base}/responses`）。
 *
 * OpenCode Go 网关按模型分协议：声明 `provider.npm = "@ai-sdk/openai"` 的模型
 * （gpt-6-luna / gpt-5.6-luna / grok-4.6 / grok-4.7 / muse-spark-*）不接受
 * chat/completions（400 ModelProtocolUnsupported），只吃 responses wire。
 *
 * 本文件只做**判别与准备**：`customProviderUrl` + 模型目录 `nativeProtocol` 的
 * gate、`resolveCliOpenAiProviderConfig` 取端点/凭据、工具包解析、
 * `provider.selected` 诊断。执行壳（含流解析）在
 * `agent-runtime/customNativeProvider.ts`，与桌面本地 runtime 共用（桌面是直连，
 * 不吃服务端翻译，必须在本地执行壳里支持）。
 *
 * 流解析一律走共享实现 `readResponsesSseCompletion`（`responsesSseStream.ts`）——
 * 它内含 `responsesToolCallAccumulator` 的 item 身份处理（`item_id` 与 `call_id`
 * 合法地可以不同）、严格终局判据与失败分类。**不要**自写事件状态机：手搓版本会
 * （1）把缺 `response.completed` 的截断流报成成功、（2）丢掉只带 `item_id` 的参数
 * delta。
 *
 * 与 Google 原生通道不同，responses wire 需要显式 `requireResponseCompleted`：
 * 上游是标准 Responses 事件流，`[DONE]` 之类的 legacy 哨兵不算成功终局。
 */
import { findModelConfig } from "../../../ai/llm/providers";
import { createCustomNativeProvider } from "../../../agent-runtime/customNativeProvider";
import { resolveCliOpenAiProviderConfig } from "../localProviderResolver";
import { logLocalRuntimeDiagnostic } from "../localRuntimeDiagnostics";
import { resolveProviderOpenAiToolBundle } from "../localRuntimeTools";
import type { ProviderResolver } from "./providerResolutionContext";

export const resolveOpenAiResponsesCustomTransport: ProviderResolver = async (ctx) => {
  const { agentConfig, deps, apiKeyRefResolver, credentialBroker, syncFetcher, fetchImpl, recordLocalAvailability, buildProviderOpenAiTools, additionalToolNames } = ctx;
  if (!agentConfig.customProviderUrl || findModelConfig(agentConfig.provider ?? "", agentConfig.model ?? "")?.nativeProtocol !== "openai-responses") return null;
  const config = await resolveCliOpenAiProviderConfig({ agentConfig, env: deps.env, apiKeyRefResolver, credentialBroker, syncFetcher });
  if (!config.apiKey) return null;
  const { requestedToolNames, tools } = resolveProviderOpenAiToolBundle(agentConfig, deps.env, buildProviderOpenAiTools, additionalToolNames);
  logLocalRuntimeDiagnostic("provider.selected", { agentKey: agentConfig.key, transport: "openai-responses-custom", provider: config.provider, model: config.model, hasApiKey: true });
  return createCustomNativeProvider({
    wire: "openai-responses",
    model: config.model,
    // 契约端点（chat/completions 形状）；native 路径由共享执行器按 wire 拼。
    endpoint: config.endpoint,
    apiKey: config.apiKey,
    agentConfig,
    tools,
    fetchImpl,
    requestedToolNames,
    log: logLocalRuntimeDiagnostic,
    recordAvailability: recordLocalAvailability,
  });
};
