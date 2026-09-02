// 文件: render/web/ui/button.styles.ts
import * as stylex from "@stylexjs/stylex";

/**
 * Button 样式 —— StyleX 迁移（自原 ui.css「Button」分区 1:1 迁出，迁出后该分区已删除）
 *
 * 与原 CSS 的行为对应关系：
 * - `:hover:not(.btn-disabled)` / `:active:not(.btn-disabled)`：hover/active 样式
 *   仅在非 disabled 时挂载（见 Button.tsx），语义等价。
 * - `.btn:disabled / .btn[aria-disabled="true"] / .btn-disabled` 合并为 disabled；
 *   其中 aria-disabled 变体与 `.btn-loading .btn-spinner`（btn-spinner 类无消费者）
 *   在当前渲染路径未使用，未迁移。原 `!important` 由「disabled 时不挂 hover/active，
 *   且 disabled 样式后传覆盖」等价实现。
 * - `prefers-reduced-motion` 与原 CSS 一致：仅移除 transition 与 transform，
 *   不还原阴影/亮度变化。
 * - `.btn-small/.btn-large .btn-leading` 后代选择器改写为按 size 取
 *   buttonLeadingStyles[size]；`.btn-content` 的 `gap: inherit`（gap 非继承属性）
 *   同样按 buttonContentGapStyles[size] 展开。
 * - 全部 key 保持扁平（stylex.create 不支持嵌套命名空间），variant 变体通过
 *   底部的 button{Variant,Hover,Active}Styles 映射暴露给组件。
 */

const spin = stylex.keyframes({
  "0%": { transform: "rotate(0deg)" },
  "100%": { transform: "rotate(360deg)" },
});

