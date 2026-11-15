/**
 * 对话压缩的共享逻辑：web 端 `updateDialogSummaryAction` 和 local 端
 * `localAutoCompaction` 共用同一套摘要 prompt、消息格式化和文件操作提取。
 *
 * 之前两套实现各自维护一份 prompt（web 两段式、local 三段式），导致同一对话
 * 在 web 和 CLI 摘要格式不一致。现在统一到三段式（含文件操作清单），并提取
 * 共享函数避免漂移。
 *
 * --- 添加新的压缩路径 ---
 *
 * 如果要加第四套压缩实现（如 mobile），按以下步骤：
 * 1. 决策：调 `planCompression(input)` 获取 CompressionPlan
 * 2. 格式化：调 `formatMessagesForSummaryWithTruncation(plan.msgsToCompress)`
 *    + `formatFileOperationsFromMessages(msgs, resolveCanonicalName)`
 * 3. 构造 prompt：调 `buildCompactionUserContent({ previousSummary, messagesText, fileOpsText })`
 * 4. 调 LLM：system message 用 `COMPACTION_SUMMARY_SYSTEM_PROMPT`
 * 5. 落库：存 summary + summarizedBeforeId + referenceKeys + compressionCount
 * 6. 注入：用 `wrapHistoricalSummaryWithReplayGuard(summary)` 包装后注入
 * 7. 埋点：调 `buildCompactionMetricsFromPlan({ reason, previousSummary, plan, newSummary })`
 */

import { serializeMessageContent } from "core/chat/messageContentSerialize";
import { sha256Hex } from "core/sha256";
import { estimateTokenCount } from "./tokenUtils";
import { getMessageTokenCount, type TokenCountableMessage } from "./planCompression";

/**
 * 摘要记录（dialog summary）的生成逻辑版本号。
 *
 * sourceHash 只检测「历史变了」，不检测「摘要 prompt / 投影格式变了」——旧历史 +
 * 新逻辑时哈希照样匹配，旧摘要会被继续信任。此版本位用于在摘要生成逻辑或投影
 * 格式改版时主动让旧摘要失效：载入时若 stored.schemaVersion 已定义且不等于当前
 * 值，判摘要无效并丢弃（走重新压缩）；字段缺失（旧记录）按 v1 处理，零迁移。
 *
 * 版本历史：
 *   - v1：三段式（关键事实档案 / 对话进展与待办 / 文件操作清单）
 *   - v2：关键事实档案的**前两项固定为「原始目标」与「目标演化」**——压缩后接手的新
 *     会话必须知道"最初为什么做这件事"，否则只会抱住待办清单而丢掉目的
 *     （2026-10-02 用户实测：「压缩之后你屁都记不得」）。
 *     代价：v1 摘要会在下次压缩时对完整历史重压缩一次（一次性 token 开销，内容不丢）。
 *
 * 2026-10-06 刻意**不升版本**（保持 v2）：本次「关键事实档案」新增「已证伪的假设」
 * 「卡点与需用户决定」「输入未覆盖」三字段、澄清「原始目标」= 对话最初的意图，并在
 * 4000 预算内改为保留头尾行与证据行（见 truncateContentForSummary；曾评估提高到 16000，
 * 因本地压缩 60s 超时与 HIGH-2 膨胀螺旋被否决）。这些改动可被**增量吸收**：下次正常压缩
 * 以旧摘要为【现有记忆】、按新提示词生成，新字段随之出现；截留策略只影响新输入。
 * 若升到 v3，所有已持久化摘要会立即失效并对完整历史重压缩——长对话（实测 956 条）可能
 * 超过本地压缩 60s 超时（localLoop.ts DEFAULT_COMPACTION_TIMEOUT_MS），造成「消息未提交」
 * 的用户可见失败。只有当旧摘要内容**本身会误导**（而非仅缺字段）时才应升版本。
 */
export const COMPACTION_SUMMARY_SCHEMA_VERSION = 2;

// --- 摘要 prompt ---

/**
 * 统一的对话上下文压缩 system prompt。
 *
 * 三段式输出（关键事实档案 / 对话进展与待办 / 文件操作清单），比原 web 两段式
 * 多了文件操作清单，让摘要能直接回答"之前动过哪些文件"，续作时不必重新扫描。
 *
 * P0-3 增强（学 Kimi 第一人称 handoff）：
 * - 摘要以 agent 第一人称续作笔记的口吻写，不是第三方报告
 * - 保留确切命令、文件路径、变量名、错误信息原文
 * - 标注"声称已做但未验证"的工作（而非默认信任）
 * - 让接收摘要的 agent 从摘要自然续作并复核未验证项
 *
 * 明确禁止调工具，避免对话 agent 的 tool schema 干扰单次 complete。
 */
export const COMPACTION_SUMMARY_SYSTEM_PROMPT = `你是对话上下文压缩器。根据【现有记忆】和【新增对话】，输出可替代原始消息的事实性要点，供后续对话直接使用。

严格只输出下面三部分，标题必须完全一致：
关键事实档案
- ...
对话进展与待办
- ...
文件操作清单
- ...

要求：
1) 使用对话主语言；混合语言时优先用户主要语言；专有名词、文件路径、标识符、命令保留原文，不要翻译或转述。
2) 关键事实档案的**前两项固定是**：
   - 「原始目标」：这段对话**最初**的意图与原话（尽量保留他的原话与用词，不要改写成任务清单）。
     "最初"指开对话那一刻——不得用对话后来的某句用户话（如临睡委托、中期转述）替代最初目标；
     最初原话不在本次压缩范围内时，按「输入未覆盖」写"输入中未见"，再依据对话内最早可考的复述并注明。
     增量更新时沿用【现有记忆】里已有的「原始目标」，不要被新增对话改写——它是稳定字段；
     仅当新对话明确表明原文有事实性错误时才修正，并在「目标演化」里注明。
   - 「目标演化」：若中途转向，写清转向了什么、因为什么；没有转向就写「无转向」或省略这一项，不要硬凑。
   被后续工作取代的是"方案"，不是"用户的初始意图"——初始意图不得省略。
   其后才是：用户偏好、约束、技术栈、确定的文件路径、核心决策、未完成待办。保留确切值（端口号、版本号、路径、变量名、错误信息原文），不要概括成"某个端口"或"某个文件"或"某报错"。
   关键事实档案还必须包含以下三项（可接在固定两项之后，缺信息时如实写明，不得省略）：
   - 「已证伪的假设」：被证据否决或决定不采用的结论单列，注明"已证伪/不采用"及依据，防止续作把它当事实重启。
   - 「卡点与需用户决定」：阻塞项卡在哪、需要用户提供什么（授权 / 凭据 / 决定），写清楚，不得含糊。
   - 「输入未覆盖」：压缩范围内查不到的关键信息（如初始原话、指定 id），必须写"输入中未见"，禁止脑补。
3) 对话进展与待办以第一人称续作笔记的口吻写（"我做了…""用户要求…""下一步我需要…"），不要写成第三方观察报告。先极简概括旧上下文，再更详细记录最近进展、结论、分歧与下一步。对于声称已完成但尚未验证的工作（如工具调用返回成功但结果未人工确认），明确标注"（待验证）"——不要默认信任工具返回值。
4) 文件操作清单：按读取、写入、编辑列出路径（如: - 读取: path/to/file；未涉及则写"无"）。有长度约束时合并旧操作，省略无关读取。
5) 忽略寒暄、重复尝试和无价值废话；**已放弃的方案/尝试**可以省略，但用户当初的意图与理由不可省略（见第 2 条）。
6) 不要编造未出现的信息；不要开场白、结束语、markdown 代码块或额外章节；不要调用任何工具。`;

// --- 消息格式化 ---

/**
 * content 为空时的 fallback：用 tool_calls 函数名或占位符。
 * 提取为私有函数避免 formatMessagesForSummary 和截断版重复。
 */
