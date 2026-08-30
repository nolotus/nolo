import * as stylex from "@stylexjs/stylex";

const spin = stylex.keyframes({
  from: { transform: "rotate(0deg)" },
  to: { transform: "rotate(360deg)" },
});

/**
 * FileItem 样式 —— StyleX 迁移
 * （自原 FileItem.css 1:1 迁出）
 */
export const fileItemStyles = stylex.create({
  item: {
    display: "inline-flex",
    alignItems: "center",
    position: "relative",
    transition: {
      default: "transform .2s ease, background .2s ease, border-color .2s ease",
      "@media (prefers-reduced-motion: reduce)": "none",
    },
    color: "var(--file-color, var(--textSecondary))",
    borderRadius: "var(--radius-xs)",
    fontWeight: 500,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--border)",
    background: "var(--background)",
  },
  message: {
    gap: "var(--space-2)",
    paddingTop: "var(--space-2)",
    paddingBottom: "var(--space-2)",
    paddingLeft: "var(--space-3)",
    paddingRight: "var(--space-3)",
    background: "var(--backgroundSecondary)",
    fontSize: {
      default: "var(--fontSize-base)",
      "@media (max-width: 768px)": "var(--fontSize-sm)",
    },
    maxWidth: {
      default: 280,
      "@media (max-width: 768px)": 200,
    },
  },
  attachment: {
    gap: "var(--space-2)",
    padding: "var(--space-2)",
    width: "fit-content",
    maxWidth: 120,
    minHeight: 44,
  },
  attachmentMobile: {
    maxWidth: 110,
    paddingTop: "var(--space-2)",
    paddingBottom: "var(--space-2)",
    paddingLeft: "var(--space-3)",
    paddingRight: "var(--space-3)",
  },
  iconWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "var(--radius-xs)",
    transition: {
      default: "all .2s ease",
      "@media (prefers-reduced-motion: reduce)": "none",
    },
    flexShrink: 0,
  },
  iconWrapperMessage: {
    width: 28,
    height: 28,
    background: "var(--surfaceInset, var(--surfaceInteractiveHover, var(--backgroundHover)))",
  },
  iconWrapperAttachment: {
    width: 24,
    height: 24,
    background: "var(--surfaceInset, var(--surfaceInteractiveHover, var(--backgroundHover)))",
  },
  icon: {
    transition: "all .2s ease",
  },
  name: {
    fontWeight: 500,
    color: "var(--text)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  nameMessage: {
    fontSize: "var(--fontSize-sm)",
    maxWidth: 160,
  },
  nameAttachment: {
    fontSize: "var(--fontSize-xs)",
    maxWidth: 60,
  },
  ext: {
    color: "var(--textMuted, var(--textTertiary))",
    fontSize: "var(--fontSize-xs)",
    flexShrink: 0,
  },
  processing: {
    opacity: 0.7,
    pointerEvents: "none",
  },
  spinner: {
    width: 12,
    height: 12,
    borderWidth: 1.5,
    borderStyle: "solid",
    borderColor: "var(--primary)",
    borderTopColor: "transparent",
    borderRadius: "50%",
    animationName: spin,
    animationDuration: "1s",
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
  },
  error: {
    borderColor: "var(--error)",
    background: "var(--errorGhost)",
    pointerEvents: "none",
  },
  errorIndicator: {
    position: "absolute",
    top: 2,
    right: 2,
    fontSize: "var(--fontSize-xs)",
    zIndex: 1,
  },
});
