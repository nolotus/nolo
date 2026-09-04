/**
 * TUI renderer for the isomorphic `ask_user` state machine.
 *
 * Renders a multi-tab question panel with single/multi-select, an "Other"
 * free-text row, and a Submit action — matching the Web AskChoicePanel.
 *
 * Keyboard map:
 *   ↑/↓        move cursor
 *   Space      toggle (multi-select) / focus Other
 *   Enter      submit (multi-select) / pick+advance (single-select) / save Other / submit
 *   Tab        next question tab
 *   Shift+Tab  prev question tab
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
  canSubmit,
  createInitialAskChoiceState,
  normalizeAskChoiceArgs,
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

function renderTabBar(
  questions: AskChoiceQuestion[],
  activeIndex: number,
  colorEnabled: boolean,
): string {
  const tabs = questions.map((q, i) => {
    const label = q.header || `Q${i + 1}`;
    if (i === activeIndex) {
      return colorEnabled
        ? `${themeColorSequence("accent")} ${label} \x1b[0m`
        : `[${label}]`;
    }
    return colorEnabled
      ? themeText(` ${label} `, "muted", colorEnabled)
      : ` ${label} `;
  });
  const submitLabel = t("askChoiceSubmit");
  return tabs.join("  ") + "  " + (colorEnabled ? themeText(submitLabel, "chrome", colorEnabled) : submitLabel);
}

function renderFooter(multiSelect: boolean, colorEnabled: boolean): string {
  const hints = multiSelect ? t("askChoiceFooterMulti") : t("askChoiceFooterSingle");
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
  options?: { bottomAnchored?: boolean },
): AskChoiceFrame {
  const colorEnabled = resolveCliColorEnabled();
  const q = state.questions[state.activeIndex];
  const qs = state.questionStates[state.activeIndex];
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
    lines.push(renderTabBar(state.questions, state.activeIndex, colorEnabled));
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
      const focused = qs.cursorIndex === i;
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
      const focused = qs.cursorIndex === i;
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

  lines.push("");
  lines.push(renderFooter(q.multiSelect, colorEnabled));

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
      const frame = renderAskChoiceFrame(state, { bottomAnchored });
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

      if (sequence === KEY_SHIFT_TAB) {
        action = { type: "PREV_TAB" };
      } else if (sequence === KEY_TAB) {
        action = { type: "NEXT_TAB" };
      } else if (isCancel(sequence)) {
        action = { type: "CANCEL" };
      } else if (isArrowUp(sequence)) {
        action = { type: "MOVE_CURSOR", delta: -1 };
      } else if (isArrowDown(sequence)) {
        action = { type: "MOVE_CURSOR", delta: 1 };
      } else if (sequence === KEY_SPACE) {
        if (qs.otherFocused) {
          // Literal space while typing Other (single + multi).
          action = {
            type: "SET_OTHER_TEXT",
            text: qs.otherText + " ",
          };
        } else if (q.multiSelect) {
          // Space toggles a choice, or focuses Other.
          action = { type: "TOGGLE_AT_CURSOR" };
        } else if (isOtherRow) {
          // Single-select: Space on Other focuses the free-text input.
          action = { type: "FOCUS_OTHER" };
        }
      } else if (isSubmit(sequence)) {
        if (qs.otherFocused) {
          // Enter in Other input → blur (save text)
          action = { type: "BLUR_OTHER" };
        } else if (isOtherRow && !qs.otherFocused) {
          // Enter on Other row → focus it
          action = { type: "FOCUS_OTHER" };
        } else if (q.multiSelect) {
          // Multi-select: Enter submits (Space toggles) — matches clack convention
          action = { type: "SUBMIT" };
        } else {
          // Single-select: Enter picks (reducer auto-advances/submits)
          action = { type: "SELECT_AT_CURSOR" };
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

        // After SELECT_AT_CURSOR in single-question single-select,
        // the reducer auto-submits. Check phase.
        if (state.phase !== "active") break;

        // If we just blurred Other on the last tab and all questions
        // are answered, auto-submit. Non-last tabs: just save text.
        if (
          action.type === "BLUR_OTHER" &&
          state.activeIndex >= state.questions.length - 1 &&
          canSubmit(state)
        ) {
          state = askChoiceReducer(state, { type: "SUBMIT" });
          break;
        }

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
      label: labels.join(", ") || a.otherText || "",
    };
  }

  // Multi-question
  return {
    kind: "multi-submitted",
    answers: result.answers,
    userMessage: result.answers.map((a) => a.userMessage).filter(Boolean).join("\n\n"),
  };
}
