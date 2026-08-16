// 文件路径: render/web/ui/modal/BaseModal.tsx

import "../../modal.css";
import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { useFocusTrap } from "./useFocusTrap";

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /**
   * 作用在内部内容容器（.modal__content）上的类名
   */
  className?: string;
}

/**
 * 关闭时延迟卸载的时间（ms）
 * 对应 CSS 中最长的 transition-duration (300ms)
 */
const MODAL_TRANSITION_DURATION = 300;

export const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  children,
  className = "",
}) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timeoutId: number | undefined;
    let rafId: number | undefined;

    if (isOpen) {
      setShouldRender(true);
      // 使用双重 RAF 确保浏览器已捕获到初始状态，从而触发 Transition
      rafId = window.requestAnimationFrame(() => {
        rafId = window.requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
    } else {
      setIsVisible(false);
      timeoutId = window.setTimeout(() => {
        setShouldRender(false);
      }, MODAL_TRANSITION_DURATION);
    }

    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      if (rafId !== undefined) window.cancelAnimationFrame(rafId);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!shouldRender) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [shouldRender]);

  // Trap Tab and Escape only while open; restore focus as soon as isOpen
  // flips false (during exit transition, before unmount).
  useFocusTrap(Boolean(isOpen && shouldRender), contentRef, onClose);

  if (!shouldRender) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isOpen) return;
    if (e.target !== e.currentTarget) return;
    onClose();
  };

  const rootClassName = ["modal", isVisible ? "modal--open" : ""].join(" ").trim();
  const contentClassName = ["modal__content", className].join(" ").trim();

  return ReactDOM.createPortal(
    <div className={rootClassName} onClick={handleBackdropClick}>
      <div
        ref={contentRef}
        className={contentClassName}
        tabIndex={-1}
        // Content is a focus fallback / trap root; dialog semantics live on
        // Dialog / BaseActionModal children (role="dialog").
      >
        {children}
      </div>
    </div>,
    document.body
  );
};
