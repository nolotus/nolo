/**
 * 纯函数适配器：OpenAI/DeepSeek **Responses 线的非流式 JSON** → chat.completions JSON。
 *
 * 为什么需要：平台托管 DeepSeek（flash/pro）的上游是官方 Responses 端点
 * 时上游返回原生 Responses JSON（`object:"response"` + `output:[...]`），而客户端 agent
 * 循环（ai/agent/runAgentClientLoop）与其它 chat.completions 消费者只认
 * `data.choices[0].message` —— 拿到 Responses 形状就当成「模型返回了空响应」。
 * 服务端在非流式分支用本函数把它归一成 chat 形状，客户端与计费链无需感知上游 wire。
 * （方向由请求体 wire 决定：客户端声明 chat wire 才转换，Responses wire 原样透传，见文件末段。）
 *
 * 语义真值：**文本 / reasoning / tool_calls 的解析全部复用 `./responsesHelpers` 里既有的
 * Responses 解析器**（`extractTextFromResponseOutput` /
 * `extractReasoningFromResponseOutput` / `extractToolCallsFromResponseOutput`），本文件
 * 不另立第二套规则。随之而来的既有语义：
 * - 正文：`output[].type === "message"` 的 `output_text` 部件按顺序拼接（无文本即空串）；
 * - reasoning：既有规则只读 `content`（字符串，或字符串 / `{text}` 组成的部件数组），
 *   **不读 `summary`** —— 与 responsesSseStream / openAiCompatibleProvider 同源；
 * - tool_calls：`function_call` 项必须同时有 `call_id` 与 `name`，缺一即跳过；`arguments`
 *   非字符串时按既有约定 `JSON.stringify(arguments ?? {})`（缺省 `"{}"`）。item 自带的
 *   `id` 是输出项 id，不是客户端回传工具结果用的 `call_id`，不得拿来顶替，也不臆造兜底 id；
 * - 有 tool_calls → `finish_reason:"tool_calls"`，否则 `"stop"`。
 *
 * usage：**保留上游 usage 的全部原始字段**（顶层 `prompt_cache_hit_tokens` /
 * `prompt_cache_miss_tokens` / `prompt_tokens_details`、Responses 的 `input_tokens_details`
 * …… 都是 `ai/token/cacheTokenFields` 的计费读数，见该文件 :66-86），只为 chat.completions
 * 别名 `prompt_tokens` / `completion_tokens` / `total_tokens` 补**有效数字**：
 * - 别名已有**有限 number**（含 0）→ 一律保留，绝不覆盖；
 * - 别名缺失、或其值不是有限 number（`null` / `"31"` / `NaN` …无效读数）→ 用同一条 usage
 *   里的同义字段（`input_tokens` / `output_tokens` / `prompt+completion` 之和）的有限值替换；
 *   没有可用的同义值时，原样保留那个无效值（不编造、也不清空）。
 * usage 不是对象时整体不带 usage（不编造 0 值）。
 *
 * 拒绝（返回 `null`，一律交调用方既有语义处理，绝不包装成 `finish_reason:"stop"` 宣告成功）：
 * - 非对象 / 缺 `output` 数组；
 * - 已是 chat 形状（含 `choices`，包括 `choices` + `output` 并存的混合形状）；
 * - 顶层 `error` 错误帧；
 * - `status` 存在且规范化后不是 `completed`（见 isExplicitNonCompletedStatus）。
 *
 * 本函数是**纯形状适配**，不判断「客户端声明的是哪条 wire」：是否调用它由服务端按请求体
 * wire 决定（chat 形状请求才转换，Responses 形状请求原样透传，见
 * packages/server/handlers/chatHandler.ts 的非流式分支）。
 */
import { isRecord } from "core/isRecord";

import {
  type AssistantToolCall,
  extractReasoningFromResponseOutput,
  extractTextFromResponseOutput,
  extractToolCallsFromResponseOutput,
} from "./responsesHelpers";

export type ResponsesChatUsage = Record<string, unknown>;

export type ResponsesChatCompletionJson = {
  object: "chat.completion";
  choices: Array<{
    index: number;
    finish_reason: "stop" | "tool_calls";
    message: {
      role: "assistant";
      content: string;
      reasoning_content?: string;
      tool_calls?: AssistantToolCall[];
    };
  }>;
  usage?: ResponsesChatUsage;
};

/** 已经是 chat.completions 形状（客户端可直接消费的 `choices`）。 */
export const isChatCompletionsShapedJson = (value: unknown): boolean =>
  isRecord(value) && Array.isArray(value.choices);

