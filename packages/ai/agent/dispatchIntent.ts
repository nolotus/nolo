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
// 收窄说明（B1）：命中即锁定到会话结束，完整协议比最小版多约 5.5k token/轮。
// 本仓库本身在开发编排系统，日常对话常出现歧义词，误报会把 +5.5k 锁到会话
// 结束，故已从正则移除：编排、发散、分工、同时处理、代码审查、后台跑、后台执行、
// batch、concurrent、review…diff/code。漏报代价低：最小协议保留全部安全门，
// 且一旦出现 startAgentRun/controlAgentRun 调用即行为锁定。
//
// B1 修正（2026-10-14 移植复审 WARNING 1）：上述移除造成新增漏报——「多位助手 +
// 分工 / 同时处理 / 并行 / 分别 / 审查」这类明确要求多执行者的表达不再锁完整协议。
// 现以 MULTI_EXECUTOR_PATTERN + COLLAB_ACTION_PATTERN 的**组合**补回（见下），
// 不恢复裸宽泛词，因此不会把已消除的误报放回来。
//
// 误判方向不对称：
// - 误报（无派发意图却注入完整协议）：只是 prompt 变长，无行为风险；
// - 漏报（有派发意图却用了最小协议）：安全硬门（平台积分授权、review 硬门）
//   与派发机制说明在最小块里常在，startAgentRun 工具描述也自带派发纪律摘要，
//   因此漏报的代价是可接受的能力降级而非安全风险。

const DISPATCH_INTENT_PATTERN =
  /(派发|派单|派个|派一|派两|派几|派人|子任务|子\s*[aA]gent|多\s*[aA]gent|多个\s*[aA]gent|并行处理|并行派发|并发派发|并行执行|并发执行|分头|会商|独立\s*review|派.{0,4}review|dispatch|delegat|sub[\s-]?agent|sub[\s-]?task|fan[\s-]?out|orchestrat|in parallel|paralleliz|background run)/i;

// 收窄（B1）后的**新增漏报**修复：只认显式派发词会漏掉「多执行者 + 分工/并行/
// 审查」这类同样明确要求编排的表达（2026-10-14 移植复审 WARNING 1）。
// 这里不恢复裸「分工」「同时处理」「代码审查」等宽泛词，而是要求**同一段文本内
// 同时出现**多执行者数量短语（两位助手 / 几个 agent / these tasks …）与协作动作词
// （分工 / 同时处理 / 并行 / 分别 / 审查 / concurrently …）；任一侧缺失都不命中，
// 因此日常歧义词不会重新变成误报。
//
// 复审 v2 WARNING（2026-10-14）：数量短语曾用 [0-9]+，于是 0/1 也被当成「多执行者」
// （「让1位助手审查这段代码」误判 true）。现在数字限定 **≥2**（[2-9] | [1-9][0-9]+），
// 并加数字边界 (?<![0-9])，避免从 12/20 这类多位数内部截取出 "2位/0位" 之类的子串。
const MULTI_EXECUTOR_PATTERN =
  /(?:(?:两|二|三|四|五|六|七|八|九|十|几|多|数|若干|(?<![0-9])(?:[2-9]|[1-9][0-9]+))\s*(?:个|位|名)\s*(?:助手|agent|assistant|worker|reviewer|专家|子\s*agent)|(?:two|three|four|five|six|several|multiple|these|those|the following|(?<![0-9])(?:[2-9]|[1-9][0-9]+))\s+(?:agents?|assistants?|helpers?|reviewers?|workers?|tasks?|sub-?agents?|sub-?tasks?))/i;

const COLLAB_ACTION_PATTERN =
  /(?:分工|同时处理|同时做|同时推进|同时进行|并行|并发|分别|各自|协作|协同|代码审查|审查|review|concurrently|simultaneously|separately|respectively|in parallel)/i;

// 一旦历史里出现过这些派发/控制工具的调用，后续所有轮次都保持派发协议。
const DISPATCH_TOOL_NAMES = new Set(["startAgentRun", "controlAgentRun"]);

/**
 * 宿主内部提醒（**不是用户输入**）的**精确前缀**清单。
 *
 * 这些提醒由 loop 自己以 `role: "user"` 追加进 transcript，只为走 append-only
 * 注入路径（否则 stablePrefix 分叉会击穿 provider 前缀缓存），因此读取历史时
 * 必须与真正的用户消息区分开。
 *
 * 为什么是**精确前缀**而不是宽泛的 `[系统提示`：真实的用户输入完全可能以
 * `[系统提示词] 请并行派发两个子任务` 这类字样开头，宽泛前缀会把用户的真实
 * 派发意图当成宿主提醒吞掉（漏报 → 该锁 full 协议却不锁）。这里只认宿主
 * 实际产出的那几条固定文案，其余任何文本一律按用户输入处理。
 */
export const ROUND_BUDGET_WARNING_PREFIX =
  "[系统提示] 当前单次任务的连续工具调用已达";

/**
 * 高档主模型自包提醒（agent-runtime/localLoop 的 Tier-Aware Offload Nudge）的
 * **唯一前缀常量**。loop 追加时用它起始正文，这里据此在历史扫描中忽略该条消息。
 *
 * 为什么必须有：提醒正文会提到 `startAgentRun` 与派发相关词，一旦被当成用户
 * 派发意图，下一轮 `detectDispatchIntentFromMessages` 会把 session 从 min 协议
 * 锁成 full 协议，stablePrefix 逐字节变化 → 击穿所有 provider 的前缀缓存。
 */
