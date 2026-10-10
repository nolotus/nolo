import { clipCompactText } from "core/clipCompactText";
import { isRecord } from "core/isRecord";
import { asOptionalFiniteNumber } from "core/optionalNumber";
import { asOptionalTrimmedString } from "core/optionalString";
import { asRecordOrEmpty } from "core/recordOrEmpty";
import { asTrimmedString } from "core/trimmedString";

const HIDDEN_ORCHESTRATOR_TOOL_NAMES: Record<string, true> = {};

const HIDDEN_SERVER_ONLY_BROWSER_TOOL_NAMES: Record<string, true> = {
  queryModelUsage: true,
  createAgentAutomation: true,
  updateAgentAutomation: true,
  deleteAgentAutomation: true,
  notifyUser: true,
};

const DEFAULT_EXPANDED_TOOL_NAMES: Record<string, true> = {
  applyDiff: true,
  prepareAgentDraft: true,
  createAgent: true,
  geminiFlashImage: true,
  openAIGptImage: true,
  openAIGptImageGenerate: true,
  chatgptWebImageGenerate: true,
  openAIGptImageEdit: true,
  appDeploy: true,
  ziweiChart: true,
  runStreamingAgent: true,
  read_x_post: true,
  ask_user: true,
  createTable: true,
};

const SUMMARY_EMOJI_PREFIX =
  /^(\p{Emoji_Presentation}|\p{Extended_Pictographic}|\[[vx!]\])\s*/u;

const SUMMARY_META_PREFIX = /^\[.*?\]\s*/;
const SUMMARY_COMMAND_PREFIX = /^command:\s*/i;

function cleanSummaryText(value: string): string {
  return value
    .replace(SUMMARY_META_PREFIX, "")
    .replace(SUMMARY_COMMAND_PREFIX, "")
    .replace(SUMMARY_EMOJI_PREFIX, "")
    .trim();
}

function formatStructuredSummary(
  summary: Record<string, unknown>,
  toolName?: string
): string {
  const total = asOptionalFiniteNumber(summary.total);
  const succeeded = asOptionalFiniteNumber(summary.succeeded);
  const failed = asOptionalFiniteNumber(summary.failed);

  const compactPairs = Object.entries(summary)
    .flatMap(([key, value]) =>
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
        ? [`${key}: ${String(value)}`]
        : [],
    )
    .slice(0, 3);

  return compactPairs.join(" · ");
}

// ─── Agent-run tool presentation (startAgentRun / controlAgentRun / listAgents) ───

/** UI-facing labels for the agent-run tool family. Technical keys (agentKey,
 * runId, action verbs) stay verbatim; labels are presentation-only and never
 * serialized back into model messages. */
export type AgentRunToolTranslate = (key: string, fallback: string) => string;

export type AgentRunPresentation = {
  /** One-line header: "启动子任务 · 前端实现员" — never raw JSON. */
  titleText: string;
  /** Localized run status label for the detail body. */
  statusLabel: string;
  /** Localized detail rows (agent / run / count). */
  agentLabel: string;
  runLabel: string;
  countLabel?: string;
  agentText?: string;
  runText?: string;
  countText?: string;
};

const AGENT_RUN_STATUS_I18N: Record<string, { key: string; fallback: string }> = {
  pending: { key: "agentRun.statusPending", fallback: "等待中" },
  queued: { key: "agentRun.statusPending", fallback: "等待中" },
  running: { key: "agentRun.statusRunning", fallback: "运行中" },
  done: { key: "agentRun.statusDone", fallback: "已完成" },
  completed: { key: "agentRun.statusDone", fallback: "已完成" },
  failed: { key: "agentRun.statusFailed", fallback: "失败" },
  timeout: { key: "agentRun.statusFailed", fallback: "失败" },
  killed: { key: "agentRun.statusCancelled", fallback: "已停止" },
  cancelled: { key: "agentRun.statusCancelled", fallback: "已停止" },
  cancelling: { key: "agentRun.statusCancelled", fallback: "已停止" },
  orphaned: { key: "agentRun.statusOrphaned", fallback: "已失联" },
  not_found: { key: "agentRun.statusUnknown", fallback: "未知" },
  unknown: { key: "agentRun.statusUnknown", fallback: "未知" },
};

