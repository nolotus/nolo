import {
  createProviderCredentialIdentity,
  type ProviderApiKeySource,
  type ProviderCredentialIdentity,
} from "./providerCredential";
import {
  resolveProviderCredentialIdentity,
  type ProviderCredentialRegistryReadStore,
} from "./providerCredentialRegistryResolver";

export type RuntimeCredentialEnv = Record<string, string | undefined>;

const providerAccountAlias = (provider: string, env: RuntimeCredentialEnv) => {
  const normalized = provider.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  return (
    env[`NOLO_${normalized}_ACCOUNT_ALIAS`]?.trim() ||
    env[`${normalized}_ACCOUNT_ALIAS`]?.trim() ||
    undefined
  );
};

const credentialEnvironment = (env: RuntimeCredentialEnv) =>
  env.NOLO_DEPLOY_ENV?.trim() ||
  env.NOLO_ENV?.trim() ||
  env.NODE_ENV?.trim() ||
  undefined;

export async function resolveRuntimeProviderCredential({
  provider,
  apiKey,
  apiKeySource,
  env = process.env,
  registryStore,
  at,
}: {
  provider: string;
  apiKey?: string | null;
  apiKeySource: ProviderApiKeySource;
  env?: RuntimeCredentialEnv;
  registryStore?: ProviderCredentialRegistryReadStore;
  at?: string;
}): Promise<ProviderCredentialIdentity | undefined> {
  const identity = createProviderCredentialIdentity({
    provider,
    apiKey,
    apiKeySource,
    providerAccountAlias: providerAccountAlias(provider, env),
    environment: credentialEnvironment(env),
  });
  return resolveProviderCredentialIdentity({
    store: registryStore,
    provider,
    identity,
    at,
  });
}
