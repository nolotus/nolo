import * as stylex from "@stylexjs/stylex";
import { sidebarItemStyles as styles } from "./sidebarItemStyles";
/* SidebarItemActions.tsx */
import React from "react";
import { LuChevronRight } from "react-icons/lu";

const ICON_SIZE = 16 as const;

export function IconButton({
  onClick,
  icon: Icon,
  label,
  buttonRef,
  ...props
}: {
  onClick?: (e: React.MouseEvent) => void;
  icon: React.ComponentType<any>;
  label: string;
  buttonRef?: React.Ref<HTMLButtonElement>;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      ref={buttonRef}
      className={stylex.props(styles.actionButton).className}
      onClick={onClick}
      aria-label={label}
      type="button"
      {...props}
    >
      <Icon size={ICON_SIZE} aria-hidden="true" />
    </button>
  );
}

export function MenuItem({
    onClick,
    icon: Icon,
    label,
    isSubMenu = false,
    ...props
}: {
    onClick?: (e: React.MouseEvent) => void;
    icon?: React.ComponentType<any>;
    label: string;
    isSubMenu?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
    const { className, ...rest } = props;
    return (
        <button
            className={`${stylex.props(styles.menuItem).className} ${className || ""}`}
            onClick={onClick}
            role="menuitem"
            type="button"
            data-hook="create-space-sidebar-menu-item"
            {...rest}
        >
            {Icon && <Icon size={ICON_SIZE} className={stylex.props(styles.menuIcon).className} data-hook="create-space-sidebar-menu-icon" aria-hidden="true" />}
            <span>{label}</span>
            {isSubMenu && (
                <LuChevronRight
                    size={ICON_SIZE}
                    className={stylex.props(styles.submenuIndicator).className}
                    data-hook="create-space-sidebar-submenu-indicator"
                    aria-hidden="true"
                />
            )}
        </button>
    );
}
