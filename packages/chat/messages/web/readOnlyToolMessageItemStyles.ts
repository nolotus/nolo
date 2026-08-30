import * as stylex from "@stylexjs/stylex";

/**
 * ReadOnlyToolMessageItem 样式 —— StyleX 迁移
 * （自原 ReadOnlyToolMessageItem.css 1:1 迁出）
 */
export const readOnlyToolMessageItemStyles = stylex.create({
  roToolPre: {
    fontSize: "var(--fontSize-sm)",
    color: "var(--textSecondary)",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
    margin: 0,
    lineHeight: "var(--leading-normal)",
    fontFamily: "var(--font-mono, monospace)",
  },
  rowHandoff: {
    maxWidth: 720,
  },
  handoffBody: {
    display: "grid",
    gap: 8,
    maxWidth: 640,
  },
  handoffDetailRow: {
    display: "grid",
    gridTemplateColumns: {
      default: "112px minmax(0, 1fr)",
      "@media (max-width: 560px)": "1fr",
    },
    alignItems: "start",
    gap: {
      default: 10,
      "@media (max-width: 560px)": 2,
    },
    fontSize: "var(--fontSize-sm)",
    lineHeight: "var(--leading-normal)",
  },
  handoffLabel: {
    color: "var(--textQuaternary, var(--textTertiary))",
    whiteSpace: "nowrap",
  },
  handoffValue: {
    minWidth: 0,
    color: "var(--textSecondary)",
    overflowWrap: "anywhere",
  },
  handoffLink: {
    display: "inline-flex",
    width: "fit-content",
    minWidth: 0,
    color: "var(--primary)",
    textDecoration: {
      default: "none",
      ":hover": "underline",
    },
  },
});
