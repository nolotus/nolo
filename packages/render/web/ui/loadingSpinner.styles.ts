// 文件: render/web/ui/loadingSpinner.styles.ts
import * as stylex from "@stylexjs/stylex";

/**
 * LoadingSpinner 样式 —— StyleX 迁移
 * （自原 ui.css「LoadingSpinner」分区 1:1 迁出，含 loadingSpin keyframes，
 * 迁出后该分区已删除）
 *
 * animation 拆 longhand（shorthand 会被 StyleX 静默丢弃）；reduced-motion
 * 与原 CSS 一致：animation 整体归零，通过 RM 变体下 animationName: none 实现。
 * 尺寸（width/height/borderWidth）为运行时 props，保留 inline style。
 */

const spin = stylex.keyframes({
  "0%": { transform: "rotate(0deg)" },
  "100%": { transform: "rotate(360deg)" },
});

export const spinnerStyles = stylex.create({
  // .loading-spinner
  spinner: {
    display: "inline-block",
    boxSizing: "border-box",
    borderRadius: 999,
    borderStyle: "solid",
    borderColor: "var(--backgroundTertiary)",
    borderLeftColor: "var(--primary)",
    animationName: {
      default: spin,
      "@media (prefers-reduced-motion: reduce)": "none",
    },
    animationDuration: "0.9s",
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
    boxShadow: "0 1px 3px var(--shadowLight)",
  },
});
