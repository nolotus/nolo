import type { ProviderCredentialIdentity } from "./providerCredential";

export type ProviderDispatchIntentStatus = "dispatching";

export type ProviderDispatchIntent = {
  providerCallId: string;
  intentId: string;
  userId: string;
  dialogId?: string;
  agentId?: string;
  provider: string;
  model: string;
  endpoint?: string;
  serviceTier?: string;
  credential?: ProviderCredentialIdentity;
  request: {
    url: string;
    method: string;
    bodyHash?: string;
  };
  status: ProviderDispatchIntentStatus;
  createdAt: string;
};

export type CreateProviderDispatchIntentInput = {
  providerCallId: string;
  intentId: string;
  userId: string;
  dialogId?: string;
  agentId?: string;
  provider: string;
  model: string;
  endpoint?: string;
  serviceTier?: string;
  credential?: ProviderCredentialIdentity;
  url: string;
  method: string;
  bodyHash?: string;
  createdAt: string;
};

export const buildProviderDispatchIntentKey = (
  providerCallId: string,
  intentId: string
) => `provider-dispatch-intent-${providerCallId}-${intentId}`;

export const createProviderDispatchIntent = (
  input: CreateProviderDispatchIntentInput
): ProviderDispatchIntent => ({
  providerCallId: input.providerCallId,
  intentId: input.intentId,
  userId: input.userId,
  dialogId: input.dialogId,
  agentId: input.agentId,
  provider: input.provider,
  model: input.model,
  endpoint: input.endpoint,
  serviceTier: input.serviceTier,
  credential: input.credential,
  request: {
    url: input.url,
    method: input.method,
    bodyHash: input.bodyHash,
  },
  status: "dispatching",
  createdAt: input.createdAt,
});
