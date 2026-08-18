import { describe, expect, it } from "bun:test";

import {
  buildProviderCredentialLifecycleEventKey,
  type ProviderCredentialLifecycleEvent,
} from "./providerCredentialLifecycle";
import { writeProviderCredentialLifecycleEvent } from "./providerCredentialLifecycleWriter";

const event = {
  schemaVersion: 1,
  recordType: "provider_credential_lifecycle_event",
  credentialId: "cred_deepinfra_platform_env_abc",
  eventId: "evt_1",
  status: "revoked",
  effectiveAt: "2026-05-26T00:00:00.000Z",
  createdAt: "2026-05-26T00:01:00.000Z",
} satisfies ProviderCredentialLifecycleEvent;

describe("provider credential lifecycle writer", () => {
  it("writes lifecycle events append-only", async () => {
    const values = new Map<string, unknown>();
    const store = {
      async get(key: string) {
        if (!values.has(key)) {
          const error = new Error("missing") as Error & { code?: string };
          error.code = "LEVEL_NOT_FOUND";
          throw error;
        }
        return values.get(key);
      },
      async put(key: string, value: unknown) {
        values.set(key, value);
      },
    };

    await expect(
      writeProviderCredentialLifecycleEvent({ store, event })
    ).resolves.toEqual({
      key: buildProviderCredentialLifecycleEventKey(
        event.credentialId,
        event.eventId
      ),
    });
    await expect(
      writeProviderCredentialLifecycleEvent({ store, event })
    ).rejects.toThrow("provider credential lifecycle event already exists");
  });
});