export function resolveAgentRunStatusLabel(
  status: string | undefined,
  translate?: AgentRunToolTranslate,
): string {
  const entry = AGENT_RUN_STATUS_I18N[asTrimmedString(status)] ?? AGENT_RUN_STATUS_I18N.unknown;
  const t = translate ?? ((_k, fb) => fb);
  const value = asOptionalTrimmedString(t(entry.key, entry.fallback));
  return value && value !== entry.key ? value : entry.fallback;
}

const AGENT_RUN_ACTION_I18N: Record<string, { key: string; fallback: string }> = {
  list: { key: "controlActions.list", fallback: "列出运行" },
  status: { key: "controlActions.status", fallback: "查看运行状态" },
  stop: { key: "controlActions.stop", fallback: "停止运行" },
  append: { key: "controlActions.append", fallback: "追加指令" },
  wait: { key: "controlActions.wait", fallback: "等待运行" },
};

/** Readable UI-only label for a controlAgentRun action; raw verbs like
 * `stop` never render in the user-facing summary. */
export function resolveAgentRunActionLabel(
  action: string | undefined,
  translate?: AgentRunToolTranslate,
): string {
  const raw = asTrimmedString(action);
  const entry = raw ? AGENT_RUN_ACTION_I18N[raw] : undefined;
  if (!entry) return raw;
  const t = translate ?? ((_k, fb) => fb);
  const value = asOptionalTrimmedString(t(entry.key, entry.fallback));
  return value && value !== entry.key ? value : entry.fallback;
}

function pickAgentRunAgent(
  raw: Record<string, unknown>,
  input: Record<string, unknown>,
): string {
  return readString(
    raw.agentName,
    raw.name,
    input.agentName,
    input.name,
    raw.agentKey,
    input.agentKey,
  );
}

/** Runs list summary for controlAgentRun with action=list / listAgents results.
 * Reads real payload fields only (runs[]/agents[] length or explicit total) —
 * never guesses; returns undefined when no count evidence exists. */
export function extractAgentRunCount(raw: Record<string, unknown>): number | undefined {
  // `total` is the true total; `count` is the page count when paginated —
  // prefer total so a list of 200 doesn't read as "20 条运行".
  const direct = asOptionalFiniteNumber(raw.total) ?? asOptionalFiniteNumber(raw.count);
  if (typeof direct === "number" && direct >= 0) return direct;
  if (Array.isArray(raw.runs)) return raw.runs.length;
  if (Array.isArray(raw.agents)) return raw.agents.length;
  return undefined;
}

function interpolateTemplate(template: string, count: number): string {
  return template.replace("{{count}}", String(count));
}

/**
 * One shared presenter for the agent-run tool family (startAgentRun,
 * controlAgentRun, listAgents). Produces the localized first-line summary
 * plus detail labels so web/RN rows never dump the full JSON blob as the
 * primary summary. `translate` is optional — omitting it keeps the zh
 * defaults so tests / SSR / legacy callers stay readable.
 */
