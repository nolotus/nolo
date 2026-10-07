import { estimateTokenCount } from "../../context/tokenUtils";
import type { DelegatedPayloadMetrics } from "../../../agent-runtime/executionObservation";
export type { DelegatedPayloadMetrics };

/**
 * 组装委托任务的 content：统一用「指令 + 输入」的简单文本协议。
 * 曾属于已删除的旧委托工具模块，现为 startAgentRun（及 CLI 端独立副本）
 * 共用的公共协议。
 *
 * 优化点：
 * 1. 无 input 或 input 为空串时直接返回 task，不产生额外 section。
 * 2. 当 string input 与 task 去除首尾空白后完全相同时，自动去重返回 task，
 *    避免编排方无意识的 parent->leaf 双重复制。
 * 3. 完整保留正文内容，绝不静默截断。
 */
export function buildDelegatedTaskContent(task: string, input?: any): string {
  if (input === undefined || input === null) {
    return task;
  }
  if (typeof input === "string") {
    const trimmedInput = input.trim();
    if (!trimmedInput || trimmedInput === task.trim()) {
      return task;
    }
    return `${task}\n\n--- INPUT (text) ---\n${input}`;
  }
  let jsonStr: string;
  try {
    // 先用无缩进序列化探测：Bun 的 pretty-print(indent) 路径在遇到循环引用时
    // 会先做完昂贵的缩进展开才抛错（实测单对象 ~950ms，compact ~2ms）。
    // 循环/不可序列化输入让 compact 快速抛错，避免 5s 超时内多次 pretty 调用叠加。
    JSON.stringify(input);
    const serialized = JSON.stringify(input, null, 2);
    if (serialized === undefined) {
      return task;
    }
    jsonStr = serialized;
  } catch {
    jsonStr = "[Unserializable Input]";
  }
  return `${task}\n\n--- INPUT (json) ---\n${jsonStr}`;
}

/**
 * 计算委托 payload 的尺寸和预估 token 数量。
 */
export function calculateDelegatedPayloadMetrics(
  task: string,
  input?: any,
  delegatedContent?: string,
): DelegatedPayloadMetrics {
  const taskText = typeof task === "string" ? task : "";
  const taskChars = taskText.length;

  let inputChars = 0;
  let serializedInputForTokens: string | undefined = undefined;

  if (input !== undefined && input !== null) {
    if (typeof input === "string") {
      inputChars = input.length;
      serializedInputForTokens = input;
    } else {
      try {
        // 同上：先 compact 探测，避免 Bun indent 路径在循环引用上的昂贵展开。
        JSON.stringify(input);
        const serialized = JSON.stringify(input, null, 2);
        if (serialized !== undefined) {
          inputChars = serialized.length;
          serializedInputForTokens = serialized;
        } else {
          inputChars = 0;
        }
      } catch {
        const fallback = "[Unserializable Input]";
        inputChars = fallback.length;
        serializedInputForTokens = fallback;
      }
    }
  }

  const finalContent = delegatedContent ?? buildDelegatedTaskContent(task, input);
  const totalChars = finalContent.length;
  const estimatedTaskTokens = estimateTokenCount(taskText);
  const estimatedTotalTokens = estimateTokenCount(finalContent);
  const estimatedInputTokens =
    serializedInputForTokens && inputChars > 0
      ? estimateTokenCount(serializedInputForTokens)
      : 0;

  return {
    taskChars,
    inputChars,
    totalChars,
    estimatedTaskTokens,
    estimatedInputTokens,
    estimatedTotalTokens,
  };
}

export function getAgentRunStatusIcon(status: string): string {
  switch (status) {
    case "running":
    case "pending":
      return "⏳";
    case "done":
      return "✓";
    case "failed":
    case "timeout":
      return "✗";
    case "killed":
    case "cancelled":
    case "cancelling":
      return "🛑";
    case "orphaned":
      // Distinct from killed: the process vanished without writing a terminal
      // status (OOM/crash/network). A ghost icon signals "we inferred death".
      return "👻";
    case "not_found":
    default:
      return "?";
  }
}

/**
 * Optional localized labels for run cards.
 * `packages/ai` keeps English defaults; CLI injects zh/en copy so this
 * module never depends on `packages/cli`.
 */
