import * as stylex from "@stylexjs/stylex";

/**
 * ThinkingSection 样式 —— StyleX 迁移
 * （自原 ThinkingSection.css 1:1 迁出）
 */
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
  statusIndicator: {
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: "color-mix(in srgb, var(--primary) 32%, var(--textTertiary))",
    boxShadow: "0 0 0 2px color-mix(in srgb, var(--primary) 8%, transparent)",
    flexShrink: 0,
    opacity: 0.9,
  },
  content: {
    overflow: "hidden",
    transition: {
      default: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      "@media (prefers-reduced-motion: reduce)": "none",
    },
  },
  contentCollapsed: {
    maxHeight: 0,
    opacity: 0,
    marginTop: 0,
  },
  contentExpanded: {
    maxHeight: 2000,
    opacity: 1,
    marginTop: 6,
  },
  inner: {
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
