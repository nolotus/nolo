import type { EvolutionCandidate } from "./candidate";
import {
  selectEvolutionConversationTurn,
  type EvolutionMaterializationMessage,
} from "./conversationTurn";
import { buildEvolutionComparableRunSample } from "./comparableRuns";
import { resolveEvolutionHistoricalBaseline } from "./historicalBaseline";
import type { EvolutionRunBaselineRecord } from "./runBaseline";
import type { EvolutionRunSnapshot } from "./types";

/**
 * Deep Review evidence loader v1.
 *
 * Turns one claimed Candidate into a bounded, review-ready evidence bundle.
 * This is pure: the host provides already-fetched messages / baseline
 * records and this module does the turn scoping (shared with
 * caseMaterialization via conversationTurn.ts), bounds enforcement, signal
 * compaction and optional baseline summarization.
 *
 * There is deliberately NO raw trace persistence for runs: the tool-side of
 * the evidence is the compact snapshot + signal evidence + whatever real
 * tool messages exist inside the bounded conversation window.
 * `traceAvailable` is always false in v1 — we do not guess at trace sources
 * that do not exist.
 */

export type { EvolutionMaterializationMessage } from "./conversationTurn";

export type EvolutionEvidenceBounds = {
  /** Max chars of serialized conversation content kept. Default below. */
  maxChars: number;
  /** Max messages kept in the conversation window. */
  maxMessages: number;
};

export const EVOLUTION_EVIDENCE_DEFAULT_MAX_CHARS = 48_000;
export const EVOLUTION_EVIDENCE_DEFAULT_MAX_MESSAGES = 120;

export type EvolutionReviewEvidence = {
  candidateId: string;
  runId?: string;
  dialogId?: string;
  task: {
    userMessageId?: string;
    text?: string;
    taskClass?: string;
  };
  conversation: {
    /**
     * The selected turn (latest textual user task at-or-before
     * candidate.createdAt → candidate boundary), clipped to `bounds`.
     * Messages are passed through unchanged — roles, ids and content are
     * real, never summarized or fabricated.
     */
    messages: EvolutionMaterializationMessage[];
    /** true when `bounds` clipped the selected turn (or no task resolved). */
    truncated: boolean;
  };
  run: {
    /** Compact snapshot summary carried on the Candidate record. */
    snapshot?: EvolutionCandidate["snapshot"];
    /** Snapshot tool-call facts (names + failure/repeat counts). */
    toolCalls?: {
      usedToolNames: string[];
      exposedToolNameCount: number;
      toolCallCount: number;
      failedToolCallCount: number;
      repeatedToolCallCount: number;
    };
    /**
     * v1 has no persisted raw trace source. Always false — reviewers must
     * reason from snapshot/signals/conversation only.
     */
    traceAvailable: boolean;
  };
  /**
   * Optional comparable-runs baseline summary (self-excluded by runId).
   * Absent when the host supplied no records or the run is unclassifiable.
   */
  baseline?: {
    sampleCount: number;
    sufficient: boolean;
    successRate?: number;
    p50?: number;
    p90?: number;
    p95?: number;
  };
  /** Compact signal list from the Candidate (kind + count/value/threshold). */
  signals: EvolutionCandidate["signals"];
};

export type MaterializeEvolutionReviewEvidenceInput = {
  candidate: EvolutionCandidate;
  /**
   * Host-provided dialog messages for the candidate's dialog — already
   * bounded at fetch time (e.g. maxChars). May be empty when the dialog is
   * unavailable; the loader degrades to snapshot/signals-only evidence.
   */
  messages: readonly EvolutionMaterializationMessage[];
  /**
   * Optional full snapshot when the host has one (e.g. fresh analysis).
   * Candidates only persist a compact summary; when absent, `run.snapshot`
   * falls back to the candidate summary fields.
   */
  snapshot?: EvolutionRunSnapshot;
  /**
   * Optional host-fetched baseline records (bounded, on-demand). When
   * provided AND a taskClass resolves, a self-excluding baseline summary is
   * attached.
   */
  records?: readonly EvolutionRunBaselineRecord[];
  bounds?: Partial<EvolutionEvidenceBounds>;
  resolveTaskClass?: (task: string) => string | null | undefined;
  decodeMessageTime?: (messageId: string) => number | null;
};

