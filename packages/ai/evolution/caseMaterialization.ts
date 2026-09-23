import { decodeTime } from "ulid";
import type { EvolutionCandidate } from "./candidate";
import type { EvolutionCase } from "./case";

export type EvolutionMaterializationMessage = {
  id: string;
  role: "user" | "assistant" | "system" | "tool" | string;
  content: unknown;
};

export type EvolutionTaskEvidence = {
  status: "resolved" | "unresolved";
  messageId?: string;
  text?: string;
  taskClass?: string;
};

export type EvolutionTrajectorySummary = {
  messageCount: number;
  userMessageCount: number;
  assistantMessageCount: number;
  toolMessageCount: number;
  systemMessageCount: number;
  latestIncludedMessageId?: string;
};

export type MaterializedEvolutionCase = {
  caseId: string;
  candidateId: string;
  task: EvolutionTaskEvidence;
  trajectory: EvolutionTrajectorySummary;
};

export type MaterializeEvolutionCaseInput = {
  evolutionCase: EvolutionCase;
  candidate: EvolutionCandidate;
  messages: readonly EvolutionMaterializationMessage[];
  resolveTaskClass?: (task: string) => string | null | undefined;
  decodeMessageTime?: (messageId: string) => number | null;
};

const extractTextContent = (content: unknown): string => {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";

  return content
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      const record = part as Record<string, unknown>;
      return record.type === "text" && typeof record.text === "string"
        ? record.text
        : "";
    })
    .join("")
    .trim();
};

const defaultDecodeMessageTime = (messageId: string): number | null => {
  try {
    return decodeTime(messageId);
  } catch {
    return null;
  }
};

/**
 * Build an ephemeral, privacy-bounded evidence view for one EvolutionCase.
 *
 * The durable Case stays reference-only. Materialization receives already
 * bounded dialog messages from the host, selects the latest textual user task
 * that existed when the candidate was created, and summarizes only that turn
 * (task -> candidate boundary). Later turns and earlier turns in the same dialog
 * are excluded so their trajectory facts cannot be misattributed to this run.
 *
 * No conversation copy is persisted here; the output contains one selected
 * user-task text plus aggregate trajectory counts only. Causal analysis and
 * suspicious-span selection belong to later stages.
 */
export const materializeEvolutionCase = (
  input: MaterializeEvolutionCaseInput,
): MaterializedEvolutionCase => {
  const candidateTime = Date.parse(input.candidate.createdAt);
  const decodeMessageTime = input.decodeMessageTime ?? defaultDecodeMessageTime;

  const eligible = Number.isFinite(candidateTime)
    ? input.messages
        .map((message) => ({ message, atMs: decodeMessageTime(message.id) }))
        .filter(
          (entry): entry is { message: EvolutionMaterializationMessage; atMs: number } =>
            typeof entry.atMs === "number" && entry.atMs <= candidateTime,
        )
        .sort((a, b) => a.atMs - b.atMs || a.message.id.localeCompare(b.message.id))
    : [];

  const selectedTaskIndex = [...eligible]
    .map((entry, index) => ({ entry, index }))
    .reverse()
    .find(({ entry }) =>
      entry.message.role === "user" && Boolean(extractTextContent(entry.message.content)),
    )?.index;

  const selectedTask =
    typeof selectedTaskIndex === "number" ? eligible[selectedTaskIndex] : undefined;
  const taskText = selectedTask ? extractTextContent(selectedTask.message.content) : "";
  const taskClass = taskText ? input.resolveTaskClass?.(taskText) ?? undefined : undefined;
  const turnEntries =
    typeof selectedTaskIndex === "number" ? eligible.slice(selectedTaskIndex) : [];

  const trajectory: EvolutionTrajectorySummary = {
    messageCount: turnEntries.length,
    userMessageCount: turnEntries.filter((entry) => entry.message.role === "user").length,
    assistantMessageCount: turnEntries.filter((entry) => entry.message.role === "assistant").length,
    toolMessageCount: turnEntries.filter((entry) => entry.message.role === "tool").length,
    systemMessageCount: turnEntries.filter((entry) => entry.message.role === "system").length,
    ...(turnEntries.at(-1)?.message.id
      ? { latestIncludedMessageId: turnEntries.at(-1)!.message.id }
      : {}),
  };

  return {
    caseId: input.evolutionCase.id,
    candidateId: input.candidate.id,
    task: taskText && selectedTask
      ? {
          status: "resolved",
          messageId: selectedTask.message.id,
          text: taskText,
          ...(taskClass ? { taskClass } : {}),
        }
      : { status: "unresolved" },
    trajectory,
  };
};
