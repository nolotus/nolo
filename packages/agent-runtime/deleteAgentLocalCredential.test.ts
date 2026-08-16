import { afterEach, describe, expect, it, mock } from "bun:test";

import {
  AGENT_LOCAL_CREDENTIAL_DELETE_FAILED_MESSAGE,
  deleteAgentLocalCredentialRef,
  extractAgentLocalCredentialRef,
  isPublicAgentProjectionKey,
  setAgentLocalCredentialBrokerFactoryForTests,
} from "./deleteAgentLocalCredential";

describe("deleteAgentLocalCredential helpers", () => {
  afterEach(() => {
    setAgentLocalCredentialBrokerFactoryForTests(null);
  });

  it("extracts credentialRef only (never apiKeyRef / secrets)", () => {
    expect(
      extractAgentLocalCredentialRef({
        credentialRef: "  api-key:agent-1  ",
        apiKeyRef: "chatgpt",
        apiKey: "sk-should-not-be-used",
      }),
    ).toBe("api-key:agent-1");
    expect(extractAgentLocalCredentialRef({ apiKeyRef: "chatgpt" })).toBeNull();
    expect(extractAgentLocalCredentialRef({ credentialRef: "   " })).toBeNull();
    expect(extractAgentLocalCredentialRef(null)).toBeNull();
  });

  it("identifies public catalog projections that must not clear private keys", () => {
    expect(isPublicAgentProjectionKey("agent-pub-01ABC")).toBe(true);
    expect(isPublicAgentProjectionKey("agent-pub-01ABC")).toBe(true);
    expect(isPublicAgentProjectionKey("agent-user-1-agent-1")).toBe(false);
    expect(isPublicAgentProjectionKey("page-user-1-p1")).toBe(false);
  });

  it("deletes via broker when ref is present", async () => {
    const deleteMock = mock(async () => undefined);
    setAgentLocalCredentialBrokerFactoryForTests(() => ({
      get: async () => null,
      put: async () => undefined,
      delete: deleteMock,
      has: async () => false,
    }));

    const result = await deleteAgentLocalCredentialRef("api-key:agent-ok");
    expect(result).toEqual({ deleted: true });
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(deleteMock).toHaveBeenCalledWith("api-key:agent-ok");
  });

  it("skips when no credentialRef", async () => {
    const deleteMock = mock(async () => undefined);
    setAgentLocalCredentialBrokerFactoryForTests(() => ({
      get: async () => null,
      put: async () => undefined,
      delete: deleteMock,
      has: async () => false,
    }));

    const result = await deleteAgentLocalCredentialRef(null);
    expect(result).toEqual({ deleted: false, skipped: true });
    expect(deleteMock).toHaveBeenCalledTimes(0);
  });

  it("returns sanitized warning without ref/secret when broker fails", async () => {
    setAgentLocalCredentialBrokerFactoryForTests(() => ({
      get: async () => null,
      put: async () => undefined,
      delete: async () => {
        throw new Error("Keychain delete failed for api-key:secret-ref-xyz sk-live-abc");
      },
      has: async () => false,
    }));

    const result = await deleteAgentLocalCredentialRef("api-key:secret-ref-xyz");
    expect(result.deleted).toBe(false);
    expect(result).toEqual({
      deleted: false,
      warning: AGENT_LOCAL_CREDENTIAL_DELETE_FAILED_MESSAGE,
    });
    const text = JSON.stringify(result);
    expect(text).not.toContain("api-key:secret-ref-xyz");
    expect(text).not.toContain("sk-live-abc");
    expect(text).not.toContain("Keychain");
  });
});
