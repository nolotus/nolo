import * as stylex from "@stylexjs/stylex";

const spinKeyframes = stylex.keyframes({
  "0%": { transform: "rotate(0deg)" },
  "100%": { transform: "rotate(360deg)" },
});

/**
 * ProviderHealthAdmin 页面样式。
 *
 * 与原 CSS 保持 1:1：同一元素、同一声明、同值（var(--global-*) 原样保留）。
 * 全部 longhand：禁止 shorthand。
 * - background → backgroundColor
 * - gap → rowGap/columnGap
 * - margin/padding/border/borderRadius 拆方向 longhand
 */
export const providerHealthAdminStyles = stylex.create({
  page: {
    display: "flex",
    flexDirection: "column",
    rowGap: "16px",
    columnGap: "16px",
    paddingTop: {
      default: "24px",
      "@media (max-width: 720px)": "16px",
    },
    paddingRight: {
      default: "24px",
      "@media (max-width: 720px)": "16px",
    },
    paddingBottom: {
      default: "24px",
      "@media (max-width: 720px)": "16px",
    },
    paddingLeft: {
      default: "24px",
      "@media (max-width: 720px)": "16px",
    },
  },

  header: {
    alignItems: {
      default: "center",
      "@media (max-width: 720px)": "stretch",
    },
    display: "flex",
    flexDirection: {
      default: "row",
      "@media (max-width: 720px)": "column",
    },
    justifyContent: "space-between",
    rowGap: "16px",
    columnGap: "16px",
  },

  title: {
    alignItems: "flex-start",
    display: "flex",
    rowGap: "12px",
    columnGap: "12px",
  },

  titleH1: {
    fontSize: "24px",
    lineHeight: 1.2,
    marginTop: 0,
    marginRight: 0,
    marginBottom: 0,
    marginLeft: 0,
  },

  titleP: {
    color: "var(--textSecondary, #667085)",
    marginTop: "4px",
    marginRight: 0,
    marginBottom: 0,
    marginLeft: 0,
  },

  error: {
    backgroundColor: "rgba(217, 45, 32, 0.08)",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "rgba(217, 45, 32, 0.24)",
    borderRightWidth: "1px",
    borderRightStyle: "solid",
    borderRightColor: "rgba(217, 45, 32, 0.24)",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "rgba(217, 45, 32, 0.24)",
    borderLeftWidth: "1px",
    borderLeftStyle: "solid",
    borderLeftColor: "rgba(217, 45, 32, 0.24)",
    borderTopLeftRadius: "8px",
    borderTopRightRadius: "8px",
    borderBottomRightRadius: "8px",
    borderBottomLeftRadius: "8px",
    color: "#b42318",
    paddingTop: "10px",
    paddingRight: "12px",
    paddingBottom: "10px",
    paddingLeft: "12px",
  },

  meta: {
    color: "var(--textSecondary, #667085)",
    display: "flex",
    flexWrap: "wrap",
    rowGap: "12px",
    columnGap: "12px",
    fontSize: "13px",
  },

  grid: {
    display: "grid",
    rowGap: "12px",
    columnGap: "12px",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  },

  card: {
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "var(--borderSubtle, #e4e7ec)",
    borderRightWidth: "1px",
    borderRightStyle: "solid",
    borderRightColor: "var(--borderSubtle, #e4e7ec)",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "var(--borderSubtle, #e4e7ec)",
    borderLeftWidth: "1px",
    borderLeftStyle: "solid",
    borderLeftColor: "var(--borderSubtle, #e4e7ec)",
    borderTopLeftRadius: "8px",
    borderTopRightRadius: "8px",
    borderBottomRightRadius: "8px",
    borderBottomLeftRadius: "8px",
    display: "flex",
    flexDirection: "column",
    rowGap: "14px",
    columnGap: "14px",
    paddingTop: "16px",
    paddingRight: "16px",
    paddingBottom: "16px",
    paddingLeft: "16px",
  },

  cardHead: {
    alignItems: "flex-start",
    display: "flex",
    justifyContent: "space-between",
    rowGap: "12px",
    columnGap: "12px",
  },

  cardH2: {
    fontSize: "18px",
    marginTop: 0,
    marginRight: 0,
    marginBottom: 0,
    marginLeft: 0,
  },

  cardP: {
    color: "var(--textSecondary, #667085)",
    fontSize: "13px",
    marginTop: "4px",
    marginRight: 0,
    marginBottom: 0,
    marginLeft: 0,
    overflowWrap: "anywhere",
  },

  badge: {
    borderTopLeftRadius: "999px",
    borderTopRightRadius: "999px",
    borderBottomRightRadius: "999px",
    borderBottomLeftRadius: "999px",
    fontSize: "12px",
    fontWeight: 600,
    paddingTop: "4px",
    paddingRight: "8px",
    paddingBottom: "4px",
    paddingLeft: "8px",
    whiteSpace: "nowrap",
  },

  badgeOk: {
    backgroundColor: "rgba(18, 183, 106, 0.12)",
    color: "#027a48",
  },

  badgeWarn: {
    backgroundColor: "rgba(247, 144, 9, 0.14)",
    color: "#b54708",
  },

  badgeError: {
    backgroundColor: "rgba(217, 45, 32, 0.12)",
    color: "#b42318",
  },

  badgeMuted: {
    backgroundColor: "rgba(102, 112, 133, 0.12)",
    color: "#475467",
  },

  metrics: {
    display: "grid",
    rowGap: "10px",
    columnGap: "10px",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  },

  metricItem: {
    backgroundColor: "var(--surfaceSubtle, #f8fafc)",
    borderTopLeftRadius: "6px",
    borderTopRightRadius: "6px",
    borderBottomRightRadius: "6px",
    borderBottomLeftRadius: "6px",
    display: "flex",
    flexDirection: "column",
    rowGap: "4px",
    columnGap: "4px",
    minWidth: 0,
    paddingTop: "10px",
    paddingRight: "10px",
    paddingBottom: "10px",
    paddingLeft: "10px",
  },

  metricLabel: {
    color: "var(--textSecondary, #667085)",
    fontSize: "12px",
  },

  metricValue: {
    fontSize: "15px",
    overflowWrap: "anywhere",
  },

  lastError: {
    color: "#b42318",
    fontSize: "13px",
    overflowWrap: "anywhere",
  },

  attempts: {
    display: "flex",
    flexDirection: "column",
    rowGap: "6px",
    columnGap: "6px",
  },

  attempt: {
    color: "var(--textSecondary, #667085)",
    display: "grid",
    fontSize: "12px",
    rowGap: "8px",
    columnGap: "8px",
    gridTemplateColumns: "24px 44px 56px 1fr",
  },

  spin: {
    animationName: spinKeyframes,
    animationDuration: "1s",
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
  },
});
