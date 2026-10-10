/**
 * Web renderer for the isomorphic `ask_user` state machine.
 *
 * Layout and per-state styling live in StyleX (`askChoicePanelStyles.ts`); the
 * component still mirrors the RN AskChoicePanel and shares the same reducer
 * from `ai/tools/askChoiceState`.
 *
 * Contract (docs/plans/2026-09-15-ask-user-unified-interaction.md):
 * - A single-select answer is one step: picking (click / Enter / number key)
 *   lands immediately — multi-question forms advance to the next unanswered
 *   question, and when nothing is left unanswered the answer is persisted and
 *   sent. Multi-select keeps the explicit 提交 button, and so does any form
 *   that contains a multi-select question. The reducer only emits an
 *   `answerSignal`; this component performs the focus/submit side effects.
 * - Submit persists first (onResolve → updateToolMessage + write(dbKey)) and
 *   only then dispatches the next user turn; failures stay retryable and
 *   in-flight duplicates are deduped by the shared command.
 * - Invalid submit moves to the first unanswered required question and shows
 *   inline validation feedback; resolved forms stay navigable read-only.
 * - Enter inside the Other input commits the answer exactly like a pick on a
 *   single-select question (advance/send); on multi-select it only blurs.
 */

import * as stylex from "@stylexjs/stylex";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { LuCheck, LuSquare, LuArrowRight, LuTrash2 } from "react-icons/lu";
import { useAppDispatch } from "app/store";
import { handleSendMessage } from "chat/dialog/dialogSlice";
import {
  type AskChoiceAnswerSignal,
  type AskChoiceQuestion,
  type QuestionUiState,
  askChoiceReducer,
  buildAskChoiceResult,
  buildLegacyUserMessage,
  canSubmit,
  createInitialAskChoiceState,
  formRequiresExplicitSubmit,
  isQuestionAnswered,
  normalizeAskChoiceArgs,
  questionHasAnswer,
} from "ai/tools/askChoiceState";
import {
  type AskChoiceResolution,
  isAskChoiceResolved,
} from "../askChoicePersistence";
import {
  type AskChoiceSubmitCommand,
  createAskChoiceSubmitCommand,
} from "../askChoiceSubmitCommand";
import { askChoicePanelStyles as styles } from "./askChoicePanelStyles";

interface AskChoicePanelWebProps {
  rawData: any;
  toolPayload?: any;
  dbKey?: string;
  interactive?: boolean;
  onDelete?: () => void;
  /** tool-message id，宿主持久化用；面板自身不落库。 */
  messageId?: string;
  /**
   * Persist the submitted answers before the panel sends the next user turn.
   * The panel awaits this Promise: persist 失败时绝不发送，面板保持 active 可重试。
   */
  onResolve?: (resolution: AskChoiceResolution) => void | Promise<void>;
  variant?: "default" | "inline";
}

