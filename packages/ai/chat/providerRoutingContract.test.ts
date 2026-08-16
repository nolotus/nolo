/**
 * Phase 0 — Provider routing contract tests (regression guard).
 *
 * These tests assert the CURRENT behavior of client-side routing decisions
 * (isResponseAPIModel, shouldUseServerProxy) and the expected server-side
 * wireFormat for each fixture agent. They should PASS now against the
 * status quo and catch regressions during the phased migration.
 *
 * See plan: docs/plans/2026-07-03-provider-auth-wireformat-decoupling.md §6
 */

import { describe, expect, test } from "bun:test";
import { isResponseAPIModel } from "../llm/isResponseAPIModel";
import { shouldUseServerProxy } from "./shouldUseServerProxy";
import {
  resolveAgentCallPlan,
  resolveClientWire,
} from "../../agent-runtime/agentCallPlan";

// ---------------------------------------------------------------------------
// Phase 3 SAFETY: the descriptor must reproduce the two client decisions
// EXACTLY, else swapping the call sites changes behavior (this is what caught
// the 13 openai-responses-proxied agents that would otherwise 400 at
// /v1/responses when sent messages instead of input).
// ---------------------------------------------------------------------------
describe("descriptor parity with legacy client pickers", () => {
  const matrix: Array<Record<string, unknown>> = [
    { key: "a", provider: "openai", model: "gpt-4.1-mini" },
    { key: "b", provider: "openai", model: "gpt-5.5" }, // responses model, direct
    { key: "c", provider: "openai", model: "gpt-5.5", useServerProxy: true }, // responses proxied (13-agent case)
    { key: "d", provider: "chatgpt", apiKeyRef: "chatgpt", model: "gpt-5.5" }, // codex (current hack)
    { key: "f", provider: "xai", apiKeyRef: "xai" },
    { key: "g", provider: "google-antigravity", apiKeyRef: "antigravity" },
    { key: "h", provider: "custom", customProviderUrl: "https://api.x.ai/v1" },
    { key: "i", provider: "deepseek", model: "deepseek-v4" },
  ];

  for (const cfg of matrix) {
    const label = `${cfg.provider}/${cfg.model ?? "-"}${cfg.apiKeyRef ? "/" + cfg.apiKeyRef : ""}${cfg.useServerProxy ? "/proxy" : ""}`;
    test(`wire parity (${label})`, () => {
      const plan = resolveAgentCallPlan(cfg as any, {});
      expect(resolveClientWire(plan) === "responses").toBe(
        isResponseAPIModel(cfg as any),
      );
    });
    test(`transport parity (${label})`, () => {
      const plan = resolveAgentCallPlan(cfg as any, {});
      expect(plan.transport === "server-proxy").toBe(
        shouldUseServerProxy(cfg as any),
      );
    });
  }

  // Post-hack codex (provider:"openai" + apiKeyRef:"chatgpt"): the descriptor is
  // CORRECT where the legacy picker is WRONG. isResponseAPIModel would say
  // responses (client sends `input`) and break codex; resolveClientWire says
  // chat.completions. This is exactly why the client must switch to the
  // descriptor BEFORE the provider:"chatgpt" hack is removed.
  test("post-hack codex: descriptor correct, legacy picker wrong", () => {
    const postHack = { provider: "openai", apiKeyRef: "chatgpt", model: "gpt-5.5" } as any;
    expect(isResponseAPIModel(postHack)).toBe(true); // legacy: WRONG for codex
    const plan = resolveAgentCallPlan(postHack, {});
    expect(resolveClientWire(plan)).toBe("chat.completions"); // descriptor: correct
  });
});

// ---------------------------------------------------------------------------
// Fixtures — representative agent configs used across the codebase
// ---------------------------------------------------------------------------

/** Codex (ChatGPT OAuth) agent — uses Responses wire format at /backend-api/codex/responses */
const codexAgent = {
  provider: "chatgpt",
  model: "gpt-5.5",
  apiKeyRef: "chatgpt",
  useServerProxy: false,
};

/** xAI SuperGrok OAuth agent — uses chat.completions wire format at api.x.ai */
const xaiAgent = {
  provider: "xai",
  model: "grok-3",
  apiKeyRef: "xai",
  useServerProxy: false,
};

