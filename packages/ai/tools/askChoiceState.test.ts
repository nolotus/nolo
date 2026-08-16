import { describe, expect, test } from "bun:test";
import {
  askChoiceReducer,
  buildAskChoiceResult,
  buildLegacyUserMessage,
  canSubmit,
  createInitialAskChoiceState,
  isQuestionAnswered,
  normalizeAskChoiceArgs,
  type AskChoiceQuestion,
  type AskChoiceUiState,
} from "./askChoiceState";

// ── Fixtures ───────────────────────────────────────────────────────

const singleQuestion: AskChoiceQuestion = {
  id: "q0",
  question: "Pick one",
  choices: [
    { id: "a", label: "Alpha" },
    { id: "b", label: "Beta", userMessage: "I chose Beta" },
  ],
  multiSelect: false,
  allowOther: true,
  required: true,
};

const multiQuestion: AskChoiceQuestion = {
  id: "q1",
  question: "Pick many",
  choices: [
    { id: "x", label: "X-ray" },
    { id: "y", label: "Yankee" },
    { id: "z", label: "Zulu" },
  ],
  multiSelect: true,
  allowOther: true,
  required: true,
};

const optionalQuestion: AskChoiceQuestion = {
  id: "q2",
  question: "Optional",
  choices: [{ id: "o1", label: "Opt1" }],
  multiSelect: false,
  allowOther: false,
  required: false,
};

// ── normalizeAskChoiceArgs ─────────────────────────────────────────

describe("normalizeAskChoiceArgs", () => {
  test("legacy single-question format", () => {
    const result = normalizeAskChoiceArgs({
      question: "Hello?",
      choices: [{ id: "1", label: "One" }],
    });
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].question).toBe("Hello?");
    expect(result.questions[0].multiSelect).toBe(false);
    expect(result.questions[0].allowOther).toBe(true);
    expect(result.blocking).toBe(true);
  });

  test("new multi-question format", () => {
    const result = normalizeAskChoiceArgs({
      questions: [
        { id: "q0", question: "Q1?", choices: [{ id: "a", label: "A" }] },
        {
          id: "q1",
          question: "Q2?",
          choices: [{ id: "b", label: "B" }],
          multiSelect: true,
        },
      ],
    });
    expect(result.questions).toHaveLength(2);
    expect(result.questions[1].multiSelect).toBe(true);
  });

  test("empty args returns empty questions", () => {
    const result = normalizeAskChoiceArgs({});
    expect(result.questions).toHaveLength(0);
  });

  test("blocking=false is preserved", () => {
    const result = normalizeAskChoiceArgs({
      question: "Q",
      choices: [{ id: "1", label: "1" }],
      blocking: false,
    });
    expect(result.blocking).toBe(false);
  });
});

// ── createInitialAskChoiceState ────────────────────────────────────

describe("createInitialAskChoiceState", () => {
  test("creates correct initial state", () => {
    const state = createInitialAskChoiceState([singleQuestion]);
    expect(state.phase).toBe("active");
    expect(state.activeIndex).toBe(0);
    expect(state.questionStates).toHaveLength(1);
    expect(state.questionStates[0].cursorIndex).toBe(0);
    expect(state.questionStates[0].pickedId).toBeNull();
    expect(state.questionStates[0].selectedIds).toEqual([]);
  });
});

// ── Reducer: single-select ─────────────────────────────────────────

