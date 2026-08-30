import * as stylex from "@stylexjs/stylex";

const actionSpin = stylex.keyframes({
  to: {
    transform: "rotate(360deg)",
  },
});

const backdropFadeIn = stylex.keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

const panelSlideUp = stylex.keyframes({
  from: { transform: "translateY(100%)" },
  to: { transform: "translateY(0)" },
});

/**
 * MessageActions 样式 —— StyleX 迁移
 * （自原 MessageActions.css 1:1 迁出）
 */
export const messageActionsStyles = stylex.create({
  actionsDesktop: {
    position: "static",
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 0,
    margin: 0,
    padding: 2,
    background: "transparent",
    border: "none",
    borderRadius: "var(--radius-xs)",
    boxShadow: "none",
    opacity: 0,
    visibility: "hidden",
    pointerEvents: "none",
    transition: "opacity 0.15s ease, visibility 0.15s ease",
  },
  actionBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 26,
    height: 26,
    border: "none",
    borderRadius: "var(--radius-xs)",
    background: {
      default: "transparent",
      ":hover": "var(--surfaceInteractiveHover, var(--backgroundHover))",
    },
    color: {
      default: "var(--textMuted, var(--textSecondary))",
      ":hover": "var(--text)",
    },
    cursor: "pointer",
    transition: "color 0.12s ease, background 0.12s ease",
  },
  actionBtnActive: {
    color: "var(--primary)",
    background: "var(--surfaceInteractiveActive, var(--primaryGhost))",
  },
  actionBtnDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
    pointerEvents: "none",
  },
  actionBtnBusy: {
    cursor: "wait",
    pointerEvents: "none",
  },
  actionSpinner: {
    width: 14,
    height: 14,
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "currentColor",
    borderTopColor: "transparent",
    borderRadius: "50%",
    animationName: actionSpin,
    animationDuration: "0.75s",
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
    display: "inline-block",
    boxSizing: "border-box",
  },
  actionSpinnerLarge: {
    width: 18,
    height: 18,
  },
  actionsOverlayMobile: {
    position: "fixed",
    inset: 0,
    zIndex: 999,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  overlayBackdrop: {
    position: "absolute",
    inset: 0,
    background: "rgba(0, 0, 0, 0.4)",
    backdropFilter: "blur(2px)",
    animationName: backdropFadeIn,
    animationDuration: "0.2s",
    animationTimingFunction: "ease-out",
  },
  actionsPanel: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: 480,
    background: "var(--surfaceRaised, var(--background))",
    borderTopLeftRadius: "var(--radius-lg)",
    borderTopRightRadius: "var(--radius-lg)",
    boxShadow: "0 -4px 16px rgba(0, 0, 0, 0.15)",
    animationName: panelSlideUp,
    animationDuration: "0.25s",
    animationTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
    padding: 0,
    border: "none",
    margin: 0,
  },
  panelHeader: {
    display: "flex",
    justifyContent: "center",
    paddingTop: "var(--space-2)",
    paddingBottom: "var(--space-2)",
    paddingLeft: 0,
    paddingRight: 0,
  },
  panelIndicator: {
    width: 36,
    height: 4,
    background: "var(--borderHover, var(--border))",
    borderRadius: 2,
  },
  actionsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "var(--space-2)",
    paddingTop: "var(--space-2)",
    paddingBottom: "var(--space-4)",
    paddingLeft: "var(--space-3)",
    paddingRight: "var(--space-3)",
  },
  actionItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--space-2)",
    paddingTop: "var(--space-3)",
    paddingBottom: "var(--space-3)",
    paddingLeft: "var(--space-2)",
    paddingRight: "var(--space-2)",
    background: {
      default: "transparent",
      ":active": "var(--surfaceInteractiveHover, var(--backgroundHover))",
    },
    transform: {
      default: "none",
      ":active": "scale(0.96)",
    },
    border: "none",
    borderRadius: "var(--radius-md)",
    color: "var(--textSecondary)",
    cursor: "pointer",
    transition: "all 0.15s ease",
    minHeight: 72,
  },
  actionItemActive: {
    color: "var(--primary)",
  },
  actionIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: 44,
    borderRadius: "var(--radius-md)",
    background: "var(--surfaceInset, var(--backgroundSecondary))",
    color: "var(--textSecondary)",
    transition: "all 0.15s ease",
  },
  actionIconActive: {
    background: "var(--primaryGhost)",
    color: "var(--primary)",
  },
  actionLabel: {
    fontSize: "var(--fontSize-xs)",
    fontWeight: 500,
    textAlign: "center",
    lineHeight: "var(--leading-tight)",
  },
});