export type AgentRunDisplayLabels = {
  runStatus?: string;
  runStarted?: string;
  runStopped?: string;
  runFinished?: string;
  logTail?: string;
  /** Header for list cards, e.g. `Runs (3)` / `运行 (3)`. */
  runs?: (count: number) => string;
  /** Tool-count fact, e.g. `12 tools` / `12 个工具`. Defaults to English. */
  toolCount?: (count: number) => string;
  /** Status word in card bodies, e.g. `done` / `完成`. Defaults to the raw store status. */
  statusWord?: (status: string) => string;
  /**
   * Row labels for card bodies (display labels only — raw log lines and
   * protocol values are never translated). Values carry their own padding so
   * the default English layout stays byte-identical.
   */
  rows?: Partial<Record<"agent" | "status" | "tools" | "note" | "error" | "task", string>>;
  /**
   * Placeholder shown when a run's only name is a machine key
   * (`agent-pub-…`): it names the *kind* of actor, not the instance, so a
   * reader sees "sub-agent dispatched" instead of an opaque id. English
   * default "agent"; the CLI injects the localized sub-agent copy.
   */
  unnamedAgent?: string;
};

const DEFAULT_LABELS = {
  runStatus: "Run status",
  runStarted: "Run started",
  runStopped: "Run stopped",
  runFinished: "Run finished",
  logTail: "Log tail:",
  runs: (count: number) => `Runs (${count})`,
  toolCount: (count: number) => `${count} tools`,
  statusWord: (status: string) => status,
  unnamedAgent: "agent",
  rows: {
    agent: "agent   ",
    status: "status  ",
    tools: "tools   ",
    note: "note    ",
    error: "error   ",
    task: "task    ",
  },
} as const;

function resolveLabels(labels?: AgentRunDisplayLabels) {
  return {
    runStatus: labels?.runStatus ?? DEFAULT_LABELS.runStatus,
    runStarted: labels?.runStarted ?? DEFAULT_LABELS.runStarted,
    runStopped: labels?.runStopped ?? DEFAULT_LABELS.runStopped,
    runFinished: labels?.runFinished ?? DEFAULT_LABELS.runFinished,
    logTail: labels?.logTail ?? DEFAULT_LABELS.logTail,
    runs: labels?.runs ?? DEFAULT_LABELS.runs,
    toolCount: labels?.toolCount ?? DEFAULT_LABELS.toolCount,
    statusWord: labels?.statusWord ?? DEFAULT_LABELS.statusWord,
    unnamedAgent: labels?.unnamedAgent ?? DEFAULT_LABELS.unnamedAgent,
    rows: { ...DEFAULT_LABELS.rows, ...(labels?.rows ?? {}) },
  };
}

/** Short form used to tell parallel runs apart in cards and panels. */
export function shortRunId(runId: string | undefined | null): string {
  const trimmed = typeof runId === "string" ? runId.trim() : "";
  if (!trimmed) return "";
  // Every id scheme here is time-prefixed — `run-<ISO>-<rand>` from the CLI's
  // local registry, ULID/UUIDv7 from the server — so the entropy sits at the
  // END. A leading slice collapses everything started in the same period onto
  // one string: real local runs all rendered as `run-2026`, which is precisely
  // no disambiguation at all. Prefer the trailing unique segment.
  const segments = trimmed.split("-").filter(Boolean);
  let pick = segments[segments.length - 1] ?? trimmed;
  // A very short trailing segment on its own reads as noise (`1`), and slicing
  // the raw id instead would cut mid-token (`n-fold-1`); widening to the last
  // two segments keeps it readable and still unique.
  if (pick.length < 4 && segments.length >= 2) pick = segments.slice(-2).join("-");
  if (!pick) pick = trimmed;
  return pick.length > 8 ? pick.slice(-8) : pick;
}

/** 折叠空白并截断到 max（含省略号）。卡片和面板共用同一把尺子。 */
export function clipText(text: string, max: number): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  return collapsed.length > max ? `${collapsed.slice(0, max - 1)}…` : collapsed;
}

/** How long a run has been going, or how long it took once it ended. */
export type RunTiming = {
  startedAt?: number;
  finishedAt?: number;
};

/**
 * `12s` / `2m14s` / `1h04m` — a duration a reader can compare against their own
 * sense of how long they have been waiting.
 *
 * Seconds are dropped past the hour mark: at that scale the precision is noise,
 * and the row has to stay one terminal line.
 */
