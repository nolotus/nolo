// 文件路径：render/layout/blocks/NavListItem.tsx
import type React from "react";
import { useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { NavLink, useLocation } from "app/routing";

/**
 * NavListItem —— StyleX 迁移（原内联 <style> 块 1:1 迁出）。
 *
 * 原 CSS 中的后代选择器（.nav-list-item:hover .nav-list-icon /
 * .nav-list-item.active .nav-list-icon）StyleX 无法表达，改由状态驱动：
 * - hover 态：onMouseEnter/onMouseLeave 切换 iconHover；
 * - active 态：直接使用 NavLink className/children 回调的 isActive
 *   参数（className 回调挂 itemActive，children 回调渲染 iconActive），
 *   不在渲染回调里 setState。
 * `@media (max-width: 768px)` / `prefers-reduced-motion` 用 StyleX
 * 内联条件值表达，与原 CSS 一致。
 */
const styles = stylex.create({
  item: {
    display: "flex",
    alignItems: "center",
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: "var(--space-3)",
    paddingRight: "var(--space-3)",
    borderWidth: 0,
    borderStyle: "none",
    borderRadius: "var(--radius-md)",
    color: {
      default: "var(--text)",
      ":hover": "var(--primary)",
    },
    backgroundColor: {
      default: "transparent",
      ":hover": "var(--primaryGhost)",
    },
    textDecoration: "none",
    transitionProperty: {
      default: "all",
      "@media (prefers-reduced-motion: reduce)": "none",
    },
    transitionDuration: "0.2s",
    transitionTimingFunction: "ease",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: "var(--fontSize-base)",
    fontWeight: 400,
    lineHeight: "inherit",
    height: {
      default: 32,
      "@media (max-width: 768px)": "var(--tap-target-min)",
    },
    width: "100%",
    textAlign: "left",
  },
  // .nav-list-item.active
  itemActive: {
    backgroundColor: "var(--primary)",
    color: "var(--background)",
  },
  // .nav-list-icon
  icon: {
    display: "flex",
    alignItems: "center",
    marginRight: "var(--space-2)",
    color: "var(--textSecondary)",
  },
  // .nav-list-item:hover .nav-list-icon（state 驱动）
  iconHover: {
    color: "var(--primary)",
  },
  // .nav-list-item.active .nav-list-icon（state 驱动）
  iconActive: {
    color: "var(--background)",
  },
});

interface NavListItemProps {
  path?: string;
  label?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  end?: boolean;
}

const NavListItem: React.FC<NavListItemProps> = ({
  path,
  label,
  icon,
  onClick,
  end,
}) => {
  const location = useLocation(); // ✅ 拿到当前 location，用于透传 state
  const [hovered, setHovered] = useState(false);

  const renderIcon = (isActive: boolean) =>
    icon ? (
      <span
        {...stylex.props(
          styles.icon,
          hovered && !isActive && styles.iconHover,
          isActive && styles.iconActive,
        )}
        aria-hidden="true"
      >
        {icon}
      </span>
    ) : null;

  const hoverHandlers = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  };

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        {...hoverHandlers}
        {...stylex.props(styles.item)}
      >
        {renderIcon(false)}
        {label}
      </button>
    );
  }

  if (path) {
    return (
      <NavLink
        to={path}
        state={location.state} // ✅ 把当前 state（包含 backgroundLocation）一起带过去
        end={end}
        {...hoverHandlers}
        className={({ isActive }: { isActive: boolean }) =>
          stylex.props(styles.item, isActive && styles.itemActive).className
        }
      >
        {({ isActive }: { isActive: boolean }) => (
          <>
            {renderIcon(isActive)}
            {label}
          </>
        )}
      </NavLink>
    );
  }

  return null;
};

export default NavListItem;
