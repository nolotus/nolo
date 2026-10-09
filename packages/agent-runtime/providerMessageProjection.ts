// packages/agent-runtime/providerMessageProjection.ts
// Provider-visible message projection（纯函数层）。
//
// 职责：把 durable 历史/turn 内消息投影为 provider 可见请求消息。核心不变量：
// 1. 持久化历史不被改写：所有函数输入只读，返回新对象，绝不 mutate 入参。
// 2. 投影幂等：同一 (content, toolName, metadata) 输入反复投影逐字节相同
//    （stable provider-visible projection，见 docs/plans/2026-09-05-tool-output-cache-stability.md）。
// 3. 单一投影函数：fresh 消息、同 turn 历史、跨 turn 重建（prepareHistoryForNextTurn）
//    与压缩重建共用 projectToolContentForProvider 的同一预算与 label，前缀缓存不漂移。
// 4. 纯函数：无 DB/网络/日志副作用；唯一例外是超预算输出经 spillToolOutput 内容寻址
//    落盘（(toolName, content) 纯函数，失败 fail-open 不影响投影文本）。
//
// runLocalAgentTurn 主状态机不在这里；这里只有消息形状变换。
import { clipCompactText } from "core/clipCompactText";
import type {
  AgentRuntimeChatMessage,
  AgentRuntimeMessageContent,
  AgentRuntimeOutputBlock,
  AgentRuntimeToolCall,
} from "./types";
import type { AgentExecutionContextMetrics } from "./executionObservation";
import { sanitizeToolCallPairing } from "./toolCallPairing";
import {
  clipToolText,
  resolveToolOutputProfile,
} from "../ai/agent/toolOutputPolicy";
import { spillToolOutput } from "./toolSpillStore";
import { planContextUsage } from "../ai/context/retention";
import { estimateTokenCount } from "../ai/context/tokenUtils";
import { getModelContextWindow } from "../ai/llm/getModelContextWindow";
import { stripImagePartsFromMessages } from "../ai/agent/imagePreprocessing";
import { downgradeUnparsableToolCalls } from "./outboundHistorySanitize";
import {
  estimateContextTokens,
  hashStablePrefixContent,
} from "../ai/agent/contextCompiler";
import type { ContextBlockScope } from "./contextBlockScope";
import { scrubObjectSecrets, scrubSecrets } from "./secretScrubber";

/**
 * 纯观测字段：只随 tool_result_metadata 持久化，不进入模型可见内容。
 *
 * 新增这类字段时有**三处**必须同时确认，漏一处就会出事：
 *  1. 加进下面的 OBSERVATION_ONLY_METADATA_KEYS —— 否则 formatToolMessageContent
 *     会把它拼进 globFiles/codeSearch/readFile 三个工具发给模型的 prompt 字节。
 *  2. 确认它不在 compactToolMetadata 的 TOOL_METADATA_KEYS 允许清单里 ——
 *     那条路（in-turn 投影与跨轮历史摘要共用）是白名单制，另一道独立闸门。
 *  3. **不要**把它混进推给 progressGuard 的 executedToolResults ——
 *     buildToolResultsSignature 对 metadata 整体做指纹，掺进任何逐次抖动的值
 *     都会让 repetition_loop / stagnant_tool_calls 两条死循环熔断静默失效。
 *     这一条被真实踩中过（见 executedToolResults.push 处的注释）。
 */
export const TOOL_DURATION_METADATA_KEY = "toolExecMs";
const OBSERVATION_ONLY_METADATA_KEYS = new Set<string>([
  TOOL_DURATION_METADATA_KEY,
]);

