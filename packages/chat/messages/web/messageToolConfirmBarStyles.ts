import * as stylex from "@stylexjs/stylex";

/**
 * MessageToolConfirmBar 样式 —— StyleX 迁移
 * （自原 MessageToolConfirmBar.css 1:1 迁出）
 */
export const messageToolConfirmBarStyles = stylex.create({
  row: {
    marginTop: 12,
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: "var(--radius-sm)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--borderMuted, var(--borderLight))",
    background: "var(--surfaceInset, var(--surfaceRaised, var(--backgroundSecondary)))",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 8,
  },
  button: {
    height: 32,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: {
      default: "var(--borderMuted, var(--borderLight))",
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
    transition: "background 0.18s ease, color 0.18s ease, border-color 0.18s ease",
  },
  buttonDisabled: {
    opacity: 0.72,
    cursor: "default",
    borderColor: "var(--borderMuted, var(--borderLight))",
    background: "var(--surfaceInteractive, var(--backgroundSecondary))",
    color: "var(--textSecondary)",
  },
  status: {
    fontSize: "var(--fontSize-sm)",
    fontWeight: 500,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  statusSuccess: {
    color: "var(--success, #16a34a)",
  },
  statusFailed: {
    color: "var(--error, #dc2626)",
  },
});
