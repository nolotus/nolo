import type { AgentRuntimeToolCall } from "./types";
import { isMeaningfulResponsesOutput } from "ai/token/providerCallTiming";
import {
  applyResponsesToolEvent,
  createResponsesToolAccumulator,
  finalizeResponsesToolCalls,
} from "./responsesToolCallAccumulator";
import {
  extractReasoningFromResponseOutput,
  extractTextFromResponseOutput,
  extractToolCallsFromResponseOutput,
} from "../integrations/openai/responsesHelpers";
import { parseSseDataLineObject } from "./sseDataLine";
import { readSseFrames } from "./sseFrames";

export type ResponsesStreamFailure = {
  code?: string;
  type?: string;
  message: string;
};

export type CodexStreamFailure = ResponsesStreamFailure;

export function toResponsesStreamFailure(
  raw: unknown,
  fallbackPrefix: string = "Responses",
): ResponsesStreamFailure | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const err = raw as Record<string, unknown>;
  const reason = typeof err.reason === "string" ? err.reason : undefined;
  const message =
    typeof err.message === "string" && err.message
      ? err.message
      : reason
        ? `${fallbackPrefix} upstream ended incomplete: ${reason}.`
        : "";
  if (!message) return undefined;
  const code = typeof err.code === "string" ? err.code : reason;
  return {
    ...(code ? { code } : {}),
    ...(typeof err.type === "string" ? { type: err.type } : {}),
    message,
  };
}

export function responsesStreamFailureStatus(failure: ResponsesStreamFailure): number {
  const marker = `${failure.code ?? ""} ${failure.type ?? ""}`.toLowerCase();
  if (marker.includes("overload") || marker.includes("service_unavailable")) return 503;
  if (marker.includes("rate_limit") || marker.includes("usage_limit")) return 429;
  return 502;
}

export const codexStreamFailureStatus = responsesStreamFailureStatus;

export type ResponsesStreamAggregation = {
  content: string;
  reasoning_content?: string;
  tool_calls?: AgentRuntimeToolCall[];
  usage?: Record<string, unknown>;
  finish_reason?: string;
  stream_complete?: boolean;
  /**
   * 上游连接干净结束但**没有任何终局事件**（既无 response.completed，也无
   * response.incomplete / response.failed / error）。与 platformChatProvider 的
   * `streamTruncated` 同义：未知截断，绝不当成功。
   */
  stream_truncated?: boolean;
  /**
   * 权威 response envelope（`response.completed` 的原文，含 output / usage / id /
   * status）。非流式 loop 直接把它当原生 Responses 结果消费（见
   * `aggregateResponsesForNonStream`），无需再重建 output 项。
   */
  completed_response?: Record<string, unknown>;
  /** 权威 response id（`completed_response.id` 的便捷投影）。 */
  response_id?: string;
  failure?: ResponsesStreamFailure;
};

/**
 * response.completed.usage 是否真的带有 token 计数。上游给空/畸形 usage 时
 * 不得凭空补 0：那会把一次调用落成 0 计费（“没有 usage”必须是未知，不是 0）。
 */
/** message item 的 output_text 拼接（与 server loop 的同名语义一致）。 */
function extractOutputTextFromItem(item: Record<string, unknown>): string {
  const parts = item.content;
  if (!Array.isArray(parts)) return "";
  return parts
    .filter(
      (part) =>
        !!part &&
        typeof part === "object" &&
        (part as Record<string, unknown>).type === "output_text" &&
        typeof (part as Record<string, unknown>).text === "string",
    )
    .map((part) => String((part as Record<string, unknown>).text))
    .join("");
}

function hasNumericTokenCount(u: Record<string, unknown>): boolean {
  return (
    ["input_tokens", "output_tokens", "prompt_tokens", "completion_tokens", "total_tokens"].some(
      (key) => typeof u[key] === "number" && Number.isFinite(u[key] as number),
    )
  );
}

