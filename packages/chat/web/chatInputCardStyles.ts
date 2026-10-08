import * as stylex from "@stylexjs/stylex";
import { agentThemeTokens } from "app/theme/agentTheme.stylex";

/**
 * 聊天输入卡片外壳（chatInputCard.css → StyleX 1:1 迁出，2026-08-30）。
 * Shared chat input card shell — used by .message-input__box and .quick-chat-box
 *
 * 与原 CSS 保持 1:1：同一元素、同一声明、同值。
 *
 * 暗色覆盖通道：原 `[data-theme="dark"] .chat-input-card` 的 box-shadow
 * 字面量覆盖收编入主题 token `agentThemeTokens.chatInputCardShadow`
 *（agentTheme.stylex.ts，light/dark 值与原两条声明逐一相等，值内
 * var(--shadowLight) 等仍消费 GlobalThemeController 的 :root 变量）。
 *
 * `:focus-within` 已收进 StyleX（2026-10-03）：原先靠
 * chatStylexEscapeHatch.css 的 unlayered 规则承载，因果链不直观且
 * 与同名属性靠源码顺序决胜；现改为 `:focus-within` 伪类直接挂在
 * card 上，并升级为「更突出的物理描边 + 双段聚焦光环」：
 * - borderColor 提到 var(--primary) 70% 混入（原 60%），亮暗主题都更醒目；
 * - boxShadow 第一段 0 0 0 2px var(--primary) 实色光环（原 20% 透明
 *   3px 晕），第二段浮起阴影 0 8px 24px -4px，聚焦即有明确视觉反馈。
 */
export const chatInputCardStyles = stylex.create({
  card: {
    display: "flex",
    flexDirection: "column",
    backgroundColor: {
      default:
        "var(--surfaceInset, var(--surfaceRaised, var(--background)))",
      ":focus-within":
        "var(--surfaceInset, var(--surfaceRaised, var(--background)))",
    },
    borderRadius: "var(--radius-lg, var(--radius-md, 12px))",
    padding: "var(--space-2) var(--space-4)",
    position: "relative",
    transition:
      "border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: {
      default: "var(--borderMuted, var(--borderLight))",
      ":focus-within":
        "color-mix(in srgb, var(--primary) 70%, var(--border, #e4e4e7))",
    },
    boxShadow: {
      default: agentThemeTokens.chatInputCardShadow,
      ":focus-within":
        "0 0 0 2px var(--primary), 0 8px 24px -4px color-mix(in srgb, var(--primary) 28%, transparent), 0 4px 12px -6px var(--shadowMedium)",
    },
    overflow: "hidden",
    width: "100%",
    boxSizing: "border-box",
    "@media (max-width: 768px)": {
      padding: "var(--inputPadding, 8px 12px)",
      borderRadius: "var(--radius-md, 12px)",
    },
  },
});
