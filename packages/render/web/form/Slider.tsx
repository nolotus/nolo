// 路径: render/web/form/Slider.tsx
import "../form.css";
import type React from "react";
import { useCallback, useState, useEffect } from "react";

export interface SliderProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "type" | "value" | "onChange" | "size"
  > {
  value: number;
  onChange: (value: number) => void;

  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  label?: string;
  showValue?: boolean;
  size?: "small" | "medium" | "large";
  className?: string;
  helperText?: string;
  error?: boolean;

  // React 19: ref 作为普通 prop
  ref?: React.Ref<HTMLInputElement>;
}

export const Slider = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  label,
  showValue = false,
  size = "medium",
  className = "",
  helperText,
  error = false,
  ref,
  id,
  ...inputProps
}: SliderProps) => {
  // local value + drag flag share one update (input/change handlers)
  const [dragState, setDragState] = useState({ value, dragging: false });
  const localValue = dragState.value;
  const isDragging = dragState.dragging;
  const [isHovered, setIsHovered] = useState(false);

  const inputId = id || `slider-${Math.random().toString(36).substr(2, 9)}`;
  const helperTextId = helperText ? `${inputId}-helper` : undefined;

  const progress = ((localValue - min) / (max - min)) * 100;

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setDragState({ value: val, dragging: true });
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      setDragState({ value: val, dragging: false });
      onChange(val);
    },
    [onChange]
  );

  useEffect(() => {
    if (!isDragging) {
      setDragState((current) =>
        current.value === value ? current : { ...current, value }
      );
    }
  }, [value, isDragging]);

  const displayValue =
    step < 1 ? localValue.toFixed(1) : Math.round(localValue).toString();

  return (
    <>
      <div
        className={[
          "slider-container",
          `size-${size}`,
          disabled ? "disabled" : "",
          error ? "error" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {(label || showValue) && (
          <div className="slider-header">
            {label && <span className="slider-label">{label}</span>}
            {showValue && <span className="slider-value">{displayValue}</span>}
          </div>
        )}

        <div
          className="slider-track-container"
          onMouseEnter={() => !disabled && setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className={`slider-track-bg ${isHovered ? "hovered" : ""}`} />
          <div
            className={[
              "slider-track-fill",
              isDragging ? "dragging" : "",
              isHovered ? "hovered" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ width: `${progress}%` }}
          />
          <input
            ref={ref}
            id={inputId}
            type="range"
            value={localValue}
            onInput={handleInput}
            onChange={handleChange}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            className={[
              "slider-input",
              isDragging ? "dragging" : "",
              isHovered ? "hovered" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-label={label}
            aria-describedby={helperTextId}
            {...inputProps}
          />
        </div>

        {helperText && (
          <div id={helperTextId} className="slider-helper">
            {helperText}
          </div>
        )}
      </div>
    </>
  );
};


Slider.displayName = "Slider";