export function createResponsesStreamCollector(callbacks?: {
  onTextDelta?: (chunk: string) => void;
  onReasoningDelta?: (chunk: string) => void;
  /** Observed-speed timing：首个有效 delta 到达时触发一次（见 ai/token/providerCallTiming）。 */
  onMeaningfulDelta?: () => void;
  /**
   * 每个已解析事件的旁路观察回调（解析仍由本收集器独占）。供需要 wire 原生
   * usage/审计字段累计语义的消费方（server agentRun loop）复用既有语义，而不必
   * 再写第二套 SSE 解析器。
   */
  onEvent?: (event: Record<string, unknown>) => void;
  fallbackPrefix?: string;
  /**
   * 显式终局策略：`true` 时 legacy `[DONE]` 哨兵不再算成功终局，必须收到真实的
   * `response.completed`（且其 response.status 与 completed 一致）才算成功；否则按
   * 显式失败收尾（经既有 finalize → throw 路径，未知 usage 保持未知）。
   * 只给平台托管 CF GPT（原生 Responses 线）开启，默认 false 保留其它 provider 的
   * legacy `[DONE]` 兼容。
   */
  requireResponseCompleted?: boolean;
  /**
   * 显式终局策略：`true` 时 `response.completed.output` 的工具集合与参数即最终真值
   * ——累积状态里的旧参数、或只存在于累积状态的「幽灵工具」一律不采用；completed
   * 参数畸形 / 缺工具名则显式失败，绝不回落旧参数、绝不臆造工具名。
   * 只给平台托管 CF GPT 开启，默认 false 保留累积优先的保守合并语义。
   */
  authoritativeCompletedTools?: boolean;
}) {
  let content = "";
  let reasoning = "";
  const toolCallsAcc = createResponsesToolAccumulator();
  let usage: Record<string, unknown> | undefined;
  let failure: ResponsesStreamFailure | undefined;
  let completedResponse: Record<string, unknown> | undefined;
  // 显式终局策略（见 options 注释）；只给 CF GPT 原生 Responses 线开启。
  const requireResponseCompleted = callbacks?.requireResponseCompleted === true;
  const authoritativeCompletedTools = callbacks?.authoritativeCompletedTools === true;
  const failurePrefix = callbacks?.fallbackPrefix ?? "Responses";
  // 终局信号判定：只有上游明确给出终局事件才允许宣告 stream_complete。
  // clean EOF（连接结束却没有任何终局事件）既不是成功也不是已知失败 —— 必须留空，
  // 否则被截断的流会被计费/落库当成完整回答（2026-10-13 CF GPT 截断事故）。
  let sawTerminalSuccess = false;
  let sawTerminalEvent = false;
  // 首个有效 delta 只记一次（见 ai/token/providerCallTiming）。
  let sawMeaningfulDelta = false;
  const observeMeaningfulOnce = () => {
    if (sawMeaningfulDelta) return;
    sawMeaningfulDelta = true;
    callbacks?.onMeaningfulDelta?.();
  };

  const processEvent = (ev: Record<string, unknown>) => {
    callbacks?.onEvent?.(ev);
    // 共享 first-output 判据（ai/token/providerCallTiming）：与 server 代理
    // （chatProxyBilling 的原始帧路径）和 loop.ts 用同一 Responses 语义；
    // 首写胜出去重交给 observeMeaningfulOnce。
    if (isMeaningfulResponsesOutput(ev)) observeMeaningfulOnce();
    const type = String(ev.type ?? "");
    if (type === "error") {
      sawTerminalEvent = true;
      // 显式 error 事件按显式失败分类：即使上游没给可解析的细节也不放行，
      // 宁可报错，也不让失败/截断的回答混进成功路径。
      failure =
        failure ??
        toResponsesStreamFailure(ev.error, callbacks?.fallbackPrefix) ?? {
          code: "response_error",
          message: `${callbacks?.fallbackPrefix ?? "Responses"} upstream emitted an error event.`,
        };
      return;
    }
    if (type === "response.failed" || type === "response.incomplete") {
      sawTerminalEvent = true;
      const response = ev.response as Record<string, unknown> | undefined;
      failure =
        failure ??
        toResponsesStreamFailure(response?.error, callbacks?.fallbackPrefix) ??
        toResponsesStreamFailure(response?.incomplete_details, callbacks?.fallbackPrefix) ?? {
          code: type === "response.incomplete" ? "response_incomplete" : "response_failed",
          message: `${callbacks?.fallbackPrefix ?? "Responses"} upstream ended with ${type}.`,
        };
      // 终局失败/incomplete 时上游仍可能带部分 usage：原样带出，供调用方的
      // 既有「估计失败」对账路径使用；未知保持未知，绝不补 0。
      {
        const u = response?.usage as Record<string, unknown> | undefined;
        if (u && hasNumericTokenCount(u)) {
          const prompt = typeof u.input_tokens === "number" ? u.input_tokens : (typeof u.prompt_tokens === "number" ? u.prompt_tokens : 0);
          const completion = typeof u.output_tokens === "number" ? u.output_tokens : (typeof u.completion_tokens === "number" ? u.completion_tokens : 0);
          usage = {
            prompt_tokens: prompt,
            completion_tokens: completion,
            total_tokens:
              typeof u.total_tokens === "number" ? u.total_tokens : prompt + completion,
            ...(u.input_tokens_details && typeof u.input_tokens_details === "object"
              ? { input_tokens_details: u.input_tokens_details }
              : {}),
            ...(u.output_tokens_details && typeof u.output_tokens_details === "object"
              ? { output_tokens_details: u.output_tokens_details }
              : {}),
          };
        }
      }
      return;
    }
    if (type === "response.output_text.delta" && typeof ev.delta === "string") {
      content += ev.delta;
      callbacks?.onTextDelta?.(ev.delta);
      return;
    }
    if (
      (type === "response.reasoning_text.delta" || type === "response.reasoning.delta") &&
      typeof ev.delta === "string"
    ) {
      reasoning += ev.delta;
      callbacks?.onReasoningDelta?.(ev.delta);
      return;
    }
    if (type === "response.output_item.added" || type === "response.output_item.done") {
      // 与 server loop 的既有语义一致：message item 自带的 output_text 只在还没有
      // 任何 text delta 时作为正文（首写胜出），并经 onTextDelta 转发给客户端——
      // 否则「只发 output_item.done、不发 delta」的供应商会丢正文。
      const item = ev.item as Record<string, unknown> | undefined;
      if (item?.type === "message" && !content) {
        const itemText = extractOutputTextFromItem(item);
        if (itemText) {
          content = itemText;
          callbacks?.onTextDelta?.(itemText);
        }
      }
      applyResponsesToolEvent(toolCallsAcc, ev);
      return;
    }
    if (
      type === "response.function_call_arguments.delta" ||
      type === "response.function_call_arguments.done"
    ) {
      applyResponsesToolEvent(toolCallsAcc, ev);
      return;
    }
    if (type === "response.completed") {
      sawTerminalEvent = true;
      const response = ev.response as Record<string, unknown> | undefined;
      // 显式终局策略下终局 envelope 的 status 必须与 completed 一致；矛盾
      // （failed / incomplete / cancelled / 其它）按显式失败收尾，绝不把该
      // envelope 的正文与工具当成功消费。
      const envelopeStatus =
        response && typeof response.status === "string" ? response.status : undefined;
      if (
        requireResponseCompleted &&
        envelopeStatus !== undefined &&
        envelopeStatus !== "completed"
      ) {
        failure = failure ?? {
          code: "response_not_completed",
          message: `${failurePrefix} emitted response.completed with status "${envelopeStatus}".`,
        };
        return;
      }
      sawTerminalSuccess = true;
      if (response) {
        completedResponse = response;
        const u = response.usage as Record<string, unknown> | undefined;
        // 空/畸形 usage 不补 0：未知就是未知（补 0 会把失败调用落成 0 计费）。
        if (u && hasNumericTokenCount(u)) {
          const prompt = typeof u.input_tokens === "number" ? u.input_tokens : (typeof u.prompt_tokens === "number" ? u.prompt_tokens : 0);
          const completion = typeof u.output_tokens === "number" ? u.output_tokens : (typeof u.completion_tokens === "number" ? u.completion_tokens : 0);
          const total =
            typeof u.total_tokens === "number" ? u.total_tokens : prompt + completion;
          // 细分字段必须原样带出：Responses wire 的缓存命中只在
          // input_tokens_details.cached_tokens 里，重建成三个标量会把它丢掉，
          // 于是 token 记录里 cache_read_input_tokens 恒为 0 —— 缓存率不可观测，
          // 且 calculatePrice 把已缓存的 prompt 按全价计。
          const inputDetails = u.input_tokens_details;
          const outputDetails = u.output_tokens_details;
          usage = {
            prompt_tokens: prompt,
            completion_tokens: completion,
            total_tokens: total,
            ...(inputDetails && typeof inputDetails === "object"
              ? { input_tokens_details: inputDetails }
              : {}),
            ...(outputDetails && typeof outputDetails === "object"
              ? { output_tokens_details: outputDetails }
              : {}),
          };
        }
      }
    }
  };

  const finalize = (): ResponsesStreamAggregation => {
    let finalToolCalls = finalizeResponsesToolCalls(toolCallsAcc);
    if (completedResponse) {
      const completedToolCalls = extractToolCallsFromResponseOutput(completedResponse) as AgentRuntimeToolCall[];
      if (authoritativeCompletedTools) {
        // 权威策略（CF GPT）：completed envelope 的工具集合与参数即最终真值。
        // - 只存在于累积状态、或被终局移除的「幽灵工具」一律丢弃（零执行）；
        // - 两个都可解析的 JSON 参数冲突时以 completed 为准（final wins）；
        // - completed 参数畸形 / 缺工具名一律显式失败：绝不回落累积旧参数、
        //   绝不臆造工具名（经既有 finalize → throw 路径收尾）。
        for (const call of completedToolCalls) {
          const name = call.function?.name;
          if (typeof name !== "string" || !name.trim()) {
            failure =
              failure ??
              {
                code: "tool_name_missing",
                message: `${failurePrefix} response.completed contained a tool call without a name.`,
              };
            break;
          }
          const args = call.function?.arguments;
          if (typeof args === "string" && args.trim()) {
            try {
              JSON.parse(args);
            } catch {
              failure =
                failure ??
                {
                  code: "tool_arguments_malformed",
                  message: `${failurePrefix} response.completed contained malformed tool arguments for "${name}".`,
                };
              break;
            }
          }
        }
        finalToolCalls = completedToolCalls;
      } else {
        const completedById = new Map(completedToolCalls.map((call) => [call.id, call]));
        finalToolCalls = finalToolCalls.map((call) => {
          const completed = completedById.get(call.id);
          if (!completed) return call;
          let accumulatedParses = false;
          let completedParses = false;
          try {
            JSON.parse(call.function.arguments);
            accumulatedParses = true;
          } catch {
            // The completed response may contain the authoritative full value.
          }
          try {
            JSON.parse(completed.function.arguments);
            completedParses = true;
          } catch {
            return call;
          }
          if (
            completedParses &&
            (!accumulatedParses || completed.function.arguments.startsWith(call.function.arguments))
          ) {
            return { ...call, function: { ...call.function, arguments: completed.function.arguments } };
          }
          return call;
        });
        if (finalToolCalls.length === 0) finalToolCalls = completedToolCalls;
      }
    }
    if (authoritativeCompletedTools && failure) {
      // 权威策略下失败即零工具：即便调用方忽略 failure，也不执行任何工具。
      finalToolCalls = [];
    }
    if (!content && completedResponse) {
      content = extractTextFromResponseOutput(completedResponse);
    }
    if (!reasoning && completedResponse) {
      reasoning = extractReasoningFromResponseOutput(completedResponse);
    }

    // 终局判据（唯一真值见 processEvent）：只有 response.completed（或 legacy
    // `[DONE]` 哨兵）才算成功收尾；显式 incomplete/failed/error 走 failure，由
    // 调用方按既有错误/估计失败路径处理；两者都没有的 clean EOF 既不标 complete，
    // 也不给 finish_reason（避免截断流被当 "stop" 继续或计费）。
    const streamComplete = sawTerminalSuccess;
    const streamTruncated = !sawTerminalEvent;
    return {
      content,
      ...(reasoning ? { reasoning_content: reasoning } : {}),
      ...(finalToolCalls.length > 0 ? { tool_calls: finalToolCalls } : {}),
      ...(usage ? { usage } : {}),
      ...(streamComplete
        ? { finish_reason: finalToolCalls.length > 0 ? "tool_calls" : "stop" }
        : {}),
      ...(streamComplete ? { stream_complete: true } : {}),
      ...(streamTruncated ? { stream_truncated: true } : {}),
      ...(completedResponse ? { completed_response: completedResponse } : {}),
      ...(completedResponse && typeof completedResponse.id === "string"
        ? { response_id: completedResponse.id }
        : {}),
      ...(failure ? { failure } : {}),
    };
  };

  return {
    processEvent,
    finalize,
    /**
     * legacy 非标准 provider 可能沿用 chat wire 的 `[DONE]` 收尾哨兵。
     * 原生 Responses（含 CF）的权威终局仍是 response.completed —— 认这个哨兵
     * 不为 CF 开豁免：CF 被截断时既没有 completed 也没有 [DONE]。
     */
    markLegacyDone: () => {
      sawTerminalEvent = true;
      if (requireResponseCompleted) {
        // 原生 Responses 线（CF GPT）：`[DONE]` 不是成功终局。此前没有真实的
        // response.completed 就显式判失败，经既有 finalize → throw 路径收尾，
        // 绝不让只有 [DONE] 的截断流被当成功消费/计费。
        if (!sawTerminalSuccess) {
          failure = failure ?? {
            code: "response_completed_missing",
            message: `${failurePrefix} upstream ended with a legacy [DONE] sentinel without response.completed.`,
          };
        }
        return;
      }
      sawTerminalSuccess = true;
    },
  };
}

