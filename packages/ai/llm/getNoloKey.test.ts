import { afterEach, describe, expect, it } from "bun:test";

import { getNoloKey } from "./getNoloKey";

const trackedEnvNames = [
  "OPENAI_API_KEY",
  "OPENAI_KEY",
  "VULTR_API_KEY",
  "GOOGLE_API_KEY",
  "GEMINI_API_KEY",
  "CROFAI_API_KEY",
] as const;

const originalEnv = new Map<string, string | undefined>(
  trackedEnvNames.map((name) => [name, process.env[name]])
);

describe("getNoloKey", () => {
  afterEach(() => {
    for (const envName of trackedEnvNames) {
      const originalValue = originalEnv.get(envName);
      if (originalValue === undefined) {
        delete process.env[envName];
      } else {
        process.env[envName] = originalValue;
      }
    }
  });

  it("uses OPENAI_KEY as the canonical OpenAI key", () => {
    delete process.env.OPENAI_API_KEY;
    process.env.OPENAI_KEY = "openai-key";

    expect(getNoloKey("openai")).toBe("openai-key");
  });

  it("falls back to OPENAI_API_KEY for standard external environments", () => {
    process.env.OPENAI_API_KEY = "openai-api-key";
    delete process.env.OPENAI_KEY;

    expect(getNoloKey("openai")).toBe("openai-api-key");
  });

  it("prefers OPENAI_KEY when both OpenAI key names are configured", () => {
    process.env.OPENAI_API_KEY = "fallback-openai-api-key";
    process.env.OPENAI_KEY = "canonical-openai-key";

    expect(getNoloKey("openai")).toBe("canonical-openai-key");
  });

  it("no longer resolves a key for the retired Vultr platform provider", () => {
    process.env.VULTR_API_KEY = "vultr-key";

    expect(getNoloKey("vultr" as Parameters<typeof getNoloKey>[0])).toBe(null);
  });

  it("falls back to GEMINI_API_KEY for Google models", () => {
    delete process.env.GOOGLE_API_KEY;
    process.env.GEMINI_API_KEY = "gemini-key";

    expect(getNoloKey("google")).toBe("gemini-key");
  });

  it("prefers GOOGLE_API_KEY over GEMINI_API_KEY for Google models", () => {
    process.env.GOOGLE_API_KEY = "google-key";
    process.env.GEMINI_API_KEY = "gemini-key";

    expect(getNoloKey("google")).toBe("google-key");
  });

  it("resolves the crof provider key from CROFAI_API_KEY", () => {
    process.env.CROFAI_API_KEY = "crof-key";

    expect(getNoloKey("crof")).toBe("crof-key");
  });
});
