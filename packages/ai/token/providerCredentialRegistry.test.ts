import { describe, expect, it } from "bun:test";

import { createProviderCredentialIdentity } from "./providerCredential";
import {
  buildProviderCredentialRegistryKey,
  createProviderCredentialRegistryRecord,
} from "./providerCredentialRegistry";

describe("provider credential registry", () => {
  it("creates an auditable credential record without storing the raw key", () => {
    const identity = createProviderCredentialIdentity({
      provider: "deepinfra",
      apiKey: "deepinfra-secret-key",
      apiKeySource: "platform_env",
      providerAccountAlias: "deepinfra-alpha-main",
      environment: "alpha",
    });

    const record = createProviderCredentialRegistryRecord({
      provider: "deepinfra",
      identity,
      status: "active",
      effectiveFrom: "2026-05-26T00:00:00.000Z",
      createdAt: "2026-05-26T01:00:00.000Z",
      officialBillingAccountId: "deepinfra-org-1",
      note: "alpha main DeepInfra account",
    });

    expect(record).toMatchObject({
      schemaVersion: 1,
      recordType: "provider_credential",
      credentialId: identity?.credentialId,
      provider: "deepinfra",
      providerAccountKey: "provider-account-deepinfra-alpha-deepinfra-alpha-main",
      providerAccountAlias: "deepinfra-alpha-main",
      apiKeySource: "platform_env",
      status: "active",
      officialBillingAccountId: "deepinfra-org-1",
      effectiveFrom: "2026-05-26T00:00:00.000Z",
      createdAt: "2026-05-26T01:00:00.000Z",
    });
    expect(JSON.stringify(record)).not.toContain("deepinfra-secret-key");
  });

  it("requires an identity because registry records must never infer from raw keys", () => {
    expect(() =>
      createProviderCredentialRegistryRecord({
        provider: "openai",
        identity: undefined,
        status: "active",
        effectiveFrom: "2026-05-26T00:00:00.000Z",
        createdAt: "2026-05-26T01:00:00.000Z",
      })
    ).toThrow("provider credential identity is required");
  });

  it("uses a deterministic append-only key per credential fingerprint", () => {
    expect(
      buildProviderCredentialRegistryKey("cred_deepinfra_platform_env_abc")
    ).toBe("provider-credential-cred_deepinfra_platform_env_abc");
  });
});
