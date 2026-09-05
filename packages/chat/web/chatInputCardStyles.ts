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
 * 逃生舱（chatStylexEscapeHatch.css，hook: chat-esc-chat-input-card）：
 * - `:focus-within` 与基础/card shadow 存在 background/border-color/
 *   box-shadow 同名属性竞争，按源码顺序下沉 unlayered 保持级联。
 */
export const chatInputCardStyles = stylex.create({
  card: {
    display: "flex",
    flexDirection: "column",
    backgroundColor: "var(--surfaceInset, var(--surfaceRaised, var(--background)))",
    borderRadius: "var(--radius-lg, var(--radius-md, 12px))",
    padding: "var(--space-3) var(--space-4)",
    position: "relative",
    transition:
      "border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--borderMuted, var(--borderLight))",
    boxShadow: agentThemeTokens.chatInputCardShadow,
    overflow: "hidden",
    width: "100%",
    boxSizing: "border-box",
    "@media (max-width: 768px)": {
      padding: "var(--inputPadding, 10px 14px)",
      borderRadius: "var(--radius-md, 12px)",
    },
  },
});
