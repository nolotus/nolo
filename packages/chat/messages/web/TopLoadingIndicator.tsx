import * as stylex from "@stylexjs/stylex";
import React from "react";
import { messagesStyles as styles } from "./messagesStyles";

// --- Top Loading Indicator Component ---
const TopLoadingIndicator: React.FC = () => {
  return (
    <div
      className="chat-messages__loading-indicator-container"
      {...stylex.props(styles.loadingIndicatorContainer)}
    >
      <div
        className="chat-messages__loading-indicator-spinner"
        {...stylex.props(styles.loadingIndicatorSpinner)}
      />
    </div>
  );
};

export default TopLoadingIndicator;
