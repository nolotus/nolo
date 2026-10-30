import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
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
import { LuSearch } from "react-icons/lu";
import { Menu } from "render/web/ui/Menu";
import { matchShortcut } from "app/settings/shortcutUtils";
import * as stylex from "@stylexjs/stylex";
import { commandPaletteStyles } from "./commandPaletteStyles";
import "../chatStylexEscapeHatch.css";
import "./sidebarSearchSimple.css";

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
  /** Accessible label for close button */
  closeAriaLabel?: string;
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
    closeAriaLabel,
    inputValue,
    onInputChange,
    enableGlobalShortcut = true,
    className,
    "aria-label": ariaLabel,
  } = props;
  const { t } = useTranslation(["common", "space"]);
  const resolvedCloseLabel = closeAriaLabel ?? t("common:close", "关闭");
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
          data-hook="chat-esc-cp-dialog"
          {...stylex.props(commandPaletteStyles.dialog)}
          aria-label={ariaLabel ?? searchAriaLabel}
        >
          <AriaAutocomplete filter={contains} inputValue={inputValue} onInputChange={onInputChange}>
            <div
              data-hook="chat-esc-cp-search-row"
              {...stylex.props(commandPaletteStyles.searchRow)}
            >
              <SearchField
                autoFocus
                aria-label={searchAriaLabel}
                data-hook="chat-esc-cp-searchfield"
                {...stylex.props(commandPaletteStyles.search)}
              >
                <LuSearch
                  data-hook="chat-esc-cp-search-icon"
                  size={16}
                  aria-hidden="true"
                />
                <Input
                  data-hook="chat-esc-cp-search-input"
                  placeholder={placeholder}
                />
              </SearchField>
              <button
                type="button"
                data-hook="chat-esc-cp-esc-btn"
                aria-label={resolvedCloseLabel}
                onClick={() => onOpenChange(false)}
              >
                Esc
              </button>
            </div>
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
              <div
                data-hook="chat-esc-cp-footer"
                {...stylex.props(commandPaletteStyles.footer)}
                aria-hidden="true"
              >
                {footer}
              </div>
            ) : null}
          </AriaAutocomplete>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