describe("reducer: single-select", () => {
  test("MOVE_CURSOR clamps", () => {
    let state = createInitialAskChoiceState([singleQuestion]);
    state = askChoiceReducer(state, { type: "MOVE_CURSOR", delta: -1 });
    expect(state.questionStates[0].cursorIndex).toBe(0);
    state = askChoiceReducer(state, { type: "MOVE_CURSOR", delta: 1 });
    expect(state.questionStates[0].cursorIndex).toBe(1);
    state = askChoiceReducer(state, { type: "MOVE_CURSOR", delta: 1 });
    expect(state.questionStates[0].cursorIndex).toBe(2);
    state = askChoiceReducer(state, { type: "MOVE_CURSOR", delta: 1 });
    expect(state.questionStates[0].cursorIndex).toBe(2);
  });

  test("SELECT_AT_CURSOR auto-submits single question", () => {
    let state = createInitialAskChoiceState([singleQuestion]);
    state = askChoiceReducer(state, { type: "SELECT_AT_CURSOR" });
    expect(state.phase).toBe("submitted");
    expect(state.questionStates[0].pickedId).toBe("a");
  });

  test("SELECT_AT_CURSOR on Other row focuses it", () => {
    let state = createInitialAskChoiceState([singleQuestion]);
    state = askChoiceReducer(state, { type: "MOVE_CURSOR", delta: 2 });
    state = askChoiceReducer(state, { type: "SELECT_AT_CURSOR" });
    expect(state.questionStates[0].otherFocused).toBe(true);
    expect(state.phase).toBe("active");
  });

  test("CANCEL", () => {
    let state = createInitialAskChoiceState([singleQuestion]);
    state = askChoiceReducer(state, { type: "CANCEL" });
    expect(state.phase).toBe("cancelled");
  });

  test("actions are no-op after submit", () => {
    let state = createInitialAskChoiceState([singleQuestion]);
    state = askChoiceReducer(state, { type: "SELECT_AT_CURSOR" });
    expect(state.phase).toBe("submitted");
    const after = askChoiceReducer(state, { type: "CANCEL" });
    expect(after.phase).toBe("submitted");
  });

  test("multi-question single-select: auto-submits when picking on last tab and all answered", () => {
    const questions: AskChoiceQuestion[] = [
      { id: "q0", question: "Q1", choices: [{ id: "a", label: "A" }], multiSelect: false, allowOther: false, required: true },
      { id: "q1", question: "Q2", choices: [{ id: "b", label: "B" }], multiSelect: false, allowOther: false, required: true },
    ];
    let state = createInitialAskChoiceState(questions);
    // Answer Q1 → advances to Q2
    state = askChoiceReducer(state, { type: "SELECT_AT_CURSOR" });
    expect(state.activeIndex).toBe(1);
    expect(state.phase).toBe("active");
    // Answer Q2 (last tab) → auto-submits
    state = askChoiceReducer(state, { type: "SELECT_AT_CURSOR" });
    expect(state.phase).toBe("submitted");
  });

  test("multi-question single-select: does not auto-submit on last tab if other questions unanswered", () => {
    const questions: AskChoiceQuestion[] = [
      { id: "q0", question: "Q1", choices: [{ id: "a", label: "A" }], multiSelect: false, allowOther: false, required: true },
      { id: "q1", question: "Q2", choices: [{ id: "b", label: "B" }], multiSelect: false, allowOther: false, required: true },
    ];
    let state = createInitialAskChoiceState(questions);
    // Jump to last tab without answering Q1
    state = askChoiceReducer(state, { type: "NEXT_TAB" });
    expect(state.activeIndex).toBe(1);
    // Pick on last tab but Q1 unanswered → stays active
    state = askChoiceReducer(state, { type: "SELECT_AT_CURSOR" });
    expect(state.phase).toBe("active");
  });
});

// ── Reducer: multi-select ──────────────────────────────────────────

