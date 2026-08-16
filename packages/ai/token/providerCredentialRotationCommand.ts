import {
  createProviderCredentialLifecycleEvent,
  type ProviderCredentialLifecycleEvent,
} from "./providerCredentialLifecycle";
import {
  buildProviderCredentialRegistryRegistration,
  type ProviderCredentialRegistryPublicSummary,
} from "./providerCredentialRegistryCommand";
import type {
  ProviderCredentialRegistryRecord,
  ProviderCredentialStatus,
} from "./providerCredentialRegistry";
import type { ProviderApiKeySource } from "./providerCredential";
import type { RuntimeCredentialEnv } from "./providerCredentialRuntime";

export type ProviderCredentialRotationPublicSummary = {
  oldCredential: {
    credentialId: string;
    provider: string;
    providerAccountKey: string;
    providerAccountAlias?: string;
    status: ProviderCredentialStatus;
    effectiveAt: string;
  };
  newCredential: ProviderCredentialRegistryPublicSummary;
};

export function buildProviderCredentialRotationPlan({
  oldRecord,
  newApiKey,
  newApiKeySource,
  env = process.env,
  oldStatus,
  effectiveAt,
  createdAt,
  eventId,
  actorId,
  reason,
  providerAccountAlias,
  officialBillingAccountId,
  note,
}: {
  oldRecord: ProviderCredentialRegistryRecord;
  newApiKey?: string | null;
  newApiKeySource: ProviderApiKeySource;
  env?: RuntimeCredentialEnv;
  oldStatus: Extract<ProviderCredentialStatus, "rotating" | "revoked">;
  effectiveAt: string;
  createdAt: string;
  eventId: string;
  actorId?: string | null;
  reason?: string | null;
  providerAccountAlias?: string | null;
  officialBillingAccountId?: string | null;
  note?: string | null;
}): {
  oldLifecycleEvent: ProviderCredentialLifecycleEvent;
  newRegistration: ReturnType<typeof buildProviderCredentialRegistryRegistration>;
  publicSummary: ProviderCredentialRotationPublicSummary;
} {
  const oldLifecycleEvent = createProviderCredentialLifecycleEvent({
    credentialId: oldRecord.credentialId,
    eventId,
    status: oldStatus,
    effectiveAt,
    createdAt,
    reason,
    actorId,
  });
  const newRegistration = buildProviderCredentialRegistryRegistration({
    provider: oldRecord.provider,
    apiKey: newApiKey,
    apiKeySource: newApiKeySource,
    env,
    providerAccountAlias:
      providerAccountAlias ?? oldRecord.providerAccountAlias ?? undefined,
    officialBillingAccountId:
      officialBillingAccountId ?? oldRecord.officialBillingAccountId ?? undefined,
    effectiveFrom: effectiveAt,
    createdAt,
    status: "active",
    note,
  });
  if (newRegistration.record.credentialId === oldRecord.credentialId) {
    throw new Error("new credential must differ from old credential");
  }
  return {
    oldLifecycleEvent,
    newRegistration,
    publicSummary: {
      oldCredential: {
        credentialId: oldRecord.credentialId,
        provider: oldRecord.provider,
        providerAccountKey: oldRecord.providerAccountKey,
        providerAccountAlias: oldRecord.providerAccountAlias,
        status: oldLifecycleEvent.status,
        effectiveAt: oldLifecycleEvent.effectiveAt,
      },
      newCredential: newRegistration.publicSummary,
    },
  };
}
