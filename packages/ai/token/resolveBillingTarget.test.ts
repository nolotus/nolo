import { describe, expect, it } from "bun:test";

import { resolveBillingTarget } from "./resolveBillingTarget";

describe("resolveBillingTarget", () => {
  it("prefers billing metadata from usage", () => {
    expect(
      resolveBillingTarget({
        usage: {
          billing_provider: "deepinfra",
          billing_model: "moonshotai/Kimi-K2.6",
        },
        fallbackProvider: "fireworks",
        fallbackModel: "accounts/fireworks/models/kimi-k2p6",
      })
    ).toEqual({
      provider: "deepinfra",
      model: "moonshotai/Kimi-K2.6",
      serviceTier: undefined,
    });
  });

  it("throws when no billing model can be resolved", () => {
    expect(() =>
      resolveBillingTarget({
        usage: {},
        fallbackProvider: "deepinfra",
        fallbackModel: "   ",
      })
    ).toThrow("Billing model is required");
  });

  it("infers the service tier from billing_service_tier in usage metadata", () => {
    expect(
      resolveBillingTarget({
        usage: {
          billing_service_tier: "priority",
        },
        fallbackProvider: "openai",
        fallbackModel: "gpt-5.4",
      })
    ).toEqual({
      provider: "openai",
      model: "gpt-5.4",
      serviceTier: "priority",
    });
  });

  it("passes billing_service_tier from usage metadata for OpenAI", () => {
    expect(
      resolveBillingTarget({
        usage: {
          billing_service_tier: "flex",
        },
        fallbackProvider: "openai",
        fallbackModel: "gpt-5.4",
      })
    ).toEqual({
      provider: "openai",
      model: "gpt-5.4",
      serviceTier: "flex",
    });
  });

  it("preserves explicit Google service tiers", () => {
    expect(
      resolveBillingTarget({
        usage: {
          billing_service_tier: "priority",
        },
        fallbackProvider: "google",
        fallbackModel: "gemini-3-flash-preview",
      })
    ).toEqual({
      provider: "google",
      model: "gemini-3-flash-preview",
      serviceTier: "priority",
    });
  });
});