describe("reducer: multi-select", () => {
  test("TOGGLE_AT_CURSOR toggles selection", () => {
    let state = createInitialAskChoiceState([multiQuestion]);
    state = askChoiceReducer(state, { type: "TOGGLE_AT_CURSOR" });
    expect(state.questionStates[0].selectedIds).toEqual(["x"]);
    state = askChoiceReducer(state, { type: "MOVE_CURSOR", delta: 1 });
    state = askChoiceReducer(state, { type: "TOGGLE_AT_CURSOR" });
    expect(state.questionStates[0].selectedIds).toEqual(["x", "y"]);
    state = askChoiceReducer(state, { type: "MOVE_CURSOR", delta: -1 });
    state = askChoiceReducer(state, { type: "TOGGLE_AT_CURSOR" });
    expect(state.questionStates[0].selectedIds).toEqual(["y"]);
  });

  test("TOGGLE_AT_CURSOR is no-op in single-select mode", () => {
    let state = createInitialAskChoiceState([singleQuestion]);
    state = askChoiceReducer(state, { type: "TOGGLE_AT_CURSOR" });
    expect(state.questionStates[0].selectedIds).toEqual([]);
  });
});

// ── Reducer: tabs ──────────────────────────────────────────────────

describe("reducer: tab switching", () => {
  const twoQuestions = [singleQuestion, multiQuestion];

  test("NEXT_TAB / PREV_TAB", () => {
    let state = createInitialAskChoiceState(twoQuestions);
    expect(state.activeIndex).toBe(0);
    state = askChoiceReducer(state, { type: "NEXT_TAB" });
    expect(state.activeIndex).toBe(1);
    state = askChoiceReducer(state, { type: "NEXT_TAB" });
    expect(state.activeIndex).toBe(1);
    state = askChoiceReducer(state, { type: "PREV_TAB" });
    expect(state.activeIndex).toBe(0);
    state = askChoiceReducer(state, { type: "PREV_TAB" });
    expect(state.activeIndex).toBe(0);
  });

  test("SWITCH_TAB", () => {
    let state = createInitialAskChoiceState(twoQuestions);
    state = askChoiceReducer(state, { type: "SWITCH_TAB", index: 1 });
    expect(state.activeIndex).toBe(1);
  });
});

// ── Reducer: Other text ────────────────────────────────────────────

describe("reducer: Other text", () => {
  test("SET_OTHER_TEXT", () => {
    let state = createInitialAskChoiceState([singleQuestion]);
    state = askChoiceReducer(state, { type: "SET_OTHER_TEXT", text: "hello" });
    expect(state.questionStates[0].otherText).toBe("hello");
  });

  test("FOCUS_OTHER / BLUR_OTHER", () => {
    let state = createInitialAskChoiceState([singleQuestion]);
    state = askChoiceReducer(state, { type: "FOCUS_OTHER" });
    expect(state.questionStates[0].otherFocused).toBe(true);
    state = askChoiceReducer(state, { type: "BLUR_OTHER" });
    expect(state.questionStates[0].otherFocused).toBe(false);
  });
});

// ── canSubmit / isQuestionAnswered ─────────────────────────────────

describe("canSubmit", () => {
  test("required question with no answer → false", () => {
    const state = createInitialAskChoiceState([singleQuestion]);
    expect(canSubmit(state)).toBe(false);
  });

  test("required question with pick → true", () => {
    const twoQ = [singleQuestion, optionalQuestion];
    let state = createInitialAskChoiceState(twoQ);
    state = askChoiceReducer(state, { type: "SELECT_AT_CURSOR" });
    expect(state.questionStates[0].pickedId).toBe("a");
    expect(canSubmit(state)).toBe(true);
  });

  test("optional question always answerable", () => {
    const state = createInitialAskChoiceState([optionalQuestion]);
    expect(canSubmit(state)).toBe(true);
  });

  test("Other text counts as answer", () => {
    let state = createInitialAskChoiceState([singleQuestion]);
    state = askChoiceReducer(state, { type: "SET_OTHER_TEXT", text: "custom" });
    expect(canSubmit(state)).toBe(true);
  });
});

// ── buildAskChoiceResult ───────────────────────────────────────────