function formatMessageContentFallback(msg: {
  content: unknown;
  tool_calls?: Array<{ function?: { name?: string } }>;
}): string {
  const content = serializeMessageContent(msg.content);
  if (content) return content;
  if (Array.isArray(msg.tool_calls)) {
    return `[tool_calls:${msg.tool_calls
      .map((c) => c.function?.name)
      .filter(Boolean)
      .join(",")}]`;
  }
  return "[非文本内容]";
}

/**
 * 把消息序列格式化成摘要 LLM 可读的纯文本（无截断）。
 *
 * 兼容 web Message 和 local PlanCompressionBridgeMessage。
 * tool_calls 无 content 时用函数名做 fallback 标记，避免空行。
 */
export function formatMessagesForSummary(
  msgs: Array<{
    role: string;
    content: unknown;
    tool_calls?: Array<{ function?: { name?: string } }>;
  }>,
): string {
  return formatMessagesForSummaryWithTruncation(msgs, Infinity);
}

/**
 * 构造摘要 user message 内容：现有记忆 + 文件操作清单 + 新增对话。
 *
 * 文件操作清单可选（web 端首次接入时可不传，降级为两段式输入格式）。
 */
export function buildCompactionUserContent(args: {
  previousSummary: string;
  messagesText: string;
  fileOpsText?: string;
  /** Request-local generation target, distinct from the transport hard cap. */
  outputTokenBudget?: number;
}): string {
  const parts: string[] = [];
  if (args.outputTokenBudget !== undefined) {
    const budget = args.outputTokenBudget;
    if (!Number.isFinite(budget) || budget < 1) throw new RangeError("Invalid summary output budget");
    const limit = Math.floor(budget);
    // Risk mitigation only, not evidence that output capacity caused a failure.
    const target = Math.max(1, Math.min(2000, Math.floor(limit / 2)));
    parts.push(`Summary target: ${target} tokens; hard output limit: ${limit} tokens. Complete 3 sections; merge old progress/files.`);
  }
  parts.push(`【现有记忆】：\n${args.previousSummary || "(无)"}`);
  if (args.fileOpsText !== undefined) {
    parts.push(`【文件操作清单】：\n${args.fileOpsText || "无"}`);
  }
  parts.push(`【新增对话】：\n${args.messagesText}`);
  return parts.join("\n\n").trim();
}

// --- 文件操作提取 ---

export type FileOperation = {
  type: "read" | "write" | "edit";
  path: string;
};

/**
 * 从 tool_calls 里提取文件操作（read/write/edit）。
 *
 * 依赖调用方传入 canonicalize 后的 tool name 映射；这里只做字段提取，
 * 不耦合具体的 tool name 别名系统（web 和 local 的 tool name 可能不同）。
 */
