import {
  SwitchField,
  SwitchButton,
  type SwitchFieldProps,
  type ValidationResult,
} from "react-aria-components/Switch";
import "./Switch.css";
import { Description, FieldError } from "./Form";
import LoadingSpinner from "./LoadingSpinner";
import type { ReactNode, Ref } from "react";

export interface SwitchProps extends Omit<SwitchFieldProps, "children"> {
  children?: ReactNode;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  // Backward compatibility with the old ToggleSwitch
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  helperText?: string;
  loading?: boolean;
  error?: boolean;
  ref?: Ref<HTMLInputElement>;
}

export function Switch({
  children,
  description,
  errorMessage,
  label,
  helperText,
  loading = false,
  error = false,
  checked,
  defaultChecked,
  onChange,
  disabled,
  isSelected,
  defaultSelected,
  isDisabled,
  isInvalid,
  inputRef,
  ref,
  ...props
}: SwitchProps) {
  const content = children ?? label;
  const desc = description ?? helperText;

  return (
    <SwitchField
      {...props}
      isSelected={checked ?? isSelected}
      defaultSelected={defaultChecked ?? defaultSelected}
      onChange={onChange}
      isDisabled={disabled ?? isDisabled ?? loading}
      isInvalid={error || isInvalid}
      inputRef={(inputRef ?? ref) as never}
    >
      <SwitchButton data-loading={loading || undefined}>
        {() => (
          <>
            <div className="track">
              {loading && (
                <span className="switch-loading">
                  <LoadingSpinner size={12} />
                </span>
              )}
              <div className="handle" />
            </div>
            {content}
          </>
        )}
      </SwitchButton>
      {desc && <Description>{desc}</Description>}
      <FieldError>{errorMessage}</FieldError>
    </SwitchField>
  );
}
