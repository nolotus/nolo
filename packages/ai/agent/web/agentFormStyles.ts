import * as stylex from "@stylexjs/stylex";
import { agentThemeTokens } from "app/theme/agentTheme.stylex";

/**
 * AgentForm 创建/编辑表单骨架 + 运行方式选择步骤的 StyleX 样式
 * （自原 AgentForm 样式文件 1:1 迁出；原文件由 scripts/dev/routeStyles.js
 * 打进 agent-form.css 捆绑包，迁移后消费方改用 stylex.props）。
 *
 * 与原 CSS 保持 1:1：同一元素、同一声明、同值。
 * 原文件中无活跃消费者的规则（publish 折叠区系列、panel meta 系列、
 * more-actions/more-btn、panel desktop 修饰）未迁移，见迁移报告。
 * 无法用 StyleX 表达的规则（data-theme 覆盖、:not(:disabled)、
 * 跨组件后代选择器）集中在 agentCreateStylexEscapeHatch.css。
 */
export const agentFormStyles = stylex.create({
  // 创建/编辑容器共同声明
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "var(--background)",
    color: "var(--text)",
  },
  createContainer: {
    maxWidth: "840px",
    margin: "40px auto",
    padding: "0 24px",
    "@media (max-width: 640px)": {
      padding: "0 16px",
      margin: "16px auto",
    },
  },
  editContainer: {
    maxWidth: "100%",
    margin: 0,
    padding: 0,
    "@media (max-width: 640px)": {
      padding: 0,
      margin: 0,
    },
  },
  formHeader: {
    position: "sticky",
    top: 0,
    zIndex: 20,
    backgroundColor: agentThemeTokens.surfaceGlassHeader,
    padding: "8px 0 12px",
    display: "flex",
    justifyContent: "center",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: agentThemeTokens.borderGlassHeader,
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    "@media (max-width: 640px)": {
      padding: "12px 0",
    },
  },
  formBody: {
    flex: 1,
    paddingBottom: "var(--space-8, 32px)",
  },
  tabContent: {
    padding: "12px 0 8px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    maxWidth: "720px",
    margin: "0 auto",
    "@media (max-width: 640px)": {
      padding: "8px 0 8px",
      gap: "12px",
    },
  },
  tabPanel: {
    animationName: stylex.keyframes({
      from: { opacity: 0, transform: "translateY(10px)" },
      to: { opacity: 1, transform: "translateY(0)" },
    }),
    animationDuration: "0.4s",
    animationTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
  },
  formFooter: {
    position: "sticky",
    bottom: 0,
    zIndex: 20,
    flexShrink: 0,
    padding: "10px 12px",
    margin: "0 -24px",
    backgroundColor: agentThemeTokens.surfaceGlassFooter,
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: agentThemeTokens.borderGlassFooter,
    boxShadow: agentThemeTokens.shadowFooterUpward,
    "@media (max-width: 640px)": {
      padding: "4px 8px",
      margin: "0 -16px",
    },
  },
  footerActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "8px",
    maxWidth: "720px",
    margin: "0 auto",
    minHeight: "var(--control-sm)",
    "@media (max-width: 640px)": {
      flexDirection: "column-reverse",
      gap: "10px",
    },
  },
  // 原 footer 操作按钮规则（@media 640）→ 挂到 footer 内每个 <Button>
  footerActionButton: {
    "@media (max-width: 640px)": {
      width: "100%",
      height: "46px",
      fontSize: "var(--fontSize-lg)",
    },
  },
  nextSteps: {
    maxWidth: "720px",
    margin: "0 auto 6px",
    color: "var(--textSecondary)",
    fontSize: "var(--fontSize-xs)",
    lineHeight: 1.45,
    "@media (max-width: 640px)": {
      marginBottom: "8px",
      fontSize: "var(--fontSize-sm)",
    },
  },
  runModeBanner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    maxWidth: "720px",
    margin: "0 auto 8px",
    padding: "10px 12px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--borderLight, var(--border))",
    borderRadius: "var(--radius-sm)",
    backgroundColor: "var(--backgroundElevated, var(--backgroundSecondary))",
    fontSize: "var(--fontSize-sm)",
    color: "var(--textSecondary)",
    "@media (max-width: 480px)": {
      flexWrap: "wrap",
    },
  },
  runModeBannerLabel: {
    color: "var(--text)",
    fontWeight: 600,
  },
  runModeBannerChange: {
    flexShrink: 0,
    padding: "4px 10px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--border)",
    borderRadius: "var(--radius-sm)",
    backgroundColor: "transparent",
    color: "var(--primary)",
    fontSize: "var(--fontSize-sm)",
    fontWeight: 600,
    cursor: "pointer",
    ":hover": {
      borderColor: "var(--primary)",
      backgroundColor: "var(--primaryGhost, rgba(99, 102, 241, 0.08))",
    },
  },
  // ── Create source step（运行方式四卡） ──
  createSourceStep: {
    maxWidth: "720px",
    margin: "8px auto 32px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  createSourceStepIntro: {
    textAlign: "center",
  },
  createSourceStepHeading: {
    margin: "0 0 6px",
    fontSize: "var(--fontSize-xl, 1.25rem)",
    fontWeight: 650,
    color: "var(--text)",
  },
  createSourceStepSub: {
    margin: 0,
    fontSize: "var(--fontSize-sm)",
    color: "var(--textSecondary)",
    lineHeight: 1.5,
  },
  createSourceStepCards: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "clamp(10px, 1.2vw, 16px)",
    "@media (max-width: 760px)": {
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    },
    "@media (max-width: 480px)": {
      gridTemplateColumns: "1fr",
    },
  },
  createSourceCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "8px",
    padding: "16px 14px",
    textAlign: "left",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--border)",
    borderRadius: "var(--radius-md, 10px)",
    backgroundColor: "var(--backgroundElevated, var(--backgroundSecondary))",
    color: "var(--text)",
    cursor: "pointer",
    transition:
      "border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease",
    ":focus-visible": {
      outline: "2px solid var(--primary)",
      outlineOffset: "2px",
    },
    ":disabled": {
      opacity: 0.55,
      cursor: "not-allowed",
    },
  },
  createSourceCardActive: {
    borderColor: "var(--primary)",
    backgroundColor: "var(--primaryGhost, rgba(99, 102, 241, 0.08))",
    boxShadow: "0 0 0 1px var(--primary)",
  },
  createSourceCardTop: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    width: "100%",
  },
  createSourceCardTitle: {
    fontSize: "var(--fontSize-base)",
    fontWeight: 650,
    color: "var(--text)",
  },
  createSourceCardTitleActive: {
    color: "var(--primary)",
  },
  createSourceCardBadge: {
    marginLeft: "auto",
    fontSize: "11px",
    fontWeight: 600,
    padding: "2px 6px",
    borderRadius: "999px",
    color: "var(--primary)",
    backgroundColor: "var(--primaryGhost, rgba(99, 102, 241, 0.12))",
    whiteSpace: "nowrap",
  },
  createSourceCardDesc: {
    margin: 0,
    fontSize: "var(--fontSize-sm)",
    color: "var(--textSecondary)",
    lineHeight: 1.45,
  },
  createSourceCardFootnote: {
    margin: 0,
    marginTop: "auto",
    fontSize: "var(--fontSize-xs)",
    color: "var(--textTertiary)",
    lineHeight: 1.4,
  },
  createSourceStepMore: {
    fontSize: "var(--fontSize-sm)",
    color: "var(--textSecondary)",
  },
  createSourceStepMoreSummary: {
    cursor: "pointer",
    userSelect: "none",
    color: "var(--textSecondary)",
  },
  createSourceStepMoreBody: {
    marginTop: "10px",
    fontSize: "var(--fontSize-sm)",
    color: "var(--textSecondary)",
    lineHeight: 1.5,
  },
  createSourceStepMoreBodyParagraph: {
    margin: "0 0 8px",
  },
  createSourceStepMoreLink: {
    padding: 0,
    borderWidth: 0,
    borderStyle: "none",
    backgroundColor: "transparent",
    color: "var(--primary)",
    fontSize: "var(--fontSize-sm)",
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "underline",
    textUnderlineOffset: "2px",
  },
  createSourcePanel: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    padding: "16px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--border)",
    borderRadius: "var(--radius-md, 10px)",
    backgroundColor: "var(--backgroundElevated, var(--backgroundSecondary))",
  },
  createSourcePanelActions: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: "10px",
    paddingTop: "4px",
  },
  // 原 panel 操作按钮规则（@media 480）→ 挂到面板内每个 <Button>
  createSourcePanelActionButton: {
    "@media (max-width: 480px)": {
      width: "100%",
    },
  },
  createSourcePanelDesktopTitle: {
    margin: 0,
    fontSize: "var(--fontSize-base)",
    fontWeight: 650,
    color: "var(--text)",
  },
  createSourcePanelDesktopBody: {
    margin: 0,
    fontSize: "var(--fontSize-sm)",
    color: "var(--textSecondary)",
    lineHeight: 1.5,
  },
  createSourceField: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  createSourceFieldLabel: {
    fontSize: "var(--fontSize-sm)",
    fontWeight: 600,
    color: "var(--text)",
  },
  createSourceFieldInput: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--border)",
    borderRadius: "var(--radius-sm)",
    backgroundColor: "var(--background, #0f1115)",
    color: "var(--text)",
    fontSize: "var(--fontSize-sm)",
    lineHeight: 1.45,
    resize: "vertical",
    ":focus": {
      outline: "none",
      borderColor: "var(--primary)",
      boxShadow: "0 0 0 1px var(--primary)",
    },
    ":disabled": {
      opacity: 0.6,
      cursor: "not-allowed",
    },
  },
  createSourceFieldTextarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--border)",
    borderRadius: "var(--radius-sm)",
    backgroundColor: "var(--background, #0f1115)",
    color: "var(--text)",
    fontSize: "var(--fontSize-sm)",
    lineHeight: 1.45,
    resize: "vertical",
    ":focus": {
      outline: "none",
      borderColor: "var(--primary)",
      boxShadow: "0 0 0 1px var(--primary)",
    },
    ":disabled": {
      opacity: 0.6,
      cursor: "not-allowed",
    },
  },
});
