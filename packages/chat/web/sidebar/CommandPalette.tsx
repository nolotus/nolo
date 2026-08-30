import React, { useEffect } from "react";
import {
  Autocomplete as AriaAutocomplete,
  Dialog,
  Input,
  Modal,
  ModalOverlay,
  SearchField,
  useFilter,
  type Key,
} from "react-aria-components";
import { Menu } from "render/web/ui/Menu";
import { matchShortcut } from "app/settings/shortcutUtils";
import * as stylex from "@stylexjs/stylex";
import { commandPaletteStyles } from "./commandPaletteStyles";
import "../chatStylexEscapeHatch.css";

export const COMMAND_PALETTE_SHORTCUT = "mod+k";

export interface CommandPaletteProps<T extends object> {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  items?: Iterable<T>;
  children: React.ReactNode | ((item: T) => React.ReactNode);
  onAction?: (key: Key) => void;
  placeholder?: string;
  searchAriaLabel?: string;
  emptyState?: React.ReactNode;
  /** Optional footer (e.g. keyboard hints). */
  footer?: React.ReactNode;
  /** Controlled search text. */
  inputValue?: string;
  onInputChange?: (value: string) => void;
  /** When true, register global mod+k to open/toggle the palette. Default true. */
  enableGlobalShortcut?: boolean;
  className?: string;
  "aria-label"?: string;
}

export function CommandPalette<T extends object>(props: CommandPaletteProps<T>) {
  const {
    isOpen,
    onOpenChange,
    items,
    children,
    onAction,
    placeholder = "Search...",
    searchAriaLabel = "Search",
    emptyState = "No results found.",
    footer,
    inputValue,
    onInputChange,
    enableGlobalShortcut = true,
    className,
    "aria-label": ariaLabel,
  } = props;
  const { contains } = useFilter({ sensitivity: "base" });

  useEffect(() => {
    if (!enableGlobalShortcut) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!matchShortcut(event, COMMAND_PALETTE_SHORTCUT)) return;
      if (event.isComposing) return;
      event.preventDefault();
      onOpenChange(!isOpen);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enableGlobalShortcut, isOpen, onOpenChange]);

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable
      data-hook="chat-esc-cp-overlay"
      {...stylex.props(commandPaletteStyles.overlay)}
    >
      <Modal
        data-hook="chat-esc-cp-modal"
        {...stylex.props(commandPaletteStyles.modal)}
      >
        <Dialog
          {...stylex.props(commandPaletteStyles.dialog)}
          aria-label={ariaLabel ?? searchAriaLabel}
        >
          <AriaAutocomplete filter={contains} inputValue={inputValue} onInputChange={onInputChange}>
            <SearchField
              autoFocus
              aria-label={searchAriaLabel}
              {...stylex.props(commandPaletteStyles.search)}
            >
              <Input
                data-hook="chat-esc-cp-search-input"
                placeholder={placeholder}
              />
            </SearchField>
            <Menu
              items={items}
              onAction={onAction}
              data-hook="chat-esc-cp-menu"
              className={className}
              renderEmptyState={() => emptyState}
              aria-label={ariaLabel ?? searchAriaLabel}
            >
              {children as any}
            </Menu>
            {footer ? (
              <div {...stylex.props(commandPaletteStyles.footer)} aria-hidden="true">
                {footer}
              </div>
            ) : null}
          </AriaAutocomplete>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
