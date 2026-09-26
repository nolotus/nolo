import "../../modal.css";
import "./MorphDialog.css";
import React, { useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { flushSync } from "react-dom";
import {
  cardSurfaceViewTransitionName,
  prefersReducedMotion,
  viewTransitionStyle,
} from "app/viewTransitions";
import { useFocusTrap } from "./useFocusTrap";

export type MorphDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  morphKey: string;
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  "aria-label"?: string;
};

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => {
    finished?: Promise<unknown>;
  };
};

export interface MorphDialogTransitionOptions {
  /**
   * Stamps view-transition-name styles right before the VT captures the old
   * snapshot (so names exist for the transition but never at rest). On the
   * synchronous fallback path the names are cleared again immediately.
   */
  onBeforeUpdate?: () => void;
  /**
   * Runs inside the transition update callback, after the React state commit
   * is flushed but before the browser captures the NEW snapshot. This is the
   * only moment where the shared name can be moved off the old element onto
   * the new one (or vice versa) without producing a duplicate-name pair:
   * `startViewTransition` aborts the morph when one name maps to two
   * elements in the same snapshot.
   */
  onAfterUpdate?: () => void;
  /**
   * Runs once when the transition lifecycle ends (finished/catch) to remove
   * names. Also invoked synchronously on the reduced-motion/no-API path.
   */
  onAfterFinished?: () => void;
}

/**
 * Run a state change in the same VT snapshot as the shared-element swap.
 * Card surface names live only for this transition lifecycle, and each
 * snapshot phase must contain the name on at most one element:
 *   open  — old snapshot: card holds it; after the dialog is flushed in,
 *           onAfterUpdate removes it from the card so the new snapshot has
 *           only the dialog holding it.
 *   close — old snapshot: only the (still mounted) dialog holds it; after
 *           the dialog is flushed out, onAfterUpdate stamps it on the card
 *           so the new snapshot has only the card.
 */
export const runMorphDialogTransition = (
  update: () => void,
  options?: MorphDialogTransitionOptions
): void => {
  const { onBeforeUpdate, onAfterUpdate, onAfterFinished } = options ?? {};
  if (typeof document === "undefined" || prefersReducedMotion()) {
    onBeforeUpdate?.();
    update();
    onAfterUpdate?.();
    onAfterFinished?.();
    return;
  }
  const doc = document as ViewTransitionDocument;
  if (typeof doc.startViewTransition !== "function") {
    onBeforeUpdate?.();
    update();
    onAfterUpdate?.();
    onAfterFinished?.();
    return;
  }
  onBeforeUpdate?.();
  const transition = doc.startViewTransition(() => {
    flushSync(() => {
      update();
    });
    // State commit is flushed; the new snapshot has not been captured yet.
    onAfterUpdate?.();
  });
  // A rejected transition must never become an unhandled rejection.
  Promise.resolve(transition?.finished)
    .catch(() => undefined)
    .finally(() => {
      onAfterFinished?.();
    });
};

/** Portal-backed dialog whose shared name is swapped atomically with its card. */
export const MorphDialog: React.FC<MorphDialogProps> = ({
  isOpen,
  onClose,
  morphKey,
  title,
  children,
  className = "",
  "aria-label": ariaLabel,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  useFocusTrap(isOpen, contentRef, onClose);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") return null;
  const surfaceStyle = viewTransitionStyle(cardSurfaceViewTransitionName(morphKey));
  return ReactDOM.createPortal(
    <div
      className="morph-dialog"
      role="presentation"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        // The portal mounts on document.body — React events still bubble through
        // the tree to the underlying card's onKeyDown (Enter/Space would
        // preventDefault + re-trigger open). Stop keydown here.
        event.stopPropagation();
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={contentRef}
        className={`morph-dialog__content ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={title ? `${morphKey}-morph-title` : undefined}
        tabIndex={-1}
        style={surfaceStyle}
      >
        <header className="morph-dialog__header">
          {title && <h2 id={`${morphKey}-morph-title`}>{title}</h2>}
          <button type="button" className="morph-dialog__close" onClick={onClose} aria-label="Close dialog">×</button>
        </header>
        <div className="morph-dialog__body">{children}</div>
      </div>
    </div>,
    document.body,
  );
};

export default MorphDialog;
