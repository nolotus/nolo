import { describe, expect, it } from "bun:test";
import {
  isGoogleFamilyProvider,
  isOAuthApiKeyRef,
  OAUTH_APIKEY_REFS,
  shouldUseServerProxy,
} from "./serverProxyPolicy";

describe("isGoogleFamilyProvider", () => {
  it("matches google and google-* prefixes", () => {
    expect(isGoogleFamilyProvider("google")).toBe(true);
    expect(isGoogleFamilyProvider("Google")).toBe(true);
    expect(isGoogleFamilyProvider("google-antigravity")).toBe(true);
    expect(isGoogleFamilyProvider("  GOOGLE-vertex  ")).toBe(true);
  });

  it("rejects non-google providers", () => {
    expect(isGoogleFamilyProvider("openai")).toBe(false);
    expect(isGoogleFamilyProvider("xai")).toBe(false);
    expect(isGoogleFamilyProvider("")).toBe(false);
    expect(isGoogleFamilyProvider("my-google-clone")).toBe(false);
  });
});

describe("isOAuthApiKeyRef", () => {
  it("accepts known OAuth subscription ids", () => {
    expect(isOAuthApiKeyRef("antigravity")).toBe(true);
    expect(isOAuthApiKeyRef("xai")).toBe(true);
    expect(isOAuthApiKeyRef("chatgpt")).toBe(true);
    expect(isOAuthApiKeyRef("claude")).toBe(true);
    expect(isOAuthApiKeyRef("  ChatGPT  ")).toBe(true);
  });

  it("rejects empty, unknown, and non-string values", () => {
    expect(isOAuthApiKeyRef("")).toBe(false);
    expect(isOAuthApiKeyRef("   ")).toBe(false);
    expect(isOAuthApiKeyRef("api-key:local")).toBe(false);
    expect(isOAuthApiKeyRef(null)).toBe(false);
    expect(isOAuthApiKeyRef(undefined)).toBe(false);
    expect(isOAuthApiKeyRef(42)).toBe(false);
  });

  it("keeps the oauth set locked to the server-held providers", () => {
    expect([...OAUTH_APIKEY_REFS].sort()).toEqual([
      "antigravity",
      "chatgpt",
      "claude",
      "cursor",
      "xai",
    ]);
  });
});

describe("shouldUseServerProxy", () => {
  it("forces proxy for google-family providers", () => {
    expect(
      shouldUseServerProxy({ provider: "google", useServerProxy: false }),
    ).toBe(true);
    expect(
      shouldUseServerProxy({
        provider: "google-antigravity",
        useServerProxy: undefined,
      }),
    ).toBe(true);
  });

  it("forces proxy for OAuth apiKeyRefs", () => {
    expect(
      shouldUseServerProxy({
        provider: "custom",
        useServerProxy: false,
        apiKeyRef: "antigravity",
      }),
    ).toBe(true);
    expect(
      shouldUseServerProxy({
        provider: "xai",
        useServerProxy: false,
        apiKeyRef: "xai",
      }),
    ).toBe(true);
    expect(
      shouldUseServerProxy({
        provider: "openai",
        useServerProxy: false,
        apiKeyRef: "chatgpt",
      }),
    ).toBe(true);
  });

  it("uses requestProvider override for google-family detection", () => {
    expect(
      shouldUseServerProxy(
        { provider: "openai", useServerProxy: false },
        "google",
      ),
    ).toBe(true);
  });

  it("respects useServerProxy for plain non-google providers", () => {
    expect(
      shouldUseServerProxy({ provider: "openai", useServerProxy: false }),
    ).toBe(false);
    expect(
      shouldUseServerProxy({ provider: "openai", useServerProxy: true }),
    ).toBe(true);
    expect(
      shouldUseServerProxy({ provider: "xai", useServerProxy: false }),
    ).toBe(false);
  });
});