const messageChars = (message: EvolutionMaterializationMessage): number => {
  const content = message.content;
  if (typeof content === "string") return content.length;
  try {
    return JSON.stringify(content)?.length ?? 0;
  } catch {
    return 0;
  }
};

const CLIPPED_MARKER = "…[clipped]";

/**
 * The character head budget for a clip that keeps the marker. The marker is
 * counted INSIDE `charBudget` — a clipped message never exceeds its budget.
 */
const clipHeadBudget = (charBudget: number): number =>
  Math.max(0, charBudget - CLIPPED_MARKER.length);

/**
 * Clip ONE message's content to `charBudget`. String content is truncated
 * with a marker; structured content is serialized and, when it exceeds the
 * budget, replaced by a clipped text form (the extracted text head when
 * available, else the serialized head). The message identity (id/role) is
 * preserved — only the payload is clipped. The returned content length is
 * always <= `charBudget` (marker included).
 */
const clipMessageContent = (
  message: EvolutionMaterializationMessage,
  charBudget: number,
): EvolutionMaterializationMessage => {
  const content = message.content;
  if (charBudget <= 0) {
    return { ...message, content: "" };
  }
  if (typeof content === "string") {
    if (content.length <= charBudget) return message;
    return {
      ...message,
      content: `${content.slice(0, clipHeadBudget(charBudget))}${CLIPPED_MARKER}`,
    };
  }
  let serialized: string;
  try {
    serialized = JSON.stringify(content) ?? "";
  } catch {
    serialized = "";
  }
  if (serialized.length <= charBudget) return message;
  // Preserve the textual head when the content carries one (multimodal user
  // messages), else fall back to the serialized head.
  const textHead = extractTextHead(content);
  const head = textHead || serialized;
  return {
    ...message,
    content: `${head.slice(0, clipHeadBudget(charBudget))}${CLIPPED_MARKER}`,
  };
};

const extractTextHead = (content: unknown): string => {
  if (!Array.isArray(content)) return "";
  for (const part of content) {
    if (!part || typeof part !== "object") continue;
    const record = part as Record<string, unknown>;
    if (record.type === "text" && typeof record.text === "string") {
      return record.text;
    }
  }
  return "";
};

/**
 * Clip the selected turn to `bounds`. Per-message AND total bounds apply:
 * no single message — including the task message — may exceed `maxChars`,
 * and the kept set never exceeds `maxMessages`/`maxChars` in aggregate.
 *
 * Keeps the (possibly clipped) task message plus as many boundary-adjacent
 * trailing messages as fit. Anything dropped or clipped sets
 * `truncated: true`.
 */
const boundTurnMessages = (
  turn: readonly EvolutionMaterializationMessage[],
  bounds: EvolutionEvidenceBounds,
): { messages: EvolutionMaterializationMessage[]; truncated: boolean } => {
  if (turn.length === 0) return { messages: [], truncated: false };

  let truncated = false;

  // The task message is clipped to fit within maxChars too — a pasted blob
  // must not bypass the bound just because it is the selected task.
  const rawTask = turn[0]!;
  const taskChars = messageChars(rawTask);
  const taskMessage = clipMessageContent(rawTask, bounds.maxChars);
  if (taskChars > bounds.maxChars) truncated = true;
  const kept: EvolutionMaterializationMessage[] = [taskMessage];
  let chars = messageChars(taskMessage);

  // Walk backwards from the candidate boundary; prepend while within budget.
  for (let i = turn.length - 1; i >= 1; i--) {
    const message = turn[i]!;
    const nextCount = kept.length + 1;
    const rawChars = messageChars(message);
    // Per-message clip first so a single oversized message cannot blow the
    // aggregate budget — it enters clipped (and flags truncated) rather than
    // being dropped wholesale when a head is still informative.
    const remaining = bounds.maxChars - chars;
    const clipped = clipMessageContent(message, Math.min(rawChars, remaining));
    const clippedChars = messageChars(clipped);
    if (nextCount > bounds.maxMessages || clippedChars > remaining) {
      truncated = true;
      continue; // keep scanning: a smaller earlier message may still fit
    }
    if (clippedChars < rawChars) truncated = true;
    kept.splice(1, 0, clipped);
    chars += clippedChars;
  }
  if (turn.length - 1 > kept.length - 1) truncated = true;

  return { messages: kept, truncated };
};

