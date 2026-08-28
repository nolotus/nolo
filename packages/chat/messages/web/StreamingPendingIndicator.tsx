import React, { memo } from "react";

/**
 * Soft three-dot pulse for agent "working" states.
 * Theme-aware via --primary; respects prefers-reduced-motion in CSS.
 */
export const StreamingPendingIndicator = memo(function StreamingPendingIndicator({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={`streaming-pending-indicator streaming-pending-indicator--${size}${
        className ? ` ${className}` : ""
      }`}
      aria-hidden="true"
    >
      <span className="streaming-pending-indicator__dot" />
      <span className="streaming-pending-indicator__dot" />
      <span className="streaming-pending-indicator__dot" />
    </span>
  );
});

export default StreamingPendingIndicator;
