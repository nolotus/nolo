const str = { type: "string", minLength: 1 };
export const requestTaskReviewFunctionSchema = {
  name: "requestTaskReview",
  description: "Request an independent review of the registered task revision. Local host only; requires existing account auto-review authorization. Ordinary startAgentRun is not review.",
  parameters: { type: "object", additionalProperties: false, properties: {
    reviewerAgentKey: str, revision: str,
  }, required: ["reviewerAgentKey", "revision"] },
};
export const recordTaskReviewDecisionFunctionSchema = {
  name: "recordTaskReviewDecision",
  description: "After reading the terminal review, record a reasoned continue/fix/stop decision bound to its dispatch, run, revision and result SHA256, with finding dispositions. APPROVE alone is not a decision. For continue, every finding the report enumerates with an explicit id (a file:line reference or a bracketed id) must appear in findings with its own disposition; an empty findings list cannot stand in for reported findings. If the report states findings the host cannot enumerate mechanically, add one finding with id \"full-text\" whose rationale dispositions the whole report text.",
  parameters: { type: "object", additionalProperties: false, properties: {
    dispatchId: str, runId: str, revision: str,
    resultSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
    action: { type: "string", enum: ["continue", "fix", "stop"] }, rationale: str,
    findings: { type: "array", items: { type: "object", additionalProperties: false, properties: {
      id: str, disposition: { type: "string", enum: ["accepted", "fix", "disputed"] }, rationale: str,
    }, required: ["id", "disposition", "rationale"] } },
  }, required: ["dispatchId", "runId", "revision", "resultSha256", "action", "rationale", "findings"] },
};
export async function unsupportedTaskReview(): Promise<never> {
  throw Object.assign(new Error("Task review is available only through a registered local host scope"), { code: "task_review_host_unavailable" });
}
