import * as stylex from "@stylexjs/stylex";

const spinSlow = stylex.keyframes({
  from: {
    transform: "rotate(0deg)",
  },
  to: {
    transform: "rotate(360deg)",
  },
});

/**
 * TodoCard 样式 —— StyleX 迁移
 * （自原 TodoCard.css 1:1 迁出）
 */
export const todoCardStyles = stylex.create({
  card: {
    position: "relative",
    width: "100%",
    maxWidth: 520,
    marginTop: 10,
    marginBottom: 10,
    paddingTop: 14,
    paddingBottom: 14,
    paddingLeft: 16,
    paddingRight: 16,
    borderRadius: "var(--radius-md, 10px)",
    background: "var(--surfaceInset, var(--backgroundSecondary, #f8f9fa))",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--borderMuted, var(--borderLight, #e5e7eb))",
    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.03)",
    fontFamily: "inherit",
    boxSizing: "border-box",
    overflow: "hidden",
    transition: "all 0.2s ease",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 10,
  },
  titleWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 600,
    fontSize: 14,
    color: "var(--textMain, #111827)",
  },
  headerIcon: {
    color: "var(--primary, #3b82f6)",
    flexShrink: 0,
  },
  progressText: {
    fontSize: 12,
    fontWeight: 500,
    color: "var(--textMuted, #6b7280)",
  },
  progressBarBg: {
    width: "100%",
    height: 4,
    background: "var(--borderMuted, #e5e7eb)",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressBarFill: {
    height: "100%",
    background: "var(--primary, #3b82f6)",
    borderRadius: 2,
    transition: "width 0.3s ease",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 8,
    paddingRight: 8,
    borderRadius: 6,
    transition: "background 0.15s ease",
    ":hover": {
      background: "var(--backgroundHover, rgba(0, 0, 0, 0.02))",
    },
  },
  icon: {
    flexShrink: 0,
  },
  iconDone: {
    color: "#10b981",
  },
  iconInProgress: {
    color: "#3b82f6",
    animationName: spinSlow,
    animationDuration: "3s",
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
  },
  iconPending: {
    color: "#9ca3af",
  },
  text: {
    fontSize: 13,
    color: "var(--textMain, #374151)",
    lineHeight: 1.4,
    wordBreak: "break-word",
  },
  textDone: {
    color: "var(--textMuted, #6b7280)",
    textDecoration: "line-through",
  },
  textInProgress: {
    fontWeight: 500,
    color: "var(--textMain, #111827)",
  },
});
