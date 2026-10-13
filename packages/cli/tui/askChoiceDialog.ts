/**
 * TUI renderer for the isomorphic `ask_user` state machine.
 *
 * Renders a multi-tab question panel with single/multi-select, an "Other"
 * free-text row, and a Submit action — matching the Web AskChoicePanel.
 *
 * Keyboard map:
 *   ↑/↓        move cursor
 *   Enter/Space on a choice row: single-select → lands immediately: advance
 *              to the next unanswered question, or close the dialog and send
 *              when nothing is left unanswered; multi-select → toggle only
 *              (the explicit Submit row stays required).
 *   Enter      on the Other row: focus its input; while focused with text:
 *              commit the answer like a single-select pick (advance/send);
 *              empty text or multi-select only saves (blur).
 *   ↓ / ↑      past the last row / back: focus the form-level action row
 *              (「跳过」 for the current optional unanswered question,
 *              「完成」 when the form contains a multi-select question).
 *              Pure required single-select forms have no action row at all.
 *   Enter      on the action row: skip the optional question / send the form.
 *   Ctrl+S     activates the action row (完成/跳过); ignored without one.
 *   Tab        next question tab
 *   Shift+Tab  prev question tab
 *   1..9       quick-select the matching numbered row (Other's own number
 *              focuses its input; digits type literally while it is focused).
 *              The Submit row has NO number on purpose: a digit must never
 *              dispatch SUBMIT.
 *   Esc        cancel
 *   printable  type into Other when focused (or on the Other row)
 *   Backspace  delete from Other when focused
 *
 * Other-row IME: the frame paints a plain text row (no fake block cursor).
 * After each paint, when Other is focused, we CUP the real terminal cursor to
 * the end of that text so the OS IME candidate window anchors there — matching
 * how the docked composer positions its cursor via displayWidth.
 */

import {
  type AskChoiceAction,
  type AskChoiceQuestion,
  type AskChoiceUiState,
  askChoiceReducer,
  buildAskChoiceResult,
  createInitialAskChoiceState,
  formRequiresExplicitSubmit,
  formatOutboundUserMessage,
  normalizeAskChoiceArgs,
  questionHasAnswer,
} from "ai/tools/askChoiceState";
import {
  createStandaloneDialogSession,
  type DialogInputPolicy,
  type DialogSession,
} from "./dialogHost";
import {
  DIALOG_CHECKED,
  DIALOG_CURSOR,
  DIALOG_UNCHECKED,
  renderDialogRow,
  renderDialogTitle,
  renderOverflowAbove,
  renderOverflowBelow,
} from "./dialogFrame";
import { t } from "./i18n";
import {
  clearAnchoredLines,
  computeVisibleWindow,
  createDialogFramePainter,
  createRawKeyReader,
  createWheelThrottle,
  drainInputBuffer,
  isArrowDown,
  isArrowUp,
  isCancel,
  isSubmit,
  outputIsTty,
  STREAM_CLOSED,
  type KeyReader,
} from "./selectDialog";
import { resolveCliColorEnabled } from "../client/terminalStyles";
import { themeColorSequence, themeText } from "./theme";
import { displayWidth } from "./tuiAnsi";
import { SGR_MOUSE_REGEX, parseScrollAction } from "./tuiScrollbar";
import type { UserChoiceRequest, UserChoiceResult } from "../client/localRuntimeAdapterTypes";

// ── Rendering ──────────────────────────────────────────────────────

const KEY_TAB = "\t";
const KEY_SHIFT_TAB = "\x1b[Z";
const KEY_BACKSPACE = "\x7f";
const KEY_BACKSPACE_ALT = "\b";
const KEY_SPACE = " ";
/** Ctrl+S — the explicit final submit (0x13 reaches a raw-mode stdin because
 * Node's setRawMode disables IXON; same byte the workspace uses for send). */
const KEY_CTRL_S = "\x13";

/** Tab-bar completion markers: answered / required missing / optional. */
const TAB_DONE = "✓";
const TAB_MISSING = "!";
const TAB_OPTIONAL = "·";

export type AskChoiceCursor = {
  /** 0-based line index inside the rendered frame. */
  lineIndex: number;
  /** 0-based display column (before CUP's 1-based adjust). */
  col: number;
};

