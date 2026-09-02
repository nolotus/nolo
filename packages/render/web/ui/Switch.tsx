import * as stylex from "@stylexjs/stylex";
import {
  SwitchField,
  SwitchButton,
  Text,
  type SwitchFieldProps,
  type ValidationResult,
} from "react-aria-components";
import { FieldError } from "./Form";
import LoadingSpinner from "./LoadingSpinner";
import type { ReactNode, Ref } from "react";

import { switchStyles } from "./switch.styles";

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
  const effectiveDisabled = disabled ?? isDisabled ?? loading;

  return (
    <SwitchField
      {...props}
      isSelected={checked ?? isSelected}
      defaultSelected={defaultChecked ?? defaultSelected}
      onChange={onChange}
      isDisabled={effectiveDisabled}
      isInvalid={error || isInvalid}
      inputRef={(inputRef ?? ref) as never}
      {...stylex.props(switchStyles.field)}
    >
      <SwitchButton
        data-loading={loading || undefined}
        {...stylex.props(
          switchStyles.button,
          loading && switchStyles.buttonLoading,
          effectiveDisabled && switchStyles.buttonDisabled,
        )}
      >
        {(renderProps) => {
          const {
            isSelected,
            isPressed,
            isFocusVisible,
            isDisabled,
            isInvalid,
          } = renderProps;

          return (
            <>
              {/* 级联顺序等价原 CSS 源顺序：invalid → selected → focus → disabled */}
              <div
                {...stylex.props(
                  switchStyles.track,
                  isInvalid && !isSelected && switchStyles.trackInvalid,
                  isSelected && switchStyles.trackSelected,
                  isDisabled && switchStyles.trackDisabled,
                  isFocusVisible && switchStyles.trackFocusRing,
                )}
              >
                {loading && (
                  <span
                    {...stylex.props(
                      switchStyles.loading,
                      isSelected && switchStyles.loadingSelected,
                    )}
                  >
                    <LoadingSpinner size={12} />
                  </span>
                )}
                {/* 级联顺序等价原 CSS 源顺序：pressed → invalid+pressed → selected → disabled+selected */}
                <div
                  {...stylex.props(
                    switchStyles.handle,
                    isPressed && switchStyles.handlePressed,
                    isInvalid && isPressed && switchStyles.handleInvalidPressed,
                    isSelected && switchStyles.handleSelected,
                    isDisabled && isSelected && switchStyles.handleDisabledSelected,
                  )}
                />
              </div>
              {content}
            </>
          );
        }}
      </SwitchButton>
      {desc && (
        <Text
          slot="description"
          {...stylex.props(
            switchStyles.description,
            effectiveDisabled && switchStyles.descriptionDisabled,
          )}
        >
          {desc}
        </Text>
      )}
      <FieldError>{errorMessage}</FieldError>
    </SwitchField>
  );
}
