/**
 * Phase 1 — Agent Call Plan resolver.
 *
 * Shared source of truth for { authMethod, upstreamWire, endpoint, headers }:
 * both client and server read these from the same descriptor, so they cannot
 * disagree on credential shape, wire format or upstream URL.
 *
 * `transport` is NOT host-invariant. It is decided per host capability, in two
 * places that must be changed together:
 * - Web / React Native (browser or RN fetch — CORS-constrained, so most
 *   provider APIs need the Nolo server as a hop) derive it from
 *   `shouldUseServerProxy` (serverProxyPolicy.ts), which forces "server-proxy"
 *   for custom agents with a remote endpoint. This file returns that value.
 * - Desktop / CLI (native fetch, no CORS) derive it from
 *   `resolveProviderTransportDecision` (providerResolution.ts). Its custom
 *   branch only proxies when runtimeLocation === "server" && useServerProxy ===
 *   true, so a custom agent stays "direct" there *even when this plan says
 *   "server-proxy"* — i.e. `useServerProxy` is ignored for custom agents on
 *   Desktop/CLI.
 *
 * Consequence (intentional, do not "unify" blindly): for a custom agent with a
 * remote endpoint the two hosts disagree — Web/RN → proxy, Desktop/CLI →
 * direct. Any change to either rule must be made with the guard tests on the
 * other side open:
 * Web/RN → agentCallPlan.test.ts + serverProxyPolicy.test.ts;
 * Desktop/CLI → providerResolution.test.ts.
 *
 * See plan: docs/plans/2026-07-03-provider-auth-wireformat-decoupling.md §4.1
 */

import { asOptionalTrimmedString } from "core/optionalString";
import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";
import type { Model } from "ai/llm/types";
import { findModelConfig } from "ai/llm/providers";
import type { AgentRuntimeAgentConfig } from "./hostAdapter";
import {
  isAntigravityCloudCodeBaseUrl,
  isAntigravityOAuthAgent,
  ANTIGRAVITY_CLOUD_CODE_BASE_URL,
} from "./antigravityOAuth";
import {
  isOpenAiResponsesModel,
  resolvePlatformResponsesEndpoint,
  resolvePlatformChatCompletionsEndpoint,
} from "./platformProviderEndpoints";
import { shouldUseServerProxy } from "./serverProxyPolicy";

// Inlined to avoid heavy transitive dependencies from codexResponsesProvider
// (which pulls in node:crypto + integrations/openai/responsesHelpers).
export const CODEX_RESPONSES_URL =
  "https://chatgpt.com/backend-api/codex/responses";

/** Cursor AgentService — ConnectRPC over HTTP/2 (application/connect+proto). */
export const CURSOR_AGENT_URL = "https://api2.cursor.sh/agent.v1.AgentService/Run";

/** Devin Connect — ConnectRPC over HTTP/2 (application/connect+proto). */
export const DEVIN_CONNECT_URL = "https://server.codeium.com/exa.api_server_pb.ApiServerService/GetChatMessage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuthMethod =
  | { kind: "platform-key" }
  | { kind: "custom-key" }
  | { kind: "oauth"; ref: "chatgpt" | "xai" | "antigravity" | "claude" | "cursor" | "devin" }
  | { kind: "cli"; provider: string };

/**
 * The wire the plan's `endpoint` expects — i.e. what the *upstream* needs, not
 * what this client must serialize (that is `ClientWire`, see resolveClientWire).
 *
 * `custom-*` values describe a **custom (custom-key) endpoint** whose model
 * declares its native wire through `Model.nativeProtocol`. They are deliberately
 * distinct from the subscription-OAuth wires `"anthropic-messages"` /
 * `"gemini-cca"` because `chatHandler` and `buildChatCallPlan` pick their
 * dedicated translator from `upstreamWire` alone, without looking at the
 * credential kind: emitting `"anthropic-messages"` for a custom API key would
 * route it into the Claude OAuth proxy (owner-scoped OAuth credential
 * resolution), and `"gemini-cca"` into the Antigravity proxy. A custom endpoint
 * needs its own values so those two switches fall through to the generic path.
 */
