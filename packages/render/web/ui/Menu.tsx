import React from "react";
import {
  Menu as AriaMenu,
  MenuItem as AriaMenuItem,
  MenuSection as AriaMenuSection,
  MenuTrigger as AriaMenuTrigger,
  SubmenuTrigger as AriaSubmenuTrigger,
  Header,
  Separator,
  Keyboard,
  type MenuItemProps,
  type MenuProps,
  type MenuSectionProps,
  type MenuTriggerProps,
  type SubmenuTriggerProps,
} from "react-aria-components";
import { Popover } from "./Popover";
import { LuCheck, LuChevronRight, LuDot } from "react-icons/lu";
import "./Menu.css";

export function MenuTrigger(props: MenuTriggerProps) {
  const [trigger, menu] = React.Children.toArray(props.children) as [
    React.ReactElement,
    React.ReactElement,
  ];
  return (
    <AriaMenuTrigger {...props}>
      {trigger}
      <Popover className="app-menu-popover" hideArrow offset={4}>
        {menu}
      </Popover>
    </AriaMenuTrigger>
  );
}

export function Menu<T extends object>(props: MenuProps<T>) {
  return <AriaMenu {...props}>{props.children}</AriaMenu>;
}

export function MenuItem(
  props: Omit<MenuItemProps, "children"> & { children?: React.ReactNode }
) {
  const { className, ...restProps } = props;
  const computedClassName = (renderProps: any) => {
    const customClass =
      typeof className === "function" ? className(renderProps) : className;
    return `react-aria-MenuItem ${customClass ?? ""}`.trim();
  };

  const textValue =
    props.textValue ||
    (typeof props.children === "string"
      ? props.children
      : extractMenuItemText(props.children));

  return (
    <AriaMenuItem {...restProps} className={computedClassName} textValue={textValue}>
      {({ hasSubmenu, isSelected, selectionMode }) => (
        <>
          {isSelected && selectionMode === "multiple" ? (
            <LuCheck size={16} className="app-menu-check" aria-hidden="true" />
          ) : null}
          {isSelected && selectionMode === "single" ? (
            <LuDot size={16} className="app-menu-dot" aria-hidden="true" />
          ) : null}
          {typeof props.children === "string" ? (
            <span slot="label">{props.children}</span>
          ) : (
            props.children
          )}
          {hasSubmenu ? (
            <LuChevronRight size={16} className="app-menu-chevron" aria-hidden="true" />
          ) : null}
        </>
      )}
    </AriaMenuItem>
  );
}

export function MenuSection<T extends object>(props: MenuSectionProps<T>) {
  return <AriaMenuSection {...props} />;
}

export function SubmenuTrigger(props: SubmenuTriggerProps) {
  const [trigger, menu] = React.Children.toArray(props.children) as [
    React.ReactElement,
    React.ReactElement,
  ];
  return (
    <AriaSubmenuTrigger {...props}>
      {trigger}
      <Popover
        className="app-menu-popover app-menu-popover--submenu"
        hideArrow
        offset={-2}
        crossOffset={-4}
      >
        {menu}
      </Popover>
    </AriaSubmenuTrigger>
  );
}

function extractMenuItemText(children: React.ReactNode): string | undefined {
  if (children == null || typeof children === "boolean") return undefined;
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }
  if (Array.isArray(children)) {
    const parts = children
      .map((child) => extractMenuItemText(child))
      .filter((part): part is string => !!part && part.trim().length > 0);
    return parts.length > 0 ? parts.join(" ") : undefined;
  }
  if (React.isValidElement(children)) {
    return extractMenuItemText(
      (children.props as { children?: React.ReactNode }).children
    );
  }
  return undefined;
}

export { Header, Separator, Keyboard };
export type {
  MenuProps,
  MenuItemProps,
  MenuSectionProps,
  MenuTriggerProps,
  SubmenuTriggerProps,
};
