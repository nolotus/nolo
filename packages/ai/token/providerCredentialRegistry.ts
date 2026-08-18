import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";

import { assertIsoTimestamp } from "./assertIsoTimestamp";
import type {
  ProviderApiKeySource,
  ProviderCredentialIdentity,
} from "./providerCredential";

export type ProviderCredentialStatus = "active" | "rotating" | "revoked";

export type ProviderCredentialRegistryRecord = {
  schemaVersion: 1;
  recordType: "provider_credential";
  credentialId: string;
  provider: string;
  providerAccountKey: string;
  credentialFingerprint: string;
  apiKeySource: ProviderApiKeySource;
  status: ProviderCredentialStatus;
  effectiveFrom: string;
  effectiveTo?: string;
  createdAt: string;
  providerAccountAlias?: string;
  environment?: string;
  officialBillingAccountId?: string;
  note?: string;
};

export const buildProviderCredentialRegistryKey = (credentialId: string) =>
  `provider-credential-${credentialId}`;

export function createProviderCredentialRegistryRecord({
  provider,
  identity,
  status,
  effectiveFrom,
  effectiveTo,
  createdAt,
  officialBillingAccountId,
  note,
}: {
  provider: string;
  identity?: ProviderCredentialIdentity;
  status: ProviderCredentialStatus;
  effectiveFrom: string;
  effectiveTo?: string;
  createdAt: string;
  officialBillingAccountId?: string | null;
  note?: string | null;
}): ProviderCredentialRegistryRecord {
  if (!identity) {
    throw new Error("provider credential identity is required");
  }
  assertIsoTimestamp("effectiveFrom", effectiveFrom);
  assertIsoTimestamp("createdAt", createdAt);
  if (effectiveTo) assertIsoTimestamp("effectiveTo", effectiveTo);
  const normalizedProvider = asTrimmedLowercaseString(provider) || "unknown";
  return {
    schemaVersion: 1,
    recordType: "provider_credential",
    credentialId: identity.credentialId,
    provider: normalizedProvider,
    providerAccountKey: identity.providerAccountKey,
    credentialFingerprint: identity.credentialFingerprint,
    apiKeySource: identity.apiKeySource,
    status,
    effectiveFrom,
    ...(effectiveTo ? { effectiveTo } : {}),
    createdAt,
    ...(identity.providerAccountAlias
      ? { providerAccountAlias: identity.providerAccountAlias }
      : {}),
    ...(identity.environment ? { environment: identity.environment } : {}),
    ...(officialBillingAccountId?.trim()
      ? { officialBillingAccountId: officialBillingAccountId.trim() }
      : {}),
    ...(note?.trim() ? { note: note.trim() } : {}),
  };
}
