import { asRecordOrEmpty } from "core/recordOrEmpty";
import { asTrimmedNonEmptyStringArray } from "core/stringArray";
import { asTrimmedString } from "core/trimmedString";

export type ReviewSubjectRef = {
  kind: string;
  id: string;
  role?: string;
};

export type ReviewDecision = "approved" | "needs_changes" | "blocked";

export type ReviewerDialogHandoff = {
  targetAgentKey: string;
  subjectRefs: ReviewSubjectRef[];
  message: string;
};

const taskBoardValues = {
  statusTodo: "待处理",
  statusBlocked: "阻塞",
  codeNotStarted: "未开始",
  codeBlocked: "阻塞/证据不足",
} as const;

function uniqueSubjectRefs(refs: ReviewSubjectRef[]): ReviewSubjectRef[] {
  const seen = new Set<string>();
  const result: ReviewSubjectRef[] = [];
  for (const ref of refs) {
    const kind = asTrimmedString(ref.kind);
    const id = asTrimmedString(ref.id);
    const role = asTrimmedString(ref.role);
    if (!kind || !id) continue;
    const key = `${kind}\u0000${id}\u0000${role}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ kind, id, ...(role ? { role } : {}) });
  }
  return result;
}

export function buildReviewerDialogHandoff(args: {
  taskRowDbKey: string;
  reviewerAgentKey: string;
  implementationDialogId?: string | null;
  commit?: string | null;
  artifactIds?: string[];
  pageIds?: string[];
  taskTitle?: string | null;
}): ReviewerDialogHandoff {
  const taskRowDbKey = asTrimmedString(args.taskRowDbKey);
  const reviewerAgentKey = asTrimmedString(args.reviewerAgentKey);
  if (!taskRowDbKey) throw new Error("taskRowDbKey is required");
  if (!reviewerAgentKey) throw new Error("reviewerAgentKey is required");

  const implementationDialogId = asTrimmedString(args.implementationDialogId);
  const commit = asTrimmedString(args.commit);
  const artifactIds = asTrimmedNonEmptyStringArray(args.artifactIds);
  const pageIds = asTrimmedNonEmptyStringArray(args.pageIds);
  const subjectRefs = uniqueSubjectRefs([
    { kind: "table-row", id: taskRowDbKey, role: "subject" },
    ...(implementationDialogId
      ? [{ kind: "dialog", id: implementationDialogId, role: "review-target" }]
      : []),
    ...(commit ? [{ kind: "external", id: `commit:${commit}`, role: "commit" }] : []),
    ...artifactIds.map((id) => ({ kind: "external", id, role: "artifact" })),
    ...pageIds.map((id) => ({ kind: "page", id, role: "evidence" })),
  ]);
  const message = [
    "Review this task using dialog evidence. Do not use retired review state as the decision source.",
    `task row: ${taskRowDbKey}`,
    ...(asTrimmedString(args.taskTitle) ? [`task title: ${asTrimmedString(args.taskTitle)}`] : []),
    ...(implementationDialogId ? [`implementation dialog: ${implementationDialogId}`] : []),
    ...(commit ? [`commit: ${commit}`] : []),
    ...(artifactIds.length ? [`artifacts: ${artifactIds.join(", ")}`] : []),
    ...(pageIds.length ? [`evidence pages: ${pageIds.join(", ")}`] : []),
    "",
    "Read the task row, then use queryDialogsBySubjectRef or `nolo dialog query --row-dbkey <rowDbKey> --json` to find linked dialogs before inspecting implementation dialog checkpoint, artifacts, commit, and test evidence.",
    "If this reviewer dialog already exists, exclude it from row evidence queries so you do not count your own review as prior work.",
    "If you find a concrete fix, you may directly dispatch the rework agent/dialog with the same table-row subjectRef instead of sending the task back to PM first.",
    "If you dispatch rework, report the rework dialog id and review that rework evidence before final approval.",
    "Return concise findings and one exact line:",
    "Review decision: approved | needs_changes | blocked",
  ].join("\n");
  return { targetAgentKey: reviewerAgentKey, subjectRefs, message };
}

function projectTaskEvidenceMeta(meta: unknown) {
  const source = asRecordOrEmpty(meta);
  const result: Record<string, unknown> = {};
  for (const key of ["activityRefs", "latestActivityRef", "artifacts", "subjectRefs"]) {
    if (source[key] !== undefined) result[key] = source[key];
  }
  return result;
}

function buildEvidenceNote(args: {
  label: string;
  reviewerDialogId: string;
  summary?: string | null;
  findings?: string[];
}): string {
  const findings = asTrimmedNonEmptyStringArray(args.findings);
  return [
    `${args.label}: reviewer dialog ${args.reviewerDialogId}.`,
    ...(asTrimmedString(args.summary) ? [asTrimmedString(args.summary)] : []),
    ...(findings.length ? [`Findings: ${findings.join("; ")}`] : []),
  ].join(" ");
}

export function applyReviewDialogDecisionToTaskRow(args: {
  row: Record<string, any>;
  reviewerDialogId: string;
  decision: ReviewDecision;
  summary?: string | null;
  findings?: string[];
}): {
  action: "delete" | "update";
  row: Record<string, any> | null;
  evidenceNote: string;
} {
  const reviewerDialogId = asTrimmedString(args.reviewerDialogId);
  if (!reviewerDialogId) throw new Error("reviewerDialogId is required");
  const row = asRecordOrEmpty(args.row);
  const values = asRecordOrEmpty(row.values);
  const meta = projectTaskEvidenceMeta(row.meta);

  if (args.decision === "approved") {
    return {
      action: "delete",
      row: null,
      evidenceNote: buildEvidenceNote({
        label: "Review approved",
        reviewerDialogId,
        summary: args.summary,
        findings: args.findings,
      }),
    };
  }

  if (args.decision === "blocked") {
    return {
      action: "update",
      row: {
        ...row,
        values: {
          ...values,
          status: taskBoardValues.statusBlocked,
          codeStatus: taskBoardValues.codeBlocked,
          notes: buildEvidenceNote({
            label: "Review blocked",
            reviewerDialogId,
            summary: args.summary,
            findings: args.findings,
          }),
        },
        meta,
      },
      evidenceNote: buildEvidenceNote({
        label: "Review blocked",
        reviewerDialogId,
        summary: args.summary,
        findings: args.findings,
      }),
    };
  }

  return {
    action: "update",
    row: {
      ...row,
      values: {
        ...values,
        status: taskBoardValues.statusTodo,
        codeStatus: taskBoardValues.codeNotStarted,
        notes: buildEvidenceNote({
          label: "Review needs changes",
          reviewerDialogId,
          summary: args.summary,
          findings: args.findings,
        }),
      },
      meta,
    },
    evidenceNote: buildEvidenceNote({
      label: "Review needs changes",
      reviewerDialogId,
      summary: args.summary,
      findings: args.findings,
    }),
  };
}
