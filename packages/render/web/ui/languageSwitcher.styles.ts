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
    border: "1px solid var(--border)",
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
});
