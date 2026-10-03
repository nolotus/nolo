import { clipCompactText } from "core/clipCompactText";
import { clipHeadAndTail } from "core/clipHeadAndTail";
export { clipHeadAndTail };
import type { LocalAgentToolEvent } from "../../agent-runtime/localLoop";
import { readActionGate } from "../../agent-runtime/actionGate";
import { parseUiAskChoiceContent } from "../../ai/tools/uiAskChoiceTool";
import { formatAgentListCard } from "../../ai/tools/noloWorkspaceReadTools";
import {
  formatListRunsCard,
  formatNotFoundRunCard,
  formatFinishedRunCard,
  formatStartRunCard,
  formatStatusRunCard,
  formatStopRunCard,
  isAgentRunTerminalStatus,
  type RunLabelFields,
} from "../../ai/tools/agent/agentRunDisplayHelpers";
import { type AgentRunSnapshot, parseAgentRunEvent } from "./agentRunSnapshot";
import { dimCliText, resolveCliColorEnabled, styleCliText } from "./terminalStyles";
import { themeText, type DiffLineKind, type TuiBrightness, renderDiffLine, resolveTuiBrightness, supportsTruecolor } from "../tui/theme";
import { displayWidth, stripAnsi } from "../tui/tuiAnsi";
import { findPotentialSecrets } from "../secretScan";
import { redactSecrets } from "../tui/redactSecrets";
import { diffLines } from "diff";
import { type CodeLang, detectCodeLangFromPath, highlightCodeLine } from "./assistantOutput";
import { agentRunCardLabels, t, toolLabel } from "../tui/i18n";
import {
  formatFetchItemUrl,
  formatReadItemPath,
  formatRunItemCommand,
  formatSearchItemQuery,
} from "./formatReadPathTree";

function clip(value: string, max = 72) {
  return clipCompactText(value, max, "…");
}

/**
 * Normal-display spinner/activity label: the action verb only, never the
 * argument preview — for shell-running tools that preview IS the command
 * line (cwd/echo/pipeline), which normal mode must not surface anywhere,
 * including the composer activity line.
 */
export function formatConservativeActiveToolLabel(
  event: Pick<LocalAgentToolEvent, "toolName" | "argumentsPreview">
) {
  return toolLabel(event.toolName || "tool");
}

function isRunToolName(name?: string): boolean {
  return name === "execShell" || name === "runCommand" || name === "launchProcess";
}

function isReadToolName(name?: string): boolean {
  return name === "readFile";
}

function isFailedToolResult(event: LocalAgentToolEvent) {
  const exitCode = event.metadata?.exitCode;
  if (event.metadata?.actionGate) return false;
  if (typeof exitCode === "number" && exitCode !== 0) return true;
  return Boolean(event.metadata?.timedOut);
}

/**
 * Parse a ask_user tool result into a question + numbered option list
 * for CLI display. Returns null when the content is not a ask_user
 * payload (so non-choice tools fall through to the generic compact line).
 * Delegates wire parsing to the shared parseUiAskChoiceContent source of
 * truth; keeps the display-specific trim/filter of choices here.
 */
function parseUiAskChoiceForCli(event: LocalAgentToolEvent): {
  question: string;
  choices: Array<{ label: string; userMessage?: string }>;
  selected?: { label: string; userMessage: string };
  answers?: Array<{
    questionId: string;
    selectedIds: string[];
    otherText: string;
    userMessage: string;
  }>;
  cancelled?: boolean;
  resolved: boolean;
} | null {
  if (event.toolName !== "ask_user" && !event.metadata?.uiAskChoice) {
    return null;
  }
  const parsed = parseUiAskChoiceContent(event.content);
  if (!parsed) return null;
  const question = typeof parsed.question === "string" ? parsed.question.trim() : "";
  const choices = (Array.isArray(parsed.choices) ? parsed.choices : [])
    // 运行时防御：choices 声明为 UiAskChoiceOption[]（label 必填），但内容来自
    // 线上 JSON，实际可能缺字段。这里只过滤非对象，不再声明类型谓词——
    // 原谓词把 label 写成可选，与元素类型不兼容（TS2677）；下面的 map 已用
    // `c.label ?? ""` 兜底，行为不变。
    .filter((c) => Boolean(c && typeof c === "object"))
    .map((c) => ({
      label: String(c.label ?? "").trim(),
      userMessage: typeof c.userMessage === "string" ? c.userMessage : undefined,
    }))
    .filter((c) => c.label.length > 0);
  const selected =
    parsed.selected && typeof parsed.selected === "object"
      ? {
          label: String(parsed.selected.label ?? "").trim(),
          userMessage: String(parsed.selected.userMessage ?? "").trim(),
        }
      : undefined;
  const answers = Array.isArray(parsed.answers) ? parsed.answers : undefined;
  const cancelled = Boolean(parsed.cancelled);
  const resolved = Boolean(
    event.metadata?.resolved || selected || cancelled || (answers && answers.length > 0),
  );
  // Unresolved interactive prompts need a question + at least one choice.
  // Resolved / cancelled payloads may omit choices (or only carry selected).
  if (!resolved && (!question || choices.length === 0)) return null;
  if (!question && !selected && !cancelled) return null;
  return {
    question,
    choices,
    ...(selected ? { selected } : {}),
    ...(answers ? { answers } : {}),
    ...(cancelled ? { cancelled: true } : {}),
    resolved,
  };
}

