import * as stylex from "@stylexjs/stylex";
import {
  Meter as AriaMeter,
  type MeterProps as AriaMeterProps,
} from "react-aria-components/Meter";

import { meterStyles } from "./meter.styles";

export interface MeterProps extends AriaMeterProps {
  label?: string;
  /** Hide the visible label row (still pass aria-label / label for a11y). */
  hideLabel?: boolean;
}

export function Meter({
  label,
  hideLabel,
  className,
  ...props
}: MeterProps) {
  const meterClassName = [
    stylex.props(
      meterStyles.meter,
      hideLabel && meterStyles.hideLabel,
    ).className,
    typeof className === "string" ? className : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <AriaMeter
      {...props}
      className={meterClassName}
      data-hide-label={hideLabel || undefined}
    >
      {({ percentage, valueText }) => (
        <>
          {label && !hideLabel ? (
            <span {...stylex.props(meterStyles.label)}>{label}</span>
          ) : null}
          {!hideLabel ? (
            <span {...stylex.props(meterStyles.value)}>{valueText}</span>
          ) : null}
          <div
            {...stylex.props(
              meterStyles.track,
              hideLabel && meterStyles.trackInFlow,
            )}
          >
            <div
              {...stylex.props(meterStyles.fill)}
              style={{
                width: `${percentage}%`,
                // Keep a readable sliver for tiny non-zero values.
                minWidth: percentage > 0 ? 4 : undefined,
                ["--meter-fill-color" as string]:
                  percentage < 70
                    ? "var(--success, var(--primary))"
                    : percentage < 90
                      ? "var(--warning, #d99a00)"
                      : "var(--error, var(--danger, #e11d48))",
              }}
            />
          </div>
        </>
      )}
    </AriaMeter>
  );
}
