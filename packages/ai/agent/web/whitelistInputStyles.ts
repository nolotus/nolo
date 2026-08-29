import * as stylex from "@stylexjs/stylex";

/**
 * 白名单输入（WhitelistInput.tsx）的 StyleX 样式 ——
 * 自原 WhitelistInput 样式文件 1:1 迁出；原文件顶部的直接 CSS import
 * （与 agent-form 样式捆绑包重复加载）一并删除。
 */
export const whitelistInputStyles = stylex.create({
  container: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    gap: "var(--space-3)",
  },
  inputWrapper: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "end",
    gap: "var(--space-2)",
    "@media (max-width: 520px)": {
      gridTemplateColumns: "1fr",
    },
  },
  addButton: {
    minHeight: "var(--control-lg)",
  },
  userList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "var(--space-2)",
  },
  userTag: {
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--space-2)",
    maxWidth: "100%",
    padding: "5px 6px 5px 10px",
    border: "1px solid color-mix(in srgb, var(--primary) 18%, var(--border))",
    borderRadius: "var(--radius-full, 999px)",
    color: "var(--textSecondary)",
    background: "color-mix(in srgb, var(--primary) 7%, var(--background))",
    fontSize: "var(--fontSize-xs)",
  },
  userId: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    wordBreak: "break-all",
  },
  removeButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "22px",
    height: "22px",
    padding: 0,
    margin: 0,
    border: "none",
    borderRadius: "50%",
    color: "var(--textTertiary)",
    background: "color-mix(in srgb, var(--text) 5%, transparent)",
    cursor: "pointer",
    ":hover": {
      color: "var(--text)",
      background: "var(--backgroundHover)",
      outline: "none",
    },
    ":focus-visible": {
      color: "var(--text)",
      background: "var(--backgroundHover)",
      outline: "none",
      boxShadow: "0 0 0 2px var(--primaryGhost)",
    },
  },
});