function formatUiAskChoiceBlock(
  event: LocalAgentToolEvent,
  colorEnabled: boolean,
): string | null {
  const parsed = parseUiAskChoiceForCli(event);
  if (!parsed) return null;
  const lines: string[] = [];
  lines.push("");

  const questionText = parsed.question || "";
  if (colorEnabled) {
    lines.push(`${themeText("❓ ", "info", true)}${styleCliText(questionText, "cyan", true)}`);
  } else {
    lines.push(`❓ ${questionText}`);
  }

  // Resolved: show what the user picked (or cancelled) instead of re-printing
  // the interactive menu + "type a number" hint into message history.
  if (parsed.resolved) {
    if (parsed.cancelled) {
      const cancelled = t("askChoiceHistoryCancelled");
      lines.push(
        colorEnabled
          ? `  ${themeText("·", "chrome", true)} ${themeText(cancelled, "muted", true)}`
          : `  · ${cancelled}`,
      );
      return `${lines.join("\n")}\n`;
    }

    const selectedLabel =
      parsed.selected?.label ||
      parsed.selected?.userMessage ||
      (parsed.answers
        ? parsed.answers
            .map((a) => a.userMessage)
            .filter(Boolean)
            .join(", ")
        : "");
    const marker = t("askChoiceHistorySelected");
    const displayLabel = selectedLabel || "—";
    if (colorEnabled) {
      lines.push(
        `  ${themeText("✓", "success", true)} ${themeText(marker, "muted", true)} ${displayLabel}`,
      );
    } else {
      lines.push(`  ✓ ${marker} ${displayLabel}`);
    }
    // Multi-question: list each answer on its own line when present.
    if (parsed.answers && parsed.answers.length > 1) {
      for (const answer of parsed.answers) {
        if (!answer.userMessage) continue;
        lines.push(
          colorEnabled
            ? `    ${themeText("·", "chrome", true)} ${answer.userMessage}`
            : `    · ${answer.userMessage}`,
        );
      }
    }
    return `${lines.join("\n")}\n`;
  }

  parsed.choices.forEach((choice, i) => {
    const num = String(i + 1);
    const label = choice.label;
    if (colorEnabled) {
      lines.push(
        `  ${themeText(num + ".", "chrome", true)} ${label}`,
      );
    } else {
      lines.push(`  ${num}. ${label}`);
    }
  });
  const hint = t("askChoiceHistoryHint");
  if (colorEnabled) {
    lines.push(`  ${dimCliText(hint, true)}`);
  } else {
    lines.push(`  ${hint}`);
  }
  return `${lines.join("\n")}\n`;
}

function formatToolTraceLine(text: string, colorEnabled: boolean, accent: "none" | "error" = "none") {
  if (!colorEnabled) return `${text}\n`;
  if (accent === "error") {
    return `${themeText(text, "danger", true)}\n`;
  }
  return `${dimCliText(text, true)}\n`;
}

// safe（normal）投影通用清洗：剥 ANSI/OSC（含剪贴板写、超链接）、折叠换行。
// 供 renderRunCard（客户端重建）与 recoverOrchestrationCard 的 start 卡共用，
// 与 dock 侧 sanitizeRunSnapshotForNormal 的 clean 同语义。
const cleanUserText = (value: string) =>
  stripAnsi(value).replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();

/**
 * Render a run snapshot as a card body. Safe mode rebuilds the card without
 * error/log fields and cleans user-controlled text; pro mode stays complete.
 */
function renderRunCard(
  snapshot: AgentRunSnapshot,
  opts?: { includeLogTail?: boolean; safe?: boolean }
): string {
  const labels = agentRunCardLabels();
  const timing = { startedAt: snapshot.startedAt, finishedAt: snapshot.finishedAt };
  const safe = opts?.safe === true;
  const name = safe ? cleanUserText(snapshot.agentName ?? "agent") : (snapshot.agentName ?? "agent");
  // safe（normal）投影：与 dock 侧 sanitizeRunSnapshotForNormal 同规则清洗
  // （剥 ANSI/OSC、折叠换行），防止 provider 可控文本清屏/写剪贴板/伪造链接。
  const source = safe
    ? {
        ...snapshot,
        agentName: snapshot.agentName ? cleanUserText(snapshot.agentName) : snapshot.agentName,
        taskPreview: snapshot.taskPreview ? cleanUserText(snapshot.taskPreview) : snapshot.taskPreview,
        lastAssistantText: snapshot.lastAssistantText
          ? cleanUserText(snapshot.lastAssistantText)
          : snapshot.lastAssistantText,
        lastToolNames: snapshot.lastToolNames?.map(cleanUserText),
      }
    : snapshot;
  const hadError = safe && Boolean(source.errorMessage?.trim());
  // 失败时 normal 模式同样显示具体错误（2026-09-01 owner 定调：run 失败不
  // 折叠、想知道具体的）。errorMessage 仍按 safe 规则清洗（剥 ANSI/OSC、
  // 折叠换行）并 clip，防止 provider 可控文本清屏/写剪贴板/伪造链接；
  // logLines（无界进程输出）保持 pro/verbose 专属。
  const errorFields = safe
    ? {
        errorMessage: hadError ? clip(redactSecrets(cleanUserText(source.errorMessage!)), 160) : undefined,
        logLines: undefined,
      }
    : { errorMessage: source.errorMessage, logLines: source.logLines };
  const body = isAgentRunTerminalStatus(snapshot.status)
    ? formatFinishedRunCard(name, snapshot.status, {
        runId: snapshot.runId,
        toolCallCount: source.toolCallCount,
        lastToolNames: source.lastToolNames,
        lastAssistantText: source.lastAssistantText,
        ...errorFields,
        timing,
        ...(opts?.includeLogTail !== undefined ? { includeLogTail: opts.includeLogTail } : {}),
        labels,
      })
    : formatStatusRunCard(name, snapshot.status, {
        runId: snapshot.runId,
        toolCallCount: source.toolCallCount,
        lastToolNames: source.lastToolNames,
        lastAssistantText: source.lastAssistantText,
        ...errorFields,
        timing,
        ...(opts?.includeLogTail !== undefined ? { includeLogTail: opts.includeLogTail } : {}),
        labels,
      });
  return body;
}

/**
 * Render an orchestration card from the event's structured payload, or null
 * when this process cannot build one.
 *
 * Preferred over `metadata.displayData` wherever it succeeds. displayData is a
 * card *string* baked by whichever server build answered the call, so this
 * process can only grep it after the fact — which is why a `agent   agent` row
 * from an old build has to be filtered out by regex below. Rendering from
 * `rawData` instead means new fields (task, runId, progress) appear without the
 * server needing to ship a matching renderer, and the string-patching stays a
 * fallback rather than the main path.
 */
