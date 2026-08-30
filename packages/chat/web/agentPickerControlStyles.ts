import * as stylex from "@stylexjs/stylex";

/**
 * AgentPickerControl.tsx 的 StyleX 样式 —— 自原 AgentPickerControl.css
 * 1:1 迁出（2026-08-30）。与原 CSS 保持 1:1：同一元素、同一声明、同值。
 *
 * 外部耦合保留：
 * - `.agent-picker__trigger` / `.agent-picker__trigger-label` 类名仍被
 *   QuickChat.css（未迁移，unlayered）以后代选择器覆盖，TSX 中这两个
 *   字面 className 置于 stylex.props() 展开之后保留；
 * - `__item > button`、`.is-open` 等阶梯规则见 chatStylexEscapeHatch.css
 *   （hook: chat-esc-ap-*）。
 */
export const agentPickerControlStyles = stylex.create({
  root: {
    display: "inline-flex",
    alignItems: "center",
    position: "relative",
    flexShrink: 0,
  },
  trigger: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    maxWidth: "180px",
    padding: "6px 10px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--borderMuted, var(--borderLight))",
    borderRadius: "999px",
    backgroundColor: "var(--surfaceInset, var(--surfaceRaised, var(--backgroundSecondary)))",
    color: "var(--textMuted, var(--textSecondary))",
    fontSize: "12px",
    fontWeight: 500,
    lineHeight: 1,
    cursor: "pointer",
    transition:
      "background 0.15s ease, color 0.15s ease, border-color 0.15s ease",
  },
  triggerIcon: {
    display: "inline-flex",
    flexShrink: 0,
    color: "inherit",
  },
  triggerLabel: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  caret: {
    flexShrink: 0,
    color: "var(--textTertiary)",
    transition: "transform 0.2s ease",
  },
  /* .agent-picker.is-open .agent-picker__trigger-caret { transform: rotate(180deg) }
   * 无同名属性竞争（caret 基础仅声明 transition），用 StyleX 条件组合等价改写。 */
  caretOpen: {
    transform: "rotate(180deg)",
  },
  /* 弹层壳（圆角/阴影/毛玻璃/动画）由 .app-popover + --popover-* token 提供 */
  popover: {
    minWidth: "280px",
    maxWidth: "340px",
    maxHeight: "420px",
    display: "flex",
    flexDirection: "column",
  },
  hint: {
    padding: "8px 14px 4px",
    fontSize: "var(--fontSize-xs, 12px)",
    color: "var(--textTertiary)",
    lineHeight: 1.4,
  },
  list: {
    margin: 0,
    padding: "6px",
    listStyle: "none",
    maxHeight: "300px",
    overflow: "auto",
  },
  /* .agent-picker__item > button（li 本身无声明，仅作原选择器命名空间） */
  itemBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    width: "100%",
    padding: "8px 10px",
    borderWidth: 0,
    borderStyle: "none",
    borderRadius: "8px",
    backgroundColor: "transparent",
    color: "var(--text)",
    fontSize: "13px",
    textAlign: "left",
    cursor: "pointer",
    transition: "background 0.15s ease",
  },
  /* 存量规则：当前 TSX 未渲染 .agent-picker__item-icon 元素，1:1 保留 */
  itemIcon: {
    display: "inline-flex",
    flexShrink: 0,
    color: "var(--textSecondary)",
  },
  /* 来源层 badge：收藏★ / 我的 user / 广场 bot / 默认 zap（变体见逃生舱） */
  badge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    width: "18px",
    height: "18px",
    borderRadius: "6px",
    color: "var(--textSecondary)",
    backgroundColor: "var(--bg-subtle, var(--surfaceInset, var(--backgroundSecondary)))",
  },
  itemText: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    flex: 1,
  },
  itemName: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontWeight: 500,
  },
  itemIntro: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "12px",
    color: "var(--textSecondary)",
  },
  itemCheck: {
    display: "inline-flex",
    flexShrink: 0,
    color: "var(--primary)",
  },
  empty: {
    padding: "4px 14px 10px",
    fontSize: "var(--fontSize-xs, 12px)",
    color: "var(--textTertiary)",
    lineHeight: 1.5,
  },
});
