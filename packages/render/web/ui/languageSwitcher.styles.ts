// 文件: render/web/ui/languageSwitcher.styles.ts
import * as stylex from "@stylexjs/stylex";

/**
 * LanguageSwitcher 样式 —— StyleX 迁移
 * （自原 ui.css「LanguageSwitcher」分区 1:1 迁出，迁出后该分区已删除）
 */
export const langSwitcherStyles = stylex.create({
  // .lang-switcher
  switcher: {
    position: "relative",
    display: "inline-block",
  },
  // .lang-button
  button: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-2)",
    paddingBlock: "var(--space-2)",
    paddingInline: "var(--space-3)",
    backgroundColor: "var(--backgroundSecondary)",
    color: "var(--textSecondary)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--border)",
    borderRadius: "var(--radius-xs)",
    fontSize: "var(--fontSize-base)",
    cursor: "pointer",
    transition: "all 0.2s ease",
    minWidth: 120,
    ":hover": {
      backgroundColor: "var(--backgroundHover)",
      borderColor: "var(--primary)",
      color: "var(--text)",
    },
  },
  // .lang-button--icon-only
  iconOnly: {
    minWidth: 0,
    width: 32,
    height: 32,
    padding: 0,
    gap: 0,
    justifyContent: "center",
    "@media (max-width: 768px)": {
      width: "var(--tap-target-min)",
      height: "var(--tap-target-min)",
    },
  },
  // .lang-icon
  icon: {
    flexShrink: 0,
  },
  // .lang-current
  current: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-2)",
    whiteSpace: "nowrap",
  },
  // 原生下拉菜单（替代 react-aria 的 Menu）
  menu: {
    position: "absolute",
    top: "calc(100% + var(--space-2))",
    right: 0,
    minWidth: 160,
    padding: "var(--space-1)",
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: 2,
    backgroundColor: "var(--background)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--border)",
    borderRadius: "var(--radius-md)",
    boxShadow: "0 10px 24px -12px var(--shadowMedium)",
    zIndex: 40,
  },
  menuItem: {
    display: "block",
    width: "100%",
    textAlign: "left",
    paddingBlock: "var(--space-2)",
    paddingInline: "var(--space-3)",
    borderWidth: 0,
    borderRadius: "var(--radius-xs)",
    backgroundColor: "transparent",
    color: "var(--text)",
    fontSize: "var(--fontSize-base)",
    cursor: "pointer",
    ":hover": {
      backgroundColor: "var(--backgroundHover)",
    },
    ":focus-visible": {
      outlineWidth: 2,
      outlineStyle: "solid",
      outlineColor: "var(--primary)",
      outlineOffset: 2,
    },
  },
  menuItemCurrent: {
    color: "var(--primary)",
    fontWeight: 600,
  },
});