export type AskChoiceFrame = {
  text: string;
  /** Present when the Other free-text row is focused and accepts typing. */
  otherCursor: AskChoiceCursor | null;
};

function renderTabBar(state: AskChoiceUiState, colorEnabled: boolean): string {
  const tabs = state.questions.map((q, i) => {
    // Per-tab completion state: ✓ answered, ! required-but-unanswered,
    // · optional-and-unanswered. The active tab switches from [label] to the
    // accent style so the reducer's jump-to-first-unanswered is visible.
    const qs = state.questionStates[i];
    const hasAnswer =
      qs.pickedId !== null ||
      qs.selectedIds.length > 0 ||
      qs.otherText.trim().length > 0;
    const mark = hasAnswer ? TAB_DONE : q.required ? TAB_MISSING : TAB_OPTIONAL;
    const label = `${mark} ${q.header || `Q${i + 1}`}`;
    if (i === state.activeIndex) {
      return colorEnabled
        ? `${themeColorSequence("accent")} ${label} \x1b[0m`
        : `[${label}]`;
    }
    return colorEnabled
      ? themeText(` ${label} `, "muted", colorEnabled)
      : ` ${label} `;
  });
  // The trailing hint only exists when the dialog actually has an action row
  // (完成 / 跳过): pure required single-select forms render no such row.
  const actionRow = resolveAskChoiceActionRow(state);
  const submitLabel = actionRow ? `${actionRow.label} ↓` : null;
  if (!submitLabel) return tabs.join("  ");
  return (
    tabs.join("  ") +
    "  " +
    (colorEnabled ? themeText(submitLabel, "chrome", colorEnabled) : submitLabel)
  );
}

/**
 * The contextual action row of the dialog:
 * - `skip`   → current question is optional and still unanswered: explicit 跳过;
 * - `submit` → the form contains a multi-select question: explicit 完成;
 * - `null`   → pure required single-select form: nothing to trigger explicitly,
 *              so the row (and its footer/keys) is not rendered at all.
 */
function resolveAskChoiceActionRow(
  state: AskChoiceUiState,
): { kind: "skip" | "submit"; label: string } | null {
  const q = state.questions[state.activeIndex];
  const qs = state.questionStates[state.activeIndex];
  if (!q || !qs) return null;
  if (!q.required && !questionHasAnswer(q, qs)) {
    return { kind: "skip", label: t("askChoiceSkipRow") };
  }
  if (formRequiresExplicitSubmit(state.questions)) {
    return { kind: "submit", label: t("askChoiceSubmitRow") };
  }
  return null;
}

function renderFooter(
  actionRow: ReturnType<typeof resolveAskChoiceActionRow>,
  colorEnabled: boolean,
): string {
  const hints =
    actionRow?.kind === "skip"
      ? t("askChoiceFooterSkip")
      : actionRow?.kind === "submit"
        ? t("askChoiceFooterMulti")
        : t("askChoiceFooterSingle");
  return colorEnabled ? themeText(`  ${hints}`, "chrome", colorEnabled) : `  ${hints}`;
}

function otherRowPrefix(index: number): string {
  // Plain (no ANSI) prefix used both for painting and for cursor column math.
  // Marker is a single space here; the focused marker is applied separately so
  // displayWidth stays stable regardless of color wrapping.
  return ` [${index + 1}] ${t("askChoiceOtherLabel")}: `;
}