function recoverOrchestrationCard(
  event: LocalAgentToolEvent,
  toolName: string,
  opts?: { safe?: boolean }
): string | null {
  const safe = opts?.safe === true;
  const content = typeof event.content === "string" ? event.content : "";
  const trimmed = content.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;
  const labels = agentRunCardLabels();

  if (toolName === "listAgents") {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      const agents = Array.isArray(parsed.agents) ? parsed.agents : [];
      return formatAgentListCard(agents as Parameters<typeof formatAgentListCard>[0]);
    } catch {
      return null;
    }
  }

  // `list` is the one run payload the shared parser declines (a set of runs,
  // not one run), so it is handled here before delegating.
  if (toolName === "controlAgentRun") {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      if (Array.isArray(parsed.runs)) {
        return formatListRunsCard(
          parsed.runs as Array<RunLabelFields & { status?: string }>,
          labels
        );
      }
    } catch {
      return null;
    }
  }

  const parsedEvent = parseAgentRunEvent(event);
  if (!parsedEvent) return null;
  const { kind, snapshot } = parsedEvent;

  if (kind === "start") {
    // safe（normal）投影：与 renderRunCard 同规则清洗 provider 可控文本
    // （agentName/taskPreview 剥 ANSI/OSC、折叠换行）。
    const name = safe ? cleanUserText(snapshot.agentName ?? "agent") : (snapshot.agentName ?? "agent");
    const task = snapshot.taskPreview ? (safe ? cleanUserText(snapshot.taskPreview) : snapshot.taskPreview) : snapshot.taskPreview;
    return formatStartRunCard(name, snapshot.status, {
      task,
      runId: snapshot.runId,
      labels,
    });
  }
  if (kind === "gone") return formatNotFoundRunCard(labels);
  if (kind === "stop") return formatStopRunCard(snapshot.status, labels);
  return renderRunCard(snapshot, opts);
}

function formatOrchestrationCardBlock(
  event: LocalAgentToolEvent,
  toolName: string,
  colorEnabled: boolean,
  opts?: { safe?: boolean }
): string {
  const safe = opts?.safe === true;
  const rawLabel = toolLabel(toolName);
  const bakedCard =
    typeof event.metadata?.displayData === "string" && event.metadata.displayData.trim()
      ? event.metadata.displayData
      : "";
  // Client render first (see recoverOrchestrationCard); the server-baked card
  // and then the raw content are fallbacks for payloads we cannot rebuild.
  const rawDataStr =
    recoverOrchestrationCard(event, toolName, { safe }) ||
    bakedCard ||
    (typeof event.content === "string" ? event.content : "");
  const failed =
    event.type === "tool-error" ||
    isFailedToolResult(event) ||
    Boolean(event.metadata?.failed) ||
    /^Error:/i.test(rawDataStr.trim());

  if (failed) {
    // 失败要说为什么（2026-09-01 owner 定调）：normal 模式同样显示清洗后的
    // 首行原因；无界续行（堆栈/头/进程输出）仍不上屏。
    const firstLine = stripAnsi(rawDataStr.trim().split("\n")[0] || event.summary || event.message || t("toolFailed"));
    const message = clip(redactSecrets(firstLine), 96);
    if (!colorEnabled) {
      return `✗ ${rawLabel}  ${message}\n`;
    }
    const cross = themeText("✗", "danger", true);
    const labelPart = themeText(rawLabel, "muted", true);
    const msgPart = themeText(message, "danger", true);
    return `${cross} ${labelPart}  ${msgPart}\n`;
  }

  const displayData = rawDataStr.trim();
  // A server from an older build may bake a multiline error into displayData.
  // In safe mode remove the error row and its indented continuation lines until
  // the next card label (or blank line), rather than filtering only its first line.
  const lines = displayData ? displayData.split("\n") : [];
  const projected = safe ? sanitizeRunCardForNormal(lines) : lines;

  if (!colorEnabled) {
    let out = `● ${rawLabel}\n`;
    for (const line of projected) {
      out += `  ${line}\n`;
    }
    return out;
  }

  const bullet = themeText("●", "success", true);
  const labelPart = themeText(rawLabel, "muted", true);
  let out = `${bullet} ${labelPart}\n`;
  for (const line of projected) {
    out += `  ${themeText(line, "muted", true)}\n`;
  }
  return out;
}

/**
 * Normal-mode safe projection of a run card body (client-rebuilt or
 * server-baked — both arrive here as lines).
 *
 * Keeps the required facts: status/outcome row (✗ failed), identity, tool
 * counts, note, and the `error   …` row itself — a failed run must say why
 * (2026-09-01 owner: 失败要知道具体的). What still leaks nothing: the error
 * row's indented continuation lines (stack frames / Authorization headers)
 * and the trailing `Log tail:` section (unfiltered process output). Lines
 * are pre-sanitized by cleanUserText upstream; here we only keep/drop.
 */
function sanitizeRunCardForNormal(lines: string[]): string[] {
  const out: string[] = [];
  // error 行命中后的缩进深度：其后更深缩进的行是同一错误的续行
  // （堆栈帧 / Authorization 头），与 error 本体一起吞掉，直到下一个
  // 卡标签行（双空格 label 形态）或空行。
  let errorIndent: number | null = null;
  for (const line of lines) {
    // The log tail is always the card's last section: drop it and the blank
    // separator above its header. Header text matches both the CLI-injected
    // localized label and the packages/ai English default (server-baked
    // cards always carry the default).
    if (/^(log tail:?|日志尾部：?)$/i.test(line.trim())) {
      if (out.length > 0 && out[out.length - 1].trim() === "") out.pop();
      break;
    }
    if (/^\s*error\b/i.test(line)) {
      // 保留 error 首行本体（失败要说为什么），凭据形态打码，仍吞更深缩进续行。
      out.push(clip(redactSecrets(stripAnsi(line)), 160));
      errorIndent = line.length - line.trimStart().length;
      continue;
    }
    if (errorIndent !== null) {
      if (line.trim() === "") {
        // 空行结束续行块
        errorIndent = null;
        out.push(line);
        continue;
      }
      const indent = line.length - line.trimStart().length;
      const isLabelRow = /^\s{2}[a-z][a-zA-Z0-9]*\s{2,}/.test(line);
      if (indent > errorIndent && !isLabelRow) continue; // 吞缩进续行
      errorIndent = null; // 到达下一标签行/同级行，恢复正常投影
    }
    out.push(line);
  }
  return out;
}

/**
 * normal 模式 gist 宽度预算：够认出对象，短到不破坏单行扫描。
 */
const NORMAL_TOOL_GIST_MAX = 28;

function gistClip(value: string, max = NORMAL_TOOL_GIST_MAX): string {
  const oneLine = value.replace(/\s+/g, " ").trim();
  if (!oneLine) return "";
  return oneLine.length <= max ? oneLine : `${oneLine.slice(0, max - 1)}…`;
}

