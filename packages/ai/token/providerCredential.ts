import crypto from "crypto";
import { asOptionalTrimmedString } from "core/optionalString";
import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";

export type ProviderApiKeySource =
  | "platform_env"
  | "agent_secret"
  | "agent_reference"
  | "user_secret"
  | "space_secret"
  | "unknown";

export type ProviderCredentialIdentity = {
  credentialId: string;
  credentialFingerprint: string;
  providerAccountKey: string;
  apiKeySource: ProviderApiKeySource;
  providerAccountAlias?: string;
  environment?: string;
  officialBillingAccountId?: string;
  registryStatus?: "active" | "rotating" | "revoked";
  registryEffectiveFrom?: string;
  registryEffectiveTo?: string;
};

const normalizeToken = (value?: string | null) =>
  asOptionalTrimmedString(value) ?? "";

const safeTokenHash = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

const normalizeKeyPart = (value: string) =>
  asTrimmedLowercaseString(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";

export function buildProviderAccountKey({
  provider,
  apiKeySource,
  providerAccountAlias,
  environment,
}: {
  provider: string;
  apiKeySource: ProviderApiKeySource;
  providerAccountAlias?: string | null;
  environment?: string | null;
}) {
  const providerPart = normalizeKeyPart(provider);
  const environmentPart = environment?.trim()
    ? normalizeKeyPart(environment)
    : "unknown-env";
  const accountPart = providerAccountAlias?.trim()
    ? normalizeKeyPart(providerAccountAlias)
    : normalizeKeyPart(apiKeySource);
  return `provider-account-${providerPart}-${environmentPart}-${accountPart}`;
}

export function createProviderCredentialIdentity({
  provider,
  apiKey,
  apiKeySource,
  providerAccountAlias,
  environment,
}: {
  provider: string;
  apiKey?: string | null;
  apiKeySource: ProviderApiKeySource;
  providerAccountAlias?: string | null;
  environment?: string | null;
}): ProviderCredentialIdentity | undefined {
  const token = normalizeToken(apiKey);
  if (!token) return undefined;
  const hash = safeTokenHash(token);
  const normalizedProvider = asTrimmedLowercaseString(provider) || "unknown";
  return {
    credentialId: `cred_${normalizedProvider}_${apiKeySource}_${hash.slice(0, 16)}`,
    credentialFingerprint: `sha256:${hash}`,
    providerAccountKey: buildProviderAccountKey({
      provider: normalizedProvider,
      apiKeySource,
      providerAccountAlias,
      environment,
    }),
    apiKeySource,
    ...(providerAccountAlias?.trim()
      ? { providerAccountAlias: providerAccountAlias.trim() }
      : {}),
    ...(environment?.trim() ? { environment: environment.trim() } : {}),
  };
}
