import * as stylex from "@stylexjs/stylex";
import { agentThemeTokens } from "app/theme/agentTheme.stylex";

/**
 * 模型来源区（API 来源三选一 / CLI 选择 / 只读值 / CLI 信息盒 / 自定义 API 盒）
 * 的 StyleX 样式 —— 自原 BasicInfoTab 样式文件 1:1 迁出（主要消费方
 * ModelSourceSection.tsx；CLI 信息盒家族的另一消费方为
 * OAuthStatusBox.tsx / AdvancedRuntimeSection.tsx）。
 *
 * 原 BasicInfoTab 样式中的布局包装类（gap:24px 版本）在 agent-form
 * 样式捆绑包内被后加载的 PublishSettingsTab 同名类完全覆盖且无直接
 * 消费者，未迁移。自定义 API 盒的 data-theme 暗色覆盖为字面量，
 * 保留在 agentCreateStylexEscapeHatch.css。
 */
export const modelSourceStyles = stylex.create({
  apiSourceSelector: {
    display: "flex",
    gap: "8px",
  },
  apiSourceBtn: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "2px",
    padding: "10px 8px",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    background: "var(--backgroundSecondary)",
    cursor: "pointer",
    transition: "all 0.15s",
    ":hover": {
      borderColor: "var(--primary)",
      background: "var(--backgroundHover)",
    },
  },
  apiSourceBtnActive: {
    borderColor: "var(--primary)",
    background: "var(--primaryGhost, rgba(99,102,241,0.08))",
  },
  apiSourceBtnLabel: {
    fontSize: "var(--fontSize-sm)",
    fontWeight: 600,
    color: "var(--text)",
  },
  apiSourceBtnLabelActive: {
    color: "var(--primary)",
  },
  apiSourceBtnDesc: {
    fontSize: "var(--fontSize-xs)",
    color: "var(--textTertiary)",
  },
  cliSelect: {
    width: "100%",
    padding: "8px 10px",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    fontSize: "var(--fontSize-base)",
    color: "var(--text)",
    background: "var(--background)",
    outline: "none",
    cursor: "pointer",
    ":focus": {
      borderColor: "var(--primary)",
    },
  },
  readonlyValue: {
    minHeight: "var(--control-sm)",
    display: "flex",
    alignItems: "center",
    width: "100%",
    padding: "5px 10px",
    borderLeft: "2px solid var(--primary)",
    borderRadius: "0 6px 6px 0",
    background: "var(--backgroundTertiary)",
    color: "var(--text)",
    fontSize: "var(--fontSize-sm)",
    lineHeight: "var(--leading-normal)",
    opacity: 0.92,
  },
  readonlyValueBreak: {
    wordBreak: "break-all",
    alignItems: "flex-start",
    paddingTop: "7px",
  },
  cliInfoBox: {
    background: "var(--backgroundTertiary, #f0f7ff)",
    borderRadius: "var(--radius-sm)",
    padding: "12px 16px",
    border: "1px solid var(--borderLight)",
  },
  cliInfoBoxTitle: {
    fontSize: "var(--fontSize-sm)",
    fontWeight: 700,
    color: "var(--textSecondary)",
    margin: "0 0 8px",
  },
  cliInfoBoxList: {
    margin: 0,
    paddingLeft: "18px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  // 原 AdvancedSettingsTab.tsx 内联 <style> 的 :global(.cli-info-box__hint)
  // 兜底规则 1:1 迁入：该组件只在 AgentForm 树内渲染，AgentPage 路径下
  // OAuthStatusBox 的 hint 会丢样式，故收敛到本文件供两条路径共用。
  cliInfoBoxHint: {
    margin: "var(--space-2) 0 0",
    color: "var(--textSecondary)",
    fontSize: "var(--fontSize-sm)",
    lineHeight: 1.5,
  },
  // 列表内 <li>/<code> 的样式见 agentCreateStylexEscapeHatch.css
  // （esc 列表后代规则），原文案内联元素过多。
  customApiBox: {
    margin: "4px 0 12px 0",
    padding: "24px",
    background: agentThemeTokens.surfaceGroup,
    borderRadius: "var(--radius-md)",
    border: "none",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    boxShadow: agentThemeTokens.shadowCardRaised,
    animationName: stylex.keyframes({
      from: { opacity: 0, transform: "translateY(-4px)" },
      to: { opacity: 1, transform: "translateY(0)" },
    }),
    animationDuration: "0.4s",
    animationTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
  },
});