/**
 * Run 行 gist 宽度预算：终端宽度减去 `▸ Run · ` 前缀与 ` ✓ 12.3s` 尾缀的余量，
 * 下限 48（窄窗不塌到没信息），上限 160（超宽屏不无限拉长扫描线）；无 columns
 * 信息时回退 96（与 edit snippet 的默认预算一致）。NOLO_TEST_RUN_GIST_WIDTH
 * 供测试钉死预算（仿 NOLO_TEST_DIFF_WIDTH）。
 */
const DEFAULT_RUN_GIST_MAX = 96;

function normalRunGistMaxWidth(
  env: Record<string, string | undefined> = process.env,
  columns?: number,
): number {
  const pinned = parseInt(env.NOLO_TEST_RUN_GIST_WIDTH ?? "", 10);
  if (!Number.isNaN(pinned) && pinned > 0) return pinned;
  const cols =
    typeof columns === "number"
      ? columns
      : typeof process !== "undefined" && typeof process.stdout?.columns === "number"
        ? process.stdout.columns
        : 0;
  if (cols > 0) {
    return Math.max(48, Math.min(160, cols - 32));
  }
  return DEFAULT_RUN_GIST_MAX;
}

/**
 * 命令的「全量安全投影」（2026-09-02 owner 定调，替代旧的 24 字符 commandHeadGist）：
 * 整条命令折叠成单行、过 redactSecrets 打码凭据形态，再按终端宽度截断；
 * 复合 shell 的 && / ; / | 骨架原样保留。密钥护栏分层：redactSecrets 打码
 * 高置信形态，normalToolGist 出口的 withholdIfSecretLike 对打码后仍可疑的串
 * 整行放弃——宁可少显示，不上屏可疑串。命令参数/路径不再回避：它们在展开的
 * Run 树里本来可见。
 */
function commandFullGist(command: string, max: number): string {
  const oneLine = command.replace(/\s+/g, " ").trim();
  if (!oneLine) return "";
  return truncateByDisplayWidth(redactSecrets(oneLine), max);
}
function pathBasenameGist(path: string): string {
  const segments = path.split(/[\\/]/).filter((segment) => segment.length > 0);
  const base = segments.pop();
  return base ? gistClip(base) : "";
}

// ---------------------------------------------------------------------------
// editFile diff snippet（恢复自 bc71a400f / 5ee8fae69^）：editFile 的 added/
// removed 片段是用户真正盯着看的内容面——单行 gist 只回答「动了哪个文件」，
// diff 块回答「改了什么」。数据来自 executor 的 safe 投影 metadata
// （oldSnippet/newSnippet，已被 agent-runtime 裁剪 ≤24 行/160 列）。
// ---------------------------------------------------------------------------

export type EditSnippetLine = { kind: DiffLineKind; text: string };

const EDIT_SNIPPET_MAX_LINES = 24;
const DEFAULT_EDIT_SNIPPET_MAX_WIDTH = 96;

