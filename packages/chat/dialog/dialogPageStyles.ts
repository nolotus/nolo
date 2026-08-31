import * as stylex from "@stylexjs/stylex";

/**
 * DialogPage.css → StyleX 1:1 迁出（2026-08-30）。
 * 覆盖消费方：DialogPage.tsx、PageAssistantPanel.tsx、
 * ObjectAssistantPanel.tsx（ObjectAssistantShell 复用同一组
 * page-assistant-panel 类，经 PageAssistantPanel 传递加载原 CSS）。
 * 与原 CSS 保持 1:1：同一元素、同一声明、同值。
 *
 * 逃生舱（dialogStylexEscapeHatch.css，hook: dialog-esc-dp-* /
 * dialog-esc-pap-* / dialog-esc-est-*）：
 * - 滚动条伪元素（::-webkit-scrollbar*）、html[data-nolo-desktop]
 *   祖先覆盖、:hover —— StyleX 不支持；
 * - `.DialogPage__messages`/`page-assistant-panel__chat-messages` 上的
 *   跨组件后代覆盖（chat-messages__list / scroll-buttons /
 *   message-input 等）：类名仍保留在 DOM（组件 className prop 通道
 *   或其所属组件字面 className），规则按原选择器 + 基线源码顺序下沉
 *   unlayered；`.DialogPage-root` / `page-assistant-panel__chat` 改用
 *   data-hook 承载；
 * - banner link :hover、empty-state 按钮 hover/focus-visible ——
 *   与 StyleX 存在/可能存在同名属性竞争或 StyleX 不支持的选择器。
 */
