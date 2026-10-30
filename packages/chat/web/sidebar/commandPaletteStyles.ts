import * as stylex from "@stylexjs/stylex";

/**
 * CommandPalette.tsx 的 StyleX 样式 —— 自原 CommandPalette.css 1:1 迁出
 * （2026-08-30）。与原 CSS 保持 1:1：同一元素、同一声明、同值。
 *
 * 与 RAC/全局 unlayered CSS 存在级联耦合的规则保留在
 * chatStylexEscapeHatch.css（hook: chat-esc-cp-*，按基线源码顺序）：
 * - overlay/modal 的 [data-entering]/[data-exiting] 动画与
 *   prefers-reduced-motion 覆盖（StyleX 不支持属性选择器）；
 * - search-input 基础/::placeholder/:focus（与 TextField.css
 *   .react-aria-Input 同特异性按捆绑顺序决胜，必须保持 unlayered
 *   并占用原 CSS 的 import 位置）；
 * - menu 基础与 [data-empty]、footer-hint 的 kbd 后代、item 图标
 *   `> svg`、section-header（与 Menu.css .react-aria-Menu[Item]/
 *   Kbd 样式同名属性竞争或需要组合选择器）。
 */
const overlayIn = stylex.keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

const modalIn = stylex.keyframes({
  from: { opacity: 0, transform: "translateY(-8px) scale(0.98)" },
  to: { opacity: 1, transform: "translateY(0) scale(1)" },
});

const spin = stylex.keyframes({
  to: { transform: "rotate(360deg)" },
});

export const commandPaletteStyles = stylex.create({
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: "var(--z-modalBackdrop, 1010)",
    backgroundColor: "rgba(0, 0, 0, 0.28)",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "min(18vh, 140px) var(--space-4) var(--space-4)",
    boxSizing: "border-box",
    outline: "none",
    "@media (max-width: 640px)": {
      alignItems: "flex-end",
      padding: 0,
    },
  },
  modal: {
    outline: "none",
    width: "min(92vw, 480px)",
    maxWidth: "100%",
    boxSizing: "border-box",
    "@media (max-width: 640px)": {
      width: "100%",
    },
  },
  dialog: {
    width: "100%",
    height: "auto",
    maxHeight: "min(70vh, 460px)",
    padding: 0,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: 0,
    outline: "none",
    backgroundColor: "var(--background, #fff)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--borderLight, var(--border, #e4e4e7))",
    borderRadius: "6px",
    boxShadow:
      "0 10px 28px -6px rgba(0, 0, 0, 0.12), 0 4px 10px -2px rgba(0, 0, 0, 0.05)",
    overflow: "hidden",
    "@media (max-width: 640px)": {
      maxHeight: "min(78vh, 520px)",
      borderRadius: "6px 6px 0 0",
    },
  },
  searchRow: {
    display: "flex",
    alignItems: "center",
    position: "relative",
    margin: 0,
    flexShrink: 0,
    height: "44px",
    boxSizing: "border-box",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "var(--borderSubtle, var(--borderLight, var(--border, #e4e4e7)))",
  },
  search: {
    display: "flex",
    alignItems: "center",
    position: "relative",
    margin: 0,
    flex: "1 1 auto",
    minWidth: 0,
    height: "100%",
    boxSizing: "border-box",
  },
  footer: {
    flexShrink: 0,
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "var(--space-3, 12px)",
    padding: "0 var(--space-3, 12px)",
    height: "32px",
    boxSizing: "border-box",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "var(--borderSubtle, var(--borderLight, var(--border, #e4e4e7)))",
    color: "var(--textTertiary, #8e8e93)",
    fontSize: "var(--fontSize-xs, 12px)",
  },
  footerHint: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
  },
  itemLabel: {
    minWidth: 0,
    flex: "1 1 auto",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  itemMeta: {
    flexShrink: 0,
    marginLeft: "auto",
    color: "var(--textTertiary)",
    fontSize: "var(--fontSize-xs, 12px)",
    fontWeight: 400,
  },
  spinner: {
    animationName: spin,
    animationDuration: "0.9s",
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
    color: "var(--textTertiary)",
    "@media (prefers-reduced-motion: reduce)": {
      animationName: "none",
    },
  },
  section: {
    display: "contents",
  },
});