export function formatToolMessageContent(args: {
  toolName: string;
  content: string;
  metadata?: Record<string, unknown>;
}) {
  const scrubbedContent = scrubSecrets(args.content).cleaned;
  if (
    (
      args.toolName !== "globFiles" &&
      args.toolName !== "codeSearch" &&
      args.toolName !== "readFile"
    ) ||
    !args.metadata ||
    Object.keys(args.metadata).length === 0
  ) {
    return scrubbedContent;
  }
  // 剔除纯观测字段后再判空：只带观测字段的 metadata 必须与「无 metadata」
  // 走同一条路径，否则会凭空多出一个空的 [tool metadata] 块。
  const visible: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args.metadata)) {
    if (!OBSERVATION_ONLY_METADATA_KEYS.has(key)) {
      visible[key] = scrubObjectSecrets(value);
    }
  }
  if (Object.keys(visible).length === 0) return scrubbedContent;
  return `${scrubbedContent}\n\n[tool metadata]\n${JSON.stringify(visible)}`;
}

/**
 * 把 provider 返回的有序 output blocks（text→toolCall→text）展开为 OpenAI 扁平消息：
 * assistant(text_before | null, tool_calls[]) → tool(tool_call_id, content) → …
 * 连续 toolCall 无中间 text → 合并进同一条 assistant 的 tool_calls[]。
 * thinking → 折进该段 assistant 的 reasoning_content（不单独成 role）。
 * 末尾 text → 追加一条无 tool_calls 的 assistant。
 * 仅供 localLoop output 分支调用，不重跑工具（result 已由流内执行填充）。
 */
export function blocksToOpenAiMessages(
  blocks: AgentRuntimeOutputBlock[],
): AgentRuntimeChatMessage[] {
  const out: AgentRuntimeChatMessage[] = [];
  let text = "";
  let reasoning = "";
  let pendingToolCalls: AgentRuntimeToolCall[] = [];
  let pendingToolResults: { content: string; metadata?: Record<string, unknown> }[] = [];

  const flushSegment = () => {
    if (text === "" && pendingToolCalls.length === 0 && reasoning === "") return;
    out.push({
      role: "assistant",
      content: text || null,
      ...(reasoning ? { reasoning_content: reasoning } : {}),
      ...(pendingToolCalls.length > 0 ? { tool_calls: pendingToolCalls } : {}),
    });
    for (let i = 0; i < pendingToolCalls.length; i += 1) {
      const tc = pendingToolCalls[i];
      const res = pendingToolResults[i];
      out.push({
        role: "tool",
        content: formatToolMessageContent({
          toolName: tc.function.name,
          content: res?.content ?? "",
          ...(res?.metadata ? { metadata: res.metadata } : {}),
        }),
        tool_call_id: tc.id,
        toolName: tc.function.name,
        ...(res?.metadata ? { tool_result_metadata: res.metadata } : {}),
      });
    }
    text = "";
    reasoning = "";
    pendingToolCalls = [];
    pendingToolResults = [];
  };

  for (const block of blocks) {
    if (block.type === "text") {
      // toolCalls 已挂起 → 先 flush assistant+tools，再开新 text 段
      if (pendingToolCalls.length > 0) {
        flushSegment();
      }
      text += block.text;
      continue;
    }
    if (block.type === "thinking") {
      reasoning += block.thinking;
      continue;
    }
    if (block.type === "toolCall") {
      pendingToolCalls.push(block.toolCall);
      pendingToolResults.push({
        content: block.result?.content ?? "",
        ...(block.result?.metadata ? { metadata: block.result.metadata } : {}),
      });
    }
  }
  flushSegment();
  return out;
}

const TOOL_METADATA_KEYS = [
  "path",
  "query",
  "effectivePattern",
  "startLine",
  "endLine",
  "totalLines",
  "totalBytes",
  "bytes",
  "totalChars",
  "count",
  "matchCount",
  "matchedFiles",
  "truncated",
  "limitedByMaxResults",
  "limitedByMaxDepth",
  "visitedEntries",
  "maxResults",
  "exitCode",
  "status",
  "timedOut",
  "aborted",
  "replacements",
  "code",
  "error",
  "message",
  "warnings",
  "pasteId",
  "source",
] as const;

