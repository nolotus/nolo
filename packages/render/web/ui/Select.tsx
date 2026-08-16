// packages/render/web/ui/Select.tsx
//
// React Aria Select wrapper — single composition API:
//   <Select label="…"><SelectItem id="a">A</SelectItem></Select>
//
// Complex optgroup UIs use SelectRoot + SelectItem (+ SelectItemText, …).

import * as React from "react";
import {
  Select as AriaSelect,
  SelectValue as AriaSelectValue,
  Button as AriaButton,
  ListBox as AriaListBox,
  ListBoxItem as AriaListBoxItem,
  ListBoxSection as AriaListBoxSection,
  Header as AriaHeader,
  Label as AriaLabel,
  type SelectProps as AriaSelectProps,
  type ListBoxProps as AriaListBoxProps,
  type ListBoxItemProps as AriaListBoxItemProps,
  type ValidationResult,
} from "react-aria-components";
import { LuChevronDown, LuCheck } from "react-icons/lu";
import { Popover } from "./Popover";
import { Description, FieldError } from "./Form";
import "./Select.css";

const joinClass = (base: string, extra?: string): string =>
  extra ? `${base} ${extra}` : base;

// ── Shared option shape (helpers for call sites) ────────────────────────────

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

// ── Composition pieces ──────────────────────────────────────────────────────

/**
 * List item — string children get label + check indicator (official DropdownItem).
 * Complex children pass through for AdvancedSettingsTab-style rows.
 */
export function SelectItem({
  children,
  className,
  textValue,
  ...props
}: AriaListBoxItemProps) {
  const isSimple =
    typeof children === "string" || typeof children === "number";
  return (
    <AriaListBoxItem
      {...props}
      textValue={textValue ?? (isSimple ? String(children) : undefined)}
      className={joinClass(
        "nolo-select-item",
        typeof className === "string" ? className : undefined
      )}
    >
      {isSimple ? (
        <>
          <span className="nolo-select-item-text">{children}</span>
          <span className="nolo-select-item-indicator" aria-hidden="true">
            <LuCheck size={14} />
          </span>
        </>
      ) : (
        children
      )}
    </AriaListBoxItem>
  );
}

export function SelectListBox<T extends object>(props: AriaListBoxProps<T>) {
  const { className, ...rest } = props;
  return (
    <AriaListBox
      {...rest}
      className={joinClass(
        "nolo-select-list",
        typeof className === "string" ? className : undefined
      )}
    />
  );
}

// ── Select (composition only) ───────────────────────────────────────────────

export interface SelectProps<T extends object = object>
  extends Omit<AriaSelectProps<T>, "children"> {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  items?: Iterable<T>;
  children: React.ReactNode | ((item: T) => React.ReactNode);
  /** Root `.react-aria-Select` class. */
  className?: string;
  /** Trigger button class. */
  triggerClassName?: string;
}

/** @deprecated Use SelectProps */
export type CompositionSelectProps<T extends object = object> = SelectProps<T>;

export function Select<T extends object = object>({
  label,
  description,
  errorMessage,
  children,
  items,
  className,
  triggerClassName,
  ...props
}: SelectProps<T>) {
  return (
    <AriaSelect
      {...props}
      className={joinClass("react-aria-Select nolo-select", className)}
    >
      {label ? (
        <AriaLabel className="nolo-select-label">{label}</AriaLabel>
      ) : null}
      <AriaButton
        className={joinClass("nolo-select-trigger", triggerClassName)}
      >
        <AriaSelectValue className="nolo-select-value" />
        <span aria-hidden="true" className="nolo-select-icon">
          <LuChevronDown size={16} />
        </span>
      </AriaButton>
      {description ? <Description>{description}</Description> : null}
      {errorMessage ? <FieldError>{errorMessage}</FieldError> : null}
      <Popover
        hideArrow
        offset={4}
        className="nolo-select-popover select-popover"
      >
        <AriaListBox items={items} className="nolo-select-list">
          {children}
        </AriaListBox>
      </Popover>
    </AriaSelect>
  );
}

// ── Escape hatch primitives (AdvancedSettingsTab) ───────────────────────────

export const SelectRoot = AriaSelect;
export const SelectTrigger = AriaButton;
export const SelectValue = AriaSelectValue;
export const SelectIcon: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => (
  <span aria-hidden="true" className="nolo-select-icon">
    {children ?? <LuChevronDown size={16} />}
  </span>
);
export const SelectList = AriaListBox;
export const SelectItemText: React.FC<{
  children?: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <span className={joinClass("nolo-select-item-text", className)}>
    {children}
  </span>
);
export const SelectItemIndicator: React.FC<{
  children?: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <span
    aria-hidden="true"
    className={joinClass("nolo-select-item-indicator", className)}
  >
    {children ?? <LuCheck size={14} />}
  </span>
);
export const SelectGroup = AriaListBoxSection;
export const SelectGroupLabel: React.FC<{
  children?: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <AriaHeader className={joinClass("nolo-select-group-label", className)}>
    {children}
  </AriaHeader>
);

export type { AriaSelectProps, AriaListBoxProps, AriaListBoxItemProps };
