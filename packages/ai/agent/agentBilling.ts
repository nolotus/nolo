import { isOAuthApiKeyRef } from "agent-runtime/serverProxyPolicy";

export type BillingSource =
  | "user_subscription"
  | "user_api"
  | "platform_credits"
  | "local";

export interface AgentBillingCandidate {
  local?: boolean;
  isLocal?: boolean;
  cliProvider?: string | null;
  apiSource?: string | null;
  provider?: string | null;
  billingSource?: BillingSource | string | null;
  isOAuth?: boolean;
  apiKeyRef?: string | null;
  isOwned?: boolean;
  isPublic?: boolean;
}

export function resolveBillingSource(candidate: AgentBillingCandidate): BillingSource {
  if (
    candidate?.local === true || candidate?.isLocal === true ||
    candidate?.cliProvider === "local" || candidate?.apiSource === "local" ||
    candidate?.provider === "local" || candidate?.billingSource === "local"
  ) return "local";

  // Public/non-owned records may self-declare OAuth/custom fields; those fields
  // do not prove that the current user owns the credential.
  if (candidate?.isOwned !== true) return "platform_credits";

  if (
    candidate?.isOAuth === true || candidate?.billingSource === "user_subscription" ||
    candidate?.apiSource === "oauth" || isOAuthApiKeyRef(candidate?.apiKeyRef)
  ) return "user_subscription";
  if (candidate?.apiSource === "custom" || candidate?.billingSource === "user_api") {
    return "user_api";
  }
  return "platform_credits";
}