export function extractFileOperationsFromCalls(
  calls: Array<{
    function?: { name?: string; arguments?: unknown };
    name?: string;
  }>,
  resolveCanonicalName: (name: string) => string,
): FileOperation[] {
  const result: FileOperation[] = [];
  const seen = new Set<string>();
  const fileOperationByTool: Record<string, FileOperation["type"]> = {
    readFile: "read",
    writeFile: "write",
    editFile: "edit",
  };

  for (const call of calls) {
    const rawName = call.function?.name || call.name || "";
    if (!rawName) continue;

    const canonicalName = resolveCanonicalName(rawName);
    const opType = fileOperationByTool[canonicalName];
    if (!opType) continue;

    let rawArgs = call.function?.arguments;
    let parsedArgs: Record<string, unknown> | null = null;

    if (typeof rawArgs === "string") {
      try {
        parsedArgs = JSON.parse(rawArgs);
      } catch {
        // ignore invalid JSON
      }
    } else if (typeof rawArgs === "object" && rawArgs !== null) {
      parsedArgs = rawArgs as Record<string, unknown>;
    }

    const path =
      (parsedArgs as Record<string, unknown> | null)?.path ??
      (parsedArgs as Record<string, unknown> | null)?.filePath ??
      (parsedArgs as Record<string, unknown> | null)?.file;
    if (typeof path === "string" && path.trim()) {
      const key = `${opType}:${path.trim()}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ type: opType, path: path.trim() });
      }
    }
  }

  return result;
}

/**
 * 从消息序列里提取所有文件操作并格式化为摘要 prompt 用的文本。
 *
 * 需要调用方提供 `resolveCanonicalName` 来把可能的 tool name 别名映射到
 * readFile/writeFile/editFile，避免本模块耦合 tool alias 系统。
 */
export function formatFileOperationsFromMessages(
  msgs: Array<Record<string, any>>,
  resolveCanonicalName: (name: string) => string,
): string {
  const allOps: FileOperation[] = [];
  for (const msg of msgs) {
    if (!Array.isArray(msg.tool_calls)) continue;
    allOps.push(
      ...extractFileOperationsFromCalls(msg.tool_calls, resolveCanonicalName),
    );
  }
  if (allOps.length === 0) return "无";

  const typeLabelMap: Record<FileOperation["type"], string> = {
    read: "读取",
    write: "写入",
    edit: "编辑",
  };
  return allOps.map((op) => `- ${typeLabelMap[op.type]}: ${op.path}`).join("\n");
}

/** A bounded request is a lossy projection; the original messages remain in history. */
export type CompactionRequestMessage = {
  id: string;
  role: string;
  content: unknown;
  tool_call_id?: string;
  tool_calls?: Array<{
    id?: string;
    function?: { name?: string; arguments?: unknown };
    name?: string;
  }>;
};

/**
 * blocked 请求的数值诊断——**一个对象、一份字段**：既回答「哪一项吃掉了预算」
 * （`previousSummary` 本身超上限 / 骨架与文件操作清单 / 消息太多），也回答
 * 「当时的预算口径是多少」。纯观测字段，不参与任何判定、也不改变任何预算数值。
 *
 * 契约（两条同时成立）：
 * - **所有** blocked 返回都带 `diagnostics`（类型必填，不是可省略字段）；
 * - 只含数值与计数：不含消息正文、不含摘要正文、不含文件路径内容
 *   （`fileOpsCount` 只给条数）。
 *
 * 为什么需要：2026-11-13 22:35 起同一 dialog 反复 hash-mismatch → no-budget，
 * 而日志只有 `bounded compaction blocked: no-budget` 一行，无法判断到底是哪一项
 * 撑爆（旧摘要太长 / 文件操作清单太长 / 消息条数太多 / 窗口太小）。
 */
export type BoundedCompactionDiagnostics = {
  /** 生效的上下文窗口；窗口非法时为 0（占位，不参与判定）。 */
  contextWindow?: number;
  /** 摘要输入上限（token）。 */
  cap: number;
  /** 输出预留：`Math.min(8192, Math.max(1, Math.floor(window / 4)))`。 */
  outputTokenBudget: number;
  /** 【现有记忆】（previousSummary）的估算 token；**不截断**，超限即失败。 */
  previousSummaryTokens: number;
  /** 待压缩消息条数。 */
  messageCount: number;
  /** system prompt 的估算 token（走到固定成本核算后才有）。 */
  systemTokens?: number;
  /** prompt 模板骨架 + 文件操作清单的估算 token。 */
  templateTokens?: number;
  /** 剩余可分配给消息内容的 token（`cap - 固定成本`），可能 ≤ 0。 */
  availableTokens?: number;
  /** 最终逐条展开的消息条数。 */
  expandedMessages?: number;
  /** 最终合并成省略段声明的消息条数。 */
  omittedMessages?: number;
  /** 骨架（模板 + 文件操作清单 + 空消息段）的估算 token；固定成本溢出时才有。 */
  baseTokens?: number;
  /** 文件操作清单的条数（**不含路径内容**）。 */
  fileOpsCount?: number;
};

export type BoundedCompactionRequest<T extends CompactionRequestMessage> =
  | { status: "ready"; promptContent: string; coveredMessages: T[];
      summarizedBeforeId: string; inputTokens: number; outputTokenBudget: number; partial: boolean;
      /** 摘要请求的 input 上限；超过它才有消息被合并成省略段声明。 */
      capTokens: number;
      /** 逐条展开进摘要请求的消息数。 */
      expandedMessages: number;
      /** 被合并成省略段声明的消息数（ready 分支的原生可观测值，不额外计算）。 */
      omittedMessages: number }
  | { status: "blocked"; reason: "invalid-window" | "empty-input" | "no-budget" | "no-safe-group" | "group-too-large";
      /** 必填：所有 blocked 一律携带，见 `BoundedCompactionDiagnostics` 的契约。 */
      diagnostics: BoundedCompactionDiagnostics };

/** Head, evidence and tail are selected from the original, never from an
 * already truncated projection. This is intentionally separate from the
 * legacy formatter, whose no-evidence branch preserves its old head-only form. */
function makeBoundedExcerpt(content: string): (maxChars: number) => string {
  const evidence = selectEvidenceLines(content.split("\n"));
  return (maxChars) => {
    if (content.length <= maxChars) return content;
    const marker = `\n[... ${content.length} chars projected ...]\n`;
    const available = maxChars - marker.length;
    if (available < 3) return marker.trim();
    const evidenceCap = Math.floor(available * 0.2);
    const selected: string[] = [];
    let evidenceLength = 0;
    for (const line of evidence) {
      const cost = line.length + 1;
      if (evidenceLength + cost > evidenceCap) continue;
      selected.push(line);
      evidenceLength += cost;
    }
    const remainder = available - evidenceLength;
    const headLength = Math.ceil(remainder / 2);
    const tailLength = Math.floor(remainder / 2);
    return content.slice(0, headLength) + marker +
      (selected.length ? selected.join("\n") + "\n" : "") +
      (tailLength ? content.slice(-tailLength) : "");
  };
}

/**
 * 未展开消息的省略段声明里角色计数的固定顺序：同一输入产出稳定文本，
 * 测试与日志可直接核对（范围 + 各角色条数必须完整覆盖被省略的区间）。
 */
const OMITTED_ROLE_ORDER = ["user", "assistant", "tool", "system"] as const;

/**
 * 逐条展开一行的最小内容额度（token）。低于它时该行只剩 `role: ` 加截取标记，
 * 几乎不含信息，不如并进省略段声明——这正是千条历史每轮 `no-budget` 的来源：
 * 旧实现为每条消息强制输出一行骨架（实测 12.3 token/条），3000 条即 37k token，
 * 单是骨架就超过 `SUMMARY_INPUT_MAX_TOKENS`。
 */
const MIN_INLINE_CONTENT_TOKENS = 12;

/** 把一段连续未展开消息渲染成一行声明（区间 1 起、含两端）。 */
function formatOmittedRun(start: number, end: number, counts: Map<string, number>): string {
  const ordered = [
    ...OMITTED_ROLE_ORDER,
    ...[...counts.keys()].filter((role) => !(OMITTED_ROLE_ORDER as readonly string[]).includes(role)),
  ];
  const parts = ordered
    .filter((role) => (counts.get(role) ?? 0) > 0)
    .map((role) => `${role} ${counts.get(role)}`);
  const range = start === end ? `消息 ${start + 1}` : `消息 ${start + 1}–${end + 1}`;
  return `[... ${range} 已省略：${parts.join("、")} ...]`;
}

/** 头部（最早消息，承载原始目标）拿到的预算份额。 */
const SUMMARY_HEAD_SHARE = 0.4;
/** 给「中间整段省略成一行」预留的 token，避免头部/尾部把预算吃光后无法声明。
 * 实际值在极小预算下按 `min(该值, budget/4)` 收缩，否则一条消息都放不进会白白 blocked。 */
const DECLARATION_RESERVE = 40;
/** 中间区用户消息的重纳阈值（单条估算 token 上限）。只有用户消息能进：
 * 它们承载意图/授权/反证/决定；tool 结果必须配 tool_calls 才有意义，
 * assistant 长文按 token 单价最差，二者都不值得为它拆开省略段。 */
const USER_MESSAGE_MAX_DEMAND = 600;
/** 用户消息（意图/授权/反证/决定）在中间区可花的预算份额，与 head 份额独立。 */
const SUMMARY_USER_SHARE = 0.2;
/** 拆开一个已有省略段、改写成两段声明的最小额外成本。 */
const DECLARATION_SPLIT_COST = 20;

/**
 * Project the entire safe plan, retaining every message's role and order. Input
 * counts use the shared estimator, not the provider's tokenizer. Original
 * messages stay in history; projected message text (including user text) can be lossy.
 */
export function buildBoundedCompactionRequest<T extends CompactionRequestMessage>(args: {
  msgsToCompress: T[];
  previousSummary: string;
  contextWindow: number;
  canonicalizeToolName?: (name: string) => string;
}): BoundedCompactionRequest<T> {
  const { msgsToCompress: msgs, previousSummary, contextWindow } = args;
  // 窗口/预算数值保持原有口径（`Math.min(8192, ...)` 一字未改）；只是提前算出，
  // 好让 blocked 诊断能如实报告当时用的数值。窗口非法时用 0 占位。
  const windowValid = Number.isFinite(contextWindow) && contextWindow > 0;
  const window = windowValid ? Math.floor(contextWindow) : 0;
  const outputTokenBudget = windowValid
    ? Math.min(8192, Math.max(1, Math.floor(window / 4)))
    : 0;
  const cap = windowValid
    ? Math.min(computeSummaryInputTokenCap(contextWindow), window - outputTokenBudget)
    : 0;
  /**
   * blocked 一律带数值诊断（纯观测，不参与判定；`fileOpsCount` 只给条数，
   * 不含路径内容）。分项按阶段补齐：固定成本核算之后才有的字段用 extra 传。
   *
   * `previousSummary` 的估算只在失败路径上做——健康路径不多付一次
   * `estimateTokenCount`（旧摘要可达 24k+ 字符，那是热路径）。
   */
  const blocked = (
    reason: "invalid-window" | "empty-input" | "no-budget" | "no-safe-group" | "group-too-large",
    extra: Partial<BoundedCompactionDiagnostics> = {},
  ): BoundedCompactionRequest<T> => ({
    status: "blocked",
    reason,
    diagnostics: {
      contextWindow: window,
      cap,
      outputTokenBudget,
      previousSummaryTokens: estimateTokenCount(previousSummary ?? ""),
      messageCount: msgs.length,
      ...extra,
    },
  });
  if (!windowValid) return blocked("invalid-window");
  if (!msgs.length) return blocked("empty-input");
  const systemTokens = estimateTokenCount(COMPACTION_SUMMARY_SYSTEM_PROMPT);

  // Require the whole input to consist of closed tool groups, not just a safe prefix.
  for (let i = 0; i < msgs.length;) {
    const msg = msgs[i];
    if (msg.role === "tool") return blocked("no-safe-group");
    const calls = msg.role === "assistant" && Array.isArray(msg.tool_calls) ? msg.tool_calls : [];
    if (!calls.length) {
      i++;
      continue;
    }
    const ids = calls.map((call) => call.id);
    const hasIds = ids.every((id) => typeof id === "string" && id.length > 0);
    // Legacy positional pairing is allowed only when every call and result
    // omits its ID. Empty or mixed IDs are not a valid pairing mode.
    if ((!hasIds && ids.some((id) => id !== undefined)) || (hasIds && new Set(ids).size !== ids.length)) {
      return blocked("no-safe-group");
    }
    const remaining = new Set(ids);
    let count = 0;
    i++;
    while (i < msgs.length && msgs[i].role === "tool") {
      const id = msgs[i].tool_call_id;
      if (hasIds ? (!id || !remaining.delete(id)) : id !== undefined) {
        return blocked("no-safe-group");
      }
      count++;
      i++;
    }
    if (count !== calls.length || (hasIds && remaining.size)) return blocked("no-safe-group");
  }

  const canonicalize = args.canonicalizeToolName ?? ((name: string) => name);
  const operations = new Map<string, FileOperation>();
  for (const msg of msgs) {
    if (!Array.isArray(msg.tool_calls)) continue;
    for (const op of extractFileOperationsFromCalls(msg.tool_calls, canonicalize)) {
      operations.set(JSON.stringify([op.type, op.path]), op);
    }
  }
  const labelsByOperation = { read: "读取", write: "写入", edit: "编辑" };
  const fileOpsText = [...operations.values()].map((op) => `- ${labelsByOperation[op.type]}: ${op.path}`).join("\n") || "无";
  const note = "以下是有损投影：部分消息被截取，连续省略的区间合并为一行 [...] 声明；原文仍存历史。";
  const omitted = "[... 内容已截取 ...]";
  const contents = msgs.map((msg) => serializeMessageContent(msg.content) || formatMessageContentFallback(msg));
  const excerpts = contents.map((content) => makeBoundedExcerpt(content));
  const raw = contents.map((content, i) => msgs[i].role === "tool" ? excerpts[i]!(TOOL_RESULT_TRUNCATE_CHARS) : content);
  // Anchors use coveredMessages, not prompt labels. Repeating long IDs here
  // consumes the budget needed for actual content in thousand-message plans.
  const promptFor = (messagesText: string) => buildCompactionUserContent({
    previousSummary, fileOpsText, outputTokenBudget, messagesText,
  });
  const demands = raw.map((text) => estimateTokenCount(text));
  /** Per-line overhead of `role: ` + newline, charged before any content. */
  const lineOverheads = msgs.map((msg) => estimateTokenCount(`${msg.role}: `) + 1);

  // Fixed cost: system prompt + template skeleton (note, section headers, file
  // ops) + previousSummary. previousSummary is never truncated — silently
  // shrinking 【现有记忆】 would rewrite the facts carried over from earlier
  // rounds, so an oversized one fails loudly instead.
  const fixedTokens = systemTokens + estimateTokenCount(promptFor(`${note}\n`));
  const availableTokens = cap - fixedTokens;
  const diagnosticsOf = (
    expandedMessages: number,
    omittedMessages: number,
  ): BoundedCompactionDiagnostics => {
    // 诊断分项只在失败路径上算：健康路径不多付「旧摘要 + 空消息段骨架」的两次
    // estimateTokenCount（旧摘要可达 24k+ 字符，那是压缩热路径）。
    const previousSummaryTokens = estimateTokenCount(previousSummary ?? "");
    const baseTokens = systemTokens + estimateTokenCount(promptFor(""));
    return {
      contextWindow: window,
      cap,
      outputTokenBudget,
      previousSummaryTokens,
      messageCount: msgs.length,
      systemTokens,
      templateTokens: fixedTokens - systemTokens - previousSummaryTokens,
      availableTokens,
      expandedMessages,
      omittedMessages,
      baseTokens,
      fileOpsCount: operations.size,
    };
  };
  if (availableTokens <= 0) {
    return blocked("no-budget", diagnosticsOf(0, msgs.length));
  }

  /** Fit an already-selected message into its allowance, keeping head, evidence
   * lines and tail of the original (never of a previous projection). */
  const projectContent = (i: number, allowance: number): string => {
    if (demands[i] <= allowance) return raw[i];
    let lo = 0;
    let hi = Math.min(contents[i].length, msgs[i].role === "tool" ? TOOL_RESULT_TRUNCATE_CHARS : contents[i].length);
    let best = omitted;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const candidate = excerpts[i]!(mid);
      if (estimateTokenCount(candidate) <= allowance) {
        best = candidate;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return best;
  };

  /**
   * Pick which messages are expanded into `role: content` lines.
   *
   * Expansion is positional, not size-ranked: a pure size threshold has no
   * feasible partition when thousands of messages are the same size (measured:
   * a level allocator keeps either all 3000 or none, so the request stayed
   * blocked), and it also silently drops user intent while keeping assistant
   * prose. Regions instead:
   *  - head: contiguous oldest messages, which carry 原始目标;
   *  - user messages in the middle (authorization, refutations, decisions) —
   *    the highest value per token, admitted inside their own budget share;
   *  - tail: contiguous newest messages, which carry current progress;
   *  - middle: everything else, declared as one omission line per run.
   */
  const selectRegions = (budget: number) => {
    const expanded = msgs.map(() => false);
    const allowances = msgs.map(() => 0);
    let used = 0;
    // One declaration line must always fit, but on a tiny budget a fixed 40
    // tokens would starve every message and block a request that has room.
    const declarationReserve = Math.min(DECLARATION_RESERVE, Math.max(4, Math.floor(budget / 4)));
    const room = () => budget - used - declarationReserve;
    const takeFull = (i: number) => {
      expanded[i] = true;
      allowances[i] = demands[i];
      used += lineOverheads[i] + demands[i];
    };
    const drop = (i: number) => {
      if (!expanded[i]) return;
      expanded[i] = false;
      used -= lineOverheads[i] + allowances[i];
      allowances[i] = 0;
    };

    // 1) Head: the oldest messages, which carry 原始目标. Bounded by its own
    //    share so one huge earliest message cannot take the whole budget; when
    //    even the first message does not fit that share, it still gets whatever
    //    room exists rather than leaving the prompt empty.
    const headBudget = Math.floor(budget * SUMMARY_HEAD_SHARE);
    let headEnd = -1;
    let headUsed = 0;
    for (let i = 0; i < msgs.length; i++) {
      const cost = lineOverheads[i] + demands[i];
      const limit = i === 0 ? Math.max(headBudget, room()) : headBudget - headUsed;
      if (cost > limit) break;
      takeFull(i);
      headUsed += cost;
      headEnd = i;
    }

    // 2) User content: user messages carry intent, authorization, refutations and
    //    decisions — the highest value per token in a summary request — so they are
    //    admitted newest-first (a decision governs what happens next) up to their
    //    own budget share. Long user texts stay for the boundary projection below.
    //    Only runs of non-user messages are declared, so the number of omission
    //    lines is bounded by the number of user turns, not by the message count.
    const userBudget = Math.floor(budget * SUMMARY_USER_SHARE);
    let userSpend = 0;
    for (let i = msgs.length - 1; i > headEnd; i--) {
      if (expanded[i] || msgs[i].role !== "user") continue;
      if (demands[i] > USER_MESSAGE_MAX_DEMAND) continue;
      const cost = lineOverheads[i] + demands[i] + DECLARATION_SPLIT_COST;
      if (userSpend + cost > userBudget || cost > room()) continue;
      takeFull(i);
      userSpend += cost;
    }

    // 3) Tail: the newest messages, which carry current progress. Contiguous
    //    from the end; a message that does not fit whole ends the region so the
    //    tail stays one clean run.
    let tailStart = msgs.length;
    for (let i = msgs.length - 1; i > headEnd; i--) {
      if (expanded[i]) {
        tailStart = i;
        continue;
      }
      if (lineOverheads[i] + demands[i] > room()) break;
      takeFull(i);
      tailStart = i;
    }

    // 4) Boundary projection: keep head, evidence lines and tail of the one
    //    oversized message adjacent to each region. This is the only place
    //    message text is truncated instead of declared omitted, and each side is
    //    capped so one huge message cannot consume the other's share.
    const boundaryCap = Math.floor(room() * 0.5);
    const takeBoundary = (i: number) => {
      const inline = Math.min(room(), boundaryCap) - lineOverheads[i];
      if (inline < MIN_INLINE_CONTENT_TOKENS) return false;
      expanded[i] = true;
      allowances[i] = inline;
      used += lineOverheads[i] + inline;
      return true;
    };
    if (tailStart - 1 > headEnd && !expanded[tailStart - 1] && takeBoundary(tailStart - 1)) tailStart--;
    if (headEnd + 1 < tailStart && !expanded[headEnd + 1] && takeBoundary(headEnd + 1)) headEnd++;

    // 5) Contiguous fill: grow the existing regions (tail first — recent
    //    progress outranks old context) while whole messages fit, instead of
    //    punching more holes that each cost another declaration line.
    let grew = true;
    while (grew) {
      grew = false;
      for (let i = tailStart - 1; i > headEnd; i--) {
        if (expanded[i]) {
          tailStart = i;
          continue;
        }
        if (lineOverheads[i] + demands[i] > room()) break;
        takeFull(i);
        tailStart = i;
        grew = true;
        break;
      }
      for (let i = headEnd + 1; i < tailStart; i++) {
        if (expanded[i]) {
          headEnd = i;
          continue;
        }
        if (lineOverheads[i] + demands[i] > room()) break;
        takeFull(i);
        headEnd = i;
        grew = true;
        break;
      }
    }

    // --- Tool group integrity: a call and its results are one unit ---
    // Pair every result to the call it answers by `tool_call_id` (positional
    // only when ids are absent everywhere, the same rule the safe-group
    // validation above accepts). A single assistant message can own several
    // results, so a `msgs[i - 1]` neighbour check cannot express this pairing.
    const callOfResult = new Map<number, number>();
    const resultsOfCall = new Map<number, number[]>();
    for (let i = 0; i < msgs.length; i++) {
      const msg = msgs[i];
      const calls = msg.role === "assistant" && Array.isArray(msg.tool_calls) ? msg.tool_calls : [];
      if (!calls.length) continue;
      const ids = calls.map((call) => call.id);
      const byId = ids.every((id) => typeof id === "string" && id.length > 0);
      const results: number[] = [];
      for (let j = i + 1; j < msgs.length && msgs[j].role === "tool"; j++) {
        const id = msgs[j].tool_call_id;
        if (!(byId ? typeof id === "string" && ids.includes(id) : id === undefined)) break;
        results.push(j);
        callOfResult.set(j, i);
      }
      resultsOfCall.set(i, results);
    }
    // Reverse direction: a call whose answered results did not all make it into
    // the prompt becomes an omission declaration itself. Head/tail regions grow
    // contiguously and can stop exactly on an `assistant(tool_calls)`, leaving
    // the results behind — the reader would then see a call, then a declaration,
    // and never the result. Degrading the call is unconditional and always
    // affordable, while expanding the missing results could push the request
    // past the cap; the group therefore degrades rather than overflows.
    for (const [callIndex, results] of resultsOfCall) {
      if (!expanded[callIndex] || !results.length) continue;
      if (results.every((j) => expanded[j])) continue;
      drop(callIndex);
    }
    // Forward direction: never leave a tool result in the prompt without the
    // call it answers (also covers the results just orphaned by the pass above).
    for (let i = 0; i < msgs.length; i++) {
      if (!expanded[i] || msgs[i].role !== "tool") continue;
      const callIndex = callOfResult.get(i);
      if (callIndex === undefined || !expanded[callIndex]) drop(i);
    }
    return { expanded, allowances };
  };

  const render = (budget: number) => {
    const { expanded, allowances } = selectRegions(budget);
    const pieces: string[] = [];
    let runStart = -1;
    let runCounts = new Map<string, number>();
    const flushRun = (end: number) => {
      if (runStart < 0) return;
      pieces.push(formatOmittedRun(runStart, end, runCounts));
      runStart = -1;
      runCounts = new Map();
    };
    let expandedCount = 0;
    for (let i = 0; i < msgs.length; i++) {
      if (!expanded[i]) {
        if (runStart < 0) runStart = i;
        runCounts.set(msgs[i].role, (runCounts.get(msgs[i].role) ?? 0) + 1);
        continue;
      }
      flushRun(i - 1);
      expandedCount++;
      pieces.push(`${msgs[i].role}: ${projectContent(i, allowances[i])}`);
    }
    flushRun(msgs.length - 1);
    const promptContent = promptFor(`${note}\n${pieces.join("\n")}`);
    return {
      promptContent,
      inputTokens: systemTokens + estimateTokenCount(promptContent),
      expandedCount,
      omittedCount: msgs.length - expandedCount,
    };
  };

  // Verification loop: the region estimates are approximations of the rendered
  // prompt (declaration lines are counted by their real text), so the assembled
  // text is re-measured and the budget shrunk until the request fits. Only a
  // ready request is ever returned as fitting.
  let budget = availableTokens;
  let last = render(budget);
  for (let attempt = 0; attempt < 12 && last.inputTokens > cap; attempt++) {
    const overflow = last.inputTokens - cap;
    budget = Math.max(0, Math.floor(budget - Math.max(overflow, Math.ceil(budget * 0.15))));
    last = render(budget);
  }
  if (last.inputTokens > cap || last.expandedCount === 0) {
    return blocked("no-budget", diagnosticsOf(last.expandedCount, last.omittedCount));
  }
  return { status: "ready", promptContent: last.promptContent, coveredMessages: msgs.slice(),
    summarizedBeforeId: msgs[msgs.length - 1].id, inputTokens: last.inputTokens,
    outputTokenBudget, partial: false, capTokens: cap,
    expandedMessages: last.expandedCount, omittedMessages: last.omittedCount };
}

// --- 工具结果截断（P0-2，学 Pi） ---

/**
 * 单个工具结果在摘要输入里的最大字符数（普通 prose）。
 *
 * 超长的工具结果（如读取大文件）截断到这个长度并加标记，避免摘要请求本身
 * 被撑爆。取 4000 字符（约 1000 token），比 Pi 的 2000 更宽松一些，因为
 * bun-nolo 的工具结果常含文件路径和关键错误信息，截太狠会丢上下文。
 */
export const TOOL_RESULT_TRUNCATE_CHARS = 4000;

/**
 * 摘要输入的绝对 token 上限（Opus 5.5 B′ 裁决）：延迟只取决于摘要输入的绝对
 * token 数，与窗口占比无关，因此不能随窗口放大。该值由单次真实 spike（约 5k
 * 字符/s、目标 p50<30s）线性外推，**未用真实 1M 量级样本校准**，落地后需一次
 * 真实复测（涉及订阅通道用量，需授权）再定稿。floor(0.5*window) 项只保证摘要
 * 请求本身装得进窗口。
 */
export const SUMMARY_INPUT_MAX_TOKENS = 30_000;

/** 摘要输入 token 预算 = min(绝对上限, floor(0.5*window))；非法窗口回落绝对上限。 */
export function computeSummaryInputTokenCap(contextWindow: number): number {
  const halfWindow =
    typeof contextWindow === "number" && Number.isFinite(contextWindow) && contextWindow > 0
      ? Math.floor(contextWindow * 0.5)
      : SUMMARY_INPUT_MAX_TOKENS;
  return Math.max(1, Math.min(SUMMARY_INPUT_MAX_TOKENS, halfWindow));
}

/** 按 token 二分把文本截到严格 ≤ maxTokens（CJK 用 estimateTokenCount，不按 4 char/token）。 */
function capTextToTokenBudget(text: string, maxTokens: number): string {
  const marker = `\n\n[... summary input capped to ${maxTokens} tokens ...]`;
  const markerTokens = estimateTokenCount(marker);
  const budget = Math.max(0, maxTokens - markerTokens);
  if (estimateTokenCount(text) <= budget) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (estimateTokenCount(text.slice(0, mid)) <= budget) lo = mid;
    else hi = mid - 1;
  }
  return `${text.slice(0, lo)}${marker}`;
}

/**
 * 把已按 `${role}: ${text}` 拼好的消息列表总量压到 ≤ maxTotalTokens。
 * 从最新（数组尾）往旧累加：放得下的较新消息保留，放不下的较旧消息整条丢弃
 * （越旧越狠 = 先丢最旧，绝不丢最新上下文）。每条只算一次 token，O(n)，
 * 不做逐条折半 + 每轮整串重算（那会在 1M 长历史上同步阻塞数十秒）。纯函数。
 */
function capSummaryInputToTokenBudget(items: string[], maxTotalTokens: number): string {
  if (items.length === 0) return "";
  const sepTokens = estimateTokenCount("\n");
  const kept: string[] = [];
  let used = 0;
  for (let i = items.length - 1; i >= 0; i -= 1) {
    const t = estimateTokenCount(items[i]);
    const sep = kept.length > 0 ? sepTokens : 0;
    if (kept.length > 0 && used + sep + t > maxTotalTokens) break;
    used += sep + t;
    kept.push(items[i]);
  }
  kept.reverse();
  const result = kept.join("\n");
  // 严格兜底：仅当最新单条本身就超预算时触发，对结果按 token 截到 ≤ 上限。
  return estimateTokenCount(result) > maxTotalTokens
    ? capTextToTokenBudget(result, maxTotalTokens)
    : result;
}

/**
 * 疑似证据行的信号（纯正则，无依赖）。
 *
 * 2026-10-06 压缩评估复评（父方向）：**总上限保持 4000 不变**，只从被截区间里
 * 挑出证据行（commit sha / 测试构建结论词 / 退出码 / HTTP 码 / 堆栈 / 测试计数）
 * 进保留集——本地压缩有 60s 总超时（localLoop.ts DEFAULT_COMPACTION_TIMEOUT_MS），
 * 提高上限会撑大压缩输入、加剧 HIGH-2 摘要膨胀螺旋。方向"宁可多留不误杀"，
 * 但这些行总量仍受 4000 约束。
 */
// 精度优先（独立审查 HIGH）：每条都要求“结构化上下文”，不认裸 hex / 裸三位数 /
// 散落的 error 单词——那些在普通文本（年份、端口、编号、叙述）里大量出现，会把
// 头尾上下文挤掉。宁可漏一条证据，不让误报改变普通输出。
const EVIDENCE_LINE_PATTERNS: readonly RegExp[] = [
  // commit sha：必须带 git 语境（commit/sha/HEAD/merge/push 输出 a..b）且含字母+数字
  /\b(?:commit|sha|HEAD|merge|revert|cherry-pick)\b[^\n]{0,24}\b(?=[0-9a-f]*[a-f])(?=[0-9a-f]*\d)[0-9a-f]{7,40}\b/i,
  /\b(?=[0-9a-f]*[a-f])(?=[0-9a-f]*\d)[0-9a-f]{7,40}\.\.(?=[0-9a-f]*[a-f])[0-9a-f]{7,40}\b/,
  // 测试结论：带计数的 pass/fail，或 bun/jest 风格的 (pass)/(fail) 行首
  /\b\d+\s+(?:pass|passed|fail|failed|tests?)\b/i,
  /^\s*\((?:pass|fail)\)/i,
  /^\s*(?:FAIL|PASS|ERROR)\b[:\s]/,
  // 退出码 / HTTP 状态：必须带键名
  /\bexit(?:\s*code|Code|_code)?\s*[=:]\s*\d+/i,
  /\bHTTP\/[\d.]+\s+[1-5]\d{2}\b/,
  /\b(?:status|statusCode|http_code|code)\s*[=:]\s*[1-5]\d{2}\b/i,
  // 错误：行首的 XxxError:/Exception:，或 error: 前缀；超时带 timeout 关键结构
  /^\s*(?:Uncaught\s+)?[A-Z]\w*(?:Error|Exception)\b\s*:/,
  /^\s*(?:error|fatal|panic)\s*:/i,
  /\bTimeout\s+\d+\s*ms\s+exceeded\b/i,
  // 堆栈帧
  /^\s*at\s+\S+.*:\d+(?::\d+)?\)?\s*$/,
];

/**
 * 判定单行是否为疑似证据行（纯函数，导出供测试）。
 */
export function isEvidenceLine(line: string): boolean {
  if (!line) return false;
  return EVIDENCE_LINE_PATTERNS.some((re) => re.test(line));
}

/**
 * 从候选行里按原顺序挑出证据行（纯函数，导出供测试）。
 */
export function selectEvidenceLines(lines: readonly string[]): string[] {
  return lines.filter(isEvidenceLine);
}

/**
 * 截断保留策略的预算分配（纯函数，导出供测试）：
 * 被截区间挑出的证据行、头部行、尾部行各占多少字符。
 * 头部/尾部均分、证据行拿剩余额度；单一巨型行按字符切片兜底。
 * 纯分数计算——同输入同输出，不依赖时间/随机/环境。
 */
const EVIDENCE_HEAD_SHARE = 0.4;
const TAIL_SHARE = 0.4;

export function evidenceTruncateBudget(maxChars: number): {
  markerReserve: number;
  headCap: number;
  tailCap: number;
  evidenceCap: number;
} {
  // 标记 + 「已保留 N 条证据行」备注的最坏长度预留，保证含标记的总长严格 ≤ maxChars
  const markerReserve = 96;
  const usable = Math.max(0, maxChars - markerReserve);
  const headCap = Math.floor(usable * EVIDENCE_HEAD_SHARE);
  const tailCap = Math.floor(usable * TAIL_SHARE);
  return {
    markerReserve,
    headCap,
    tailCap,
    evidenceCap: Math.max(0, usable - headCap - tailCap),
  };
}

/** 从头部按整行取到不超过 cap；首行即超 cap 时按字符切片兜底。 */
function takeHeadLines(
  lines: readonly string[],
  cap: number,
): { text: string; consumed: number } {
  let text = "";
  let consumed = 0;
  for (const line of lines) {
    const candidate = consumed === 0 ? line : `${text}\n${line}`;
    if (candidate.length > cap) {
      if (consumed === 0 && cap > 0) {
        // 首行即超 cap：字符级头部切片（保证任何输入都有头部上下文）
        return { text: line.slice(0, cap), consumed: 1 };
      }
      break;
    }
    text = candidate;
    consumed += 1;
  }
  return { text, consumed };
}

/** 从尾部按整行取到不超过 cap（takeHeadLines 的镜像）。 */
function takeTailLines(
  lines: readonly string[],
  cap: number,
): { text: string; consumed: number } {
  if (cap <= 0 || lines.length === 0) return { text: "", consumed: 0 };
  let text = "";
  let consumed = 0;
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const candidate = consumed === 0 ? lines[i] : `${lines[i]}\n${text}`;
    if (candidate.length > cap) {
      if (consumed === 0) return { text: lines[i].slice(-cap), consumed: 1 };
      break;
    }
    text = candidate;
    consumed += 1;
  }
  return { text, consumed };
}

/** 确定性收缩：按「证据行 → 尾行 → 头行」的固定优先级丢整行，直到含标记总长 ≤ maxChars。 */
function shrinkToFit(
  head: string[],
  evidence: string[],
  tail: string[],
  makeMarker: (bodyChars: number) => string,
  maxChars: number,
): string {
  const joinBody = () => head.concat(evidence, tail).join("\n");
  let marker = makeMarker(joinBody().length);
  while (joinBody().length + marker.length > maxChars) {
    if (evidence.length > 0) evidence.pop();
    else if (tail.length > 0) tail.pop();
    else if (head.length > 0) head.pop();
    else break;
    marker = makeMarker(joinBody().length);
  }
  const result = joinBody() + marker;
  // 终极兜底：任何极端输入都不允许越过上限（正常路径不应到达）
  return result.length > maxChars ? result.slice(0, maxChars) : result;
}

/**
 * 截断消息的 content 用于摘要输入。
 *
 * 只对 role=tool 的消息截断（工具结果通常最大）；其他消息原样返回。
 *
 * 2026-10-06 压缩评估复评后改版（父方向，覆盖原"提高证据型上限"方案）：
 * **总上限仍是 4000 不变**——本地压缩有 60s 总超时（localLoop.ts
 * DEFAULT_COMPACTION_TIMEOUT_MS，压缩超时会阻止用户消息提交），且"工具结果
 * 不截断/放大"正是 docs/plans/2026-08-16-compaction-research.md 列为 HIGH-2 的
 * 摘要膨胀螺旋。只改"截掉什么"：超长且被截区间含证据行（sha / pass / fail /
 * error / timeout / exitCode / HTTP 码 / 堆栈）时，在 4000 预算内保留
 * 头部行 + 尾部行 + 证据行，其余丢弃；无证据行的普通 prose 维持旧的头部硬切
 * 行为（逐字节一致）。截断标记格式不变：[... N chars truncated ...]；保留
 * 证据行时附一行 [... 已保留 N 条证据行 ...]。输出长度严格 ≤ maxChars（含标记），
 * 纯函数、无时间/随机依赖，同输入同输出。
 */
export function truncateContentForSummary(
  role: string,
  content: string,
  maxChars: number = TOOL_RESULT_TRUNCATE_CHARS,
): string {
  if (role !== "tool" || content.length <= maxChars) return content;

  const lines = content.split("\n");
  const budget = evidenceTruncateBudget(maxChars);
  const head = takeHeadLines(lines, budget.headCap);
  const tail = takeTailLines(
    lines.slice(0, lines.length - head.consumed),
    budget.tailCap,
  );
  const middle = lines.slice(head.consumed, lines.length - tail.consumed);
  const evidence = selectEvidenceLines(middle);

  // 无证据行：维持旧行为——头部硬切到 maxChars + 原格式标记
  if (evidence.length === 0) {
    return `${content.slice(0, maxChars)}\n\n[... ${content.length - maxChars} chars truncated ...]`;
  }

  const headLines = head.text ? head.text.split("\n") : [];
  const tailLines = tail.text ? tail.text.split("\n") : [];
  const evidenceLines: string[] = [];
  let evidenceUsed = 0;
  for (const line of evidence) {
    if (evidenceUsed + line.length > budget.evidenceCap) break;
    evidenceLines.push(line);
    evidenceUsed += line.length;
  }
  const marker = (bodyChars: number) => {
    // 备注按收缩后的实际保留条数走，杜绝"已保留 0 条"这类不实标注
    const note =
      evidenceLines.length > 0
        ? `\n[... 已保留 ${evidenceLines.length} 条证据行 ...]`
        : "";
    return `\n\n[... ${content.length - bodyChars} chars truncated ...]${note}`;
  };
  return shrinkToFit(headLines, evidenceLines, tailLines, marker, maxChars);
}

/**
 * 带截断的消息格式化：先截断工具结果，再格式化。
 *
 * 这是 formatMessagesForSummary 的截断增强版，用于实际压缩调用。
 * 显式传 maxToolResultChars 时按旧契约整组覆盖（无调用方使用）。
 */
export function formatMessagesForSummaryWithTruncation(
  msgs: Array<{
    role: string;
    content: unknown;
    tool_calls?: Array<{ function?: { name?: string } }>;
  }>,
  maxToolResultChars: number = TOOL_RESULT_TRUNCATE_CHARS,
  maxTotalTokens?: number,
): string {
  const items = msgs.map((msg) => {
    const rawContent = serializeMessageContent(msg.content) || "";
    const truncated = truncateContentForSummary(
      msg.role,
      rawContent,
      maxToolResultChars,
    );
    const text = truncated || formatMessageContentFallback(msg);
    return `${msg.role}: ${text}`;
  });
  // Opus B′：摘要输入绝对 token 上限。tool 单条截断管不住 user/assistant 全量，
  // 这里对总量封顶（越旧越狠），不传 maxTotalTokens 时保持旧行为逐字节不变。
  if (
    typeof maxTotalTokens === "number" &&
    Number.isFinite(maxTotalTokens) &&
    maxTotalTokens > 0
  ) {
    return capSummaryInputToTokenBudget(items, maxTotalTokens);
  }
  return items.join("\n");
}
// --- 压缩埋点 metrics (P1-8) ---

/**
 * 一次压缩事件的 metrics 记录。
 *
 * 用于观测压缩效果和成本：压缩前后 token 对比能看出压缩收益，
 * 摘要 LLM 用量能算出压缩本身的成本，触发原因能指导阈值调优。
 */
export interface CompactionMetrics {
  /** 触发原因 */
  reason: string;
  /** 压缩前已有 summary 的 token 数 */
  previousSummaryTokens: number;
  /** 被压缩消息的 token 数 */
  compressedTokens: number;
  /** 保留尾部消息的 token 数 */
  retainedTokens: number;
  /** 新 summary 的 token 数（压缩后） */
  newSummaryTokens: number;
  /** 被压缩消息数 */
  compressedCount: number;
  /** 保留尾部消息数 */
  retainedCount: number;
  /** 摘要 LLM 调用的 usage（如果有） */
  summaryUsage?: Record<string, unknown>;
  /** 是否有前序摘要（用于判断首次压缩 vs 增量压缩） */
  hadPreviousSummary: boolean;
  /**
   * 本次折叠后**每轮常驻上下文**净减少的 token 数：
   * `previousSummaryTokens + compressedTokens - newSummaryTokens`。
   * 保留尾部不变故不计入。纯算术、不含价格假设——回本轮数需结合摘要调用的
   * 真实用量自行计算（见 `summaryInputTokens` 与 `summaryUsage`）。
   * 负值表示新摘要比旧摘要+被压缩内容还大。
   */
  residentReductionTokens: number;
  /**
   * 最终投影请求 input token 的**本地估算**（`estimateTokenCount`），
   * 不是 provider 返回的 usage——真实摘要用量见 `summaryUsage`。
   */
  summaryInputTokens?: number;
  /**
   * 摘要请求的 input 上限。逼近它说明预算吃紧；是否有**整条消息**被省略，
   * 看 `summaryOmittedMessages > 0`，不要仅凭本字段的使用率判断。
   */
  summaryInputCapTokens?: number;
  /** 摘要请求里逐条展开的消息数。 */
  summaryExpandedMessages?: number;
  /** 摘要请求里被合并成省略段声明的消息数。 */
  summaryOmittedMessages?: number;
  /**
   * 触发时锚点之后的待处理消息条数（`CompressionPlanDiagnostics.pendingMsgCount`）。
   *
   * 与 `compressedCount` 一起才能区分两种完全不同的情形：待处理本来就只有几条
   * （正常的增量压缩），还是待处理很多但预算把可压范围卡到几条（空转）。
   * 只看 `compressedCount` 无法分辨。
   */
  pendingMessageCount?: number;
  /** 计划压缩条数（`CompressionPlanDiagnostics.compressCount`）。 */
  plannedCompressCount?: number;
}

/**
 * 摘要请求构建结果中与观测有关的部分。
 *
 * 来源：`buildBoundedCompactionRequest` 的 ready 分支。它才知道有损投影
 * 到底省略了多少消息——`CompactionPlan` 只知道「计划压缩哪些」。
 */
export interface CompactionSummaryInput {
  inputTokens: number;
  capTokens?: number;
  expandedMessages?: number;
  omittedMessages?: number;
}

/**
 * 构造压缩 metrics 记录。纯函数：不调 LLM、不写 DB。
 */
export function buildCompactionMetrics(args: {
  reason: string;
  previousSummary: string;
  msgsToCompress: TokenCountableMessage[];
  msgsToKeep: TokenCountableMessage[];
  newSummary: string;
  summaryUsage?: Record<string, unknown>;
  /** 摘要请求构建结果（ready 分支）的可观测部分；不传则投影字段全部缺省。 */
  summaryInput?: CompactionSummaryInput;
  /** 触发时的待处理与计划压缩条数（来自 `CompressionPlanDiagnostics`）。 */
  planCounts?: { pendingMessageCount?: number; plannedCompressCount?: number };
  estimateTokens: (text: string) => number;
  estimateMessageTokens: (msg: TokenCountableMessage) => number;
}): CompactionMetrics {
  const {
    reason, previousSummary, msgsToCompress, msgsToKeep,
    newSummary, summaryUsage, estimateTokens, estimateMessageTokens,
  } = args;
  const previousSummaryTokens = estimateTokens(previousSummary || "");
  const compressedTokens = msgsToCompress.reduce((s, m) => s + estimateMessageTokens(m), 0);
  const newSummaryTokens = estimateTokens(newSummary || "");
  const summaryInput = args.summaryInput;
  return {
    reason,
    previousSummaryTokens,
    compressedTokens,
    retainedTokens: msgsToKeep.reduce((s, m) => s + estimateMessageTokens(m), 0),
    newSummaryTokens,
    compressedCount: msgsToCompress.length,
    retainedCount: msgsToKeep.length,
    summaryUsage,
    hadPreviousSummary: previousSummary.trim().length > 0,
    residentReductionTokens: previousSummaryTokens + compressedTokens - newSummaryTokens,
    ...(summaryInput
      ? {
          summaryInputTokens: summaryInput.inputTokens,
          ...(summaryInput.capTokens !== undefined
            ? { summaryInputCapTokens: summaryInput.capTokens } : {}),
          ...(summaryInput.expandedMessages !== undefined
            ? { summaryExpandedMessages: summaryInput.expandedMessages } : {}),
          ...(summaryInput.omittedMessages !== undefined
            ? { summaryOmittedMessages: summaryInput.omittedMessages } : {}),
        }
      : {}),
    ...(args.planCounts?.pendingMessageCount !== undefined
      ? { pendingMessageCount: args.planCounts.pendingMessageCount } : {}),
    ...(args.planCounts?.plannedCompressCount !== undefined
      ? { plannedCompressCount: args.planCounts.plannedCompressCount } : {}),
  };
}

/**
 * 从 CompressionPlan 构造 metrics 的便捷函数。
 *
 * 三套压缩路径（web / local / CLI）都用 planCompression 做决策，
 * 调用方只需传 plan + reason + newSummary + 可选 summaryUsage，
 * 不用每次都手动传 estimateTokens / estimateMessageTokens。
 */
export function buildCompactionMetricsFromPlan(args: {
  reason: string;
  previousSummary: string;
  plan: { msgsToCompress: TokenCountableMessage[]; msgsToKeep: TokenCountableMessage[] };
  newSummary: string;
  summaryUsage?: Record<string, unknown>;
  /** 摘要请求构建结果（ready 分支）；用于记录有损投影的估算幅度。 */
  summaryInput?: CompactionSummaryInput;
  /** 触发时的待处理与计划压缩条数（来自 `CompressionPlanDiagnostics`）。 */
  planCounts?: { pendingMessageCount?: number; plannedCompressCount?: number };
}): CompactionMetrics {
  return buildCompactionMetrics({
    reason: args.reason,
    previousSummary: args.previousSummary,
    msgsToCompress: args.plan.msgsToCompress,
    msgsToKeep: args.plan.msgsToKeep,
    newSummary: args.newSummary,
    summaryUsage: args.summaryUsage,
    ...(args.summaryInput ? { summaryInput: args.summaryInput } : {}),
    ...(args.planCounts ? { planCounts: args.planCounts } : {}),
    estimateTokens: estimateTokenCount,
    estimateMessageTokens: getMessageTokenCount,
  });
}

/**
 * 格式化成人类可读的单行日志。
 * 示例: [Compaction] reason=context_budget compressed=15->2 msgs, tokens=12500->3200 (ratio=0.26)
 */
export function formatCompactionMetricsLog(metrics: CompactionMetrics): string {
  const totalBefore = metrics.previousSummaryTokens + metrics.compressedTokens;
  const totalAfter = metrics.newSummaryTokens + metrics.retainedTokens;
  const ratio = totalBefore > 0 ? (totalAfter / totalBefore).toFixed(2) : "N/A";
  const llmInfo = metrics.summaryUsage
    ? `, summary_llm_in=${metrics.summaryUsage.input_tokens ?? "?"} out=${metrics.summaryUsage.output_tokens ?? "?"}`
    : "";
  // 每轮常驻净减少量：回本判断的分子，恒存在（纯算术）。
  const netInfo = `, net=${metrics.residentReductionTokens}`;
  // 有损投影幅度：只在拿到了摘要请求的实测值时输出，缺省不改变旧格式。
  const omittedTotal = (metrics.summaryExpandedMessages ?? 0) + (metrics.summaryOmittedMessages ?? 0);
  const capSuffix = metrics.summaryInputCapTokens !== undefined ? `/${metrics.summaryInputCapTokens}` : "";
  const omittedSuffix = metrics.summaryOmittedMessages !== undefined
    ? ` omitted=${metrics.summaryOmittedMessages}/${omittedTotal}` : "";
  const projectionInfo = metrics.summaryInputTokens !== undefined
    ? `, summary_in=${metrics.summaryInputTokens}${capSuffix}${omittedSuffix}`
    : "";
  // 待处理条数决定 compressedCount 的可解释性：pending=3 fold=3/3 是正常增量折叠，
  // pending=427 fold=3/427 才是空转。
  const planInfo = metrics.pendingMessageCount !== undefined
    ? `, pending=${metrics.pendingMessageCount}${metrics.plannedCompressCount !== undefined ? ` fold=${metrics.plannedCompressCount}/${metrics.pendingMessageCount}` : ""}`
    : "";
  return `[Compaction] reason=${metrics.reason} compressed=${metrics.compressedCount}->${metrics.retainedCount} msgs, tokens=${totalBefore}->${totalAfter} (ratio=${ratio})${llmInfo}${netInfo}${projectionInfo}${planInfo}`;
}

// --- 摘要锚点元数据（内容寻址哈希与失效检测） ---

export type SummarySourceMetadata = {
  sourceHash: string;
  sourceCount: number;
  schemaVersion: number;
};

export type SummarySourceMessageInput = {
  id?: string;
  role?: string;
  content?: unknown;
  tool_calls?: unknown;
};

/**
 * 共享纯函数：计算摘要锚点切片的元数据（sourceHash / sourceCount / schemaVersion）。
 *
 * 显式接收带 ID 的消息视图，不自行猜测 ID。
 * 锚点定位：通过传入的真实或本地 ID 定位 summarizedBeforeId。
 * 切片投影：统一将切片消息投影为稳定的 `local-${index}` 键（与 Runtime hashSummarySourceSlice
 * 结构对齐），仅包含 id / role / content / tool_calls（仅存在时包含）。
 * 使用 core 的纯 JS SHA-256 实现，避免依赖 Web Crypto API（RN 环境可能不提供 subtle）。
 *
 * 若 summarizedBeforeId 未提供或在 messagesWithIds 中未找到锚点，返回 undefined。
 */
export function computeSummarySourceMetadata(
  messagesWithIds: SummarySourceMessageInput[],
  summarizedBeforeId?: string,
): SummarySourceMetadata | undefined {
  if (!summarizedBeforeId) return undefined;
  const found = messagesWithIds.findIndex((m) => m.id === summarizedBeforeId);
  if (found === -1) return undefined;

  const slice = messagesWithIds.slice(0, found + 1).map((m, index) => ({
    id: `local-${index}`,
    role: m.role,
    content: m.content ?? "",
    ...(Array.isArray(m.tool_calls) ? { tool_calls: m.tool_calls } : {}),
  }));

  const sourceHash = sha256Hex(JSON.stringify(slice));
  return {
    sourceHash,
    sourceCount: found + 1,
    schemaVersion: COMPACTION_SUMMARY_SCHEMA_VERSION,
  };
}

/** Bounded, content-free source fingerprints. ID changes are separate from the
 * content hash (runtime IDs are reassigned on persistence). canonicalHash is
 * diagnostic only: nested key ordering MUST NOT weaken source validation. */
export function buildSummarySourceDiagnostics(
  messages: SummarySourceMessageInput[], anchor?: string,
): { start: number; count: number; idHash: string; messageHash: string; canonicalHash: string }[] {
  const end = anchor ? messages.findIndex(message => message.id === anchor) : -1;
  if (end < 0) return [];
  const width = Math.max(1, Math.ceil((end + 1) / 64));
  const sorted = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(sorted);
    if (value && typeof value === "object") return Object.fromEntries(
      Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
        .map(([key, child]) => [key, sorted(child)]),
    );
    return value;
  };
  const rows = [];
  for (let start = 0; start <= end; start += width) {
    const group = messages.slice(start, Math.min(end + 1, start + width));
    const content = group.map(message => ({ role: message.role, content: message.content ?? "",
      ...(Array.isArray(message.tool_calls) ? { tool_calls: message.tool_calls } : {}) }));
    rows.push({ start, count: group.length,
      idHash: sha256Hex(JSON.stringify(group.map(message => message.id ?? null))).slice(0, 16),
      messageHash: sha256Hex(JSON.stringify(content)).slice(0, 16),
      canonicalHash: sha256Hex(JSON.stringify(sorted(content))).slice(0, 16) });
  }
  return rows;
}
