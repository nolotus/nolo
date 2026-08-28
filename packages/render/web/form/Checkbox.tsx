// web/form/Checkbox.tsx
import "../form.css";
import type React from "react";
import { useEffect, useRef, type ChangeEvent } from "react";
import {
  CheckboxButton,
  CheckboxField,
  FieldError,
  Text,
} from "react-aria-components";

interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "children">
{
  label?: string;
  helperText?: string;
  error?: boolean;
  variant?: "default" | "filled";
  indeterminate?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;

  // React 19: ref 作为普通 prop 传入，继续指向原生 input
  ref?: React.Ref<HTMLInputElement>;
}

function useForwardedInputRef(forwardedRef?: React.Ref<HTMLInputElement>) {
  const innerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!forwardedRef) return;
    if (typeof forwardedRef === "function") {
      forwardedRef(innerRef.current);
    } else {
      forwardedRef.current = innerRef.current;
    }
  }, [forwardedRef]);

  return innerRef;
}

export const Checkbox = ({
  label,
  helperText,
  error = false,
  variant = "default",
  className = "",
  style,
  disabled,
  checked,
  defaultChecked,
  ref,
  indeterminate,
  onChange,
  value,
  name,
  form,
  autoFocus,
  required,
  readOnly,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  "aria-controls": ariaControls,
  "aria-errormessage": ariaErrorMessage,
  onFocus,
  onBlur,
  onKeyDown,
  onKeyUp,
  slot,
}: CheckboxProps) => {

  return (
    <CheckboxField
      slot={slot}
      inputRef={useForwardedInputRef(ref)}
      className={`checkbox-container ${className}`}
      style={style}
      isInvalid={error}
      isDisabled={disabled}
      isReadOnly={readOnly}
      isRequired={required}
      isSelected={checked}
      defaultSelected={defaultChecked}
      isIndeterminate={indeterminate}
      onChange={(isSelected: boolean) => {
        onChange?.({
          target: { checked: isSelected } as HTMLInputElement,
          currentTarget: { checked: isSelected } as HTMLInputElement,
        } as ChangeEvent<HTMLInputElement>);
      }}
      value={value as string | undefined}
      name={name}
      form={form}
      autoFocus={autoFocus}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      aria-controls={ariaControls}
      aria-errormessage={ariaErrorMessage}
      onFocus={onFocus as ((e: React.FocusEvent<Element>) => void) | undefined}
      onBlur={onBlur as ((e: React.FocusEvent<Element>) => void) | undefined}
      onKeyDown={onKeyDown as ((e: React.KeyboardEvent<Element>) => void) | undefined}
      onKeyUp={onKeyUp as ((e: React.KeyboardEvent<Element>) => void) | undefined}
    >
      <CheckboxButton
        className={({ isDisabled, isInvalid }) =>
          [
            "checkbox-wrapper",
            `variant-${variant}`,
            isDisabled ? "disabled" : "",
            isInvalid ? "error" : "",
          ]
            .filter(Boolean)
            .join(" ")
        }
      >
        {({ isIndeterminate }) => (
          <>
            <span className="checkbox-box">
              <svg
                className="checkbox-checkmark"
                viewBox="0 0 18 18"
                aria-hidden="true"
              >
                {isIndeterminate ? (
                  <rect x="1" y="7.5" width="16" height="3" />
                ) : (
                  <polyline points="2 9 7 14 16 4" />
                )}
              </svg>
            </span>
            {label && <span className="checkbox-label">{label}</span>}
          </>
        )}
      </CheckboxButton>
      {helperText && (
        error ? (
          <FieldError elementType="div" className="checkbox-helper error">
            {helperText}
          </FieldError>
        ) : (
          <Text elementType="div" slot="description" className="checkbox-helper normal">
            {helperText}
          </Text>
        )
      )}
    </CheckboxField>
  );
};

Checkbox.displayName = "Checkbox";

export default Checkbox;
