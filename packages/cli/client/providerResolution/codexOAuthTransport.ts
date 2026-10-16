/**
 * transport 分支：Codex OAuth —— /backend-api/codex/responses wire
 *
 * 由 localRuntimeAdapter 原先 940 行的 resolveProviderBase 拆出，逻辑逐字保留。
 * 未命中本通道返回 null，交给 resolveLocalProvider 链上的下一条。
 */
import { resolveSessionKey } from "../../../agent-runtime/sessionIdentity";
import type { AgentRuntimeResult } from "../../../agent-runtime";
import { fetchCodexResponsesCompletion, isCodexOAuthAgent } from "../../../agent-runtime/codexResponsesProvider";
import { readOAuthCredential } from "../../../agent-runtime/oauthTokenStore";
import { logLocalRuntimeDiagnostic } from "../localRuntimeDiagnostics";
import { fetchWithTransientRetry } from "../localRuntimeFetchRetry";
import { resolveProviderOpenAiToolBundle } from "../localRuntimeTools";
import type { ProviderResolver } from "./providerResolutionContext";

type CodexComplete = NonNullable<Awaited<ReturnType<ProviderResolver>>>["complete"];
type CodexCallTrace = {
  log: (stage: string, fields: Record<string, unknown>) => void;
  nextAttempt: () => number;
};

// debug-only 观测：start / headers / end 三节点。日志经 logLocalRuntimeDiagnostic 的
// 默认 debug gate，未开启时无输出；所有日志调用 best effort，不影响请求语义。
// 只记录 pid、随机本地 callId、elapsedMs、stage、status、计数，不含正文/header/token。
function withCodexCallTrace(
  fn: (trace: CodexCallTrace, messages: Parameters<CodexComplete>[0], options: Parameters<CodexComplete>[1]) => ReturnType<CodexComplete>,
): CodexComplete {
  return async (messages, options) => {
    const callId = Math.random().toString(36).slice(2, 10);
    const startedAt = Date.now();
    let attempts = 0;
    let outcome = "success";
    const trace: CodexCallTrace = {
      log: (stage, fields) => {
        try {
          logLocalRuntimeDiagnostic(`provider.codex.${stage}`, {
            pid: process.pid,
            callId,
            elapsedMs: Date.now() - startedAt,
            ...fields,
          });
        } catch {
          // best effort：日志失败不改变请求语义
        }
      },
      nextAttempt: () => ++attempts,
    };
    try {
      trace.log("start", { messageCount: messages.length, inputChars: countCodexInputChars(messages) });
    } catch {
      // best effort
    }
    try {
      return await fn(trace, messages, options);
    } catch (error) {
      outcome = options?.signal?.aborted ? "aborted" : "error";
      throw error;
    } finally {
      trace.log("end", { outcome, attempts });
    }
  };
}

function countCodexInputChars(messages: Parameters<CodexComplete>[0]): number {
  return messages.reduce((total, message) => {
    const content = (message as { content?: unknown })?.content;
    return total + (typeof content === "string" ? content.length : JSON.stringify(content ?? "").length);
  }, 0);
}

/**
 * 退避等待，与当前请求的 signal 竞争。
 *
 * 内层 `fetchWithTransientRetry` 的重试退避只是 `await sleep(ms)`，它不监听 signal：
 * 取消一旦落在这次退避上，就要等满整个退避（注入的永不完成 sleep 下则是永久悬挂）。
 * 外层的 `waitBackoff` 拦不住一个尚未返回的内层调用，所以可中断必须在这里成立。
 * 注入的 `deps.sleep` 仍是真实等待时长，只是额外与 signal 竞争；abort 时立即以
 * signal.reason 拒绝，该拒绝会直接抛出内层重试循环，取消后不会再发起下一次 fetch。
 * 默认 `setTimeout` 的句柄由本函数自己持有，结算（abort 或正常完成）时 `clearTimeout`，
 * 否则定时器仍会引用事件循环，把进程拖到退避结束才退出。
 */
function abortableSleep(
  sleepFn: ((ms: number) => Promise<unknown>) | undefined,
  ms: number,
  signal: AbortSignal | undefined,
): Promise<void> {
  // 默认路径自己建定时器，必须留下句柄：abort 只是让这个 promise 立即以 signal.reason
  // 拒绝，未清理的定时器仍引用事件循环，进程会被拖到退避结束才退出（实测 2.267s）。
  // 注入的 `deps.sleep` 由调用方管理自己的资源，这里不代管。
  let timer: ReturnType<typeof setTimeout> | undefined;
  const waitOnce = (): Promise<unknown> =>
    sleepFn
      ? Promise.resolve(sleepFn(ms))
      : new Promise<void>((resolve) => {
          timer = setTimeout(resolve, ms);
        });
  if (!signal) return waitOnce().then(() => undefined);
  if (signal.aborted) {
    return Promise.reject(signal.reason ?? new DOMException("aborted", "AbortError"));
  }
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (settle: () => void) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", onAbort);
      // abort 与正常结算（成功/失败）两条路径都清掉默认定时器。刻意不 unref()：
      // 正常退避仍要让进程等它结束，清理只应发生在结算路径上。
      if (timer !== undefined) clearTimeout(timer);
      settle();
    };
    const onAbort = () =>
      finish(() =>
        reject(signal.reason ?? new DOMException("aborted", "AbortError")),
      );
    signal.addEventListener("abort", onAbort, { once: true });
    waitOnce().then(
      () => finish(resolve),
      (error) => finish(() => reject(error)),
    );
  });
}

