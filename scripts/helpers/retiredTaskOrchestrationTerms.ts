import { expect } from "bun:test";

export const RETIRED_TASK_ORCHESTRATION_TERMS = [
  "taskRun",
  "TaskRun",
  "taskContext",
  "TaskContext",
  "taskEvents",
  "TaskEvents",
  "workItems",
  "agentRuns",
  "task-context",
  "task-run",
  "work-item",
  "task run history",
  "agent task runs",
  "task run failures",
  "scheduled task runs",
  "scheduled task runtime",
  "work item",
  "work item row",
  "workItemRowId",
  "agent_run row",
  "claimWorkItem",
  "requestReview",
  "recordReview",
] as const;

export const RETIRED_TASK_ORCHESTRATION_PATTERNS = [
  /taskRun/,
  /TaskRun/,
  /taskContext/,
  /TaskContext/,
  /taskEvents/,
  /TaskEvents/,
  /workItems/,
  /agentRuns/,
  /task-context/,
  /task-run/,
  /work-item/,
  /task run history/,
  /agent task runs/,
  /task run failures/,
  /scheduled task runs/,
  /scheduled task runtime/,
  /work item/,
  /work item row/,
  /workItemRowId/,
  /agent_run row/,
  /claimWorkItem/,
  /requestReview/,
  /recordReview/,
] as const;

export const RETIRED_TASK_EVENTS_FIELD = RETIRED_TASK_ORCHESTRATION_TERMS[4];

export function expectNoRetiredTaskOrchestrationTerms(
  source: string,
  terms: readonly string[] = RETIRED_TASK_ORCHESTRATION_TERMS,
) {
  for (const term of terms) {
    expect(source).not.toContain(term);
  }
}