export function resolveEditSnippetMaxWidth(
  env: Record<string, string | undefined> = process.env,
  columns?: number
): number {
  if (env.NOLO_TEST_DIFF_WIDTH) {
    const parsed = parseInt(env.NOLO_TEST_DIFF_WIDTH, 10);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  const cols =
    typeof columns === "number"
      ? columns
      : typeof process !== "undefined" && typeof process.stdout?.columns === "number"
        ? process.stdout.columns
        : 0;
  if (cols > 0) {
    return Math.max(80, Math.min(160, cols - 8));
  }
  return DEFAULT_EDIT_SNIPPET_MAX_WIDTH;
}

interface FormattedEditSnippet {
  lines: EditSnippetLine[];
  addedCount: number;
  removedCount: number;
}

function prefixFor(kind: DiffLineKind): string {
  return kind === "added" ? "+ " : kind === "removed" ? "- " : "  ";
}

/**
 * Build one diff line: kind prefix + width-clipped body. Clipping uses
 * display width (CJK-aware), not code-unit count, so a 60-char CJK line
 * (120 display columns) is clipped where a `.length` check would overflow.
 */
function buildEditLine(kind: DiffLineKind, body: string, maxWidth = resolveEditSnippetMaxWidth()): EditSnippetLine {
  return { kind, text: prefixFor(kind) + truncateByDisplayWidth(body, maxWidth) };
}

/** One-sided fallback: tag every line of a snippet with a single kind. */
function snippetLinesWithKind(
  snippet: string,
  kind: DiffLineKind,
  maxWidth = resolveEditSnippetMaxWidth()
): EditSnippetLine[] {
  const lines = snippet.split(/\r?\n/);
  // Preserve blank lines: an empty added/removed line is still a real edit.
  if (lines.at(-1) === "") lines.pop();
  return lines.slice(0, EDIT_SNIPPET_MAX_LINES).map((line) => buildEditLine(kind, line, maxWidth));
}

/**
 * Clip a line to a display-width budget, appending "…" when it overflows.
 */
function truncateByDisplayWidth(line: string, maxWidth: number): string {
  if (displayWidth(line) <= maxWidth) return line;
  let width = 0;
  let kept = "";
  for (const char of line) {
    const w = displayWidth(char);
    if (width + w + 1 > maxWidth) break; // +1 reserves room for "…"
    kept += char;
    width += w;
  }
  return `${kept}…`;
}

/**
 * Keep the window centered on the first changed line so a change at the tail
 * of a long snippet isn't clipped away by a naive head truncation.
 */
function windowAndTruncate(lines: EditSnippetLine[], maxLines: number): EditSnippetLine[] {
  if (lines.length <= maxLines) return lines;
  const firstChange = lines.findIndex((l) => l.kind !== "context");
  if (firstChange === -1) return lines.slice(0, maxLines);
  const half = Math.floor(maxLines / 2);
  let start = Math.max(0, firstChange - half);
  if (start + maxLines > lines.length) start = Math.max(0, lines.length - maxLines);
  const kept = lines.slice(start, start + maxLines);
  const omitted = lines.length - kept.length;
  if (omitted > 0) {
    kept.push({ kind: "context", text: `  … +${omitted} more lines` });
  }
  return kept;
}

function formatEditFileSnippet(
  metadata: Record<string, unknown>
): FormattedEditSnippet | undefined {
  const oldSnippet = typeof metadata.oldSnippet === "string" ? metadata.oldSnippet : undefined;
  const newSnippet = typeof metadata.newSnippet === "string" ? metadata.newSnippet : undefined;
  if (!oldSnippet && !newSnippet) return undefined;

  const maxWidth = resolveEditSnippetMaxWidth();

  // Degraded path: one side missing — show whichever side we have, tagged
  // wholesale as removed/added so the user at least sees something.
  if (oldSnippet && !newSnippet) {
    const lines = snippetLinesWithKind(oldSnippet, "removed", maxWidth);
    return { lines, addedCount: 0, removedCount: lines.length };
  }
  if (newSnippet && !oldSnippet) {
    const lines = snippetLinesWithKind(newSnippet, "added", maxWidth);
    return { lines, addedCount: lines.length, removedCount: 0 };
  }

  // Both present: produce a real line-level diff via `diffLines`.
  const parts = diffLines(oldSnippet!, newSnippet!);
  const all: EditSnippetLine[] = [];
  let addedCount = 0;
  let removedCount = 0;

  for (const part of parts) {
    const kind: DiffLineKind = part.added ? "added" : part.removed ? "removed" : "context";
    // `diffLines` values end with "\n", so split drops a trailing empty element.
    const bodyLines = part.value.replace(/\n$/, "").split("\n");
    for (const line of bodyLines) {
      if (kind === "added") addedCount++;
      if (kind === "removed") removedCount++;
      all.push(buildEditLine(kind, line, maxWidth));
    }
  }

  return {
    lines: windowAndTruncate(all, EDIT_SNIPPET_MAX_LINES),
    addedCount,
    removedCount,
  };
}

/**
 * editFile 成功结果的展示 hint：inline 统计 `(+3, -1)` + 多行 diff detail。
 * 无 snippet metadata（旧 server / 非 editFile）时返回 null，调用方退回纯 gist 行。
 */
function editFileResultHint(event: LocalAgentToolEvent): { inline: string; detail?: EditSnippetLine[] } | null {
  if (event.toolName !== "editFile" || !event.metadata) return null;
  const res = formatEditFileSnippet(event.metadata);
  if (!res) return null;
  const stats: string[] = [];
  if (res.addedCount > 0) stats.push(`+${res.addedCount}`);
  if (res.removedCount > 0) stats.push(`-${res.removedCount}`);
  const inline = stats.length > 0 ? `(${stats.join(", ")})` : "";
  return { inline, detail: res.lines };
}

function formatEditDetailBlock(
  lines: EditSnippetLine[],
  colorEnabled: boolean,
  filePath?: string,
  env: Record<string, string | undefined> = process.env
): string {
  if (!colorEnabled) {
    return lines.map((line) => `  ${line.text}\n`).join("");
  }
  const isTruecolor = supportsTruecolor(env);
  const lang: CodeLang = isTruecolor ? detectCodeLangFromPath(filePath) : "unknown";
  const brightness: TuiBrightness = resolveTuiBrightness(env);
  // Block-level padTo so every diff line forms a rectangle of equal visible
  // width (Zed-style band). Measured with CJK-aware displayWidth.
  const padTo = Math.max(...lines.map((line) => displayWidth(line.text))) + 1;
  return lines
    .map((line) => `  ${renderDiffLine({
      kind: line.kind,
      text: line.text,
      highlightedText: shouldHighlightEditLine(line, lang, isTruecolor)
        ? buildHighlightedEditLine(line, lang, brightness, env)
        : undefined,
      padTo,
      colorEnabled: true,
      env,
    })}\n`)
    .join("");
}

/** 一行是否值得语法高亮：truecolor + 已知语言 + 非 ellipsis + 有 +/- 前缀。 */
function shouldHighlightEditLine(
  line: EditSnippetLine,
  lang: CodeLang,
  isTruecolor: boolean,
): boolean {
  if (!isTruecolor || lang === "unknown") return false;
  if (line.text.startsWith("  …") || line.text.startsWith("…")) return false;
  return line.text.length >= 2;
}

/** 给 edit diff 行的前缀上色 + 对剩余部分做语法高亮。 */
function buildHighlightedEditLine(
  line: EditSnippetLine,
  lang: CodeLang,
  brightness: TuiBrightness,
  env: Record<string, string | undefined>,
): string {
  const prefix = line.text.slice(0, 2);
  const body = line.text.slice(2);
  const prefixToken = line.kind === "added" ? "success" : line.kind === "removed" ? "danger" : "chrome";
  const coloredPrefix = themeText(prefix, prefixToken, true, env);
  const highlightedBody = highlightCodeLine(body, lang, brightness);
  return `${coloredPrefix}${highlightedBody}`;
}

/**
 * normal 模式的派生摘要（gist）：只从 localLoop 安全观测投影取值
 * （metadata.path / metadata.command，已裁剪 <=240）；argumentsPreview 是
 * 模型可控的原始参数文本，绝不进 normal 行。缺失时回退纯「label ✓」形式。
 * 原则演进：2026-08-31 owner 定调「raw args 是管道噪音，gist 是最小可感知
 * 名词」；2026-09-02 owner 反转 Run 行——命令改全量安全投影（redactSecrets
 * 脱敏 + 终端宽度截断），其余工具 gist 维持最小可感知名词不变。
 */
function normalToolGistRaw(event: LocalAgentToolEvent): string {
  const metadata = (event.metadata ?? {}) as Record<string, unknown>;
  const toolName = event.toolName || "";

  // These fields are runtime-produced projections (not model-controlled
  // arguments), so they are safe to show in the compact TUI activity line.
  // Keep the same clipping rules as the expanded Read/Run/Fetch trees.
  if (toolName === "readFile") {
    const path = typeof metadata.path === "string"
      ? metadata.path
      : typeof metadata.filePath === "string" ? metadata.filePath : "";
    if (path) return gistClip(formatReadItemPath(path, metadata), 52);
  }
  if (toolName === "fetchWebpage") {
    const url = typeof metadata.url === "string" ? metadata.url : "";
    if (url) return formatFetchItemUrl(url);
  }
  if (toolName === "exa_search") {
    const query = typeof metadata.query === "string"
      ? metadata.query
      : typeof metadata.pattern === "string" ? metadata.pattern : "";
    const path = typeof metadata.path === "string" ? metadata.path : undefined;
    if (query || path) return formatSearchItemQuery(query, path);
  }
  if (isRunToolName(toolName)) {
    const command = typeof metadata.command === "string" ? metadata.command : "";
    if (command) {
      // 2026-09-02 owner 定调：Run 行改「全量安全投影」——整条命令脱敏后按
      // 终端宽度上屏（替代旧的 24 字符 head，参数/路径在展开 Run 树里本来
      // 可见）。密钥护栏：redactSecrets 打码 + 出口 withholdIfSecretLike 兜底。
      return commandFullGist(command, normalRunGistMaxWidth());
    }
  }

  const path = typeof metadata.path === "string" ? metadata.path : "";
  if (path) return pathBasenameGist(path);
  const command = typeof metadata.command === "string" ? metadata.command : "";
  if (command) return commandFullGist(command, normalRunGistMaxWidth());
  const query = typeof metadata.query === "string" ? metadata.query : "";
  if (query) return clipCompactText(query, 64, "…");
  const remembered = event.toolName === "rememberMemory" && typeof metadata.content === "string"
    ? metadata.content
    : "";
  if (remembered) return clipCompactText(redactSecrets(remembered), 64, "…");
  return "";
}

/**
 * normal 档摘要出口的统一补充护栏：runtime 投影虽非模型直控，但 URL query、
 * 搜索词、命令行仍可能携带密钥形态串（?api_key=sk-…、Authorization: Bearer …、
 * ghp_/xox 系前缀）。secretScan 覆盖赋值形态，这里补令牌串形态；命中即整体
 * 放弃摘要退回纯 label——宁可少显示，不上屏可疑串（阶段 A 收敛，2026-09-02）。
 */
const NORMAL_GIST_SECRET_PATTERNS: RegExp[] = [
  /\bbearer\s+[A-Za-z0-9._~+/=-]{8,}/i,
  /\bsk-(?:ant-)?(?:api)?[0-9a-zA-Z-]{10,}/,
  /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{10,}/,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}/,
];

