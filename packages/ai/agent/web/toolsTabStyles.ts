import * as stylex from "@stylexjs/stylex";
import { agentThemeTokens } from "app/theme/agentTheme.stylex";

/**
 * 工具/技能标签页（ToolsTab.tsx）的 StyleX 样式 ——
 * 自原 ToolsTab 样式文件 1:1 迁出。
 *
 * 原文件中无消费者的规则（mode-switch 系、skill 卡 dbkey、
 * --partial/--empty 变体、selection 卡对 FormField 内部类的 :global
 * 穿透——该类名全仓库无定义）未迁移。data-theme 暗色字面量覆盖（section 卡、collapsed-note、
 * skill-card、chips、empty-state）保留在 agentCreateStylexEscapeHatch.css。
 * skill-card 的 :hover，以及 section/chip 与暗色覆盖存在同名属性竞争的
 * background/border(/color) 基础声明，也下沉在该逃生舱文件（unlayered 内
 * 按原源码顺序决胜，恢复原级联）。
 * banner 的 --subtle 变体（无 hover 竞争）在 JSX 中为静态写死，以无条件
 * 第二 key 组合保持与原级联一致；skill-card 的 --selected 因与 :hover 存在
 * borderColor/boxShadow 竞争，两条声明下沉在逃生舱 hover 规则之后，
 * StyleX 侧仅保留 skillCardSelected 空 key 占位（组合位置不变）。
 */
