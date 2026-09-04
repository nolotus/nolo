/**
 * Pure presentation mapping for ordinary grouped Web tool calls (Phase 1).
 *
 * No React / StyleX in this file: every message → display-model conversion is
 * a pure function so the mapping stays unit-testable and reusable by future
 * phases. `ToolCallRow` (web group body) consumes `ToolCallPresentation`.
 *
 * Contract (user-goal shape):
 *   verb / context? / target? / status / durationMs? / meta? / mode / expandable
 * - verb: zh action verb (修改/命令/搜索/读取/查找文件/加载技能 …), never a raw API name.
 * - target: the operand (path/query/command/url/name); context: ONLY read from
 *   fields the renderers really consume (execShell cwd, readFile startLine/endLine)
 *   — never guessed, undefined when missing.
 * - durationMs: only when startedAt/finishedAt are both finite numbers with a
 *   positive span — no synthesized timing.
 * - meta.diff: only when real persisted added/removed numbers exist on the
 *   message (never recomputed from diff text).
 * - mode: row | interactive | handoff | artifact; ordinary tools are rows.
 *   ask_user / runStreamingAgent never enter ordinary groups (groupToolEntries
 *   keeps them single), but the model can still classify their modes.
 *
 * Non-goals: named activity phases keep their dedicated renderer in
 * ToolMessageGroup; this layer carries the ordinary continuous-tool presentation.
 */
import { isRecord } from "core/isRecord";
import { asOptionalFiniteNumber } from "core/optionalNumber";
import { asOptionalTrimmedString } from "core/optionalString";
import { asTrimmedString } from "core/trimmedString";
import {
  buildFallbackActivity,
  extractToolCallArgs,
  normalizeToolNameKey,
  normalizeToolActivity,
  resolveToolDisplayName,
  shortenActivityTitle,
} from "./toolDisplayName";

/** I18n-aware translate with a hard fallback; mirrors createToolNameTranslator output. */
export type ToolCallTranslate = (key: string, fallback: string) => string;

/**
 * Status union. pending/running/success/failed/cancelled are the contract;
 * `repairing` stays as a compat extension for legacy payload statuses.
 */
export type ToolCallStatus =
  | "pending"
  | "running"
  | "success"
  | "failed"
  | "cancelled"
  | "repairing";

/** Presentation mode. Ordinary grouped calls are rows; the other modes exist
 * so interactive/handoff/artifact tools classify correctly even though they
 * never render through ToolCallRow. */
export type ToolCallMode = "row" | "interactive" | "handoff" | "artifact";

export interface ToolCallDiffMeta {
  added: number;
  removed: number;
}

export interface ToolCallMeta {
  /** Only present when real added/removed numbers are persisted on the message. */
  diff?: ToolCallDiffMeta;
}

/** Structural subset of a persisted tool message this layer reads. */
export interface ToolCallMessageInput {
  id?: string;
  dbKey?: string;
  tool_call_id?: string;
  toolCallId?: string;
  toolName?: string;
  isStreaming?: boolean;
  content?: string;
  metadata?: Record<string, unknown>;
  toolPayload?: Record<string, unknown>;
}

export interface ToolCallPresentation {
  /** Stable React key / DOM id fragment. */
  key: string;
  toolName: string;

  // ── User-goal contract fields ──
  /** zh action verb (读取/修改/命令/搜索/网页搜索/查找文件/加载技能 …). */
  verb: string;
  /** Reliable secondary context (cwd / line range). undefined unless a real field provides it. */
  context?: string;
  /** The operand: path / query / command / url / name. undefined when the tool has none. */
  target?: string;
  status: ToolCallStatus;
  /** Real wall-clock span in ms; only when both timestamps are finite and positive. */
  durationMs?: number;
  /** Extra structured facts (diff added/removed) when the message really carries them. */
  meta?: ToolCallMeta;
  mode: ToolCallMode;
  /** Ordinary rows expand inline; card/handoff/interactive modes do not. */
  expandable: boolean;

  // ── Compat aliases (Phase 1 shape; derived from the contract fields) ──
  /** Human label: explicit activity title > i18n tool display name. */
  label: string;
  /** Alias of target (activity detail fallback). Empty string when none. */
  detail: string;
  /** Formatted duration text ("850ms" / "1.2s"); null without real timing. */
  duration: string | null;
  /** Failure reason echoed as a native tooltip on the failed status dot. */
  errorMessage?: string;
}

