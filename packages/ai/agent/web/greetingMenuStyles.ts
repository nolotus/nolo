import * as stylex from "@stylexjs/stylex";

/**
 * 问候菜单编辑器（GreetingMenuEditor.tsx）的 StyleX 样式 ——
 * 自原 GreetingMenuEditor 样式文件 1:1 迁出。
 *
 * 原文件中列修饰类（--label/--message）与输入框类均无样式定义
 * （无规则类名），对应 className 字符串已从 JSX 移除。
 */
export const greetingMenuStyles = stylex.create({
  menu: {
    marginTop: "var(--space-2)",
    padding: "var(--space-2) var(--space-3)",
    borderRadius: "var(--radius-sm)",
    backgroundColor: "var(--backgroundSecondary)",
    boxShadow:
      "0 1px 3px var(--shadowLight), inset 0 1px 0 rgba(255, 255, 255, 0.02)",
  },
  header: {
    marginBottom: "var(--space-2)",
  },
  title: {
    fontSize: "var(--fontSize-sm)",
    fontWeight: 550,
    color: "var(--textSecondary)",
    letterSpacing: "-0.01em",
  },
  desc: {
    marginTop: "2px",
    fontSize: "var(--fontSize-sm)",
    color: "var(--textTertiary)",
    lineHeight: "var(--leading-normal)",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-2)",
    marginTop: "var(--space-2)",
  },
  item: {
    padding: "var(--space-2)",
    borderRadius: "var(--radius-sm)",
    backgroundColor: "var(--background)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--borderLight)",
    boxShadow: "0 1px 2px var(--shadowLight)",
  },
  row: {
    display: "flex",
    gap: "var(--space-2)",
    alignItems: "flex-end",
    "@media (max-width: 768px)": {
      flexDirection: "column",
      alignItems: "stretch",
    },
  },
  col: {
    flex: 1,
    minWidth: 0,
  },
  fieldLabel: {
    display: "block",
    fontSize: "var(--fontSize-xs)",
    color: "var(--textTertiary)",
    marginBottom: "2px",
    letterSpacing: "-0.01em",
  },
  optional: {
    fontSize: "var(--fontSize-xs)",
    color: "var(--textQuaternary)",
    marginLeft: "4px",
  },
  remove: {
    marginLeft: "var(--space-1)",
    marginBottom: "var(--space-1)",
    borderWidth: 0,
    borderStyle: "none",
    backgroundColor: "transparent",
    color: "var(--textQuaternary)",
    cursor: "pointer",
    padding: "4px",
    borderRadius: "var(--radius-xs)",
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition:
      "background-color 0.18s ease-out, color 0.18s ease-out, transform 0.16s ease-out",
    ":hover": {
      backgroundColor: "var(--backgroundHover)",
      color: "var(--error)",
      transform: "translateY(-0.5px)",
    },
    ":focus-visible": {
      outline: "none",
      boxShadow: "0 0 0 2px var(--focus)",
      color: "var(--error)",
    },
    "@media (max-width: 768px)": {
      alignSelf: "flex-end",
      marginTop: "var(--space-1)",
    },
  },
  add: {
    marginTop: "var(--space-2)",
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--space-1)",
    borderRadius: "999px",
    borderWidth: "1px",
    borderStyle: "dashed",
    borderColor: "var(--border)",
    backgroundColor: "transparent",
    color: "var(--primary)",
    fontSize: "var(--fontSize-sm)",
    padding: "3px 10px",
    cursor: "pointer",
    transition:
      "background-color 0.18s ease-out, border-color 0.18s ease-out, transform 0.16s ease-out, box-shadow 0.18s ease-out",
    ":hover": {
      backgroundColor: "var(--background)",
      borderColor: "var(--borderHover)",
      boxShadow: "0 1px 3px var(--shadowLight)",
      transform: "translateY(-0.5px)",
    },
    ":focus-visible": {
      outline: "none",
      boxShadow: "0 0 0 2px var(--focus)",
    },
  },
});
