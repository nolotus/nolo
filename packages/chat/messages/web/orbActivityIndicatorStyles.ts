import * as stylex from "@stylexjs/stylex";

/**
 * OrbActivityIndicator 样式 —— StyleX
 *
 * 设计手法学自 AICSS (aicss.dev) Orbs 组件（MIT）：
 * - 几何在 28px 舞台上创作，通过 --orbK 变量按 size 缩放，
 *   手调的 dot 尺寸/间距/相位在任何尺寸下都成立
 * - 每点用「负动画延时播种」把同一条关键帧变成
 *   波浪/彗星/追逐等相位差效果（非多条独立动画）
 * - 关键帧只动 opacity + scale，位移由静态定位完成，避免动画与
 *   定位互相覆盖
 * - prefers-reduced-motion 时动画关闭，落为静态中心点亮
 *
 * 渲染值（left/top/延迟/位移）由 TSX 按 variant 计算后内联传入；
 * 这里只放静态属性与动画曲线。
 */

const restInk = 0.14; // 未点亮格子的常驻墨量（S1/S3 lattice）
const dimInk = 0.07; // 完全静止格的墨量（S3 内部格）
const ringRest = 0.22; // ring 追逐的常驻墨量
const cometRest = 0.08; // ring C3 彗星的常驻墨量

/* Lattice S1/S3：波浪 / 彗星 */
const orbWave = stylex.keyframes({
  "0%": { opacity: restInk, transform: "scale(1)" },
  "28%": { opacity: 1, transform: "scale(1.18)" },
  "56%, 100%": { opacity: restInk, transform: "scale(1)" },
});

const orbComet = stylex.keyframes({
  "0%": { opacity: 1, transform: "scale(1.2)" },
  "45%, 100%": { opacity: restInk, transform: "scale(1)" },
});

/* Ring C1/C3：追逐 / 彗星流 */
const orbChase = stylex.keyframes({
  "0%, 11%": { opacity: 1 },
  "12.5%, 100%": { opacity: ringRest },
});

const orbRingComet = stylex.keyframes({
  "0%, 100%": { opacity: cometRest },
  "12%": { opacity: 1 },
  "35%": { opacity: 0.5 },
  "60%": { opacity: 0.12 },
});

export const orbActivityIndicatorStyles = stylex.create({
  root: {
    display: "inline-flex",
    alignItems: "center",
    verticalAlign: "middle",
    color: "currentColor",
    lineHeight: 0,
  },
  /**
   * 占位盒：宽高由组件内联 style 按 size 提供（默认 20），
   * 内部几何以 28px 舞台创作、按 --orbK = size/28 缩放，任意尺寸居中。
   */
  glyph: {
    position: "relative",
    display: "block",
    flex: "none",
    width: 20,
    height: 20,
    overflow: "hidden",
    contain: "strict",
  },
  /* 28px 舞台，scale(--orbK) 按 size 缩放；lattice 再平移使
     3×3 点阵（15px 宽）居中于舞台 */
  lattice: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 28,
    height: 28,
    transformOrigin: "0 0",
    transform: "scale(var(--orbK, 1)) translate(6.5px, 6.5px)",
  },
  cell: {
    position: "absolute",
    width: 3,
    height: 3,
    borderRadius: 999,
    backgroundColor: "currentColor",
    opacity: restInk,
  },
  cellStill: {
    opacity: dimInk,
  },
  cellWave: {
    animationName: {
      default: orbWave,
      "@media (prefers-reduced-motion: reduce)": "none",
    },
    animationDuration: "1.7s",
    animationTimingFunction: "cubic-bezier(0.66, 0, 0.34, 1)",
    animationIterationCount: "infinite",
    animationFillMode: "both",
    "@media (prefers-reduced-motion: reduce)": {
      opacity: 1,
      transform: "scale(1.08)",
    },
  },
  cellComet: {
    animationName: {
      default: orbComet,
      "@media (prefers-reduced-motion: reduce)": "none",
    },
    animationDuration: "1.7s",
    animationTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
    animationIterationCount: "infinite",
    animationFillMode: "both",
    "@media (prefers-reduced-motion: reduce)": {
      opacity: 1,
      transform: "scale(1.08)",
    },
  },
  ring: {
    position: "absolute",
    inset: 0,
    transform: "scale(var(--orbK, 1))",
  },
  ringDot: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 3,
    height: 3,
    margin: "-1.5px 0 0 -1.5px",
    borderRadius: 999,
    backgroundColor: "currentColor",
    opacity: ringRest,
  },
  ringDotChase: {
    animationName: {
      default: orbChase,
      "@media (prefers-reduced-motion: reduce)": "none",
    },
    animationDuration: "1.6s",
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
    animationFillMode: "both",
    "@media (prefers-reduced-motion: reduce)": {
      opacity: 0.7,
    },
  },
  ringDotComet: {
    animationName: {
      default: orbRingComet,
      "@media (prefers-reduced-motion: reduce)": "none",
    },
    animationDuration: "1.8s",
    animationTimingFunction: "ease-in-out",
    animationIterationCount: "infinite",
    animationFillMode: "both",
    "@media (prefers-reduced-motion: reduce)": {
      opacity: 0.7,
    },
  },
});
