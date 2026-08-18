import {
  Meter as AriaMeter,
  type MeterProps as AriaMeterProps,
} from "react-aria-components/Meter";
import "./Meter.css";

const joinClass = (base: string, extra?: string): string =>
  extra ? `${base} ${extra}` : base;

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
  return (
    <AriaMeter
      {...props}
      className={joinClass(
        "react-aria-Meter nolo-meter",
        typeof className === "string" ? className : undefined
      )}
      data-hide-label={hideLabel || undefined}
    >
      {({ percentage, valueText }) => (
        <>
          {label && !hideLabel ? (
            <span className="nolo-meter-label">{label}</span>
          ) : null}
          {!hideLabel ? (
            <span className="nolo-meter-value">{valueText}</span>
          ) : null}
          <div className="nolo-meter-track">
            <div
              className="nolo-meter-fill"
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
