import * as stylex from "@stylexjs/stylex";
import React from "react";
import {
  ComboBox as AriaComboBoxRoot,
  type ComboBoxProps as AriaComboBoxProps,
  Input,
  Label,
  Button as AriaButton,
  type ValidationResult,
} from "react-aria-components";
import { Description, FieldError } from "./Form";
import {
  SelectItem as ComboBoxItem,
  SelectListBox as ComboBoxListBox,
} from "./Select";
import { Popover } from "./Popover";
import { LuChevronDown } from "react-icons/lu";

import { comboBoxStyles } from "./ariaComboBox.styles";

export interface ComboBoxProps<T extends object> extends Omit<
  AriaComboBoxProps<T>,
  "children"
> {
  label?: string;
  description?: string | null;
  errorMessage?: string | ((validation: ValidationResult) => string);
  children: React.ReactNode | ((item: T) => React.ReactNode);
  placeholder?: string;
}

export function AriaComboBox<T extends object>({
  label,
  description,
  errorMessage,
  children,
  placeholder,
  className,
  ...props
}: ComboBoxProps<T>) {
  return (
    <AriaComboBoxRoot
      {...props}
      className={(renderProps) =>
        [
          stylex.props(comboBoxStyles.root).className,
          typeof className === "function"
            ? className(renderProps) ?? ""
            : className ?? "",
        ]
          .filter(Boolean)
          .join(" ")
      }
    >
      {label && (
        <Label {...stylex.props(comboBoxStyles.label)}>{label}</Label>
      )}
      <div {...stylex.props(comboBoxStyles.field)}>
        <Input
          {...stylex.props(comboBoxStyles.input)}
          placeholder={placeholder}
        />
        <AriaButton
          {...stylex.props(comboBoxStyles.trigger)}
          aria-label="展开选项"
        >
          <LuChevronDown size={16} />
        </AriaButton>
      </div>
      {description && <Description>{description}</Description>}
      <FieldError>{errorMessage}</FieldError>
      <Popover
        hideArrow
        className={stylex.props(comboBoxStyles.popover).className}
      >
        <ComboBoxListBox>{children}</ComboBoxListBox>
      </Popover>
    </AriaComboBoxRoot>
  );
}

export { ComboBoxItem, ComboBoxListBox };