export function buildAgentRunPresentation(args: {
  toolName?: string;
  rawData?: unknown;
  toolPayload?: unknown;
  inputArgs?: unknown;
  status?: string;
  isStreaming?: boolean;
  isError?: boolean;
  translate?: AgentRunToolTranslate;
}): AgentRunPresentation {
  const t = args.translate ?? ((_k, fb) => fb);
  const raw = asRecordOrEmpty(args.rawData);
  const payload = asRecordOrEmpty(args.toolPayload);
  const input = asRecordOrEmpty(
    isRecord(payload.input) ? payload.input : args.inputArgs,
  );

  const toolKey = asTrimmedString(args.toolName);
  const toolLabel = asOptionalTrimmedString(
    t(`toolNames.${toolKey}`, ""),
  );
  const verbLabel = asOptionalTrimmedString(
    t(`toolVerbs.${toolKey}`, ""),
  );
  const nameFallback =
    toolKey === "controlAgentRun"
      ? "控制运行"
      : toolKey === "listAgents"
        ? "列出助手"
        : "启动子任务";
  const toolText =
    (verbLabel && verbLabel !== `toolVerbs.${toolKey}` && verbLabel) ||
    (toolLabel && toolLabel !== `toolNames.${toolKey}` && toolLabel) ||
    nameFallback;

  // Run status comes from the run payload (raw.status → run lifecycle), NOT
  // the tool-execution status (payload.status = tool succeeded/failed — a
  // successful startAgentRun dispatch does not mean the child run finished).
  // args.status is honored only when it is a real run status, never a
  // tool-completion verb like "succeeded".
  const TOOL_COMPLETION_STATUSES = new Set(["succeeded", "ok", "success"]);
  const argStatus = asTrimmedString(args.status);
  const status: string = args.isStreaming
    ? "running"
    : args.isError
      ? "failed"
      : argStatus && !TOOL_COMPLETION_STATUSES.has(argStatus)
        ? argStatus
        : readString(raw.status, payload.status);
  const statusLabel = resolveAgentRunStatusLabel(status, t);

  const agentText = pickAgentRunAgent(raw, input) || undefined;
  const runId = readString(raw.runId, payload.runId, input.runId);
  const runText = runId ? runId : undefined;
  const count = extractAgentRunCount(raw);

  const action = readString(input.action, raw.action, payload.action);
  const actionLabel = resolveAgentRunActionLabel(action, t);

  // Runs vs agents: listAgents counts assistants, controlAgentRun list
  // counts runs — same count semantics, different nouns per locale.
  const countKey =
    toolKey === "listAgents" ? "agentRun.agentCountLabel" : "agentRun.countLabel";
  const countFallback =
    toolKey === "listAgents" ? "{{count}} 个助手" : "{{count}} 条运行";
  const countLabel = asOptionalTrimmedString(t(countKey, countFallback));
  const countLabelValue =
    count !== undefined
      ? interpolateTemplate(
          countLabel && countLabel !== countKey ? countLabel : countFallback,
          count,
        )
      : undefined;

  // Run title (user-supplied) or clipped taskPreview disambiguates parallel
  // runs of the same agent — without it two "前端实现员" rows look identical.
  const taskText = readString(
    raw.title,
    input.title,
    raw.taskPreview,
    input.taskPreview,
  );
  const runTitle = taskText ? clipCompactText(taskText, 60, "…") : "";

  // First line: "启动子任务 · <agent> · <task>" / "控制运行 · 停止运行" /
  // "列出助手 · 3 个助手" — a readable summary, never a JSON blob.
  const titleParts = [toolText];
  if (agentText) titleParts.push(agentText);
  if (runTitle) titleParts.push(runTitle);
  else if (
    toolKey === "controlAgentRun" &&
    actionLabel &&
    actionLabel !== action &&
    // list already conveys "runs" via the count; repeating 列出运行·N 条运行
    // reads redundant on narrow screens.
    !(count !== undefined && action === "list")
  )
    titleParts.push(actionLabel);
  if (countLabelValue) titleParts.push(countLabelValue);
  const titleText = titleParts.filter(Boolean).join(" · ");

  const agentLabel = asOptionalTrimmedString(t("agentRun.agentLabel", "助手"));
  const runLabel = asOptionalTrimmedString(t("agentRun.runLabel", "运行"));

  return {
    titleText,
    statusLabel,
    agentLabel:
      agentLabel && agentLabel !== "agentRun.agentLabel" ? agentLabel : "助手",
    runLabel:
      runLabel && runLabel !== "agentRun.runLabel" ? runLabel : "运行",
    ...(countLabelValue ? { countLabel: countLabelValue } : {}),
    ...(agentText ? { agentText } : {}),
    ...(runText ? { runText } : {}),
    ...(countLabelValue ? { countText: countLabelValue } : {}),
  };
}

export function normalizeToolDisplaySummary(
  summary: unknown,
  toolName?: string
): string {
  if (isRecord(summary)) {
    if (toolName === "startAgentRun") {
      const title = asOptionalTrimmedString(summary.title);
      const agent =
        asOptionalTrimmedString(summary.agentName) ??
        asOptionalTrimmedString(summary.name) ??
        asOptionalTrimmedString(summary.agentKey);
      if (title && agent) return `${title} (${agent})`;
      if (title) return title;
      if (agent) return agent;
    }
    if (toolName === "controlAgentRun") {
      const action = asOptionalTrimmedString(summary.action);
      const runId = asOptionalTrimmedString(summary.runId) ?? asOptionalTrimmedString(summary.batchId);
      if (action && runId) return `${action} · ${runId}`;
      if (action) return action;
      if (runId) return runId;
    }
  }

  if (typeof summary === "string") {
    const cleaned = cleanSummaryText(summary);
    if (cleaned) return cleaned;
  }

  if (isRecord(summary)) {
    const structured = cleanSummaryText(
      formatStructuredSummary(summary, toolName)
    );
    if (structured) return structured;
  }

  return cleanSummaryText(toolName || "");
}