/**
 * Build the Deep Review evidence bundle for one candidate. Pure function.
 */
export const materializeEvolutionReviewEvidence = (
  input: MaterializeEvolutionReviewEvidenceInput,
): EvolutionReviewEvidence => {
  const bounds: EvolutionEvidenceBounds = {
    maxChars: input.bounds?.maxChars ?? EVOLUTION_EVIDENCE_DEFAULT_MAX_CHARS,
    maxMessages:
      input.bounds?.maxMessages ?? EVOLUTION_EVIDENCE_DEFAULT_MAX_MESSAGES,
  };

  const selection = selectEvolutionConversationTurn({
    messages: input.messages,
    candidateCreatedAt: input.candidate.createdAt,
    ...(input.decodeMessageTime
      ? { decodeMessageTime: input.decodeMessageTime }
      : {}),
  });

  const { messages, truncated } = boundTurnMessages(selection.turnMessages, bounds);
  // task.text reflects the clipped message actually shipped in
  // conversation.messages — the reviewer sees exactly what was bounded.
  const clippedTaskMessage = messages[0];
  const taskText =
    clippedTaskMessage && selection.taskMessage
      ? (typeof clippedTaskMessage.content === "string"
          ? clippedTaskMessage.content
          : selection.taskText)
      : selection.taskText;
  const taskClass = taskText
    ? input.resolveTaskClass?.(selection.taskText) ?? undefined
    : undefined;

  const summary = input.candidate.snapshot;
  const runSnapshot = input.snapshot;
  const toolCalls = runSnapshot
    ? {
        usedToolNames: [...runSnapshot.usedToolNames],
        exposedToolNameCount: runSnapshot.exposedToolNames.length,
        toolCallCount: runSnapshot.toolCallCount,
        failedToolCallCount: runSnapshot.failedToolCallCount,
        repeatedToolCallCount: runSnapshot.repeatedToolCallCount,
      }
    : {
        usedToolNames: [...summary.usedToolNames],
        exposedToolNameCount: summary.exposedToolNameCount,
        toolCallCount: summary.toolCallCount,
        failedToolCallCount: summary.failedToolCallCount,
        repeatedToolCallCount: summary.repeatedToolCallCount,
      };

  let baseline: EvolutionReviewEvidence["baseline"];
  if (input.records && taskClass) {
    // Resolve the comparable key the same way comparableRuns does for cases,
    // but without requiring a full MaterializedEvolutionCase — the evidence
    // bundle itself carries the resolved taskClass.
    const sample = buildEvolutionComparableRunSample({
      candidate: input.candidate,
      materializedCase: {
        caseId: "evidence",
        candidateId: input.candidate.id,
        task: { status: "resolved", taskClass },
        trajectory: {
          messageCount: 0,
          userMessageCount: 0,
          assistantMessageCount: 0,
          toolMessageCount: 0,
          systemMessageCount: 0,
        },
      },
    });
    if (sample) {
      const resolved = resolveEvolutionHistoricalBaseline({
        key: sample.key,
        records: input.records,
        ...(input.candidate.runId
          ? { currentRunId: input.candidate.runId }
          : {}),
      });
      const d = resolved.baseline?.durationMs;
      baseline = {
        sampleCount: resolved.sampleCount,
        sufficient: resolved.sufficient,
        ...(resolved.baseline
          ? { successRate: resolved.baseline.successRate }
          : {}),
        ...(d ? { p50: d.p50, p90: d.p90, p95: d.p95 } : {}),
      };
    }
  }

  return {
    candidateId: input.candidate.id,
    ...(input.candidate.runId ? { runId: input.candidate.runId } : {}),
    ...(input.candidate.dialogId ? { dialogId: input.candidate.dialogId } : {}),
    task: {
      ...(selection.taskMessage
        ? { userMessageId: selection.taskMessage.id }
        : {}),
      ...(taskText ? { text: taskText } : {}),
      ...(taskClass ? { taskClass } : {}),
    },
    conversation: { messages, truncated },
    run: {
      snapshot: summary,
      toolCalls,
      traceAvailable: false,
    },
    ...(baseline ? { baseline } : {}),
    signals: input.candidate.signals,
  };
};
