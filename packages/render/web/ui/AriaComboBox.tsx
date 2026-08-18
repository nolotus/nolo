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
import "./AriaComboBox.css";

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
      className={
        typeof className === "function"
          ? (renderProps) =>
              `react-aria-ComboBox ${className(renderProps) ?? ""}`.trim()
          : `react-aria-ComboBox ${className ?? ""}`.trim()
      }
    >
      {label && <Label className="react-aria-Label">{label}</Label>}
      <div className="combobox-field">
        <Input className="react-aria-Input inset" placeholder={placeholder} />
        <AriaButton className="combobox-trigger" aria-label="展开选项">
          <LuChevronDown size={16} />
        </AriaButton>
      </div>
      {description && <Description>{description}</Description>}
      <FieldError>{errorMessage}</FieldError>
      <Popover hideArrow className="combobox-popover">
        <ComboBoxListBox>{children}</ComboBoxListBox>
      </Popover>
    </AriaComboBoxRoot>
  );
}

export { ComboBoxItem, ComboBoxListBox };
