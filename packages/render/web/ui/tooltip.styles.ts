// 文件: render/web/ui/tooltip.styles.ts
import * as stylex from "@stylexjs/stylex";

/**
 * Tooltip 样式 —— StyleX 迁移
 * （自原 ui.css「Tooltip (react-aria-components)」分区 1:1 迁出，迁出后该分区已删除）
 *
 * 原样式挂在 react-aria 自动类名 .react-aria-Tooltip 上；迁移后由 Tooltip.tsx
 * 显式传 className。行为对应：
 * - &[data-entering]/[data-exiting] → "[data-entering]"/"[data-exiting]" 变体键；
 *   入场位移经由元素级 CSS 变量 --origin（StyleX 允许 custom property key）。
 * - &[data-placement='...'] 的 margin/--origin → placement{Top,Bottom,Left,Right}
 *   按 placement 首词挂载（与 react-aria data-placement 行为一致）。
 * - & .react-aria-OverlayArrow svg（后代选择器）→ arrow 类直接挂 svg，
 *   各方向旋转由 arrowRotate* 按 placement 显式挂载。
 */
export const tooltipStyles = stylex.create({
  tooltip: {
    boxShadow: "0 4px 12px var(--shadowMedium, rgba(0, 0, 0, 0.08))",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--borderLight, var(--border, #e5e7eb))",
    borderRadius: "var(--radius-sm, 6px)",
    backgroundColor: "var(--background, #fff)",
    color: "var(--text, #292E32)",
    outline: "none",
    borderSpacing: 0,
    width: "max-content",
    maxWidth: 240,
    wordBreak: "break-word",
    fontSize: 12,
    lineHeight: 1.4,
    paddingBlock: 6,
    paddingInline: 10,
    // fixes FF gap
    transform: "translate3d(0, 0, 0)",
    transition: "transform 200ms, opacity 200ms",
    "[data-entering]": {
      transform: "var(--origin)",
      opacity: 0,
    },
    "[data-exiting]": {
      transform: "var(--origin)",
      opacity: 0,
    },
  },
  // [data-placement='top']
  placementTop: {
    marginBottom: 10,
    "--origin": "translateY(4px)",
  },
  // [data-placement='bottom']
  placementBottom: {
    marginTop: 10,
    "--origin": "translateY(-4px)",
  },
  // [data-placement='left']
  placementLeft: {
    marginRight: 10,
    "--origin": "translateX(4px)",
  },
  // [data-placement='right']
  placementRight: {
    marginLeft: 10,
    "--origin": "translateX(-4px)",
  },
  // .react-aria-OverlayArrow svg
  arrow: {
    display: "block",
    // 箭头颜色与背景一致，并配合容器描边
    fill: "var(--background, #fff)",
    stroke: "var(--borderLight, var(--border, #e5e7eb))",
    strokeWidth: "1px",
    overflow: "visible",
  },
  arrowRotateBottom: { transform: "rotate(180deg)" },
  arrowRotateRight: { transform: "rotate(90deg)" },
  arrowRotateLeft: { transform: "rotate(-90deg)" },
});

export type TooltipArrowStyle =
  | typeof tooltipStyles.arrowRotateBottom
  | typeof tooltipStyles.arrowRotateRight
  | typeof tooltipStyles.arrowRotateLeft;