function withholdIfSecretLike(gist: string): string {
  if (!gist) return "";
  if (findPotentialSecrets(gist).length > 0) return "";
  if (NORMAL_GIST_SECRET_PATTERNS.some((pattern) => pattern.test(gist))) return "";
  return gist;
}

function normalToolGist(event: LocalAgentToolEvent): string {
  return withholdIfSecretLike(normalToolGistRaw(event));
}

/** >500ms 才显示，避免每行都挂 `(0s)` 噪音；<1s 用 ms，其余一位小数 s。 */
function formatNormalToolDuration(elapsedMs: unknown): string {
  if (typeof elapsedMs !== "number" || !Number.isFinite(elapsedMs) || elapsedMs <= 500) return "";
  if (elapsedMs < 1000) return `${Math.round(elapsedMs)}ms`;
  return `${(elapsedMs / 1000).toFixed(1)}s`;
}

/**
 * Ordinary-user projection of a tool event.
 *
 * Raw arguments and result bodies stay out of normal mode. Runtime-produced
 * details for the three activity-heavy tools are shown compactly: Read gets
 * its path and line range, Run gets its clipped command, and Fetch gets its
 * clipped URL. Other tools retain their derived basename/head gist.
 */
function formatNormalToolLine(
  event: LocalAgentToolEvent,
  pending: { toolName: string; argumentsPreview?: string } | undefined,
  colorEnabled: boolean,
) {
  if (event.type === "tool-call") return "";
  const toolName = event.toolName || pending?.toolName || "tool";

  // Interactive / product blocks keep their full rendering in normal mode:
  // an ask_user menu is the headless reply surface, todo lists and run cards
  // are product status — none of them are shell plumbing (cwd/echo/pipeline).
  const todoBlock = formatTodoListForCli(event, colorEnabled);
  if (todoBlock) return todoBlock;
  if (event.type === "tool-result" && (event.toolName === "ask_user" || event.metadata?.uiAskChoice)) {
    const block = formatUiAskChoiceBlock(event, colorEnabled);
    if (block) return block;
  }
  if (
    event.type === "tool-result" &&
    (toolName === "listAgents" || toolName === "startAgentRun" || toolName === "controlAgentRun")
  ) {
    // Safe projection: normal mode keeps status/outcome/counts but never the
    // raw errorMessage/logLines of a failed run — those belong to pro/verbose.
    return formatOrchestrationCardBlock(event, toolName, colorEnabled, { safe: true });
  }
  if (event.type === "tool-result" && toolName === "loadSkill") {
    return formatLoadSkillBlock(event, colorEnabled, { safe: true }) ?? "";
  }

  const label = toolLabel(toolName);
  if (readActionGate(event.metadata?.actionGate)) {
    return formatToolTraceLine(`▸ ${label}  ! ${t("toolNeedsAction")}`, colorEnabled, "error");
  }
  if (event.type === "tool-error") {
    return formatToolTraceLine(`▸ ${label}  ✗ ${toolFailureReason(event) || t("toolFailed")}`, colorEnabled, "error");
  }
  if (event.metadata?.timedOut) {
    return formatToolTraceLine(`▸ ${label}  ✗ ${t("toolTimedOut")}`, colorEnabled, "error");
  }
  if (isFailedToolResult(event)) {
    return formatToolTraceLine(`▸ ${label}  ✗ ${toolFailureReason(event) || t("toolFailed")}`, colorEnabled, "error");
  }
  const gist = normalToolGist(event);
  // editFile：gist 行追加 (+a, -r) 统计 + 多行 diff 色带块（Zed-style），
  // 让用户不打开文件也能看到改了什么。多行 chunk 天然不参与 ×N 折叠。
  const hint = editFileResultHint(event);
  const statsInline = hint?.inline ? ` ${hint.inline}` : "";
  // >500ms 的工具耗时挂成功行尾部；短操作不显示（满屏 (0s) 是噪音）。
  const durationInline = formatNormalToolDuration(event.elapsedMs);
  const tail = durationInline ? `  ✓ ${durationInline}` : "  ✓";
  const mainLine = formatToolTraceLine(
    gist ? `▸ ${label} · ${gist}${statsInline}${tail}` : `▸ ${label}${statsInline}${tail}`,
    colorEnabled,
  );
  if (hint?.detail?.length) {
    const filePath = typeof event.metadata?.path === "string" ? event.metadata.path : undefined;
    return `${mainLine}${formatEditDetailBlock(hint.detail, colorEnabled, filePath)}`;
  }
  return mainLine;
}

