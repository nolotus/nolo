import { describe, expect, it } from "bun:test";

import {
  type ProviderCredentialRegistryRecord,
  buildProviderCredentialRegistryKey,
} from "./providerCredentialRegistry";
import { writeProviderCredentialRegistryRecord } from "./providerCredentialRegistryWriter";

const record = {
  schemaVersion: 1,
  recordType: "provider_credential",
  credentialId: "cred_deepinfra_platform_env_abc",
  provider: "deepinfra",
  providerAccountKey: "provider-account-deepinfra-alpha-main",
  credentialFingerprint: "sha256:abc",
  apiKeySource: "platform_env",
  status: "active",
  effectiveFrom: "2026-05-26T00:00:00.000Z",
  createdAt: "2026-05-26T01:00:00.000Z",
} satisfies ProviderCredentialRegistryRecord;

describe("provider credential registry writer", () => {
  it("writes records append-only", async () => {
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
      writeProviderCredentialRegistryRecord({ store, record })
    ).resolves.toEqual({
      key: buildProviderCredentialRegistryKey(record.credentialId),
    });
    await expect(
      writeProviderCredentialRegistryRecord({ store, record })
    ).rejects.toThrow("provider credential registry record already exists");
  });
});
