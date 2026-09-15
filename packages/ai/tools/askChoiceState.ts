/**
 * Isomorphic state machine for `ask_user` interactive panels.
 *
 * Shared by TUI (packages/cli/tui/askChoiceDialog.ts), Web
 * (packages/chat/messages/web/AskChoicePanelWeb.tsx) and RN
 * (packages/chat/messages/rn/AskChoicePanel.tsx) so that keyboard / click
 * events produce identical state transitions on every platform.
 *
 * Contract (docs/plans/2026-09-15-ask-user-unified-interaction.md):
 * - Selecting a choice never advances the tab and never submits. The only
 *   transitions out of `active` are an explicit SUBMIT or CANCEL.
 * - A non-empty `Other` is an alternative answer, not an annotation: it is
 *   mutually exclusive with predefined choices, in both directions.
 * - SUBMIT on an invalid form sets `validationAttempted` and moves
 *   `activeIndex` to the first unanswered required question instead of
 *   submitting.
 * - `createInitialAskChoiceState` can restore persisted answers and land in a
 *   read-only `submitted` state that the reducer refuses to mutate.
 * - `formatOutboundUserMessage` preserves question→answer mapping for
 *   multi-question forms while single-question output stays byte-identical.
 *
 * Zero runtime dependencies — pure TypeScript.
 */

// ── Schema types (what the LLM sends) ──────────────────────────────

export type AskChoiceOption = {
  id: string;
  label: string;
  /** Optional longer description shown below the label. */
  detail?: string;
  /**
   * Natural-language message sent as the next user turn when this
   * option is chosen. Falls back to `label` when omitted.
   */
  userMessage?: string;
};

export type AskChoiceQuestion = {
  id: string;
  /** Short tab label (≤12 chars), shown in the multi-question tab bar
   * instead of the generic "Q1/Q2". Optional; falls back to "Qn". */
  header?: string;
  question: string;
  choices: AskChoiceOption[];
  /** Allow selecting multiple choices. Default false. */
  multiSelect: boolean;
  /** Show an "Other" free-text input row. Default true. */
  allowOther: boolean;
  /** At least one selection required before submit. Default true. */
  required: boolean;
};

// ── UI state (what the renderer tracks) ────────────────────────────

export type QuestionUiState = {
  /** 0..choices.length-1 = choice rows; choices.length = "Other" row (when allowOther). */
  cursorIndex: number;
  /** Selected choice ids (multi-select). */
  selectedIds: string[];
  /** Single-select picked id (null = none yet). */
  pickedId: string | null;
  /** Free-text typed in the "Other" row. */
  otherText: string;
  /** Whether the Other row's text input is focused. */
  otherFocused: boolean;
};

export type AskChoicePhase = "active" | "submitted" | "cancelled";

export type AskChoiceUiState = {
  questions: AskChoiceQuestion[];
  /** Index of the currently visible question tab. */
  activeIndex: number;
  questionStates: QuestionUiState[];
  phase: AskChoicePhase;
  /** When true, highlights required unanswered questions or validation feedback. */
  validationAttempted?: boolean;
};

// ── Result (what gets sent back to the LLM) ────────────────────────

export type QuestionAnswer = {
  questionId: string;
  /** Selected choice ids (empty if only Other was used). */
  selectedIds: string[];
  /** Free-text from Other (empty string if not used). */
  otherText: string;
  /** Combined userMessage for this question. */
  userMessage: string;
};

export type AskChoiceResult =
  | { kind: "submitted"; answers: QuestionAnswer[] }
  | { kind: "cancelled" };

// ── Actions ────────────────────────────────────────────────────────

export type AskChoiceAction =
  | { type: "MOVE_CURSOR"; delta: number }
  | { type: "TOGGLE_AT_CURSOR" }
  | { type: "SELECT_AT_CURSOR" }
  | { type: "SELECT_CHOICE"; choiceId: string }
  | { type: "FOCUS_OTHER" }
  | { type: "BLUR_OTHER" }
  | { type: "SET_OTHER_TEXT"; text: string }
  | { type: "SWITCH_TAB"; index: number }
  | { type: "NEXT_TAB" }
  | { type: "PREV_TAB" }
  | { type: "SUBMIT" }
  | { type: "CANCEL" }
  | { type: "HYDRATE_QUESTIONS"; questions: AskChoiceQuestion[] };

// ── Normalize legacy args → questions[] ────────────────────────────

/**
 * Accept both the legacy single-question format and the new
 * multi-question format, returning a normalized `AskChoiceQuestion[]`.
 */
