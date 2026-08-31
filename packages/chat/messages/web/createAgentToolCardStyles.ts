import * as stylex from "@stylexjs/stylex";

/**
 * CreateAgentToolCard 样式 —— StyleX 迁移
 * （自原 CreateAgentToolCard.css 1:1 迁出）
 */
export const createAgentToolCardStyles = stylex.create({
  card: {
    position: "relative",
    width: "100%",
    maxWidth: 520,
    padding: 1,
    borderRadius: "var(--radius-sm)",
    backgroundColor: "var(--surfaceInset, var(--surfaceRaised, var(--backgroundSecondary)))",
    overflow: "hidden",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: {
      default: "var(--borderMuted, var(--borderLight))",
      ":hover": "var(--borderSubtle)",
    },
    boxShadow: {
      default: "none",
      ":hover": "0 10px 24px -22px var(--shadowMedium)",
    },
    marginTop: 8,
    marginBottom: 8,
  },
  glow: {
    position: "absolute",
    top: "-30%",
    left: "-30%",
    width: "80%",
    height: "80%",
    backgroundImage: "radial-gradient(circle, rgba(var(--primaryRGB, 100, 100, 255), 0.05), transparent 70%)",
    pointerEvents: "none",
  },
  content: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: {
      default: 14,
      "@media (max-width: 480px)": 10,
    },
    paddingBottom: {
      default: 14,
      "@media (max-width: 480px)": 10,
    },
    paddingLeft: {
      default: 18,
      "@media (max-width: 480px)": 14,
    },
    paddingRight: {
      default: 18,
      "@media (max-width: 480px)": 14,
    },
    backgroundColor: "var(--surfaceInset, var(--background))",
    borderRadius: "var(--radius-sm)",
    gap: 16,
  },
  left: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    flex: 1,
    minWidth: 0,
  },
  avatarWrap: {
    position: "relative",
    flexShrink: 0,
  },
  avatar: {
    width: {
      default: 48,
      "@media (max-width: 480px)": 40,
    },
    height: {
      default: 48,
      "@media (max-width: 480px)": 40,
    },
    borderRadius: "var(--radius-sm)",
    backgroundColor: "var(--surfaceInteractive, var(--backgroundSecondary))",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--borderMuted, var(--borderLight))",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--primary)",
  },
  statusDot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: "50%",
    backgroundColor: "var(--success)",
    borderWidth: 2.5,
    borderStyle: "solid",
    borderColor: "var(--backgroundPrimary)",
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  name: {
    fontSize: "var(--fontSize-base)",
    fontWeight: 700,
    color: "var(--textPrimary)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  publicBadge: {
    color: "var(--primary)",
    opacity: 0.9,
  },
  meta: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 5,
  },
  metaItem: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: "var(--fontSize-sm)",
    color: "var(--textSecondary)",
    fontWeight: 500,
  },
  metaSep: {
    fontSize: "var(--fontSize-xs)",
    color: "var(--borderSubtle)",
  },
  intro: {
    fontSize: "var(--fontSize-sm)",
    color: "var(--textSecondary)",
    lineHeight: "var(--leading-normal)",
    margin: 0,
    opacity: 0.92,
    display: {
      default: "block",
      "@media (max-width: 480px)": "none",
    },
  },
  right: {
    flexShrink: 0,
  },
  actionBtn: {
    height: {
      default: "var(--control-lg)",
      "@media (max-width: 480px)": "var(--control-md)",
    },
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: {
      default: 20,
      "@media (max-width: 480px)": 14,
    },
    paddingRight: {
      default: 20,
      "@media (max-width: 480px)": 14,
    },
    backgroundColor: {
      default: "var(--accentSoft, var(--primaryGhost))",
      ":hover": "var(--accentSoft, var(--primaryGhost))",
    },
    color: "var(--primary)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: {
      default: "color-mix(in srgb, var(--primary) 18%, transparent)",
      ":hover": "color-mix(in srgb, var(--primary) 24%, transparent)",
    },
    borderRadius: "var(--radius-sm)",
    fontSize: "var(--fontSize-sm)",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.18s ease, border-color 0.18s ease, transform 0.18s ease",
    transform: {
      default: "none",
      ":hover": "translateY(-1px)",
      ":active": "translateY(0)",
    },
  },
  actionBtnDisabled: {
    opacity: 0.5,
    cursor: "default",
    transform: "none",
    boxShadow: "none",
  },
  truncate2: {
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
});
