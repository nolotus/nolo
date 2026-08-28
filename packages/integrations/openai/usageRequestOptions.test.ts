import { afterEach, beforeAll, describe, expect, mock, test } from "bun:test";

import type { Agent, Message } from "app/types";

import { getUsageRequestOptions } from "ai/llm/usageRequestOptions";

let moduleVersion = 0;

const loadRequestBuilders = async () => {
  mock.module("ai/agent/generatePrompt", () => ({
    generatePrompt: () => "System Prompt Content",
  }));

  const [{ generateOpenAIRequestBody }, { generateResponseRequestBody }] = await Promise.all([
    import(`./generateOpenAIRequestBody?test=${moduleVersion}`),
    import(`./generateResponseRequestBody?test=${moduleVersion}`),
  ]);
  moduleVersion += 1;

  return { generateOpenAIRequestBody, generateResponseRequestBody };
};

const baseAgent: Agent = {
  provider: "openai",
  model: "gpt-5.4",
  userId: "user-1",
  useServerProxy: true,
  updatedAt: "2026-03-19T00:00:00.000Z",
  createdAt: 0,
  isPublic: false,
} as Agent;

const baseMessages: Message[] = [{ role: "user", content: "Hello" } as Message];

beforeAll(() => {
  (globalThis as any).navigator = { language: "en-US" };
});

afterEach(() => {
  mock.restore();
});

describe("getUsageRequestOptions", () => {
  const cases = [
    {
      provider: "openai",
      expected: { stream_options: { include_usage: true } },
    },
    {
      provider: "openrouter",
      expected: {
        stream_options: { include_usage: true },
        usage: { include: true },
      },
    },
    {
      provider: "google",
      expected: { stream_options: { include_usage: true } },
    },
    {
      provider: "xai",
      expected: { stream_options: { include_usage: true } },
    },
    {
      provider: "fireworks",
      expected: { stream_options: { include_usage: true } },
    },
    {
      provider: "mistral",
      expected: { stream_options: { include_usage: true } },
    },
    {
      provider: "deepinfra",
      expected: { stream_options: { include_usage: true } },
    },
    {
      provider: "vultr",
      expected: { stream_options: { include_usage: true } },
    },
    {
      provider: "deepseek",
      expected: { stream_options: { include_usage: true } },
    },
    {
      provider: "ollama",
      expected: { stream_options: { include_usage: true } },
    },
    {
      provider: "ollama-cloud",
      expected: { stream_options: { include_usage: true } },
    },
    {
      provider: "crof",
      expected: { stream_options: { include_usage: true } },
    },
    {
      provider: "custom",
      expected: {},
    },
  ] as const;

  for (const { provider, expected } of cases) {
    test(`returns explicit billing usage config for ${provider}`, () => {
      expect(getUsageRequestOptions(provider)).toEqual(expected);
    });
  }

  test("does not request stream_options for Responses API", () => {
    expect(getUsageRequestOptions("openai", { api: "responses" })).toEqual({});
    expect(getUsageRequestOptions("openrouter", { api: "responses" })).toEqual({
      usage: { include: true },
    });
  });
});

describe("request builders billing usage config", () => {
  test("applies the shared usage-request config in chat completions requests", async () => {
    const { generateOpenAIRequestBody } = await loadRequestBuilders();
    expect(
      generateOpenAIRequestBody(
        { ...baseAgent, provider: "openrouter" },
        "openrouter",
        baseMessages
      )
    ).toMatchObject({
      stream_options: { include_usage: true },
      usage: { include: true },
    });

    expect(
      generateOpenAIRequestBody(
        { ...baseAgent, provider: "deepinfra" },
        "deepinfra",
        baseMessages
      )
    ).toMatchObject({
      stream_options: { include_usage: true },
    });
  });

  test("responses requests do NOT include stream_options (Responses API returns usage natively)", async () => {
    const { generateResponseRequestBody } = await loadRequestBuilders();
    const body = generateResponseRequestBody(
      { ...baseAgent, provider: "openai", model: "gpt-5.4" },
      baseMessages
    );
    // Responses API (/v1/responses) returns usage in response.completed event natively;
    // passing stream_options.include_usage causes a 400 unknown_parameter error.
    expect(body).not.toHaveProperty("stream_options");
    expect(body.model).toBe("gpt-5.4");
    expect(body.service_tier).toBeUndefined();
  });

  test("responses requests still include provider-specific non-stream usage fields when needed", async () => {
    const { generateResponseRequestBody } = await loadRequestBuilders();
    const body = generateResponseRequestBody(
      { ...baseAgent, provider: "openrouter", model: "x-ai/grok-4.3" },
      baseMessages
    );

    expect(body).toMatchObject({
      usage: { include: true },
    });
    expect(body).not.toHaveProperty("stream_options");
  });
});
