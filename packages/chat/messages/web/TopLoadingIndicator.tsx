import "./messages.css";
import React from "react";
import { useTheme } from "app/theme";

// --- Keyframes for Spinner Animation ---
const spinKeyframes = `
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
`;

// --- Top Loading Indicator Component ---
const TopLoadingIndicator: React.FC = () => {
  const theme = useTheme();
  return (
    <>
      <style>{spinKeyframes}</style>
      <div className="chat-messages__loading-indicator-container">
        <div className="chat-messages__loading-indicator-spinner" />
      </div>
    </>
  );
};

export default TopLoadingIndicator;
