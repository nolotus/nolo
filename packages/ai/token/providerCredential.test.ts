import { describe, expect, it } from "bun:test";

import { createProviderCredentialIdentity } from "./providerCredential";

describe("provider credential identity", () => {
  it("creates a stable non-secret identity for provider account reconciliation", () => {
    const identity = createProviderCredentialIdentity({
      provider: "deepinfra",
      apiKey: "super-secret-key",
      apiKeySource: "platform_env",
      providerAccountAlias: "deepinfra-alpha-main",
      environment: "alpha",
    });

    expect(identity).toEqual(
      expect.objectContaining({
        credentialId: expect.stringMatching(
          /^cred_deepinfra_platform_env_[0-9a-f]{16}$/
        ),
        credentialFingerprint: expect.stringMatching(/^sha256:[0-9a-f]{64}$/),
        providerAccountKey:
          "provider-account-deepinfra-alpha-deepinfra-alpha-main",
        apiKeySource: "platform_env",
        providerAccountAlias: "deepinfra-alpha-main",
        environment: "alpha",
      })
    );
    expect(JSON.stringify(identity)).not.toContain("super-secret-key");
  });

  it("does not create a credential identity when no key is present", () => {
    expect(
      createProviderCredentialIdentity({
        provider: "openai",
        apiKey: "",
        apiKeySource: "platform_env",
      })
    ).toBeUndefined();
  });
});