export const resolveCodexOAuthTransport: ProviderResolver = async (ctx) => {
  const { agentConfig, deps, fetchImpl, loopbackRequest, additionalToolNames, buildProviderOpenAiTools, recordLocalAvailability, apiKeyRefResolver } = ctx;
  // ChatGPT Codex (subscription OAuth) — Responses API at
  // /backend-api/codex/responses. ChatGPT OAuth tokens cannot call
  // they must go through the Codex backend. Mirrors the server-side
  // loopUpstream.ts Codex branch.
  if (isCodexOAuthAgent(agentConfig)) {
    const accessToken = await apiKeyRefResolver("chatgpt");
    if (!accessToken) {
      throw new Error(
        'OAuth credential for "chatgpt" not found locally. Run `nolo auth chatgpt`.',
      );
    }
    const credential = readOAuthCredential("chatgpt");
    const accountId = credential?.accountId;
    const { requestedToolNames, tools } = resolveProviderOpenAiToolBundle(
      agentConfig,
      deps.env,
      buildProviderOpenAiTools,
      additionalToolNames,
    );
    logLocalRuntimeDiagnostic("provider.selected", {
      agentKey: agentConfig.key,
      transport: "codex-responses",
      provider: "openai",
      model: agentConfig.model ?? "gpt-5.6-sol",
      hasApiKey: true,
    });
    return {
      model: agentConfig.model || "gpt-5.6-sol",
      complete: withCodexCallTrace(async (trace, messages, options) => {
        const observedFetch = async (
          input: Parameters<typeof fetchImpl>[0],
          requestInit?: Parameters<typeof fetchImpl>[1],
        ) => {
          const attempt = trace.nextAttempt();
          const res = await fetchImpl(input, requestInit);
          trace.log("headers", { attempt, status: res.status });
          return res;
        };
        const result = await fetchCodexResponsesCompletion({
          agentConfig,
          accessToken,
          ...(accountId ? { accountId } : {}),
          openAiBody: {
            model: agentConfig.model || "gpt-5.6-sol",
            messages,
            stream: false,
            ...(tools.length > 0 ? { tools } : {}),
          },
          sessionKey: resolveSessionKey({ dialogId: options?.dialogId }),
          signal: options?.signal,
          ...(options?.onTextDelta ? { onTextDelta: options.onTextDelta } : {}),
          ...(options?.onReasoningDelta ? { onReasoningDelta: options.onReasoningDelta } : {}),
          fetchImpl: ((url: string | URL | Request, init?: RequestInit) =>
            fetchWithTransientRetry(observedFetch as typeof fetchImpl, url, init, {
              // 内层退避也要能被本次请求的 signal 打断（见 abortableSleep 注释）。
              sleep: (ms) =>
                abortableSleep(deps.sleep, ms, init?.signal ?? options?.signal),
              loopbackRequest,
            })) as unknown as typeof fetch,
        });
        await recordLocalAvailability(result.status, result.body);
        if (result.status < 200 || result.status >= 300) {
          const errorObj = result.body?.error as Record<string, unknown> | undefined;
          const errMsg =
            typeof errorObj?.message === "string"
              ? errorObj.message
              : JSON.stringify(result.body);
          throw new Error(
            `local Codex OAuth provider failed: HTTP ${result.status} ${errMsg}`,
          );
        }
        const choice = Array.isArray(result.body.choices)
          ? result.body.choices[0]
          : undefined;
        const message = (choice?.message ?? {}) as {
          content?: unknown;
          tool_calls?: unknown;
          reasoning_content?: unknown;
        };
        const content = typeof message.content === "string" ? message.content : "";
        const reasoning_content =
          typeof message.reasoning_content === "string"
            ? message.reasoning_content
            : undefined;
        const tool_calls = Array.isArray(message.tool_calls)
          ? message.tool_calls
          : undefined;
        logLocalRuntimeDiagnostic("provider.request.result", {
          agentKey: agentConfig.key,
          transport: "codex-responses",
          ok: true,
          contentChars: content.length,
          toolCallCount: tool_calls?.length ?? 0,
          requestedToolNames,
        });
        return {
          content,
          model: agentConfig.model || "gpt-5.6-sol",
          provider: "openai",
          ...(tool_calls ? { tool_calls } : {}),
          ...(reasoning_content ? { reasoning_content } : {}),
          // fetchCodexResponsesCompletion 已把 codex responses 流聚合完毕并归一化成
          // OpenAI chat.completions 形状：choices[0].finish_reason（"stop"/"tool_calls"）
          // + usage（prompt/completion/total_tokens）。必须透传，否则 localLoop 把正常走完
          // 的空轮误判成 stream_truncated、TUI context chip 也拿不到 token 数更新。
          finish_reason: typeof choice?.finish_reason === "string" ? choice.finish_reason : undefined,
          stream_complete: true,
          // body 类型是 Record<string, unknown>，透传 usage 需 cast 到 AgentRuntimeResult.usage。
          usage: result.body?.usage as Record<string, any> | undefined,
          trace: messages,
        };
      }),
    };
  }
  return null;
};
