import * as stylex from "@stylexjs/stylex";

/**
 * QueueBadge.tsx 的 StyleX 样式 —— 自原 queue-badge.css 1:1 迁出（2026-08-30）。
 *
 * 与原 CSS 保持 1:1：同一元素、同一声明、同值。
 *
 * 无法用 StyleX 原子类表达级联顺序而保留在 chatStylexEscapeHatch.css 的规则
 * （hook 用 data-hook 属性，选择器 [data-hook~=...]）：
 * - `.queue-badge__pill:hover`（与 pill 基础 background 同名竞争）；
 * - `.queue-badge__pill--running`（与 pill 基础 border/color 同名竞争，
 *   原级联靠源码顺序让变体胜出，@layer 原子类无法保证该顺序）；
 * - `.queue-badge__item--more`（与 __item 基础 color 同名竞争）。
 */
export const queueBadgeStyles = stylex.create({
  badge: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    marginLeft: "0.5rem",
    flexShrink: 0,
  },
  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.3rem",
    padding: "0.15rem 0.55rem",
    borderRadius: "999px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--nolo-border, rgba(120, 120, 120, 0.35))",
    backgroundColor: "var(--nolo-surface-2, rgba(120, 120, 120, 0.12))",
    color: "var(--nolo-text-secondary, inherit)",
    fontSize: "0.75rem",
    lineHeight: 1.4,
    cursor: "pointer",
    transition: "background 0.15s ease",
  },
  icon: {
    fontSize: "0.7rem",
    opacity: 0.8,
  },
  count: {
    fontWeight: 600,
  },
  label: {
    opacity: 0.8,
  },
  popover: {
    position: "absolute",
    bottom: "calc(100% + 0.4rem)",
    left: 0,
    minWidth: "220px",
    maxWidth: "320px",
    borderRadius: "8px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--nolo-border, rgba(120, 120, 120, 0.3))",
    backgroundColor: "var(--nolo-surface, #fff)",
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.12)",
    zIndex: 50,
    padding: "0.5rem 0",
  },
  popoverHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 0.6rem 0.4rem",
    fontSize: "0.8rem",
    fontWeight: 600,
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "var(--nolo-border, rgba(120, 120, 120, 0.2))",
  },
  clear: {
    borderWidth: 0,
    borderStyle: "none",
    backgroundColor: "transparent",
    color: "var(--nolo-danger, #d33)",
    fontSize: "0.75rem",
    cursor: "pointer",
    padding: "0.1rem 0.3rem",
  },
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    maxHeight: "200px",
    overflowY: "auto",
  },
  item: {
    padding: "0.35rem 0.6rem",
    fontSize: "0.78rem",
    color: "var(--nolo-text, inherit)",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "var(--nolo-border-faint, rgba(120, 120, 120, 0.1))",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
});
