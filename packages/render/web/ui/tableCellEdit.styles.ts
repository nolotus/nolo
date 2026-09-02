// 文件: render/web/ui/tableCellEdit.styles.ts
import * as stylex from "@stylexjs/stylex";

/**
 * TableCellEdit 样式 —— StyleX 迁移
 * （自原 ui.css「TableCellEdit」分区 1:1 迁出，迁出后该分区已删除）
 */
export const tableCellEditStyles = stylex.create({
  // .table-cell-edit
  cell: {
    width: "100%",
    height: "auto",
    minHeight: 22,
    boxSizing: "border-box",
    backgroundColor: "transparent",
    color: "var(--text, #0D1117)",
    fontFamily: "inherit",
    fontSize: "inherit",
    lineHeight: 1.2,
    padding: 0,
    margin: 0,
    outline: "none",
    resize: "none",
    borderWidth: 0,
    borderStyle: "none",
    borderRadius: 0,
    boxShadow: "none",
    fieldSizing: "content",
    maxHeight: 200,
    overflowY: "auto",
    "::placeholder": {
      color: "var(--placeholder, #8B949E)",
    },
  },
});