export function isHiddenOrchestratorToolMessage(
  message: { role?: string; toolName?: string } | null | undefined
): boolean {
  return (
    message?.role === "tool" &&
    typeof message.toolName === "string" &&
    Boolean(HIDDEN_ORCHESTRATOR_TOOL_NAMES[message.toolName] ||
      HIDDEN_SERVER_ONLY_BROWSER_TOOL_NAMES[message.toolName])
  );
}

export function shouldToolMessageStartCollapsed(toolName?: string | null): boolean {
  const normalized = asTrimmedString(toolName);
  if (!normalized) return true;
  return !DEFAULT_EXPANDED_TOOL_NAMES[normalized];
}

/**
 * 报价完成、等待用户选档的媒体工具卡必须默认可见。
 *
 * 这里把「有未决用户交互」表达成**数据条件**（job.status === "quoted" 且
 * rawData 带有效 quote/tiers），而不是给 mediaJobTool 一刀切永远展开——
 * 任务一旦 start / done / failed，条件不成立，行仍按既有策略折叠。
 */
export function shouldKeepToolRowExpanded(args: {
  toolName?: string | null;
  rawData?: unknown;
  statusStr?: string | null;
}): boolean {
  if (asTrimmedString(args.toolName) !== "mediaJobTool") return false;
  if (args.statusStr !== "success") return false;
  const data = asRecordOrEmpty(args.rawData);
  const inner = asRecordOrEmpty(data.rawData);
  const job = asRecordOrEmpty(data.job ?? inner.job);
  const tiers = Array.isArray(data.tiers)
    ? data.tiers
    : Array.isArray(inner.tiers)
      ? inner.tiers
      : [];
  const hasQuotedTiers =
    tiers.length > 0 &&
    tiers.every((tier) => isRecord(tier) && isRecord((tier as any).quote));
  const hasQuote =
    isRecord(data.quote) || isRecord(inner.quote) || isRecord(job.quote);
  return job.status === "quoted" && (hasQuotedTiers || hasQuote);
}

/**
 * 媒体任务 start 被确认闸门拦下（等待用户在卡片上点「确认启动」）。
 *
 * 三种证据任一成立即视为待确认，而非失败：
 * - 新载荷：工具 rawData 带 pendingStart（mediaJobTool 拦截时写入）；
 * - toolPayload.status === "pending"（toolThunks 确认分支）；
 * - 旧持久化载荷：content 为 { error: "*_requires_confirmation" }（历史 fallback）。
 */
export function isMediaJobPendingConfirmation(args: {
  toolName?: string | null;
  rawData?: unknown;
  toolPayload?: unknown;
}): boolean {
  if (asTrimmedString(args.toolName) !== "mediaJobTool") return false;
  const data = asRecordOrEmpty(args.rawData);
  if (isRecord(data.pendingStart)) return true;
  if (asRecordOrEmpty(args.toolPayload).status === "pending") return true;
  return (
    typeof data.error === "string" && data.error.endsWith("_requires_confirmation")
  );
}

const parseJsonRecordOrNull = (value: unknown): unknown => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

/**
 * 同一条数据条件作用在**整条 tool message** 上（content 可能是 JSON 字符串），
 * 供 group 折叠策略、ToolCallRow 默认展开、ToolMessageItem 共用，避免媒体特判。
 */