/**
 * 按模型上下文预算裁掉最老的历史消息。
 *
 * 为什么需要：localLoop 此前把完整历史无条件发给 provider，没有任何窗口或压缩。
 * 实测本地对话里有末轮上下文达 10.2M token 的会话，而 deepseek-v4-flash 的窗口
 * 是 100 万——这类请求要么失败，要么被 provider 静默截断（模型在缺失上下文的
 * 情况下继续作答，且无人知晓）。
 *
 * 预算判定复用 web 端同一个纯函数 `planContextUsage`，不在 CLI 侧另造一套阈值。
 * 该规划器是 cache-first 的：1M 窗口模型的历史预算约 94 万 token，所以本裁剪
 * 只在接近撞窗口时才生效，正常会话完全不受影响、provider 前缀缓存不被破坏。
 *
 * 裁剪后必须过 `sanitizeToolCallPairing`：从头部丢消息可能丢掉声明 tool_calls 的
 * assistant 却留下对应的 tool 结果，provider 会直接报错。
 */
export function trimHistoryToContextBudget(
  history: AgentRuntimeChatMessage[],
  model: string | undefined,
  contextWindowOverride?: number,
): { history: AgentRuntimeChatMessage[]; droppedCount: number } {
  if (history.length === 0) return { history, droppedCount: 0 };

  const { rawMessageBudget } = planContextUsage({
    contextWindow: contextWindowOverride ?? getModelContextWindow(model ?? ""),
    summaryTokens: 0,
    // localLoop 没有 web 端的负载分档器；medium 是中性默认值，
    // 不为了省几个 token 在这里复制一份分类逻辑。
    recentLoad: "medium",
  });

  // 必须用 estimateTokenCount：它是中文感知的（中文 1.5 tok/字，其他 0.25 tok/字符）。
  // 平铺 chars/4 对中文低估约 6 倍，会导致中文会话该裁不裁、照旧撞窗口。
  const messageTokens = (message: AgentRuntimeChatMessage): number => {
    const toolCalls = (message as any).tool_calls;
    return (
      estimateTokenCount(contentAsText(message.content)) +
      (Array.isArray(toolCalls) ? estimateTokenCount(JSON.stringify(toolCalls)) : 0)
    );
  };

  let used = 0;
  let start = history.length;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const cost = messageTokens(history[i]);
    // 至少保留最后一条，否则预算极小时会裁成空历史
    if (used + cost > rawMessageBudget && start < history.length) break;
    used += cost;
    start = i;
  }

  if (start === 0) return { history, droppedCount: 0 };
  return {
    history: sanitizeToolCallPairing(history.slice(start)),
    droppedCount: start,
  };
}

/** 把结构化 content 摊平成文本，供中文感知的 estimateTokenCount 使用。 */
function contentAsText(content: AgentRuntimeMessageContent): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (part?.type === "text") return part.text;
      if (part?.type === "image_url") return part.image_url.url;
      return "";
    })
    .join("\n");
}

export function contentCharCount(content: AgentRuntimeMessageContent): number {
  if (typeof content === "string") return content.length;
  if (!Array.isArray(content)) return 0;
  return content.reduce((total, part) => {
    if (part?.type === "text") return total + part.text.length;
    if (part?.type === "image_url") return total + part.image_url.url.length;
    return total;
  }, 0);
}

function compactToolMetadata(
  metadata: Record<string, unknown> | undefined,
): string {
  if (!metadata) return "";
  const selected: Record<string, unknown> = {};
  for (const key of TOOL_METADATA_KEYS) {
    const value = metadata[key];
    if (value === undefined) continue;
    if (typeof value === "string") {
      selected[key] = clipCompactText(value, 240);
      continue;
    }
    if (Array.isArray(value)) {
      selected[key] = value.slice(0, 20).map((item) =>
        typeof item === "string"
          ? clipCompactText(item, 180)
          : clipCompactText(JSON.stringify(item), 180),
      );
      continue;
    }
    selected[key] = value;
  }
  return Object.keys(selected).length > 0
    ? clipCompactText(JSON.stringify(selected), 1200)
    : "";
}

