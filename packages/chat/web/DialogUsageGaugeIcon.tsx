import React, { useId } from "react";
import { asOptionalPositiveFiniteNumber } from "core/optionalPositiveNumber";

type DialogUsageGaugeIconProps = {
  /** 0–100 context fill along the ring */
  fillPercent?: number;
  size?: number;
};

const RING_RADIUS = 9;
const CENTER = 12;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * Compact ring gauge: neutral track + filled arc (readable at 1%+ without a numeric badge).
 */
export const DialogUsageGaugeIcon: React.FC<DialogUsageGaugeIconProps> = ({
  fillPercent,
  size = 22,
}) => {
  const gradientId = useId().replace(/:/g, "");
  const positiveFill = asOptionalPositiveFiniteNumber(fillPercent);
  const clamped =
    positiveFill !== undefined ? Math.min(100, Math.max(0, positiveFill)) : 0;
  const dash = (clamped / 100) * CIRCUMFERENCE;
  const gap = CIRCUMFERENCE - dash;

  return (
    <svg
      className="dialog-usage-gauge-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.55" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      <circle
        className="dialog-usage-gauge-icon__track"
        cx={CENTER}
        cy={CENTER}
        r={RING_RADIUS}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeOpacity="0.22"
      />
      {positiveFill !== undefined && (
        <circle
          className="dialog-usage-gauge-icon__fill"
          cx={CENTER}
          cy={CENTER}
          r={RING_RADIUS}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
          transform={`rotate(-90 ${CENTER} ${CENTER})`}
        />
      )}
    </svg>
  );
};