/**
 * 失败原因首行（normal 模式同 pro 一样显示，2026-09-01 owner 定调：失败时
 * 用户要知道具体的，而不是「工具失败」一吞了之）。清洗 ANSI/OSC、取首行、
 * clip 96，异常细节只保留可读首行，堆栈与多行诊断不上屏。
 */
function toolFailureReason(event: LocalAgentToolEvent): string {
  const metadata = (event.metadata ?? {}) as Record<string, unknown>;
  const rawError = metadata.error ?? metadata.errorMessage;
  const raw =
    (typeof rawError === "string" && rawError.trim()) ||
    event.message?.trim() ||
    (typeof event.content === "string" && event.content.trim()) ||
    event.summary?.trim() ||
    "";
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  // execShell content is structured as `stdout:` / `stderr:` sections. Prefer
  // the first actual stderr line, then stdout, then the first non-label line;
  // progress output must not hide the actionable stderr reason.
  const sectionLines = (section: "stderr" | "stdout") => {
    const start = lines.findIndex((line) => new RegExp(`^${section}\\s*:$`, "i").test(line));
    if (start < 0) return [];
    const end = lines.findIndex((line, index) => index > start && /^(stdout|stderr|exitCode)\s*:/i.test(line));
    return lines.slice(start + 1, end < 0 ? lines.length : end);
  };
  const reasonLine = sectionLines("stderr")[0] ?? sectionLines("stdout")[0] ??
    lines.find((line) => !/^(stdout|stderr|exitCode)\s*:/i.test(line)) ?? lines[0] ?? "";
  return reasonLine ? clip(redactSecrets(stripAnsi(reasonLine)), 96) : "";
}

/**
 * Resolve the skill name for a loadSkill tool event. The tool contract puts
 * `{ name }` in the input; the success result content starts with
 * `Skill "<name>" loaded inline.`. Prefer the explicit metadata/arg name,
 * then fall back to extracting it from the result content so the renderer
 * stays correct even when only `content` is populated.
 */
function resolveLoadSkillName(event: LocalAgentToolEvent): string {
  const metaName = typeof event.metadata?.name === "string" ? event.metadata.name : undefined;
  if (metaName) return metaName;
  const argName = event.argumentsPreview?.trim();
  if (argName && !argName.startsWith("{")) return argName;
  const content = typeof event.content === "string" ? event.content : "";
  const match = content.match(/Skill "([^"]+)" loaded inline/);
  if (match?.[1]) return match[1];
  return argName || "skill";
}

function formatTodoListForCli(
  event: LocalAgentToolEvent,
  colorEnabled: boolean,
): string | undefined {
  if (event.type !== "tool-result" || event.toolName !== "setTodoList") {
    return undefined;
  }
  let raw: unknown = event.metadata?.displayData;
  let parsed = typeof raw === "object" && raw !== null;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
      parsed = true;
    } catch {
      raw = undefined;
    }
  }
  if (!parsed && typeof event.content === "string") {
    try {
      raw = JSON.parse(event.content);
      parsed = true;
    } catch {
      raw = undefined;
    }
  }
  const todos = Array.isArray((raw as any)?.todos)
    ? (raw as any).todos
    : undefined;
  // Do not turn malformed tool output into a false "cleared" Todo state.
  if (!todos) return undefined;
  if (todos.length === 0) return "☑ Todo\n  (empty)\n";
  const lines = todos.map((todo: any) => {
    const status = todo?.status === "done"
      ? "✓"
      : todo?.status === "in_progress"
        ? "◐"
        : "○";
    const title = typeof todo?.title === "string" ? todo.title : "Untitled task";
    return `  ${status} ${title}`;
  });
  const text = [`☑ Todo (${todos.length})`, ...lines].join("\n") + "\n";
  return colorEnabled ? themeText(text, "chrome") : text;
}

/**
 * loadSkill: render Kimi-style "● Used Skill (<name>)" with the inline
 * follow-instructions line indented below it. not-found is a plain
 * tool-result (executors return text, never throw), so detect it here — same
 * minimal-prefix contract the web/RN renderers use — and render a failure
 * line instead of the success bullet. Shared by compact/pro and normal: the
 * loaded skill name is product feedback, not shell plumbing.
 *
 * Safe projection (normal mode): the raw failure first line (paths, exception
 * detail) stays in pro/compact; normal mode shows the localized failure only.
 */
function formatLoadSkillBlock(
  event: LocalAgentToolEvent,
  colorEnabled: boolean,
  opts?: { safe?: boolean }
): string | null {
  if (event.type !== "tool-result" || event.toolName !== "loadSkill") return null;
  const skillName = resolveLoadSkillName(event);
  const content = typeof event.content === "string" ? event.content : "";
  const failed =
    /^Skill\s+"[^"]*"\s+not found/.test(content) || isFailedToolResult(event);
  const labelText = t("usedSkillLabel");
  if (failed) {
    const message = opts?.safe === true
      ? t("toolFailed")
      : clip(content.split("\n")[0] || t("toolFailed"), 96);
    return formatToolTraceLine(`▸ ${labelText} (${skillName})  ✗ ${message}`, colorEnabled, "error");
  }
  if (!colorEnabled) {
    return `✦ ${labelText}: ${skillName}\n`;
  }
  const star = themeText("✦", "success", true);
  const labelPart = themeText(labelText, "muted", true);
  const namePart = themeText(skillName, "chrome", true);
  return `${star} ${labelPart}: ${namePart}\n`;
}

export const TUI_TREE_MARKER = "\u0001TUI_TREE\n";
export const TUI_TREE_END = "\u0002";

export type ToolEventFormatter = ((event: LocalAgentToolEvent) => string) & {
  flush?: () => string;
  reset?: () => void;
  consume?: (event: LocalAgentToolEvent) => void;
};