export function projectToolContentForProvider(args: {
  content: AgentRuntimeMessageContent;
  toolName?: string;
  metadata?: Record<string, unknown>;
  maxChars: number;
  label: string;
}): AgentRuntimeMessageContent {
  const content = args.content;
  if (typeof content !== "string") return content;
  const metadataText = compactToolMetadata(args.metadata);
  // Some tool formatters already append the full metadata JSON to the durable
  // content. Remove that provider-side duplicate and re-add the bounded
  // projection below so metadata cannot disappear in the clipped middle/tail.
  const embeddedMetadataIndex = metadataText
    ? content.indexOf("\n\n[tool metadata]\n")
    : -1;
  const contentForProjection = embeddedMetadataIndex >= 0
    ? content.slice(0, embeddedMetadataIndex)
    : content;
  const metadataSuffix = metadataText
    ? `\n\n[tool metadata]\n${metadataText}`
    : "";
  // Keep already-bounded durable tool messages byte-for-byte stable. This is
  // important for short read/search results whose metadata is already part of
  // the canonical message; projection is only needed once the provider bound
  // would actually be exceeded.
  if (embeddedMetadataIndex >= 0 && content.length <= args.maxChars) {
    return content;
  }
  // Idempotence guard (stable-projection contract): buildMessages projects
  // cross-turn history via summarizeHistoricalToolContent, then
  // prepareMessagesForProviderCall projects the SAME message again in the same
  // request. The second pass must be a no-op for already-projected content,
  // otherwise the diagnostic suffix would be re-clipped (initialBudget =
  // maxChars - 120 < projected length) and the bytes would drift between
  // provider calls — exactly the cache-prefix break this policy exists to
  // prevent. Only content that still fits the budget short-circuits; oversized
  // raw output is always projected.
  if (
    content.length <= args.maxChars &&
    content.includes(`\n\n[${args.label}; originalChars=`)
  ) {
    return content;
  }
  const headRatio = resolveToolOutputProfile(args.toolName).headRatio;
  const initialBudget = Math.max(
    1,
    args.maxChars - metadataSuffix.length - 120,
  );
  let clipped = clipToolText(contentForProjection, initialBudget, headRatio);
  const wasClipped = clipped.length < contentForProjection.trim().length;
  const needsProjection = wasClipped || Boolean(metadataSuffix) || embeddedMetadataIndex >= 0;
  if (!needsProjection) return args.content;

  let spillNote = "";
  if (wasClipped) {
    try {
      const spill = spillToolOutput({
        content: contentForProjection,
        toolName: args.toolName,
      });
      spillNote = `; spillFile=${spill.displayPath}; totalLines=${spill.totalLines}; hint=read full output via readFile`;
    } catch {
      // Ignore spill write failures to prevent breaking prompt generation
    }
  }

  const diagnostic = (clippedLength: number) =>
    `[${args.label}; originalChars=${content.length}; omittedChars=${Math.max(
      0,
      content.length - clippedLength,
    )}${spillNote}]`;
  const suffix = (clippedLength: number) =>
    [diagnostic(clippedLength), metadataSuffix.trimStart()]
      .filter(Boolean)
      .join("\n\n");

  let projected = wasClipped || metadataSuffix
    ? `${clipped}\n\n${suffix(clipped.length)}`
    : clipped;
  // Tighten so maxChars is a real provider bound, including metadata and the truncation marker.
  if (projected.length > args.maxChars) {
    const boundedBudget = Math.max(
      1,
      args.maxChars - suffix(clipped.length).length - 2,
    );
    clipped = clipToolText(contentForProjection, boundedBudget, headRatio);
    projected = `${clipped}\n\n${suffix(clipped.length)}`;
  }
  return projected.length <= args.maxChars
    ? projected
    : projected.slice(0, args.maxChars);
}

export type PreparedProviderMessages = {
  messages: AgentRuntimeChatMessage[];
  metrics: AgentExecutionContextMetrics;
};

