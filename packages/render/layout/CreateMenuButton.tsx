// Presentation-only create menu shell.
// Domain wiring + item policy live in CreateMenuButtonContainer + createMenuPolicy.

import React from "react";
import { LuPlus } from "react-icons/lu";
import {
  MenuTrigger as AriaMenuTrigger,
  PreviewTrigger as AriaPreviewTrigger,
  Button as RacButton,
  type Key,
} from "react-aria-components";
import { Popover } from "render/web/ui/Popover";
import { Menu } from "render/web/ui/Menu";
import "./layout.css";

export type CreateMenuButtonPresentationProps = {
  variant?: "sidebar" | "topbar" | "inline" | "header";
  className?: string;
  title?: string;
  createLabel: string;
  shouldShowLabel: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onHoverOpenChange: (open: boolean) => void;
  onAction: (key: Key) => void;
  /**
   * 桌面端 hover 展开：改用 RAC PreviewTrigger（非模态 hover 预览），
   * 内置 warmup delay / closeDelay / focus 进入 popover，从根上避免手写
   * mouseEnter/Leave 计时器在 trigger↔popover 间隙震荡导致的闪烁。
   * 触屏 / 无 hover 能力的设备保持点击触发（走 MenuTrigger 分支）。
   */
  hoverOpen?: boolean;
  children: React.ReactNode;
};

const CreateMenuButton: React.FC<CreateMenuButtonPresentationProps> = ({
  variant = "sidebar",
  className = "",
  title,
  createLabel,
  shouldShowLabel,
  isOpen,
  onOpenChange,
  onHoverOpenChange,
  onAction,
  hoverOpen = false,
  children,
}) => {
  const triggerTitle = title ?? createLabel;

  const triggerBaseClass =
    variant === "sidebar"
      ? "create-menu__button"
      : variant === "topbar"
        ? "topbar-user-menu__toggle create-menu__button--topbar"
        : "";

  const iconSize = variant === "sidebar" ? 20 : variant === "header" ? 14 : 17;

  const triggerButton = (
    <RacButton
      className={`${triggerBaseClass} ${isOpen ? "is-active" : ""} ${className}`}
      aria-label={triggerTitle}
    >
      <LuPlus
        size={iconSize}
        className={`create-menu__icon ${isOpen ? "is-rotated" : ""}`}
        aria-hidden="true"
      />
      {shouldShowLabel ? (
        <span className="create-menu__label">{createLabel}</span>
      ) : null}
    </RacButton>
  );

  const menuPopover = (
    <Popover
      className="create-menu-popover"
      placement={variant === "topbar" ? "bottom end" : "bottom start"}
      hideArrow
      offset={8}
    >
      <Menu onAction={onAction}>{children}</Menu>
    </Popover>
  );

  return (
    <div
      className={`create-menu ${variant === "sidebar" && shouldShowLabel ? "create-menu--sidebar-wide" : ""}`}
    >
      {hoverOpen ? (
        // PreviewTrigger：hover/focus 展开非模态预览。
        // delay = 进触发后多久展开（比默认 600 更跟手）；
        // closeDelay = 离开后多久收起（留出 trigger↔popover 移动间隙）。
        // hover 模式所有开/关都走 onHoverOpenChange（container 侧不计数）。
        <AriaPreviewTrigger
          isOpen={isOpen}
          onOpenChange={onHoverOpenChange}
          delay={200}
          closeDelay={150}
        >
          {triggerButton}
          {menuPopover}
        </AriaPreviewTrigger>
      ) : (
        // 点击模式：受控 MenuTrigger，开/关走 onOpenChange（container 侧计数）。
        <AriaMenuTrigger isOpen={isOpen} onOpenChange={onOpenChange}>
          {triggerButton}
          {menuPopover}
        </AriaMenuTrigger>
      )}
    </div>
  );
};

export default CreateMenuButton;