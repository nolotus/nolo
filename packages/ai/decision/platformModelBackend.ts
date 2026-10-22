import type { JudgmentBackend, JudgmentRequest, JudgmentResult } from "./types";
import { budgetAbstain, DEFAULT_JUDGMENT_BUDGET, enterJudgmentCall, judgmentAbstain, judgmentDeadlineMs, type JudgmentBudget } from "./budget";
export type PlatformJudgmentInvoker = (request: JudgmentRequest, signal?: AbortSignal) => Promise<JudgmentResult>;
export class PlatformModelBackend implements JudgmentBackend {
  constructor(private readonly invoke: PlatformJudgmentInvoker, private readonly budget: JudgmentBudget = DEFAULT_JUDGMENT_BUDGET) {}
  async judge(request: JudgmentRequest): Promise<JudgmentResult> {
    const started = Date.now(); const blocked = budgetAbstain(request, this.budget); if (blocked) return blocked;
    const release = enterJudgmentCall(request); const controller = new AbortController();
    const ms = Math.min(this.budget.timeoutMs, judgmentDeadlineMs(request, this.budget));
    let timer: ReturnType<typeof setTimeout> | undefined;
    try { return await Promise.race([this.invoke(request, controller.signal), new Promise<JudgmentResult>(resolve => { timer = setTimeout(() => { controller.abort(); resolve(judgmentAbstain(request, "deadline", Date.now() - started, true)); }, ms); })]); }
    catch (error) { return judgmentAbstain(request, error instanceof Error ? error.name : "unknown", Date.now() - started); }
    finally { if (timer) clearTimeout(timer); release(); }
  }
}
