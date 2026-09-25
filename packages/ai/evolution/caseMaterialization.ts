import type { EvolutionCandidate } from "./candidate";
import type { EvolutionCase } from "./case";
import {
  selectEvolutionConversationTurn,
  type EvolutionMaterializationMessage,
} from "./conversationTurn";

export type { EvolutionMaterializationMessage } from "./conversationTurn";

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

/**
 * Build an ephemeral, privacy-bounded evidence view for one EvolutionCase.
 *
 * The durable Case stays reference-only. Materialization receives already
 * bounded dialog messages from the host, selects the latest textual user task
 * that existed when the candidate was created, and summarizes only that turn
 * (task -> candidate boundary). Later turns and earlier turns in the same dialog
 * are excluded so their trajectory facts cannot be misattributed to this run.
 *
 * Turn selection is shared with the Deep Review evidence loader via
 * `selectEvolutionConversationTurn` (conversationTurn.ts) — the two consumers
 * must never diverge on which slice of a dialog belongs to one run.
 *
 * No conversation copy is persisted here; the output contains one selected
 * user-task text plus aggregate trajectory counts only. Causal analysis and
 * suspicious-span selection belong to later stages.
 */
export const materializeEvolutionCase = (
  input: MaterializeEvolutionCaseInput,
): MaterializedEvolutionCase => {
  const selection = selectEvolutionConversationTurn({
    messages: input.messages,
    candidateCreatedAt: input.candidate.createdAt,
    ...(input.decodeMessageTime ? { decodeMessageTime: input.decodeMessageTime } : {}),
  });

  const taskText = selection.taskText;
  const taskClass = taskText
    ? input.resolveTaskClass?.(taskText) ?? undefined
    : undefined;
  const turnEntries = selection.turnMessages;

  const trajectory: EvolutionTrajectorySummary = {
    messageCount: turnEntries.length,
    userMessageCount: turnEntries.filter((entry) => entry.role === "user").length,
    assistantMessageCount: turnEntries.filter((entry) => entry.role === "assistant").length,
    toolMessageCount: turnEntries.filter((entry) => entry.role === "tool").length,
    systemMessageCount: turnEntries.filter((entry) => entry.role === "system").length,
    ...(turnEntries.at(-1)?.id ? { latestIncludedMessageId: turnEntries.at(-1)!.id } : {}),
  };

  return {
    caseId: input.evolutionCase.id,
    candidateId: input.candidate.id,
    task:
      taskText && selection.taskMessage
        ? {
            status: "resolved",
            messageId: selection.taskMessage.id,
            text: taskText,
            ...(taskClass ? { taskClass } : {}),
          }
        : { status: "unresolved" },
    trajectory,
  };
};