export function toolMessageNeedsDefaultExpansion(message: any): boolean {
  if (!message || message.role !== "tool") return false;
  const toolName = message.toolName ?? message?.toolPayload?.toolName;
  const rawData = message.rawData ?? parseJsonRecordOrNull(message.content);
  // 待确认启动卡同样是未决交互：藏起来等于用户找不到「确认启动」按钮。
  if (
    !message.isStreaming &&
    isMediaJobPendingConfirmation({ toolName, rawData, toolPayload: message.toolPayload })
  ) {
    return true;
  }
  const statusStr = message.isStreaming
    ? "running"
    : message?.toolPayload?.status === "failed" || message?.error
      ? "failed"
      : "success";
  return shouldKeepToolRowExpanded({ toolName, rawData, statusStr });
}

/** Char threshold: tool body text above this is previewed until user expands. */
export const TOOL_OUTPUT_PREVIEW_CHARS = 4_000;
/** Line threshold used with char limit for long dumps / shell / code. */
export const TOOL_OUTPUT_PREVIEW_LINES = 120;
/**
 * Content payload size that forces the tool row to start collapsed even for
 * tools that normally open (keeps huge JSON/logs out of the first paint).
 */
export const TOOL_FORCE_COLLAPSE_CONTENT_CHARS = 8_000;

export function measureToolText(text: string): { chars: number; lines: number } {
  if (!text) return { chars: 0, lines: 0 };
  let lines = 1;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) lines += 1;
  }
  return { chars: text.length, lines };
}

export function shouldPreviewToolText(
  text: string,
  charLimit: number = TOOL_OUTPUT_PREVIEW_CHARS,
  lineLimit: number = TOOL_OUTPUT_PREVIEW_LINES
): boolean {
  if (!text) return false;
  if (text.length > charLimit) return true;
  return measureToolText(text).lines > lineLimit;
}

/**
 * Build a short preview of long tool body text for default-collapsed DOM.
 * Prefer cutting on a newline so the truncated block stays readable.
 */
export function previewToolText(
  text: string,
  charLimit: number = TOOL_OUTPUT_PREVIEW_CHARS,
  lineLimit: number = TOOL_OUTPUT_PREVIEW_LINES
): {
  preview: string;
  truncated: boolean;
  totalChars: number;
  totalLines: number;
} {
  const { chars: totalChars, lines: totalLines } = measureToolText(text || "");
  if (!text) {
    return { preview: "", truncated: false, totalChars: 0, totalLines: 0 };
  }
  if (totalChars <= charLimit && totalLines <= lineLimit) {
    return { preview: text, truncated: false, totalChars, totalLines };
  }

  let preview = text.slice(0, Math.min(charLimit, text.length));
  const lastNl = preview.lastIndexOf("\n");
  if (lastNl > charLimit * 0.5) {
    preview = preview.slice(0, lastNl);
  }

  // Enforce line limit on the already char-trimmed slice.
  let lineCount = 1;
  let cutAt = preview.length;
  for (let i = 0; i < preview.length; i++) {
    if (preview.charCodeAt(i) === 10) {
      lineCount += 1;
      if (lineCount > lineLimit) {
        cutAt = i;
        break;
      }
    }
  }
  if (cutAt < preview.length) {
    preview = preview.slice(0, cutAt);
  }

  // Avoid empty preview for a single giant line.
  if (!preview && text.length > 0) {
    preview = text.slice(0, Math.min(charLimit, text.length));
  }

  return {
    preview,
    truncated: preview.length < text.length,
    totalChars,
    totalLines,
  };
}

/** Estimate content size without full stringify of huge objects when possible. */
export function estimateToolContentChars(content: unknown): number {
  if (content == null) return 0;
  if (typeof content === "string") return content.length;
  if (typeof content === "number" || typeof content === "boolean") {
    return String(content).length;
  }
  if (Array.isArray(content)) {
    // Cheap upper bound: avoid deep walk of huge arrays on every render.
    try {
      return JSON.stringify(content).length;
    } catch {
      return content.length * 16;
    }
  }
  if (typeof content === "object") {
    try {
      return JSON.stringify(content).length;
    } catch {
      return 0;
    }
  }
  return 0;
}

/**
 * Whether a tool row should start collapsed, including oversized payload force-collapse.
 * Confirm banners / errors stay open so the user can act.
 */
export function shouldToolMessageRowStartCollapsed(args: {
  toolName?: string | null;
  content?: unknown;
  isError?: boolean;
  forceOpen?: boolean;
}): boolean {
  if (args.forceOpen || args.isError) return false;
  const size = estimateToolContentChars(args.content);
  if (size >= TOOL_FORCE_COLLAPSE_CONTENT_CHARS) return true;
  return shouldToolMessageStartCollapsed(args.toolName);
}

