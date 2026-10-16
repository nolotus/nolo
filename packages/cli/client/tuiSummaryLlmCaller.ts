/** Fail-open platform summary caller. Both existing models share one deadline. */
import { randomUUID } from "node:crypto";
import {
  resolvePlatformChatProviderConfig,
  buildPlatformChatCompletionRequest,
  parsePlatformChatCompletionResponse,
  canUsePlatformChatProvider,
} from "../../agent-runtime/platformChatProvider";
import type { LocalCompactionSummaryFallbackOptions } from "../../agent-runtime/localAutoCompaction";
import { COMPACTION_SUMMARY_SYSTEM_PROMPT } from "../../ai/context/compactionShared";
import {
  BUILTIN_DIALOG_LLM_FALLBACK_MODEL,
  BUILTIN_SUMMARY_LLM_CONFIG,
} from "../../chat/dialog/actions/builtinDialogLlm";
import type { AgentRuntimeChatMessage, EnvLike } from "../../agent-runtime/types";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

// Room for factual handoff, exact commands/paths and file operations; not a
// target length. Request-local only: ordinary chat defaults remain untouched.
export const TUI_SUMMARY_MAX_OUTPUT_TOKENS = 8192;

export function createTuiSummaryLlmCaller(
  env: EnvLike,
  options?: {
    fetchImpl?: FetchLike;
    apiKeyRefResolver?: any;
    credentialBroker?: any;
    timeoutMs?: number;
    resolveProviderConfig?: typeof resolvePlatformChatProviderConfig;
  },
): (content: string, callOptions?: LocalCompactionSummaryFallbackOptions) => Promise<string | null> {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const configuredTimeout = options?.timeoutMs;
  const timeoutMs = typeof configuredTimeout === "number" && Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? Math.min(configuredTimeout, 30_000) : 30_000;
  const resolveProviderConfig = options?.resolveProviderConfig ?? resolvePlatformChatProviderConfig;

  return async (content, callOptions) => {
    if (!canUsePlatformChatProvider(env) || callOptions?.signal?.aborted) return null;
    const deadlineMs = Math.min(Date.now() + timeoutMs, callOptions?.deadlineMs ?? Infinity);
    const remainingMs = deadlineMs - Date.now();
    if (!(remainingMs > 0)) return null;
    const controller = new AbortController();
    const parentSignal = callOptions?.signal;
    const onAbort = () => controller.abort(parentSignal?.reason);
    parentSignal?.addEventListener("abort", onAbort, { once: true });
    if (parentSignal?.aborted) onAbort();
    const timer = setTimeout(() => controller.abort(new DOMException("Summary deadline exceeded", "TimeoutError")), remainingMs);
    const signal = controller.signal;
    const attemptId = callOptions?.attemptId ?? randomUUID();
    // Race resolution, HTTP AND body parsing: a slow resolver or a noncooperative
    // fetch must not extend the shared deadline. The same signal reaches HTTP.
    const stopped = new Promise<null>((resolve) => {
      if (signal.aborted) resolve(null);
      else signal.addEventListener("abort", () => resolve(null), { once: true });
    });
    const attempt = async (model: string): Promise<string | null> => {
      let stage = "resolve";
      const work = async (): Promise<string | null> => {
        try {
          const providerConfig = await resolveProviderConfig({
            agentConfig: { ...BUILTIN_SUMMARY_LLM_CONFIG, model, key: BUILTIN_SUMMARY_LLM_CONFIG.id },
            env,
            apiKeyRefResolver: options?.apiKeyRefResolver,
            credentialBroker: options?.credentialBroker,
          });
          if (signal.aborted) return null;
          if (!providerConfig?.authToken) { stage = "auth"; return null; }
          stage = "build";
          const messages: AgentRuntimeChatMessage[] = [
            { role: "system", content: COMPACTION_SUMMARY_SYSTEM_PROMPT },
            { role: "user", content },
          ];
          const request = buildPlatformChatCompletionRequest({
            providerConfig: {
              ...providerConfig,
              requestOptions: { ...providerConfig.requestOptions, max_tokens: TUI_SUMMARY_MAX_OUTPUT_TOKENS, reasoning_effort: "low" },
            },
            messages,
            stream: false,
            requestId: attemptId,
          });
          stage = "http";
          if (signal.aborted) return null;
          const response = await fetchImpl(request.url, { ...request.init, signal });
          if (signal.aborted || !response.ok) return null;
          stage = "body";
          const data = JSON.parse(await response.text());
          if (signal.aborted) return null;
          stage = "parse";
          // A capped/incomplete summary must not become authoritative history.
          if (data?.choices?.[0]?.finish_reason === "length" || data?.status === "incomplete" || data?.incomplete_details) {
            stage = "truncated";
            return null;
          }
          const parsed = parsePlatformChatCompletionResponse({ providerConfig, data, trace: [] });
          const summary = parsed?.content?.trim() || null;
          stage = summary ? "done" : "empty";
          return summary;
        } catch {
          return null;
        }
      };
      const result = await Promise.race([work(), stopped]);
      if (!result) console.warn("[tuiSummary] summary attempt failed", {
        attemptId, model, stage: parentSignal?.aborted ? "cancelled" : signal.aborted ? "deadline" : stage,
      });
      return result;
    };
    try {
      const primary = await attempt(BUILTIN_SUMMARY_LLM_CONFIG.model);
      if (primary || signal.aborted || Date.now() >= deadlineMs) return primary;
      return await attempt(BUILTIN_DIALOG_LLM_FALLBACK_MODEL);
    } finally {
      clearTimeout(timer);
      parentSignal?.removeEventListener("abort", onAbort);
    }
  };
}
