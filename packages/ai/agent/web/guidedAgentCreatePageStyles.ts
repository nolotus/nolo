import * as stylex from "@stylexjs/stylex";

export const guidedAgentCreatePageStyles = stylex.create({
  container: {
    width: "min(960px, calc(100% - 44px))",
    margin: "0 auto",
    padding: "24px 0 32px",
    color: "var(--text)",
    boxSizing: "border-box",
    "@media (max-width: 900px)": {
      width: "calc(100% - 24px)",
      padding: "14px 0 24px",
    },
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    marginBottom: "16px",
  },
  icon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "36px",
    height: "36px",
    borderRadius: "var(--radius-lg, 8px)",
    backgroundColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
    color: "var(--primary)",
    flex: "0 0 auto",
  },
  headerTitle: {
    margin: 0,
    fontSize: "21px",
    lineHeight: 1.25,
    color: "var(--text)",
  },
  headerSubtitle: {
    maxWidth: "720px",
    margin: "5px 0 0",
    color: "var(--textSecondary)",
    lineHeight: 1.55,
  },
  form: {
    minWidth: 0,
    backgroundColor: "transparent",
    boxShadow: "none",
    padding: 0,
    "@media (max-width: 900px)": {
      padding: 0,
    },
  },
});
