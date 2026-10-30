// 文件路径: packages/app/pages/HomeStyles.ts
import * as stylex from "@stylexjs/stylex";

/**
 * Home 页静态样式（自 Home.css 迁移至 StyleX）。
 *
 * 拆分约定与 agentCreateStylexEscapeHatch.css 相同：
 * - 本文件只放 stylex.create 能表达的元素级静态样式；
 * - 无法表达或属跨文件契约的规则留在 Home.css 逃生舱（每条注明保留原因），
 *   TSX 侧用 stylex.props(styles.x, "hook-class") 与 hook 类名并存。
 */
export const homeStyles = stylex.create({
  // 布局根（游客）。flexShrink: 0 不可省：显式 minHeight 会覆盖 flex 项的
  // 自动内容最小高度，若允许收缩，固定高的 MainLayout__main 会把本元素压成
  // 恰好一屏，内容溢出而 SiteFooter 落在首屏底部（视觉上悬在页面中间）。
  homeLayout: {
    minHeight: "100%",
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: "auto",
    backgroundColor: "var(--surfaceCanvas, var(--background))",
  },
  // 登录态变体：保持原 .home-layout--authed 的 flex: 1 1 0%（可收缩）。
  // 登录后首页不渲染 SiteFooter，压缩行为历史上无可见影响，按原样保留。
  homeLayoutAuthed: {
    minHeight: "100%",
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
  },
  homeMain: {
    width: "100%",
    boxSizing: "border-box",
    minWidth: 0,
    maxWidth: "1080px",
    marginTop: 0,
    marginRight: "auto",
    marginBottom: 0,
    marginLeft: "auto",
    paddingTop: "clamp(12px, 1.5vh, 24px)",
    paddingRight: "clamp(16px, 2vw, 24px)",
    paddingBottom: "clamp(16px, 2.5vh, 32px)",
    paddingLeft: "clamp(16px, 2vw, 24px)",
    display: "flex",
    flexDirection: "column",
    rowGap: "clamp(12px, 1.5vh, 20px)",
    columnGap: "clamp(12px, 1.5vh, 20px)",
  },
  // 访客首页落地页需要通栏（天色与纸色铺满两侧），释放 1080px 居中列与内边距。
  homeMainGuestLanding: {
    maxWidth: "none",
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
  },
  // 原 .home-layout--authed .home-main（后代选择器改为条件应用）。
  homeMainAuthed: {
    flexGrow: 1,
    width: "100%",
    boxSizing: "border-box",
    paddingBottom: "clamp(12px, 2vh, 24px)",
  },
  // 首页主输入框 Shell（StyleX 表达）：在可用 main 高度内水平垂直居中；
  // 去除旧 margin 与 sticky 适配冲突，窄屏键盘弹起时不遮挡输入框。
  homeBottomChatShell: {
    position: "relative",
    zIndex: 20,
    width: "100%",
    maxWidth: "var(--home-content-max-width)",
    flexGrow: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 0,
    marginRight: "auto",
    marginBottom: 0,
    marginLeft: "auto",
    pointerEvents: "none",
    transitionProperty: "transform, opacity",
    transitionDuration: "0.35s",
    transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
  },
  homePrimaryChat: {
    width: "100%",
    maxWidth: "var(--home-content-max-width)",
    marginTop: "clamp(8px, 1vw, 14px)",
    marginRight: "auto",
    marginBottom: 0,
    marginLeft: "auto",
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    backgroundColor: "transparent",
    borderStyle: "none",
    borderWidth: 0,
    boxShadow: "none",
  },
  // 原 .home-bottom-chat-shell .home-primary-chat（后代选择器改为条件应用）。
  homePrimaryChatInShell: {
    marginTop: 0,
    pointerEvents: "auto",
    transitionProperty: "transform, opacity",
    transitionDuration: "0.35s",
    transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
  },
  homeSkeleton: {
    width: "100%",
    minHeight: "var(--home-pane-min-height)",
  },
  homeSkeletonGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "var(--space-4)",
  },
  homeSkeletonCard: {
    borderStyle: "solid",
    borderWidth: "1px",
    borderColor: "var(--borderFaint, var(--borderLight))",
    borderRadius: "var(--radius-lg, 16px)",
    paddingTop: "var(--space-4)",
    paddingRight: "var(--space-4)",
    paddingBottom: "var(--space-4)",
    paddingLeft: "var(--space-4)",
    backgroundColor: "var(--surfaceRaised, var(--background))",
  },
  homeSkeletonHeader: {
    display: "flex",
    gap: "var(--space-3)",
    marginBottom: "var(--space-3)",
  },
  homeSkeletonAvatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    flexShrink: 0,
  },
  homeSkeletonHeaderText: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-2)",
  },
  homeSkeletonBody: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-2)",
  },
  homeSkeletonLine: {
    height: "10px",
    borderRadius: "999px",
  },
  homeSkeletonLineTitle: { width: "72%" },
  homeSkeletonLineSubtitle: { width: "48%" },
  homeSkeletonLineShort: { width: "56%" },
});
