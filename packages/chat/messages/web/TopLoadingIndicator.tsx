import * as stylex from "@stylexjs/stylex";
import React from "react";
import { messagesStyles as styles } from "./messagesStyles";

// --- Top Loading Indicator Component ---
const TopLoadingIndicator: React.FC = () => {
  return (
    <div
      {...stylex.props(styles.loadingIndicatorContainer)}
    >
      <div
        {...stylex.props(styles.loadingIndicatorSpinner)}
      />
    </div>
  );
};

export default TopLoadingIndicator;
