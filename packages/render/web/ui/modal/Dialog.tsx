// 文件路径: render/web/ui/modal/Dialog.tsx

import "../../modal.css";
import React, { useId, useEffect, useRef, useCallback } from "react";
import { LuX } from "react-icons/lu";
import { BaseModal } from "./BaseModal";

type DialogStatus = "info" | "warning" | "error" | "success" | "neutral";

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  size?: "small" | "medium" | "large" | "xlarge" | "full";
  width?: number | string;
  noPadding?: boolean;
  bodyClassName?: string;
  icon?: React.ReactNode;
  status?: DialogStatus;
  actions?: React.ReactNode;
  showClose?: boolean;
  onEnterPress?: () => void;
  isActionDisabled?: boolean;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = "",
  size = "medium",
  width,
  noPadding = false,
  bodyClassName = "",
  icon,
  status = "neutral",
  actions,
  showClose,
  onEnterPress,
  isActionDisabled = false,
  ...ariaProps
}) => {
  const titleId = useId();
  const actionsRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const statusClass = status === "neutral" ? "" : `status-${status}`;
  const resolvedShowClose = showClose ?? !actions;
  const widthStyle =
    width !== undefined
      ? { width: typeof width === "number" ? `${width}px` : width }
      : undefined;

  // When the dialog opens with no element focused inside (e.g. a child
  // input with `autoFocus` hasn't mounted yet), focus the last action
  // button so keyboard users land on a primary action. If something
  // inside the dialog is already focused, leave it alone.
  // Runs at 50ms so it wins over BaseModal's focusInitial fallback (60ms);
  // Tab trap / restore live in BaseModal and do not re-steal this focus.
  useEffect(() => {
    if (!isOpen || !actions) return;
    const timer = setTimeout(() => {
      const dialogEl = dialogRef.current;
      if (!dialogEl) return;
      if (dialogEl.contains(document.activeElement)) return;

      const buttons = actionsRef.current?.querySelectorAll(
        "button:not([disabled])"
      );
      const last = buttons?.[buttons.length - 1];
      if (last instanceof HTMLElement) last.focus();
      else dialogEl.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [isOpen, actions]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDialogElement>) => {
      if (isActionDisabled || !onEnterPress) return;
      if (event.key !== "Enter") return;
      const target = event.target as Element | null;
      if (target?.matches('textarea, select, [contenteditable="true"]')) return;
      event.preventDefault();
      onEnterPress();
    },
    [onEnterPress, isActionDisabled]
  );

  const dialogWidthStyle = {
    ...(widthStyle ?? {}),
    // Reset UA dialog chrome so layout stays CSS-driven.
    margin: 0,
    padding: 0,
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      className={`c-dialogRoot ${className}`}
    >
      {/*
        Non-modal <dialog open>: keeps BaseModal portal/focus-trap/backdrop,
        while giving native dialog semantics for prefer-html-dialog.
      */}
      <dialog
        open
        ref={dialogRef}
        tabIndex={-1}
        className={`c-dialog size-${size} ${statusClass}`.trim()}
        // Explicit role keeps attribute selectors (e2e / probes) working.
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        style={dialogWidthStyle}
        onKeyDown={onEnterPress ? handleKeyDown : undefined}
        {...ariaProps}
      >
        <div className="c-dialog__header">
          {title && (
            <div id={titleId} className="c-dialog__title">
              {icon && (
                <span className="c-dialog__titleIcon" aria-hidden="true">
                  {icon}
                </span>
              )}
              {title}
            </div>
          )}
          {resolvedShowClose && (
            <button
              className="c-dialog__close"
              onClick={onClose}
              type="button"
              aria-label="Close dialog"
            >
              <LuX size={20} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className={`c-dialog__body ${noPadding ? "no-padding" : ""} ${bodyClassName}`}>
          {children}
        </div>

        {actions && (
          <div ref={actionsRef} className="c-dialog__footer">
            {actions}
          </div>
        )}
      </dialog>
    </BaseModal>
  );
};

export default Dialog;
