// 文件: render/web/ui/switch.styles.ts
import * as stylex from "@stylexjs/stylex";

/**
 * Switch 样式 —— StyleX 迁移（自 Switch.css 1:1 迁出，迁出后该文件已删除）
 *
 * 原 CSS 是「父元素 data-* 改写 CSS 变量、后代消费」的状态机；迁移后由
 * Switch.tsx 用 react-aria renderProps（isSelected/isPressed/isFocusVisible/
 * isDisabled/isInvalid/loading）显式组合类，按源顺序覆盖等价级联：
 * - track：base → invalid → selected → focus-visible；disabled 阴影改外圈
 * - handle：base → selected（位移/原点/白底/内阴影）→ pressed（scale/圆角/
 *   按压底色）→ invalid&&pressed（透明底）→ forced-colors(selected)
 * 原 --indicator-color 变量无消费规则，未迁移。
 * oklch(from var(--tint) ...) 相对色与 forced-colors 媒体变体按字符串直传。
 */

const tint = "var(--primary, #1677ff)";
const borderColor = "var(--border, #d4d4d8)";
const invalidColor = "var(--error, #ef4444)";
const buttonBgPressed = "color-mix(in srgb, var(--primary, #1677ff) 30%, white)";
const trackHeight = 22; // --spacing(4px) * 5.5

export const switchStyles = stylex.create({
  // .react-aria-SwitchField
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-1, 4px)",
  },
  // [slot='description']（基础样式）
  description: {
    fontSize: "var(--fontSize-sm, 0.875rem)",
    color: "var(--textTertiary, #71717a)",
  },
  // .react-aria-SwitchField[data-disabled] [slot='description']
  descriptionDisabled: {
    color: "var(--textSecondary, #71717a)",
  },
  // .react-aria-SwitchButton
  button: {
    // 原 --spacing-1/--spacing-2 等局部变量已解算为直接值
    display: "flex",
    position: "relative",
    alignItems: "center",
    gap: "var(--space-2, 8px)",
    fontSize: "var(--fontSize-base, 1rem)",
    fontFamily: "system-ui",
    color: "var(--text, #18181b)",
    forcedColorAdjust: "none",
    WebkitTapHighlightColor: "transparent",
    cursor: "pointer",
  },
  // .react-aria-SwitchButton[data-loading]
  buttonLoading: {
    cursor: "wait",
  },
  // .react-aria-SwitchButton[data-disabled]
  buttonDisabled: {
    color: "var(--textSecondary, #71717a)",
    cursor: "not-allowed",
  },
  // .react-aria-SwitchButton .track
  track: {
    height: trackHeight,
    width: 38, // 4px * 9.5
    borderRadius: trackHeight,
    scale: 1,
    backgroundColor: "var(--backgroundSecondary, #e4e4e7)",
    boxShadow: `inset 0 0 0 1px ${borderColor}`,
    transition: {
      default:
        "background-color 200ms ease, box-shadow 200ms ease, scale 200ms ease",
      "@media (prefers-reduced-motion: reduce)": "none",
    },
  },
  // .react-aria-SwitchButton[data-invalid] .track
  trackInvalid: {
    backgroundColor: `color-mix(in srgb, ${invalidColor} 18%, transparent)`,
    boxShadow: `inset 0 0 0 1px ${invalidColor}`,
  },
  // .react-aria-SwitchButton[data-selected] .track
  trackSelected: {
    backgroundColor: tint,
    boxShadow: "none",
  },
  // .react-aria-SwitchButton[data-disabled] .track
  trackDisabled: {
    boxShadow: `0 0 0 1px ${borderColor}`,
  },
  // .react-aria-SwitchButton[data-focus-visible] .track
  trackFocusRing: {
    outline: `2px solid ${tint}`,
    outlineOffset: 2,
  },
  // .react-aria-SwitchButton .track .handle
  handle: {
    display: "block",
    height: "100%",
    aspectRatio: 1,
    borderRadius: trackHeight,
    transition: {
      default:
        "transform 200ms ease, scale 200ms ease, border-radius 200ms ease, background-color 200ms ease, box-shadow 200ms ease",
      "@media (prefers-reduced-motion: reduce)": "none",
    },
    transformOrigin: "0 50%",
    willChange: "transform",
    backgroundColor: "var(--background, white)",
    boxShadow: `inset 0 0 0 1px ${borderColor}, 0 1px 2px color-mix(in srgb, var(--text, #18181b) 18%, transparent)`,
  },
  // .react-aria-SwitchButton[data-selected] .handle（--border-color 此时 = tint）
  handleSelected: {
    transform: "translateX(20px)",
    transformOrigin: "36px 50%",
    backgroundColor: "white",
    boxShadow: `inset 0 0 0 1px ${tint}, inset 0 -4px 4px oklch(from var(--primary, #1677ff) 85% c h / 0.3)`,
    "@media (forced-colors: active)": {
      backgroundColor: "HighlightText",
      boxShadow: "inset 0 0 0 1px Highlight",
    },
  },
  // .react-aria-SwitchButton[data-pressed] .handle
  handlePressed: {
    scale: "1.2 1",
    borderRadius: `${trackHeight}px / ${trackHeight * 1.2}px`,
    backgroundColor: buttonBgPressed,
  },
  // .react-aria-SwitchButton[data-invalid][data-pressed] .handle
  handleInvalidPressed: {
    backgroundColor: "transparent",
  },
  // .react-aria-SwitchButton[data-disabled][data-selected] .handle（最终覆盖）
  handleDisabledSelected: {
    backgroundColor: "var(--backgroundSecondary, #e4e4e7)",
    boxShadow: "none",
  },
  // .react-aria-SwitchButton .switch-loading
  loading: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--textSecondary, #71717a)",
    zIndex: 1,
  },
  // .react-aria-SwitchButton[data-selected] .switch-loading
  loadingSelected: {
    color: "#ffffff",
  },
});