const VALID_PAYLOAD_STATUSES = new Set<string>([
  "running",
  "pending",
  "failed",
  "cancelled",
  "repairing",
  "success",
]);

/** zh action verbs per tool family (locale-independent defaults, like toolDisplayName). */
const TOOL_VERBS: Record<string, string> = {
  readFile: "读取",
  read_file: "读取",
  readWorkspaceFile: "读取",
  writeFile: "写入",
  write_file: "写入",
  writeWorkspaceFile: "写入",
  editFile: "修改",
  edit_file: "修改",
  replaceWorkspaceText: "修改",
  applyDiff: "修改",
  globFiles: "查找文件",
  glob_files: "查找文件",
  searchWorkspace: "查找文件",
  codeSearch: "搜索",
  code_search: "搜索",
  exa_search: "网页搜索",
  firecrawl_search: "网页搜索",
  fetchWebpage: "网页抓取",
  fetch_webpage: "网页抓取",
  firecrawl_scrape: "网页抓取",
  execShell: "命令",
  exec_shell: "命令",
  shell: "命令",
  loadSkill: "加载技能",
  listAgents: "列出助手",
  readAgent: "读取助手",
  startAgentRun: "启动子任务",
  startPreview: "启动预览",
  getPreviewStatus: "预览状态",
  stopPreview: "停止预览",
  releasePreview: "释放预览",
  captureVisualState: "截图检查",
  appDeploy: "部署应用",
  setTodoList: "更新计划",
  // Not ordinary rows, but the model classifies them without leaking raw names.
  ask_user: "提问",
  runStreamingAgent: "转交",
};

/**
 * Collapse snake_case / legacy aliases onto canonical `toolVerbs.*` i18n keys
 * so the chat locale carries one entry per verb family (minimal keys).
 */
const TOOL_VERB_I18N_KEY_ALIASES: Record<string, string> = {
  read_file: "readFile",
  write_file: "writeFile",
  edit_file: "editFile",
  glob_files: "globFiles",
  code_search: "codeSearch",
  fetch_webpage: "fetchWebpage",
  exec_shell: "execShell",
  shell: "execShell",
};

/**
 * Localized action verb (P0.5): prefers `toolVerbs.<key>` from the chat
 * locale, falls back to the zh default from TOOL_VERBS. Unmapped tools keep
 * the resolveToolDisplayName chain — raw API names never leak, and an i18n
 * miss never swaps languages (key paths / empty strings keep the default).
 */
export function resolveToolCallVerb(
  toolName: string | undefined,
  normalized: string,
  translate?: ToolCallTranslate
): string {
  const fallback = TOOL_VERBS[normalized];
  if (!fallback) {
    return resolveToolDisplayName(toolName || undefined, translate);
  }
  if (!translate) return fallback;
  const key = `toolVerbs.${TOOL_VERB_I18N_KEY_ALIASES[normalized] ?? normalized}`;
  const translated = asOptionalTrimmedString(translate(key, fallback));
  // Miss shapes: createToolNameTranslator returns the fallback; naive test
  // doubles return the key path or "". Both keep the zh default.
  if (!translated || translated === key) return fallback;
  return translated;
}

/** Tools that render dedicated cards instead of expandable rows. */
const ARTIFACT_MODE_TOOLS = new Set([
  "applyDiff",
  "prepareAgentDraft",
  "createAgent",
  "updateAgent",
  "geminiFlashImage",
  "openAIGptImage",
  "openAIGptImageGenerate",
  "openAIGptImageEdit",
  "chatgptWebImageGenerate",
  "appDeploy",
  "ziweiChart",
  "read_x_post",
  "createTable",
  "setTodoList",
]);

const INTERACTIVE_MODE_TOOLS = new Set(["ask_user"]);
const HANDOFF_MODE_TOOLS = new Set(["runStreamingAgent"]);

function safeParseContent(content: unknown): unknown {
  if (typeof content !== "string") return content;
  try {
    return JSON.parse(content);
  } catch {
    return content;
  }
}

function readPayload(message: ToolCallMessageInput | undefined | null) {
  return isRecord(message?.toolPayload) ? message.toolPayload : undefined;
}

/** Same failure signals ToolMessageGroup / ToolMessageContent already use. */
export function isToolCallFailed(message: ToolCallMessageInput | undefined | null): boolean {
  const payload = readPayload(message);
  if (payload?.status === "failed") return true;
  if (asOptionalTrimmedString(payload?.error)) return true;
  const parsed = safeParseContent(message?.content);
  return isRecord(parsed) && !!asOptionalTrimmedString(parsed.error);
}