export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  if (totalSec < 60) return `${totalSec}s`;
  const totalMin = Math.floor(totalSec / 60);
  if (totalMin < 60) return `${totalMin}m${String(totalSec % 60).padStart(2, "0")}s`;
  return `${Math.floor(totalMin / 60)}h${String(totalMin % 60).padStart(2, "0")}m`;
}

/**
 * Age of a run: wall time since it started, frozen at `finishedAt` once it ends.
 *
 * Returns "" when the run reports no start time — an absent duration is better
 * than a wrong one, and older servers do not send the field.
 */
export function formatRunAge(timing: RunTiming | undefined, now: number = Date.now()): string {
  const startedAt = timing?.startedAt;
  if (typeof startedAt !== "number" || !Number.isFinite(startedAt) || startedAt <= 0) {
    return "";
  }
  const end =
    typeof timing?.finishedAt === "number" && Number.isFinite(timing.finishedAt) && timing.finishedAt > 0
      ? timing.finishedAt
      : now;
  return formatDuration(end - startedAt);
}

/**
 * Machine-generated agent ids (see `core/prefix.ts` — the mint shapes):
 *
 * *  - `agent-<accountId>-<id|slug>` — owned key (`ownedAgentKeyPrefix`); the
 *    account id is the hex slice produced by `generateUserIdV1` (10 chars,
 *    matched as ≥8 for slack), so a first segment that is not hex is a
 *    human name (`agent-writer`).
 *  - `agent-pub-<id>` — public key (`publicAgentKey`); ULID-ish ids run
 *    ≥10 lowercase-alnum chars.
 *  - `agent-system-<id>` — platform system copy (`systemAgentKey`).
 *  - `run-<ISO>-<rand>` — run ids, which `resolveRunLabel` can hand back
 *    when a record carries no name at all.
 *
 * A bare key is a lookup handle, not a display name. Judging by *structure*
 * rather than the `agent-` prefix keeps genuinely human names —
 * `agent-writer`, `Agent-review-team` — on the card. (Same shape table as
 * agentRunPanelLines' AUTO_IDENTITY_PATTERNS, duplicated because the panel
 * module lives in the TUI layer this file cannot import.)
 */
const AGENT_KEY_NAME_PATTERNS: readonly RegExp[] = [
  /^agent-[0-9a-f]{6,}-[a-z0-9]/i,
  /^agent-pub-[a-z0-9]+/i,
  /^agent-system-[a-z0-9]+/i,
  /^run-\d{4}-\d{2}-\d{2}T[\d-]+Z-[a-z0-9]+$/i,
];

