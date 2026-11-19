import * as stylex from "@stylexjs/stylex";

const suggestionMenuEnter = stylex.keyframes({
  from: {
    opacity: 0,
    transform: "translateY(var(--popover-travel, 6px)) scale(0.96)",
  },
  to: {
    opacity: 1,
    transform: "translateY(0) scale(1)",
  },
});

export const composerSuggestionStyles = stylex.create({
  menu: {
    position: "absolute",
    left: 0,
    bottom: "100%",
    marginBottom: "4px",
    width: "max-content",
    maxWidth: "min(260px, 100%)",
    maxHeight: "240px",
    overflowY: "auto",
    overscrollBehavior: "contain",
    backgroundColor: "var(--background)",
    borderRadius: "var(--radius-xs)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--border)",
    boxShadow: "0 4px 12px var(--shadowMedium)",
    zIndex: 20,
    transformOrigin: "bottom left",
    animationName: {
      default: suggestionMenuEnter,
      "@media (prefers-reduced-motion: reduce)": "none",
    },
    animationDuration: "var(--popover-duration, 0.16s)",
    animationTimingFunction: "var(--popover-ease, cubic-bezier(0.22, 1, 0.36, 1))",
    animationFillMode: "both",
  },
  menuHeader: {
    padding: "4px 10px",
    fontSize: "var(--fontSize-sm)",
    color: "var(--textSecondary)",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "var(--border)",
  },
  menuList: {
    listStyle: "none",
    margin: 0,
    padding: "4px 0",
  },
  menuItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 10px",
    cursor: "pointer",
    fontSize: "var(--fontSize-sm)",
    color: "var(--text)",
    borderLeftWidth: "3px",
    borderLeftStyle: "solid",
    borderLeftColor: "transparent",
    borderRadius: "var(--radius-xs)",
    margin: "1px 4px",
    transition: "background 0.12s ease-out, border-color 0.12s ease-out",
    ":hover": {
      backgroundColor: "rgba(37, 99, 235, 0.08)",
      borderLeftColor: "var(--primary, #2563eb)",
    },
  },
  menuItemActive: {
    backgroundColor: "rgba(37, 99, 235, 0.08)",
    borderLeftColor: "var(--primary, #2563eb)",
  },
  menuItemLabel: {
    fontWeight: 500,
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  menuItemDescription: {
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    textAlign: "right",
    fontSize: "var(--fontSize-xs)",
    color: "var(--textSecondary)",
  },
});