export type WireFormat =
  | "chat.completions"
  | "responses"
  | "gemini-cca"
  | "anthropic-messages"
  | "cli"
  | "cursor-connect"
  | "devin-connect"
  | "custom-openai-responses"
  | "custom-anthropic-messages"
  | "custom-gemini";

export type Transport = "direct" | "server-proxy";

export interface AgentCallPlan {
  authMethod: AuthMethod;
  transport: Transport;
  upstreamWire: WireFormat;
  /** Upstream URL (or "" for cli) */
  endpoint: string;
  /** Required HTTP headers like "chatgpt-account-id", "OpenAI-Beta", "originator" */
  requiredHeaders: string[];
  /** Pricing/label only — never drives routing/format */
  vendor: string;
}

/** The format the client actually serializes toward its immediate peer. */
export type ClientWire = "chat.completions" | "responses" | "cli";

/**
 * The format the CLIENT must serialize. This is the invariant that prevents the
 * client/proxy format disagreement (plan §4.2, failure mode F1) — derived from
 * the plan, never re-guessed from `provider`/model (that guessing is what the
 * `provider:"chatgpt"` hack abused).
 *
 * Two proxy behaviors exist, so `server-proxy` does NOT uniformly mean
 * chat.completions:
 * - TRANSLATING routes — the Nolo proxy has a dedicated translator that adapts
 *   the body: antigravity (gemini-cca), Codex (responses + oauth:chatgpt),
 *   Claude (anthropic-messages), and Cursor (cursor-connect).
 *   Here the client speaks `chat.completions` and the translator converts.
 *   The `custom-*` wires belong here too: a custom endpoint whose model declares
 *   `Model.nativeProtocol` must be translated (body AND native path) by the
 *   server, so the client keeps speaking `chat.completions` — the
 *   `customProviderUrl` contract shape — toward the proxy.
 * - PASS-THROUGH routes — direct calls AND the generic proxy path, which
 *   forwards the body UNCHANGED to the upstream URL. Here the client must
 *   already speak `upstreamWire` (e.g. platform openai-responses agents send
 *   `input` whether direct or proxied — the proxy just forwards to /v1/responses).
 *
 * This matches today's behavior exactly (equals `isResponseAPIModel` for every
 * agent). Making the generic proxy translate messages→input too (so ALL proxied
 * agents could speak chat.completions) is a separate, optional future step.
 */
