import * as stylex from "@stylexjs/stylex";
import { messageInputStyles } from "./messageInputStyles";
import "./chatStylexEscapeHatch.css";
import React, { memo, useCallback } from "react";
import { LuSquare } from "react-icons/lu";
import { useAppDispatch } from "app/store";
import {
  abortAllMessages,
  useActiveControllers,
} from "chat/dialog/dialogSlice";

const StopGenerationButtonComponent: React.FC = () => {
  const dispatch = useAppDispatch();
  const activeControllers = useActiveControllers();
  const isGenerating = Object.keys(activeControllers).length > 0;

  const handleStop = useCallback(() => {
    dispatch(abortAllMessages());
  }, [dispatch]);

  if (!isGenerating) return null;

  return (
    <button
      onClick={handleStop}
      type="button"
      {...stylex.props(messageInputStyles.stopGenerationBtn)}
    >
      <LuSquare
        size={10}
        aria-hidden="true"
        {...stylex.props(messageInputStyles.stopGenerationBtnIcon)}
      />
      <span {...stylex.props(messageInputStyles.stopGenerationBtnLabel)}>
        停止生成
      </span>
    </button>
  );
};

export const StopGenerationButton = memo(StopGenerationButtonComponent);