export function renderAskChoiceFrame(
  state: AskChoiceUiState,
  options?: { bottomAnchored?: boolean; submitFocused?: boolean },
): AskChoiceFrame {
  const colorEnabled = resolveCliColorEnabled();
  const submitFocused = options?.submitFocused === true;
  const q = state.questions[state.activeIndex];
  const qs = state.questionStates[state.activeIndex];
  const actionRow = resolveAskChoiceActionRow(state);
  const lines: string[] = [];
  let otherCursor: AskChoiceCursor | null = null;

  // Title
  lines.push(renderDialogTitle(t("askChoiceTitle")));
  if (options?.bottomAnchored) {
    lines.push(
      colorEnabled
        ? themeText(`  ${t("askChoiceScrollHint")}`, "muted", colorEnabled)
        : `  ${t("askChoiceScrollHint")}`,
    );
  }
  lines.push("");

  // Tab bar (only when multiple questions)
  if (state.questions.length > 1) {
    lines.push(renderTabBar(state, colorEnabled));
    lines.push("");
  }

  // Validation feedback: the reducer already moved the active tab to the
  // first unanswered required question, so explain why the submit did not go
  // through instead of silently repainting the same frame.
  if (state.validationAttempted) {
    lines.push(
      colorEnabled
        ? themeText(`  ${t("askChoiceValidationRequired")}`, "warning", colorEnabled)
        : `  ${t("askChoiceValidationRequired")}`,
    );
    lines.push("");
  }

  // Question text
  lines.push(
    colorEnabled
      ? `${themeColorSequence("accent")}? ${q.question}\x1b[0m`
      : `? ${q.question}`,
  );

  if (q.multiSelect) {
    lines.push(
      colorEnabled
        ? themeText(`  ${t("askChoiceHintMulti")}`, "muted", colorEnabled)
        : `  ${t("askChoiceHintMulti")}`,
    );
  } else if (actionRow?.kind === "skip") {
    lines.push(
      colorEnabled
        ? themeText(`  ${t("askChoiceHintOptional")}`, "muted", colorEnabled)
        : `  ${t("askChoiceHintOptional")}`,
    );
  } else {
    lines.push(
      colorEnabled
        ? themeText(`  ${t("askChoiceHintSingle")}`, "muted", colorEnabled)
        : `  ${t("askChoiceHintSingle")}`,
    );
  }
  lines.push("");

  // Choice rows
  const totalRows = q.choices.length + (q.allowOther ? 1 : 0);
  const window = computeVisibleWindow({
    selectedIndex: qs.cursorIndex,
    total: totalRows,
  });

  if (window.start > 0) {
    lines.push(renderOverflowAbove(window.start));
  }

  for (let i = window.start; i < window.end; i++) {
    if (i < q.choices.length) {
      const choice = q.choices[i];
      // While the Submit row holds the focus the row cursor is hidden, so
      // exactly one line looks focused at any time.
      const focused = qs.cursorIndex === i && !submitFocused;
      const checkbox = q.multiSelect
        ? qs.selectedIds.includes(choice.id)
          ? DIALOG_CHECKED
          : DIALOG_UNCHECKED
        : qs.pickedId === choice.id
          ? DIALOG_CHECKED
          : undefined;
      lines.push(
        renderDialogRow({
          label: `[${i + 1}] ${choice.label}`,
          ...(choice.detail ? { detail: choice.detail } : {}),
          focused,
          ...(checkbox ? { checkbox } : {}),
        }),
      );
    } else {
      // Other row — never paint a fake █; the real terminal cursor is CUPed
      // onto this text after paint so CJK IME windows anchor correctly.
      const focused = qs.cursorIndex === i && !submitFocused;
      const marker = focused ? DIALOG_CURSOR : " ";
      const plainPrefix = `${marker}${otherRowPrefix(i)}`;
      const plainRow = `${plainPrefix}${qs.otherText}`;
      if (focused && colorEnabled) {
        lines.push(
          `${themeColorSequence("accent")}${plainRow}\x1b[0m`,
        );
      } else {
        lines.push(plainRow);
      }
      if (qs.otherFocused) {
        otherCursor = {
          lineIndex: lines.length - 1,
          col: displayWidth(plainPrefix + qs.otherText),
        };
      }
    }
  }

  if (window.end < totalRows) {
    lines.push(renderOverflowBelow(totalRows - window.end));
  }

  // Contextual action row: 「完成」for forms containing a multi-select
  // question, 「跳过」for the current optional unanswered question. Pure
  // required single-select forms have nothing to trigger explicitly, so the
  // row is omitted entirely (Enter on a choice already sends).
  if (actionRow) {
    lines.push(
      renderDialogRow({
        label: actionRow.label,
        focused: submitFocused,
      }),
    );
  }

  lines.push("");
  lines.push(renderFooter(actionRow, colorEnabled));

  return { text: lines.join("\n"), otherCursor };
}

// ── Runner ─────────────────────────────────────────────────────────

