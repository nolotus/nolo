/**
 * transport 分支：Devin Connect
 *
 * Devin OAuth uses ConnectRPC + protobuf wire (HTTP/2 to server.codeium.com),
 * not OpenAI-compatible chat.completions. Route through createDevinProvider.
 */
import {
  createDevinProvider,
  isDevinOAuthAgent,
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
        return devinProvider.complete(messages, options);
      },
    };
  }

  return null;
};
