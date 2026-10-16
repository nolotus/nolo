/**
 * transport 分支：custom provider 的三条 **native wire**，合并成一个壳。
 *
 * 三条 wire 的差异只有「打哪个 URL / 组哪个 body」，判别与准备逐字相同，因此此前
 * 三个各 40–50 行的同构文件（`geminiNativeCustomTransport.ts` /
 * `openAiResponsesCustomTransport.ts` / `anthropicMessagesCustomTransport.ts`）
 * 合并为本文件，按目录声明的 `nativeProtocol` 分派：
 * - `gemini`             → `POST {base}/models/{model}:streamGenerateContent?alt=sse`
 * - `openai-responses`   → `POST {base}/responses`
 * - `anthropic-messages` → `POST {base}/messages`
 *
 * 本文件只做**判别与准备**：`customProviderUrl` + 模型目录 `nativeProtocol` 的
 * gate、`resolveCliOpenAiProviderConfig` 取端点/凭据、工具包解析、
 * `provider.selected` 诊断。执行壳（fetch、SSE 聚合、结果构造、失败记账、
 * `provider.request.*` 诊断）在 `agent-runtime/customNativeProvider.ts`，与桌面本地
 * runtime 共用同一份实现（桌面是直连，不吃服务端翻译，必须在本地执行壳里支持）；
 * 「按 wire 选 builder」的 switch 也在那里，本文件把判出来的 wire 原样传进去即可。
 *
 * 各 wire 的历史注意点（实现都在共享执行器里，此处只留指路）：
 * - OpenCode Go 网关按模型分协议：声明 `provider.npm = "@ai-sdk/openai"` 的模型
 *   （gpt-6-luna / gpt-5.6-luna / grok-4.6 / grok-4.7 / muse-spark-*）不接受
 *   chat/completions（400 ModelProtocolUnsupported），只吃 responses wire；
 *   responses 流的终局判据比 gemini 严（缺 `response.completed` 的截断流不算成功），
 *   由 `readResponsesSseCompletion` 统一处理，不要自写事件状态机。
 * - gemini wire 的 `thoughtSignature` quirks 在 `geminiNativeShared.ts`。
 *
 * 零行为变更：三条通道此前的 gate 语义（`customProviderUrl` 必填 → wire 必须
 * 匹配 → key 为空则 `return null` 交给后续通道）、`provider.selected` 的字段与
 * `transport` 标签、以及执行壳入参逐字保持。回归网是三条通道各自的既有测试文件
 * （`geminiNativeCustomTransport.test.ts` / `openAiResponsesCustomTransport.test.ts`
 * / `anthropicMessagesCustomTransport.test.ts`，按新导出名指向本文件）。
 */
import { findModelConfig } from "../../../ai/llm/providers";
import {
  createCustomNativeProvider,
  TRANSPORT_LABEL,
} from "../../../agent-runtime/customNativeProvider";
import { resolveCliOpenAiProviderConfig } from "../localProviderResolver";
import { logLocalRuntimeDiagnostic } from "../localRuntimeDiagnostics";
import { resolveProviderOpenAiToolBundle } from "../localRuntimeTools";
import type { ProviderResolver } from "./providerResolutionContext";

/**
 * 三条 native wire 的统一闸门与分派。
 *
 * `nativeProtocol` 的类型（`ai/llm/types.ts`：`"gemini" | "openai-responses" |
 * "anthropic-messages"`）与执行器的 `CustomNativeWire` 是同一组字符串，所以
 * 「判 wire」与「分派」是同一次读取：`wire` 既是闸门条件，也是交给
 * `createCustomNativeProvider` 的分派键（它在内部 switch 到对应 builder）。
 * 目录里没有 `nativeProtocol`（或不在三种之内）的模型让出，由后续通道接手。
 */
export const resolveCustomNativeTransport: ProviderResolver = async (ctx) => {
  const { agentConfig, deps, apiKeyRefResolver, credentialBroker, syncFetcher, fetchImpl, recordLocalAvailability, buildProviderOpenAiTools, additionalToolNames } = ctx;
  if (!agentConfig.customProviderUrl) return null;
  const wire = findModelConfig(agentConfig.provider ?? "", agentConfig.model ?? "")?.nativeProtocol;
  if (!wire) return null;
  const config = await resolveCliOpenAiProviderConfig({ agentConfig, env: deps.env, apiKeyRefResolver, credentialBroker, syncFetcher });
  if (!config.apiKey) return null;
  const { requestedToolNames, tools } = resolveProviderOpenAiToolBundle(agentConfig, deps.env, buildProviderOpenAiTools, additionalToolNames);
  logLocalRuntimeDiagnostic("provider.selected", { agentKey: agentConfig.key, transport: TRANSPORT_LABEL[wire], provider: config.provider, model: config.model, hasApiKey: true });
  return createCustomNativeProvider({
    wire,
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
