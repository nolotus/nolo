/**
 * Phase 1 — Agent Call Plan tests.
 *
 * Exhaustive unit tests for resolveAgentCallPlan, mirroring today's decisions
 * for antigravity/xai/chatgpt/custom/platform agents.
 *
 * See plan: docs/plans/2026-07-03-provider-auth-wireformat-decoupling.md §6
 */

import { describe, expect, test } from "bun:test";
import {
  resolveAgentCallPlan,
  resolveClientWire,
  CODEX_REQUIRED_HEADERS,
  CODEX_RESPONSES_URL,
  CURSOR_AGENT_URL,
  XAI_CHAT_COMPLETIONS_URL,
  ANTHROPIC_MESSAGES_URL,
  ANTIGRAVITY_REQUIRED_HEADERS,
} from "./agentCallPlan";
import { ANTIGRAVITY_CLOUD_CODE_BASE_URL } from "./antigravityOAuth";
import type { AgentRuntimeAgentConfig } from "./hostAdapter";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function baseConfig(overrides: Partial<AgentRuntimeAgentConfig> = {}): AgentRuntimeAgentConfig {
  return {
    key: "agent-test",
    model: "gpt-4.1-mini",
    provider: "openai",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// antigravity
// ---------------------------------------------------------------------------
describe("resolveAgentCallPlan — antigravity", () => {
  test("apiKeyRef=antigravity → oauth:antigravity + server-proxy + gemini-cca", () => {
    const plan = resolveAgentCallPlan(baseConfig({ apiKeyRef: "antigravity" }));
    expect(plan.authMethod).toEqual({ kind: "oauth", ref: "antigravity" });
    expect(plan.transport).toBe("server-proxy");
    expect(plan.upstreamWire).toBe("gemini-cca");
  });

  test("antigravity → cloudcode endpoint", () => {
    const plan = resolveAgentCallPlan(baseConfig({ apiKeyRef: "antigravity" }));
    expect(plan.endpoint).toBe(ANTIGRAVITY_CLOUD_CODE_BASE_URL);
  });

  test("antigravity → requiredHeaders includes User-Agent", () => {
    const plan = resolveAgentCallPlan(baseConfig({ apiKeyRef: "antigravity" }));
    expect(plan.requiredHeaders).toContain("User-Agent");
  });

  test("provider=google-antigravity also detected", () => {
    const plan = resolveAgentCallPlan(baseConfig({ provider: "google-antigravity" }));
    expect(plan.authMethod).toEqual({ kind: "oauth", ref: "antigravity" });
  });
});

// ---------------------------------------------------------------------------
// chatgpt/codex
// ---------------------------------------------------------------------------
describe("resolveAgentCallPlan — chatgpt/codex", () => {
  test("apiKeyRef=chatgpt → oauth:chatgpt + server-proxy + responses", () => {
    const plan = resolveAgentCallPlan(baseConfig({ apiKeyRef: "chatgpt", provider: "openai" }));
    expect(plan.authMethod).toEqual({ kind: "oauth", ref: "chatgpt" });
    expect(plan.transport).toBe("server-proxy");
    expect(plan.upstreamWire).toBe("responses");
  });

  test("codex → endpoint is CODEX_RESPONSES_URL", () => {
    const plan = resolveAgentCallPlan(baseConfig({ apiKeyRef: "chatgpt" }));
    expect(plan.endpoint).toBe(CODEX_RESPONSES_URL);
  });

  test("codex → requiredHeaders includes chatgpt-account-id", () => {
    const plan = resolveAgentCallPlan(baseConfig({ apiKeyRef: "chatgpt" }));
    expect(plan.requiredHeaders).toContain("chatgpt-account-id");
    expect(plan.requiredHeaders).toContain("OpenAI-Beta");
    expect(plan.requiredHeaders).toContain("originator");
    expect(plan.requiredHeaders).toContain("version");
  });

  test("codex → vendor is openai (not chatgpt)", () => {
    const plan = resolveAgentCallPlan(baseConfig({ apiKeyRef: "chatgpt", provider: "openai" }));
    expect(plan.vendor).toBe("openai");
  });
});

// ---------------------------------------------------------------------------
// xAI
// ---------------------------------------------------------------------------
describe("resolveAgentCallPlan — xAI", () => {
  test("apiKeyRef=xai → oauth:xai + server-proxy + chat.completions", () => {
    const plan = resolveAgentCallPlan(baseConfig({ apiKeyRef: "xai", provider: "xai" }));
    expect(plan.authMethod).toEqual({ kind: "oauth", ref: "xai" });
    expect(plan.transport).toBe("server-proxy");
    expect(plan.upstreamWire).toBe("chat.completions");
  });

  test("xAI → endpoint is api.x.ai/v1/chat/completions", () => {
    const plan = resolveAgentCallPlan(baseConfig({ apiKeyRef: "xai" }));
    expect(plan.endpoint).toBe(XAI_CHAT_COMPLETIONS_URL);
  });

  test("xAI → no special required headers", () => {
    const plan = resolveAgentCallPlan(baseConfig({ apiKeyRef: "xai" }));
    expect(plan.requiredHeaders).toEqual([]);
  });
});

describe("resolveAgentCallPlan — Claude OAuth", () => {
  test("apiKeyRef=claude → Anthropic Messages translating proxy", () => {
    const plan = resolveAgentCallPlan(
      baseConfig({ apiKeyRef: "claude", provider: "anthropic" }),
    );
    expect(plan.authMethod).toEqual({ kind: "oauth", ref: "claude" });
    expect(plan.transport).toBe("server-proxy");
    expect(plan.upstreamWire).toBe("anthropic-messages");
    expect(plan.endpoint).toBe(ANTHROPIC_MESSAGES_URL);
    expect(resolveClientWire(plan)).toBe("chat.completions");
  });
});

describe("resolveAgentCallPlan — Cursor OAuth", () => {
  test("apiKeyRef=cursor → server-proxy translating cursor-connect", () => {
    const plan = resolveAgentCallPlan(
      baseConfig({ apiKeyRef: "cursor", provider: "cursor" }),
    );
    expect(plan.authMethod).toEqual({ kind: "oauth", ref: "cursor" });
    expect(plan.transport).toBe("server-proxy");
    expect(plan.upstreamWire).toBe("cursor-connect");
    expect(plan.endpoint).toBe(CURSOR_AGENT_URL);
    expect(resolveClientWire(plan)).toBe("chat.completions");
  });
});

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
describe("resolveAgentCallPlan — CLI", () => {
  test("cliProvider → cli auth + direct + cli wire", () => {
    const plan = resolveAgentCallPlan(baseConfig({ cliProvider: "codex" }));
    expect(plan.authMethod).toEqual({ kind: "cli", provider: "codex" });
    expect(plan.transport).toBe("direct");
    expect(plan.upstreamWire).toBe("cli");
  });

  test("apiSource=cli → cli", () => {
    const plan = resolveAgentCallPlan(baseConfig({ apiSource: "cli", provider: "opencode" }));
    expect(plan.authMethod.kind).toBe("cli");
  });
});

// ---------------------------------------------------------------------------
// Custom provider
// ---------------------------------------------------------------------------
describe("resolveAgentCallPlan — custom", () => {
  test("remote customProviderUrl → custom-key + server-proxy (browser CORS)", () => {
    const plan = resolveAgentCallPlan(
      baseConfig({ apiSource: "custom", customProviderUrl: "https://api.example.com/v1/chat/completions" }),
    );
    expect(plan.authMethod).toEqual({ kind: "custom-key" });
    expect(plan.transport).toBe("server-proxy");
    expect(plan.upstreamWire).toBe("chat.completions");
  });

  test("local customProviderUrl → custom-key + direct (no CORS for localhost)", () => {
    const plan = resolveAgentCallPlan(
      baseConfig({ apiSource: "custom", customProviderUrl: "http://127.0.0.1:11434/v1/chat/completions" }),
    );
    expect(plan.transport).toBe("direct");
  });

  test("custom with /responses URL → responses upstreamWire", () => {
    const plan = resolveAgentCallPlan(
      baseConfig({ customProviderUrl: "https://api.example.com/v1/responses" }),
    );
    expect(plan.upstreamWire).toBe("responses");
  });

  test("custom with useServerProxy → server-proxy", () => {
    const plan = resolveAgentCallPlan(
      baseConfig({
        customProviderUrl: "https://api.example.com/v1/chat/completions",
        useServerProxy: true,
      }),
    );
    expect(plan.transport).toBe("server-proxy");
  });
});

// ---------------------------------------------------------------------------
// Platform OpenAI
// ---------------------------------------------------------------------------
describe("resolveAgentCallPlan — platform OpenAI", () => {
  test("openai standard model → platform-key + direct + chat.completions", () => {
    const plan = resolveAgentCallPlan(
      baseConfig({ provider: "openai", model: "gpt-4.1-mini" }),
    );
    expect(plan.authMethod).toEqual({ kind: "platform-key" });
    expect(plan.transport).toBe("direct");
    expect(plan.upstreamWire).toBe("chat.completions");
  });

  test("openai Responses model (gpt-5.5) → platform-key + direct + responses", () => {
    const plan = resolveAgentCallPlan(
      baseConfig({ provider: "openai", model: "gpt-5.5" }),
    );
    expect(plan.upstreamWire).toBe("responses");
  });

  test("openai useServerProxy → server-proxy", () => {
    const plan = resolveAgentCallPlan(
      baseConfig({ provider: "openai", useServerProxy: true }),
    );
    expect(plan.transport).toBe("server-proxy");
  });
});

describe("resolveAgentCallPlan — legacy deepseek-provider records", () => {
  test("V4 Flash uses the official Responses wire", () => {
    const plan = resolveAgentCallPlan(
      baseConfig({ provider: "deepseek", model: "deepseek-v4-flash" }),
    );
    expect(plan.upstreamWire).toBe("responses");
    expect(plan.endpoint).toBe("https://api.deepseek.com/responses");
    expect(resolveClientWire(plan)).toBe("responses");
  });

  test("V4 Pro routes to the same Responses upstream", () => {
    const plan = resolveAgentCallPlan(
      baseConfig({ provider: "deepseek", model: "deepseek-v4-pro" }),
    );
    expect(plan.upstreamWire).toBe("responses");
    expect(plan.endpoint).toBe("https://api.deepseek.com/responses");
  });
});

// ---------------------------------------------------------------------------
// Google family
// ---------------------------------------------------------------------------
describe("resolveAgentCallPlan — Google family", () => {
  test("google provider → server-proxy via google family detection", () => {
    const plan = resolveAgentCallPlan(
      baseConfig({ provider: "google", model: "gemini-2.0-flash" }),
    );
    expect(plan.transport).toBe("server-proxy");
  });

  test("google-* prefix → server-proxy", () => {
    const plan = resolveAgentCallPlan(
      baseConfig({ provider: "google-gla", model: "gemini-2.0-flash" }),
    );
    expect(plan.transport).toBe("server-proxy");
  });
});

// ---------------------------------------------------------------------------
// Totality — no agent config throws
// ---------------------------------------------------------------------------
describe("resolveAgentCallPlan — totality", () => {
  test("empty config → sensible default", () => {
    const plan = resolveAgentCallPlan({
      key: "agent-empty",
    });
    expect(plan.authMethod).toEqual({ kind: "platform-key" });
    expect(plan.transport).toBe("direct");
    expect(plan.upstreamWire).toBe("chat.completions");
  });

  test("unknown provider → platform-key fallback", () => {
    const plan = resolveAgentCallPlan(
      baseConfig({ provider: "unknown-provider", model: "some-model" }),
    );
    expect(plan.authMethod).toEqual({ kind: "platform-key" });
    expect(plan.transport).toBe("direct");
    expect(plan.upstreamWire).toBe("chat.completions");
  });

  test("null/undefined fields do not crash", () => {
    const plan = resolveAgentCallPlan({
      key: "agent-nulls",
      provider: undefined,
      model: undefined,
      apiKeyRef: undefined,
      customProviderUrl: undefined,
      cliProvider: undefined,
      apiSource: undefined,
    });
    expect(plan.authMethod).toEqual({ kind: "platform-key" });
  });
});

// ---------------------------------------------------------------------------
// Priority order — OAuth apiKeyRef beats provider-based detection
// ---------------------------------------------------------------------------
describe("resolveAgentCallPlan — priority", () => {
  test("antigravity apiKeyRef detected even with openai provider", () => {
    const plan = resolveAgentCallPlan(
      baseConfig({ provider: "openai", apiKeyRef: "antigravity" }),
    );
    expect(plan.authMethod).toEqual({ kind: "oauth", ref: "antigravity" });
  });

  test("chatgpt apiKeyRef beats openai Responses detection", () => {
    const plan = resolveAgentCallPlan(
      baseConfig({ provider: "openai", model: "gpt-5.5", apiKeyRef: "chatgpt" }),
    );
    // Should be codex oauth, not openai responses
    expect(plan.authMethod).toEqual({ kind: "oauth", ref: "chatgpt" });
    expect(plan.endpoint).toBe(CODEX_RESPONSES_URL);
  });
});

// ---------------------------------------------------------------------------
// resolveClientWire — the F1 invariant (client↔proxy wire vs upstream wire)
// ---------------------------------------------------------------------------
describe("resolveClientWire — server-proxy always chat.completions", () => {
  // For every server-proxy agent, the client speaks chat.completions to the
  // proxy regardless of upstreamWire; the proxy owns upstream translation. This
  // is the guard that makes the Codex path stable (client sends messages, codex
  // translator converts to Responses upstream).
  // TRANSLATING proxy routes → client speaks chat.completions.
  const translated = [
    { name: "codex", cfg: { apiKeyRef: "chatgpt", provider: "openai" } },
    { name: "antigravity", cfg: { apiKeyRef: "antigravity" } },
    { name: "xai", cfg: { apiKeyRef: "xai", provider: "xai" } },
    { name: "claude", cfg: { apiKeyRef: "claude", provider: "anthropic" } },
    { name: "cursor", cfg: { apiKeyRef: "cursor", provider: "cursor" } },
  ] as const;

  for (const { name, cfg } of translated) {
    test(`${name} → clientWire is chat.completions`, () => {
      const plan = resolveAgentCallPlan(baseConfig(cfg as any));
      expect(plan.transport).toBe("server-proxy");
      expect(resolveClientWire(plan)).toBe("chat.completions");
    });
  }

  // PASS-THROUGH proxy (generic path forwards body unchanged): client must
  // still speak upstreamWire. This is the 13-production-agent case — flipping it
  // to chat.completions would 400 at /v1/responses (missing `input`).
  test("openai-responses proxied → clientWire stays responses (generic proxy is pass-through)", () => {
    const plan = resolveAgentCallPlan(
      baseConfig({ provider: "openai", model: "gpt-5.5", useServerProxy: true }),
    );
    expect(plan.transport).toBe("server-proxy");
    expect(plan.upstreamWire).toBe("responses");
    expect(resolveClientWire(plan)).toBe("responses");
  });

  test("direct openai-responses → clientWire equals upstreamWire (responses)", () => {
    const plan = resolveAgentCallPlan(baseConfig({ provider: "openai", model: "gpt-5.5" }));
    expect(plan.transport).toBe("direct");
    expect(plan.upstreamWire).toBe("responses");
    expect(resolveClientWire(plan)).toBe("responses");
  });

  test("direct plain openai → clientWire chat.completions", () => {
    const plan = resolveAgentCallPlan(baseConfig({ provider: "openai", model: "gpt-4.1-mini" }));
    expect(resolveClientWire(plan)).toBe("chat.completions");
  });
});