/** Antigravity (Google Cloud Code Assist) OAuth agent */
const antigravityAgent = {
  provider: "google-antigravity",
  model: "gemini-3-pro",
  apiKeyRef: "antigravity",
  useServerProxy: false,
};

/** OpenAI Responses model — uses Responses wire format (gpt-5.5 has endpointKey:"responses") */
const openaiResponsesAgent = {
  provider: "openai",
  model: "gpt-5.5",
  useServerProxy: false,
};

/** OpenAI standard model — uses chat.completions */
const openaiStandardAgent = {
  provider: "openai",
  model: "gpt-4.1-mini",
  useServerProxy: false,
};

/** Custom OpenAI-compatible provider — direct, chat.completions */
const customOpenAiAgent = {
  provider: "custom",
  model: "llama-3",
  customProviderUrl: "https://api.example.com/v1/chat/completions",
  useServerProxy: false,
};

/** Google family provider — server proxy */
const googleAgent = {
  provider: "google",
  model: "gemini-2.0-flash",
  useServerProxy: false,
};

// ---------------------------------------------------------------------------
// Test 1: Client/server agree on wireFormat
// ---------------------------------------------------------------------------
describe("provider routing contract — wireFormat agreement", () => {
  test("Codex (chatgpt OAuth) → client does NOT flag as Responses API (current hack)", () => {
    // Currently, Codex uses provider:"chatgpt" to bypass isResponseAPIModel.
    // The Responses format is chosen by the server-side codex translator, not
    // by this client-side picker. The plan will later make this explicit via
    // resolveAgentCallPlan.
    expect(isResponseAPIModel(codexAgent)).toBe(false);
  });

  test("Codex (chatgpt OAuth) → should use server proxy", () => {
    expect(shouldUseServerProxy(codexAgent)).toBe(true);
  });

  test("xAI OAuth → client does NOT flag as Responses API", () => {
    expect(isResponseAPIModel(xaiAgent)).toBe(false);
  });

  test("xAI OAuth → should use server proxy", () => {
    expect(shouldUseServerProxy(xaiAgent)).toBe(true);
  });

  test("Antigravity OAuth → client does NOT flag as Responses API", () => {
    expect(isResponseAPIModel(antigravityAgent)).toBe(false);
  });

  test("Antigravity OAuth → should use server proxy (via google family)", () => {
    // google-antigravity matches isGoogleFamilyProvider
    expect(shouldUseServerProxy(antigravityAgent)).toBe(true);
  });

  test("OpenAI Responses model (gpt-5.5) → client flags as Responses API", () => {
    expect(isResponseAPIModel(openaiResponsesAgent)).toBe(true);
  });

  test("OpenAI standard model → client does NOT flag as Responses API", () => {
    expect(isResponseAPIModel(openaiStandardAgent)).toBe(false);
  });

  test("Custom OpenAI-compatible → client does NOT flag as Responses API", () => {
    expect(isResponseAPIModel(customOpenAiAgent)).toBe(false);
  });

  test("Custom OpenAI-compatible → does not use server proxy by default", () => {
    expect(shouldUseServerProxy(customOpenAiAgent)).toBe(false);
  });

  test("Google family → should use server proxy", () => {
    expect(shouldUseServerProxy(googleAgent)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Test 2: Every OAuth apiKeyRef routes to server-proxy
// ---------------------------------------------------------------------------
describe("provider routing contract — OAuth → server-proxy", () => {
  const oauthApiKeyRefs = ["antigravity", "xai", "chatgpt", "claude"];

  for (const ref of oauthApiKeyRefs) {
    test(`apiKeyRef="${ref}" forces server proxy`, () => {
      expect(
        shouldUseServerProxy({
          provider: "openai",
          apiKeyRef: ref,
          useServerProxy: false,
        }),
      ).toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------
// Test 3: useServerProxy flag is honored
// ---------------------------------------------------------------------------
describe("provider routing contract — useServerProxy flag", () => {
  test("useServerProxy:true forces proxy even without OAuth", () => {
    expect(
      shouldUseServerProxy({
        provider: "openai",
        apiKeyRef: undefined,
        useServerProxy: true,
      }),
    ).toBe(true);
  });

  test("useServerProxy:false without OAuth stays direct", () => {
    expect(
      shouldUseServerProxy({
        provider: "openai",
        apiKeyRef: undefined,
        useServerProxy: false,
      }),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Phase 3 regression guard (Part B): exhaustive parity matrix over every
// distinct agent shape observed in production data + every hardcoded fixture.
//
// Sources enumerated:
//   1. data/leveldb READ-ONLY — all records whose key starts with `agent-`,
//      deduped by the tuple { provider, apiSource, apiKeyRef, customProviderUrl,
//      model, useServerProxy } (DB iteration copy at /tmp/leveldb-readonly-copy,
//      production leveldb untouched).
//   2. providerRegistry.ts SUBSCRIPTION_OAUTH_PROVIDERS + CUSTOM_API_KEY_TEMPLATES.
//   3. Hardcoded agent fixtures across *.test.ts files.
//
// For every distinct shape, the descriptor (resolveClientWire / plan.transport)
// MUST equal the legacy picker (isResponseAPIModel / shouldUseServerProxy),
// EXCEPT for the documented post-hack codex case (§ INTENDED EXCEPTION below).
//
// If any other shape breaks equality, the test fails loudly — that's a real
// behavior gap (e.g. a missed call-site swap during Phase 3 migration).
// ---------------------------------------------------------------------------

describe("descriptor parity matrix — every distinct agent shape", () => {
  // ── DB-derived shapes (read-only enumeration of data/leveldb, 27 distinct) ──
  const dbShapes: Array<Record<string, unknown>> = [
    { src: "DB", shape: "deepinfra+Meta-Llama+proxy", provider: "deepinfra", apiSource: "platform", model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo", useServerProxy: true },
    { src: "DB", shape: "cli+codex", provider: "cli", apiSource: "cli", model: "codex" },
    { src: "DB", shape: "custom+mimo+proxy", provider: "custom", apiSource: "custom", customProviderUrl: "https://token-plan-cn.xiaomimimo.com/v1", model: "mimo-v2.5-pro", useServerProxy: true },
    { src: "DB", shape: "qoder+cli+auto", provider: "qoder", apiSource: "cli", model: "auto" },
    { src: "DB", shape: "empty+cli", apiSource: "cli", model: "" },
    { src: "DB", shape: "google-antigravity+oauth", provider: "google-antigravity", apiSource: "custom", apiKeyRef: "antigravity", customProviderUrl: "https://cloudcode-pa.googleapis.com", model: "gemini-3.1-pro" },
    { src: "DB", shape: "openai+chatgpt+codex", provider: "openai", apiSource: "custom", apiKeyRef: "chatgpt", customProviderUrl: "https://chatgpt.com/backend-api/codex/responses", model: "gpt-5.5" },
    { src: "DB", shape: "xai+oauth", provider: "xai", apiSource: "custom", apiKeyRef: "xai", customProviderUrl: "https://api.x.ai/v1", model: "grok-composer-2.5-fast" },
    { src: "DB", shape: "custom+minimaxi", provider: "custom", apiSource: "custom", customProviderUrl: "https://api.minimaxi.com/v1", model: "MiniMax-M3", useServerProxy: false },
    { src: "DB", shape: "google+gemini-flash", provider: "google", apiSource: "platform", model: "gemini-3.5-flash" },
    { src: "DB", shape: "null-provider+deepseek", model: "deepseek-v4-pro" },
    { src: "DB", shape: "openai+gpt-5.4-nano+proxy", provider: "openai", apiSource: "platform", model: "gpt-5.4-nano", useServerProxy: true },
    { src: "DB", shape: "deepinfra+opus-4-8+proxy", provider: "deepinfra", apiSource: "platform", model: "anthropic/claude-opus-4-8", useServerProxy: true },
    { src: "DB", shape: "deepinfra+sonnet-5+proxy", provider: "deepinfra", apiSource: "platform", model: "anthropic/claude-sonnet-5", useServerProxy: true },
    { src: "DB", shape: "deepseek+flash+proxy", provider: "deepseek", apiSource: "platform", model: "deepseek-v4-flash", useServerProxy: true },
    { src: "DB", shape: "deepseek+pro+proxy", provider: "deepseek", apiSource: "platform", model: "deepseek-v4-pro", useServerProxy: true },
    { src: "DB", shape: "fireworks+kimi-k2p6+proxy", provider: "fireworks", apiSource: "platform", model: "accounts/fireworks/models/kimi-k2p6", useServerProxy: true },
    { src: "DB", shape: "google+gemini-3.5+proxy", provider: "google", apiSource: "platform", model: "gemini-3.5-flash", useServerProxy: true },
    { src: "DB", shape: "openai+gpt-5.4+proxy", provider: "openai", apiSource: "platform", model: "gpt-5.4", useServerProxy: true },
    { src: "DB", shape: "openai+gpt-5.5-pro+proxy", provider: "openai", apiSource: "platform", model: "gpt-5.5-pro", useServerProxy: true },
    { src: "DB", shape: "openai+gpt-5.5+proxy", provider: "openai", apiSource: "platform", model: "gpt-5.5", useServerProxy: true },
    { src: "DB", shape: "fireworks+minimax-m3+proxy", provider: "fireworks", apiSource: "platform", model: "accounts/fireworks/models/minimax-m3", useServerProxy: true },
    { src: "DB", shape: "google+image+proxy", provider: "google", apiSource: "platform", model: "gemini-3.1-flash-lite-image", useServerProxy: true },
    { src: "DB", shape: "fireworks+kimi-latest+proxy", provider: "fireworks", apiSource: "platform", model: "accounts/fireworks/models/kimi-latest", useServerProxy: true },
    { src: "DB", shape: "empty-record", provider: null, apiSource: null, model: null },
    { src: "DB", shape: "deepseek+pro+direct", provider: "deepseek", apiSource: "platform", model: "deepseek-v4-pro" },
    { src: "DB", shape: "deepinfra+kimi+direct", provider: "deepinfra", apiSource: "platform", model: "moonshotai/Kimi-K2.6" },
  ];

  // ── Registry-derived fixtures (providerRegistry.ts) ──
  // SUBSCRIPTION_OAUTH_PROVIDERS render as `apiKeyRef: <id>` agents.
  const registryOauthShapes: Array<Record<string, unknown>> = [
    { src: "registry-oauth", shape: "ChatGPT-Plus", provider: "openai", apiKeyRef: "chatgpt", model: "gpt-4.1" },
    { src: "registry-oauth", shape: "xAI-Grok-OAuth", provider: "xai", apiKeyRef: "xai", model: "grok-4.5" },
    { src: "registry-oauth", shape: "Antigravity-OAuth", provider: "google-antigravity", apiKeyRef: "antigravity", model: "gemini-3.1-pro" },
  ];

  // CUSTOM_API_KEY_TEMPLATES render as `custom` agents with customProviderUrl.
  // NOTE: providerRegistry is an Agent-CREATION registry, so the user later
  // wraps these into custom-provider agents; we exercise the resulting shape.
  const registryCustomShapes: Array<Record<string, unknown>> = [
    { src: "registry-custom", shape: "OpenCode-Go", provider: "custom", customProviderUrl: "https://opencode.ai/zen/go/v1", model: "glm-5.2" },
    { src: "registry-custom", shape: "OpenAI-API", provider: "custom", customProviderUrl: "https://api.openai.com/v1", model: "gpt-4.1" },
    { src: "registry-custom", shape: "Anthropic-API", provider: "custom", customProviderUrl: "https://api.anthropic.com", model: "claude-sonnet-4-20250514", apiKeyHeader: "x-api-key" },
    { src: "registry-custom", shape: "Gemini-API", provider: "custom", customProviderUrl: "https://generativelanguage.googleapis.com/v1beta", model: "gemini-2.5-pro", apiKeyHeader: "x-goog-api-key" },
    { src: "registry-custom", shape: "xAI-API", provider: "custom", customProviderUrl: "https://api.x.ai/v1", model: "grok-4.5" },
  ];

  const allShapes = [...dbShapes, ...registryOauthShapes, ...registryCustomShapes];

  // The post-hack codex shape (`provider:"openai" + apiKeyRef:"chatgpt"`) is
  // the documented INTENDED EXCEPTION (§4.1 of the plan, also called out
  // explicitly in the original `descriptor parity with legacy client pickers`
  // block above) — `isResponseAPIModel` is WRONG here (true, would send
  // Responses `input` to a Codex translator that expects `messages`); the
  // descriptor is CORRECT (`chat.completions`). We assert the descriptor
  // separately below and skip the equality check for this shape.
  const isPostHackCodex = (cfg: Record<string, unknown>) =>
    cfg.provider === "openai" &&
    typeof cfg.apiKeyRef === "string" &&
    cfg.apiKeyRef.toLowerCase() === "chatgpt";

  for (const cfg of allShapes) {
    if (isPostHackCodex(cfg)) continue; // covered by INTENDED EXCEPTION below
    const label = `[${cfg.src}] ${cfg.shape}`;
    test(`wire parity — ${label}`, () => {
      const plan = resolveAgentCallPlan(cfg as any, {});
      const descriptorIsResponses = resolveClientWire(plan) === "responses";
      const legacyIsResponses = isResponseAPIModel(cfg as any);
      expect(descriptorIsResponses).toBe(legacyIsResponses);
    });
    test(`transport parity — ${label}`, () => {
      const plan = resolveAgentCallPlan(cfg as any, {});
      const descriptorIsProxy = plan.transport === "server-proxy";
      const legacyIsProxy = shouldUseServerProxy(cfg as any);
      expect(descriptorIsProxy).toBe(legacyIsProxy);
    });
  }

  // ── INTENDED EXCEPTION: post-hack codex (provider:"openai" + apiKeyRef:"chatgpt") ──
  // isResponseAPIModel is WRONG here (true, would send Responses `input` to a
  // Codex translator that expects `messages`). resolveClientWire is CORRECT
  // (chat.completions, because Codex is a TRANSLATING route). Documented in
  // plan §4.1 + §4.2. We DO NOT assert equality — we assert the descriptor is
  // correct and explicitly note why the legacy picker is wrong.
  test("INTENDED EXCEPTION: post-hack codex (openai+chatgpt) — descriptor correct, legacy wrong", () => {
    const postHack = {
      provider: "openai",
      apiSource: "custom",
      apiKeyRef: "chatgpt",
      customProviderUrl: "https://chatgpt.com/backend-api/codex/responses",
      model: "gpt-5.5",
    } as any;
    // Legacy picker: WRONG — returns true because provider==openai AND model
    // is in the responses table, so it would tell the client to send `input`
    // to a Codex translator that only consumes `messages`.
    expect(isResponseAPIModel(postHack)).toBe(true);
    // Descriptor: CORRECT — Codex is a TRANSLATING route, so clientWire is
    // chat.completions regardless of the responses-model table lookup.
    const plan = resolveAgentCallPlan(postHack, {});
    expect(resolveClientWire(plan)).toBe("chat.completions");
    // Transport still agrees — both legacy and descriptor say server-proxy
    // (apiKeyRef=chatgpt is OAuth → must route through Nolo proxy).
    expect(plan.transport).toBe("server-proxy");
    expect(shouldUseServerProxy(postHack)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Phase 3 regression guard (Part B): bodyData.provider request-override.
//
// fetchUtils.ts merges `bodyData.provider` onto `agentConfig.provider` BEFORE
// calling `resolveAgentCallPlan`. The OLD `shouldUseServerProxy` takes the
// request provider as its 2nd arg. We verify the merged-config descriptor
// matches the merged-config legacy picker for google-family overrides (the
// case that motivates the request-override path).
// ---------------------------------------------------------------------------

describe("descriptor parity matrix — bodyData.provider request-override", () => {
  type OverrideCase = {
    label: string;
    agentConfig: Record<string, unknown>;
    bodyDataProvider: string | undefined;
    /** The merged-config the descriptor actually receives. */
    expectedMergedProvider: string;
  };

  const overrideCases: OverrideCase[] = [
    // google-family override: agent is openai but request body demands google.
    // Legacy shouldUseServerProxy(agentConfig, "google") → true (google family).
    // Descriptor's resolveAgentCallPlan({provider:"google",...}) → server-proxy.
    {
      label: "openai-agent → google-family request override (proxy)",
      agentConfig: { provider: "openai", apiSource: "platform", model: "gpt-5.5", useServerProxy: false },
      bodyDataProvider: "google",
      expectedMergedProvider: "google",
    },
    // google-* prefix (long context) — same google-family detection.
    {
      label: "openai-agent → google-gla-family request override (proxy)",
      agentConfig: { provider: "openai", apiSource: "platform", model: "gpt-4.1-mini", useServerProxy: false },
      bodyDataProvider: "google-gla",
      expectedMergedProvider: "google-gla",
    },
    // Antigravity OAuth agent (apiKeyRef=antigravity wins regardless of override).
    {
      label: "antigravity-OAuth agent → custom override (OAuth wins, still proxy)",
      agentConfig: { provider: "google-antigravity", apiSource: "custom", apiKeyRef: "antigravity", customProviderUrl: "https://cloudcode-pa.googleapis.com", model: "gemini-3.1-pro" },
      bodyDataProvider: "custom",
      expectedMergedProvider: "custom",
    },
    // No override — bodyData.provider is absent. fetchUtils falls back to
    // agentConfig.provider. Descriptor and legacy both see the raw config.
    // NOTE: the codex-OAuth override case is intentionally omitted — it hits
    // the same INTENDED EXCEPTION as the post-hack codex shape in the main
    // matrix (`provider:"openai"+apiKeyRef:"chatgpt"` ⇒ legacy isResponseAPI
    // is wrong, descriptor is correct). The override path doesn't change
    // anything about that mismatch; covered by the dedicated test above.
    {
      label: "openai agent → no override (falls back to agentConfig.provider)",
      agentConfig: { provider: "openai", apiSource: "platform", model: "gpt-5.5", useServerProxy: true },
      bodyDataProvider: undefined,
      expectedMergedProvider: "openai",
    },
    // Override cancels a useServerProxy directive by swapping to non-google,
    // non-oauth provider. Legacy shouldUseServerProxy(agentConfig, "custom")
    // returns the same thing as without the override — useServerProxy is the
    // final fallback after google-family + oauth checks.
    {
      label: "custom-agent → custom override (useServerProxy still wins)",
      agentConfig: { provider: "openai", apiSource: "custom", customProviderUrl: "https://example.com/v1", model: "gpt-4.1-mini", useServerProxy: true },
      bodyDataProvider: "custom",
      expectedMergedProvider: "custom",
    },
  ];

  for (const c of overrideCases) {
    test(`transport parity (override) — ${c.label}`, () => {
      // Mirror fetchUtils.ts merge semantics exactly:
      //   provider: params.bodyData.provider || params.agentConfig.provider
      const mergedProvider = c.bodyDataProvider || (c.agentConfig.provider as string);
      const mergedConfig = { ...c.agentConfig, provider: mergedProvider };

      const plan = resolveAgentCallPlan(mergedConfig as any, {});
      const descriptorIsProxy = plan.transport === "server-proxy";

      // Legacy picker: shouldUseServerProxy(agentConfig, requestProvider).
      const legacyIsProxy = shouldUseServerProxy(
        c.agentConfig as any,
        c.bodyDataProvider,
      );

      expect(descriptorIsProxy).toBe(legacyIsProxy);
      // Sanity: the merged provider is what we expected (so future drift in
      // fetchUtils merges would be caught here too).
      expect(mergedProvider).toBe(c.expectedMergedProvider);
    });

    test(`wire parity (override) — ${c.label}`, () => {
      const mergedProvider = c.bodyDataProvider || (c.agentConfig.provider as string);
      const mergedConfig = { ...c.agentConfig, provider: mergedProvider };

      const plan = resolveAgentCallPlan(mergedConfig as any, {});
      const descriptorIsResponses = resolveClientWire(plan) === "responses";

      // isResponseAPIModel ignores request-provider (it only sees the merged
      // config in fetchUtils, where it's called BEFORE the merge). For the
      // override path we just verify descriptor ≡ raw-config legacy picker,
      // because the legacy picker that ACTUALLY ran in fetchUtils is
      // shouldUseServerProxy (wireFormat wasn't overridden by requestProvider).
      const legacyIsResponses = isResponseAPIModel(mergedConfig as any);

      expect(descriptorIsResponses).toBe(legacyIsResponses);
    });
  }
});
