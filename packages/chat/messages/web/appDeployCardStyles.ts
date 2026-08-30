import * as stylex from "@stylexjs/stylex";

const adcSpin = stylex.keyframes({
  from: { transform: "rotate(0deg)" },
  to: { transform: "rotate(360deg)" },
});

/**
 * AppDeployCard 样式 —— StyleX 迁移
 * （自原 AppDeployCard.css 1:1 迁出）
 */
export const appDeployCardStyles = stylex.create({
  card: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--borderMuted, var(--border))",
    borderRadius: "var(--radius-md)",
    overflow: "hidden",
    marginTop: 8,
    background: "var(--surfaceInset, var(--background))",
    boxShadow: "0 10px 24px -22px var(--shadowMedium)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 14,
    paddingRight: 14,
    gap: 10,
    background: "var(--surfaceInset, var(--backgroundGhost))",
    flexWrap: {
      default: "nowrap",
      "@media (max-width: 768px)": "wrap",
    },
  },
  info: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  icon: {
    color: "var(--primary)",
    flexShrink: 0,
  },
  name: {
    fontSize: "var(--fontSize-base)",
    fontWeight: 600,
    color: "var(--text)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
    width: {
      default: "auto",
      "@media (max-width: 768px)": "100%",
    },
    justifyContent: {
      default: "flex-start",
      "@media (max-width: 768px)": "flex-end",
    },
  },
  btn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    paddingTop: 7,
    paddingBottom: 7,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: {
      default: "var(--borderMuted, var(--border))",
      ":hover": "var(--borderSubtle)",
    },
    background: {
      default: "var(--surfaceInteractive, var(--backgroundSecondary))",
      ":hover": "var(--surfaceInteractiveHover, var(--backgroundHover))",
    },
    color: {
      default: "var(--textSecondary)",
      ":hover": "var(--text)",
    },
    fontSize: "var(--fontSize-sm)",
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "none",
    lineHeight: 1,
    transition: "background 0.18s ease, color 0.18s ease, border-color 0.18s ease",
  },
  btnPrimary: {
    background: {
      default: "var(--primary)",
      ":hover": "var(--primaryHover, var(--primary))",
    },
    color: "var(--primaryText, #fff)",
    borderColor: {
      default: "var(--primary)",
      ":hover": "var(--primaryHover, var(--primary))",
    },
  },
  frameWrapper: {
    position: "relative",
    background: "var(--surfaceInset, var(--backgroundGhost))",
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: "var(--borderMuted, var(--borderLight))",
  },
  frame: {
    width: "100%",
    height: {
      default: "min(68vh, 560px)",
      "@media (max-width: 768px)": "min(72vh, 620px)",
    },
    border: "none",
    display: "block",
    background: "var(--surfaceRaised, #fff)",
  },
  frameLoading: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    background: "color-mix(in srgb, var(--surfaceRaised, var(--background)) 82%, transparent)",
    backdropFilter: "blur(4px)",
    color: "var(--textSecondary)",
    fontSize: "var(--fontSize-sm)",
    zIndex: 2,
  },
  spinner: {
    animationName: adcSpin,
    animationDuration: "1s",
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
    color: "var(--primary)",
  },
  error: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 14,
    paddingRight: 14,
    color: "var(--textTertiary)",
    fontSize: "var(--fontSize-sm)",
    background: "var(--surfaceInset, var(--backgroundGhost))",
  },
});
