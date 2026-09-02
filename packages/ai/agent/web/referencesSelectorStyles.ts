import * as stylex from "@stylexjs/stylex";

/**
 * 引用选择器弹窗（ReferencesSelector.tsx）的 StyleX 样式 ——
 * 自原 ReferencesSelector 样式文件 1:1 迁出。
 *
 * 原文件中 section 相邻兄弟规则在 TSX 中是固定的两个静态 section，
 * 第二个 section 无条件应用 borderTop 等价改写；条目选中态、复选框
 * 选中态（input 受控）、类型按钮 data-type 均为 TSX 已知状态，改为
 * 条件样式；条目 hover 显示操作区（父 hover 控制子）、最后一条去除
 * 分隔线（:last-child）、复选框 ::after 对勾均超出 StyleX 能力，
 * 保留在 agentCreateStylexEscapeHatch.css（hook 类名
 * agent-create-esc-rs-item / -actions / -check，data-checked 属性）。
 */
export const referencesSelectorStyles = stylex.create({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-3)",
    height: "100%",
    maxHeight: "480px",
    minHeight: "300px",
  },
  search: {
    flexShrink: 0,
  },
  spaceCombobox: {
    flexShrink: 0,
  },
  list: {
    flex: 1,
    overflowY: "auto",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--border)",
    borderRadius: "var(--radius-md)",
    backgroundColor: "var(--backgroundSecondary)",
    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)",
  },
  status: {
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    color: "var(--textTertiary)",
    fontSize: "var(--fontSize-sm)",
  },
  spinner: {
    width: "16px",
    height: "16px",
    borderWidth: "2px",
    borderStyle: "solid",
    borderColor: "var(--border)",
    borderTopColor: "var(--primary)",
    borderRadius: "50%",
    animationName: stylex.keyframes({
      to: { transform: "rotate(360deg)" },
    }),
    animationDuration: "1s",
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
  },
  section: {
    display: "block",
  },
  // 原 section 相邻兄弟 border-top 规则 → 挂在第二个 section 上
  sectionAdjacent: {
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "var(--borderLight)",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "12px 14px 10px",
    backgroundColor: "var(--backgroundSecondary)",
    position: "sticky",
    top: 0,
    zIndex: 1,
  },
  sectionTitle: {
    fontSize: "var(--fontSize-sm)",
    fontWeight: 600,
    color: "var(--textSecondary)",
  },
  sectionCount: {
    minWidth: "24px",
    height: "24px",
    padding: "0 8px",
    borderRadius: "999px",
    backgroundColor: "var(--backgroundTertiary)",
    color: "var(--textSecondary)",
    fontSize: "var(--fontSize-xs)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--borderLight)",
  },
  sectionEmpty: {
    padding: "12px 14px 16px",
    color: "var(--textTertiary)",
    fontSize: "var(--fontSize-sm)",
  },
  sectionHint: {
    padding: "0 14px 14px",
    color: "var(--textSecondary)",
    fontSize: "var(--fontSize-xs)",
    lineHeight: 1.5,
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 14px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "var(--borderLight)",
    backgroundColor: "var(--background)",
    cursor: "pointer",
    transition: "background 0.15s",
    ":hover": {
      backgroundColor: "var(--backgroundHover)",
    },
  },
  itemSelected: {
    backgroundColor: "var(--primaryBg)",
  },
  // 原复选框 input 隐藏规则 → 直接挂在 <input> 上
  checkInput: {
    display: "none",
  },
  checkboxUi: {
    width: "18px",
    height: "18px",
    borderWidth: "2px",
    borderStyle: "solid",
    borderColor: "var(--textQuaternary)",
    borderRadius: "var(--radius-sm)",
    position: "relative",
    transition: "all 0.2s",
  },
  // 选中态背景/边框与 ::after 对勾由 agentCreateStylexEscapeHatch.css
  // 的 data-checked 规则承担（StyleX 不支持 ::after / :last-child）。
  itemBody: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    fontSize: "var(--fontSize-base)",
    color: "var(--text)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  itemTitleSelected: {
    color: "var(--primary)",
    fontWeight: 500,
  },
  itemMeta: {
    fontSize: "var(--fontSize-sm)",
    color: "var(--textTertiary)",
    marginTop: "2px",
  },
  itemActions: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    opacity: 0,
    transform: "translateX(4px)",
    pointerEvents: "none",
    transition: "opacity 0.15s ease, transform 0.15s ease",
  },
  iconBtn: {
    width: "28px",
    height: "var(--control-sm)",
    borderRadius: "999px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "transparent",
    backgroundColor: "transparent",
    color: "var(--textTertiary)",
    transition: "all 0.2s",
  },
  iconBtnGhost: {
    borderColor: "var(--border)",
    backgroundColor: "var(--background)",
    ":hover": {
      backgroundColor: "var(--backgroundHover)",
      color: "var(--text)",
      boxShadow: "0 1px 4px var(--shadowLight)",
    },
  },
  iconBtnType: {
    backgroundColor: "var(--background)",
    ":hover": {
      transform: "scale(1.05)",
      boxShadow: "0 2px 8px var(--shadowLight)",
    },
  },
  iconBtnTypeKnowledge: {
    borderColor: "var(--border)",
    color: "var(--textSecondary)",
  },
  iconBtnTypeInstruction: {
    borderColor: "transparent",
    color: "var(--primary)",
    backgroundColor: "var(--primary)15",
  },
  summary: {
    padding: "10px 14px",
    backgroundColor: "var(--backgroundTertiary)",
    borderRadius: "var(--radius-md)",
    fontSize: "var(--fontSize-sm)",
    color: "var(--textSecondary)",
    textAlign: "center",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--borderLight)",
  },
  summaryDetail: {
    opacity: 0.8,
    fontSize: "var(--fontSize-sm)",
  },
});