export const buttonStyles = stylex.create({
  // .btn 基类（:root 的 --btn-radius/--btn-transition/--btn-font-weight 已内联）
  base: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "inherit",
    fontWeight: 500,
    lineHeight: 1,
    whiteSpace: "nowrap",
    verticalAlign: "middle",
    userSelect: "none",
    borderRadius: "var(--radius-xs)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "transparent",
    cursor: "pointer",
    transition: {
      default: "all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)",
      "@media (prefers-reduced-motion: reduce)": "none",
    },
    textDecoration: "none",
    outline: "none",
    letterSpacing: "0.01em",
    WebkitFontSmoothing: "antialiased",
  },
  // .btn-small
  sizeSmall: {
    height: "var(--control-md)",
    paddingInline: 12,
    fontSize: "var(--fontSize-base)",
    gap: 6,
  },
  // .btn-medium
  sizeMedium: {
    height: "var(--control-lg)",
    paddingInline: 16,
    fontSize: "var(--fontSize-md)",
    gap: 8,
  },
  // .btn-large
  sizeLarge: {
    height: "var(--control-xl)",
    paddingInline: 24,
    fontSize: "var(--fontSize-lg)",
    gap: 10,
    borderRadius: "var(--radius-sm)",
  },
  // .btn-block
  block: {
    width: "100%",
    display: "flex",
  },
  // .btn-content 的 display/z-index/transform 部分
  contentBase: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    transform: "translateY(-0.5px)",
    minWidth: 0,
  },
  // .btn-content 的 gap: inherit 按 size 展开
  contentGapSmall: { gap: 6 },
  contentGapMedium: { gap: 8 },
  contentGapLarge: { gap: 10 },
  // .btn-content--loading
  contentLoading: {
    position: "absolute",
    inset: 0,
    transform: "none",
    gap: 0,
  },
  // .btn-leading（宽度按 size：small 14 / medium 16 / large 18）
  leadingBase: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  leadingSmall: { width: 14 },
  leadingMedium: { width: 16 },
  leadingLarge: { width: 18 },
  // .btn-spinner-wrap（::before 的 border 简写展开为 longhand 后覆盖左/右颜色）
  spinnerWrap: {
    position: "relative",
    display: "block",
    width: 16,
    height: 16,
    flex: "0 0 16px",
    boxSizing: "border-box",
    "::before": {
      content: '""',
      position: "absolute",
      inset: 0,
      boxSizing: "border-box",
      borderRadius: 999,
      borderWidth: 2,
      borderStyle: "solid",
      borderColor: "color-mix(in srgb, currentColor 36%, transparent)",
      borderLeftColor: "currentColor",
      borderRightColor: "currentColor",
      animationName: spin,
      animationDuration: "0.9s",
      animationTimingFunction: "linear",
      animationIterationCount: "infinite",
    },
  },
  // .btn-icon
  icon: {
    display: "flex",
    alignItems: "center",
  },
  // .btn-text
  text: {
    display: "inline-flex",
    alignItems: "center",
    minWidth: 0,
  },
  // .btn-primary（静态部分）
  variantPrimary: {
    backgroundColor: "var(--primary)",
    backgroundImage:
      "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.05) 100%)",
    color: "var(--textOnPrimary, var(--primaryText, #fff))",
    borderColor: "color-mix(in srgb, var(--text) 5%, transparent)",
    boxShadow:
      "inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(0, 0, 0, 0.1), 0 2px 4px color-mix(in srgb, var(--primary) 25%, transparent)",
  },
  // .btn-secondary（静态部分）
  variantSecondary: {
    backgroundColor: "var(--backgroundSecondary)",
    color: "var(--text)",
    borderColor: "var(--border)",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  },
  // .btn-ghost（静态部分）
  variantGhost: {
    backgroundColor: "transparent",
    color: "var(--textSecondary)",
    borderColor: "transparent",
    boxShadow: "none",
  },
  // .btn-danger（静态部分）
  variantDanger: {
    backgroundColor: "var(--error)",
    color: "white",
    borderColor: "color-mix(in srgb, var(--error) 60%, transparent)",
    boxShadow:
      "inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 6px 18px -14px color-mix(in srgb, var(--error) 38%, transparent)",
  },
  // .btn-primary:hover:not(.btn-disabled)
  hoverPrimary: {
    transform: {
      default: "translateY(-1px)",
      "@media (prefers-reduced-motion: reduce)": "none",
    },
    boxShadow:
      "inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 4px 12px color-mix(in srgb, var(--primary) 35%, transparent)",
    filter: "brightness(1.04)",
  },
  // .btn-secondary:hover:not(.btn-disabled)
  hoverSecondary: {
    backgroundColor: "var(--backgroundHover)",
    borderColor: "var(--borderHover)",
    transform: {
      default: "translateY(-1px)",
      "@media (prefers-reduced-motion: reduce)": "none",
    },
    boxShadow: "0 3px 8px rgba(0,0,0,0.08)",
  },
  // .btn-ghost:hover:not(.btn-disabled)
  hoverGhost: {
    backgroundColor: "var(--backgroundHover)",
    color: "var(--text)",
  },
  // .btn-danger:hover:not(.btn-disabled)
  hoverDanger: {
    transform: {
      default: "translateY(-1px)",
      "@media (prefers-reduced-motion: reduce)": "none",
    },
    boxShadow:
      "inset 0 1px 0 rgba(255, 255, 255, 0.16), 0 10px 24px -14px color-mix(in srgb, var(--error) 46%, transparent)",
    filter: "brightness(1.03)",
  },
  // .btn-primary:active:not(.btn-disabled)
  activePrimary: {
    transform: {
      default: "translateY(1px) scale(0.97)",
      "@media (prefers-reduced-motion: reduce)": "none",
    },
    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.15)",
    backgroundImage: "none",
  },
  // .btn-secondary:active:not(.btn-disabled)
  activeSecondary: {
    transform: {
      default: "translateY(1px) scale(0.97)",
      "@media (prefers-reduced-motion: reduce)": "none",
    },
    backgroundColor: "var(--backgroundTertiary)",
    boxShadow: "none",
  },
  // .btn-ghost:active:not(.btn-disabled)
  activeGhost: {
    backgroundColor: "var(--backgroundSecondary)",
    transform: {
      default: "scale(0.97)",
      "@media (prefers-reduced-motion: reduce)": "none",
    },
  },
  // .btn-danger:active:not(.btn-disabled)
  activeDanger: {
    transform: {
      default: "translateY(1px) scale(0.97)",
      "@media (prefers-reduced-motion: reduce)": "none",
    },
    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.14)",
  },
  // .btn:disabled / .btn[aria-disabled="true"] / .btn-disabled
  disabled: {
    opacity: 0.6,
    cursor: "not-allowed",
    boxShadow: "none",
    transform: "none",
    filter: "grayscale(0.2)",
  },
  // .btn:focus-visible（原 CSS 中位于 variant 规则之后，胜出同名冲突）
  focusRing: {
    ":focus-visible": {
      boxShadow:
        "0 0 0 2px var(--background), 0 0 0 4px color-mix(in srgb, var(--primary) 50%, transparent)",
    },
  },
});

/** 组件侧按 prop 取样的映射（stylex.create 键必须扁平，这里做一层索引）。 */
export const buttonSizeStyles = {
  small: buttonStyles.sizeSmall,
  medium: buttonStyles.sizeMedium,
  large: buttonStyles.sizeLarge,
} as const;

export const buttonContentGapStyles = {
  small: buttonStyles.contentGapSmall,
  medium: buttonStyles.contentGapMedium,
  large: buttonStyles.contentGapLarge,
} as const;

export const buttonLeadingStyles = {
  small: buttonStyles.leadingSmall,
  medium: buttonStyles.leadingMedium,
  large: buttonStyles.leadingLarge,
} as const;

export const buttonVariantStyles = {
  primary: buttonStyles.variantPrimary,
  secondary: buttonStyles.variantSecondary,
  ghost: buttonStyles.variantGhost,
  danger: buttonStyles.variantDanger,
} as const;

export const buttonHoverStyles = {
  primary: buttonStyles.hoverPrimary,
  secondary: buttonStyles.hoverSecondary,
  ghost: buttonStyles.hoverGhost,
  danger: buttonStyles.hoverDanger,
} as const;

export const buttonActiveStyles = {
  primary: buttonStyles.activePrimary,
  secondary: buttonStyles.activeSecondary,
  ghost: buttonStyles.activeGhost,
  danger: buttonStyles.activeDanger,
} as const;
