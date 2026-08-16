import { asOptionalFiniteNumber } from "core/optionalNumber";
import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";

import type { ProviderCredentialIdentity } from "./providerCredential";
import type { ProviderCredentialLifecycleEvent } from "./providerCredentialLifecycle";
import {
  buildProviderCredentialRegistryKey,
  type ProviderCredentialRegistryRecord,
} from "./providerCredentialRegistry";
import { isMissingRecordError } from "./isMissingRecordError";

export type ProviderCredentialRegistryReadStore = {
  get(key: string): Promise<unknown>;
  iterator?(options?: {
    gte?: string;
    lte?: string;
  }): AsyncIterable<[string, unknown]>;
};

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
    typeof record.status === "string"
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

function isEffective(record: ProviderCredentialRegistryRecord, at: string) {
  const atMs = Date.parse(at);
  const fromMs = Date.parse(record.effectiveFrom);
  const toMs = record.effectiveTo ? Date.parse(record.effectiveTo) : undefined;
  if (!Number.isFinite(atMs) || !Number.isFinite(fromMs)) return false;
  if (atMs < fromMs) return false;
  const finiteToMs = asOptionalFiniteNumber(toMs);
  return finiteToMs === undefined || atMs < finiteToMs;
}

async function readLatestLifecycleEvent(args: {
  store?: ProviderCredentialRegistryReadStore;
  credentialId: string;
  at: string;
}) {
  const iterator = args.store?.iterator;
  if (!iterator) return undefined;
  const prefix = `provider-credential-lifecycle-${args.credentialId}-event-`;
  const atMs = Date.parse(args.at);
  let latest: ProviderCredentialLifecycleEvent | undefined;
  for await (const [, value] of iterator({
    gte: prefix,
    lte: `${prefix}\uffff`,
  })) {
    if (!isLifecycleEvent(value)) continue;
    const effectiveMs = Date.parse(value.effectiveAt);
    if (!Number.isFinite(effectiveMs) || effectiveMs > atMs) continue;
    if (
      !latest ||
      Date.parse(latest.effectiveAt) < effectiveMs ||
      (latest.effectiveAt === value.effectiveAt && latest.createdAt < value.createdAt)
    ) {
      latest = value;
    }
  }
  return latest;
}

export async function resolveProviderCredentialIdentity({
  store,
  provider,
  identity,
  at = new Date().toISOString(),
}: {
  store?: ProviderCredentialRegistryReadStore;
  provider: string;
  identity?: ProviderCredentialIdentity;
  at?: string;
}): Promise<ProviderCredentialIdentity | undefined> {
  if (!identity || !store) return identity;
  let value: unknown;
  try {
    value = await store.get(buildProviderCredentialRegistryKey(identity.credentialId));
  } catch (error) {
    if (isMissingRecordError(error)) return identity;
    throw error;
  }
  if (!isRegistryRecord(value)) return identity;
  const record = value;
  if (record.provider !== asTrimmedLowercaseString(provider)) return identity;
  if (record.credentialFingerprint !== identity.credentialFingerprint) return identity;
  if (!isEffective(record, at)) return identity;
  const lifecycle = await readLatestLifecycleEvent({
    store,
    credentialId: record.credentialId,
    at,
  });
  const registryStatus = lifecycle?.status ?? record.status;
  const registryEffectiveTo =
    lifecycle?.status === "revoked"
      ? lifecycle.effectiveAt
      : record.effectiveTo;
  return {
    ...identity,
    providerAccountKey: record.providerAccountKey,
    ...(record.providerAccountAlias
      ? { providerAccountAlias: record.providerAccountAlias }
      : {}),
    ...(record.environment ? { environment: record.environment } : {}),
    ...(record.officialBillingAccountId
      ? { officialBillingAccountId: record.officialBillingAccountId }
      : {}),
    registryStatus,
    registryEffectiveFrom: record.effectiveFrom,
    ...(registryEffectiveTo ? { registryEffectiveTo } : {}),
  };
}
