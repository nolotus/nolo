// 路径: render/web/form/RadioGroup.tsx
import "../form.css";
import React from "react";

interface RadioGroupProps {
  options: { value: string; label: string; disabled?: boolean }[];
  value?: string;
  onChange?: (value: string) => void;
  name?: string;
  label?: string;
  disabled?: boolean;
  direction?: "row" | "column";
  className?: string;
}

const RadioGroup: React.FC<RadioGroupProps> = ({
  options,
  value,
  onChange,
  name = "rg",
  label,
  disabled,
  direction = "column",
  className = "",
}) => {
  return (
    <div
      className={`radio-group ${className}`}
      data-direction={direction}
      role="radiogroup"
    >
      {label && <span className="group-label">{label}</span>}

      <div className="group-options">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={`radio-label ${opt.disabled || disabled ? "disabled" : ""} ${value === opt.value ? "selected" : ""}`}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              disabled={opt.disabled || disabled}
              checked={value === opt.value}
              onChange={() => !disabled && !opt.disabled && onChange?.(opt.value)}
            />
            <div className="radio-surface">
              <div className="radio-dot-container">
                <span className="radio-dot" />
              </div>
              <span className="radio-text">{opt.label}</span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
};

export default RadioGroup;