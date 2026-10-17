/**
 * TUI summary LLM caller — builds a function that calls the Nolo platform
 * chat proxy to generate dialog compression summaries.
 *
 * Mirrors the pattern from `generateLocalDialogTitle` (dialogTitleLlm.ts):
 * resolve platform chat provider config → build request → fetch → parse.
 * Uses BUILTIN_SUMMARY_LLM_CONFIG (mimo-v2.6-flash); when that call fails
 * (network / non-2xx / empty result) it retries once with the deepseek-flash
 * fallback (Responses wire — handled by buildPlatformChatCompletionRequest and
 * the server chat proxy).
 *
 * Returns null on any failure (no auth, network error, parse error) so
 * `compactDialog` can degrade to fork-only behavior.
 */

import {
  resolvePlatformChatProviderConfig,
  buildPlatformChatCompletionRequest,
  parsePlatformChatCompletionResponse,
  canUsePlatformChatProvider,
} from "../../agent-runtime/platformChatProvider";
import { COMPACTION_SUMMARY_SYSTEM_PROMPT } from "../../ai/context/compactionShared";
import {
  BUILTIN_DIALOG_LLM_FALLBACK_MODEL,
  BUILTIN_SUMMARY_LLM_CONFIG,
} from "../../chat/dialog/actions/builtinDialogLlm";
import type { AgentRuntimeChatMessage, EnvLike } from "../../agent-runtime/types";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/**
 * Create a summary LLM caller for TUI /compact.
 *
 * Production: uses global fetch + env-based provider config resolution.
 * Tests: inject fetchImpl and mock dependencies.
 */
export function createTuiSummaryLlmCaller(
  env: EnvLike,
  options?: {
    fetchImpl?: FetchLike;
    apiKeyRefResolver?: any;
    credentialBroker?: any;
    timeoutMs?: number;
    /** Test/host seam: overrides platform provider config resolution. */
    resolveProviderConfig?: typeof resolvePlatformChatProviderConfig;
  }
): (content: string) => Promise<string | null> {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const timeoutMs = options?.timeoutMs ?? 30_000;
  const resolveProviderConfig =
    options?.resolveProviderConfig ?? resolvePlatformChatProviderConfig;

  return async (content: string): Promise<string | null> => {
    if (!canUsePlatformChatProvider(env)) {
      return null;
    }

    // 单次摘要请求；任何失败点（解析 provider / 网络 / 非 2xx / 空结果）返回 null。
    const attempt = async (model?: string): Promise<string | null> => {
      try {
        const providerConfig = await resolveProviderConfig({
          agentConfig: {
            ...BUILTIN_SUMMARY_LLM_CONFIG,
            ...(model ? { model } : {}),
            key: BUILTIN_SUMMARY_LLM_CONFIG.id,
          },
          env,
          apiKeyRefResolver: options?.apiKeyRefResolver,
          credentialBroker: options?.credentialBroker,
        });

        if (!providerConfig?.authToken) {
          return null;
        }

        const messages: AgentRuntimeChatMessage[] = [
          { role: "system", content: COMPACTION_SUMMARY_SYSTEM_PROMPT },
          { role: "user", content },
        ];

        const request = buildPlatformChatCompletionRequest({
          providerConfig,
          messages,
          stream: false,
        });

        let parsedBody: any = {};
        if (typeof request.init?.body === "string") {
          parsedBody = safeParseJson(request.init.body) ?? {};
        } else if (typeof request.init?.body === "object" && request.init?.body !== null) {
          parsedBody = request.init.body;
        }
        const patchedBody = {
          ...parsedBody,
          reasoning_effort: "low",
        };

        const response = await fetchImpl(request.url, {
          ...request.init,
          body: JSON.stringify(patchedBody),
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (!response.ok) {
          return null;
        }

        const raw = await response.text().catch(() => "");
        const data = safeParseJson(raw);
        if (!data) return null;

        const parsed = parsePlatformChatCompletionResponse({
          providerConfig,
          data,
          trace: [],
        });

        return parsed?.content?.trim() || null;
      } catch {
        return null;
      }
    };

    const primary = await attempt();
    if (primary) return primary;

    // 主模型（mimo-v2.6-flash）失败 → 换 deepseek-flash 重试一次。请求经
    // buildPlatformChatCompletionRequest 构建、由 server 代理处理 wire 差异，
    // 这里只需要换 model（provider 解析会给出 Responses endpoint）。
    return await attempt(BUILTIN_DIALOG_LLM_FALLBACK_MODEL);
  };
}

function safeParseJson(raw: string): any | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