// 单一稳定 label：同一条 tool 消息在 fresh、同 turn 更早轮、跨 turn 历史三个
// 投影点必须携带完全相同的诊断后缀文本，否则跨 turn 后缀变化本身就是一次
// byte 漂移（前缀缓存断裂）。沿用 in-turn 历史文本：desktop-runtime 的披露
// 折叠按 `"\n\n[in-turn tool result"` 切分，改文案会破坏该解析。
const TOOL_OUTPUT_PROJECTION_LABEL =
  "in-turn tool result truncated/projected before next provider call";

// Exported for the cross-turn retention regression test: the ledger gate in
// the read executors and this projection must agree on the same cap, or the
// dedup notice can claim "still in context" for content history already cut.
export function summarizeHistoricalToolContent(
  content: AgentRuntimeMessageContent,
  toolName?: string,
  metadata?: Record<string, unknown>,
): AgentRuntimeMessageContent {
  return projectToolContentForProvider({
    content,
    toolName,
    metadata,
    // Stable projection contract: the SAME per-tool profile budget and label
    // as prepareMessagesForProviderCall, so the first provider-visible
    // representation of a tool execution is byte-identical on every later
    // round and across turns. Read-family profiles keep their ledger cap
    // (4800); unprofiled tools use the default profile (4000) instead of the
    // old flat 1600 — a historical rewrite below the fresh budget was itself
    // a cache-prefix break (see docs/plans/2026-09-05-tool-output-cache-stability.md).
    maxChars: resolveToolOutputProfile(toolName).maxChars,
    label: TOOL_OUTPUT_PROJECTION_LABEL,
  });
}

export function prepareMessagesForProviderCall(
  messages: AgentRuntimeChatMessage[],
): PreparedProviderMessages {
  // 发 provider 前的唯一咽喉点：先修掉 tool_calls/tool 配对违规（孤儿 tool、悬空 tool_calls），
  // 再走原 map。脏历史不能原样发给 OpenAI 兼容接口。
  const paired = sanitizeToolCallPairing(messages);
  // Stable provider-visible projection：所有 in-turn tool 消息（含刚产出的 fresh
  // 消息）使用与跨 turn 历史（summarizeHistoricalToolContent）完全相同的
  // per-tool 预算与 label。投影因此是 (content, toolName, metadata) 的纯函数，
  // 同一 tool execution 第一次进入 provider transcript 后每轮 byte-identical。
  // 旧「fresh 32k 宽窗口 → 非 fresh 回压 profile → 跨 turn 1.6k」三档设计会在
  // 每轮把上一轮的 tool 消息改写一次（实测 17,779 → 4,361 字符），前缀缓存
  // 从该消息起整体失效（2026-08-25 事故同类根因）。超预算部分仍由
  // projectToolContentForProvider 通过 spillToolOutput 完整落盘（内容寻址路径，
  // (toolName, content) 纯函数），provider 看到 deterministic projection +
  // spillFile 引用；durable 历史/UI 保留完整原文。fresh 窗口的质量代价由 spill
  // 重读（readFile/grep spill 文件）覆盖，属于已拍板的产品决策
  // （docs/plans/2026-09-05-tool-output-cache-stability.md，推翻
  // 2026-09-02 perf sweep 中「仅性能收益不足」的否决——本次目标是 cache ROI）。
  let toolMessageCount = 0;
  let rawToolContentChars = 0;
  let projectedToolContentChars = 0;
  let truncatedToolResults = 0;
  const projected = paired.map((message) => {
    const { context_reference: _contextReference, ...providerMessage } = message;
    const sanitizedContent =
      providerMessage.content == null
        ? ""
        : typeof providerMessage.content === "string"
          ? providerMessage.content
          : providerMessage.content;

    if (providerMessage.role !== "tool") {
      return {
        ...providerMessage,
        content: sanitizedContent,
      };
    }
    toolMessageCount += 1;
    rawToolContentChars += contentCharCount(sanitizedContent);
    const projectedContent = projectToolContentForProvider({
      content: sanitizedContent,
      toolName: providerMessage.toolName,
      metadata: providerMessage.tool_result_metadata,
      maxChars: resolveToolOutputProfile(providerMessage.toolName).maxChars,
      label: TOOL_OUTPUT_PROJECTION_LABEL,
    });
    projectedToolContentChars += contentCharCount(projectedContent);
    if (contentCharCount(projectedContent) < contentCharCount(sanitizedContent)) {
      truncatedToolResults += 1;
    }
    return {
      ...providerMessage,
      content: projectedContent,
    };
  });
  return {
    messages: projected,
    metrics: {
      messageCount: projected.length,
      contentChars: projected.reduce((total, message) => total + contentCharCount(message.content), 0),
      toolMessageCount,
      rawToolContentChars,
      projectedToolContentChars,
      truncatedToolResults,
      stableContextChars: 0,
      dynamicContextChars: 0,
    },
  };
}

