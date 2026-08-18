import { describe, expect, it } from "bun:test";
import { shouldUseServerProxy } from "./shouldUseServerProxy";

describe("shouldUseServerProxy", () => {
  it("forces proxy for google-antigravity even when useServerProxy is unset", () => {
    expect(
      shouldUseServerProxy({
        provider: "google-antigravity",
        useServerProxy: undefined as unknown as boolean,
      }),
    ).toBe(true);
  });

  it("forces proxy for legacy google provider", () => {
    expect(
      shouldUseServerProxy({
        provider: "google",
        useServerProxy: false,
      }),
    ).toBe(true);
  });

  it("forces proxy when apiKeyRef is antigravity", () => {
    expect(
      shouldUseServerProxy({
        provider: "custom",
        useServerProxy: false,
        apiKeyRef: "antigravity",
      }),
    ).toBe(true);
  });

  it("forces proxy for xAI OAuth (SuperGrok) apiKeyRef even when useServerProxy is unset", () => {
    expect(
      shouldUseServerProxy({
        provider: "xai",
        useServerProxy: false,
        apiKeyRef: "xai",
      }),
    ).toBe(true);
  });

  it("forces proxy for ChatGPT OAuth apiKeyRef", () => {
    expect(
      shouldUseServerProxy({
        provider: "openai",
        useServerProxy: false,
        apiKeyRef: "chatgpt",
      }),
    ).toBe(true);
  });

  it("does not force proxy for a plain api-key custom provider (no OAuth apiKeyRef)", () => {
    expect(
      shouldUseServerProxy({
        provider: "xai",
        useServerProxy: false,
      }),
    ).toBe(false);
  });

  it("respects useServerProxy for non-google providers", () => {
    expect(
      shouldUseServerProxy({
        provider: "openai",
        useServerProxy: false,
      }),
    ).toBe(false);
    expect(
      shouldUseServerProxy({
        provider: "openai",
        useServerProxy: true,
      }),
    ).toBe(true);
  });
});