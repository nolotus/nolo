import { describe, expect, it } from "bun:test";
import {
  isPlatformManagedProvider,
  isNoloHostedProvider,
  PLATFORM_HOSTED_KIMI_K3_MODEL,
  PLATFORM_HOSTED_KIMI_K26_MODEL,
} from "./kimi";

describe("isPlatformManagedProvider", () => {
  describe("core platform hosted providers (without model)", () => {
    it("returns true for nolo provider in various casing and spacing", () => {
      expect(isPlatformManagedProvider("nolo")).toBe(true);
      expect(isPlatformManagedProvider("NOLO")).toBe(true);
      expect(isPlatformManagedProvider("Nolo")).toBe(true);
      expect(isPlatformManagedProvider(" nolo ")).toBe(true);
    });

    it("returns true for legacy ollama-cloud provider", () => {
      expect(isPlatformManagedProvider("ollama-cloud")).toBe(true);
      expect(isPlatformManagedProvider("OLLAMA-CLOUD")).toBe(true);
      expect(isPlatformManagedProvider("Ollama-Cloud")).toBe(true);
      expect(isPlatformManagedProvider(" ollama-cloud ")).toBe(true);
    });

    it("returns true for deepseek provider", () => {
      expect(isPlatformManagedProvider("deepseek")).toBe(true);
      expect(isPlatformManagedProvider("DEEPSEEK")).toBe(true);
      expect(isPlatformManagedProvider("DeepSeek")).toBe(true);
      expect(isPlatformManagedProvider(" deepseek ")).toBe(true);
    });

    it("returns false for non-platform hosted providers", () => {
      expect(isPlatformManagedProvider("openai")).toBe(false);
      expect(isPlatformManagedProvider("anthropic")).toBe(false);
      expect(isPlatformManagedProvider("google")).toBe(false);
      expect(isPlatformManagedProvider("fireworks")).toBe(false);
      expect(isPlatformManagedProvider("deepinfra")).toBe(false);
      expect(isPlatformManagedProvider("runinfra")).toBe(false);
      expect(isPlatformManagedProvider("vultr")).toBe(false);
      expect(isPlatformManagedProvider("openrouter")).toBe(false);
      expect(isPlatformManagedProvider("custom")).toBe(false);
    });

    it("returns false for empty, whitespace, null, or undefined values", () => {
      expect(isPlatformManagedProvider(null)).toBe(false);
      expect(isPlatformManagedProvider(undefined)).toBe(false);
      expect(isPlatformManagedProvider("")).toBe(false);
      expect(isPlatformManagedProvider("   ")).toBe(false);
    });
  });

  describe("provider and model combination (with model)", () => {
    it("returns true for nolo / ollama-cloud with Kimi models", () => {
      expect(isPlatformManagedProvider("nolo", PLATFORM_HOSTED_KIMI_K3_MODEL)).toBe(true);
      expect(isPlatformManagedProvider("nolo", PLATFORM_HOSTED_KIMI_K26_MODEL)).toBe(true);
      expect(isPlatformManagedProvider("ollama-cloud", PLATFORM_HOSTED_KIMI_K3_MODEL)).toBe(true);
      expect(isPlatformManagedProvider("ollama-cloud", PLATFORM_HOSTED_KIMI_K26_MODEL)).toBe(true);
    });

    it("returns true for nolo / deepseek with other hosted models", () => {
      expect(isPlatformManagedProvider("nolo", "deepseek-v4-flash")).toBe(true);
      expect(isPlatformManagedProvider("nolo", "deepseek-v4-pro")).toBe(true);
      expect(isPlatformManagedProvider("nolo", "glm-5.3-flash")).toBe(true);
      expect(isPlatformManagedProvider("deepseek", "deepseek-v4-flash")).toBe(true);
      expect(isPlatformManagedProvider("deepseek", "deepseek-v4-pro")).toBe(true);
    });

    it("returns false for non-platform provider even when model matches platform catalog", () => {
      expect(isPlatformManagedProvider("openai", PLATFORM_HOSTED_KIMI_K3_MODEL)).toBe(false);
      expect(isPlatformManagedProvider("anthropic", "deepseek-v4-flash")).toBe(false);
      expect(isPlatformManagedProvider("fireworks", "accounts/fireworks/models/kimi-latest")).toBe(false);
    });

    it("handles null / undefined / empty model safely", () => {
      expect(isPlatformManagedProvider("nolo", null)).toBe(true);
      expect(isPlatformManagedProvider("nolo", undefined)).toBe(true);
      expect(isPlatformManagedProvider("nolo", "")).toBe(true);
      expect(isPlatformManagedProvider("deepseek", null)).toBe(true);
      expect(isPlatformManagedProvider("openai", null)).toBe(false);
      expect(isPlatformManagedProvider(null, PLATFORM_HOSTED_KIMI_K3_MODEL)).toBe(false);
    });
  });
});
