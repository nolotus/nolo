import type { Agent } from "app/types";
import { asOptionalTrimmedString } from "core/optionalString";
import { resolveOutboundProxyApiKey } from "../../shared/providerSecrets";

export const buildProxyPayload = <T extends { provider?: string }>(
  bodyData: T,
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
  const apiKey = resolveOutboundProxyApiKey(agentConfig);

  return {
    ...bodyData,
    url: api,
    provider,
    agentKey: agentConfig.dbKey,
    ...(asOptionalTrimmedString(dialogId)
      ? { dialogId: asOptionalTrimmedString(dialogId) }
      : {}),
    ...(apiSource ? { apiSource } : {}),
    ...(agentConfig.apiKeyHeader ? { apiKeyHeader: agentConfig.apiKeyHeader } : {}),
    KEY: apiKey,
  };
};
