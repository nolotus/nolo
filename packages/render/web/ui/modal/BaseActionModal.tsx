// 文件路径: render/web/ui/BaseActionModal.tsx

import "../../modal.css";
import React, { useEffect, useId, useRef, useCallback } from "react";
import { BaseModal } from "render/web/ui/modal/BaseModal";

interface BaseActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions: React.ReactNode;
  status?: "info" | "warning" | "error" | "success";
  titleIcon?: React.ReactNode;
  headerExtra?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  width?: number | string;
  onEnterPress?: () => void;
  isActionDisabled?: boolean;
}

export const BaseActionModal: React.FC<BaseActionModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  actions,
  status = "info",
  titleIcon,
  headerExtra,
  className = "",
  bodyClassName = "",
  width = 460,
  onEnterPress,
  isActionDisabled = false,
}) => {
  const titleId = useId();
  const modalRef = useRef<HTMLDialogElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  // 自动聚焦到最后一个按钮（50ms，早于 BaseModal focusInitial 的 60ms 回退）
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      if (!actionsRef.current) return;
      const buttons = actionsRef.current.querySelectorAll(
        "button:not([disabled])"
      );
      const lastButton = buttons[
        buttons.length - 1
      ] as HTMLButtonElement | undefined;
      if (lastButton) {
        lastButton.focus();
      } else {
        modalRef.current?.focus();
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDialogElement>) => {
      if (isActionDisabled) return;
      if (event.key === "Enter" && onEnterPress) {
        const target = event.target as Element | null;
        if (!target) return;

        const isInput = target.matches(
          'textarea, select, [contenteditable="true"]'
        );
        if (!isInput) {
          event.preventDefault();
          onEnterPress();
        }
      }
    },
    [onEnterPress, isActionDisabled]
  );

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        className={`base-action-modal-root ${className} status-${status}`}
      >
        {/*
          Non-modal <dialog open>: keeps BaseModal portal/focus-trap/backdrop,
          while giving native dialog semantics for prefer-html-dialog.
        */}
        <dialog
          open
          ref={modalRef}
          tabIndex={-1}
          className="action-modal-container"
          // Explicit role keeps attribute selectors (e2e / probes) working;
          // native <dialog> alone only exposes an implicit role to AT.
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onKeyDown={handleKeyDown}
          style={{
            width: typeof width === "number" ? `${width}px` : width,
            // Reset UA dialog chrome so layout stays CSS-driven.
            margin: 0,
            padding: 0,
          }}
        >
          <div className="action-modal-header">
            <div className="title-wrapper">
              {titleIcon && (
                <span className="title-icon" aria-hidden="true">
                  {titleIcon}
                </span>
              )}
              <h3 id={titleId} className="modal-title">
                {title}
              </h3>
            </div>
            {headerExtra && <div className="header-extra">{headerExtra}</div>}
          </div>

          <div className={`action-modal-body ${bodyClassName}`}>
            {children}
          </div>

          {actions && (
            <div ref={actionsRef} className="action-modal-actions">
              {actions}
            </div>
          )}
        </dialog>
      </BaseModal>
    </>
  );
};

export default BaseActionModal;