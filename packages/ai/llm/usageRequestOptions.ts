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
  // OpenAI-compatible /v1/chat/completions endpoint; the hosted branch passes
  // "upstream-k3" as the usage provider so K3 streams request the terminal usage
  // chunk (same capability decision as deepinfra/vultr).
  "upstream-k3",
  // RunInfra hosted fallback channel: OpenAI-compatible chat.completions
  // endpoint, supports stream_options.include_usage (measured to return
  // prompt_tokens_details.cached_tokens).
  "runinfra",
]);

const EXTRA_USAGE_FIELD_PROVIDERS = new Set(["openrouter"]);

const normalizeProviderName = (providerName?: string | null) =>
  asTrimmedLowercaseString(providerName);

export const getUsageRequestOptions = (
  providerName?: string | null,
  options?: { api?: UsageRequestApi }
): UsageRequestOptions => {
  const normalizedProvider = normalizeProviderName(providerName);
  const api = options?.api ?? "chat-completions";

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
    ...(STREAM_USAGE_PROVIDERS.has(normalizedProvider)
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
