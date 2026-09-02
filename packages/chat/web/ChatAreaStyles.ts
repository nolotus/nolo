import * as stylex from "@stylexjs/stylex";

/**
 * ChatArea.tsx 的 StyleX 样式 —— 自原 ChatArea.css 1:1 迁出（2026-08-30）。
 *
 * 与原 CSS 保持 1:1：同一元素、同一声明、同值；
 * 原 `animation: message-input-fade-in ...` 引用的 keyframes 定义在
 * message-input.css 内，此处以 stylex.keyframes 等值内联（fade-in），
 * 删除跨文件名依赖。
 *
 * 无 hover/selected 变体阶梯，无属性竞争规则，本文件无需逃生舱规则。
 */
const fadeIn = stylex.keyframes({
  from: {
    opacity: 0,
    transform: "translateY(6px)",
  },
  to: {
    opacity: 1,
    transform: "translateY(0)",
  },
});

export const chatAreaStyles = stylex.create({
  area: {
    position: "relative",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
  },
  dropOverlay: {
    position: "absolute",
    inset: 0,
    zIndex: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
    color: "var(--primary)",
    fontSize: "var(--fontSize-base)",
    fontWeight: 600,
    backgroundColor: "color-mix(in srgb, var(--background) 86%, transparent)",
    borderWidth: "2px",
    borderStyle: "dashed",
    borderColor: "var(--primary)",
    borderRadius: "var(--radius-md)",
    backdropFilter: "blur(6px)",
    animationName: fadeIn,
    animationDuration: "0.2s",
    animationTimingFunction: "ease-out",
    animationFillMode: "forwards",
  },
});