describe("buildAskChoiceResult", () => {
  test("single-select submitted", () => {
    let state = createInitialAskChoiceState([singleQuestion]);
    state = askChoiceReducer(state, { type: "SELECT_AT_CURSOR" });
    const result = buildAskChoiceResult(state);
    expect(result.kind).toBe("submitted");
    if (result.kind === "submitted") {
      expect(result.answers).toHaveLength(1);
      expect(result.answers[0].selectedIds).toEqual(["a"]);
      expect(result.answers[0].userMessage).toBe("Alpha");
    }
  });

  test("single-select with userMessage", () => {
    let state = createInitialAskChoiceState([singleQuestion]);
    state = askChoiceReducer(state, { type: "MOVE_CURSOR", delta: 1 });
    state = askChoiceReducer(state, { type: "SELECT_AT_CURSOR" });
    const result = buildAskChoiceResult(state);
    if (result.kind === "submitted") {
      expect(result.answers[0].userMessage).toBe("I chose Beta");
    }
  });

  test("multi-select submitted", () => {
    let state = createInitialAskChoiceState([multiQuestion]);
    state = askChoiceReducer(state, { type: "TOGGLE_AT_CURSOR" });
    state = askChoiceReducer(state, { type: "MOVE_CURSOR", delta: 1 });
    state = askChoiceReducer(state, { type: "TOGGLE_AT_CURSOR" });
    state = askChoiceReducer(state, { type: "SUBMIT" });
    const result = buildAskChoiceResult(state);
    if (result.kind === "submitted") {
      expect(result.answers[0].selectedIds).toEqual(["x", "y"]);
      expect(result.answers[0].userMessage).toBe("X-ray\nYankee");
    }
  });

  test("Other text in result", () => {
    let state = createInitialAskChoiceState([
      { ...singleQuestion, required: false },
    ]);
    state = askChoiceReducer(state, { type: "SET_OTHER_TEXT", text: "my answer" });
    state = askChoiceReducer(state, { type: "SUBMIT" });
    const result = buildAskChoiceResult(state);
    if (result.kind === "submitted") {
      expect(result.answers[0].otherText).toBe("my answer");
      expect(result.answers[0].userMessage).toBe("my answer");
    }
  });

  test("cancelled result", () => {
    let state = createInitialAskChoiceState([singleQuestion]);
    state = askChoiceReducer(state, { type: "CANCEL" });
    const result = buildAskChoiceResult(state);
    expect(result.kind).toBe("cancelled");
  });
});

// ── buildLegacyUserMessage ─────────────────────────────────────────

describe("buildLegacyUserMessage", () => {
  test("single answer", () => {
    const result = buildLegacyUserMessage({
      kind: "submitted",
      answers: [{ questionId: "q0", selectedIds: ["a"], otherText: "", userMessage: "Alpha" }],
    });
    expect(result).toBe("Alpha");
  });

  test("multiple answers joined", () => {
    const result = buildLegacyUserMessage({
      kind: "submitted",
      answers: [
        { questionId: "q0", selectedIds: ["a"], otherText: "", userMessage: "Alpha" },
        { questionId: "q1", selectedIds: ["x"], otherText: "", userMessage: "X-ray" },
      ],
    });
    expect(result).toBe("Alpha\n\nX-ray");
  });

  test("cancelled returns empty", () => {
    expect(buildLegacyUserMessage({ kind: "cancelled" })).toBe("");
  });
});

// ── HYDRATE_QUESTIONS (reconcile after incremental rawData) ────────

