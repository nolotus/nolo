export type EvolutionCaseStatus = "open" | "investigating" | "resolved" | "rejected";

export type EvolutionEvidenceRef =
  | { kind: "candidate"; candidateId: string }
  | { kind: "dialog"; dialogId: string }
  | { kind: "run"; runId: string };

export type EvolutionCaseCauseKind =
  | "component"
  | "interaction"
  | "sequence"
  | "external"
  | "unknown";

export type EvolutionCaseCandidateCause = {
  kind: EvolutionCaseCauseKind;
  stage?: string;
  surface?: string;
};

export type EvolutionSuspiciousSpan = {
  startIndex?: number;
  endIndex?: number;
  stage?: string;
};

export type EvolutionCase = {
  id: string;
  candidateId: string;
  status: EvolutionCaseStatus;
  createdAt: string;
  taskClass?: string;
  evidenceRefs: EvolutionEvidenceRef[];
  suspiciousSpan?: EvolutionSuspiciousSpan;
  candidateCauses: EvolutionCaseCandidateCause[];
};

export type CreateEvolutionCaseInput = {
  caseId: string;
  candidateId: string;
  createdAt: string;
  dialogId?: string;
  runId?: string;
  taskClass?: string;
};

export const buildEvolutionCaseKey = (caseId: string) =>
  `evolution-case-${caseId}`;

export const buildEvolutionCaseRange = () => ({
  start: "evolution-case-",
  end: "evolution-case-\uffff",
});

/**
 * Minimal durable analysis unit. It references source evidence rather than
 * copying trace, observations, conversation content, or tool payloads.
 * Suspicious spans and causal candidates are intentionally empty at creation;
 * later analysis stages must populate them from retrieved evidence.
 */
export const createEvolutionCase = (
  input: CreateEvolutionCaseInput,
): EvolutionCase => ({
  id: input.caseId,
  candidateId: input.candidateId,
  status: "open",
  createdAt: input.createdAt,
  ...(input.taskClass ? { taskClass: input.taskClass } : {}),
  evidenceRefs: [
    { kind: "candidate", candidateId: input.candidateId },
    ...(input.dialogId ? [{ kind: "dialog" as const, dialogId: input.dialogId }] : []),
    ...(input.runId ? [{ kind: "run" as const, runId: input.runId }] : []),
  ],
  candidateCauses: [],
});
