import { describe, expect, it } from "bun:test";

import {
  buildProviderCredentialLifecycleEventKey,
  createProviderCredentialLifecycleEvent,
} from "./providerCredentialLifecycle";

describe("provider credential lifecycle event", () => {
  it("creates append-only lifecycle events without credential secrets", () => {
    const event = createProviderCredentialLifecycleEvent({
      credentialId: "cred_deepinfra_platform_env_abc",
      eventId: "evt_1",
      status: "revoked",
      effectiveAt: "2026-05-26T00:00:00.000Z",
      createdAt: "2026-05-26T00:01:00.000Z",
      reason: "rotated provider key",
      actorId: "admin-1",
    });

    expect(event).toEqual({
      schemaVersion: 1,
      recordType: "provider_credential_lifecycle_event",
      credentialId: "cred_deepinfra_platform_env_abc",
      eventId: "evt_1",
      status: "revoked",
      effectiveAt: "2026-05-26T00:00:00.000Z",
      createdAt: "2026-05-26T00:01:00.000Z",
      reason: "rotated provider key",
      actorId: "admin-1",
    });
    expect(JSON.stringify(event)).not.toContain("sk-");
  });

  it("uses a deterministic key scoped by credential id and event id", () => {
    expect(
      buildProviderCredentialLifecycleEventKey(
        "cred_deepinfra_platform_env_abc",
        "evt_1"
      )
    ).toBe(
      "provider-credential-lifecycle-cred_deepinfra_platform_env_abc-event-evt_1"
    );
  });
});
