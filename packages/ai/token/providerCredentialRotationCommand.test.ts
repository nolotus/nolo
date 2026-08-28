import { describe, expect, it } from "bun:test";

import { createProviderCredentialIdentity } from "./providerCredential";
import { buildProviderCredentialRotationPlan } from "./providerCredentialRotationCommand";
import type { ProviderCredentialRegistryRecord } from "./providerCredentialRegistry";

describe("provider credential rotation command", () => {
  const oldRecord: ProviderCredentialRegistryRecord = {
    schemaVersion: 1,
    recordType: "provider_credential",
    credentialId: "cred_deepinfra_platform_env_old",
    provider: "deepinfra",
    providerAccountKey: "provider-account-deepinfra-alpha-main",
    providerAccountAlias: "deepinfra-alpha-main",
    credentialFingerprint: "sha256:old-fingerprint",
    apiKeySource: "platform_env",
    status: "active",
    environment: "alpha",
    officialBillingAccountId: "deepinfra-org-1",
    effectiveFrom: "2026-05-01T00:00:00.000Z",
    createdAt: "2026-05-01T00:00:00.000Z",
  };

  it("creates an append-only old-key lifecycle event and a new active registry record without exposing the new key", () => {
    const plan = buildProviderCredentialRotationPlan({
      oldRecord,
      newApiKey: "new-deepinfra-secret-key",
      newApiKeySource: "platform_env",
      env: { NOLO_DEPLOY_ENV: "alpha" },
      oldStatus: "rotating",
      effectiveAt: "2026-05-26T00:00:00.000Z",
      createdAt: "2026-05-26T00:01:00.000Z",
      eventId: "evt_rotate_1",
      actorId: "admin-user",
      reason: "provider key rotation",
    });

    expect(plan.oldLifecycleEvent).toEqual({
      schemaVersion: 1,
      recordType: "provider_credential_lifecycle_event",
      credentialId: "cred_deepinfra_platform_env_old",
      eventId: "evt_rotate_1",
      status: "rotating",
      effectiveAt: "2026-05-26T00:00:00.000Z",
      createdAt: "2026-05-26T00:01:00.000Z",
      reason: "provider key rotation",
      actorId: "admin-user",
    });
    expect(plan.newRegistration.publicSummary).toMatchObject({
      provider: "deepinfra",
      providerAccountAlias: "deepinfra-alpha-main",
      officialBillingAccountId: "deepinfra-org-1",
      status: "active",
      effectiveFrom: "2026-05-26T00:00:00.000Z",
    });
    expect(plan.newRegistration.record.credentialId).not.toBe(oldRecord.credentialId);
    expect(JSON.stringify(plan)).not.toContain("new-deepinfra-secret-key");
    expect(JSON.stringify(plan.publicSummary)).not.toContain("old-fingerprint");
  });

  it("refuses to rotate to the same credential identity", () => {
    const sameIdentity = createProviderCredentialIdentity({
      provider: "deepinfra",
      apiKey: "same-secret",
      apiKeySource: "platform_env",
      providerAccountAlias: "deepinfra-alpha-main",
      environment: "alpha",
    });
    const sameOldRecord = {
      ...oldRecord,
      credentialId: sameIdentity!.credentialId,
      credentialFingerprint: sameIdentity!.credentialFingerprint,
    };

    expect(() =>
      buildProviderCredentialRotationPlan({
        oldRecord: sameOldRecord,
        newApiKey: "same-secret",
        newApiKeySource: "platform_env",
        env: { NOLO_DEPLOY_ENV: "alpha" },
        oldStatus: "revoked",
        effectiveAt: "2026-05-26T00:00:00.000Z",
        createdAt: "2026-05-26T00:01:00.000Z",
        eventId: "evt_rotate_1",
      })
    ).toThrow("new credential must differ from old credential");
  });
});
