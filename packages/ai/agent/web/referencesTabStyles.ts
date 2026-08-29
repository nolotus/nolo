import * as stylex from "@stylexjs/stylex";

/**
 * 引用管理区（ReferencesTab.tsx）的 StyleX 样式 ——
 * 自原 ReferencesTab 样式文件 1:1 迁出。
 *
 * 无法用 StyleX 表达而保留在 agentCreateStylexEscapeHatch.css 的规则：
 * - [data-theme="dark"] 对 card / card-count / item / empty 的字面量覆盖
 *   （hook 类名 agent-create-esc-ref-*）；
 * - 列表项链接 hover 时标题变色的父 hover 控制子规则
 *   （hook 类名 agent-create-esc-ref-link/title）；
 * - card 的 background/border 基础声明（与 dark 覆盖存在同名属性竞争，
 *   下沉后按原源码顺序决胜；hook 类名 agent-create-esc-ref-card）。
 * 卡片图标按静态卡片类型（knowledge/instruction）取对应色值。
 */
export const referencesTabStyles = stylex.create({
  manager: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-5)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "var(--space-4)",
    marginBottom: "var(--space-2)",
    "@media (max-width: 1100px)": {
      gridTemplateColumns: "1fr",
    },
  },
  card: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-4)",
    minHeight: 0,
    padding: "var(--space-4)",
    // background/border 下沉在 agentCreateStylexEscapeHatch.css（与 dark
    // 覆盖存在属性竞争，需 unlayered 内按源码顺序决胜）。
    borderRadius: "var(--radius-md)",
    animationName: stylex.keyframes({
      from: { opacity: 0, transform: "translateY(4px)" },
      to: { opacity: 1, transform: "translateY(0)" },
    }),
    animationDuration: "0.5s",
    animationTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
  },
  cardHeader: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-3)",
  },
  cardHeaderTop: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "var(--space-3)",
    flexWrap: "wrap",
  },
  cardHeading: {
    minWidth: 0,
    flex: "1 1 220px",
  },
  cardTitleWrap: {
    display: "flex",
    alignItems: "flex-start",
    gap: "var(--space-3)",
    minWidth: 0,
  },
  cardTitleBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    minWidth: 0,
    flex: 1,
  },
  cardTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-2)",
    minWidth: 0,
  },
  cardIcon: {
    width: "32px",
    height: "32px",
    borderRadius: "var(--radius-xs)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardIconKnowledge: {
    color: "#3b82f6",
    background: "color-mix(in srgb, #3b82f6 10%, transparent)",
  },
  cardIconInstruction: {
    color: "#ca8a04",
    background: "color-mix(in srgb, #eab308 12%, transparent)",
  },
  cardTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 700,
    color: "var(--text)",
    lineHeight: 1.25,
  },
  cardCount: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "24px",
    height: "24px",
    padding: "0 8px",
    borderRadius: "999px",
    background: "color-mix(in srgb, var(--background) 85%, white 4%)",
    color: "var(--textSecondary)",
    fontSize: "var(--fontSize-xs)",
    fontWeight: 700,
    flexShrink: 0,
  },
  cardSubtitle: {
    margin: 0,
    fontSize: "var(--fontSize-sm)",
    lineHeight: 1.55,
    color: "var(--textTertiary)",
    maxWidth: "42ch",
  },
  dialog: {
    width: "min(960px, calc(100vw - 48px))",
  },
  dialogBody: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-3)",
  },
  dialogHelp: {
    color: "var(--textSecondary)",
    fontSize: "var(--fontSize-sm)",
    lineHeight: 1.6,
  },
  dialogError: {
    borderRadius: "var(--radius-md)",
    background: "var(--dangerBackground, rgba(239, 68, 68, 0.08))",
    color: "var(--danger, #ef4444)",
    fontSize: "var(--fontSize-sm)",
    lineHeight: 1.5,
    padding: "var(--space-2) var(--space-3)",
  },
  cardBody: {
    minHeight: 0,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-2)",
  },
  item: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "var(--space-3)",
    padding: "var(--space-3)",
    borderRadius: "var(--radius-sm)",
    background: "var(--background)",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
    border: "1px solid transparent",
  },
  itemMain: {
    minWidth: 0,
  },
  itemLink: {
    textDecoration: "none",
    display: "block",
    flex: 1,
    transition: "color 0.15s ease",
  },
  itemTitle: {
    fontSize: "var(--fontSize-sm)",
    fontWeight: 600,
    color: "var(--text)",
    lineHeight: 1.5,
    wordBreak: "break-word",
  },
  itemMeta: {
    marginTop: "4px",
    fontSize: "var(--fontSize-xs)",
    color: "var(--textTertiary)",
    lineHeight: 1.5,
    wordBreak: "break-all",
  },
  remove: {
    border: "none",
    background: "transparent",
    color: "var(--textTertiary)",
    fontSize: "var(--fontSize-xs)",
    fontWeight: 600,
    cursor: "pointer",
    padding: "2px 0",
    ":hover": {
      color: "var(--primary)",
    },
  },
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: "8px",
    minHeight: "72px",
    borderRadius: "var(--radius-sm)",
    background: "color-mix(in srgb, var(--background) 92%, white 2%)",
    color: "var(--textTertiary)",
    fontSize: "var(--fontSize-sm)",
    textAlign: "left",
    padding: "var(--space-3) var(--space-4)",
    border: "1px dashed var(--borderLight, rgba(0, 0, 0, 0.08))",
  },
  emptyTitle: {
    color: "var(--textSecondary)",
    fontSize: "var(--fontSize-sm)",
    fontWeight: 600,
    lineHeight: 1.45,
  },
  emptyTip: {
    color: "var(--textTertiary)",
    fontSize: "var(--fontSize-xs)",
    lineHeight: 1.5,
  },
});
