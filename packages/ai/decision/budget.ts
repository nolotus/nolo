import type { JudgmentRequest, JudgmentResult } from "./types";
export type JudgmentBudget = { maxInputTokens: number; maxOutputTokens: number; timeoutMs: number; deadlineMs: number; maxConcurrency: number; maxCalls: number };
export const DEFAULT_JUDGMENT_BUDGET: JudgmentBudget = { maxInputTokens: 4096, maxOutputTokens: 512, timeoutMs: 8000, deadlineMs: 20000, maxConcurrency: 8, maxCalls: 8 };
const calls = new WeakMap<object, number>();
const active = new WeakMap<object, number>();
const startedAt = new WeakMap<object, number>();
export function budgetAbstain(request: JudgmentRequest, budget: JudgmentBudget, elapsedMs = 0): JudgmentResult | undefined {
  const answers = () => Object.fromEntries(request.questions.map(q => [q.id, { abstain: true, unknown: true }]));
  // Characters/4 is deliberately a rough token estimate: a real tokenizer adds a heavy dependency and is not needed for a conservative guardrail.
  const chars = JSON.stringify(request).length;
  let reason: string | undefined;
  if (chars > budget.maxInputTokens * 4) reason = "input_budget";
  else if (budget.deadlineMs <= 0 || elapsedMs >= budget.deadlineMs) reason = "deadline";
  else if ((calls.get(request) ?? 0) >= budget.maxCalls) reason = "max_calls";
  else if ((active.get(request) ?? 0) >= budget.maxConcurrency) reason = "max_concurrency";
  if (reason) return { answers: answers(), diagnostics: { status: "abstain", timedOut: reason === "deadline", elapsedMs, budgetHit: true, errorClass: reason } };
  calls.set(request, (calls.get(request) ?? 0) + 1);
  if (!startedAt.has(request)) startedAt.set(request, Date.now());
  return undefined;
}
export function enterJudgmentCall(request: JudgmentRequest): () => void { active.set(request, (active.get(request) ?? 0) + 1); return () => active.set(request, Math.max(0, (active.get(request) ?? 1) - 1)); }
export function judgmentDeadlineMs(request: JudgmentRequest, budget: JudgmentBudget): number { return Math.max(0, budget.deadlineMs - (Date.now() - (startedAt.get(request) ?? Date.now()))); }
export function judgmentAbstain(request: JudgmentRequest, reason: string, elapsedMs: number, timedOut = false): JudgmentResult { return { answers: Object.fromEntries(request.questions.map(q => [q.id, { abstain: true, unknown: true }])), diagnostics: { status: timedOut ? "timeout" : "abstain", timedOut, elapsedMs, budgetHit: true, errorClass: reason } }; }
