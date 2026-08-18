import "./message-input.css";
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
    <>

      <button
        type="button"
        className="scroll-to-bottom-button"
        onClick={onClick}
        aria-label="滚动到底部"
      >
        <LuChevronDown size={18} aria-hidden="true" />
      </button>
    </>
  );
};

export const ScrollToBottomButton = memo(ScrollToBottomButtonComponent);
