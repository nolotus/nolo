import * as stylex from "@stylexjs/stylex";
import { messageInputStyles } from "./messageInputStyles";
import { withLiteralClass } from "./withLiteralClass";
import "./chatStylexEscapeHatch.css";
import React, { memo } from "react";
import { LuChevronDown } from "react-icons/lu";

interface ScrollToBottomButtonProps {
  isVisible: boolean;
  onClick: () => void;
}

const ScrollToBottomButtonComponent: React.FC<ScrollToBottomButtonProps> = ({
  isVisible,
  onClick,
}) => {
  if (!isVisible) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="滚动到底部"
      {...withLiteralClass("scroll-to-bottom-button", messageInputStyles.scrollToBottomButton)}
    >
      <LuChevronDown size={18} aria-hidden="true" />
    </button>
  );
};

export const ScrollToBottomButton = memo(ScrollToBottomButtonComponent);