type HandoffStatus = "running" | "failed" | "success";

export interface RunStreamingAgentHandoffPresentation {
  summary: string;
  inline: boolean;
  targetLabel: string;
  agentKey: string;
  inputSummary: string;
  statusLabel: string;
  targetDialogKey: string;
  targetSpaceId?: string;
}

const INPUT_SUMMARY_LIMIT = 180;
const KNOWN_AGENT_LABELS: Record<string, string> = {
  "agent-pub-01ECOMMERCEAG00000001PYQ2J": "电商商品参数助手",
  "agent-pub-01APPBUILDER00000001YAII3I": "应用构建助手",
};

function readString(...values: unknown[]): string {
  for (const value of values) {
    const trimmed = asOptionalTrimmedString(value);
    if (trimmed) return trimmed;
  }
  return "";
}

function compactText(value: unknown, fallback = ""): string {
  const raw =
    typeof value === "string"
      ? value
      : typeof value === "number" || typeof value === "boolean"
        ? String(value)
        : fallback;
  return clipCompactText(raw, INPUT_SUMMARY_LIMIT, "…");
}

function resolveStatusLabel(
  toolPayload: Record<string, unknown> | null | undefined,
  status: HandoffStatus,
  translate?: AgentRunToolTranslate
): string {
  const t = translate ?? ((_k, fb) => fb);
  const resolve = (key: string, fallback: string): string => {
    const value = asOptionalTrimmedString(t(key, fallback));
    return value && value !== key ? value : fallback;
  };
  const payloadStatus = readString(toolPayload?.status);
  if (status === "running" || payloadStatus === "running")
    return resolve("agentRun.handoffRunning", "处理中");
  if (status === "failed" || payloadStatus === "failed")
    return resolve("agentRun.handoffFailed", "交接失败");
  if (payloadStatus === "pending")
    return resolve("agentRun.statusPending", "等待中");
  return resolve("agentRun.handoffDone", "已交接");
}

export function buildRunStreamingAgentHandoffPresentation(args: {
  rawData?: unknown;
  toolPayload?: unknown;
  isStreaming?: boolean;
  isError?: boolean;
  /** Optional UI translate — when omitted, zh defaults keep tests readable. */
  translate?: AgentRunToolTranslate;
}): RunStreamingAgentHandoffPresentation {
  const t = args.translate ?? ((_k, fb) => fb);
  const raw = asRecordOrEmpty(args.rawData);
  const payload = asRecordOrEmpty(args.toolPayload);
  const input = asRecordOrEmpty(payload.input);

  const agentKey = readString(raw.agentKey, input.agentKey);
  const agentName = readString(raw.agentName, input.agentName, KNOWN_AGENT_LABELS[agentKey]);
  const inline = raw.inline === true || raw.handoff === true;
  const targetLabel = agentName || agentKey || "Agent";
  const userInput = readString(raw.userInput, input.userInput, input.task);
  const status: HandoffStatus = args.isStreaming
    ? "running"
    : args.isError
      ? "failed"
      : "success";

  const summaryTemplate = asOptionalTrimmedString(
    t("agentRun.handoffSummary", "已交给 {{agent}} 处理"),
  );
  const summary =
    summaryTemplate && summaryTemplate !== "agentRun.handoffSummary"
      ? summaryTemplate.replace("{{agent}}", targetLabel)
      : `已交给 ${targetLabel} 处理`;
  const inputFallback = asOptionalTrimmedString(
    t("agentRun.noInputSummary", "未记录输入摘要"),
  );

  return {
    summary,
    inline,
    targetLabel,
    agentKey,
    inputSummary: compactText(
      userInput,
      inputFallback && inputFallback !== "agentRun.noInputSummary"
        ? inputFallback
        : "未记录输入摘要",
    ),
    statusLabel: resolveStatusLabel(payload, status, args.translate),
    targetDialogKey: readString(
      raw.dialogKey,
      raw.subDialogKey,
      payload.subDialogKey,
      payload.subDialogId
    ),
    targetSpaceId: readString(raw.spaceId, payload.spaceId) || undefined,
  };
}
