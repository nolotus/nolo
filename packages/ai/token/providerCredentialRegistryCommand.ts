import {
  createProviderCredentialIdentity,
  type ProviderApiKeySource,
} from "./providerCredential";
import {
  buildProviderCredentialRegistryKey,
  createProviderCredentialRegistryRecord,
  type ProviderCredentialRegistryRecord,
  type ProviderCredentialStatus,
} from "./providerCredentialRegistry";
import type { RuntimeCredentialEnv } from "./providerCredentialRuntime";

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

const credentialEnvironment = (env: RuntimeCredentialEnv) =>
  env.NOLO_DEPLOY_ENV?.trim() ||
  env.NOLO_ENV?.trim() ||
  env.NODE_ENV?.trim() ||
  undefined;

export function buildProviderCredentialRegistryRegistration({
  provider,
  apiKey,
  apiKeySource,
  env = process.env,
  providerAccountAlias,
  officialBillingAccountId,
  effectiveFrom,
  effectiveTo,
  createdAt,
  status = "active",
  note,
}: {
  provider: string;
  apiKey?: string | null;
  apiKeySource: ProviderApiKeySource;
  env?: RuntimeCredentialEnv;
  providerAccountAlias?: string | null;
  officialBillingAccountId?: string | null;
  effectiveFrom: string;
  effectiveTo?: string;
  createdAt: string;
  status?: ProviderCredentialStatus;
  note?: string | null;
}): {
  key: string;
  record: ProviderCredentialRegistryRecord;
  publicSummary: ProviderCredentialRegistryPublicSummary;
} {
  if (!apiKey?.trim()) {
    throw new Error("api key is required");
  }
  const identity = createProviderCredentialIdentity({
    provider,
    apiKey,
    apiKeySource,
    providerAccountAlias,
    environment: credentialEnvironment(env),
  });
  const record = createProviderCredentialRegistryRecord({
    provider,
    identity,
    status,
    effectiveFrom,
    effectiveTo,
    createdAt,
    officialBillingAccountId,
    note,
  });
  return {
    key: buildProviderCredentialRegistryKey(record.credentialId),
    record,
    publicSummary: {
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
    },
  };
}
