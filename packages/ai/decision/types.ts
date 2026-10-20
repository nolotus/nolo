export type JudgmentQuestionType = "choice" | "score" | "noul";
export type JudgmentQuestion = { id: string; type: JudgmentQuestionType; options?: readonly string[] };
export type JudgmentFieldPolicy = "allow" | "deny";
export type JudgmentRequest = {
  subject: { kind: string; fields: Readonly<Record<string, unknown>> };
  context: readonly { id: string; value: string; policy: JudgmentFieldPolicy }[];
  questions: readonly JudgmentQuestion[];
  fieldPolicy: Readonly<Record<string, JudgmentFieldPolicy>>;
};
export type JudgmentAnswer = { value?: string | number; probabilities?: Readonly<Record<string, number>>; confidence?: number; abstain: boolean; unknown: boolean };
export type JudgmentResult = {
  answers: Readonly<Record<string, JudgmentAnswer>>;
  diagnostics: { errorClass?: string; status: "ok" | "error" | "timeout" | "abstain"; timedOut: boolean; elapsedMs: number; budgetHit: boolean };
};
export interface JudgmentBackend { judge(request: JudgmentRequest): Promise<JudgmentResult> }
