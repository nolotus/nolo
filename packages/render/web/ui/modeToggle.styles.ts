// 文件: render/web/ui/modeToggle.styles.ts
import * as stylex from "@stylexjs/stylex";

/**
 * ModeToggle 样式 —— StyleX 迁移
 * （自原 ui.css「ModeToggle」分区 1:1 迁出，迁出后该分区已删除）
 *
 * 例外：`[data-theme='dark'] .mode-toggle__slider`（祖先主题选择器）StyleX
 * 无法表达，已原样迁至 packages/app/theme/theme-ui.css（主题上下文规则的
 * 归宿），slider 通过保留的语义类名 mode-toggle__slider 匹配。
 * button 的 :hover:not(:disabled):not(.active) 由 TSX 条件挂载（仅
 * 非 active 且非 disabled 时挂 buttonHover）。
 */
export const modeToggleStyles = stylex.create({
  // .mode-toggle
  toggle: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    backgroundColor: "var(--backgroundTertiary)",
    padding: 3,
    borderRadius: 999,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--border)",
    width: "fit-content",
    userSelect: "none",
  },
  // .mode-toggle--disabled
  disabled: {
    opacity: 0.6,
    cursor: "not-allowed",
    filter: "grayscale(0.5)",
  },
  // .mode-toggle__slider（保留语义类名供 theme-ui.css 的 dark 覆盖）
  slider: {
    position: "absolute",
    width: "calc(50% - 3px)",
    top: 3,
    bottom: 3,
    left: 3,
    backgroundColor: "var(--background)",
    borderRadius: 999,
    boxShadow:
      "0 1px 2px var(--shadowLight), 0 2px 4px var(--shadowMedium)",
    transition: "transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)",
    zIndex: 0,
  },
  // .mode-toggle__slider--edit
  sliderEdit: {
    transform: "translateX(100%)",
  },
  // .mode-toggle__button
  button: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0,
    borderStyle: "none",
    backgroundColor: "transparent",
    padding: 0,
    width: 28,
    height: 26,
    borderRadius: 999,
    cursor: "pointer",
    color: "var(--textQuaternary)",
    transition: "color 0.2s ease",
  },
  // .mode-toggle__button:hover:not(:disabled):not(.active)（仅非 active 且非 disabled 时挂载）
  buttonHover: {
    ":hover": {
      color: "var(--textSecondary)",
    },
  },
  // .mode-toggle__button--active
  buttonActive: {
    color: "var(--primary)",
  },
  // .mode-toggle__icon
  icon: {
    width: 14,
    height: 14,
    strokeWidth: "2.5px",
  },
});