export function prepareHistoryForNextTurn(
  history: AgentRuntimeChatMessage[],
  contextReferenceResolver?: (reference: AgentRuntimeMessageContent) => boolean,
): AgentRuntimeChatMessage[] {
  return history.map((message) => {
    if (
      message.role === "user" &&
      message.context_reference !== undefined &&
      contextReferenceResolver?.(message.context_reference)
    ) {
      return { ...message, content: message.context_reference };
    }
    if (message.role !== "tool") return message;
    return {
      ...message,
      content: summarizeHistoricalToolContent(
        message.content,
        message.toolName,
        message.tool_result_metadata,
      ),
    };
  });
}

/**
 * 按 vision 能力过滤整条消息数组。supportsImages 为 true 时原样返回（catalog 默认）；
 * 为 false 时逐条剥离 image_url parts，保留 text/tool_calls 等其他内容。
 */
export function filterImagePartsFromMessages(
  messages: AgentRuntimeChatMessage[],
  supportsImages: boolean,
): AgentRuntimeChatMessage[] {
  if (supportsImages) return messages;
  return stripImagePartsFromMessages(messages);
}

/**
 * 发送视图组装的唯一管线：prefix（system）+ 投影后的历史 + suffix（本轮 user），
 * 再做毒丸 tool_call 降级。首轮 buildMessages 与轮内压缩后重建共用本函数，
 * 两处 context_reference 恢复、工具输出投影与毒丸降级因此不会漂移。
 *
 * 降级必须作用于拼好的完整数组：downgradeUnparsableToolCalls 为无 id 调用派生
 * 的稳定 id 依赖数组下标，和旧实现保持同一坐标。持久化历史不被改写。
 */
export function composeProviderMessages(args: {
  prefix: AgentRuntimeChatMessage[];
  history: AgentRuntimeChatMessage[];
  suffix?: AgentRuntimeChatMessage[];
  contextReferenceResolver?: (reference: AgentRuntimeMessageContent) => boolean;
}): { messages: AgentRuntimeChatMessage[]; downgraded: number } {
  return downgradeUnparsableToolCalls([
    ...args.prefix,
    ...prepareHistoryForNextTurn(args.history, args.contextReferenceResolver),
    ...(args.suffix ?? []),
  ]);
}

export type BuiltMessages = {
  messages: AgentRuntimeChatMessage[];
  /**
   * 实际发出的前缀条数（0 或 1 条 system 消息）。调用方切分
   * 「前缀 / 历史 / 本轮新增」必须用它，而不是按 prompt/contextBlocks
   * 自行推算——prompt 为空但仅有 turn-scope 块时不发 system 前缀，
   * 自行推算会多切一条。
   */
  prefixCount: number;
  stableContextChars: number;
  dynamicContextChars: number;
  /** 稳定前缀内容指纹（与 contextCompiler 同一 FNV 算法），用于 token 记录的 prefix churn 观测。 */
  stablePrefixHash?: string;
  stablePrefixEstimatedTokens?: number;
  /** 发送视图里被降级为文本的毒丸 tool_call 数（持久化历史不动）。 */
  poisonDowngraded: number;
};

