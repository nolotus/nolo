import { createTuiSummaryLlmCaller } from "./tuiSummaryLlmCaller";
import { createSummaryBudget, classifySummaryError, runSummaryWithContract } from "../../ai/context/summaryRouting";
import { PLATFORM_HOSTED_DEEPSEEK_FLASH_MODEL } from "../../ai/llm/platformHostedRoutingTable";
import { COMPACTION_SUMMARY_SYSTEM_PROMPT } from "../../ai/context/compactionShared";
import type { AgentRuntimeHostAdapter } from "../../agent-runtime/hostAdapter";
import type { LocalCompactionSummaryFallbackOptions } from "../../agent-runtime/localAutoCompaction";
import type { EnvLike } from "./localRuntimeHelpers";

/** One manual invocation owns one 120s budget, including authenticated eligibility. */
export function createManualCompactionSummaryCaller(args: {
  env: EnvLike;
  fetchImpl?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  agentRef?: string;
  loadAdapter: () => Promise<Pick<AgentRuntimeHostAdapter, "loadAgentConfig" | "resolveProvider">>;
}) {
  const platform = createTuiSummaryLlmCaller(args.env, { fetchImpl: args.fetchImpl, platformPrimary: true });
  return async (content: string, options?: LocalCompactionSummaryFallbackOptions): Promise<string | null> => {
    const budget = createSummaryBudget({ mode: "manual", signal: options?.signal, deadlineMs: options?.deadlineMs });
    let model: string | undefined;
    let providerName: string | undefined;
    const startedAt = Date.now();
    let outcome = "error";
    try {
      const callOptions = { ...options, signal: budget.signal, deadlineMs: budget.deadlineMs };
      const eligible = await budget.run(() => platform.preferPlatform(callOptions));
      const result = await runSummaryWithContract({ budget,
        eligibility: { userId: "authenticated-account", authenticated: eligible, platformAvailable: eligible, credits: eligible ? 1 : undefined },
        platform: { model: PLATFORM_HOSTED_DEEPSEEK_FLASH_MODEL, provider: "nolo", attemptId: options?.attemptId,
          run: () => platform.complete(content, callOptions) },
        current: { attemptId: options?.attemptId, run: async ({ signal, deadlineMs }) => {
          if (!args.agentRef) throw { code: "SUMMARY_CURRENT_UNAVAILABLE", stage: "resolve" };
          const adapter = await args.loadAdapter();
          const agent = await adapter.loadAgentConfig(args.agentRef);
          if (!agent) throw { code: "SUMMARY_CURRENT_UNAVAILABLE", stage: "resolve" };
          model = agent.model;
          providerName = agent.provider ?? undefined;
          const provider = await adapter.resolveProvider(agent, { textOnly: true });
          if (!provider.textOnly) throw { code: "SUMMARY_TEXT_ONLY_UNAVAILABLE", stage: "resolve", model };
          if (signal.aborted) throw signal.reason;
          try {
            const value = await provider.complete([
              { role: "system", content: COMPACTION_SUMMARY_SYSTEM_PROMPT }, { role: "user", content },
            ], { signal, timeoutMs: Math.max(1, deadlineMs - Date.now()), max_tokens: options?.maxOutputTokens ?? 8192, reasoning_effort: "low" });
            model = value.model ?? model;
            providerName = value.provider ?? providerName;
            return { text: value.content ?? "", finishReason: value.finish_reason };
          } catch (error) {
            const safe = classifySummaryError(error, { model, provider: providerName });
            throw Object.assign(new Error(safe.message), safe, { type: safe.errorType,
              name: safe.category === "cancelled" ? "AbortError" : safe.category === "timeout" ? "TimeoutError" : "SummaryError" });
          }
        } },
      });
      outcome = result.kind;
      if (result.route === "platform") { model = PLATFORM_HOSTED_DEEPSEEK_FLASH_MODEL; providerName = "nolo"; }
      if (result.kind === "success") return result.text;
      if (result.kind === "empty") return null;
      if (result.kind === "truncated") throw { code: "SUMMARY_TRUNCATED", stage: "decode" };
      throw Object.assign(new Error(result.error.message), result.error, { type: result.error.errorType,
        name: result.kind === "cancelled" ? "AbortError" : result.error.category === "timeout" ? "TimeoutError" : "SummaryError" });
    } finally {
      const safe = classifySummaryError({}, { model, provider: providerName, attemptId: options?.attemptId });
      console.log("[manual-compaction-timing]", JSON.stringify({ model: safe.model ?? null, provider: safe.provider ?? null,
        attemptId: safe.attemptId ?? null, elapsedMs: Date.now() - startedAt, outcome }));
      budget.dispose();
    }
  };
}
