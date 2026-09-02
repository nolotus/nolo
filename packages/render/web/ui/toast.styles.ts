// 文件: render/web/ui/toast.styles.ts
import * as stylex from "@stylexjs/stylex";

/**
 * Toast 样式 —— StyleX 迁移（自 Toast.css 1:1 迁出，迁出后该文件已删除）
 *
 * 行为对应：
 * - `--toast-accent` 变量（data-type 在 root 上改写、icon 消费）→ 由 TSX 按
 *   toast.type 直接挂 iconAccent{Default,Success,Error,Loading} 色类。
 * - data-starting-style / data-ending-style / data-focus-visible /
 *   data-positioned → 属性变体键（phase/type/position 已是 React 值，
 *   data-* 属性保留用于测试与语义）。
 * - 例外：`[data-theme="dark"] .toast-root / .toast-close:hover /
 *   .toast-action` 祖先主题选择器迁至 theme-ui.css（语义类名
 *   toast-root/toast-close/toast-action 保留命中）。
 * - toast-spin keyframes 与 reduced-motion 变体内嵌。
 * - EXIT_MS（320ms）必须与 root 的 transition 时长保持同步（见 Toast.tsx）。
 */

const spin = stylex.keyframes({
  to: { transform: "rotate(360deg)" },
});

const motionEase = "var(--motionEase, cubic-bezier(0.33, 0, 0.2, 1))";

export const toastStyles = stylex.create({
  // ── Viewport ──
  // .toast-viewport
  viewport: {
    position: "fixed",
    bottom: "var(--space-4, 16px)",
    right: "var(--space-4, 16px)",
    display: "flex",
    flexDirection: "column-reverse",
    gap: "var(--space-2, 8px)",
    zIndex: "var(--z-toast, 1030)",
    outline: "none",
    pointerEvents: "none",
    maxWidth: "calc(100vw - var(--space-8, 32px))",
  },
  // ── Toast Card ──
  // .toast-root
  root: {
    width: 240,
    maxWidth: "100%",
    display: "flex",
    alignItems: "flex-start",
    gap: "var(--space-3, 12px)",
    padding: "var(--space-3, 12px) var(--space-4, 16px)",
    backgroundColor: "var(--background, #ffffff)",
    color: "var(--text, #18181b)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--borderMuted, var(--borderLight, rgba(0, 0, 0, 0.08)))",
    borderRadius: "var(--radius-lg, var(--radius-md, 12px))",
    boxShadow:
      "0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)",
    outline: "none",
    forcedColorAdjust: "none",
    pointerEvents: "auto",
    transition: {
      default: `transform var(--motionDuration, 320ms) ${motionEase}, opacity var(--motionDuration, 320ms) ${motionEase}, background-color var(--motionDuration, 150ms) ease, border-color var(--motionDuration, 150ms) ease, box-shadow var(--motionDuration, 150ms) ease`,
      "@media (prefers-reduced-motion: reduce)":
        "transform 0ms, opacity 0ms, background-color 0ms, border-color 0ms, box-shadow 0ms",
    },
    ":focus-visible": {
      outline:
        "2px solid var(--focus, var(--primaryGhost, rgba(22, 119, 255, 0.22)))",
      outlineOffset: 2,
    },
    // 进出场：右滑出视口
    "[data-starting-style], [data-ending-style]": {
      transform: "translateX(calc(100% + var(--space-8, 32px)))",
      opacity: 0,
    },
    // 锚定到源元素的 toast 收窄并贴住视口右缘
    "[data-positioned]": {
      maxWidth: "min(240px, calc(100vw - var(--space-4, 16px)))",
    },
  },
  // ── Content Layout ──
  // .toast-content
  content: {
    display: "flex",
    alignItems: "flex-start",
    gap: "var(--space-3, 12px)",
    flex: "1 1 auto",
    minWidth: 0,
  },
  // ── Icon ──
  // .toast-icon（原 color: var(--toast-accent) 按 type 分色）
  icon: {
    width: 18,
    height: 18,
    marginTop: 1,
    color: "var(--textSecondary, #52525b)",
  },
  iconSuccess: {
    color: "var(--success, #10b981)",
  },
  iconError: {
    color: "var(--error, #ef4444)",
  },
  iconLoading: {
    color: "var(--info, var(--primary, #3b82f6))",
    // shorthand 会被 StyleX 静默丢弃，必须 longhand（animationName 支持 RM 变体）
    animationName: {
      default: spin,
      "@media (prefers-reduced-motion: reduce)": "none",
    },
    animationDuration: "1s",
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
  },
  // ── Text ──
  // .toast-text-wrapper
  textWrapper: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    fontSize: "var(--fontSize-base, 14px)",
    lineHeight: "var(--leading-normal, 1.5)",
    fontFamily: "var(--font, system-ui)",
    color: "var(--text, #18181b)",
  },
  // .toast-title
  title: {
    fontWeight: "var(--fontWeight-semibold, 600)",
    color: "var(--text, inherit)",
    margin: 0,
  },
  // .toast-description
  description: {
    fontSize: "var(--fontSize-sm, 13px)",
    color: "var(--textSecondary, inherit)",
    margin: "var(--space-1, 4px) 0 0",
  },
  // ── Action Button ──
  // .toast-action
  action: {
    alignSelf: "flex-start",
    marginTop: "var(--space-2, 8px)",
    paddingBlock: "var(--space-1, 4px)",
    paddingInline: "var(--space-3, 12px)",
    font: "inherit",
    fontSize: "var(--fontSize-sm, 13px)",
    fontWeight: "var(--fontWeight-semibold, 600)",
    color: "var(--primary, #3b82f6)",
    backgroundColor: "var(--primaryGhost, rgba(59, 130, 246, 0.1))",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "transparent",
    borderRadius: "var(--radius-sm, var(--radius-xs, 6px))",
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
    transition: {
      default: "background-color 150ms ease, color 150ms ease",
      "@media (prefers-reduced-motion: reduce)": "background-color 0ms, color 0ms",
    },
    ":hover": {
      backgroundColor: "var(--primaryGhostHover, rgba(59, 130, 246, 0.18))",
    },
    ":focus-visible": {
      outline:
        "2px solid var(--focus, var(--primaryGhost, rgba(22, 119, 255, 0.22)))",
      outlineOffset: 2,
    },
    ":active": {
      backgroundColor: "var(--primaryGhostActive, rgba(59, 130, 246, 0.26))",
    },
  },
  // ── Close Button ──
  // .toast-close
  close: {
    flex: "0 0 auto",
    backgroundColor: "none",
    borderWidth: 0,
    borderStyle: "none",
    appearance: "none",
    borderRadius: "var(--radius-sm, var(--radius-xs, 6px))",
    height: 28,
    width: 28,
    color: "var(--textTertiary, #71717a)",
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    outline: "none",
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
    transition: {
      default:
        "background-color var(--motionDuration, 150ms) ease, color var(--motionDuration, 150ms) ease",
      "@media (prefers-reduced-motion: reduce)":
        "background-color 0ms, color 0ms",
    },
    ":hover": {
      backgroundColor: "var(--activeBg, var(--backgroundTertiary, #e4e4e7))",
    },
    ":focus-visible": {
      outline:
        "2px solid var(--focus, var(--primaryGhost, rgba(22, 119, 255, 0.22)))",
      outlineOffset: 2,
    },
    "[data-pressed]": {
      backgroundColor: "var(--activeBg, var(--backgroundTertiary, #e4e4e7))",
    },
  },
});