export function normalizeAskChoiceArgs(args: {
  question?: string;
  choices?: unknown[];
  questions?: unknown[];
  blocking?: boolean;
}): { questions: AskChoiceQuestion[]; blocking: boolean } {
  const blocking = args.blocking !== false;

  // New format: explicit questions array
  if (Array.isArray(args.questions) && args.questions.length > 0) {
    return {
      questions: args.questions.map((q: any, i: number) =>
        normalizeQuestion(q, i),
      ),
      blocking,
    };
  }

  // Legacy format: single question + choices
  const question = String(args.question ?? "").trim();
  const choices = Array.isArray(args.choices) ? args.choices : [];
  if (!question || choices.length === 0) {
    return { questions: [], blocking };
  }

  return {
    questions: [
      normalizeQuestion(
        { question, choices, multiSelect: false, allowOther: true, required: true },
        0,
      ),
    ],
    blocking,
  };
}

function normalizeQuestion(raw: any, index: number): AskChoiceQuestion {
  return {
    id: String(raw?.id ?? `q${index}`),
    ...(typeof raw?.header === "string" && raw.header.trim()
      ? { header: raw.header.trim().slice(0, 12) }
      : {}),
    question: String(raw?.question ?? "").trim(),
    choices: (Array.isArray(raw?.choices) ? raw.choices : []).map(
      (c: any, ci: number) => ({
        id: String(c?.id ?? `c${ci}`),
        label: String(c?.label ?? "").trim(),
        ...(typeof c?.detail === "string" && c.detail.trim()
          ? { detail: c.detail.trim() }
          : {}),
        ...(typeof c?.userMessage === "string" && c.userMessage.trim()
          ? { userMessage: c.userMessage.trim() }
          : {}),
      }),
    ),
    multiSelect: raw?.multiSelect === true,
    allowOther: raw?.allowOther !== false,
    required: raw?.required !== false,
  };
}

// ── Initial state ──────────────────────────────────────────────────

export type InitialAskChoiceAnswers = {
  answers?: Array<{
    questionId?: string;
    selectedIds?: string[];
    otherText?: string;
    userMessage?: string;
  }>;
  selected?: {
    label?: string;
    userMessage?: string;
  };
  phase?: AskChoicePhase;
};

export function createInitialAskChoiceState(
  questions: AskChoiceQuestion[],
  savedAnswers?: InitialAskChoiceAnswers,
): AskChoiceUiState {
  const hasSaved = Boolean(
    savedAnswers?.answers?.length ||
      savedAnswers?.selected ||
      savedAnswers?.phase === "submitted",
  );

  return {
    questions,
    activeIndex: 0,
    questionStates: questions.map((q, i) => {
      let pickedId: string | null = null;
      let selectedIds: string[] = [];
      let otherText = "";

      if (savedAnswers?.answers?.length) {
        // The persisted wire shape (`UiAskChoicePayload.answers`) always carries
        // a questionId, so match on it. Positional fallback is only for legacy
        // entries that lack an id — never for a *different* question's answer,
        // otherwise a missing question would inherit its neighbour's answer.
        const byId = savedAnswers.answers.find((a) => a.questionId === q.id);
        const byPosition = savedAnswers.answers[i]?.questionId
          ? undefined
          : savedAnswers.answers[i];
        const found = byId ?? byPosition;
        if (found) {
          selectedIds = Array.isArray(found.selectedIds)
            ? found.selectedIds
            : [];
          otherText =
            typeof found.otherText === "string" ? found.otherText : "";
          if (!q.multiSelect && selectedIds.length > 0) {
            pickedId = selectedIds[0];
          }
        }
      } else if (savedAnswers?.selected) {
        const label = savedAnswers.selected.label;
        const matched = q.choices.find(
          (c) =>
            c.label === label ||
            (savedAnswers.selected?.userMessage &&
              c.userMessage === savedAnswers.selected.userMessage),
        );
        if (matched) {
          pickedId = matched.id;
          selectedIds = [matched.id];
        } else if (label) {
          otherText = label;
        }
      }

      return {
        cursorIndex: 0,
        selectedIds,
        pickedId,
        otherText,
        otherFocused: false,
      };
    }),
    phase: savedAnswers?.phase ?? (hasSaved ? "submitted" : "active"),
    validationAttempted: false,
  };
}

// ── Reducer ────────────────────────────────────────────────────────