/**
 * 上游**显式**声明的状态是否不是「完整产出」。
 *
 * 终局语义：`status` 存在（字符串）时，规范化（trim + 小写）后**只接受 `completed`**；
 * 其它任何显式状态（`failed` / `incomplete` / `cancelled` / `in_progress` / 未知）都返回
 * `true`（拒绝转换），绝不把未完成响应包装成成功 choices，更不把可执行工具调用暴露给客户端。
 * 与 responsesSseStream 的严格终局策略同源，见
 * packages/agent-runtime/responsesSseStream.ts:245-260（那里同样对 `!== "completed"` 的
 * envelope status 显式失败收尾，注释里列出 failed / incomplete / cancelled / 其它）。
 *
 * 边界：`status` 非字符串（缺省 / `null` / 数字）按「上游没声明终局」处理 → 兼容（可转换）；
 * 空串 / 全空白字符串是**显式声明**，规范化后不等于 `completed` → 拒绝（与上述严格策略一致）。
 */
const isExplicitNonCompletedStatus = (status: unknown): boolean =>
  typeof status === "string" && status.trim().toLowerCase() !== "completed";

const asTokenCount = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

/**
 * usage 投影：原样保留上游 usage 的全部字段，只为 chat.completions 别名补**有效数字**。
 * 见文件头「usage」段：已有有限 number（含 0）一律保留；缺失或不是有限 number 的值
 * （`null` / `"31"` / `NaN` …）用同义字段的有限值替换，没有同义值时原样保留。
 * 传入非对象 → 返回 null（调用方整体不落 usage）。
 */
const projectChatUsage = (raw: unknown): ResponsesChatUsage | null => {
  if (!isRecord(raw)) return null;

  const usage: ResponsesChatUsage = { ...raw };

  // 别名只在「缺失或不是有限 number」时补：有效读数（含 0）绝不覆盖；无效读数
  // （null / 字符串 / NaN）换成同一条 usage 里同义的有限值。
  //
  // 边界如实说明（勿夸大本函数的作用范围）：
  // - 本函数**只修 chat 别名**（prompt_tokens / completion_tokens / total_tokens），
  //   **不改写原始 Responses 字段**（input_tokens / output_tokens / input_tokens_details
  //   ……一并原样保留）；
  // - 下游 normalizeUsage 的 input/output 是按字段**存在性**择一读取：
  //   `input_tokens` 存在则取 `usage.input_tokens ?? 0`，否则退回 `prompt_tokens`
  //   （见 packages/ai/token/normalizeUsage.ts:56-68），**没有有限数字校验**；
  // - 因此原始 Responses 字段里残留的无效读数（非数字值，如字符串 "31"）仍可能被下游
  //   原样读走 —— 该风险未消除，只是不再由本函数引入。
  if (asTokenCount(usage.prompt_tokens) === undefined) {
    const inputTokens = asTokenCount(raw.input_tokens);
    if (inputTokens !== undefined) usage.prompt_tokens = inputTokens;
  }
  if (asTokenCount(usage.completion_tokens) === undefined) {
    const outputTokens = asTokenCount(raw.output_tokens);
    if (outputTokens !== undefined) usage.completion_tokens = outputTokens;
  }
  // total 缺失或无效（如 `total_tokens:null`）时用已就位的 prompt + completion 补算
  // （与 normalizeUsage 的 total 兜底同源：`finite(total_tokens) ?? input+output`）；
  // 两个可加数本身无效则不补、原样保留 —— 不编造总数。
  if (asTokenCount(usage.total_tokens) === undefined) {
    const prompt = asTokenCount(usage.prompt_tokens);
    const completion = asTokenCount(usage.completion_tokens);
    if (prompt !== undefined && completion !== undefined) {
      usage.total_tokens = prompt + completion;
    }
  }

  return usage;
};

export const responsesJsonToChatCompletions = (
  parsed: unknown,
): ResponsesChatCompletionJson | null => {
  if (!isRecord(parsed)) return null;
  // 已经是 chat 形状（含 choices+output 混合形状）：本函数无可为，避免覆盖合法回包。
  if (isChatCompletionsShapedJson(parsed)) return null;
  // 顶层错误帧不是完成结果，绝不包装成成功。
  if (parsed.error !== undefined && parsed.error !== null) return null;
  // 上游显式声明的非 completed 终局（failed / incomplete / cancelled / in_progress / 未知）：
  // 不产出「成功」的 chat 形状，交调用方既有终局语义处理。
  if (isExplicitNonCompletedStatus(parsed.status)) return null;
  if (!Array.isArray(parsed.output)) return null;

  const content = extractTextFromResponseOutput(parsed);
  const reasoningContent = extractReasoningFromResponseOutput(parsed);
  const toolCalls = extractToolCallsFromResponseOutput(parsed);
  const usage = projectChatUsage(parsed.usage);

  return {
    object: "chat.completion",
    choices: [
      {
        index: 0,
        finish_reason: toolCalls.length > 0 ? "tool_calls" : "stop",
        message: {
          role: "assistant",
          content,
          ...(reasoningContent ? { reasoning_content: reasoningContent } : {}),
          ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
        },
      },
    ],
    ...(usage ? { usage } : {}),
  };
};