/**
 * Derive the row status without ever faking motion: settled payloads keep
 * their explicit status (including legacy repairing / cancelled), streaming
 * rows run, everything else is success. Spinning loaders remain an explicit
 * no-go (see StatusIcon contract).
 */
export function resolveToolCallStatus(
  message: ToolCallMessageInput | undefined | null
): ToolCallStatus {
  const payloadStatus = asTrimmedString(readPayload(message)?.status);
  // Error evidence outranks a *claimed success* (P0.5): a settled payload can
  // claim success while payload/content carries a real error. Other explicit
  // statuses keep their own meaning — cancellation persists an
  // "aborted"-style error string that must not repaint the row as failed.
  if (payloadStatus === "success" && isToolCallFailed(message)) {
    return "failed";
  }
  if (VALID_PAYLOAD_STATUSES.has(payloadStatus)) {
    return payloadStatus as ToolCallStatus;
  }
  if (message?.isStreaming) return "running";
  if (isToolCallFailed(message)) return "failed";
  return "success";
}

/**
 * Tool args resolution for display only — mirrors the persisted payload
 * chain: toolPayload.input → desktop-projected metadata fields → content JSON.
 */
export function readToolCallArgs(
  message: ToolCallMessageInput | undefined | null
): Record<string, unknown> | undefined {
  const payload = readPayload(message);
  const payloadArgs = extractToolCallArgs(payload);
  if (payloadArgs) return payloadArgs;

  const meta = message?.metadata;
  if (isRecord(meta)) {
    const derived: Record<string, unknown> = {};
    let hasField = false;
    for (const field of ["path", "command", "cmd", "query", "pattern", "url", "glob", "name", "cwd"] as const) {
      const value = asOptionalTrimmedString(meta[field]);
      if (value) {
        derived[field] = value;
        hasField = true;
      }
    }
    if (hasField) return derived;
  }

  const content = asTrimmedString(message?.content);
  if (content) {
    try {
      const parsed = JSON.parse(content);
      if (isRecord(parsed)) return parsed;
    } catch {
      // not JSON — no args to show
    }
  }
  return undefined;
}

/**
 * Human activity title for the compat label: explicit activity metadata first,
 * then the shared buildFallbackActivity mapping (readFile → 查看相关文件,
 * git status → 检查改动 …). Undefined when neither applies.
 */
export function readToolCallActivity(
  message: ToolCallMessageInput | undefined | null,
  args?: Record<string, unknown>
): { title?: string; detail?: string } | undefined {
  const meta = isRecord(message?.metadata) ? message.metadata : undefined;
  const explicit =
    normalizeToolActivity(meta?.activity) ??
    normalizeToolActivity(readPayload(message)?.activity);
  if (explicit) {
    const action = isRecord(explicit.action) ? explicit.action : undefined;
    const title = asOptionalTrimmedString(action?.title ?? explicit.title);
    if (!title) return undefined;
    return {
      title: shortenActivityTitle(title),
      detail: asOptionalTrimmedString(action?.detail ?? explicit.detail),
    };
  }

  const fallback = buildFallbackActivity(
    asTrimmedString(message?.toolName) || undefined,
    args ?? readToolCallArgs(message)
  );
  if (!fallback) return undefined;
  const title = asOptionalTrimmedString(fallback.title);
  if (!title) return undefined;
  return {
    title: shortenActivityTitle(title),
    detail: asOptionalTrimmedString(fallback.detail),
  };
}

