import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";

export interface UsageRequestOptions {
  stream_options?: {
    include_usage: true;
  };
  usage?: {
    include: true;
  };
}

export type UsageRequestApi = "chat-completions" | "responses";

const STREAM_USAGE_PROVIDERS = new Set([
  "google",
  "openrouter",
  "xai",
  "openai",
  "fireworks",
  "mistral",
  "cloudflare",
  "gmi",
  // OpenAI-compatible hosted providers expose the terminal usage chunk when
  // requested, including DeepInfra and Vultr. Keep this capability decision
  // in the shared seam so proxy and local runtimes cannot drift.
  "deepinfra",
  "vultr",
  // Explicit local-runtime providers with OpenAI-compatible streaming: both
  // DeepSeek official and Ollama honor stream_options.include_usage on their
  // chat.completions endpoints. Without them, locally-configured agents lose
  // token statistics / local billing (the whitelist replaced the previous
  // always-on include_usage). ollama-cloud is the Ollama Cloud subscription
  // endpoint (https://ollama.com/v1), an OpenAI-compatible API that likewise
  // honors stream_options.include_usage.
  "deepseek",
  "ollama",
  "ollama-cloud",
  // endpoint; the hosted branch passes "upstream-k3" as the usage provider so these
  // streams request the terminal usage chunk (same capability decision as
  // deepinfra/vultr).
  "upstream-k3",
  // RunInfra hosted fallback channel: OpenAI-compatible chat.completions
  // endpoint, supports stream_options.include_usage (measured to return
  // prompt_tokens_details.cached_tokens).
  "runinfra",
  "baseten",
  // Kimi For Coding subscription (api.kimi.com/coding/v1): OpenAI-compatible
  // chat.completions streaming that only emits the terminal usage frame when
  // stream_options.include_usage is requested (measured; the official
  // kimi-code CLI also sends include_usage). Custom agents pointing at the
  // same endpoint are covered by the endpoint check below, not here.
  "kimi-code",
]);

// Kimi Code endpoint marker for user-configured custom providers. Duplicated
// from agent-runtime/kimiUserAgent.ts isKimiEndpoint on purpose: ai/llm must
// not depend on agent-runtime, and both copies guard the same wire behavior —
// update them together.
const KIMI_CODE_ENDPOINT_MARKER = "api.kimi.com";

const isKimiCodeEndpoint = (endpoint?: string | null): boolean =>
  typeof endpoint === "string" && endpoint.includes(KIMI_CODE_ENDPOINT_MARKER);

const EXTRA_USAGE_FIELD_PROVIDERS = new Set(["openrouter"]);

const normalizeProviderName = (providerName?: string | null) =>
  asTrimmedLowercaseString(providerName);

export const getUsageRequestOptions = (
  providerName?: string | null,
  options?: { api?: UsageRequestApi; endpoint?: string | null }
): UsageRequestOptions => {
  const normalizedProvider = normalizeProviderName(providerName);
  const api = options?.api ?? "chat-completions";

  // custom 是用户手配的任意 OpenAI 兼容网关，不能整体进白名单（严格网关不认
  // stream_options 会 400）；但指向 Kimi For Coding 端点的 custom agent 已实测
  // 支持 include_usage，按 endpoint 精准放行，否则订阅流式永远没有 usage 帧
  //（TUI context 面板不动 + 计费只剩字符估算）。
  const shouldRequestStreamUsage =
    STREAM_USAGE_PROVIDERS.has(normalizedProvider) ||
    (normalizedProvider === "custom" && isKimiCodeEndpoint(options?.endpoint));

  if (api === "responses") {
    return EXTRA_USAGE_FIELD_PROVIDERS.has(normalizedProvider)
      ? {
          usage: {
            include: true as const,
          },
        }
      : {};
  }

  return {
    ...(shouldRequestStreamUsage
      ? {
          stream_options: {
            include_usage: true as const,
          },
        }
      : {}),
    ...(EXTRA_USAGE_FIELD_PROVIDERS.has(normalizedProvider)
      ? {
          usage: {
            include: true as const,
          },
        }
      : {}),
  };
};
