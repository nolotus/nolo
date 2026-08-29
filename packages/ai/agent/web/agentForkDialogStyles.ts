import * as stylex from "@stylexjs/stylex";

export const agentForkDialogStyles = stylex.create({
  body: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "4px 0",
  },
  targetLabel: {
    fontSize: "var(--fontSize-sm, 13px)",
    fontWeight: 500,
    color: "var(--textSecondary, var(--text))",
  },
  options: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    maxHeight: "320px",
    overflowY: "auto",
  },
  option: {
    padding: "8px 12px",
    backgroundColor: "var(--background)",
    borderRadius: "var(--radius-sm, 8px)",
    transitionProperty: "background",
    transitionDuration: "0.2s",
    transitionTimingFunction: "ease",
    ":hover": {
      backgroundColor: "var(--backgroundHover, color-mix(in srgb, var(--background) 96%, black 4%))",
    },
  },
  optionLabel: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    cursor: "pointer",
    fontSize: "var(--fontSize-base, 14px)",
    color: "var(--text)",
  },
  optionInput: {
    flexShrink: 0,
    cursor: "pointer",
  },
});
