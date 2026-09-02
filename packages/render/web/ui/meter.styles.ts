// 文件: render/web/ui/meter.styles.ts
import * as stylex from "@stylexjs/stylex";

/**
 * Meter 样式 —— StyleX 迁移（自 Meter.css 1:1 迁出，迁出后该文件已删除）
 *
 * 行为对应：
 * - `[data-hide-label]`（自身属性）→ 属性变体键；hideLabel 时 track 的
 *   grid-area 重置由 trackInFlow 变体显式挂载（原为祖先 + 后代选择器）。
 * - `--meter-fill-color` 为运行时值（按 percentage 计算颜色），保留在
 *   Meter.tsx 的 inline style 中，fill 通过 var() 引用。
 * - prefers-reduced-motion 与 forced-colors 媒体变体内嵌。
 */
export const meterStyles = stylex.create({
  // .react-aria-Meter.nolo-meter / .nolo-meter
  meter: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gridTemplateAreas: '"label value" "bar bar"',
    gap: "4px 8px",
    width: "100%",
    fontSize: "var(--fontSize-sm, 0.875rem)",
    color: "var(--text, #18181b)",
    forcedColorAdjust: "none",
  },
  // .nolo-meter[data-hide-label]
  hideLabel: {
    display: "block",
    gridTemplateAreas: "none",
    gridTemplateColumns: "none",
    gap: 0,
  },
  // .nolo-meter-label
  label: {
    gridArea: "label",
    color: "var(--textSecondary, #71717a)",
    fontSize: "var(--fontSize-xs, 0.75rem)",
    lineHeight: 1.3,
  },
  // .nolo-meter-value
  value: {
    gridArea: "value",
    color: "var(--textSecondary, #71717a)",
    fontSize: "var(--fontSize-xs, 0.75rem)",
    fontVariantNumeric: "tabular-nums",
    lineHeight: 1.3,
    textAlign: "right",
  },
  // .nolo-meter-track
  track: {
    gridArea: "bar",
    height: 6,
    width: "100%",
    borderRadius: 999,
    backgroundColor: "var(--backgroundSecondary, var(--borderLight, #e4e4e7))",
    overflow: "hidden",
    "@media (forced-colors: active)": {
      backgroundColor: "Canvas",
      borderWidth: "1px",
      borderStyle: "solid",
      borderColor: "ButtonText",
    },
  },
  // .nolo-meter[data-hide-label] .nolo-meter-track（hideLabel 时 grid-area 归 auto）
  trackInFlow: {
    gridArea: "auto",
  },
  // .nolo-meter-fill（宽度/颜色变量由 inline style 驱动）
  fill: {
    height: "100%",
    maxWidth: "100%",
    borderRadius: "inherit",
    backgroundColor: "var(--meter-fill-color, var(--primary, #1677ff))",
    transition: {
      default: "width 200ms ease, background-color 200ms ease",
      "@media (prefers-reduced-motion: reduce)": "none",
    },
    "@media (forced-colors: active)": {
      backgroundColor: "Highlight",
    },
  },
});
