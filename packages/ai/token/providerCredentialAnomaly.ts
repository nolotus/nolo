import {
  createBillingAnomaly,
  type BillingAnomaly,
} from "./billingAnomaly";
import type { ProviderCallEvent } from "./providerCall";
import type { ProviderCredentialIdentity } from "./providerCredential";
import { isDuplicateBillingAnomalyError } from "./isDuplicateBillingAnomalyError";

export type BillingAnomalyWriterLike = (args: {
  store: {
    get(key: string): Promise<unknown>;
    put(key: string, value: unknown): Promise<void>;
  };
  anomaly: BillingAnomaly;
}) => Promise<{ key: string }>;

export type BillingAnomalyWriteStore = Parameters<BillingAnomalyWriterLike>[0]["store"];

export { isDuplicateBillingAnomalyError };

export function createRevokedProviderCredentialUsedAnomaly({
  event,
  credential,
  createdAt,
}: {
  event: ProviderCallEvent;
  credential: ProviderCredentialIdentity;
  createdAt: string;
}): BillingAnomaly {
  return createBillingAnomaly({
    anomalyId: `anom_provider_credential_revoked_used_${event.providerCallId}`,
    kind: "provider_credential_revoked_used",
    severity: "high",
    stage: "provider_call",
    userId: event.userId,
    dialogId: event.dialogId,
    agentId: event.agentId,
    provider: event.provider,
    model: event.model,
    providerCallId: event.providerCallId,
    message: "Revoked provider credential was used for a provider call",
    evidence: {
      credentialId: credential.credentialId,
      providerAccountKey: credential.providerAccountKey,
      providerAccountAlias: credential.providerAccountAlias,
      officialBillingAccountId: credential.officialBillingAccountId,
      apiKeySource: credential.apiKeySource,
      environment: credential.environment,
      registryStatus: credential.registryStatus,
      registryEffectiveFrom: credential.registryEffectiveFrom,
      registryEffectiveTo: credential.registryEffectiveTo,
      providerCallStatus: event.status,
    },
    createdAt,
  });
}

export function createRevokedProviderCredentialBlockedAnomaly({
  event,
  credential,
  createdAt,
}: {
  event: ProviderCallEvent;
  credential: ProviderCredentialIdentity;
  createdAt: string;
}): BillingAnomaly {
  return createBillingAnomaly({
    anomalyId: `anom_provider_credential_revoked_blocked_${event.providerCallId}`,
    kind: "provider_credential_revoked_blocked",
    severity: "critical",
    stage: "provider_call",
    userId: event.userId,
    dialogId: event.dialogId,
    agentId: event.agentId,
    provider: event.provider,
    model: event.model,
    providerCallId: event.providerCallId,
    message: "Revoked provider credential was blocked before provider dispatch",
    evidence: {
      credentialId: credential.credentialId,
      providerAccountKey: credential.providerAccountKey,
      providerAccountAlias: credential.providerAccountAlias,
      officialBillingAccountId: credential.officialBillingAccountId,
      apiKeySource: credential.apiKeySource,
      environment: credential.environment,
      registryStatus: credential.registryStatus,
      registryEffectiveFrom: credential.registryEffectiveFrom,
      registryEffectiveTo: credential.registryEffectiveTo,
      providerCallStatus: event.status,
      blockedBeforeDispatch: true,
    },
    createdAt,
  });
}

export async function writeRevokedProviderCredentialUsedAnomalyIfNeeded({
  store,
  event,
  now = () => new Date(),
  billingAnomalyWriter,
  onError,
}: {
  store: BillingAnomalyWriteStore;
  event: ProviderCallEvent;
  now?: () => Date;
  billingAnomalyWriter: BillingAnomalyWriterLike;
  onError?: (error: unknown) => void;
}) {
  const credential = event.credential;
  if (credential?.registryStatus !== "revoked") return;
  try {
    await billingAnomalyWriter({
      store,
      anomaly: createRevokedProviderCredentialUsedAnomaly({
        event,
        credential,
        createdAt: now().toISOString(),
      }),
    });
  } catch (error) {
    if (isDuplicateBillingAnomalyError(error)) return;
    onError?.(error);
  }
}

export async function writeRevokedProviderCredentialBlockedAnomalyIfNeeded({
  store,
  event,
  now = () => new Date(),
  billingAnomalyWriter,
  onError,
}: {
  store: BillingAnomalyWriteStore;
  event: ProviderCallEvent;
  now?: () => Date;
  billingAnomalyWriter: BillingAnomalyWriterLike;
  onError?: (error: unknown) => void;
}) {
  const credential = event.credential;
  if (credential?.registryStatus !== "revoked") return;
  try {
    await billingAnomalyWriter({
      store,
      anomaly: createRevokedProviderCredentialBlockedAnomaly({
        event,
        credential,
        createdAt: now().toISOString(),
      }),
    });
  } catch (error) {
    if (isDuplicateBillingAnomalyError(error)) return;
    onError?.(error);
  }
}