function truncateDetail(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

/**
 * The operand of the call: path / query / command / url / pattern / name.
 * Same tool families as formatToolRowHeaderSummary, minus the tool-name
 * prefix — the row renders verb and target as separate columns.
 */
export function buildToolCallTarget(
  toolName: string | undefined,
  args: Record<string, unknown> | undefined
): string | undefined {
  if (!args) return undefined;
  const normalized = normalizeToolNameKey(toolName);
  let target = "";
  switch (normalized) {
    case "readFile":
    case "read_file":
    case "readWorkspaceFile":
    case "writeFile":
    case "write_file":
    case "writeWorkspaceFile":
    case "editFile":
    case "edit_file":
    case "replaceWorkspaceText":
      target = asOptionalTrimmedString(args.path) ?? "";
      break;
    case "codeSearch":
    case "code_search":
      target = asOptionalTrimmedString(args.query) ?? "";
      break;
    case "fetchWebpage":
    case "fetch_webpage":
      target = asOptionalTrimmedString(args.url) ?? "";
      break;
    case "globFiles":
    case "glob_files":
      target =
        asOptionalTrimmedString(args.pattern) ??
        asOptionalTrimmedString(args.glob) ??
        "";
      break;
    case "searchWorkspace":
      // query is the primary operand; pattern/glob are legacy aliases.
      target =
        asOptionalTrimmedString(args.query) ??
        asOptionalTrimmedString(args.pattern) ??
        asOptionalTrimmedString(args.glob) ??
        "";
      break;
    case "execShell":
    case "exec_shell":
    case "shell":
      target =
        asOptionalTrimmedString(args.cmd) ??
        asOptionalTrimmedString(args.command) ??
        "";
      return target ? truncateDetail(target, 80) : undefined;
    case "loadSkill":
      target = asOptionalTrimmedString(args.name) ?? "";
      break;
    case "listAgents":
    case "readAgent":
    case "startAgentRun":
      target =
        asOptionalTrimmedString(args.name) ??
        asOptionalTrimmedString(args.agentKey) ??
        "";
      break;
    default:
      return undefined;
  }
  return target ? truncateDetail(target, 60) : undefined;
}

/**
 * Secondary context — read ONLY from fields the renderers really consume:
 * - execShell: `cwd` (ExecShellViewer renders `${cwd} $ ${command}`);
 * - readFile: `startLine`/`endLine` (code preview renders a real line range).
 * Anything else stays undefined — never guessed.
 */
export function buildToolCallContext(
  toolName: string | undefined,
  args: Record<string, unknown> | undefined,
  contentRecord: Record<string, unknown> | undefined
): string | undefined {
  const normalized = normalizeToolNameKey(toolName);
  switch (normalized) {
    case "execShell":
    case "exec_shell":
    case "shell": {
      const cwd =
        asOptionalTrimmedString(contentRecord?.cwd) ??
        asOptionalTrimmedString(args?.cwd);
      return cwd || undefined;
    }
    case "searchWorkspace": {
      // Workspace scope: only when the real args actually carry a path —
      // never guessed from query/pattern content.
      return asOptionalTrimmedString(args?.path) || undefined;
    }
    case "readFile":
    case "read_file":
    case "readWorkspaceFile": {
      const response = isRecord(contentRecord?.response) ? contentRecord.response : undefined;
      const start =
        asOptionalFiniteNumber(contentRecord?.startLine) ??
        asOptionalFiniteNumber(response?.startLine);
      const end =
        asOptionalFiniteNumber(contentRecord?.endLine) ??
        asOptionalFiniteNumber(response?.endLine);
      if (
        typeof start === "number" &&
        typeof end === "number" &&
        start >= 1 &&
        end >= start
      ) {
        return `L${start}–L${end}`;
      }
      return undefined;
    }
    default:
      return undefined;
  }
}

/**
 * Diff meta — only when the message really persists added/removed numbers
 * (top level or under summary). Never recomputed from diff text.
 */
export function buildToolCallMeta(
  contentRecord: Record<string, unknown> | undefined
): ToolCallMeta | undefined {
  if (!contentRecord) return undefined;
  const summary = isRecord(contentRecord.summary) ? contentRecord.summary : undefined;
  const added =
    asOptionalFiniteNumber(contentRecord.added) ??
    asOptionalFiniteNumber(summary?.added);
  const removed =
    asOptionalFiniteNumber(contentRecord.removed) ??
    asOptionalFiniteNumber(summary?.removed);
  if (
    typeof added !== "number" ||
    typeof removed !== "number" ||
    added < 0 ||
    removed < 0
  ) {
    return undefined;
  }
  return { diff: { added, removed } };
}

/** Short human duration for a real span: `850ms` under a second, else `1.2s`. */
export function formatToolDurationMs(durationMs: number): string {
  if (durationMs < 1000) return `${durationMs}ms`;
  return `${(durationMs / 1000).toFixed(1)}s`;
}

/**
 * Legacy timestamp-pair helper: returns the real span only when BOTH values
 * are finite numbers and the difference is positive — never invents timing.
 */
export function formatToolCallDuration(
  startedAt: unknown,
  finishedAt: unknown
): string | null {
  if (typeof startedAt !== "number" || typeof finishedAt !== "number") return null;
  const ms = finishedAt - startedAt;
  if (!(ms > 0)) return null;
  return formatToolDurationMs(ms);
}

export function toolCallKey(message: ToolCallMessageInput | undefined | null): string {
  return (
    message?.id ??
    message?.dbKey ??
    message?.tool_call_id ??
    message?.toolCallId ??
    "tool-call"
  );
}

export function resolveToolCallMode(toolName: string | undefined): ToolCallMode {
  const normalized = normalizeToolNameKey(toolName);
  if (INTERACTIVE_MODE_TOOLS.has(normalized)) return "interactive";
  if (HANDOFF_MODE_TOOLS.has(normalized)) return "handoff";
  if (ARTIFACT_MODE_TOOLS.has(normalized)) return "artifact";
  return "row";
}

/**
 * Map one tool message onto its presentation model.
 * `translate` is optional; without it the zh defaults from
 * toolDisplayName keep labels human even in tests / SSR.
 */
export function buildToolCallPresentation(
  message: ToolCallMessageInput | undefined | null,
  translate?: ToolCallTranslate
): ToolCallPresentation {
  const toolName = asTrimmedString(message?.toolName);
  const normalized = normalizeToolNameKey(toolName);
  const args = readToolCallArgs(message);
  const activity = readToolCallActivity(message, args);
  const parsedContent = safeParseContent(message?.content);
  const contentRecord = isRecord(parsedContent) ? parsedContent : undefined;

  const verb = resolveToolCallVerb(toolName, normalized, translate);
  const target = buildToolCallTarget(toolName, args);
  const context = buildToolCallContext(toolName, args, contentRecord);
  const status = resolveToolCallStatus(message);
  const payload = readPayload(message);
  const startedAt = payload?.startedAt;
  const finishedAt = payload?.finishedAt;
  const durationMs =
    typeof startedAt === "number" &&
    typeof finishedAt === "number" &&
    finishedAt - startedAt > 0
      ? finishedAt - startedAt
      : undefined;
  const meta = buildToolCallMeta(contentRecord);
  const mode = resolveToolCallMode(toolName);
  const label =
    activity?.title ||
    resolveToolDisplayName(toolName || undefined, translate);
  const errorMessage =
    asOptionalTrimmedString(payload?.error) ??
    (isRecord(parsedContent)
      ? asOptionalTrimmedString(parsedContent.error)
      : undefined) ??
    undefined;

  return {
    key: String(toolCallKey(message)),
    toolName,
    verb,
    ...(context ? { context } : {}),
    ...(target ? { target } : {}),
    status,
    ...(durationMs !== undefined ? { durationMs } : {}),
    ...(meta ? { meta } : {}),
    mode,
    expandable: mode === "row",
    // Compat aliases.
    label,
    detail: activity?.detail || target || "",
    duration: durationMs !== undefined ? formatToolDurationMs(durationMs) : null,
    ...(errorMessage ? { errorMessage } : {}),
  };
}

export interface ToolCallGroupCounts {
  total: number;
  running: number;
  failed: number;
}

/** Pure count summary over already-visibility-filtered messages. */
export function summarizeToolCallStatuses(
  messages: ToolCallMessageInput[]
): ToolCallGroupCounts {
  let running = 0;
  let failed = 0;
  for (const message of messages) {
    const status = resolveToolCallStatus(message);
    if (status === "running") running += 1;
    else if (status === "failed") failed += 1;
  }
  return { total: messages.length, running, failed };
}

const interpolateCount = (template: string, count: number) =>
  template.replace("{{count}}", String(count));

/**
 * Compact grouped header summary: total calls, plus running / failed counts
 * when non-zero ("2 个调用 · 1 个运行中 · 1 个失败"). The header does not
 * render duration; timing appears only in each tool-call row.
 *
 * i18n keys (zh fallbacks; the chat locale may override):
 * - toolGroup.totalCalls   "{{count}} 个调用"
 * - toolGroup.runningCalls "{{count}} 个运行中"
 * - toolGroup.failedCalls  "{{count}} 个失败"
 */
export function formatToolGroupStatusSummary(
  counts: ToolCallGroupCounts,
  translate?: ToolCallTranslate
): string {
  const t: ToolCallTranslate = translate ?? ((_key, fallback) => fallback);
  const parts = [
    interpolateCount(t("toolGroup.totalCalls", "{{count}} 个调用"), counts.total),
  ];
  if (counts.running > 0) {
    parts.push(
      interpolateCount(t("toolGroup.runningCalls", "{{count}} 个运行中"), counts.running)
    );
  }
  if (counts.failed > 0) {
    parts.push(
      interpolateCount(t("toolGroup.failedCalls", "{{count}} 个失败"), counts.failed)
    );
  }
  return parts.join(" · ");
}
