// 文件: render/web/ui/streamingIndicator.styles.ts
import * as stylex from "@stylexjs/stylex";

/**
 * StreamingIndicator 样式 —— StyleX 迁移
 * （自原 ui.css「StreamingIndicator」分区 1:1 迁出，含 bounce keyframes 与
 * prefers-reduced-motion，迁出后该分区已删除）
 *
 * 原 `.loading-indicator-wrap .streaming-indicator`（PageLoading 容器内的
 * !important 后代覆盖）改写为显式 bare 变体：PageLoading 挂 bare 即得
 * 「透明、无边框阴影、34px」裸形态；行为与原覆盖一致。
 * 原 `.loading-indicator-wrap .streaming-indicator .loading-spinner` 三层
 * 选择器在当前 DOM（streaming-indicator 内无 loading-spinner）无消费者，未迁移。
 * nth-child 动画延迟改为 dotDelay1/dotDelay2 显式类。
 */

const bounce = stylex.keyframes({
  "0%, 100%": { opacity: 0.22, transform: "translateY(0) scale(0.86)" },
  "25%": { opacity: 0.34, transform: "translateY(0) scale(0.9)" },
  "45%": { opacity: 0.92, transform: "translateY(-2px) scale(1)" },
  "65%": { opacity: 0.4, transform: "translateY(0) scale(0.92)" },
});

const reducedMotion = "@media (prefers-reduced-motion: reduce)";

export const indicatorStyles = stylex.create({
  // .streaming-indicator
  indicator: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minWidth: 28,
    height: 28,
    paddingInline: 7,
    borderRadius: 999,
    backgroundColor:
      "color-mix(in srgb, var(--backgroundSecondary) 88%, transparent)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "color-mix(in srgb, var(--borderLight) 82%, transparent)",
    boxShadow:
      "0 1px 2px color-mix(in srgb, var(--shadowLight) 82%, transparent), inset 0 1px 0 color-mix(in srgb, white 6%, transparent)",
    margin: 0,
    userSelect: "none",
    zIndex: 10,
  },
  // .loading-indicator-wrap .streaming-indicator（原 !important 后代覆盖 → bare 变体）
  bare: {
    backgroundColor: "transparent",
    boxShadow: "none",
    paddingInline: 0,
    borderWidth: 0,
    width: 34,
    height: 34,
  },
  // .streaming-indicator__dot
  dot: {
    width: 4,
    height: 4,
    borderRadius: 999,
    backgroundColor:
      "color-mix(in srgb, var(--primary) 42%, var(--textSecondary) 58%)",
    boxShadow: "0 0 0 0.5px color-mix(in srgb, white 12%, transparent)",
    opacity: 0.28,
    transform: "translateY(0) scale(0.88)",
    animationName: {
      default: bounce,
      [reducedMotion]: "none",
    },
    animationDuration: "1.28s",
    animationTimingFunction: "cubic-bezier(0.37, 0, 0.22, 1)",
    animationIterationCount: "infinite",
  },
  // .streaming-indicator__dot:nth-child(2)
  dotDelay1: {
    animationDelay: "0.16s",
  },
  // .streaming-indicator__dot:nth-child(3)
  dotDelay2: {
    animationDelay: "0.32s",
  },
  // RM 下 dot 静止且提亮
  dotReducedMotion: {
    "@media (prefers-reduced-motion: reduce)": {
      opacity: 0.58,
      transform: "none",
    },
  },
});
