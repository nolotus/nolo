import * as stylex from "@stylexjs/stylex";

const slideInKeyframes = stylex.keyframes({
  "0%": { opacity: 0, transform: "translateY(-10px)" },
  "100%": { opacity: 1, transform: "translateY(0)" },
});

/**
 * EmailAdmin 页面样式。
 *
 * 与原 CSS 保持 1:1：同一元素、同一声明、同值（var(--global-*) 原样保留）。
 * 全部 longhand：禁止 shorthand。
 * - background → backgroundColor / backgroundImage
 * - flex → flexGrow/flexShrink/flexBasis
 * - gap → rowGap/columnGap
 * - margin/padding/border/borderRadius 拆方向 longhand
 */
export const emailAdminStyles = stylex.create({
  root: {
    maxWidth: "1200px",
    marginTop: 0,
    marginRight: "auto",
    marginBottom: 0,
    marginLeft: "auto",
    paddingTop: "40px",
    paddingRight: "24px",
    paddingBottom: "40px",
    paddingLeft: "24px",
    minHeight: "100vh",
    color: "var(--text)",
    transitionProperty: "all",
    transitionDuration: "0.3s",
    transitionTimingFunction: "ease",
  },

  unauthorized: {
    maxWidth: "640px",
    marginTop: "80px",
    marginRight: "auto",
    marginBottom: "80px",
    marginLeft: "auto",
    paddingTop: 0,
    paddingRight: "24px",
    paddingBottom: 0,
    paddingLeft: "24px",
    color: "var(--textSecondary)",
  },

  header: {
    marginBottom: "40px",
    textAlign: "left",
  },

  title: {
    fontSize: "2.5rem",
    fontWeight: 800,
    letterSpacing: "-0.025em",
    backgroundImage: "linear-gradient(135deg, var(--text) 0%, var(--textSecondary) 100%)",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    WebkitTextFillColor: "transparent",
    marginBottom: "12px",
  },

  subtitle: {
    color: "var(--textSecondary)",
    fontSize: "1.125rem",
    maxWidth: "600px",
    lineHeight: 1.6,
  },

  layout: {
    display: "grid",
    gridTemplateColumns: {
      default: "1.2fr 0.8fr",
      "@media (max-width: 968px)": "1fr",
    },
    rowGap: "32px",
    columnGap: "32px",
    alignItems: "start",
  },

  layoutTwoColumns: {
    display: "grid",
    gridTemplateColumns: {
      default: "1fr 1fr",
      "@media (max-width: 968px)": "1fr",
    },
    rowGap: "32px",
    columnGap: "32px",
    alignItems: "start",
  },

  card: {
    backgroundColor: "var(--background)",
    borderTopLeftRadius: "20px",
    borderTopRightRadius: "20px",
    borderBottomRightRadius: "20px",
    borderBottomLeftRadius: "20px",
    paddingTop: "32px",
    paddingRight: "32px",
    paddingBottom: "32px",
    paddingLeft: "32px",
    boxShadow:
      "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "rgba(var(--border-rgb, 128, 128, 128), 0.1)",
    borderRightWidth: "1px",
    borderRightStyle: "solid",
    borderRightColor: "rgba(var(--border-rgb, 128, 128, 128), 0.1)",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "rgba(var(--border-rgb, 128, 128, 128), 0.1)",
    borderLeftWidth: "1px",
    borderLeftStyle: "solid",
    borderLeftColor: "rgba(var(--border-rgb, 128, 128, 128), 0.1)",
    transitionProperty: "transform, box-shadow",
    transitionDuration: "0.2s",
    transitionTimingFunction: "ease",
  },

  cardInteractive: {
    transform: {
      default: "none",
      ":hover": "translateY(-2px)",
    },
    boxShadow: {
      default:
        "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)",
      ":hover":
        "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    },
  },

  form: {
    display: "flex",
    flexDirection: "column",
    rowGap: "24px",
    columnGap: "24px",
  },

  previewSection: {
    position: {
      default: "sticky",
      "@media (max-width: 968px)": "static",
    },
    top: "24px",
  },

  sectionTitle: {
    fontSize: "1.25rem",
    fontWeight: 700,
    marginBottom: "20px",
    display: "flex",
    alignItems: "center",
    rowGap: "10px",
    columnGap: "10px",
    color: "var(--text)",
  },

  sectionTitleSmall: {
    fontSize: "1rem",
  },

  sectionTitleNoMargin: {
    marginBottom: 0,
  },

  previewWindow: {
    backgroundColor: "var(--backgroundSecondary)",
    borderTopLeftRadius: "12px",
    borderTopRightRadius: "12px",
    borderBottomRightRadius: "12px",
    borderBottomLeftRadius: "12px",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "var(--border)",
    borderRightWidth: "1px",
    borderRightStyle: "solid",
    borderRightColor: "var(--border)",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "var(--border)",
    borderLeftWidth: "1px",
    borderLeftStyle: "solid",
    borderLeftColor: "var(--border)",
    overflowX: "hidden",
    overflowY: "hidden",
    boxShadow: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)",
  },

  previewHeader: {
    paddingTop: "12px",
    paddingRight: "16px",
    paddingBottom: "12px",
    paddingLeft: "16px",
    backgroundColor: "rgba(var(--text-rgb, 0, 0, 0), 0.03)",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "var(--border)",
    fontSize: "0.875rem",
  },

  previewBody: {
    paddingTop: "24px",
    paddingRight: "24px",
    paddingBottom: "24px",
    paddingLeft: "24px",
    minHeight: "350px",
    maxHeight: "600px",
    overflowY: "auto",
    backgroundColor: "var(--background)",
    color: "var(--text)",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    lineHeight: 1.6,
  },

  status: {
    paddingTop: "16px",
    paddingRight: "20px",
    paddingBottom: "16px",
    paddingLeft: "20px",
    borderTopLeftRadius: "12px",
    borderTopRightRadius: "12px",
    borderBottomRightRadius: "12px",
    borderBottomLeftRadius: "12px",
    marginBottom: "32px",
    display: "flex",
    alignItems: "center",
    rowGap: "12px",
    columnGap: "12px",
    fontWeight: 600,
    animationName: slideInKeyframes,
    animationDuration: "0.3s",
    animationTimingFunction: "ease-out",
  },

  statusSuccess: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    color: "#10b981",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "rgba(16, 185, 129, 0.2)",
    borderRightWidth: "1px",
    borderRightStyle: "solid",
    borderRightColor: "rgba(16, 185, 129, 0.2)",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "rgba(16, 185, 129, 0.2)",
    borderLeftWidth: "1px",
    borderLeftStyle: "solid",
    borderLeftColor: "rgba(16, 185, 129, 0.2)",
  },

  statusError: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    color: "#ef4444",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "rgba(239, 68, 68, 0.2)",
    borderRightWidth: "1px",
    borderRightStyle: "solid",
    borderRightColor: "rgba(239, 68, 68, 0.2)",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "rgba(239, 68, 68, 0.2)",
    borderLeftWidth: "1px",
    borderLeftStyle: "solid",
    borderLeftColor: "rgba(239, 68, 68, 0.2)",
  },

  report: {
    marginTop: "48px",
  },

  reportHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    rowGap: "20px",
    columnGap: "20px",
    marginBottom: "32px",
  },

  statCard: {
    paddingTop: "20px",
    paddingRight: "20px",
    paddingBottom: "20px",
    paddingLeft: "20px",
    backgroundColor: "var(--backgroundSecondary)",
    borderTopLeftRadius: "16px",
    borderTopRightRadius: "16px",
    borderBottomRightRadius: "16px",
    borderBottomLeftRadius: "16px",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "var(--border)",
    borderRightWidth: "1px",
    borderRightStyle: "solid",
    borderRightColor: "var(--border)",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "var(--border)",
    borderLeftWidth: "1px",
    borderLeftStyle: "solid",
    borderLeftColor: "var(--border)",
    textAlign: "center",
  },

  statLabel: {
    fontSize: "0.875rem",
    color: "var(--textSecondary)",
    marginBottom: "8px",
    fontWeight: 500,
  },

  statValue: {
    fontSize: "1.75rem",
    fontWeight: 800,
    color: "var(--text)",
  },

  statValueSent: {
    color: "#10b981",
  },

  statValueFailed: {
    color: "#ef4444",
  },

  statValueRetried: {
    color: "#3b82f6",
  },

  tableContainer: {
    backgroundColor: "var(--backgroundSecondary)",
    borderTopLeftRadius: "16px",
    borderTopRightRadius: "16px",
    borderBottomRightRadius: "16px",
    borderBottomLeftRadius: "16px",
    overflowX: "hidden",
    overflowY: "hidden",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "var(--border)",
    borderRightWidth: "1px",
    borderRightStyle: "solid",
    borderRightColor: "var(--border)",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "var(--border)",
    borderLeftWidth: "1px",
    borderLeftStyle: "solid",
    borderLeftColor: "var(--border)",
  },

  listItem: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    paddingTop: "12px",
    paddingRight: "20px",
    paddingBottom: "12px",
    paddingLeft: "20px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "var(--border)",
    alignItems: "center",
    fontSize: "0.875rem",
    transitionProperty: "background-color",
    transitionDuration: "0.2s",
    transitionTimingFunction: "ease",
    backgroundColor: {
      default: "transparent",
      ":hover": "rgba(var(--text-rgb, 0, 0, 0), 0.02)",
    },
  },

  listItemLast: {
    borderBottomWidth: 0,
    borderBottomStyle: "none",
  },

  failureItem: {
    paddingTop: "16px",
    paddingRight: "20px",
    paddingBottom: "16px",
    paddingLeft: "20px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "var(--border)",
  },

  failureItemLast: {
    borderBottomWidth: 0,
    borderBottomStyle: "none",
  },

  failureMeta: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.75rem",
    color: "var(--textSecondary)",
    marginBottom: "4px",
  },

  failureSubject: {
    fontWeight: 600,
    marginBottom: "4px",
  },

  failureError: {
    fontFamily: "monospace",
    fontSize: "0.75rem",
    color: "#ef4444",
    backgroundColor: "rgba(239, 68, 68, 0.05)",
    paddingTop: "4px",
    paddingRight: "8px",
    paddingBottom: "4px",
    paddingLeft: "8px",
    borderTopLeftRadius: "4px",
    borderTopRightRadius: "4px",
    borderBottomRightRadius: "4px",
    borderBottomLeftRadius: "4px",
    wordBreak: "break-all",
  },
});