export function aggregateResponsesStream(
  events: Record<string, unknown>[],
  options?: { fallbackPrefix?: string; onMeaningfulDelta?: () => void },
) {
  const collector = createResponsesStreamCollector({
    fallbackPrefix: options?.fallbackPrefix ?? "Codex",
    ...(options?.onMeaningfulDelta ? { onMeaningfulDelta: options.onMeaningfulDelta } : {}),
  });
  for (const ev of events) {
    collector.processEvent(ev);
  }
  const finalized = collector.finalize();
  return {
    text: finalized.content,
    toolCalls: finalized.tool_calls ?? [],
    usage: finalized.usage,
    failure: finalized.failure,
  };
}

export async function readResponsesSseCompletion(args: {
  response: Response;
  onTextDelta?: (chunk: string) => void;
  onReasoningDelta?: (chunk: string) => void;
  /** Observed-speed timing：首个有效 delta 到达时触发一次。 */
  onMeaningfulDelta?: () => void;
  /** 每个已解析事件的旁路观察（解析仍由收集器独占）。 */
  onEvent?: (event: Record<string, unknown>) => void;
  fallbackPrefix?: string;
  /** 显式终局策略，见 createResponsesStreamCollector 的 requireResponseCompleted。 */
  requireResponseCompleted?: boolean;
  /** 显式终局策略，见 createResponsesStreamCollector 的 authoritativeCompletedTools。 */
  authoritativeCompletedTools?: boolean;
}): Promise<ResponsesStreamAggregation> {
  const collector = createResponsesStreamCollector({
    onTextDelta: args.onTextDelta,
    onReasoningDelta: args.onReasoningDelta,
    ...(args.onMeaningfulDelta ? { onMeaningfulDelta: args.onMeaningfulDelta } : {}),
    ...(args.onEvent ? { onEvent: args.onEvent } : {}),
    fallbackPrefix: args.fallbackPrefix ?? "Responses",
    ...(args.requireResponseCompleted === true ? { requireResponseCompleted: true } : {}),
    ...(args.authoritativeCompletedTools === true ? { authoritativeCompletedTools: true } : {}),
  });

  for await (const frame of readSseFrames(args.response)) {
    for (const line of frame.split("\n")) {
      // legacy 非标准 provider 的 `[DONE]` 收尾哨兵（原生 Responses 不发它）。
      const trimmedLine = line.trim();
      if (trimmedLine === "[DONE]" || trimmedLine === "data: [DONE]") {
        collector.markLegacyDone();
        continue;
      }
      const parsed = parseSseDataLineObject(line);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        collector.processEvent(parsed as Record<string, unknown>);
      }
    }
  }

  const result = collector.finalize();
  if (result.failure) {
    const status = responsesStreamFailureStatus(result.failure);
    const err = new Error(result.failure.message) as any;
    err.status = status;
    err.code = result.failure.code;
    err.type = result.failure.type;
    // 已知 usage 随失败一起带出（供既有估计失败路径使用）；未知就保持未知，
    // 绝不补 0。
    if (result.usage) err.usage = result.usage;
    throw err;
  }

  return result;
}