const AskChoicePanelWeb: React.FC<AskChoicePanelWebProps> = ({
  rawData,
  toolPayload,
  dbKey,
  interactive = true,
  onDelete,
  messageId,
  onResolve,
  variant = "default",
}) => {
  const dispatch = useAppDispatch();
  // 面板保持 store 无关：dbKey/messageId 由宿主 onResolve 闭包使用。
  void dbKey;
  void messageId;

  // Merge rawData + toolPayload.input for robustness：运行中的 tool 行只有 args
  // （server-owned transient 投影、streaming 快照），还没有 tool_result 内容；
  // 单问题 question+choices 也走这条兜底。
  const merged = {
    ...rawData,
    ...(rawData?.questions
      ? {}
      : toolPayload?.input?.questions
        ? { questions: toolPayload.input.questions }
        : {}),
  };
  const normalized = normalizeAskChoiceArgs(merged);
  const questions = normalized.questions;

  // Restore persisted answers: a resolved form comes back read-only and
  // navigable instead of resetting to an empty active form after reload.
  // 统一 resolved 谓词：`answers: []` 等旧 payload 不再误判为已解决。
  const savedAnswers = useMemo(() => {
    if (rawData?.cancelled) return { phase: "cancelled" as const };
    if (isAskChoiceResolved(rawData)) {
      return {
        answers: rawData.answers,
        selected: rawData.selected,
        phase: "submitted" as const,
      };
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [state, dispatchAction] = useReducer(askChoiceReducer, questions, (qs) => {
    const initial = createInitialAskChoiceState(qs, savedAnswers);
    // Host says non-interactive (e.g. streaming snapshot): freeze read-only.
    return interactive ? initial : { ...initial, phase: "submitted" as const };
  });

  // Local view index for resolved (read-only) forms — the shared reducer is
  // frozen once submitted, so review navigation is a pure view concern.
  const [reviewIndex, setReviewIndex] = useState(0);
  // Latest-ref：宿主 onResolve 闭包随渲染更新（rawData/toolPayload 最新值），
  // 提交 command 只创建一次，始终调用最新 onResolve。
  const onResolveRef = useRef(onResolve);
  onResolveRef.current = onResolve;

  // 事务式提交闸门：await 持久化成功 → 才 send；失败 → 不 send、保持可重试。
  const submitCommandRef = useRef<AskChoiceSubmitCommand | null>(null);
  if (!submitCommandRef.current) {
    submitCommandRef.current = createAskChoiceSubmitCommand({
      persist: (resolution) => Promise.resolve(onResolveRef.current?.(resolution)),
      send: (userMessage) => {
        dispatch(handleSendMessage({ userInput: userMessage } as any));
      },
    });
  }
  const [submitting, setSubmitting] = useState(false);
  const [persistFailed, setPersistFailed] = useState(false);

  const otherInputRef = useRef<HTMLInputElement | null>(null);
  const rowRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (questions.length !== state.questionStates.length) {
      dispatchAction({ type: "HYDRATE_QUESTIONS", questions });
    }
  }, [questions, state.questionStates.length, dispatchAction]);

  const isResolved = !interactive || state.phase !== "active";

  useEffect(() => {
    if (isResolved || !state.validationAttempted) return;
    const q = questions[state.activeIndex];
    const qs = state.questionStates[state.activeIndex];
    if (!q || !qs || isQuestionAnswered(q, qs)) return;
    if (q.choices.length === 0 && q.allowOther) {
      otherInputRef.current?.focus();
    } else {
      rowRefs.current[0]?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.validationAttempted, state.activeIndex, isResolved, questions]);

  if (questions.length === 0) return null;

  const clampedReview = Math.min(reviewIndex, questions.length - 1);
  const clampedActiveIndex = Math.min(
    isResolved ? clampedReview : state.activeIndex,
    questions.length - 1,
  );
  const activeQ: AskChoiceQuestion | undefined = questions[clampedActiveIndex];
  const activeQs: QuestionUiState | undefined =
    state.questionStates[clampedActiveIndex];

  if (!activeQ || !activeQs) return null;

  const formCanSubmit = canSubmit(state);
  const needsExplicitSubmit = formRequiresExplicitSubmit(questions);
  const activeCanSkip =
    state.phase === "active" &&
    !activeQ.required &&
    !questionHasAnswer(activeQ, activeQs);
  const showAction =
    needsExplicitSubmit || activeCanSkip || persistFailed || submitting;
  const actionLabel = persistFailed
    ? "重试"
    : activeCanSkip
      ? "跳过"
      : submitting
        ? "提交中…"
        : "完成";
  const showActiveError =
    !isResolved &&
    state.validationAttempted &&
    !isQuestionAnswered(activeQ, activeQs);

  const goToTab = (index: number) => {
    if (state.phase === "active") {
      dispatchAction({ type: "SWITCH_TAB", index });
    } else {
      setReviewIndex(index);
    }
  };

  const goPrev = () => {
    if (state.phase === "active") dispatchAction({ type: "PREV_TAB" });
    else setReviewIndex((value) => Math.max(0, value - 1));
  };

  const goNext = () => {
    if (state.phase === "active") dispatchAction({ type: "NEXT_TAB" });
    else setReviewIndex((value) => Math.min(questions.length - 1, value + 1));
  };

  const handleExplicitSubmit = useCallback(() => {
    if (isResolved || state.phase !== "active") return;
    const command = submitCommandRef.current!;
    if (command.isSubmitting()) return;
    const next = askChoiceReducer(state, { type: "SUBMIT" });
    if (next.phase !== "submitted") {
      setReviewIndex(state.activeIndex);
      dispatchAction({ type: "SUBMIT" });
      return;
    }
    setPersistFailed(false);
    setSubmitting(true);
    void command
      .submit({
        result: buildAskChoiceResult(next),
        questions,
        buildUserMessage: buildLegacyUserMessage,
      })
      .then((outcome) => {
        setSubmitting(false);
        if (outcome.status === "sent") {
          dispatchAction({ type: "SUBMIT" });
        } else if (outcome.status === "persist-failed") {
          setPersistFailed(true);
        }
      });
  }, [isResolved, state, questions, dispatchAction]);

  const handleAction = useCallback(() => {
    if (activeCanSkip && !persistFailed) {
      dispatchAction({ type: "SKIP_CURRENT" });
      return;
    }
    handleExplicitSubmit();
  }, [activeCanSkip, persistFailed, dispatchAction, handleExplicitSubmit]);

  const handledSignalRef = useRef<AskChoiceAnswerSignal | null>(null);
  useEffect(() => {
    const signal = state.answerSignal ?? null;
    if (!signal || signal === handledSignalRef.current) return;
    handledSignalRef.current = signal;
    if (signal.kind === "advance") {
      const nextQ = questions[signal.toIndex];
      if (!nextQ) return;
      if (nextQ.choices.length === 0 && nextQ.allowOther) {
        otherInputRef.current?.focus();
      } else {
        rowRefs.current[0]?.focus();
      }
      return;
    }
    handleExplicitSubmit();
  }, [state.answerSignal, questions, handleExplicitSubmit]);

  const handleListKeyDown = (event: React.KeyboardEvent) => {
    if (
      isResolved ||
      (event.key !== "ArrowDown" && event.key !== "ArrowUp")
    ) {
      return;
    }
    event.preventDefault();
    const delta = event.key === "ArrowDown" ? 1 : -1;
    const maxIndex = activeQ.allowOther
      ? activeQ.choices.length
      : activeQ.choices.length - 1;
    const next = Math.max(
      0,
      Math.min(maxIndex, activeQs.cursorIndex + delta),
    );
    dispatchAction({ type: "MOVE_CURSOR", delta });
    if (next >= activeQ.choices.length) otherInputRef.current?.focus();
    else rowRefs.current[next]?.focus();
  };

  return (
    <div {...stylex.props(styles.wrap, variant === "inline" && styles.wrapInline)}>
      {onDelete && (
        <button
          type="button"
          {...stylex.props(styles.deleteButton)}
          onClick={onDelete}
          title="删除"
          aria-label="删除"
        >
          <LuTrash2 size={14} aria-hidden="true" />
        </button>
      )}

      {questions.length > 1 && (
        <div {...stylex.props(styles.tabs)} role="tablist">
          {questions.map((question, index) => {
            const answered = isQuestionAnswered(
              question,
              state.questionStates[index],
            );
            const hasError =
              !answered && state.validationAttempted && !isResolved;
            return (
              <button
                key={question.id}
                type="button"
                role="tab"
                aria-selected={index === clampedActiveIndex}
                {...stylex.props(
                  styles.tab,
                  index === clampedActiveIndex && styles.tabActive,
                  answered && styles.tabAnswered,
                  hasError && styles.tabError,
                )}
                onClick={() => goToTab(index)}
              >
                {question.header || `Q${index + 1}`}
                {answered ? (
                  <LuCheck
                    size={11}
                    {...stylex.props(styles.tabFlag)}
                    aria-hidden="true"
                  />
                ) : hasError ? (
                  <span {...stylex.props(styles.tabFlag)}>!</span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      <div {...stylex.props(styles.questionRow)}>
        {activeQ.question}
        {activeQ.required && !isResolved && (
          <span {...stylex.props(styles.required)} aria-hidden="true">
            *
          </span>
        )}
        {questions.length > 1 && (
          <span {...stylex.props(styles.progress)}>
            {clampedActiveIndex + 1}/{questions.length}
          </span>
        )}
      </div>

      {activeQ.multiSelect && (
        <div {...stylex.props(styles.hint)}>可多选，选完后点“完成”</div>
      )}
      {state.phase === "cancelled" && (
        <div {...stylex.props(styles.hint)}>已取消</div>
      )}

      {showActiveError && (
        <div {...stylex.props(styles.error)} role="alert">
          此题为必答，请先作答再提交
        </div>
      )}

      <div
        {...stylex.props(styles.list)}
        role={activeQ.multiSelect ? "group" : "radiogroup"}
        aria-label={activeQ.question}
        onKeyDown={handleListKeyDown}
      >
        {activeQ.choices.map((choice, index) => {
          const isSelected = activeQ.multiSelect
            ? activeQs.selectedIds.includes(choice.id)
            : activeQs.pickedId === choice.id;
          return (
            <button
              key={choice.id}
              type="button"
              ref={(element) => {
                rowRefs.current[index] = element;
              }}
              {...stylex.props(styles.row, isSelected && styles.rowSelected)}
              onClick={() =>
                dispatchAction({
                  type: "SELECT_CHOICE",
                  choiceId: choice.id,
                })
              }
              disabled={isResolved || submitting}
              role={activeQ.multiSelect ? "checkbox" : "radio"}
              aria-checked={isSelected}
            >
              <span {...stylex.props(styles.rowLeft)}>
                {activeQ.multiSelect ? (
                  isSelected ? (
                    <LuCheck size={16} {...stylex.props(styles.check)} />
                  ) : (
                    <LuSquare size={16} {...stylex.props(styles.uncheck)} />
                  )
                ) : (
                  <span
                    {...stylex.props(
                      styles.radio,
                      isSelected && styles.radioChecked,
                    )}
                  >
                    {isSelected && (
                      <span {...stylex.props(styles.radioInner)} />
                    )}
                  </span>
                )}
                <span {...stylex.props(styles.rowText)}>
                  <span {...stylex.props(styles.rowLabel)}>{choice.label}</span>
                  {choice.detail && (
                    <span {...stylex.props(styles.rowDetail)}>
                      {choice.detail}
                    </span>
                  )}
                </span>
              </span>
              {!activeQ.multiSelect && (
                <LuArrowRight
                  size={14}
                  {...stylex.props(styles.arrow)}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}

        {activeQ.allowOther && (
          <div {...stylex.props(styles.other)}>
            <label {...stylex.props(styles.otherLabel)}>其他：</label>
            <input
              type="text"
              ref={otherInputRef}
              {...stylex.props(styles.otherInput)}
              value={activeQs.otherText}
              onChange={(event) =>
                dispatchAction({
                  type: "SET_OTHER_TEXT",
                  text: event.target.value,
                })
              }
              onFocus={() => dispatchAction({ type: "FOCUS_OTHER" })}
              onBlur={() => dispatchAction({ type: "BLUR_OTHER" })}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                const native = event.nativeEvent as KeyboardEvent & {
                  isComposing?: boolean;
                };
                if (native.isComposing || event.keyCode === 229) return;
                event.preventDefault();
                const commits =
                  !activeQ.multiSelect && activeQs.otherText.trim();
                event.currentTarget.blur();
                if (commits) dispatchAction({ type: "COMMIT_OTHER" });
              }}
              placeholder="输入自定义回答…"
              disabled={isResolved || submitting}
            />
          </div>
        )}
      </div>

      {questions.length > 1 && (
        <div {...stylex.props(styles.nav)}>
          <button
            type="button"
            {...stylex.props(styles.navButton)}
            onClick={goPrev}
            disabled={clampedActiveIndex === 0}
          >
            上一题
          </button>
          <button
            type="button"
            {...stylex.props(styles.navButton)}
            onClick={goNext}
            disabled={clampedActiveIndex === questions.length - 1}
          >
            下一题
          </button>
        </div>
      )}

      {persistFailed && !isResolved && (
        <div {...stylex.props(styles.error)} role="alert">
          保存失败，请重试
        </div>
      )}

      {!isResolved && showAction && (
        <button
          type="button"
          {...stylex.props(
            styles.submit,
            formCanSubmit && styles.submitEnabled,
          )}
          onClick={handleAction}
          disabled={submitting}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default React.memo(AskChoicePanelWeb);