export const toolsTabStyles = stylex.create({
  container: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minHeight: 0,
    gap: "8px",
    padding: 0,
    animationName: stylex.keyframes({
      from: { opacity: 0, transform: "translateY(-4px)" },
      to: { opacity: 1, transform: "translateY(0)" },
    }),
    animationDuration: "0.4s",
    animationTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
  },
  selectionCard: {
    display: "flex",
    flex: 1,
    minHeight: 0,
    padding: 0,
    background: "transparent",
    borderRadius: 0,
    border: "none",
    boxShadow: "none",
    transition: "none",
  },
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    width: "100%",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    padding: "20px",
    borderRadius: "var(--radius-sm)",
    background: agentThemeTokens.surfaceOverlaySoft,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: agentThemeTokens.borderOverlaySoft,
    "@media (max-width: 768px)": {
      padding: "16px",
      borderRadius: "var(--radius-sm)",
    },
  },
  sectionHero: {
    gap: "16px",
  },
  headingCopy: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  sectionHeading: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  sectionHeadingWithActions: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "16px",
    "@media (max-width: 768px)": {
      flexDirection: "column",
    },
  },
  // 原 withActions 标题首子元素规则 → 挂在内容 div 上
  sectionHeadingWithActionsFirstChild: {
    minWidth: 0,
    flex: 1,
  },
  heroTitle: {
    margin: 0,
    fontSize: "15px",
    fontWeight: 700,
    color: "var(--text)",
    letterSpacing: "-0.01em",
  },
  sectionHeadingTitle: {
    margin: 0,
    fontSize: "15px",
    fontWeight: 700,
    color: "var(--text)",
    letterSpacing: "-0.01em",
  },
  heroDescription: {
    margin: 0,
    fontSize: "13px",
    lineHeight: 1.6,
    color: "var(--textSecondary)",
  },
  sectionHeadingDescription: {
    margin: 0,
    fontSize: "13px",
    lineHeight: 1.6,
    color: "var(--textSecondary)",
  },
  collapsedNote: {
    padding: "12px 14px",
    borderWidth: "1.5px",
    borderStyle: "dashed",
    borderColor: agentThemeTokens.borderOverlayNote,
    borderRadius: "var(--radius-xs)",
    color: "var(--textSecondary)",
    background: agentThemeTokens.surfaceOverlayNote,
    fontSize: "13px",
    lineHeight: 1.6,
  },
  skillsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "12px",
    "@media (max-width: 768px)": {
      gridTemplateColumns: "1fr",
    },
  },
  skillCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: "8px",
    minWidth: 0,
    boxSizing: "border-box",
    padding: "12px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: agentThemeTokens.borderOverlaySoft,
    borderRadius: "var(--radius-sm)",
    background: agentThemeTokens.surfaceOverlaySkill,
    color: "inherit",
    textAlign: "left",
    transition:
      "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
    // :hover（box-shadow/border-color）下沉在 agentCreateStylexEscapeHatch.css，
    // 需在 unlayered 内位于 dark 覆盖之后才能恢复原级联。
  },
  skillCardSelected: {},
  skillCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  skillCardIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "30px",
    height: "30px",
    borderRadius: "var(--radius-xs)",
    background: "color-mix(in srgb, var(--primary) 12%, transparent)",
    color: "var(--primary)",
    flexShrink: 0,
  },
  skillCardMeta: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    minWidth: 0,
    flex: 1,
  },
  skillCardTitle: {
    fontSize: "14px",
    fontWeight: 700,
    color: "var(--text)",
  },
  skillCardInfoRemove: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    background: "transparent",
    color: "var(--textTertiary)",
    padding: "4px",
    cursor: "pointer",
    borderRadius: "var(--radius-xs)",
    transition: "color 0.15s, background 0.15s",
  },
  skillCardInfo: {
    ":hover": {
      color: "var(--primary)",
      background: "color-mix(in srgb, var(--primary) 10%, transparent)",
    },
  },
  skillCardRemove: {
    ":hover": {
      color: "var(--error, #ef4444)",
      background: "color-mix(in srgb, var(--error, #ef4444) 10%, transparent)",
    },
  },
  skillCardState: {
    width: "fit-content",
    padding: "2px 8px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: 700,
  },
  skillCardStateSelected: {
    background: "color-mix(in srgb, var(--primary) 15%, transparent)",
    color: "var(--primary)",
  },
  skillCardDescription: {
    margin: 0,
    fontSize: "12px",
    lineHeight: 1.5,
    color: "var(--textSecondary)",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  skillDetail: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    padding: "4px 0",
  },
  skillDetailDescription: {
    margin: 0,
    fontSize: "13px",
    lineHeight: 1.6,
    color: "var(--textSecondary)",
  },
  skillCardBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  summarySubsection: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  skillCardLabel: {
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--textTertiary)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  chipsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
  },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    padding: "3px 10px",
    borderRadius: "999px",
    background: agentThemeTokens.surfaceOverlayStrong,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: agentThemeTokens.borderOverlayStrong,
    color: agentThemeTokens.chipText,
    fontSize: "12px",
    fontWeight: 500,
    lineHeight: 1.4,
    transition: "border-color 0.15s, color 0.15s",
  },
  skillCardPatch: {
    display: "-webkit-box",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "flex-start",
    padding: "8px 10px",
    borderRadius: "var(--radius-xs)",
    background: "color-mix(in srgb, var(--primary) 8%, transparent)",
    color: "var(--text)",
    fontSize: "11px",
    lineHeight: 1.5,
  },
  summaryGuidance: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  skillBanner: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    padding: "14px",
    borderRadius: "var(--radius-sm)",
    background: "color-mix(in srgb, var(--primary) 6%, transparent)",
    border: "1px solid color-mix(in srgb, var(--primary) 18%, transparent)",
  },
  skillBannerSubtle: {
    background: "var(--backgroundTertiary)",
    borderColor: "var(--borderLight)",
  },
  skillBannerIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "28px",
    height: "28px",
    borderRadius: "var(--radius-xs)",
    color: "var(--primary)",
    background: "color-mix(in srgb, var(--primary) 14%, transparent)",
    flexShrink: 0,
  },
  skillBannerCopy: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    fontSize: "13px",
    lineHeight: 1.6,
    color: "var(--textSecondary)",
  },
  skillBannerCopyStrong: {
    color: "var(--text)",
    fontSize: "13px",
  },
  skillActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "12px",
    padding: "16px",
    borderRadius: "var(--radius-sm)",
    background: agentThemeTokens.surfaceOverlayFaint,
    border: "1.5px dashed color-mix(in srgb, var(--border) 70%, transparent)",
  },
  summaryEmpty: {
    padding: "16px",
    borderRadius: "var(--radius-sm)",
    background: "var(--backgroundTertiary)",
    color: "var(--textSecondary)",
    fontSize: "13px",
    lineHeight: 1.6,
    textAlign: "center",
  },
  dialogBody: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  dialogHelp: {
    color: "var(--textSecondary)",
    fontSize: "13px",
    lineHeight: 1.6,
  },
  dialogError: {
    padding: "10px 12px",
    borderRadius: "var(--radius-xs)",
    background: "color-mix(in srgb, var(--error, #ef4444) 8%, transparent)",
    border: "1px solid color-mix(in srgb, var(--error, #ef4444) 20%, transparent)",
    color: "var(--error, #ef4444)",
    fontSize: "13px",
    lineHeight: 1.5,
  },
});
