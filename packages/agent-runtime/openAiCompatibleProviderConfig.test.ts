import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createFileCredentialBroker } from "./fileCredentialBroker";
import { resolveOpenAiCompatibleProviderConfig } from "./openAiCompatibleProviderConfig";

const tempHomes: string[] = [];
afterAll(() => {
  for (const home of tempHomes) {
    rmSync(home, { recursive: true, force: true });
  }
});

describe("OpenAI-compatible provider config resolver", () => {
  test("uses agent customProviderUrl as the chat completions endpoint", async () => {
    expect(await resolveOpenAiCompatibleProviderConfig({
      agentConfig: {
        key: "agent-custom",
        model: "qwen-coder",
        provider: "custom",
        apiSource: "custom",
        customProviderUrl: "https://provider.example/v1/chat/completions",
        apiKey: "sk-agent-custom",
        apiKeyHeader: "api-key",
      },
      env: {
        OPENAI_API_KEY: "sk-env-should-not-win",
        NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
      },
    })).toEqual({
      model: "qwen-coder",
      endpoint: "https://provider.example/v1/chat/completions",
      apiKey: "sk-agent-custom",
      apiKeyHeader: "api-key",
      provider: "custom",
      requestOptions: {},
    });
  });

  test("defaults Xiaomi custom endpoints to api-key auth header", async () => {
    expect(await resolveOpenAiCompatibleProviderConfig({
      agentConfig: {
        key: "agent-mimo-custom",
        model: "mimo-v2.5-pro",
        provider: "custom",
        apiSource: "custom",
        customProviderUrl: "https://token-plan-cn.xiaomimimo.com/v1",
        apiKey: "mimo-monthly-key",
      },
      env: {},
    })).toEqual({
      model: "mimo-v2.5-pro",
      endpoint: "https://token-plan-cn.xiaomimimo.com/v1/chat/completions",
      apiKey: "mimo-monthly-key",
      apiKeyHeader: "api-key",
      provider: "custom",
      requestOptions: {},
    });
  });

  test("falls back to local OpenAI-compatible env endpoint and explicit agent options", async () => {
    expect(await resolveOpenAiCompatibleProviderConfig({
      agentConfig: {
        key: "agent-local",
        temperature: 0.2,
        top_p: 0.9,
      },
      env: {
        NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1/",
        NOLO_LOCAL_OPENAI_API_KEY: "sk-local",
      },
    })).toEqual({
      model: "gpt-4.1-mini",
      endpoint: "http://127.0.0.1:11434/v1/chat/completions",
      apiKey: "sk-local",
      provider: "openai-compatible",
      requestOptions: {
        temperature: 0.2,
        top_p: 0.9,
      },
    });
  });

  test("forwards credentialBroker so migrated keys resolve without raw apiKey", async () => {
    const homeDir = mkdtempSync(join(tmpdir(), "nolo-oai-cfg-broker-"));
    tempHomes.push(homeDir);
    const broker = createFileCredentialBroker({ homeDir });
    await broker.put("api-key:agent-brokered", "sk-from-broker");

    expect(await resolveOpenAiCompatibleProviderConfig({
      agentConfig: {
        key: "agent-brokered",
        provider: "custom",
        apiSource: "custom",
        model: "mimo-v2.5-pro",
        customProviderUrl: "https://token-plan-cn.xiaomimimo.com/v1",
        credentialRef: "api-key:agent-brokered",
        // No raw apiKey on the record after migration.
      },
      env: {},
      credentialBroker: broker,
    })).toMatchObject({
      model: "mimo-v2.5-pro",
      endpoint: "https://token-plan-cn.xiaomimimo.com/v1/chat/completions",
      apiKey: "sk-from-broker",
      apiKeyHeader: "api-key",
      provider: "custom",
    });
  });
});