export function createToolEventFormatter(
  colorEnabled = resolveCliColorEnabled(),
  opts: { tuiTrees?: boolean } = {},
): ToolEventFormatter {
  const pending = new Map<string, { toolName: string; argumentsPreview?: string }>();
  let tree: { kind: "Run" | "Read" | "Search" | "Fetch"; items: string[] } | null = null;
  const treeKind = (name: string): "Run" | "Read" | "Search" | "Fetch" | null =>
    isRunToolName(name) ? "Run" : isReadToolName(name) ? "Read" : name === "exa_search" ? "Search" : name === "fetchWebpage" ? "Fetch" : null;
  const treeLine = (kind: "Run" | "Read" | "Search" | "Fetch", items: string[]) => {
    const label = kind === "Run" ? toolLabel("execShell") : kind === "Read" ? toolLabel("readFile") : kind === "Fetch" ? toolLabel("fetchWebpage") : toolLabel("exa_search");
    return `${TUI_TREE_MARKER}${label} (${items.length})\n${items.map((item, i) => `${i === items.length - 1 ? "└── " : "├── "}${item}  ✓`).join("\n")}${TUI_TREE_END}\n`;
  };

  const formatTreeEvent = (event: LocalAgentToolEvent, call: { toolName: string; argumentsPreview?: string } | undefined): string | null => {
    if (!opts.tuiTrees || event.type !== "tool-result") return null;
    if (isFailedToolResult(event) || event.metadata?.failed || event.metadata?.timedOut || readActionGate(event.metadata?.actionGate)) {
      tree = null;
      return null;
    }
    const name = event.toolName || call?.toolName || "tool";
    const kind = treeKind(name);
    if (!kind) { tree = null; return null; }
    let item = "";
    const m = event.metadata ?? {};
    if (kind === "Run") {
      const command = typeof m.command === "string" ? m.command : "";
      // argumentsPreview is intentionally never promoted to a tree leaf: it is
      // model-controlled. Only the runtime's safe command projection is used.
      item = command ? formatRunItemCommand(command, typeof m.exitCode === "number" ? m.exitCode : undefined, Boolean(m.timedOut)) : "command";
    }
    if (kind === "Read") item = formatReadItemPath(typeof m.path === "string" ? m.path : typeof m.filePath === "string" ? m.filePath : "file", m);
    if (kind === "Search") item = formatSearchItemQuery(typeof m.query === "string" ? m.query : typeof m.pattern === "string" ? m.pattern : "search", typeof m.path === "string" ? m.path : undefined);
    if (kind === "Fetch") item = formatFetchItemUrl(typeof m.url === "string" ? m.url : "webpage");
    // 折叠树叶子与单行 normal 共用 secret 出口护栏：URL/query/command 叶子
    // 携带密钥形态串时退回纯工具 label，不让 token 上屏（第二个及后续结果
    // 只走 treeLine，不经过 normalToolGist，必须在这里再包一次）。
    item = withholdIfSecretLike(item) || toolLabel(name);
    if (tree?.kind !== kind) tree = { kind, items: [] };
    tree.items.push(item);
    // Keep the first call visible immediately; the second result replaces this
    // tail row with the complete tree in the TUI history.
    if (tree.items.length < 2) return formatNormalToolLine(event, call, colorEnabled);
    return treeLine(kind, tree.items);
  };
  const format = ((event: LocalAgentToolEvent): string => {
    if (event.type === "tool-call") {
      pending.set(event.toolCallId, {
        toolName: event.toolName,
        argumentsPreview: event.argumentsPreview,
      });
      return "";
    }
    const call = pending.get(event.toolCallId);
    pending.delete(event.toolCallId);
    const treeOutput = formatTreeEvent(event, call);
    if (treeOutput !== null) return treeOutput;
    return formatNormalToolLine(event, call, colorEnabled);
  }) as ToolEventFormatter;
  format.reset = () => { tree = null; };
  format.consume = (event: LocalAgentToolEvent) => {
    if (event.type === "tool-call") {
      pending.set(event.toolCallId, {
        toolName: event.toolName,
        argumentsPreview: event.argumentsPreview,
      });
      return;
    }
    pending.delete(event.toolCallId);
    tree = null;
  };
  return format;
}

export function createSseToolEventAdapter(
  onEvent?: (event: LocalAgentToolEvent) => void
) {
  let round = 0;
  let callIndex = 0;
  let pendingCalls: Array<{ toolCallId: string; toolName: string }> = [];

  const emit = (event: LocalAgentToolEvent): LocalAgentToolEvent => {
    onEvent?.(event);
    return event;
  };

  return {
    onToolStart(
      payload:
        | { calls?: Array<string | { toolCallId: string; toolName: string }> }
        | Array<string | { toolCallId: string; toolName: string }>,
    ): LocalAgentToolEvent[] {
      const calls = Array.isArray(payload) ? payload : payload?.calls ?? [];
      pendingCalls = [];
      const events: LocalAgentToolEvent[] = [];
      for (const call of calls) {
        callIndex++;
        const toolCallId =
          typeof call === "string" && call.trim()
            ? `sse-call-${callIndex}`
            : typeof call === "object" && call.toolCallId
              ? call.toolCallId
              : `sse-call-${callIndex}`;
        const toolName =
          typeof call === "string" ? call || "tool" : call?.toolName || "tool";
        pendingCalls.push({ toolCallId, toolName });
        const event: LocalAgentToolEvent = {
          type: "tool-call",
          toolCallId,
          toolName,
          round,
        };
        events.push(emit(event));
      }
      return events;
    },

    onToolResult(payload: {
      toolCallId?: string;
      toolName?: string;
      content?: string;
      metadata?: Record<string, any>;
    }): LocalAgentToolEvent {
      const pending = payload.toolCallId
        ? pendingCalls.find((p) => p.toolCallId === payload.toolCallId)
        : pendingCalls.shift();

      if (pending && payload.toolCallId) {
        pendingCalls = pendingCalls.filter((p) => p.toolCallId !== payload.toolCallId);
      }

      const toolCallId = payload.toolCallId || pending?.toolCallId || `sse-call-${callIndex}`;
      const toolName = payload.toolName || pending?.toolName || "tool";
      const rawContent = typeof payload.content === "string" ? payload.content : "";
      const summary = rawContent ? clipCompactText(rawContent, 120, "…") : undefined;

      const event: LocalAgentToolEvent = {
        type: "tool-result",
        toolCallId,
        toolName,
        // The full payload, not just the clipped summary. Consumers that parse
        // structured results — the agent-run snapshot parser feeding the dock
        // panel, the orchestration card renderer, ask_user — all read
        // `content`; dropping it here made every one of them silently inert on
        // the HTTP/SSE path while working on the local path.
        ...(rawContent ? { content: rawContent } : {}),
        summary,
        metadata: payload.metadata,
        round,
      };
      return emit(event);
    },

    onToolEnd() {
      round++;
      pendingCalls = [];
    },
  };
}
