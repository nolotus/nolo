import { describe, expect, it } from "bun:test";

import { listProviderCredentialRegistryRecords } from "./providerCredentialRegistryList";

describe("provider credential registry list", () => {
  it("returns public summaries sorted by provider and account without fingerprints", async () => {
    const store = createMemoryStore([
      [
        "provider-credential-cred_openai_platform_env_b",
        {
          schemaVersion: 1,
          recordType: "provider_credential",
          credentialId: "cred_openai_platform_env_b",
          provider: "openai",
          providerAccountKey: "provider-account-openai-production-main",
          credentialFingerprint: "sha256:secret-b",
          apiKeySource: "platform_env",
          status: "active",
          effectiveFrom: "2026-05-01T00:00:00.000Z",
          createdAt: "2026-05-01T00:00:00.000Z",
          providerAccountAlias: "openai-main",
          officialBillingAccountId: "org-openai-main",
        },
      ],
      [
        "provider-credential-cred_deepinfra_platform_env_a",
        {
          schemaVersion: 1,
          recordType: "provider_credential",
          credentialId: "cred_deepinfra_platform_env_a",
          provider: "deepinfra",
          providerAccountKey: "provider-account-deepinfra-production-main",
          credentialFingerprint: "sha256:secret-a",
          apiKeySource: "platform_env",
          status: "rotating",
          effectiveFrom: "2026-05-02T00:00:00.000Z",
          effectiveTo: "2026-06-01T00:00:00.000Z",
          createdAt: "2026-05-02T00:00:00.000Z",
          providerAccountAlias: "deepinfra-main",
        },
      ],
      ["provider-call-call_1-event-evt_1", { recordType: "provider_call" }],
    ]);

    const result = await listProviderCredentialRegistryRecords({ store });

    expect(result).toEqual({
      count: 2,
      credentials: [
        {
          credentialId: "cred_deepinfra_platform_env_a",
          provider: "deepinfra",
          providerAccountKey: "provider-account-deepinfra-production-main",
          providerAccountAlias: "deepinfra-main",
          apiKeySource: "platform_env",
          environment: undefined,
          officialBillingAccountId: undefined,
          status: "rotating",
          effectiveFrom: "2026-05-02T00:00:00.000Z",
          effectiveTo: "2026-06-01T00:00:00.000Z",
        },
        {
          credentialId: "cred_openai_platform_env_b",
          provider: "openai",
          providerAccountKey: "provider-account-openai-production-main",
          providerAccountAlias: "openai-main",
          apiKeySource: "platform_env",
          environment: undefined,
          officialBillingAccountId: "org-openai-main",
          status: "active",
          effectiveFrom: "2026-05-01T00:00:00.000Z",
          effectiveTo: undefined,
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain("secret-a");
    expect(JSON.stringify(result)).not.toContain("secret-b");
  });

  it("overlays the latest effective lifecycle status at read time", async () => {
    const store = createMemoryStore([
      [
        "provider-credential-cred_deepinfra_platform_env_a",
        {
          schemaVersion: 1,
          recordType: "provider_credential",
          credentialId: "cred_deepinfra_platform_env_a",
          provider: "deepinfra",
          providerAccountKey: "provider-account-deepinfra-production-main",
          credentialFingerprint: "sha256:secret-a",
          apiKeySource: "platform_env",
          status: "active",
          effectiveFrom: "2026-05-02T00:00:00.000Z",
          createdAt: "2026-05-02T00:00:00.000Z",
        },
      ],
      [
        "provider-credential-lifecycle-cred_deepinfra_platform_env_a-event-evt_1",
        {
          schemaVersion: 1,
          recordType: "provider_credential_lifecycle_event",
          credentialId: "cred_deepinfra_platform_env_a",
          eventId: "evt_1",
          status: "rotating",
          effectiveAt: "2026-05-20T00:00:00.000Z",
          createdAt: "2026-05-20T00:00:00.000Z",
        },
      ],
      [
        "provider-credential-lifecycle-cred_deepinfra_platform_env_a-event-evt_2",
        {
          schemaVersion: 1,
          recordType: "provider_credential_lifecycle_event",
          credentialId: "cred_deepinfra_platform_env_a",
          eventId: "evt_2",
          status: "revoked",
          effectiveAt: "2026-05-25T00:00:00.000Z",
          createdAt: "2026-05-25T00:00:00.000Z",
        },
      ],
    ]);

    const result = await listProviderCredentialRegistryRecords({
      store,
      at: "2026-05-26T00:00:00.000Z",
    });

    expect(result.credentials[0]).toMatchObject({
      credentialId: "cred_deepinfra_platform_env_a",
      status: "revoked",
      effectiveTo: "2026-05-25T00:00:00.000Z",
    });
  });
});

function createMemoryStore(entries: Array<[string, unknown]>) {
  const data = new Map(entries);
  return {
    async *iterator(options?: { gte?: string; lte?: string }) {
      for (const key of Array.from(data.keys()).sort()) {
        if (options?.gte && key < options.gte) continue;
        if (options?.lte && key > options.lte) continue;
        yield [key, data.get(key)] as [string, unknown];
      }
    },
  };
}
