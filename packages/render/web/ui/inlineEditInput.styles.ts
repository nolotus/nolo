// 文件: render/web/ui/inlineEditInput.styles.ts
import * as stylex from "@stylexjs/stylex";

/**
 * InlineEditInput 样式 —— StyleX 迁移
 * （自原 ui.css「InlineEditInput」分区 1:1 迁出，迁出后该分区已删除）
 * 原 [disabled] attribute 选择器等价改用 :disabled 伪类。
 */
export const inlineEditStyles = stylex.create({
  // .inline-edit-input
  input: {
    flexGrow: 1,
    fontSize: "var(--fontSize-base)",
    fontWeight: 600,
    color: "var(--text, #0D1117)",
    lineHeight: "var(--leading-normal)",
    letterSpacing: "-0.01em",
    paddingBlock: 1,
    paddingInline: "var(--space-1, 4px)",
    margin: 0,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor:
      "color-mix(in srgb, var(--primary, #1677FF) 25%, transparent)",
    backgroundColor:
      "color-mix(in srgb, var(--primary, #1677FF) 5%, transparent)",
    outline: "none",
    boxShadow: "none",
    borderRadius: "var(--radius-sm)",
    minWidth: 50,
    transition:
      "border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease",
    height: 24,
    boxSizing: "border-box",
    "::placeholder": {
      color: "var(--placeholder, #8B949E)",
    },
    ":focus": {
      borderColor:
        "color-mix(in srgb, var(--primary, #1677FF) 50%, transparent)",
      backgroundColor:
        "color-mix(in srgb, var(--primary, #1677FF) 7%, transparent)",
      boxShadow:
        "0 0 0 2px color-mix(in srgb, var(--primary, #1677FF) 12%, transparent)",
    },
    ":disabled": {
      opacity: 0.6,
      cursor: "not-allowed",
    },
  },
});
