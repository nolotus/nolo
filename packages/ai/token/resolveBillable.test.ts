import { describe, expect, it } from "bun:test";
import { resolveBillable } from "./prepareTokenUsageData";

describe("resolveBillable", () => {
  const base = {
    usage: {},
    userId: "user-1",
    cost: 0.01,
    hasExternalPrice: true,
  };

  it("platform + cost > 0 → billable", () => {
    expect(resolveBillable({ ...base, apiSource: "platform" })).toBe(true);
  });

  it("custom + hasExternalPrice + cost > 0 → billable", () => {
    expect(resolveBillable({ ...base, apiSource: "custom" })).toBe(true);
  });

  it("custom + no externalPrice → not billable (user自带key)", () => {
    expect(resolveBillable({ ...base, apiSource: "custom", hasExternalPrice: false })).toBe(false);
  });

  it("cli → not billable", () => {
    expect(resolveBillable({ ...base, apiSource: "cli" })).toBe(false);
  });

  it("OAuth subscription (chatgpt) → not billable", () => {
    expect(resolveBillable({ ...base, apiSource: "custom", apiKeyRef: "chatgpt" })).toBe(false);
  });

  it("OAuth subscription (cursor) → not billable", () => {
    expect(resolveBillable({ ...base, apiSource: "custom", apiKeyRef: "cursor" })).toBe(false);
  });

  it("unlogged (local) → not billable", () => {
    expect(resolveBillable({ ...base, userId: "local", apiSource: "platform" })).toBe(false);
  });

  it("empty userId → not billable", () => {
    expect(resolveBillable({ ...base, userId: "", apiSource: "platform" })).toBe(false);
  });

  it("cost === 0 → not billable", () => {
    expect(resolveBillable({ ...base, cost: 0, apiSource: "platform" })).toBe(false);
  });

  // P0-1: 估算值不应一刀切
  it("platform + billing_estimated → billable (平台估算仍计费)", () => {
    expect(resolveBillable({ ...base, apiSource: "platform", usage: { billing_estimated: true } })).toBe(true);
  });

  it("cli + billing_estimated → not billable (CLI估算不计费)", () => {
    expect(resolveBillable({ ...base, apiSource: "cli", usage: { billing_estimated: true } })).toBe(false);
  });

  it("OAuth + billing_estimated → not billable (订阅估算不计费)", () => {
    expect(resolveBillable({ ...base, apiSource: "custom", apiKeyRef: "claude", usage: { billing_estimated: true } })).toBe(false);
  });

  // P0-3: apiSource 缺失兜底
  it("apiSource undefined + cost > 0 → billable (兜底按平台)", () => {
    expect(resolveBillable({ ...base, apiSource: undefined })).toBe(true);
  });

  it("apiSource null + cost > 0 → billable (兜底按平台)", () => {
    expect(resolveBillable({ ...base, apiSource: null as any })).toBe(true);
  });

  it("apiSource empty string + cost > 0 → billable (兜底按平台)", () => {
    expect(resolveBillable({ ...base, apiSource: "" })).toBe(true);
  });
});