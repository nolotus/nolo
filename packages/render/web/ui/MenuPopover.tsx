import React from "react";
import {
  RootMenuTriggerStateContext,
  type PopoverProps,
} from "react-aria-components";
import { useMenuTriggerState } from "react-stately";
import { Popover } from "./Popover";
import "./Menu.css";

type MenuPopoverProps = {
  triggerRef: React.RefObject<Element | null>;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  placement?: PopoverProps["placement"];
  offset?: number;
  className?: string;
};

/**
 * Portal-safe menu host for rows that live inside RAC collections (ListBoxItem).
 * Nested <MenuTrigger> inside a collection tree can crash; this keeps the
 * trigger button in-row and hosts the RAC Menu/Submenu tree in a Popover with
 * RootMenuTriggerStateContext so SubmenuTrigger still works.
 */
export function MenuPopover({
  triggerRef,
  isOpen,
  onOpenChange,
  children,
  placement = "bottom start",
  offset = 4,
  className = "app-menu-popover",
}: MenuPopoverProps) {
  const state = useMenuTriggerState({ isOpen, onOpenChange });

  return (
    <RootMenuTriggerStateContext.Provider value={state}>
      <Popover
        className={className}
        triggerRef={triggerRef}
        isOpen={state.isOpen}
        onOpenChange={state.setOpen}
        placement={placement}
        hideArrow
        offset={offset}
      >
        {children}
      </Popover>
    </RootMenuTriggerStateContext.Provider>
  );
}
