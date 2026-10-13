import * as stylex from "@stylexjs/stylex";
import { messageInputStyles } from "./messageInputStyles";
import "./chatStylexEscapeHatch.css";
import React, { memo } from "react";
import { LuSquare } from "react-icons/lu";
import { useActiveControllers } from "chat/dialog/dialogSlice";
import { useStopCurrentForegroundTurn } from "./useStopCurrentForegroundTurn";

const StopGenerationButtonComponent: React.FC = () => {
  const activeControllers = useActiveControllers();
  const isGenerating = Object.keys(activeControllers).length > 0;
  const stopCurrentForegroundTurn = useStopCurrentForegroundTurn();

  if (!isGenerating) return null;

  return (
    <button
      onClick={stopCurrentForegroundTurn}
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
