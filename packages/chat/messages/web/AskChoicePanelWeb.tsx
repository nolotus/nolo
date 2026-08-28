/**
 * Web (HTML/CSS) renderer for the isomorphic `ask_user` state machine.
 *
 * Mirrors the RN AskChoicePanel but uses plain DOM elements + CSS classes
 * from messages.css. Shares the same reducer from `ai/tools/askChoiceState`.
 */

import React, { useReducer, useCallback, useEffect, useRef } from "react";
import { LuCheck, LuSquare, LuArrowRight, LuTrash2 } from "react-icons/lu";
import { useAppDispatch } from "app/store";
import { handleSendMessage } from "chat/dialog/dialogSlice";
import { deleteMessage } from "../messageSlice";
import {
  askChoiceReducer,
  buildAskChoiceResult,
  canSubmit,
  createInitialAskChoiceState,
  normalizeAskChoiceArgs,
} from "ai/tools/askChoiceState";

interface AskChoicePanelWebProps {
  rawData: any;
  toolPayload?: any;
  dbKey?: string;
  interactive?: boolean;
  onDelete?: () => void;
}

const AskChoicePanelWeb: React.FC<AskChoicePanelWebProps> = ({
  rawData,
  toolPayload,
  dbKey,
  interactive = true,
  onDelete,
}) => {
  const dispatch = useAppDispatch();

  // Merge rawData + toolPayload.input for robustness
  const merged = {
    ...rawData,
    ...(rawData?.questions ? {} : toolPayload?.input?.questions ? { questions: toolPayload.input.questions } : {}),
  };
  const normalized = normalizeAskChoiceArgs(merged);
  const questions = normalized.questions;

  const [state, dispatchAction] = useReducer(
    askChoiceReducer,
    questions,
    createInitialAskChoiceState,
  );

  const handleSubmit = useCallback(() => {
    if (!canSubmit(state)) return;
    const submitted = askChoiceReducer(state, { type: "SUBMIT" });
    const result = buildAskChoiceResult(submitted);
    if (result.kind === "cancelled") return;

    const userMessage = result.answers
      .map((a) => a.userMessage)
      .filter(Boolean)
      .join("\n\n");

    if (userMessage) {
      dispatch(handleSendMessage({ userInput: userMessage } as any));
    }
  }, [state, dispatch]);

  // Auto-send when reducer auto-submits (single-question single-select click)
  const sentRef = useRef(false);
  useEffect(() => {
    if (state.phase === "submitted" && !sentRef.current) {
      sentRef.current = true;
      const result = buildAskChoiceResult(state);
      if (result.kind === "cancelled") return;
      const userMessage = result.answers
        .map((a) => a.userMessage)
        .filter(Boolean)
        .join("\n\n");
      if (userMessage) {
        dispatch(handleSendMessage({ userInput: userMessage } as any));
      }
    }
  }, [state.phase, state, dispatch]);

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

  if (questions.length === 0) return null;

  // Guard against state/questions length mismatch. useReducer's lazy init only
  // runs on mount, so if rawData arrives incrementally (e.g. streaming), the
  // initial questionStates array may be shorter than the final questions array.
  // Without this guard, switching to a later tab reads questionStates[i] = undefined
  // and crashes on `.pickedId` (caught by MessageRowErrorBoundary → "加载失败").
  const clampedActiveIndex = Math.min(state.activeIndex, questions.length - 1);
  const activeQ = questions[clampedActiveIndex];
  const activeQs = state.questionStates[clampedActiveIndex];
  const isResolved = !interactive || state.phase !== "active";

  if (!activeQ || !activeQs) return null;

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

      {/* Tab bar */}
      {questions.length > 1 && (
        <div className="ui-choice-tabs">
          {questions.map((q, i) => (
            <button
              key={q.id}
              type="button"
              className={`ui-choice-tab ${i === clampedActiveIndex ? "active" : ""}`}
              onClick={() => dispatchAction({ type: "SWITCH_TAB", index: i })}
              disabled={isResolved}
            >
              {q.header || `Q${i + 1}`}
            </button>
          ))}
        </div>
      )}

      {/* Question */}
      <div className="ui-choice-question">{activeQ.question}</div>

      {activeQ.multiSelect && (
        <div className="ui-choice-hint">可多选，选完后点提交</div>
      )}

      {/* Choices */}
      <div className="ui-choice-list">
        {activeQ.choices.map((choice, i) => {
          const isSelected = activeQ.multiSelect
            ? activeQs.selectedIds.includes(choice.id)
            : activeQs.pickedId === choice.id;

          return (
            <button
              key={choice.id}
              type="button"
              className={`ui-choice-row ${isSelected ? "selected" : ""}`}
              onClick={() => {
                if (isResolved) return;
                const delta = i - activeQs.cursorIndex;
                if (delta !== 0) {
                  dispatchAction({ type: "MOVE_CURSOR", delta });
                }
                if (activeQ.multiSelect) {
                  dispatchAction({ type: "TOGGLE_AT_CURSOR" });
                } else {
                  dispatchAction({ type: "SELECT_AT_CURSOR" });
                }
              }}
              disabled={isResolved}
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
              className="ui-choice-other-input"
              value={activeQs.otherText}
              onChange={(e) =>
                dispatchAction({ type: "SET_OTHER_TEXT", text: e.target.value })
              }
              onFocus={() => dispatchAction({ type: "FOCUS_OTHER" })}
              onBlur={() => dispatchAction({ type: "BLUR_OTHER" })}
              placeholder="输入自定义回答…"
              disabled={isResolved}
            />
          </div>
        )}
      </div>

      {/* Submit button */}
      {(questions.length > 1 || activeQ.multiSelect) && !isResolved && (
        <button
          type="button"
          className={`ui-choice-submit ${canSubmit(state) ? "enabled" : ""}`}
          onClick={handleSubmit}
          disabled={!canSubmit(state)}
        >
          提交
        </button>
      )}
    </div>
  );
};

export default React.memo(AskChoicePanelWeb);
