import { describe, expect, test } from "bun:test";
import { providerCredentialRef, providerSecretKey } from "./providerSecrets";

describe("provider-level secrets", () => {
  test("derives stable user-secret key and credential ref from preset id", () => {
    expect(providerSecretKey("qwen-token-plan")).toBe("QWEN_TOKEN_PLAN_KEY");
    expect(providerCredentialRef("qwen-token-plan")).toBe("provider-key:qwen-token-plan");
    expect(providerSecretKey("zai-coding-plan")).toBe("ZAI_CODING_PLAN_KEY");
    expect(providerCredentialRef("zai-coding-plan")).toBe("provider-key:zai-coding-plan");
    expect(providerSecretKey("bigmodel-coding-plan")).toBe("BIGMODEL_CODING_PLAN_KEY");
    expect(providerCredentialRef("bigmodel-coding-plan")).toBe("provider-key:bigmodel-coding-plan");
  });
});
