/**
 * Web (HTML/CSS) renderer for the isomorphic `ask_user` state machine.
 *
 * Mirrors the RN AskChoicePanel but uses plain DOM elements + the literal
 * `.ui-choice-*` classes restored in messagesStylexEscapeHatch.css. Shares the
 * same reducer from `ai/tools/askChoiceState`.
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

interface AskChoicePanelWebProps {
  rawData: any;
  toolPayload?: any;
  dbKey?: string;
  interactive?: boolean;
  onDelete?: () => void;
  /** tool-message id，宿主持久化用；面板自身不落库。 */
  messageId?: string;
  /**
   * Persist the submitted answers before the panel sends the next user turn
   * (host: await write(dbKey).unwrap() + updateToolMessage). The panel awaits
   * the returned Promise: persist 失败时绝不发送，面板保持 active 可重试。
   * Absent (legacy hosts) → send only.
   */
  onResolve?: (resolution: AskChoiceResolution) => void | Promise<void>;
}

const AskChoicePanelWeb: React.FC<AskChoicePanelWebProps> = ({
  rawData,
  toolPayload,
  dbKey,
  interactive = true,
  onDelete,
  messageId,
  onResolve,
}) => {
  const dispatch = useAppDispatch();
  // 面板保持 store 无关：dbKey/messageId 由宿主 onResolve 闭包使用。
  void dbKey;
  void messageId;

  // Merge rawData + toolPayload.input for robustness
  const merged = {
    ...rawData,
    ...(rawData?.questions ? {} : toolPayload?.input?.questions ? { questions: toolPayload.input.questions } : {}),
  };
  const normalized = normalizeAskChoiceArgs(merged);
  const questions = normalized.questions;

  // Restore persisted answers: a resolved form comes back read-only and
  // navigable instead of resetting to an empty active form after reload.
  const savedAnswers = useMemo(() => {
    if (rawData?.cancelled) return { phase: "cancelled" as const };
    // 统一 resolved 谓词：`answers: []` 等旧 payload 不再误判为已解决。
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

  // Reconcile questionStates when questions array grows after mount.
  // useReducer's lazy init (createInitialAskChoiceState) only runs once; if
  // rawData streams in and questions grow from N→M, the initial questionStates
  // stays length N. Dispatch HYDRATE_QUESTIONS to append empty states for the
  // new questions so tab switches don't read undefined.
  useEffect(() => {
    if (questions.length !== state.questionStates.length) {
      dispatchAction({ type: "HYDRATE_QUESTIONS", questions });
    }
  }, [questions, state.questionStates.length, dispatchAction]);

  // Read-only gate：宿主声明非交互（streaming 快照）或 reducer 已 submitted/cancelled。
  // 先于 hooks 计算供依赖数组使用；restored "submitted" 面板绝不重发。
  const isResolved = !interactive || state.phase !== "active";

  // 校验后焦点：无效提交把焦点移到当前题（reducer 已跳到第一个未答题）的
  // 第一个可交互控件，键盘用户无需重新 Tab 查找。
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

  // Guard against state/questions length mismatch while streaming (see above).
  const clampedReview = Math.min(reviewIndex, questions.length - 1);
  const clampedActiveIndex = Math.min(
    isResolved ? clampedReview : state.activeIndex,
    questions.length - 1,
  );
  const activeQ: AskChoiceQuestion | undefined = questions[clampedActiveIndex];
  const activeQs: QuestionUiState | undefined = state.questionStates[clampedActiveIndex];

  if (!activeQ || !activeQs) return null;

  const formCanSubmit = canSubmit(state);
  // 是否阻止自动完成：仍仅由 multi-select 决定（多选无法推断“选完”）。
  const needsExplicitSubmit = formRequiresExplicitSubmit(questions);
  // 是否显示显式动作（完成/跳过）：多选题表单，或当前是可跳过（optional 且未答）的题。
  const activeCanSkip =
    state.phase === "active" &&
    !activeQ.required &&
    !questionHasAnswer(activeQ, activeQs);
  const showAction = needsExplicitSubmit || activeCanSkip || persistFailed || submitting;
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
    else setReviewIndex((v) => Math.max(0, v - 1));
  };

  const goNext = () => {
    if (state.phase === "active") dispatchAction({ type: "NEXT_TAB" });
    else setReviewIndex((v) => Math.min(questions.length - 1, v + 1));
  };

  // 唯一的显式提交入口：
  // - 无效表单 → 仅校验反馈（reducer 保持 active，跳第一个未答必答题）；
  // - 有效表单 → async submit command：await 持久化成功后才发送，
  //   然后冻结为只读 submitted；持久化失败 → 不发送、展示错误、可重试；
  // - in-flight 期间重复点击被 command 去重（双击只算一次）。
  const handleExplicitSubmit = useCallback(() => {
    if (isResolved || state.phase !== "active") return;
    const command = submitCommandRef.current!;
    if (command.isSubmitting()) return;
    // 预演 SUBMIT：无效时 reducer 保持 active（只置校验态/跳题），不进入 submitted。
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
          // 持久化成功且已发送：现在才冻结为只读 submitted。
          dispatchAction({ type: "SUBMIT" });
        } else if (outcome.status === "persist-failed") {
          // 保持 active，面板可交互，展示「保存失败，请重试」。
          setPersistFailed(true);
        }
      });
  }, [isResolved, state, questions, dispatchAction]);

  // 动作按钮：当前可跳过的 optional 题 → SKIP_CURRENT（reducer 只输出信号，
  // effect 负责前进/发送）；其余（多选表单的「完成」/ 失败重试）→ 事务式提交。
  const handleAction = useCallback(() => {
    if (activeCanSkip && !persistFailed) {
      dispatchAction({ type: "SKIP_CURRENT" });
      return;
    }
    handleExplicitSubmit();
  }, [activeCanSkip, persistFailed, dispatchAction, handleExplicitSubmit]);

  // 单选「一步完成」信号消费：reducer 只输出信号，副作用在这里发生。
  // - advance：自动跳到下一未答题后，把焦点移到该题的第一个控件；
  // - complete：整表已答完 → 走与显式提交相同的事务式 command（persist → send）。
  // 用对象身份去重：同一信号只处理一次（重渲染不会重发）。
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

  // Arrow keys move the cursor across choice rows (and the Other row), giving
  // the panel practical keyboard behavior on top of native tab/enter focus.
  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (isResolved || (e.key !== "ArrowDown" && e.key !== "ArrowUp")) return;
    e.preventDefault();
    const delta = e.key === "ArrowDown" ? 1 : -1;
    const maxIndex = activeQ.allowOther ? activeQ.choices.length : activeQ.choices.length - 1;
    const next = Math.max(0, Math.min(maxIndex, activeQs.cursorIndex + delta));
    dispatchAction({ type: "MOVE_CURSOR", delta });
    if (next >= activeQ.choices.length) otherInputRef.current?.focus();
    else rowRefs.current[next]?.focus();
  };

  return (
    <div className="ui-choice-wrap ui-choice-panel">
      {onDelete && (
        <button
          type="button"
          className="ui-choice-delete"
          onClick={onDelete}
          title="删除"
          aria-label="删除"
        >
          <LuTrash2 size={14} aria-hidden="true" />
        </button>
      )}

      {/* Tab bar：当前 / 已完成 / 未完成（校验后标红）状态可见；resolved 仍可切题回看 */}
      {questions.length > 1 && (
        <div className="ui-choice-tabs" role="tablist">
          {questions.map((q, i) => {
            const answered = isQuestionAnswered(q, state.questionStates[i]);
            const hasError = !answered && state.validationAttempted && !isResolved;
            return (
              <button
                key={q.id}
                type="button"
                role="tab"
                aria-selected={i === clampedActiveIndex}
                className={`ui-choice-tab ${i === clampedActiveIndex ? "active" : ""} ${
                  answered ? "answered" : ""
                } ${hasError ? "has-error" : ""}`}
                onClick={() => goToTab(i)}
              >
                {q.header || `Q${i + 1}`}
                {answered ? (
                  <LuCheck size={11} className="ui-choice-tab-flag" aria-hidden="true" />
                ) : hasError ? (
                  <span className="ui-choice-tab-flag ui-choice-tab-error-flag">!</span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      {/* Question */}
      <div className="ui-choice-question">
        {activeQ.question}
        {activeQ.required && !isResolved && (
          <span className="ui-choice-required" aria-hidden="true">
            *
          </span>
        )}
        {questions.length > 1 && (
          <span className="ui-choice-progress">
            {clampedActiveIndex + 1}/{questions.length}
          </span>
        )}
      </div>

      {activeQ.multiSelect && <div className="ui-choice-hint">可多选，选完后点“完成”</div>}
      {state.phase === "cancelled" && <div className="ui-choice-hint">已取消</div>}

      {showActiveError && (
        <div className="ui-choice-error" role="alert">
          此题为必答，请先作答再提交
        </div>
      )}

      {/* Choices */}
      <div
        className="ui-choice-list"
        role={activeQ.multiSelect ? "group" : "radiogroup"}
        aria-label={activeQ.question}
        onKeyDown={handleListKeyDown}
      >
        {activeQ.choices.map((choice, i) => {
          const isSelected = activeQ.multiSelect
            ? activeQs.selectedIds.includes(choice.id)
            : activeQs.pickedId === choice.id;
          return (
            <button
              key={choice.id}
              type="button"
              ref={(el) => {
                rowRefs.current[i] = el;
              }}
              className={`ui-choice-row ${isSelected ? "selected" : ""}`}
              onClick={() => dispatchAction({ type: "SELECT_CHOICE", choiceId: choice.id })}
              disabled={isResolved || submitting}
              role={activeQ.multiSelect ? "checkbox" : "radio"}
              aria-checked={isSelected}
            >
              <span className="ui-choice-row-left">
                {activeQ.multiSelect ? (
                  isSelected ? (
                    <LuCheck size={16} className="ui-choice-check" />
                  ) : (
                    <LuSquare size={16} className="ui-choice-uncheck" />
                  )
                ) : (
                  <span className={`ui-choice-radio ${isSelected ? "checked" : ""}`}>
                    {isSelected && <span className="ui-choice-radio-inner" />}
                  </span>
                )}
                <span className="ui-choice-row-text">
                  <span className="ui-choice-row-label">{choice.label}</span>
                  {choice.detail && (
                    <span className="ui-choice-row-detail">{choice.detail}</span>
                  )}
                </span>
              </span>
              {!activeQ.multiSelect && (
                <LuArrowRight size={14} className="ui-chip-icon" aria-hidden="true" />
              )}
            </button>
          );
        })}

        {/* Other row */}
        {activeQ.allowOther && (
          <div className="ui-choice-other">
            <label className="ui-choice-other-label">其他：</label>
            <input
              type="text"
              ref={otherInputRef}
              className="ui-choice-other-input"
              value={activeQs.otherText}
              onChange={(e) =>
                dispatchAction({ type: "SET_OTHER_TEXT", text: e.target.value })
              }
              onFocus={() => dispatchAction({ type: "FOCUS_OTHER" })}
              onBlur={() => dispatchAction({ type: "BLUR_OTHER" })}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                // IME 组合中的 Enter（确认候选词）只属于输入法合成：
                // 不失焦、不触发任何确认/提交语义（keyCode 229 为组合期兼容信号）。
                const native = e.nativeEvent as KeyboardEvent & { isComposing?: boolean };
                if (native.isComposing || e.keyCode === 229) return;
                // 非 IME 的 Enter：单选题与点选同一语义（确认并前进/发送）；
                // 多选题保持显式提交（Enter 只失焦保存）。
                e.preventDefault();
                const commits = !activeQ.multiSelect && activeQs.otherText.trim();
                e.currentTarget.blur();
                if (commits) dispatchAction({ type: "COMMIT_OTHER" });
              }}
              placeholder="输入自定义回答…"
              disabled={isResolved || submitting}
            />
          </div>
        )}
      </div>

      {/* Explicit navigation (never auto-submits) */}
      {questions.length > 1 && (
        <div className="ui-choice-nav">
          <button
            type="button"
            className="ui-choice-nav-btn"
            onClick={goPrev}
            disabled={clampedActiveIndex === 0}
          >
            上一题
          </button>
          <button
            type="button"
            className="ui-choice-nav-btn"
            onClick={goNext}
            disabled={clampedActiveIndex === questions.length - 1}
          >
            下一题
          </button>
        </div>
      )}

      {/* 持久化失败：不发送、面板保持可交互，可点击提交重试 */}
      {persistFailed && !isResolved && (
        <div className="ui-choice-error" role="alert">
          保存失败，请重试
        </div>
      )}

      {/* 动作按钮：多选/混合表单的「完成」，当前 optional 可跳过题的「跳过」，
          以及持久化失败的重试入口。纯必答单选表单靠选择一步发送，不渲染按钮。 */}
      {!isResolved && showAction && (
        <button
          type="button"
          className={`ui-choice-submit ${formCanSubmit ? "enabled" : ""}`}
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