describe("reducer: HYDRATE_QUESTIONS", () => {
  test("appends empty questionStates for newly-arrived questions (active phase)", () => {
    // Simulate mount with 1 question, then rawData grows to 3 (active phase).
    const q1: AskChoiceQuestion = {
      id: "q0", question: "Q1", choices: [{ id: "a", label: "A" }],
      multiSelect: false, allowOther: false, required: true,
    };
    let state = createInitialAskChoiceState([q1]);
    expect(state.questionStates).toHaveLength(1);
    expect(state.phase).toBe("active");

    const q2: AskChoiceQuestion = {
      id: "q1", question: "Q2", choices: [{ id: "b", label: "B" }],
      multiSelect: false, allowOther: false, required: true,
    };
    const q3: AskChoiceQuestion = {
      id: "q2", question: "Q3", choices: [{ id: "c", label: "C" }],
      multiSelect: true, allowOther: false, required: true,
    };
    state = askChoiceReducer(state, { type: "HYDRATE_QUESTIONS", questions: [q1, q2, q3] });

    expect(state.questions).toHaveLength(3);
    expect(state.questionStates).toHaveLength(3);
    // New states initialized empty.
    expect(state.questionStates[0].pickedId).toBeNull();
    expect(state.questionStates[1].pickedId).toBeNull();
    expect(state.questionStates[2].selectedIds).toEqual([]);
    expect(state.activeIndex).toBe(0);
  });

  test("preserves existing per-question state when appending", () => {
    // Start with 2 questions so single-select pick does NOT auto-submit.
    const q1: AskChoiceQuestion = {
      id: "q0", question: "Q1", choices: [{ id: "a", label: "A" }],
      multiSelect: false, allowOther: false, required: true,
    };
    const q2: AskChoiceQuestion = {
      id: "q1", question: "Q2", choices: [{ id: "b", label: "B" }],
      multiSelect: false, allowOther: false, required: true,
    };
    let state = createInitialAskChoiceState([q1, q2]);
    state = askChoiceReducer(state, { type: "SELECT_AT_CURSOR" });
    expect(state.questionStates[0].pickedId).toBe("a");
    expect(state.phase).toBe("active"); // multi-question → no auto-submit

    const q3: AskChoiceQuestion = {
      id: "q2", question: "Q3", choices: [{ id: "c", label: "C" }],
      multiSelect: true, allowOther: false, required: true,
    };
    state = askChoiceReducer(state, { type: "HYDRATE_QUESTIONS", questions: [q1, q2, q3] });
    expect(state.questionStates).toHaveLength(3);
    expect(state.questionStates[0].pickedId).toBe("a"); // preserved
    expect(state.questionStates[2].selectedIds).toEqual([]); // new empty
  });

  test("no-op when questions length unchanged", () => {
    const state = createInitialAskChoiceState([singleQuestion]);
    const next = askChoiceReducer(state, {
      type: "HYDRATE_QUESTIONS",
      questions: [singleQuestion],
    });
    expect(next).toBe(state);
  });

  test("shrinks questions ref without dropping existing states", () => {
    const questions: AskChoiceQuestion[] = [
      { id: "q0", question: "Q1", choices: [{ id: "a", label: "A" }], multiSelect: false, allowOther: false, required: true },
      { id: "q1", question: "Q2", choices: [{ id: "b", label: "B" }], multiSelect: false, allowOther: false, required: true },
    ];
    let state = createInitialAskChoiceState(questions);
    // Only q0 remains; questionStates[1] is kept (harmless, never indexed).
    state = askChoiceReducer(state, { type: "HYDRATE_QUESTIONS", questions: [questions[0]] });
    expect(state.questions).toHaveLength(1);
    expect(state.questionStates).toHaveLength(2);
  });

  test("no-op after submit phase (late-arriving data does not pollute result)", () => {
    let state = createInitialAskChoiceState([singleQuestion]);
    state = askChoiceReducer(state, { type: "SELECT_AT_CURSOR" });
    expect(state.phase).toBe("submitted");
    const q2: AskChoiceQuestion = {
      id: "q1", question: "Q2", choices: [{ id: "b", label: "B" }],
      multiSelect: false, allowOther: false, required: true,
    };
    const before = state;
    state = askChoiceReducer(state, { type: "HYDRATE_QUESTIONS", questions: [singleQuestion, q2] });
    expect(state).toBe(before); // frozen — no questions/questionStates growth
    expect(state.questionStates).toHaveLength(1);
    expect(state.questions).toHaveLength(1);
    expect(state.phase).toBe("submitted");
  });
});
