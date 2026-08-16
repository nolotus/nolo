import React, { memo } from "react";
import { LuChevronUp } from "react-icons/lu";

interface ScrollToTopButtonProps {
  isVisible: boolean;
  onClick: () => void;
}

const ScrollToTopButtonComponent: React.FC<ScrollToTopButtonProps> = ({
  isVisible,
  onClick,
}) => {
  if (!isVisible) {
    return null;
  }

  return (
    <button
      type="button"
      className="scroll-to-top-button"
      onClick={onClick}
      aria-label="滚动到顶部"
    >
      <LuChevronUp size={18} aria-hidden="true" />
    </button>
  );
};

export const ScrollToTopButton = memo(ScrollToTopButtonComponent);
