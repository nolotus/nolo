import * as stylex from "@stylexjs/stylex";

/**
 * ImageGenerationCard 样式 —— StyleX
 *
 * 设计手法参考 AICSS (aicss.dev) ImageGeneration 组件：
 * - 方形 canvas（aspect-ratio 1/1），内部点阵底 + 双层 mask 呼吸光斑
 * - 光斑：两个 radial-gradient mask，mask-size/position 被 ig-morph
 *   关键帧驱动四处游走 + ig-breathe 透明度呼吸（双层动画组合）
 * - 右上角等宽字体徽章（blur pill），下方 label shimmer 流光
 * - prefers-reduced-motion：光斑/闪烁均关闭，落为静态可读
 *
 * 主题感知：用仓库 token（surfaceInset/textMuted/primary 等）替代
 * aicss 的 #a1a1a1/#fafafa 硬编码。
 */

/* 光斑形态：两个椭圆 mask 游走（aicss ig-morph，4 帧循环） */
const igMorph = stylex.keyframes({
  "0%": {
    maskSize: "52% 46%, 40% 40%",
    maskPosition: "16% 20%, 30% 32%",
  },
  "25%": {
    maskSize: "46% 58%, 44% 38%",
    maskPosition: "84% 16%, 66% 30%",
  },
  "50%": {
    maskSize: "60% 44%, 38% 46%",
    maskPosition: "82% 84%, 62% 68%",
  },
  "75%": {
    maskSize: "48% 54%, 46% 40%",
    maskPosition: "14% 82%, 34% 66%",
  },
  "100%": {
    maskSize: "52% 46%, 40% 40%",
    maskPosition: "16% 20%, 30% 32%",
  },
});

/* 呼吸：透明度 0.55↔1 */
const igBreathe = stylex.keyframes({
  "0%, 100%": { opacity: 0.55 },
  "50%": { opacity: 1 },
});

/* label 流光（与 ThinkingSection labelShimmer 同款手法） */
const igShine = stylex.keyframes({
  "0%, 18%": { backgroundPosition: "100% 0" },
  "82%, 100%": { backgroundPosition: "0% 0" },
});

export const imageGenerationCardStyles = stylex.create({
  wrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 14,
    maxWidth: "100%",
    minWidth: 0,
    marginBottom: 8,
  },
  canvas: {
    position: "relative",
    width: "100%",
    maxWidth: 208,
    aspectRatio: "1 / 1",
    borderRadius: "var(--radius-md, 12px)",
    backgroundColor: "var(--surfaceInset, var(--surfaceRaised, var(--backgroundSecondary)))",
    overflow: "hidden",
  },
  dots: {
    position: "absolute",
    inset: 2,
    backgroundImage: "radial-gradient(circle, color-mix(in srgb, var(--textMuted, var(--textTertiary)) 55%, transparent) 0.7px, transparent 1.3px)",
    backgroundSize: "11px 11px",
    backgroundPosition: "0 0",
  },
  glow: {
    position: "absolute",
    inset: 0,
    backgroundImage: "radial-gradient(circle, color-mix(in srgb, var(--textMuted, var(--textTertiary)) 60%, transparent) 1.1px, transparent 1.6px)",
    backgroundSize: "11px 11px",
    WebkitMaskImage:
      "radial-gradient(48% 58% at 50% 42%, #000 0%, transparent 70%), radial-gradient(40% 40% at 30% 32%, #000 0%, transparent 70%)",
    maskImage:
      "radial-gradient(48% 58% at 50% 42%, #000 0%, transparent 70%), radial-gradient(40% 40% at 30% 32%, #000 0%, transparent 70%)",
    maskRepeat: "no-repeat, no-repeat",
    animationName: {
      default: igMorph,
      "@media (prefers-reduced-motion: reduce)": "none",
    },
    animationDuration: "4.2s",
    animationTimingFunction: "cubic-bezier(0.35, 1.55, 0.65, 1)",
    animationIterationCount: "infinite",
    "@media (prefers-reduced-motion: reduce)": {
      animationName: "none",
      opacity: 0.7,
    },
  },
  glowBreathe: {
    position: "absolute",
    inset: 0,
    backgroundColor: "var(--textMuted, var(--textTertiary))",
    maskImage: "radial-gradient(48% 58% at 50% 42%, #000 0%, transparent 70%), radial-gradient(40% 40% at 30% 32%, #000 0%, transparent 70%)",
    maskRepeat: "no-repeat, no-repeat",
    animationName: {
      default: igBreathe,
      "@media (prefers-reduced-motion: reduce)": "none",
    },
    animationDuration: "1.9s",
    animationTimingFunction: "cubic-bezier(0.66, 0, 0.34, 1)",
    animationIterationCount: "infinite",
    "@media (prefers-reduced-motion: reduce)": {
      animationName: "none",
      opacity: 0.7,
    },
  },
  res: {
    position: "absolute",
    top: 8,
    right: 8,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 11,
    color: "var(--textMuted, var(--textTertiary))",
    backgroundColor: "color-mix(in srgb, var(--background) 72%, transparent)",
    paddingTop: 2,
    paddingRight: 7,
    paddingBottom: 2,
    paddingLeft: 7,
    borderRadius: 999,
    backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)",
    userSelect: "none",
    whiteSpace: "nowrap",
  },
  meta: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    alignItems: "flex-start",
    textAlign: "left",
    width: "100%",
    maxWidth: 208,
  },
  label: {
    backgroundImage:
    "linear-gradient(90deg, var(--textPrimary) 0%, var(--textPrimary) 30%, color-mix(in srgb, var(--textPrimary) 45%, transparent) 45%, color-mix(in srgb, var(--textPrimary) 45%, transparent) 55%, var(--textPrimary) 70%, var(--textPrimary) 100%)",
    backgroundSize: "300% 100%",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
    WebkitTextFillColor: "transparent",
    animationName: {
      default: igShine,
      "@media (prefers-reduced-motion: reduce)": "none",
    },
    animationDuration: "2.25s",
    animationIterationCount: "infinite",
    animationTimingFunction: "cubic-bezier(0.25, 0.1, 0.25, 1)",
    fontWeight: 550,
    fontSize: 14,
    lineHeight: 1.4,
    "@media (prefers-reduced-motion: reduce)": {
      color: "var(--textPrimary)",
      WebkitTextFillColor: "var(--textPrimary)",
    },
  },
  hint: {
    color: "var(--textMuted, var(--textTertiary))",
    fontSize: 13,
    lineHeight: 1.5,
    wordBreak: "break-word",
  },
});
