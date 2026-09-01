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
import { themeText } from "../tui/theme";
import { stripAnsi } from "../tui/tuiAnsi";
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
  const errorFields = safe
    ? { errorMessage: undefined, logLines: undefined }
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
  return hadError ? `${body}\n  error   ${t("runDiagnosticsHidden")}` : body;
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
    // Safe projection (normal mode): state/outcome stay, the raw diagnostic
    // (API keys, commands, stack first lines) never leaves pro/verbose.
    const firstLine = safe
      ? t("toolFailed")
      : rawDataStr.trim().split("\n")[0] || event.summary || event.message || t("toolFailed");
    const message = clip(firstLine, 96);
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
 * counts, note. Drops what leaks: the raw `error   …` row and the trailing
 * `Log tail:` section (unfiltered process output — API keys, curl commands).
 * A failed run keeps a localized pointer to pro mode instead of the raw
 * diagnostic; pro/verbose render the card untouched.
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
      out.push(`  error   ${t("runDiagnosticsHidden")}`);
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
 * 简单命令的动作名词：前两个 token（程序 + 子命令，如 "bun test"）。
 * 复合 shell——管道 / && / ; / 重定向 / 命令替换 / env 前缀 / cd 开头——
 * 按管道噪音处理，不给摘要：gist 只回答「在跑什么」，绝不携带参数细节。
 */
function commandHeadGist(command: string): string {
  const trimmed = command.replace(/\s+/g, " ").trim();
  if (!trimmed || /[|;&<>`$]/.test(trimmed)) return "";
  const tokens = trimmed.split(" ");
  if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[0]!)) return "";
  if (["cd", "pushd", "popd", "source", "."].includes(tokens[0]!)) return "";
  return gistClip(tokens.slice(0, 2).join(" "), 24);
}

function pathBasenameGist(path: string): string {
  const segments = path.split(/[\\/]/).filter((segment) => segment.length > 0);
  const base = segments.pop();
  return base ? gistClip(base) : "";
}

/**
 * normal 模式的派生摘要（gist）：动作对象的最小可感知名词，不是原始参数。
 * 只从 localLoop 安全观测投影取值（metadata.path / metadata.command，已裁剪
 * <=240）；argumentsPreview 是模型可控的原始参数文本，绝不进 normal 行。
 * 缺失时回退纯「label ✓」形式。原则（2026-08-31 owner 定调）：用户不需要
 * 全量，但需要感知 agent 大概在干嘛——raw args 是管道噪音，gist 是产品反馈。
 */
function normalToolGist(event: LocalAgentToolEvent): string {
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
      // Keep shell plumbing out of the compact activity line. For simple
      // commands show the executable/subcommand gist; the full safe command
      // remains available in the expanded Run tree.
      return commandHeadGist(command);
    }
  }

  const path = typeof metadata.path === "string" ? metadata.path : "";
  if (path) return pathBasenameGist(path);
  const command = typeof metadata.command === "string" ? metadata.command : "";
  if (command) return commandHeadGist(command);
  return "";
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
    return formatToolTraceLine(`▸ ${label}  ✗ ${t("toolFailed")}`, colorEnabled, "error");
  }
  if (event.metadata?.timedOut) {
    return formatToolTraceLine(`▸ ${label}  ✗ ${t("toolTimedOut")}`, colorEnabled, "error");
  }
  if (isFailedToolResult(event)) {
    return formatToolTraceLine(`▸ ${label}  ✗ ${t("toolFailed")}`, colorEnabled, "error");
  }
  const gist = normalToolGist(event);
  return formatToolTraceLine(gist ? `▸ ${label} · ${gist}  ✓` : `▸ ${label}  ✓`, colorEnabled);
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
    if (!item) item = toolLabel(name);
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