export async function runAskChoiceDialog(args: {
  request: UserChoiceRequest;
  input?: NodeJS.ReadStream;
  output?: NodeJS.WritableStream;
  readKey?: KeyReader;
  bottomAnchored?: boolean;
  bottomRow?: number | (() => number);
  inputPolicy?: DialogInputPolicy;
  onTranscriptScroll?: (action: string) => void;
  mouseEnabled?: boolean;
  registerForegroundRepaint?: (repaint: () => void) => void;
  session?: DialogSession;
}): Promise<UserChoiceResult> {
  const { request } = args;

  // Normalize to questions[]
  const normalized = normalizeAskChoiceArgs({
    question: request.question,
    choices: request.choices,
    questions: request.questions,
    blocking: request.blocking,
  });

  if (normalized.questions.length === 0) {
    return { kind: "cancelled" };
  }

  let state = createInitialAskChoiceState(normalized.questions);

  const output = args.output ?? process.stdout;
  const input = args.input ?? process.stdin;
  const readKey = args.readKey ?? createRawKeyReader(input);
  const session = args.session ?? createStandaloneDialogSession({ input, output });

  const wheelThrottle = createWheelThrottle();
  let rawAcquired = false;
  // TUI-local focus on the contextual action row (完成/跳过). The row itself is
  // rendered from this flag; the reducer's cursorIndex never leaves the real
  // rows. No action row → the flag is forced false.
  let submitFocused = false;
  const bottomAnchored = Boolean(args.bottomAnchored && args.bottomRow);
  const resolveBottomRow = () =>
    Math.max(
      1,
      typeof args.bottomRow === "function"
        ? args.bottomRow()
        : args.bottomRow ?? 0,
    );

  const painter = createDialogFramePainter({
    output,
    render: () => {
      const frame = renderAskChoiceFrame(state, { bottomAnchored, submitFocused });
      return {
        text: frame.text,
        cursor: frame.otherCursor,
      };
    },
    bottomAnchored,
    resolveBottomRow,
    session,
  });
  const paint = painter.paint;

  const resizeTarget = output as NodeJS.WritableStream & {
    on?: (event: string, listener: () => void) => void;
    off?: (event: string, listener: () => void) => void;
  };
  const onOutputResize = () => paint();
  args.registerForegroundRepaint?.(paint);

  try {
    // Mouse reporting for the dialog window is session-owned: the hosted
    // session re-enables what the composer paused; the standalone session
    // writes its canonical enable pair. The matching disable happens in the
    // finally, also through the session.
    if (args.mouseEnabled !== false) session.setMouseReporting(true);
    if (input.isTTY) rawAcquired = session.acquireRaw();
    if (bottomAnchored && outputIsTty(output) && !args.registerForegroundRepaint) {
      resizeTarget.on?.("resize", onOutputResize);
    }
    paint();

    while (state.phase === "active") {
      const sequence = await readKey();
      if (sequence === STREAM_CLOSED) {
        state = askChoiceReducer(state, { type: "CANCEL" });
        break;
      }

      // Mouse wheel scrolls the choice list (batch-throttled so a single
      // gesture's dozens of reports don't send the cursor flying).
      const scrollAction = parseScrollAction(sequence);
      if ((scrollAction === "wheel-up" || scrollAction === "wheel-down") && (args.inputPolicy?.wheel ?? "modal") === "transcript") {
        args.onTranscriptScroll?.(scrollAction);
        continue;
      }
      if (scrollAction && scrollAction !== "wheel-up" && scrollAction !== "wheel-down" && (args.inputPolicy?.pageKeys ?? "modal") === "transcript") {
        args.onTranscriptScroll?.(scrollAction);
        continue;
      }
      if (scrollAction === "wheel-up" || scrollAction === "wheel-down") {
        if ((args.inputPolicy?.wheel ?? "modal") === "ignore") {
          continue;
        }
        const direction: 1 | -1 = scrollAction === "wheel-up" ? -1 : 1;
        if (wheelThrottle.step(direction) === 0) continue;
        // A wheel step is list navigation: it leaves the Submit row.
        submitFocused = false;
        state = askChoiceReducer(state, {
          type: "MOVE_CURSOR",
          delta: direction,
        });
        paint();
        continue;
      }

      // Any other SGR mouse report (click / drag / release) must never cancel
      // the dialog. Swallow it silently — the user clicked into the terminal,
      // not at a button. Re-entering the window from another app used to
      // reject the prompt; this guard keeps it open without redrawing.
      if (SGR_MOUSE_REGEX.test(sequence)) {
        continue;
      }

      let action: AskChoiceAction | null = null;
      const qs = state.questionStates[state.activeIndex];
      const q = state.questions[state.activeIndex];
      const isOtherRow = qs.cursorIndex >= q.choices.length;
      const actionRow = resolveAskChoiceActionRow(state);
      // No action row (pure required single-select): the ↓-focus state can
      // never stick around.
      if (!actionRow) submitFocused = false;

      if (sequence === KEY_SHIFT_TAB) {
        action = { type: "PREV_TAB" };
      } else if (sequence === KEY_TAB) {
        action = { type: "NEXT_TAB" };
      } else if (isCancel(sequence)) {
        action = { type: "CANCEL" };
      } else if (isArrowUp(sequence)) {
        if (submitFocused) {
          // ↑ returns to the list: the row cursor never left the last row,
          // so the highlight lands back exactly where it was.
          submitFocused = false;
          paint();
          continue;
        }
        action = { type: "MOVE_CURSOR", delta: -1 };
      } else if (isArrowDown(sequence)) {
        const maxRowIndex = q.allowOther
          ? q.choices.length
          : q.choices.length - 1;
        if (submitFocused) {
          // ↓ on the Submit row stays there (it is the last focusable row).
          continue;
        }
        if (qs.cursorIndex >= maxRowIndex) {
          // ↓ past the last row focuses the action row (完成/跳过) when one
          // exists. MOVE_CURSOR clamps at the last row and clears otherFocused,
          // so a focused Other input is saved (blur) — still without submitting.
          if (!actionRow) continue;
          submitFocused = true;
          state = askChoiceReducer(state, { type: "MOVE_CURSOR", delta: 1 });
          paint();
          continue;
        }
        action = { type: "MOVE_CURSOR", delta: 1 };
      } else if (sequence === KEY_CTRL_S) {
        // Ctrl+S activates the action row (完成/跳过); without one (pure
        // required single-select forms) there is nothing to trigger.
        if (!actionRow) continue;
        action =
          actionRow.kind === "skip"
            ? { type: "SKIP_CURRENT" }
            : { type: "SUBMIT" };
      } else if (sequence === KEY_SPACE) {
        if (submitFocused) {
          // Space never activates the Submit row (Enter is its action), so a
          // stray space cannot send the form.
          continue;
        }
        if (qs.otherFocused) {
          // Literal space while typing Other (single + multi).
          action = {
            type: "SET_OTHER_TEXT",
            text: qs.otherText + " ",
          };
        } else if (isOtherRow) {
          // Space on the Other row opens its free-text input (single + multi).
          action = { type: "FOCUS_OTHER" };
        } else {
          // On a choice row Space is a pick/toggle — never a submit.
          action = { type: "TOGGLE_AT_CURSOR" };
        }
      } else if (isSubmit(sequence)) {
        // Enter acts on the focused row: on a single-select choice it lands
        // immediately (advance to the next unanswered question, or send when
        // nothing is left), on a multi-select row it toggles, on the Other
        // row it opens the input, inside Other it commits the answer
        // (single-select) or saves (multi-select), and on the Submit row it
        // sends the form.
        if (submitFocused) {
          action =
            actionRow?.kind === "skip"
              ? { type: "SKIP_CURRENT" }
              : { type: "SUBMIT" };
        } else if (qs.otherFocused) {
          action =
            !q.multiSelect && qs.otherText.trim()
              ? { type: "COMMIT_OTHER" }
              : { type: "BLUR_OTHER" };
        } else if (isOtherRow) {
          action = { type: "FOCUS_OTHER" };
        } else {
          action = { type: "TOGGLE_AT_CURSOR" };
        }
      } else if (
        sequence === KEY_BACKSPACE ||
        sequence === KEY_BACKSPACE_ALT
      ) {
        if (qs.otherFocused && qs.otherText.length > 0) {
          // Delete one Unicode code point, not one UTF-16 unit, so a CJK
          // character (or emoji) erases as a single glyph.
          const chars = Array.from(qs.otherText);
          action = {
            type: "SET_OTHER_TEXT",
            text: chars.slice(0, -1).join(""),
          };
        }
      } else if (submitFocused) {
        // Submit row focused: every other key (digits, printable text, IME
        // bursts, backspace) is ignored — it must not pick a row, leak text
        // into Other, or submit the form. ↑/Enter/Tab/Ctrl+S still work.
        continue;
      } else if (
        sequence.length === 1 &&
        sequence >= "1" &&
        sequence <= "9" &&
        !qs.otherFocused
      ) {
        // Real numeric quick-select for the [n] badges (the numbers used to
        // be decorative). 1..choices.length picks/toggles that choice; the
        // Other row's own number focuses its input. While the Other input is
        // focused digits type literally (handled below, never here).
        const rowIndex = Number(sequence) - 1;
        if (rowIndex < q.choices.length) {
          const choice = q.choices[rowIndex];
          if (choice) action = { type: "SELECT_CHOICE", choiceId: choice.id };
        } else if (rowIndex === q.choices.length && q.allowOther) {
          action = { type: "FOCUS_OTHER" };
        }
        // The Submit row's position has no digit mapping on purpose: a digit
        // there is a no-op and can never dispatch SUBMIT.
      } else if (
        sequence.length >= 1 &&
        sequence.charCodeAt(0) >= 32 &&
        !sequence.startsWith("\x1b")
      ) {
        // Printable text → type into Other if focused OR if the cursor sits
        // on the Other row (auto-focus so the user can start typing without
        // an extra Enter). Accept multi-char bursts so CJK IME commits
        // (word groups / 整句) land in one piece. Strip control chars so a
        // pasted "word\r" doesn't smuggle a submit.
        if (qs.otherFocused || (isOtherRow && q.allowOther)) {
          const cleaned = sequence.replace(/[\x00-\x1f\x7f]/g, "");
          if (cleaned) {
            if (!qs.otherFocused) {
              state = askChoiceReducer(state, { type: "FOCUS_OTHER" });
            }
            const currentText =
              state.questionStates[state.activeIndex].otherText;
            action = {
              type: "SET_OTHER_TEXT",
              text: currentText + cleaned,
            };
          }
        }
      }

      if (action) {
        state = askChoiceReducer(state, action);

        // A single-select answer that leaves nothing unanswered lands the
        // form: the reducer only emits the `complete` signal (no side
        // effects), so the dialog performs the actual SUBMIT here.
        if (state.phase === "active" && state.answerSignal?.kind === "complete") {
          state = askChoiceReducer(state, { type: "SUBMIT" });
        }

        // The transitions out of `active` are: a completing single-select
        // answer, an explicit SUBMIT (Enter on the Submit row, Ctrl+S) or
        // CANCEL. An invalid SUBMIT keeps the dialog open: the reducer moved
        // the active tab to the first unanswered required question and
        // flagged validationAttempted, which the renderer shows.
        if (state.phase !== "active") break;

        // Any dispatched action leaves the Submit row (the action either
        // closed the dialog, switched tabs, or failed validation and jumped
        // to the first unanswered question — the user lands back on a row).
        submitFocused = false;

        paint();
      }
    }
  } finally {
    session.setMouseReporting(false);
    resizeTarget.off?.("resize", onOutputResize);
    readKey.dispose?.();
    painter.clear();
    if (input.isTTY) {
      drainInputBuffer(input);
      session.releaseRaw(rawAcquired);
    }
  }

  // Build result
  const result = buildAskChoiceResult(state);
  if (result.kind === "cancelled") {
    return { kind: "cancelled" };
  }

  // Single-question backward compat (covers single-select AND multi-select
  // on one question — both return kind:"selected" with joined labels).
  if (result.answers.length === 1) {
    const a = result.answers[0];
    const q = normalized.questions[0];
    const labels = a.selectedIds
      .map((id) => q.choices.find((c) => c.id === id)?.label ?? "")
      .filter(Boolean);
    if (a.otherText) labels.push(a.otherText);
    return {
      kind: "selected",
      userMessage: a.userMessage,
      // Fallback covers the skip-only shape: no label/other text, but the
      // outbound message carries the SKIPPED marker.
      label: labels.join(", ") || a.otherText || a.userMessage || "",
    };
  }

  // Multi-question: keep the question→answer mapping in the outbound text so
  // the LLM sees which answer belongs to which question.
  return {
    kind: "multi-submitted",
    answers: result.answers,
    userMessage: formatOutboundUserMessage(normalized.questions, result.answers),
  };
}
