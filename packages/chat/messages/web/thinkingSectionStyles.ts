import * as stylex from "@stylexjs/stylex";

/**
 * ThinkingSection 样式 —— StyleX
 *
 * 设计手法学自 AICSS (aicss.dev) Thinking State + Thinking + Reasoning：
 * - 思考中 label 用「文字 shimmer 流光」（background-clip:text + 亮度谷扫过）
 * - 思考中 toggle 指示用 OrbActivityIndicator（s1-thinking 中心扩散波）
 * - 折叠动画用 grid-template-rows 1fr→0fr（替代 maxHeight 硬编码，
 *   展开方向平滑、无固定高度上限；折叠方向因子树同步卸载为瞬时收起）
 */
const labelShine = stylex.keyframes({
  "0%, 18%": { backgroundPosition: "100% 0" },
  "82%, 100%": { backgroundPosition: "0% 0" },
});

export const thinkingSectionStyles = stylex.create({
  container: {
    marginBottom: 10,
  },
  toggle: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    paddingTop: 3,
    paddingBottom: 3,
    paddingLeft: 8,
    paddingRight: 8,
    backgroundColor: {
      default: "transparent",
      ":hover": "var(--surfaceInset, var(--surfaceInteractiveHover, var(--backgroundHover)))",
    },
    borderWidth: 0,
    borderStyle: "none",
    borderRadius: 999,
    color: {
      default: "var(--textMuted, var(--textTertiary))",
      ":hover": "var(--textSecondary)",
    },
    fontSize: "var(--fontSize-xs)",
    fontWeight: 500,
    cursor: "pointer",
    transition: "background 0.18s ease, color 0.18s ease",
    width: "fit-content",
    marginLeft: -2,
    userSelect: "none",
  },
  icon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "inherit",
    opacity: 0.72,
  },
  label: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  /**
   * 思考中 label：aicss Thinking State 的 shimmer 流光。
   * 渐变亮度谷周期扫过文字，保持主题感知（用现有 text token + color-mix）。
   */
  labelShimmer: {
    color: "transparent",
    WebkitTextFillColor: "transparent",
    background:
      "linear-gradient(90deg, var(--textMuted, var(--textTertiary)) 0%, var(--textMuted, var(--textTertiary)) 30%, color-mix(in srgb, var(--textMuted, var(--textTertiary)) 45%, transparent) 45%, color-mix(in srgb, var(--textMuted, var(--textTertiary)) 45%, transparent) 55%, var(--textMuted, var(--textTertiary)) 70%, var(--textMuted, var(--textTertiary)) 100%)",
    backgroundSize: "300% 100%",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    animationName: {
      default: labelShine,
      "@media (prefers-reduced-motion: reduce)": "none",
    },
    animationDuration: "2.25s",
    animationIterationCount: "infinite",
    animationTimingFunction: "cubic-bezier(0.25, 0.1, 0.25, 1)",
  },
  statusIndicator: {
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: "color-mix(in srgb, var(--primary) 32%, var(--textTertiary))",
    boxShadow: "0 0 0 2px color-mix(in srgb, var(--primary) 8%, transparent)",
    flexShrink: 0,
    opacity: 0.9,
  },
  /**
   * 折叠容器：grid-template-rows 动画。
   * 注意：ThinkingSection 在折叠时同时卸载子树（{isExpanded && ...}），
   * 因此 grid 1fr↔0fr 只在「展开方向」提供平滑动画；折叠方向因子树
   * 同步卸载为瞬时收起（alpha 既有行为，非本次引入）。保留 grid 写法
   * 使展开动画摆脱 maxHeight 硬编码上限（内容超高时仍平滑展开）。
   */
  content: {
    display: "grid",
    gridTemplateRows: "1fr",
    transition: {
      default:
        "grid-template-rows 360ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease, margin-top 360ms cubic-bezier(0.22, 1, 0.36, 1)",
      "@media (prefers-reduced-motion: reduce)": "none",
    },
  },
  contentCollapsed: {
    gridTemplateRows: "0fr",
    opacity: 0,
    marginTop: 0,
    pointerEvents: "none",
  },
  contentExpanded: {
    gridTemplateRows: "1fr",
    opacity: 1,
    marginTop: 6,
  },
  inner: {
    minHeight: 0,
    overflow: "hidden",
    marginLeft: 8,
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftStyle: "solid",
    borderLeftColor: "var(--borderMuted, var(--borderLight))",
    position: "relative",
  },
  editorWrapper: {
    fontSize: "var(--fontSize-sm)",
    color: "var(--textMuted, var(--textTertiary))",
    lineHeight: "var(--leading-relaxed)",
    opacity: 0.9,
  },
});
