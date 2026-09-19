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
import type { ProviderResolver } from "./providerResolutionContext";

export const resolveDevinTransport: ProviderResolver = async (ctx) => {
  const { agentConfig, apiKeyRefResolver } = ctx;

  if (isDevinOAuthAgent(agentConfig)) {
    const accessToken = await apiKeyRefResolver("devin");
    if (!accessToken) {
      throw new Error(
        'OAuth credential for "devin" not found locally. Run `nolo auth devin`.',
      );
    }

    const model = agentConfig.model || "swe-2-max";

    logLocalRuntimeDiagnostic("provider.selected", {
      agentKey: agentConfig.key,
      transport: "devin-connect",
      provider: "devin",
      model,
      hasApiKey: true,
    });

    const devinProvider = createDevinProvider({
      token: accessToken,
      model,
      fetchImpl: ctx.fetchImpl,
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