export function resolveClientWire(plan: AgentCallPlan): ClientWire {
  if (plan.upstreamWire === "gemini-cca") return "chat.completions";
  if (plan.upstreamWire === "anthropic-messages") return "chat.completions";
  if (plan.upstreamWire === "cursor-connect") return "chat.completions";
  if (plan.upstreamWire === "devin-connect") return "chat.completions";
  // Custom-endpoint native wires: translated by the proxy, never spoken here.
  if (plan.upstreamWire === "custom-gemini") return "chat.completions";
  if (plan.upstreamWire === "custom-openai-responses") return "chat.completions";
  if (plan.upstreamWire === "custom-anthropic-messages") return "chat.completions";
  if (
    plan.upstreamWire === "responses" &&
    plan.authMethod.kind === "oauth" &&
    plan.authMethod.ref === "chatgpt"
  ) {
    return "chat.completions";
  }
  return plan.upstreamWire as ClientWire;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const XAI_CHAT_COMPLETIONS_URL = "https://api.x.ai/v1/chat/completions";
export const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";

/** Headers required by the Codex (ChatGPT) Responses endpoint */
export const CODEX_REQUIRED_HEADERS = [
  "chatgpt-account-id",
  "OpenAI-Beta",
  "originator",
  "version",
];

/**
 * Headers required by the Antigravity Cloud Code Assist endpoint.
 *
 * NOTE: the projectId is embedded in the JSON envelope by
 * `antigravityCloudCodeProvider`, NOT sent as an HTTP header — so we only
 * surface `User-Agent` here. Mirrors current behavior exactly.
 */
export const ANTIGRAVITY_REQUIRED_HEADERS = [
  "User-Agent", // antigravity-specific UA (matches getAntigravityUserAgent)
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type EnvLike = Record<string, string | undefined>;

/** Transport proxy decision — shared pure seam in serverProxyPolicy. */
function agentShouldUseServerProxy(
  agentConfig: AgentRuntimeAgentConfig,
): boolean {
  return shouldUseServerProxy(agentConfig);
}

/** `Model.nativeProtocol` — the catalog's declaration of the wire a model speaks. */
type ModelNativeProtocol = NonNullable<Model["nativeProtocol"]>;

/**
 * Upstream-wire resolution for a custom (`customProviderUrl`) agent.
 *
 * Priority, first match wins:
 * 1. catalog `nativeProtocol` — the most specific judge (it is per *model*, and
 *    the same gateway base serves several wires). One exception:
 *    1a. `openai-responses` while the endpoint already ends in `/responses`:
 *        both judges agree, so keep the pre-existing `"responses"` — the client
 *        speaks Responses and the generic proxy forwards the body unchanged.
 *        (Downgrading that to a "needs server translation" shape would break
 *        configs that work today.)
 * 2. `/responses` endpoint suffix — the pre-existing rule for unannotated
 *    models; it is also the user's explicit endpoint declaration, so a
 *    contradiction (e.g. an `anthropic-messages` model pointed at
 *    `.../responses`) resolves in favour of (1), the catalog being the more
 *    specific statement about what that model needs.
 * 3. `"chat.completions"` — the `customProviderUrl` contract default
 *    (OpenAI-compatible chat/completions endpoint).
 *
 * Every custom-native result is a `custom-*` value, never the OAuth wires: see
 * the `WireFormat` doc — `chatHandler` / `buildChatCallPlan` route on
 * `upstreamWire` alone and would otherwise send a custom API-key agent down the
 * Claude/Antigravity OAuth proxy (`custom-anthropic-messages` vs
 * `anthropic-messages` is exactly that distinction).
 */
function resolveCustomUpstreamWire(
  endpoint: string,
  nativeProtocol: ModelNativeProtocol | undefined,
): WireFormat {
  const responsesEndpoint = endpoint.includes("/responses");
  if (nativeProtocol === "openai-responses" && responsesEndpoint) return "responses";
  if (nativeProtocol === "gemini") return "custom-gemini";
  if (nativeProtocol === "openai-responses") return "custom-openai-responses";
  if (nativeProtocol === "anthropic-messages") return "custom-anthropic-messages";
  return responsesEndpoint ? "responses" : "chat.completions";
}

// ---------------------------------------------------------------------------
// Credential precedence (single source of truth)
// ---------------------------------------------------------------------------

/**
 * Does this record point at its OWN endpoint *and* hold its OWN raw API key?
 *
 * **实际凭证来源优先于引用**: `apiKey` is a credential the record already has,
 * while `apiKeyRef` is only a *reference* to a subscription credential stored
 * elsewhere (Claude Pro/Max, ChatGPT, Antigravity, …). When both are present, a
 * leftover/polluted `apiKeyRef` must not outrank the key the record holds —
 * otherwise the plan reports an OAuth wire, and `chatHandler` /
 * `buildChatCallPlan` route on `upstreamWire` alone, so the request is sent into
 * the provider-specific OAuth proxy (`anthropic-messages` → Claude proxy) and
 * fails with `MISSING_CLAUDE_OAUTH` even though the record can call its own
 * endpoint with its own key.
 *
 * Both halves are required — this is the whole blast-radius guard:
 * - no `customProviderUrl` ⇒ nothing that key could be sent to ⇒ `false`, and
 *   the five OAuth chains keep their exact previous precedence;
 * - no raw `apiKey` ⇒ only the reference is left to go on ⇒ `false`, OAuth path
 *   unchanged.
 *
 * Only the *raw* `apiKey` counts. `apiKeyFromAgentKey` (legacy raw-key field) and
 * `credentialRef` (broker/secret ref, "never a raw API key") are deliberately
 * excluded: the custom-key path resolves its credential from
 * `credentials.apiKey` / the record's `apiKey`, so planning a custom wire for a
 * record whose key lives in a field that path never reads would fail closed
 * where the OAuth path worked before.
 *
 * Callers must feed the record's OWN key into the plan for this to fire (see
 * `chatHandler` / `chatCallPlan`: the record→runtime-config mapping drops
 * `apiKey`, so those sites attach it explicitly).
 *
 * One endpoint is excluded: the Antigravity Cloud Code base URL. That URL is an
 * OAuth-gated wire endpoint (`gemini-cca`), never a custom endpoint — no
 * `custom-*` wire can be served by it, and the only OAuth preset that fills
 * `customProviderUrl` at all is the Antigravity one. So a stray raw `apiKey`
 * left on such a record must not drag it off the Antigravity chain; this keeps
 * that chain intact for the whole `isAntigravityOAuthAgent` family.
 */
export function hasOwnCustomProviderKey(
  agentConfig: Pick<AgentRuntimeAgentConfig, "customProviderUrl" | "apiKey">,
): boolean {
  const endpoint = asOptionalTrimmedString(agentConfig.customProviderUrl);
  if (!endpoint) return false;
  // 同一条 antigravity 链的 host 判定：只看解析后的 hostname（此前是整串 includes，
  // 后缀 host / userinfo 形态会被误判成 Cloud Code 端点）。
  if (isAntigravityCloudCodeBaseUrl(endpoint)) return false;
  return Boolean(asOptionalTrimmedString(agentConfig.apiKey));
}

// ---------------------------------------------------------------------------
// Resolver
// ---------------------------------------------------------------------------

export function resolveAgentCallPlan(
  agentConfig: AgentRuntimeAgentConfig,
  _env?: EnvLike,
): AgentCallPlan {
  const apiKeyRef = asTrimmedLowercaseString(agentConfig.apiKeyRef);
  const provider = asTrimmedLowercaseString(
    agentConfig.provider ?? agentConfig.apiSource,
  );

  // 凭证优先级（单一出处：hasOwnCustomProviderKey）——「实际凭证来源优先于引用」。
  // 记录自带 custom key 时，下面整条「引用型 OAuth 链」整体让位：请求按 custom-*
  // 走它自己的端点。只在两半都成立时生效（无 customProviderUrl、或没有自带 key 的
  // 记录，五条 OAuth 链逐位不变）。
  const ownCustomKeyWins = hasOwnCustomProviderKey(agentConfig);
  // OAuth 链看到的引用：自带 custom key 时置空，等价于「这条链没有引用可依」。
  const oauthApiKeyRef = ownCustomKeyWins ? "" : apiKeyRef;

  // ── Antigravity (Google Cloud Code Assist) ──
  if (!ownCustomKeyWins && isAntigravityOAuthAgent(agentConfig)) {
    return {
      authMethod: { kind: "oauth", ref: "antigravity" },
      transport: "server-proxy",
      upstreamWire: "gemini-cca",
      endpoint: ANTIGRAVITY_CLOUD_CODE_BASE_URL,
      requiredHeaders: [...ANTIGRAVITY_REQUIRED_HEADERS],
      vendor: provider || "google-antigravity",
    };
  }

  // ── ChatGPT Codex (OAuth → Responses API) ──
  if (oauthApiKeyRef === "chatgpt") {
    return {
      authMethod: { kind: "oauth", ref: "chatgpt" },
      transport: "server-proxy",
      upstreamWire: "responses",
      endpoint: CODEX_RESPONSES_URL,
      requiredHeaders: [...CODEX_REQUIRED_HEADERS],
      vendor: provider || "openai",
    };
  }

  // ── Claude Pro/Max (OAuth → Anthropic Messages API) ──
  if (oauthApiKeyRef === "claude") {
    return {
      authMethod: { kind: "oauth", ref: "claude" },
      transport: "server-proxy",
      upstreamWire: "anthropic-messages",
      endpoint: ANTHROPIC_MESSAGES_URL,
      requiredHeaders: ["anthropic-version", "anthropic-beta"],
      vendor: provider || "anthropic",
    };
  }

  // ── xAI SuperGrok (OAuth → chat.completions) ──
  if (oauthApiKeyRef === "xai") {
    return {
      authMethod: { kind: "oauth", ref: "xai" },
      transport: "server-proxy",
      upstreamWire: "chat.completions",
      endpoint: XAI_CHAT_COMPLETIONS_URL,
      requiredHeaders: [],
      vendor: provider || "xai",
    };
  }

  // ── Cursor (OAuth → ConnectRPC over HTTP/2, agent.v1.AgentService/Run) ──
  // Cursor uses a bespoke ConnectRPC + protobuf wire, not OpenAI-compatible
  // chat.completions. The client speaks chat.completions (nolo's internal
  // message shape) and the server chat-proxy / agent-run translator converts
  // to the protobuf AgentRunRequest. Transport is server-proxy so the OAuth
  // token never enters the browser (same as other subscription OAuth refs).
  if (oauthApiKeyRef === "cursor") {
    return {
      authMethod: { kind: "oauth", ref: "cursor" },
      transport: "server-proxy",
      upstreamWire: "cursor-connect",
      endpoint: CURSOR_AGENT_URL,
      requiredHeaders: [
        "x-cursor-client-version",
        "x-cursor-client-type",
        "x-ghost-mode",
      ],
      vendor: provider || "cursor",
    };
  }

  // ── Devin (OAuth → ConnectRPC over HTTP/2, GetChatMessage) ──
  if (oauthApiKeyRef === "devin" || (!ownCustomKeyWins && provider === "devin")) {
    return {
      authMethod: { kind: "oauth", ref: "devin" },
      transport: "server-proxy",
      upstreamWire: "devin-connect",
      endpoint: DEVIN_CONNECT_URL,
      requiredHeaders: ["connect-protocol-version"],
      vendor: provider || "devin",
    };
  }

  // ── CLI provider ──
  if (agentConfig.cliProvider || agentConfig.apiSource === "cli" || provider === "cli") {
    return {
      authMethod: { kind: "cli", provider: agentConfig.cliProvider || provider || "codex" },
      transport: "direct",
      upstreamWire: "cli",
      endpoint: "",
      requiredHeaders: [],
      vendor: provider || "cli",
    };
  }

  // ── Custom provider (customProviderUrl) ──
  if (agentConfig.customProviderUrl || agentConfig.apiSource === "custom") {
    const transport = agentShouldUseServerProxy(agentConfig) ? "server-proxy" : "direct";
    const endpoint = asOptionalTrimmedString(agentConfig.customProviderUrl) ?? "";

    // A custom endpoint serves whichever wire its MODEL speaks: read the
    // catalog's `nativeProtocol` (OpenCode Go's gateway alone mixes
    // openai-responses / anthropic-messages / gemini behind one base URL) and
    // merge it with the /responses URL suffix. See resolveCustomUpstreamWire for
    // the priority; `findModelConfig` is the same lookup the local runtime
    // transports use, so plan and runtime cannot disagree on the wire.
    const upstreamWire = resolveCustomUpstreamWire(
      endpoint,
      findModelConfig(provider, agentConfig.model ?? "")?.nativeProtocol,
    );

    return {
      authMethod: { kind: "custom-key" },
      transport,
      upstreamWire,
      endpoint,
      requiredHeaders: [],
      vendor: provider || "custom",
    };
  }

  // ── Platform provider (default) ──
  const transport = agentShouldUseServerProxy(agentConfig) ? "server-proxy" : "direct";

  // OpenAI reasoning/responses models → responses wire
  const useResponses = isOpenAiResponsesModel({
    provider,
    model: agentConfig.model,
    endpointKey: (agentConfig as any).endpointKey,
  });

  const upstreamWire: WireFormat = useResponses
    ? "responses"
    : "chat.completions";

  // Compute endpoint for platform providers
  const endpoint = upstreamWire === "responses"
    ? resolvePlatformResponsesEndpoint(provider, agentConfig.model) ?? ""
    : resolvePlatformChatCompletionsEndpoint(provider, agentConfig.model) ?? "";

  return {
    authMethod: { kind: "platform-key" },
    transport,
    upstreamWire,
    endpoint,
    requiredHeaders: [],
    vendor: provider || "openai",
  };
}
