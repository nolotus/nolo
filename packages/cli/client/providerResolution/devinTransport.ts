/**
 * transport 分支：Devin Connect
 *
 * Devin OAuth uses ConnectRPC + protobuf wire (HTTP/2 to server.codeium.com),
 * not OpenAI-compatible chat.completions. Route through createDevinProvider.
 */
import {
  createDevinProvider,
  isDevinOAuthAgent,
  readDevinUpstreamFailure,
} from "../../../agent-runtime";
import { logLocalRuntimeDiagnostic } from "../localRuntimeDiagnostics";
import { resolveProviderOpenAiToolBundle } from "../localRuntimeTools";
import type { ProviderResolver } from "./providerResolutionContext";

export const resolveDevinTransport: ProviderResolver = async (ctx) => {
  const {
    agentConfig,
    apiKeyRefResolver,
    deps,
    buildProviderOpenAiTools,
    additionalToolNames,
    recordLocalAvailability,
  } = ctx;

  if (isDevinOAuthAgent(agentConfig)) {
    const accessToken = await apiKeyRefResolver("devin");
    if (!accessToken) {
      throw new Error(
        'OAuth credential for "devin" not found locally. Run `nolo auth devin`.',
      );
    }

    const model = agentConfig.model || "swe-2-max";
    const { requestedToolNames, tools } = resolveProviderOpenAiToolBundle(
      agentConfig,
      deps.env,
      buildProviderOpenAiTools,
      additionalToolNames,
    );

    const devinProvider = createDevinProvider({
      token: accessToken,
      model,
      fetchImpl: ctx.fetchImpl,
      tools,
      // agentConfig.temperature reaches every transport except the Devin one;
      // forward it so the agent form's sampling knob stops being a no-op here.
      // Left undefined it keeps the upstream client's value.
      temperature: typeof agentConfig.temperature === "number"
        ? agentConfig.temperature
        : undefined,
    });

    logLocalRuntimeDiagnostic("provider.selected", {
      agentKey: agentConfig.key,
      transport: "devin-connect",
      provider: "devin",
      model,
      hasApiKey: true,
      toolCount: tools.length,
      requestedToolNames,
      temperature: typeof agentConfig.temperature === "number"
        ? agentConfig.temperature
        : null,
    });

    return {
      model,
      complete: async (messages, options) => {
        try {
          const result = await devinProvider.complete(messages, options);
          // 成功响应 = 上游可用：清掉该凭证的 429 冷却。此前本通道没有接
          // recordLocalAvailability，被标记的冷却"只进不出"——连探测成功
          // 都不会清除，agent 会一直被门控拦到冷却上限时刻。
          await recordLocalAvailability(200);
          return result;
        } catch (error) {
          // Devin Connect 的上游失败以 Error 抛出；HTTP 非 2xx 与
          // resource_exhausted trailer 会把可用性信号附在错误上。
          const failure = readDevinUpstreamFailure(error);
          if (failure) {
            await recordLocalAvailability(failure.status, failure.body);
          }
          throw error;
        }
      },
    };
  }

  return null;
};
