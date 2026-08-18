import { describe, expect, it } from "bun:test";

import { createProviderCredentialIdentity } from "./providerCredential";
import { createProviderCredentialLifecycleEvent } from "./providerCredentialLifecycle";
import {
  createProviderCredentialRegistryRecord,
  buildProviderCredentialRegistryKey,
} from "./providerCredentialRegistry";
import { resolveProviderCredentialIdentity } from "./providerCredentialRegistryResolver";

describe("provider credential registry resolver", () => {
  it("overlays active registry metadata onto a runtime credential identity", async () => {
    const identity = createProviderCredentialIdentity({
      provider: "deepinfra",
      apiKey: "deepinfra-secret-key",
      apiKeySource: "platform_env",
      environment: "production",
    });
    const record = createProviderCredentialRegistryRecord({
      provider: "deepinfra",
      identity,
      status: "active",
      effectiveFrom: "2026-05-01T00:00:00.000Z",
      createdAt: "2026-05-01T00:00:00.000Z",
      officialBillingAccountId: "deepinfra-main-org",
      note: "main DeepInfra key",
    });
    const store = createMemoryStore([
      [
        buildProviderCredentialRegistryKey(record.credentialId),
        {
          ...record,
          providerAccountAlias: "deepinfra-main",
          providerAccountKey: "provider-account-deepinfra-production-deepinfra-main",
        },
      ],
    ]);

    const resolved = await resolveProviderCredentialIdentity({
      store,
      provider: "deepinfra",
      identity,
      at: "2026-05-26T00:00:00.000Z",
    });

    expect(resolved).toMatchObject({
      credentialId: identity?.credentialId,
      credentialFingerprint: identity?.credentialFingerprint,
      providerAccountKey: "provider-account-deepinfra-production-deepinfra-main",
      providerAccountAlias: "deepinfra-main",
      officialBillingAccountId: "deepinfra-main-org",
      registryStatus: "active",
      registryEffectiveFrom: "2026-05-01T00:00:00.000Z",
    });
    expect(JSON.stringify(resolved)).not.toContain("deepinfra-secret-key");
  });

  it("preserves revoked registry metadata so runtime gating can block the credential", async () => {
    const identity = createProviderCredentialIdentity({
      provider: "openai",
      apiKey: "openai-secret-key",
      apiKeySource: "platform_env",
      environment: "production",
    });
    const record = createProviderCredentialRegistryRecord({
      provider: "openai",
      identity,
      status: "revoked",
      effectiveFrom: "2026-05-01T00:00:00.000Z",
      createdAt: "2026-05-01T00:00:00.000Z",
    });
    const store = createMemoryStore([
      [buildProviderCredentialRegistryKey(record.credentialId), record],
    ]);

    const resolved = await resolveProviderCredentialIdentity({
      store,
      provider: "openai",
      identity,
      at: "2026-05-26T00:00:00.000Z",
    });

    expect(resolved).toMatchObject({
      credentialId: identity?.credentialId,
      credentialFingerprint: identity?.credentialFingerprint,
      providerAccountKey: identity?.providerAccountKey,
      registryStatus: "revoked",
      registryEffectiveFrom: "2026-05-01T00:00:00.000Z",
    });
  });

  it("applies the latest lifecycle revoke event over an active registry record", async () => {
    const identity = createProviderCredentialIdentity({
      provider: "custom",
      apiKey: "custom-secret-key",
      apiKeySource: "agent_secret",
      environment: "production",
    });
    const record = createProviderCredentialRegistryRecord({
      provider: "custom",
      identity,
      status: "active",
      effectiveFrom: "2026-05-01T00:00:00.000Z",
      createdAt: "2026-05-01T00:00:00.000Z",
    });
    const lifecycle = createProviderCredentialLifecycleEvent({
      credentialId: identity!.credentialId,
      eventId: "evt_revoked",
      status: "revoked",
      effectiveAt: "2026-05-20T00:00:00.000Z",
      createdAt: "2026-05-20T00:00:00.000Z",
    });
    const store = createMemoryStore(
      [[buildProviderCredentialRegistryKey(record.credentialId), record]],
      [[
        `provider-credential-lifecycle-${identity!.credentialId}-event-${lifecycle.eventId}`,
        lifecycle,
      ]]
    );

    const resolved = await resolveProviderCredentialIdentity({
      store,
      provider: "custom",
      identity,
      at: "2026-05-26T00:00:00.000Z",
    });

    expect(resolved).toMatchObject({
      credentialId: identity?.credentialId,
      registryStatus: "revoked",
      registryEffectiveFrom: "2026-05-01T00:00:00.000Z",
      registryEffectiveTo: "2026-05-20T00:00:00.000Z",
    });
  });
});

function createMemoryStore(
  entries: Array<[string, unknown]>,
  iteratorEntries: Array<[string, unknown]> = [],
) {
  const data = new Map(entries);
  return {
    async get(key: string) {
      if (!data.has(key)) {
        const error = new Error("missing") as Error & { code?: string };
        error.code = "LEVEL_NOT_FOUND";
        throw error;
      }
      return data.get(key);
    },
    async *iterator(options?: { gte?: string; lte?: string }) {
      for (const [key, value] of iteratorEntries) {
        if (options?.gte && key < options.gte) continue;
        if (options?.lte && key > options.lte) continue;
        yield [key, value] as [string, unknown];
      }
    },
  };
}
