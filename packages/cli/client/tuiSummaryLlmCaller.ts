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
    const attempt = async (model: string, remainingModels: number): Promise<string | null> => {
      const remaining = deadlineMs - Date.now();
      if (signal.aborted || !(remaining > 0)) return null;
      const attemptController = new AbortController();
      const attemptSignal = attemptController.signal;
      const budgetMs = remaining / remainingModels;
      const attemptDeadlineMs = Date.now() + budgetMs;
      const onStop = () => attemptController.abort(signal.reason);
      signal.addEventListener("abort", onStop, { once: true });
      if (signal.aborted) onStop();
      const attemptTimer = setTimeout(() => attemptController.abort(
        new DOMException("Summary attempt budget exceeded", "TimeoutError"),
      ), budgetMs);
      // Race resolution, HTTP and body parsing even if they ignore abort.
      let onAttemptAbort: () => void = () => {};
      const stopped = new Promise<null>((resolve) => {
        onAttemptAbort = () => resolve(null);
        if (attemptSignal.aborted) resolve(null);
        else attemptSignal.addEventListener("abort", onAttemptAbort, { once: true });
      });
      const isStopped = () => attemptSignal.aborted || Date.now() >= attemptDeadlineMs;
      let stage = "resolve";
      const work = async (): Promise<string | null> => {
        try {
          const providerConfig = await resolveProviderConfig({
            agentConfig: { ...BUILTIN_SUMMARY_LLM_CONFIG, model, key: BUILTIN_SUMMARY_LLM_CONFIG.id },
            env,
            apiKeyRefResolver: options?.apiKeyRefResolver,
            credentialBroker: options?.credentialBroker,
          });
          if (isStopped()) return null;
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
          if (isStopped()) return null;
          const response = await fetchImpl(request.url, { ...request.init, signal: attemptSignal });
          if (isStopped() || !response.ok) return null;
          stage = "body";
          const data = JSON.parse(await response.text());
          if (isStopped()) return null;
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
      try {
        const result = await Promise.race([work(), stopped]);
        if (!result) console.warn("[tuiSummary] summary attempt failed", {
          attemptId, model,
          stage: parentSignal?.aborted ? "cancelled"
            : signal.aborted || Date.now() >= deadlineMs ? "deadline"
            : isStopped() ? "attempt-budget" : stage,
        });
        return result;
      } finally {
        clearTimeout(attemptTimer);
        signal.removeEventListener("abort", onStop);
        attemptSignal.removeEventListener("abort", onAttemptAbort);
      }
    };
    try {
      const primary = await attempt(BUILTIN_SUMMARY_LLM_CONFIG.model, 2);
      if (primary || signal.aborted || parentSignal?.aborted || Date.now() >= deadlineMs) return primary;
      return await attempt(BUILTIN_DIALOG_LLM_FALLBACK_MODEL, 1);
    } finally {
      clearTimeout(timer);
      parentSignal?.removeEventListener("abort", onAbort);
    }
  };
}