export function buildMessages(args: {
  prompt?: string;
  contextBlocks?: string[];
  contextBlockScopes?: ContextBlockScope[];
  history: AgentRuntimeChatMessage[];
  input: AgentRuntimeMessageContent;
  contextReferenceResolver?: (reference: AgentRuntimeMessageContent) => boolean;
}): BuiltMessages {
  // When contextBlockScopes is provided, split into stable (session) + dynamic (turn).
  // The agent prompt is always part of the stable prefix.
  if (args.contextBlockScopes?.length) {
    const blocks = args.contextBlockScopes.filter((b) => b.content.trim());
    const stableParts = [args.prompt?.trim(), ...blocks.filter((b) => b.cacheScope === "session").map((b) => b.content)]
      .filter(Boolean);
    const dynamicParts = blocks
      .filter((b) => b.cacheScope === "turn")
      .map((b) => b.content)
      .map((block) => block.trim())
      .filter(Boolean);
    const stableContent = stableParts.join("\n\n");
    const dynamicContent = dynamicParts.join("\n\n");
    // 前缀缓存契约：turn-scope 动态块（当前时间等）绝不拼进 system 尾部。
    // system 每轮在动态块处逐秒变化，会把其身后全部历史消息的前缀缓存命中
    // 一起切断（RunInfra cached_tokens / Anthropic cache_control 都按 prompt
    // 前缀匹配；实测 113k 上下文 A/B：拼尾部 cached=0 vs 移到末尾命中 49%、
    // TTFT 5.4s→2.9s，见 packages/cli/__perf__/cachePrefixAbProbe.ts）。
    // 动态块并入末尾 user 消息头部：system(stable) + history(append-only)
    // 全程前缀稳定，每轮只有新增尾巴是天然 miss。
    const userContent: AgentRuntimeMessageContent = dynamicContent
      ? typeof args.input === "string"
        ? `${dynamicContent}\n\n${args.input}`
        : [
            { type: "text", text: dynamicContent },
            ...(Array.isArray(args.input) ? args.input : args.input ? [args.input] : []),
          ]
      : args.input;
    const prefix: AgentRuntimeChatMessage[] = stableContent
      ? [{
          role: "system" as const,
          content: stableContent,
          stable_prefix_chars: stableContent.length,
        }]
      : [];
    const composed = composeProviderMessages({
      prefix,
      history: args.history,
      suffix: [{ role: "user" as const, content: userContent }],
      contextReferenceResolver: args.contextReferenceResolver,
    });
    return {
      messages: composed.messages,
      prefixCount: prefix.length,
      poisonDowngraded: composed.downgraded,
      stableContextChars: stableContent.length,
      dynamicContextChars: dynamicContent.length,
      ...(stableContent
        ? {
            stablePrefixHash: hashStablePrefixContent(stableContent),
            stablePrefixEstimatedTokens: estimateContextTokens(stableContent),
          }
        : {}),
    };
  }

  // Fallback: plain contextBlocks (no scope split)
  const blocks = (args.contextBlocks ?? [])
    .map((block) => block.trim())
    .filter(Boolean);
  const systemContent = [args.prompt?.trim(), ...blocks]
    .filter(Boolean)
    .join("\n\n");
  const prefix: AgentRuntimeChatMessage[] = systemContent
    ? [{ role: "system" as const, content: systemContent }]
    : [];
  const composed = composeProviderMessages({
    prefix,
    history: args.history,
    suffix: [{ role: "user" as const, content: args.input }],
    contextReferenceResolver: args.contextReferenceResolver,
  });
  return {
    messages: composed.messages,
    prefixCount: prefix.length,
    poisonDowngraded: composed.downgraded,
    stableContextChars: (args.prompt?.trim() ?? "").length,
    dynamicContextChars: blocks.join("\n\n").length,
    ...(systemContent
      ? {
          stablePrefixHash: hashStablePrefixContent(systemContent),
          stablePrefixEstimatedTokens: estimateContextTokens(systemContent),
        }
      : {}),
  };
}