export function askChoiceReducer(
  state: AskChoiceUiState,
  action: AskChoiceAction,
): AskChoiceUiState {
  // HYDRATE_QUESTIONS reconciles questionStates when the questions array grows
  // after mount (useReducer lazy init only runs once). Only allowed in active
  // phase: once submitted/cancelled, the result is frozen and appending empty
  // states would (a) let buildAskChoiceResult emit empty answers for the new
  // questions and (b) risk indexing undefined. Late-arriving data after submit
  // is harmless to drop because the user already answered the questions that
  // existed at submit time.
  if (action.type === "HYDRATE_QUESTIONS") {
    if (state.phase !== "active") return state;
    const newQuestions = action.questions;
    if (newQuestions.length <= state.questionStates.length) {
      // Only update the questions ref if it actually grew; otherwise no-op
      // to avoid needless re-renders.
      if (newQuestions.length === state.questions.length) return state;
      return { ...state, questions: newQuestions };
    }
    const appended = newQuestions
      .slice(state.questionStates.length)
      .map(() => ({
        cursorIndex: 0,
        selectedIds: [],
        pickedId: null,
        otherText: "",
        otherFocused: false,
      }));
    return {
      ...state,
      questions: newQuestions,
      questionStates: [...state.questionStates, ...appended],
      activeIndex: Math.min(state.activeIndex, newQuestions.length - 1),
    };
  }

  if (state.phase !== "active") return state;

  switch (action.type) {
    case "CANCEL":
      return { ...state, phase: "cancelled" };

    case "SUBMIT": {
      const firstUnanswered = findFirstUnansweredIndex(state);
      if (firstUnanswered !== -1) {
        return {
          ...state,
          activeIndex: firstUnanswered,
          validationAttempted: true,
        };
      }
      return { ...state, phase: "submitted", validationAttempted: false };
    }

    case "SWITCH_TAB": {
      const idx = clamp(action.index, 0, state.questions.length - 1);
      return { ...state, activeIndex: idx };
    }

    case "NEXT_TAB": {
      const idx = Math.min(state.activeIndex + 1, state.questions.length - 1);
      return { ...state, activeIndex: idx };
    }

    case "PREV_TAB": {
      const idx = Math.max(state.activeIndex - 1, 0);
      return { ...state, activeIndex: idx };
    }

    case "MOVE_CURSOR": {
      const qs = state.questionStates[state.activeIndex];
      const q = state.questions[state.activeIndex];
      const maxIndex = q.allowOther ? q.choices.length : q.choices.length - 1;
      const next = clamp(qs.cursorIndex + action.delta, 0, maxIndex);
      const newQs = [...state.questionStates];
      newQs[state.activeIndex] = {
        ...qs,
        cursorIndex: next,
        otherFocused: false,
      };
      return { ...state, questionStates: newQs };
    }

    case "TOGGLE_AT_CURSOR": {
      const qs = state.questionStates[state.activeIndex];
      const q = state.questions[state.activeIndex];

      if (!q.multiSelect) {
        return askChoiceReducer(state, { type: "SELECT_AT_CURSOR" });
      }

      const isOtherRow = qs.cursorIndex >= q.choices.length;
      if (isOtherRow) {
        // The Other row has no choice to toggle; Enter focuses its text input.
        const newQs = [...state.questionStates];
        newQs[state.activeIndex] = { ...qs, otherFocused: !qs.otherFocused };
        return { ...state, questionStates: newQs };
      }

      const choiceId = q.choices[qs.cursorIndex]?.id;
      if (!choiceId) return state;
      return askChoiceReducer(state, { type: "SELECT_CHOICE", choiceId });
    }

    // The one explicit "choose this option" action, addressed by choice id so
    // that click / tap handlers on every platform share the same behaviour as
    // cursor-driven keys. Multi-select toggles, single-select picks. It never
    // advances the tab and never submits.
    case "SELECT_CHOICE": {
      const qs = state.questionStates[state.activeIndex];
      const q = state.questions[state.activeIndex];
      const choiceIndex = q.choices.findIndex((c) => c.id === action.choiceId);
      if (choiceIndex === -1) return state;

      const newQs = [...state.questionStates];
      if (q.multiSelect) {
        const has = qs.selectedIds.includes(action.choiceId);
        const newSelected = has
          ? qs.selectedIds.filter((id) => id !== action.choiceId)
          : [...qs.selectedIds, action.choiceId];
        newQs[state.activeIndex] = {
          ...qs,
          cursorIndex: choiceIndex,
          selectedIds: newSelected,
          otherText: "",
          otherFocused: false,
        };
      } else {
        newQs[state.activeIndex] = {
          ...qs,
          cursorIndex: choiceIndex,
          pickedId: action.choiceId,
          otherText: "",
          otherFocused: false,
        };
      }
      return { ...state, questionStates: newQs, validationAttempted: false };
    }

    case "SELECT_AT_CURSOR": {
      const qs = state.questionStates[state.activeIndex];
      const q = state.questions[state.activeIndex];
      // cursorIndex ranges over the choice rows [0, choices.length) plus the
      // Other row at choices.length when allowOther. There is deliberately NO
      // cursor "submit" row: submitting is only ever { type: "SUBMIT" }.
      const isOtherRow = qs.cursorIndex >= q.choices.length;

      if (isOtherRow) {
        // Enter on the Other row opens its text input; typing is the action.
        const newQs = [...state.questionStates];
        newQs[state.activeIndex] = { ...qs, otherFocused: true };
        return { ...state, questionStates: newQs };
      }

      const choiceId = q.choices[qs.cursorIndex]?.id;
      if (!choiceId) return state;
      return askChoiceReducer(state, { type: "SELECT_CHOICE", choiceId });
    }

    case "FOCUS_OTHER": {
      const qs = state.questionStates[state.activeIndex];
      const newQs = [...state.questionStates];
      newQs[state.activeIndex] = { ...qs, otherFocused: true };
      return { ...state, questionStates: newQs };
    }

    case "BLUR_OTHER": {
      const qs = state.questionStates[state.activeIndex];
      const newQs = [...state.questionStates];
      newQs[state.activeIndex] = { ...qs, otherFocused: false };
      return { ...state, questionStates: newQs };
    }

    case "SET_OTHER_TEXT": {
      const qs = state.questionStates[state.activeIndex];
      const newQs = [...state.questionStates];
      const hasText = action.text.trim().length > 0;
      newQs[state.activeIndex] = {
        ...qs,
        otherText: action.text,
        // Non-empty Other is mutually exclusive with predefined choices
        ...(hasText ? { pickedId: null, selectedIds: [] } : {}),
      };
      return { ...state, questionStates: newQs, validationAttempted: false };
    }

    default:
      return state;
  }
}

