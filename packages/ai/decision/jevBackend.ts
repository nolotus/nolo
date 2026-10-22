import type { JudgmentBackend, JudgmentRequest, JudgmentResult, JudgmentQuestion } from "./types";
import { budgetAbstain, DEFAULT_JUDGMENT_BUDGET, enterJudgmentCall, judgmentAbstain, judgmentDeadlineMs, type JudgmentBudget } from "./budget";
import { redactJudgmentText } from "./redaction";
export type JevBackendOptions = { apiKey: string; endpoint?: string; model?: string; fetchFn?: typeof fetch; budget?: JudgmentBudget };
type RawAnswer = { type?: string; choice?: string; score?: number; noul?: number; confidence?: number; probabilities?: Record<string, number> };
export class JevBackend implements JudgmentBackend {
  constructor(private readonly options: JevBackendOptions) {}
  async judge(request: JudgmentRequest): Promise<JudgmentResult> {
    const sanitizedFields: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(request.subject.fields)) {
      if (request.fieldPolicy[key] === "allow") {
        sanitizedFields[key] = typeof val === "string" ? redactJudgmentText(val) : val;
      }
    }
    const payload = {
      model: this.options.model ?? "jev-latest",
      subject: { kind: request.subject.kind, fields: sanitizedFields },
      context: request.context.filter(x => x.policy === "allow").map(x => ({ ...x, value: redactJudgmentText(x.value) })),
      questions: request.questions,
      fieldPolicy: request.fieldPolicy,
    };
    const blocked = budgetAbstain(request, this.options.budget ?? DEFAULT_JUDGMENT_BUDGET); if (blocked) return blocked;
    return this.sendRaw(payload, request.questions, request);
  }
  /** Future evolution migration must preserve its payload construction byte-for-byte and change only HTTP send, parsing and missing-answer semantics here; do not migrate its call site in this change. */
  async sendRaw(body: unknown, questions: readonly JudgmentQuestion[], budgetRequest?: JudgmentRequest): Promise<JudgmentResult> {
    const budget = this.options.budget ?? DEFAULT_JUDGMENT_BUDGET; const started = Date.now();
    const request = budgetRequest ?? { subject: { kind: "raw", fields: {} }, context: [], questions, fieldPolicy: {} };
    const release = enterJudgmentCall(request); const controller = new AbortController();
    const ms = Math.min(budget.timeoutMs, judgmentDeadlineMs(request, budget));
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const response = await Promise.race([ (this.options.fetchFn ?? fetch)(this.options.endpoint ?? "https://api.typesafe.ai/v1/systemone", { method: "POST", headers: { authorization: `Bearer ${this.options.apiKey}`, "content-type": "application/json" }, body: JSON.stringify(body), signal: controller.signal }), new Promise<Response>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error("DEADLINE")); }, ms); }) ]);
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      const data = await response.json() as { answers?: Record<string, RawAnswer> };
      const answers = Object.fromEntries(questions.map(q => { const a = data.answers?.[q.id]; if (!a) return [q.id, { abstain: true, unknown: true }]; const value = a.choice ?? a.score ?? a.noul; if (value === undefined) return [q.id, { abstain: true, unknown: true }]; let probabilities = a.probabilities; if (probabilities) { const total = Object.values(probabilities).reduce((s, n) => s + Math.max(0, n), 0); probabilities = total > 0 ? Object.fromEntries(Object.entries(probabilities).map(([k, n]) => [k, Math.max(0, n) / total])) : undefined; } return [q.id, { value, probabilities, confidence: a.confidence, abstain: false, unknown: false }]; }));
      return { answers, diagnostics: { status: "ok", timedOut: false, elapsedMs: Date.now() - started, budgetHit: false } };
    } catch (error) { const timeout = controller.signal.aborted; return judgmentAbstain(request, timeout ? "timeout" : error instanceof Error ? error.name : "unknown", Date.now() - started, timeout); }
    finally { if (timer) clearTimeout(timer); release(); }
  }
}
