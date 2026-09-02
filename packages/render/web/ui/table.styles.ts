// 文件: render/web/ui/table.styles.ts
import * as stylex from "@stylexjs/stylex";

/**
 * Table 控制栏/导出菜单样式 —— StyleX 迁移
 * （自原 ui.css「Table」分区 1:1 迁出，迁出后该分区已删除）
 *
 * 职责分界：`.table-container:hover .table-header-controls`（祖先 hover 显示
 * 控制栏，BaseTable 容器交互契约）与 .is-active 强制显示规则保留在
 * elements.css——StyleX 无法表达祖先选择器；controls 的语义类名
 * table-header-controls / is-active 保留挂载以命中这些规则。
 * 本文件只管布局与配色（不含 opacity/pointer-events 显隐属性）。
 */
export const tableChromeStyles = stylex.create({
  // .table-header-controls 的布局部分（显隐归 elements.css）
  headerControls: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: "var(--space-2)",
    height: "var(--control-sm)",
    gap: "var(--space-2)",
  },
  // .table-action-button
  actionButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--space-1)",
    paddingBlock: "var(--space-1)",
    paddingInline: "var(--space-3)",
    border: "1px solid var(--border)",
    borderRadius: "var(--space-1)",
    backgroundColor: "var(--backgroundSecondary)",
    color: "var(--textSecondary)",
    fontSize: "var(--fontSize-sm)",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.15s ease",
    userSelect: "none",
    ":hover": {
      backgroundColor: "var(--backgroundHover)",
      borderColor: "var(--borderHover)",
      color: "var(--text)",
    },
    ":disabled": {
      opacity: 0.6,
      cursor: "not-allowed",
    },
    ":disabled:hover": {
      backgroundColor: "var(--backgroundSecondary)",
      borderColor: "var(--border)",
      color: "var(--textSecondary)",
    },
  },
  // .export-menu
  exportMenu: {
    minWidth: 140,
    padding: "var(--space-1)",
  },
  // .export-option
  exportOption: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-2)",
    width: "100%",
    paddingBlock: "var(--space-2)",
    paddingInline: "var(--space-3)",
    border: "none",
    backgroundColor: "transparent",
    color: "var(--text)",
    fontSize: "var(--fontSize-sm)",
    textAlign: "left",
    cursor: "pointer",
    borderRadius: "var(--space-1)",
    transition: "background-color 0.15s ease",
    ":hover": {
      backgroundColor: "var(--backgroundHover)",
    },
  },
});