// ── Queries ────────────────────────────────────────────────────────

/** Find the index of the first unanswered required question (-1 if all valid). */
export function findFirstUnansweredIndex(state: AskChoiceUiState): number {
  return state.questions.findIndex(
    (q, i) => !isQuestionAnswered(q, state.questionStates[i]),
  );
}

/** Whether a question has a valid answer (selected or Other text). */
export function isQuestionAnswered(
  q: AskChoiceQuestion,
  qs: QuestionUiState,
): boolean {
  if (!q.required) return true;
  const hasOther = q.allowOther && qs.otherText.trim().length > 0;
  const hasSelection = q.multiSelect
    ? qs.selectedIds.length > 0
    : qs.pickedId !== null;
  return hasOther || hasSelection;
}

/** Whether the entire form can be submitted. */
export function canSubmit(state: AskChoiceUiState): boolean {
  return state.questions.every((q, i) =>
    isQuestionAnswered(q, state.questionStates[i]),
  );
}

/** Build the final result from a submitted state. */
export function buildAskChoiceResult(
  state: AskChoiceUiState,
): AskChoiceResult {
  if (state.phase === "cancelled") return { kind: "cancelled" };
  if (state.phase !== "submitted") return { kind: "cancelled" };

  const answers: QuestionAnswer[] = state.questions.map((q, i) => {
    const qs = state.questionStates[i];
    const otherText = qs.otherText.trim();
    // Non-empty Other is mutually exclusive with predefined choices:
    const selectedIds = otherText
      ? []
      : q.multiSelect
        ? qs.selectedIds
        : qs.pickedId
          ? [qs.pickedId]
          : [];

    // Build combined userMessage
    const parts: string[] = [];
    if (otherText) {
      parts.push(otherText);
    } else {
      for (const id of selectedIds) {
        const choice = q.choices.find((c) => c.id === id);
        if (choice) {
          parts.push(choice.userMessage || choice.label);
        }
      }
    }

    return {
      questionId: q.id,
      selectedIds,
      otherText,
      userMessage: parts.join("\n"),
    };
  });

  return { kind: "submitted", answers };
}

/**
 * Format outbound text for LLM conversation turn.
 * Preserves question-to-answer mapping for multi-question forms,
 * while keeping single-question output 100% backward compatible.
 */
export function formatOutboundUserMessage(
  questions: AskChoiceQuestion[],
  answers: QuestionAnswer[],
): string {
  if (answers.length <= 1) {
    return answers[0]?.userMessage ?? "";
  }
  return answers
    .map((a) => {
      const q = questions.find((item) => item.id === a.questionId);
      const title = q?.header || q?.question;
      if (title && a.userMessage) {
        return `[${title}]: ${a.userMessage}`;
      }
      return a.userMessage;
    })
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Convenience: build the legacy-compatible single userMessage string
 * from a submitted result (for backward compat with single-question flows).
 */
export function buildLegacyUserMessage(
  result: AskChoiceResult,
  questions?: AskChoiceQuestion[],
): string {
  if (result.kind === "cancelled") return "";
  if (questions && questions.length > 1) {
    return formatOutboundUserMessage(questions, result.answers);
  }
  return result.answers.map((a) => a.userMessage).filter(Boolean).join("\n\n");
}

// ── Helpers ────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
