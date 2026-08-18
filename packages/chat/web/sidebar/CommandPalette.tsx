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
import "./CommandPalette.css";

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
      className="command-palette-overlay"
    >
      <Modal className="command-palette-modal">
        <Dialog
          className="command-palette-dialog"
          aria-label={ariaLabel ?? searchAriaLabel}
        >
          <AriaAutocomplete filter={contains} inputValue={inputValue} onInputChange={onInputChange}>
            <SearchField
              autoFocus
              aria-label={searchAriaLabel}
              className="command-palette-search"
            >
              <Input
                className="command-palette-search-input"
                placeholder={placeholder}
              />
            </SearchField>
            <Menu
              items={items}
              onAction={onAction}
              className={["command-palette-menu", className]
                .filter(Boolean)
                .join(" ")}
              renderEmptyState={() => emptyState}
              aria-label={ariaLabel ?? searchAriaLabel}
            >
              {children as any}
            </Menu>
            {footer ? (
              <div className="command-palette-footer" aria-hidden="true">
                {footer}
              </div>
            ) : null}
          </AriaAutocomplete>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
