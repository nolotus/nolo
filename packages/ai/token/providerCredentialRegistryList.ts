import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";

import type { ProviderApiKeySource } from "./providerCredential";
import type { ProviderCredentialLifecycleEvent } from "./providerCredentialLifecycle";
import type {
  ProviderCredentialRegistryRecord,
  ProviderCredentialStatus,
} from "./providerCredentialRegistry";

export type ProviderCredentialRegistryPublicSummary = {
  credentialId: string;
  provider: string;
  providerAccountKey: string;
  providerAccountAlias?: string;
  apiKeySource: ProviderApiKeySource;
  environment?: string;
  officialBillingAccountId?: string;
  status: ProviderCredentialStatus;
  effectiveFrom: string;
  effectiveTo?: string;
};

export type ProviderCredentialRegistryListStore = {
  iterator(options?: {
    gte?: string;
    lte?: string;
  }): AsyncIterable<[string, unknown]>;
};

const REGISTRY_PREFIX = "provider-credential-";
const LIFECYCLE_PREFIX = "provider-credential-lifecycle-";

function isRegistryRecord(value: unknown): value is ProviderCredentialRegistryRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<ProviderCredentialRegistryRecord>;
  return (
    record.schemaVersion === 1 &&
    record.recordType === "provider_credential" &&
    typeof record.credentialId === "string" &&
    typeof record.provider === "string" &&
    typeof record.providerAccountKey === "string" &&
    typeof record.credentialFingerprint === "string" &&
    typeof record.apiKeySource === "string" &&
    typeof record.status === "string" &&
    typeof record.effectiveFrom === "string"
  );
}

function isLifecycleEvent(value: unknown): value is ProviderCredentialLifecycleEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<ProviderCredentialLifecycleEvent>;
  return (
    event.schemaVersion === 1 &&
    event.recordType === "provider_credential_lifecycle_event" &&
    typeof event.credentialId === "string" &&
    typeof event.eventId === "string" &&
    typeof event.status === "string" &&
    typeof event.effectiveAt === "string" &&
    typeof event.createdAt === "string"
  );
}

function toPublicSummary(
  record: ProviderCredentialRegistryRecord
): ProviderCredentialRegistryPublicSummary {
  return {
    credentialId: record.credentialId,
    provider: record.provider,
    providerAccountKey: record.providerAccountKey,
    providerAccountAlias: record.providerAccountAlias,
    apiKeySource: record.apiKeySource,
    environment: record.environment,
    officialBillingAccountId: record.officialBillingAccountId,
    status: record.status,
    effectiveFrom: record.effectiveFrom,
    effectiveTo: record.effectiveTo,
  };
}

export async function listProviderCredentialRegistryRecords({
  store,
  provider,
  status,
  at = new Date().toISOString(),
}: {
  store: ProviderCredentialRegistryListStore;
  provider?: string;
  status?: ProviderCredentialStatus;
  at?: string;
}): Promise<{
  count: number;
  credentials: ProviderCredentialRegistryPublicSummary[];
}> {
  const normalizedProvider =
    provider != null ? asTrimmedLowercaseString(provider) : undefined;
  const lifecycleByCredential = new Map<string, ProviderCredentialLifecycleEvent>();
  const atMs = Date.parse(at);

  for await (const [, value] of store.iterator({
    gte: LIFECYCLE_PREFIX,
    lte: `${LIFECYCLE_PREFIX}\uffff`,
  })) {
    if (!isLifecycleEvent(value)) continue;
    const effectiveMs = Date.parse(value.effectiveAt);
    if (!Number.isFinite(effectiveMs) || effectiveMs > atMs) continue;
    const existing = lifecycleByCredential.get(value.credentialId);
    if (
      !existing ||
      Date.parse(existing.effectiveAt) < effectiveMs ||
      (existing.effectiveAt === value.effectiveAt &&
        existing.createdAt < value.createdAt)
    ) {
      lifecycleByCredential.set(value.credentialId, value);
    }
  }

  const credentials: ProviderCredentialRegistryPublicSummary[] = [];
  for await (const [, value] of store.iterator({
    gte: REGISTRY_PREFIX,
    lte: `${REGISTRY_PREFIX}\uffff`,
  })) {
    if (!isRegistryRecord(value)) continue;
    if (normalizedProvider && value.provider !== normalizedProvider) continue;
    const summary = toPublicSummary(value);
    const lifecycle = lifecycleByCredential.get(value.credentialId);
    if (lifecycle) {
      summary.status = lifecycle.status;
      if (lifecycle.status === "revoked") {
        summary.effectiveTo = lifecycle.effectiveAt;
      }
    }
    if (status && summary.status !== status) continue;
    credentials.push(summary);
  }

  credentials.sort(
    (a, b) =>
      a.provider.localeCompare(b.provider) ||
      a.providerAccountKey.localeCompare(b.providerAccountKey) ||
      a.credentialId.localeCompare(b.credentialId)
  );
  return {
    count: credentials.length,
    credentials,
  };
}