function isAgentKeyShapedName(agentName: string): boolean {
  const trimmed = agentName.trim();
  return AGENT_KEY_NAME_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * `agent   <name>  #<runId>` — the row that lets a reader tell two concurrent
 * runs apart. Either half may be missing; an empty result means the run
 * carries no identity at all and the row is dropped by the callers.
 *
 * `title` takes over the row (`<title> · <name>  #<id>`), matching the
 * run-zone convention: the title names the run in the caller's own words,
 * the agent name stays on as secondary info. The `#id` suffix always stays
 * — it demotes to a trailing detail rather than disappearing, because the
 * moment two runs share a title it is the only way to tell them apart
 * (runZoneLines reaches the same conclusion by re-adding the id on
 * duplicate titles; keeping it unconditionally is simpler and never wrong).
 * `titleOnOwnLine` is for cards that print the title as its own first line
 * (formatStartRunCard): the row keeps `name  #id` rather than composing
 * `title · name` again.
 */
function formatIdentityRow(
  agentName: string,
  runId?: string,
  opts?: { title?: string; titleOnOwnLine?: boolean; unnamedAgent?: string }
): string {
  const trimmed = typeof agentName === "string" ? agentName.trim() : "";
  const title = opts?.title?.trim();
  // Resolve the display name once: real name > kind-of-actor placeholder for
  // machine keys > nothing for the literal fallback.
  let displayName = "";
  if (!isAgentNameFallback(trimmed)) {
    if (isAgentKeyShapedName(trimmed)) {
      // A machine key reaches the card only as resolveRunLabel's last resort:
      // swap it for the placeholder rather than printing the key itself.
      displayName = opts?.unnamedAgent?.trim() ?? "";
    } else {
      displayName = trimmed;
    }
  }
  // resolveRunLabel may have picked the title itself as the label (name
  // fields all empty); the title is never the agent's name, so it yields.
  if (displayName === title) displayName = "";
  const short = shortRunId(runId);
  const idSuffix = short ? `  #${short}` : "";
  if (title) {
    if (opts?.titleOnOwnLine) {
      // Start card: the title rides its own line above — the identity row
      // keeps `name  #id`; the id is demoted, not dropped.
      return displayName ? `${displayName}${idSuffix}` : short ? `#${short}` : "";
    }
    // `title · name  #id` — single-space separator after the title, matching
    // the run-zone form; the row label already supplies the visual padding.
    if (displayName) return `${title} · ${displayName}${idSuffix}`;
    return `${title}${idSuffix}`;
  }
  const parts: string[] = [];
  if (displayName) parts.push(displayName);
  if (short) parts.push(`#${short}`);
  return parts.join("  ");
}

/** True when the name is missing or the literal `"agent"` fallback. */
export function isAgentNameFallback(agentName: string | undefined | null): boolean {
  const trimmed = typeof agentName === "string" ? agentName.trim() : "";
  return !trimmed || trimmed === "agent";
}

/** The identity fields a run may carry, in descending display preference. */
export type RunLabelFields = {
  agentName?: unknown;
  name?: unknown;
  title?: unknown;
  agentKey?: unknown;
  runId?: unknown;
};

/**
 * Pick the most identifying label available for a run.
 *
 * `agentName` is optional everywhere (startAgentRun only requires `agentKey`),
 * so anything rendered off `agentName` alone degrades to a screen of identical
 * `agent` rows. `title` outranks `agentKey`: it is the caller's own words for
 * what the run is, where a key only says which agent. `agentKey` is present on
 * every run record and `runId` is unique, so both are strictly better
 * fallbacks than the literal.
 *
 * Returns the literal `"agent"` only when a run carries no identity at all —
 * that keeps `isAgentNameFallback(resolveRunLabel(run))` true, which is how the
 * card formatters decide to drop the name row entirely.
 *
 * Fields are typed `unknown` because callers hand over raw parsed JSON.
 */
export function resolveRunLabel(run: RunLabelFields): string {
  for (const candidate of [run.agentName, run.name, run.title, run.agentKey, run.runId]) {
    if (typeof candidate === "string" && !isAgentNameFallback(candidate)) {
      return candidate.trim();
    }
  }
  return "agent";
}

export function formatStartRunCard(
  agentName: string,
  status: string = "running",
  opts?: {
    /** Delegated task text — the only thing that tells two runs apart on sight. */
    task?: string;
    /** Caller-supplied short title; when present it replaces the task preview row. */
    title?: string;
    runId?: string;
    labels?: AgentRunDisplayLabels;
  }
): string {
  const L = resolveLabels(opts?.labels);
  const icon = getAgentRunStatusIcon(status);
  const lines = [L.runStarted];
  // Title wins over taskPreview: the caller wrote it to name this run, where
  // the preview is just the first sentence of the brief (often boilerplate).
  // It renders unlabeled — it IS the card's subject, not a field of it.
  const title = opts?.title?.trim();
  if (title) {
    lines.push(`  ${title}`);
  }
  // The title rides its own line above, so the identity row must NOT compose
  // `title · name` again — `titleOnOwnLine` keeps `name  #id` (the id stays
  // as a trailing detail: two runs can share a title); `title` is also
  // passed so a label that IS the title dedupes to just `#id`.
  const identity = formatIdentityRow(agentName, opts?.runId, {
    title,
    titleOnOwnLine: true,
    unnamedAgent: L.unnamedAgent,
  });
  if (identity) {
    lines.push(`  ${L.rows.agent}${identity}`);
  }
  lines.push(`  ${L.rows.status}${icon} ${L.statusWord(status)}`);
  const task = opts?.task?.trim();
  if (task && !title) {
    lines.push(`  ${L.rows.task}${clipText(task, TASK_PREVIEW_MAX)}`);
  }
  return lines.join("\n");
}

/** Card rows stay one terminal line; long text is clipped, never wrapped. */
export const TASK_PREVIEW_MAX = 72;
const NOTE_PREVIEW_MAX = 72;

/**
 * Progress row: `12 tools · read, grep`. Both halves are optional — the run may
 * report a count with no names yet, or names with no count.
 *
 * Deliberately absent: poll count and poll round-trip time. Both describe the
 * *observer* (how often the model checked, how fast the status endpoint
 * answered), not the run, and the round-trip reads as the run's own duration —
 * a 2ms figure next to a two-minute run. Per-poll timing still exists in
 * verbose tool-trace mode, which is where observer detail belongs.
 */
function formatProgressRow(
  toolCallCount?: number,
  lastToolNames?: string[],
  labels: { toolCount: (count: number) => string } = DEFAULT_LABELS
): string {
  const parts: string[] = [];
  if (typeof toolCallCount === "number" && Number.isFinite(toolCallCount)) {
    parts.push(labels.toolCount(toolCallCount));
  }
  if (lastToolNames && lastToolNames.length > 0) {
    parts.push(lastToolNames.join(", "));
  }
  return parts.join(" · ");
}

export function formatStatusRunCard(
  agentName: string,
  status: string = "running",
  opts?: {
    lastToolNames?: string[];
    toolCallCount?: number;
    /** Latest assistant sentence from the run — the cheapest "what is it doing". */
    lastAssistantText?: string;
    errorMessage?: string;
    logLines?: string[];
    runId?: string;
    /** Caller-supplied short title; shown instead of `name  #id` when present. */
    title?: string;
    timing?: RunTiming;
    /** When false, omit the Log tail section (unchanged since last emit). */
    includeLogTail?: boolean;
    now?: number;
    labels?: AgentRunDisplayLabels;
  }
): string {
  const L = resolveLabels(opts?.labels);
  const icon = getAgentRunStatusIcon(status);
  const age = formatRunAge(opts?.timing, opts?.now);
  // Age sits on the status line rather than in its own row: "how long has this
  // been going" is read together with "is it still going", not separately.
  const lines = [L.runStatus, `  ${icon} ${L.statusWord(status)}${age ? `   ${age}` : ""}`];
  // Never render `agent   agent` — skip the row when there is no identity.
  // With a title the row becomes `agent   <title> · <name>  #<id>` (run-zone
  // form): the title names the run, the name says which agent, and the `#id`
  // stays as a trailing detail — two concurrent runs can share one title.
  const identity = formatIdentityRow(agentName, opts?.runId, {
    title: opts?.title,
    unnamedAgent: L.unnamedAgent,
  });
  if (identity) {
    lines.push(`  ${L.rows.agent}${identity}`);
  }
  const progress = formatProgressRow(opts?.toolCallCount, opts?.lastToolNames, L);
  if (progress) {
    lines.push(`  ${L.rows.tools}${progress}`);
  }
  const note = opts?.lastAssistantText?.trim();
  if (note) {
    lines.push(`  ${L.rows.note}${clipText(note, NOTE_PREVIEW_MAX)}`);
  }
  if (opts?.errorMessage?.trim()) {
    lines.push(`  ${L.rows.error}${opts.errorMessage.trim()}`);
  }
  if (shouldShowLogTail(status, opts?.includeLogTail, opts?.logLines)) {
    lines.push("", L.logTail, ...opts!.logLines!.map((l) => `  ${l}`));
  }
  return lines.join("\n");
}

/**
 * Raw stdout is shown only when the run went wrong.
 *
 * On a healthy run the tail is the sub-agent's process output — half-written
 * JSON, provider chatter, whatever byte sequence happened to land last — and it
 * pushed the rows a reader actually needs off the card. `tools` and `note` say
 * what a running agent is doing; the log says it only by accident. When a run
 * fails the same bytes become the most useful thing on screen, so they come
 * back, unfiltered: a truncated `DATA_CLONE_ERR: 25,` is noise beside a running
 * run and evidence beside a failed one, and no heuristic can tell those apart
 * without also discarding real diagnostics.
 */
export function runShowsLogTail(status: string): boolean {
  return status === "failed" || status === "timeout";
}

function shouldShowLogTail(
  status: string,
  includeLogTail: boolean | undefined,
  logLines: string[] | undefined
): boolean {
  if (includeLogTail === false) return false;
  if (!logLines || logLines.length === 0) return false;
  return runShowsLogTail(status);
}

/**
 * The card a run gets when it ends: outcome, how long it took, what it did, and
 * what it said last. A run reaching `done` used to produce no distinct output at
 * all — the last status poll simply stopped saying `running`, so the moment a
 * background run finished was the one moment it was invisible.
 */
export function formatFinishedRunCard(
  agentName: string,
  status: string,
  opts?: {
    runId?: string;
    /** Caller-supplied short title; shown instead of `name  #id` when present. */
    title?: string;
    toolCallCount?: number;
    lastToolNames?: string[];
    lastAssistantText?: string;
    errorMessage?: string;
    logLines?: string[];
    timing?: RunTiming;
    /** When false, omit the Log tail section (unchanged since last emit). */
    includeLogTail?: boolean;
    now?: number;
    labels?: AgentRunDisplayLabels;
  }
): string {
  const L = resolveLabels(opts?.labels);
  const icon = getAgentRunStatusIcon(status);
  const age = formatRunAge(opts?.timing, opts?.now);
  const summary = [L.statusWord(status), age, formatProgressRow(opts?.toolCallCount, opts?.lastToolNames, L)]
    .filter(Boolean)
    .join(" · ");
  const lines = [L.runFinished, `  ${icon} ${summary}`];
  const identity = formatIdentityRow(agentName, opts?.runId, {
    title: opts?.title,
    unnamedAgent: L.unnamedAgent,
  });
  if (identity) {
    lines.push(`  ${L.rows.agent}${identity}`);
  }
  const note = opts?.lastAssistantText?.trim();
  if (note) {
    lines.push(`  note    ${clipText(note, NOTE_PREVIEW_MAX)}`);
  }
  if (opts?.errorMessage?.trim()) {
    lines.push(`  error   ${opts.errorMessage.trim()}`);
  }
  if (shouldShowLogTail(status, opts?.includeLogTail, opts?.logLines)) {
    lines.push("", L.logTail, ...opts!.logLines!.map((l) => `  ${l}`));
  }
  return lines.join("\n");
}

export function formatStopRunCard(
  status: string = "killed",
  labels?: AgentRunDisplayLabels
): string {
  const L = resolveLabels(labels);
  const icon = getAgentRunStatusIcon(status);
  return `${L.runStopped}\n  ${icon} ${L.statusWord(status)}`;
}

export function formatListRunsCard(
  runs: Array<RunLabelFields & { status?: string }>,
  labels?: AgentRunDisplayLabels
): string {
  const L = resolveLabels(labels);
  const lines = [L.runs(runs.length)];
  for (const run of runs) {
    const status = run.status ?? "—";
    const icon = getAgentRunStatusIcon(status);
    // runId stays out of the card by design (c88e918d0): it is noise next to a
    // readable name and callers act on `rawData.runs[].runId` anyway.
    lines.push(`  ${icon}  ${resolveRunLabel(run)}`);
  }
  return lines.join("\n");
}

export function formatNotFoundRunCard(labels?: AgentRunDisplayLabels): string {
  const L = resolveLabels(labels);
  return `${L.runStatus}\n  ? ${L.statusWord("not_found")}`;
}

/** Not exported: `isAgentRunTerminalStatus` is the only intended entry point. */
const AGENT_RUN_TERMINAL_STATUSES = new Set([
  "done",
  "failed",
  "timeout",
  "killed",
  "cancelled",
  // orphaned: pid gone but the run record was still "running" — the process
  // died (killed/OOM/crashed) before writing its own terminal status. Treated
  // as terminal by all display/filter/GC consumers.
  "orphaned",
]);
// Layer boundary (handoff doc §12.7 — "分层，不是漂移"): this set is the
// ~/.nolo/runs/<runId>.json file carrier's terminal axis. The in-memory
// process registry axis lives in packages/agent-runtime/processTask.ts
// (PROCESS_TASK_STATUSES / PROCESS_TASK_TERMINAL_STATUSES). The two never
// merged because no value crosses between them: run control kills via an
// injected `process.kill(pid, signal)` (never via processRegistry), and the
// registry writes nothing to ~/.nolo/runs. No pathway → no drift surface.
// timeout/killed describe process-level events that only exist on this
// (file/supervised-run) axis; merge only if a real cross-layer pathway appears.

export function isAgentRunTerminalStatus(status: string | undefined): boolean {
  return typeof status === "string" && AGENT_RUN_TERMINAL_STATUSES.has(status);
}
