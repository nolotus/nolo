// packages/ai/agent/dispatchIntent.ts
//
// 派发意图检测（纯逻辑，零 I/O）：toolGuidedSections 的完整多 Agent 编排协议
// 只在任务表现出派发意图时注入；无派发意图的任务只注入最小必需块（如何调
// startAgentRun + 平台积分授权门 + review 硬门常在，见 toolGuidedSections）。
//
// 检测信号分两类，命中任一即判 true：
// - 关键词：消息历史里**任意一条** user 消息命中派发关键词；
// - 行为：消息历史里已出现过 startAgentRun / controlAgentRun 的 tool_calls。
//
// 语义是**单调锁定（monotonic latching）**：历史里一旦命中，此后每一轮都保持
// true，禁止回退。原因（前缀缓存 + 协议一致性）：派发意图驱动 session-scope
// 的 agentCollaboration 段，逐轮翻转会让 stablePrefixContent 逐字节变化，
// 击穿 Claude ephemeral / OpenAI / DeepSeek / Gemini 前缀缓存，且会话后半程
// 丢失发散/会商、预算纪律等高阶指导。
//
// 误判方向不对称：
// - 误报（无派发意图却注入完整协议）：只是 prompt 变长，无行为风险；
// - 漏报（有派发意图却用了最小协议）：安全硬门（平台积分授权、review 硬门）
//   与派发机制说明在最小块里常在，startAgentRun 工具描述也自带派发纪律摘要，
//   因此漏报的代价是可接受的能力降级而非安全风险。

const DISPATCH_INTENT_PATTERN =
  /(派发|派单|派个|派一|派两|派几|派人|子任务|子\s*[aA]gent|多\s*[aA]gent|多个\s*[aA]gent|并行处理|并行派发|并发派发|并行执行|并发执行|分头|分工|同时处理|后台跑|后台执行|编排|会商|发散|代码审查|独立\s*review|派.{0,4}review|dispatch|delegat|sub[\s-]?agent|sub[\s-]?task|fan[\s-]?out|orchestrat|\bbatch\b|in parallel|concurrent|paralleliz|background run|review.{0,20}(diff|code|代码))/i;

// 一旦历史里出现过这些派发/控制工具的调用，后续所有轮次都保持派发协议。
const DISPATCH_TOOL_NAMES = new Set(["startAgentRun", "controlAgentRun"]);

/**
 * 从当前用户输入文本判断是否表现出多 Agent 派发/编排意图。
 * 空文本/非字符串一律 false（走最小协议）。
 */
export function detectDispatchIntent(text: string | null | undefined): boolean {
  if (typeof text !== "string" || !text.trim()) return false;
  return DISPATCH_INTENT_PATTERN.test(text);
}

type DispatchIntentMessage = {
  role?: unknown;
  content?: unknown;
  /** OpenAI / AgentRuntime assistant 工具调用（{ function: { name } } 形态）。 */
  tool_calls?: unknown;
  /** InternalMessage 形态的 camelCase 别名。 */
  toolCalls?: unknown;
  /** tool 结果行对某个 tool_call 的回指（检测不读，仅放行该字段）。 */
  tool_call_id?: unknown;
  /** tool 消息 / run 记录上可能带的扁平工具名字段。 */
  toolName?: unknown;
  name?: unknown;
};

function messageText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
      .join("\n");
  }
  return "";
}

function toolCallName(call: any): string {
  // 兼容 OpenAI/AgentRuntime 的 { function: { name } } 与扁平 { name } 形态。
  const nested = call?.function?.name;
  if (typeof nested === "string" && nested) return nested;
  const flat = call?.name;
  if (typeof flat === "string" && flat) return flat;
  return "";
}

function hasDispatchToolCall(msg: DispatchIntentMessage): boolean {
  const calls = Array.isArray(msg.tool_calls)
    ? msg.tool_calls
    : Array.isArray(msg.toolCalls)
      ? msg.toolCalls
      : [];
  if (calls.some((call: any) => DISPATCH_TOOL_NAMES.has(toolCallName(call)))) {
    return true;
  }
  // tool 行 / run 记录上的扁平工具名兜底（防御性：不同宿主序列化形态不一）。
  for (const field of [msg.toolName, msg.name]) {
    if (typeof field === "string" && DISPATCH_TOOL_NAMES.has(field)) return true;
  }
  return false;
}

/**
 * 单调锁定判定：扫描**整条**消息历史，任一 user 消息命中派发关键词，或历史
 * 里已出现 startAgentRun / controlAgentRun 的 tool_calls，即返回 true 且此后
 * 不再回退。全新会话首轮无信号返回 false（不误锁）。
 *
 * 结构化参数（不依赖 app/types），content 支持 string 或 parts 数组；
 * tool_calls 兼容 snake_case / camelCase 与嵌套 / 扁平 name 形态。
 */
export function detectDispatchIntentFromMessages(
  messages: ReadonlyArray<DispatchIntentMessage> | null | undefined
): boolean {
  if (!Array.isArray(messages)) return false;
  for (const msg of messages) {
    if (!msg) continue;
    if (msg.role === "user" && detectDispatchIntent(messageText(msg.content))) {
      return true;
    }
    if (hasDispatchToolCall(msg)) return true;
  }
  return false;
}
