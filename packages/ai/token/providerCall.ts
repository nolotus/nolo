import type { ProviderCredentialIdentity } from "./providerCredential";

export type ProviderCallStatus =
  | "pending"
  | "completed"
  | "failed"
  | "interrupted"
  | "anomaly";

export type ProviderCallBillingStatus =
  | "unpriced"
  | "pending_ledger"
  | "charged"
  | "zero_policy"
  | "failed";

export type ProviderCallBase = {
  providerCallId: string;
  eventId: string;
  userId: string;
  dialogId?: string;
  agentId?: string;
  provider: string;
  model: string;
  endpoint?: string;
  serviceTier?: string;
  credential?: ProviderCredentialIdentity;
  startedAt: string;
};

export type ProviderCallPendingEvent = ProviderCallBase & {
  status: "pending";
};

export type ProviderCallCompletedEvent = ProviderCallBase & {
  status: "completed";
  completedAt: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationInputTokens: number;
    cacheReadInputTokens: number;
  };
  cost: {
    rawProviderCost?: number;
    rawProviderCurrency?: string;
    platformCredits?: number;
    pricingVersion?: string;
  };
  billingStatus: ProviderCallBillingStatus;
};

export type ProviderCallFailedEvent = ProviderCallBase & {
  status: "failed";
  failedAt: string;
  error: {
    name?: string;
    message: string;
  };
  billingStatus: "failed";
};

export type ProviderCallEvent =
  | ProviderCallPendingEvent
  | ProviderCallCompletedEvent
  | ProviderCallFailedEvent;

export const buildProviderCallKey = (providerCallId: string, eventId: string) =>
  `provider-call-${providerCallId}-event-${eventId}`;

export const createProviderCallPendingEvent = (
  input: ProviderCallBase
): ProviderCallPendingEvent => ({
  ...input,
  status: "pending",
});

export const createProviderCallCompletedEvent = (
  input: ProviderCallBase & {
    completedAt: string;
    inputTokens: number;
    outputTokens: number;
    cacheCreationInputTokens: number;
    cacheReadInputTokens: number;
    rawProviderCost?: number;
    rawProviderCurrency?: string;
    platformCredits?: number;
    pricingVersion?: string;
    billingStatus: ProviderCallBillingStatus;
  }
): ProviderCallCompletedEvent => ({
  providerCallId: input.providerCallId,
  eventId: input.eventId,
  userId: input.userId,
  dialogId: input.dialogId,
  agentId: input.agentId,
  provider: input.provider,
  model: input.model,
  endpoint: input.endpoint,
  serviceTier: input.serviceTier,
  credential: input.credential,
  startedAt: input.startedAt,
  status: "completed",
  completedAt: input.completedAt,
  usage: {
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    cacheCreationInputTokens: input.cacheCreationInputTokens,
    cacheReadInputTokens: input.cacheReadInputTokens,
  },
  cost: {
    rawProviderCost: input.rawProviderCost,
    rawProviderCurrency: input.rawProviderCurrency,
    platformCredits: input.platformCredits,
    pricingVersion: input.pricingVersion,
  },
  billingStatus: input.billingStatus,
});

export const createProviderCallFailedEvent = (
  input: ProviderCallBase & {
    failedAt: string;
    error: {
      name?: string;
      message: string;
    };
  }
): ProviderCallFailedEvent => ({
  providerCallId: input.providerCallId,
  eventId: input.eventId,
  userId: input.userId,
  dialogId: input.dialogId,
  agentId: input.agentId,
  provider: input.provider,
  model: input.model,
  endpoint: input.endpoint,
  serviceTier: input.serviceTier,
  credential: input.credential,
  startedAt: input.startedAt,
  status: "failed",
  failedAt: input.failedAt,
  error: input.error,
  billingStatus: "failed",
});