export const OFFLOAD_NUDGE_PREFIX = "[系统提示·分工护栏]";

/**
 * 子任务软预算提醒（agent-runtime/subtaskBudget）的两条固定前缀。正文含
 * 「子任务」这个派发关键词，不排除就会在子任务会话里误锁 full 协议；生产端
 * 直接引用本清单，避免两处文案漂移。
 */
export const SUBTASK_SOFT_BUDGET_NOTICE_PREFIXES = [
  "[系统提示 · 子任务软预算提醒]",
  "[系统提示 · 子任务强收敛提醒]",
] as const;

/** 所有已知宿主内部提醒的精确前缀（顺序无关）。 */
export const INTERNAL_NOTICE_PREFIXES: readonly string[] = [
  ROUND_BUDGET_WARNING_PREFIX,
  OFFLOAD_NUDGE_PREFIX,
  ...SUBTASK_SOFT_BUDGET_NOTICE_PREFIXES,
];

/** 该文本是否是宿主内部提醒（而非用户输入）——只认精确前缀，不做宽泛匹配。 */
export function isInternalNoticeText(text: string | null | undefined): boolean {
  if (typeof text !== "string") return false;
  const trimmed = text.trimStart();
  return INTERNAL_NOTICE_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
}

/** 是否是自包提醒（前缀严格匹配 OFFLOAD_NUDGE_PREFIX）。 */
export function isOffloadNudgeText(text: string | null | undefined): boolean {
  if (typeof text !== "string") return false;
  return text.trimStart().startsWith(OFFLOAD_NUDGE_PREFIX);
}

/**
 * 从**当前用户输入文本**判断是否表现出多 Agent 派发/编排意图。
 * 空文本/非字符串一律 false（走最小协议）。
 *
 * 契约：本入口只看文本本身，**不做任何前缀过滤**——真实用户完全可能写出
 * `[系统提示词] 请并行派发两个子任务` 这类输入，按前缀吞掉就是漏报。
 * 「这条消息是不是宿主注入的提醒」属于消息来源信息，只有
 * `detectDispatchIntentFromMessages`（能看到 role / internalNotice / 精确前缀）
 * 才有权判定。
 */
export function detectDispatchIntent(text: string | null | undefined): boolean {
  if (typeof text !== "string" || !text.trim()) return false;

  // 只屏蔽独立分句中的明确禁派指令，不解释任意否定句或删掉整个分句。
  // 起止边界避免把「不是不要派发」「不要派发是不对的」当成禁派；
  // 保留其它分句，让先否定后肯定及原多执行者组合仍可触发。
  const intentText = text.replace(
    /(^|[，,。.!！?？;；：:\n])\s*(?:请\s*)?(?:不要|别|禁止|无需|不需要)\s*(?:(?:并行|并发)?派发|派单|派给\s*(?:助手|agent))(?=\s*(?:[，,。.!！?？;；：:\n]|$))/gi,
    "$1"
  );
  if (DISPATCH_INTENT_PATTERN.test(intentText)) return true;
  // 新增兜底只认分句起始的明确指令，不从转述或否定句内部截取「派给」。
  // 仅放行常见的显式时序前缀，不推断任意自然语言修饰关系。
  if (/(^|[，,。.!！?？;；：:\n])\s*(?:(?:现在|改完后)\s*)?(?:请\s*)?派给\s*(?:助手|agent\b)/i.test(intentText)) return true;
  // 上下文约束组合：多执行者数量短语 **且** 协作动作词，二者缺一不命中。
  return MULTI_EXECUTOR_PATTERN.test(intentText) && COLLAB_ACTION_PATTERN.test(intentText);
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
  /**
   * 宿主内部提醒标记：loop 自己注入的提醒可带该标记，读取历史时按宿主提醒
   * 处理（与用户消息区分）。与精确前缀判定等价，二者命中任一即视为内部提醒。
   */
  internalNotice?: unknown;
};

/**
 * 该消息是否是宿主注入的内部提醒。判据只有两条，都带来源信息，不看「像不像」：
 * ① 显式内部标记 `internalNotice === true`；
 * ② 正文精确命中已知宿主提醒前缀（见 INTERNAL_NOTICE_PREFIXES）。
 */
function isInternalNoticeMessage(msg: DispatchIntentMessage): boolean {
  if (msg.internalNotice === true) return true;
  return isInternalNoticeText(messageText(msg.content));
}

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
    const text = messageText(msg.content);
    // 内部提醒以 user role 落进 transcript 只为 append-only 注入（轮次预算预警、
    // 自包提醒、子任务软预算提醒）；它们不是用户输入，绝不作为派发意图信号：
    // 否则一次提醒会把 session 单调锁成 full 协议，stablePrefix 变化击穿前缀缓存。
    // 判据带来源信息（显式标记 / 精确前缀），不用宽泛 "[系统提示" 吞掉真实输入。
    if (!isInternalNoticeMessage(msg)) {
      if (msg.role === "user" && detectDispatchIntent(text)) return true;
    }
    if (hasDispatchToolCall(msg)) return true;
  }
  return false;
}
