import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createFileCredentialBroker } from "./fileCredentialBroker";
import {
  buildProviderAuthHeaders,
  buildProviderExecutionPlan,
  canUsePlatformChatProvider,
  resolveAgentProviderMode,
  resolveAgentRuntimeLocation,
  resolveCredentialFromBroker,
  resolveCustomProviderEndpoint,
  resolvePlatformAuthToken,
  resolveProviderTransportDecision,
} from "./providerResolution";
import type { DirectProviderExecutionPlan } from "./providerResolution";

const tempHomes: string[] = [];

afterEach(() => {
  while (tempHomes.length > 0) {
    const home = tempHomes.pop();
    if (home) rmSync(home, { recursive: true, force: true });
  }
});

describe("provider resolution", () => {
  test("separates machine runtime location from custom provider transport", () => {
    const runtimeLocation = resolveAgentRuntimeLocation({
      runtimeKind: "local",
      agentConfig: {
        key: "agent-qwen",
        apiSource: "custom",
        customProviderUrl: "http://127.0.0.1:8080/v1/chat/completions",
        runtimeBinding: { machineId: "machine-win" },
      },
    });

    expect(runtimeLocation).toBe("bound-machine");
    expect(resolveProviderTransportDecision({
      runtimeLocation,
      agentConfig: {
        key: "agent-qwen",
        apiSource: "custom",
        customProviderUrl: "http://127.0.0.1:8080/v1/chat/completions",
        runtimeBinding: { machineId: "machine-win" },
      },
      env: {
        NOLO_SERVER: "https://nolo.chat",
        AUTH_TOKEN: "connector-token",
      },
    })).toEqual({
      mode: "custom",
      transport: "direct",
      reason: "custom-provider",
    });
  });

  test("keeps platform agents on the platform proxy from a machine runtime", () => {
    expect(resolveProviderTransportDecision({
      runtimeLocation: "bound-machine",
      agentConfig: {
        key: "agent-platform",
        apiSource: "platform",
        provider: "fireworks",
      },
      env: {
        NOLO_SERVER: "https://nolo.chat",
        AUTH_TOKEN: "connector-token",
      },
    })).toEqual({
      mode: "platform",
      transport: "proxy",
      reason: "platform-agent",
    });
  });

  test("classifies cli agents via cliProvider", () => {
    expect(resolveAgentProviderMode({
      key: "agent-cli",
      cliProvider: "codex",
    })).toBe("cli");
    expect(resolveAgentProviderMode({
      key: "agent-opencode",
      cliProvider: "opencode",
    })).toBe("cli");
    expect(resolveAgentProviderMode({
      key: "agent-grok",
      cliProvider: "grok",
    })).toBe("cli");
  });

  test("classifies custom agents via customProviderUrl", () => {
    expect(resolveAgentProviderMode({
      key: "agent-custom",
      customProviderUrl: "https://provider.example/v1",
    })).toBe("custom");
  });

  test("defaults remaining agents to platform", () => {
    expect(resolveAgentProviderMode({
      key: "agent-platform",
      provider: "fireworks",
    })).toBe("platform");
  });

  describe("custom provider endpoint resolution", () => {
    test("preserves explicit /responses endpoint without appending /chat/completions", () => {
      expect(resolveCustomProviderEndpoint("https://opencode.ai/zen/v1/responses")).toBe(
        "https://opencode.ai/zen/v1/responses"
      );
      expect(resolveCustomProviderEndpoint("https://opencode.ai/zen/v1/responses/")).toBe(
        "https://opencode.ai/zen/v1/responses"
      );
      expect(resolveCustomProviderEndpoint("https://api.openai.com/v1/responses")).toBe(
        "https://api.openai.com/v1/responses"
      );
    });

    test("preserves explicit /chat/completions endpoint without double-appending", () => {
      expect(resolveCustomProviderEndpoint("http://127.0.0.1:8080/v1/chat/completions")).toBe(
        "http://127.0.0.1:8080/v1/chat/completions"
      );
      expect(resolveCustomProviderEndpoint("https://api.example.com/v1/chat/completions/")).toBe(
        "https://api.example.com/v1/chat/completions"
      );
    });

    test("appends /chat/completions for base URLs", () => {
      expect(resolveCustomProviderEndpoint("https://dashscope.aliyuncs.com/compatible-mode/v1")).toBe(
        "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
      );
      expect(resolveCustomProviderEndpoint("https://token-plan-cn.xiaomimimo.com/v1")).toBe(
        "https://token-plan-cn.xiaomimimo.com/v1/chat/completions"
      );
      expect(resolveCustomProviderEndpoint("https://api.openai.com/v1/")).toBe(
        "https://api.openai.com/v1/chat/completions"
      );
    });
  });

  test("builds a direct custom execution plan preserving /responses endpoint", async () => {
    expect(await buildProviderExecutionPlan({
      runtimeKind: "local",
      agentConfig: {
        key: "agent-opencode",
        provider: "custom",
        apiSource: "custom",
        model: "opencode-zen",
        customProviderUrl: "https://opencode.ai/zen/v1/responses",
        apiKey: "sk-opencode",
      },
      env: {},
    })).toMatchObject({
      mode: "custom",
      transport: "direct",
      provider: "custom",
      model: "opencode-zen",
      endpoint: "https://opencode.ai/zen/v1/responses",
      apiKey: "sk-opencode",
    });
  });

  test("builds a direct custom execution plan from agent-owned credentials", async () => {
    expect(await buildProviderExecutionPlan({
      runtimeKind: "local",
      agentConfig: {
        key: "agent-mimo",
        provider: "custom",
        apiSource: "custom",
        model: "mimo-v2.5-pro",
        customProviderUrl: "https://token-plan-cn.xiaomimimo.com/v1",
        apiKey: "mimo-agent-key",
      },
      env: {
        OPENAI_API_KEY: "sk-env-should-not-win",
      },
    })).toMatchObject({
      mode: "custom",
      transport: "direct",
      provider: "custom",
      model: "mimo-v2.5-pro",
      endpoint: "https://token-plan-cn.xiaomimimo.com/v1/chat/completions",
      apiKey: "mimo-agent-key",
      apiKeyHeader: "api-key",
    });
  });

  test("builds a proxy execution plan for explicit platform agents", async () => {
    expect(await buildProviderExecutionPlan({
      runtimeKind: "local",
      agentConfig: {
        key: "agent-platform",
        provider: "fireworks",
        apiSource: "platform",
        model: "accounts/fireworks/models/kimi-k2p6",
      },
      env: {
        NOLO_SERVER: "https://us.nolo.chat",
        AUTH_TOKEN: "token-1",
        OPENAI_API_KEY: "sk-direct-ignored",
      },
    })).toMatchObject({
      mode: "platform",
      transport: "proxy",
      provider: "fireworks",
      serverUrl: "https://us.nolo.chat",
      authToken: "token-1",
      endpoint: "https://api.fireworks.ai/inference/v1/chat/completions",
    });
  });

  test.each(["mistral", "mimo", "vultr"])(
    "rejects %s as a platform provider (retired)",
    async (provider) => {
      // These three were dropped from PLATFORM_CHAT_COMPLETIONS_ENDPOINTS.
      // Agents that still target those upstreams must go through
      // customProviderUrl, which bypasses the platform table entirely.
      await expect(
        buildProviderExecutionPlan({
          runtimeKind: "local",
          agentConfig: {
            key: `agent-${provider}`,
            provider,
            apiSource: "platform",
            model: "some-model",
          },
          env: {
            NOLO_SERVER: "https://us.nolo.chat",
            AUTH_TOKEN: "token-1",
          },
        }),
      ).rejects.toThrow(`does not support provider "${provider}"`);
    },
  );

  test("keeps direct env-backed execution for non-forced platform agents", async () => {
    expect(await buildProviderExecutionPlan({
      runtimeKind: "local",
      agentConfig: {
        key: "agent-openai",
        provider: "openai",
      },
      env: {
        NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
        NOLO_LOCAL_OPENAI_API_KEY: "sk-local",
      },
    })).toMatchObject({
      mode: "platform",
      transport: "direct",
      provider: "openai",
      endpoint: "http://127.0.0.1:11434/v1/chat/completions",
      apiKey: "sk-local",
    });
  });

  test("prefers credential broker over env for platform-direct providers", async () => {
    const homeDir = mkdtempSync(join(tmpdir(), "nolo-plat-broker-"));
    tempHomes.push(homeDir);
    const broker = createFileCredentialBroker({ homeDir });
    await broker.put("api-key:agent-openai", "sk-from-broker");

    expect(await buildProviderExecutionPlan({
      runtimeKind: "local",
      agentConfig: {
        key: "agent-openai",
        provider: "openai",
        credentialRef: "api-key:agent-openai",
      },
      env: {
        NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
        NOLO_LOCAL_OPENAI_API_KEY: "sk-env-should-not-win",
        OPENAI_API_KEY: "sk-env-openai-should-not-win",
      },
      credentialBroker: broker,
    })).toMatchObject({
      mode: "platform",
      transport: "direct",
      provider: "openai",
      endpoint: "http://127.0.0.1:11434/v1/chat/completions",
      apiKey: "sk-from-broker",
    });
  });

  test("falls back to env key when platform-direct broker has no secret", async () => {
    const homeDir = mkdtempSync(join(tmpdir(), "nolo-plat-broker-miss-"));
    tempHomes.push(homeDir);
    const broker = createFileCredentialBroker({ homeDir });

    expect(await buildProviderExecutionPlan({
      runtimeKind: "local",
      agentConfig: {
        key: "agent-openai",
        provider: "openai",
        credentialRef: "api-key:agent-openai-missing",
      },
      env: {
        NOLO_LOCAL_OPENAI_BASE_URL: "http://127.0.0.1:11434/v1",
        NOLO_LOCAL_OPENAI_API_KEY: "sk-env-fallback",
      },
      credentialBroker: broker,
    })).toMatchObject({
      mode: "platform",
      transport: "direct",
      apiKey: "sk-env-fallback",
    });
  });

  test("falls back to env key when platform-direct has no credentialBroker", async () => {
    expect(await buildProviderExecutionPlan({
      runtimeKind: "local",
      agentConfig: {
        key: "agent-openai",
        provider: "openai",
        credentialRef: "api-key:agent-openai",
      },
      env: {
        NOLO_LOCAL_LLM: "direct",
        OPENAI_API_KEY: "sk-forced-direct-env",
      },
    })).toMatchObject({
      mode: "platform",
      transport: "direct",
      apiKey: "sk-forced-direct-env",
    });
  });

  test("does not use broker for platform proxy transport", async () => {
    const homeDir = mkdtempSync(join(tmpdir(), "nolo-plat-proxy-broker-"));
    tempHomes.push(homeDir);
    const broker = createFileCredentialBroker({ homeDir });
    await broker.put("api-key:agent-platform", "sk-from-broker-must-not-appear");

    const plan = await buildProviderExecutionPlan({
      runtimeKind: "local",
      agentConfig: {
        key: "agent-platform",
        provider: "fireworks",
        apiSource: "platform",
        model: "accounts/fireworks/models/kimi-k2p6",
        credentialRef: "api-key:agent-platform",
      },
      env: {
        NOLO_SERVER: "https://us.nolo.chat",
        AUTH_TOKEN: "token-1",
        OPENAI_API_KEY: "sk-direct-ignored",
      },
      credentialBroker: broker,
    });

    expect(plan).toMatchObject({
      mode: "platform",
      transport: "proxy",
      provider: "fireworks",
      serverUrl: "https://us.nolo.chat",
      authToken: "token-1",
    });
    expect(plan).not.toHaveProperty("apiKey", "sk-from-broker-must-not-appear");
  });

  test("builds api-key auth headers for Xiaomi endpoints by default", () => {
    expect(buildProviderAuthHeaders({
      endpoint: "https://token-plan-cn.xiaomimimo.com/v1/chat/completions",
      apiKey: "mimo-agent-key",
    })).toEqual({
      "api-key": "mimo-agent-key",
    });
  });

  test("returns empty auth headers when direct execution has no key", async () => {
    expect(await buildProviderExecutionPlan({
      runtimeKind: "local",
      agentConfig: {
        key: "agent-custom-no-key",
        provider: "custom",
        apiSource: "custom",
        customProviderUrl: "https://provider.example/v1",
      },
      env: {},
    })).toMatchObject({
      mode: "custom",
      transport: "direct",
      apiKey: "",
    });
  });

  test("resolves apiKeyRef via supplied resolver for custom providers", async () => {
    expect(await buildProviderExecutionPlan({
      runtimeKind: "local",
      agentConfig: {
        key: "agent-chatgpt-oauth",
        provider: "custom",
        apiSource: "custom",
        model: "o3",
        customProviderUrl: "https://api.openai.com/v1",
        apiKeyRef: "chatgpt",
      },
      env: {},
      apiKeyRefResolver: async (ref) => (ref === "chatgpt" ? "oauth-access-token" : null),
    })).toMatchObject({
      mode: "custom",
      transport: "direct",
      provider: "custom",
      model: "o3",
      endpoint: "https://api.openai.com/v1/chat/completions",
      apiKey: "oauth-access-token",
      apiKeyHeader: "Authorization",
    });
  });

  test("prefers credential broker over raw apiKey for custom providers", async () => {
    const homeDir = mkdtempSync(join(tmpdir(), "nolo-prov-broker-"));
    tempHomes.push(homeDir);
    const broker = createFileCredentialBroker({ homeDir });
    await broker.put("api-key:agent-mimo", "sk-from-broker");

    expect(await resolveCredentialFromBroker(broker, "api-key:agent-mimo")).toBe(
      "sk-from-broker",
    );

    expect(await buildProviderExecutionPlan({
      runtimeKind: "local",
      agentConfig: {
        key: "agent-mimo",
        provider: "custom",
        apiSource: "custom",
        model: "mimo-v2.5-pro",
        customProviderUrl: "https://token-plan-cn.xiaomimimo.com/v1",
        // Stale raw key still on record mid-migration; broker must win.
        apiKey: "sk-stale-on-record",
        credentialRef: "api-key:agent-mimo",
      },
      env: {
        OPENAI_API_KEY: "sk-env-should-not-win",
      },
      credentialBroker: broker,
    })).toMatchObject({
      mode: "custom",
      transport: "direct",
      apiKey: "sk-from-broker",
      apiKeyHeader: "api-key",
    });
  });

  test("does not platform-proxy-fallback when unauthenticated", () => {
    expect(resolveProviderTransportDecision({
      runtimeLocation: "local-host",
      agentConfig: {
        key: "agent-local-custom",
        // No apiSource/custom url → platform mode candidate, but no token.
        provider: "openai",
      },
      env: {
        NOLO_SERVER: "https://nolo.chat",
        // intentionally no AUTH_TOKEN
      },
    })).toEqual({
      mode: "platform",
      transport: "direct",
      reason: "direct-provider-env",
    });
  });

  describe("credential sync fallback & error hints", () => {
    test("sync fallback succeeds and puts into broker when credentialSynced is true and broker misses", async () => {
      const puts: Array<{ ref: string; secret: string }> = [];
      const mockBroker: any = {
        get: async () => null,
        put: async (ref: string, secret: string) => {
          puts.push({ ref, secret });
        },
      };

      const plan = await buildProviderExecutionPlan({
        runtimeKind: "local",
        agentConfig: {
          key: "agent-qwen",
          provider: "custom",
          apiSource: "custom",
          model: "qwen-max",
          customProviderUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
          credentialRef: "api-key:agent-qwen",
          apiKeyRef: "api-key:agent-qwen",
          credentialSynced: true,
        },
        env: {},
        credentialBroker: mockBroker,
        syncFetcher: async (ref) => (ref === "api-key:agent-qwen" ? "sk-synced" : null),
      });

      expect((plan as DirectProviderExecutionPlan).apiKey).toBe("sk-synced");
      expect(puts).toEqual([{ ref: "api-key:agent-qwen", secret: "sk-synced" }]);
    });

    test("sync fallback returning null still throws with api-key hint", async () => {
      const mockBroker: any = {
        get: async () => null,
        put: async () => {},
      };
      const dummyResolver = async () => null;

      expect(
        buildProviderExecutionPlan({
          runtimeKind: "local",
          agentConfig: {
            key: "agent-qwen",
            provider: "custom",
            apiSource: "custom",
            model: "qwen-max",
            customProviderUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
            credentialRef: "api-key:agent-qwen",
            apiKeyRef: "api-key:agent-qwen",
            credentialSynced: true,
          },
          env: {},
          credentialBroker: mockBroker,
          apiKeyRefResolver: dummyResolver,
          syncFetcher: async () => null,
        }),
      ).rejects.toThrow(
        'Local credential for "api-key:agent-qwen" not found. It is synced to your account — run this agent once on a device that has the key, or re-enter it in agent settings.',
      );
    });

    test("server sync errors degrade to the same local credential hint", async () => {
      const mockBroker: any = {
        get: async () => null,
        put: async () => {},
      };

      await expect(
        buildProviderExecutionPlan({
          runtimeKind: "local",
          agentConfig: {
            key: "agent-qwen",
            provider: "custom",
            apiSource: "custom",
            model: "qwen-max",
            customProviderUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
            credentialRef: "api-key:agent-qwen",
            apiKeyRef: "api-key:agent-qwen",
            credentialSynced: true,
          },
          env: {},
          credentialBroker: mockBroker,
          apiKeyRefResolver: async () => null,
          syncFetcher: async () => {
            throw new Error("server returned HTTP 502");
          },
        }),
      ).rejects.toThrow('Local credential for "api-key:agent-qwen" not found.');
    });

    test("distinguishes error hints between api-key ref and OAuth ref", async () => {
      const dummyResolver = async () => null;

      // 1) api-key ref with credentialSynced: false
      expect(
        buildProviderExecutionPlan({
          runtimeKind: "local",
          agentConfig: {
            key: "agent-x",
            provider: "custom",
            apiSource: "custom",
            model: "custom-model",
            apiKeyRef: "api-key:agent-x",
            credentialSynced: false,
          },
          env: {},
          apiKeyRefResolver: dummyResolver,
        }),
      ).rejects.toThrow(
        'Local credential for "api-key:agent-x" not found. Re-enter the API key in agent settings, or enable cross-device sync.',
      );

      // 2) OAuth ref (e.g. chatgpt)
      expect(
        buildProviderExecutionPlan({
          runtimeKind: "local",
          agentConfig: {
            key: "agent-oauth",
            provider: "custom",
            apiSource: "custom",
            model: "custom-model",
            apiKeyRef: "chatgpt",
          },
          env: {},
          apiKeyRefResolver: dummyResolver,
        }),
      ).rejects.toThrow(
        'OAuth credential for "chatgpt" not found locally. Run `nolo auth chatgpt` (and `--sync-to-server` for server-side agent runs).',
      );
    });
  });

  test("canUsePlatformChatProvider / resolvePlatformAuthToken accept a machine key", () => {
    // A machine key (NOLO_MACHINE_API_KEY) is a valid server-proxy bearer for
    // the builtin title/summary LLM and must count as an auth token, otherwise
    // machine-authenticated TUI runs degrade the title LLM to a fallback.
    const machineEnv = { NOLO_MACHINE_API_KEY: "sk_machine_test" };
    expect(resolvePlatformAuthToken(machineEnv)).toBe("sk_machine_test");
    expect(canUsePlatformChatProvider(machineEnv)).toBe(true);

    // JWT session still wins over machine key when both are present.
    expect(resolvePlatformAuthToken({
      AUTH_TOKEN: "jwt.token.payload",
      NOLO_MACHINE_API_KEY: "sk_machine_test",
    })).toBe("jwt.token.payload");

    // No auth at all.
    expect(resolvePlatformAuthToken({})).toBe("");
    expect(canUsePlatformChatProvider({})).toBe(false);
  });

});
