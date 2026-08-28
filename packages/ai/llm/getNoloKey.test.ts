import { afterEach, describe, expect, it } from "bun:test";

import { getNoloKey } from "./getNoloKey";

const trackedEnvNames = [
  "OPENAI_API_KEY",
  "OPENAI_KEY",
  "VULTR_API_KEY",
  "GOOGLE_API_KEY",
  "GEMINI_API_KEY",
  "CROFAI_API_KEY",
  "OLLAMA_API_KEY",
  "RUNINFRA_API_KEY",
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

  it("平台 provider nolo / ollama-cloud 不再兜底发 key", () => {
    // 回归 2026-08-13 / 2026-08-22：兜底把 OLLAMA_API_KEY 交给了打向
    // api.deepseek.com 的请求。平台托管的每个模型都必须显式分流到真实上游，
    // key 由那一侧提供；这里没有任何 key 可发。
    process.env.OLLAMA_API_KEY = "ollama-key";

    expect(getNoloKey("nolo")).toBe(null);
    expect(getNoloKey("ollama-cloud")).toBe(null);
  });

  it("resolves the crof provider key from CROFAI_API_KEY", () => {
    process.env.CROFAI_API_KEY = "crof-key";

    expect(getNoloKey("crof")).toBe("crof-key");
  });

  it("resolves the runinfra provider key from RUNINFRA_API_KEY", () => {
    process.env.RUNINFRA_API_KEY = "runinfra-key";

    expect(getNoloKey("runinfra")).toBe("runinfra-key");
  });
});
