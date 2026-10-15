import { normalizeAskChoiceArgs, type AskChoiceQuestion } from "ai/tools/askChoiceState";
import { parseUiCard } from "ai/tools/uiCardSchema";
import { buildAskChoiceResolution, type AskChoiceResolution } from "./askChoicePersistence";

function normalizedCardQuestions(card: unknown): AskChoiceQuestion[] {
  const parsed = parseUiCard(card);
  if (!parsed.ok) throw new Error(`Invalid show_interaction card: ${parsed.error}`);
  const questions = parsed.value.blocks.flatMap((block) => block.type === "choice" ? [block.question] : []);
  const normalized = normalizeAskChoiceArgs({ questions }).questions;
  if (normalized.length !== questions.length) throw new Error("Invalid show_interaction questions");
  const ids = new Set<string>();
  for (const q of normalized) {
    if (ids.has(q.id) || new Set(q.choices.map((c) => c.id)).size !== q.choices.length) throw new Error("Duplicate interaction question/choice id");
    ids.add(q.id);
  }
  return normalized;
}

const MAX_ANSWERS = 64;
const MAX_ANSWER_ID_CHARS = 128;
const MAX_ANSWER_TEXT_CHARS = 20_000;

/**
 * Explicit shape/type/length gate for caller-supplied answers. Without this the
 * only defense was incidental TypeError (e.g. answer.selectedIds.some on a
 * non-array), which yields no meaningful error and can accept garbage shapes.
 */
function assertAnswerShape(answer: unknown, index: number): asserts answer is AskChoiceResolution["answers"][number] {
  const fail = (reason: string): never => {
    throw new Error(`Invalid show_interaction answer shape at index ${index}: ${reason}`);
  };
  if (!answer || typeof answer !== "object" || Array.isArray(answer)) fail("expected an object");
  const record = answer as Record<string, unknown>;
  const extra = Object.keys(record).filter((key) => !["questionId", "selectedIds", "otherText", "userMessage"].includes(key));
  if (extra.length) fail(`unexpected keys ${extra.join(", ")}`);
  if (typeof record.questionId !== "string" || !record.questionId.trim()) fail("questionId must be a non-empty string");
  if (typeof record.questionId === "string" && record.questionId.length > MAX_ANSWER_ID_CHARS) fail(`questionId exceeds ${MAX_ANSWER_ID_CHARS} chars`);
  if (!Array.isArray(record.selectedIds)) fail("selectedIds must be an array");
  if ((record.selectedIds as unknown[]).length > MAX_ANSWERS) fail(`selectedIds exceeds ${MAX_ANSWERS} entries`);
  for (const id of record.selectedIds as unknown[]) {
    if (typeof id !== "string" || !id) fail("selectedIds entries must be non-empty strings");
    if (typeof id === "string" && id.length > MAX_ANSWER_ID_CHARS) fail(`selectedIds entry exceeds ${MAX_ANSWER_ID_CHARS} chars`);
  }
  if (typeof record.otherText !== "string") fail("otherText must be a string");
  if (typeof record.otherText === "string" && record.otherText.length > MAX_ANSWER_TEXT_CHARS) fail(`otherText exceeds ${MAX_ANSWER_TEXT_CHARS} chars`);
  if (typeof record.userMessage !== "string") fail("userMessage must be a string");
  if (typeof record.userMessage === "string" && record.userMessage.length > MAX_ANSWER_TEXT_CHARS) fail(`userMessage exceeds ${MAX_ANSWER_TEXT_CHARS} chars`);
}

function validateAnswers(questions: AskChoiceQuestion[], answers: AskChoiceResolution["answers"]) {
  if (!Array.isArray(answers)) throw new Error("Invalid show_interaction answers shape: expected an array");
  if (!answers.length) return false;
  if (answers.length > MAX_ANSWERS) throw new Error(`Invalid show_interaction answers shape: exceeds ${MAX_ANSWERS} entries`);
  answers.forEach((answer, index) => assertAnswerShape(answer, index));
  const byId = new Map(questions.map((q) => [q.id, q]));
  const seen = new Set<string>();
  for (const answer of answers) {
    const q = byId.get(answer.questionId);
    if (!q || seen.has(q.id)) return false;
    seen.add(q.id);
    if (new Set(answer.selectedIds).size !== answer.selectedIds.length || answer.selectedIds.some((id) => !q.choices.some((c) => c.id === id))) return false;
    if (answer.otherText.trim()) {
      if (!q.allowOther || answer.selectedIds.length) return false;
      if (answer.userMessage !== answer.otherText.trim()) return false;
    } else {
      if (!q.multiSelect && answer.selectedIds.length > 1) return false;
      const expected = answer.selectedIds.map((id) => { const c = q.choices.find((choice) => choice.id === id)!; return c.userMessage || c.label; }).join("\n");
      const skipped = !expected && !q.required;
      if (answer.userMessage !== (skipped ? "（跳过）" : expected)) return false;
      if (q.required && !answer.selectedIds.length) return false;
    }
  }
  // Required questions cannot be omitted; optional questions may be skipped.
  return questions.every((q) => !q.required || seen.has(q.id));
}

export function buildUiInteractionPersistChanges(rawData: unknown, resolution: unknown) {
  if (!rawData || typeof rawData !== "object" || Array.isArray(rawData)) throw new Error("Invalid show_interaction source");
  const source = rawData as Record<string, unknown>;
  if (source.type !== "show_interaction") throw new Error("Invalid show_interaction source");
  const questions = normalizedCardQuestions(source.card);
  if (!resolution || typeof resolution !== "object" || Array.isArray(resolution)) throw new Error("Invalid show_interaction resolution");
  const r = resolution as Record<string, unknown>;
  if (Object.keys(r).some((key) => !["questions", "answers", "selected", "phase"].includes(key)) || r.phase !== "submitted" || !Array.isArray(r.answers)) throw new Error("Invalid show_interaction resolution");
  // Persist canonical questions from the parsed source card, never caller-supplied questions.
  const answers = r.answers as AskChoiceResolution["answers"];
  if (!validateAnswers(questions, answers)) throw new Error("Invalid show_interaction answers");
  const canonicalResolution = buildAskChoiceResolution({ kind: "submitted", answers }, questions);
  if (!canonicalResolution) throw new Error("Invalid show_interaction resolution");
  if (r.selected !== undefined && JSON.stringify(r.selected) !== JSON.stringify(canonicalResolution.selected)) throw new Error("Invalid legacy selection");
  const { selected: _oldSelected, cancelled: _cancelled, ...rest } = source;
  void _oldSelected; void _cancelled;
  return { ...rest, ...canonicalResolution, type: "show_interaction" as const };
}