export const dialogPageStyles = stylex.create({
  // ── DialogPage.tsx ──
  shell: {
    display: "flex",
    flex: "1 1 auto",
    minHeight: 0,
    width: "100%",
    "@media (max-width: 960px)": {
      display: "block",
    },
  },
  root: {
    "--dialog-content-max-width": "960px",
    maxWidth: "none !important",
    margin: 0,
    width: "100%",
    flex: "1 1 auto",
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    height: "100%",
    overflow: "hidden",
    backgroundColor: "var(--background)",
    "@media (max-width: 480px)": {
      "--dialog-content-max-width": "100%",
    },
    "@media (min-width: 481px) and (max-width: 768px)": {
      "--dialog-content-max-width": "100%",
    },
    "@media (min-width: 769px) and (max-width: 1199px)": {
      "--dialog-content-max-width": "960px",
    },
    "@media (min-width: 1200px) and (max-width: 1599px)": {
      "--dialog-content-max-width": "1040px",
    },
    "@media (min-width: 1600px)": {
      "--dialog-content-max-width": "1180px",
    },
  },
  /* 原 `.DialogPage-shell--withDraftPanel .DialogPage-root,
   * .DialogPage-shell--withChildRunObserver .DialogPage-root`：
   * 仅 min-width 一项声明，与 root 基础无同名属性，条件组合即可 */
  rootWithSidePanel: {
    minWidth: 0,
  },
  messages: {
    flex: "1 1 auto",
    minHeight: 0,
    overflowY: "auto",
    overflowX: "hidden",
    overscrollBehavior: "contain",
    paddingInline: "16px",
    paddingTop: "12px",
    /* Overlay scrollbar: invisible until hover (no permanent bright track). */
    scrollbarWidth: "thin",
    scrollbarColor: "transparent transparent",
    "@media (max-width: 480px)": {
      paddingInline: "10px",
      paddingBlock: "var(--space-3)",
    },
    "@media (min-width: 481px) and (max-width: 768px)": {
      paddingInline: "12px",
      paddingBlock: "var(--space-3)",
    },
    "@media (min-width: 769px) and (max-width: 1199px)": {
      paddingInline: "20px",
    },
    "@media (min-width: 1200px) and (max-width: 1599px)": {
      paddingInline: "24px",
    },
    "@media (min-width: 1600px)": {
      paddingInline: "32px",
    },
  },
  contextBanner: {
    flexShrink: 0,
    padding: "10px 16px 0",
    "@media (max-width: 480px)": {
      paddingInline: "10px",
    },
    "@media (min-width: 481px) and (max-width: 768px)": {
      paddingInline: "12px",
    },
    "@media (min-width: 769px) and (max-width: 1199px)": {
      paddingInline: "20px",
    },
    "@media (min-width: 1200px) and (max-width: 1599px)": {
      paddingInline: "24px",
    },
    "@media (min-width: 1600px)": {
      paddingInline: "32px",
    },
  },
  contextBannerInner: {
    width: "min(100%, var(--dialog-content-max-width))",
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "10px 14px",
    borderRadius: "var(--radius-sm)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--borderMuted, var(--borderLight))",
    backgroundColor: "var(--surfaceInset, var(--surfaceRaised, var(--backgroundSecondary)))",
    color: "var(--textSecondary)",
    fontSize: "var(--fontSize-sm)",
    "@media (max-width: 480px)": {
      alignItems: "flex-start",
      flexDirection: "column",
    },
    "@media (min-width: 481px) and (max-width: 768px)": {
      alignItems: "flex-start",
      flexDirection: "column",
    },
  },
  contextBannerText: {
    minWidth: 0,
  },
  contextBannerLink: {
    borderWidth: 0,
    borderStyle: "none",
    backgroundColor: "transparent",
    color: "var(--primary)",
    cursor: "pointer",
    fontSize: "var(--fontSize-sm)",
    fontWeight: 600,
    padding: 0,
    flexShrink: 0,
  },

  // ── PageAssistantPanel.tsx / ObjectAssistantPanel.tsx ──
  pap: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    minWidth: 0,
    padding: "var(--space-3)",
    borderLeftWidth: "1px",
    borderLeftStyle: "solid",
    borderLeftColor: "var(--borderLight)",
    backgroundColor: "var(--background)",
    "@media (max-width: 960px)": {
      display: "none",
    },
  },
  papHeader: {
    marginBottom: "var(--space-2)",
  },
  papTitle: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "var(--textSecondary)",
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--space-2)",
  },
  papTitleIcon: {
    width: "20px",
    height: "20px",
    borderRadius: "999px",
    backgroundColor: "var(--primaryGhost)",
    display: "grid",
    placeItems: "center",
    color: "var(--primary)",
  },
  papBody: {
    flex: "1",
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden" /* 把滚动交给内部具体区域 */,
  },
  papLoading: {
    flex: "1",
    minHeight: "160px",
    display: "grid",
    placeItems: "center",
  },
  papChat: {
    flex: "1",
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-2)",
  },
  papChatMessages: {
    flex: "1",
    minHeight: 0,
    display: "flex",
    overflowY: "auto",
    overflowX: "hidden",
    overscrollBehavior: "contain",
  },

  // ── 空状态（PageAssistantPanel EmptyState）──
  emptyState: {
    flex: "1",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--space-3)",
    minHeight: "220px",
    color: "var(--textTertiary)",
    textAlign: "center",
  },
  emptyStateIcon: {
    width: "64px",
    height: "64px",
    borderRadius: "var(--radius-md)",
    backgroundImage: "linear-gradient(135deg, var(--primary), var(--primaryLight))",
    color: "var(--background)",
    display: "grid",
    placeItems: "center",
    boxShadow: "0 4px 12px 0 var(--shadowMedium)",
  },
  emptyStateText: {
    fontSize: "0.9rem",
    fontWeight: 500,
    margin: 0,
  },
  emptyStateBtn: {
    marginTop: "var(--space-1)",
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--space-2)",
    padding: "var(--space-1) var(--space-4)",
    borderRadius: "9999px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--primaryGhost)",
    backgroundColor: "var(--primary)",
    color: "var(--background)",
    fontSize: "0.8rem",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "0 1px 2px 0 var(--shadowLight)",
  },
});
