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
 * `:focus-within` 已收进 StyleX：原先靠 chatStylexEscapeHatch.css 的
 * unlayered 规则承载，因果链不直观且与同名属性靠源码顺序决胜；现改为
 * `:focus-within` 伪类直接挂在 card 上。
 * 2026-11-04 按用户反馈把聚焦反馈调淡（曾为「primary 70% 描边 + 实色
 * 2px 光环 + 浮起阴影」，过于抢眼）：边框混色降到 32%，光环改为 1px
 * 18% 透明度 + 极淡阴影，焦点仍然可见但不发亮。
 */
export const chatInputCardStyles = stylex.create({
  card: {
    display: "flex",
    flexDirection: "column",
    backgroundColor: {
      default: agentThemeTokens.chatInputCardBackground,
      ":focus-within": agentThemeTokens.chatInputCardBackground,
    },
    borderRadius: "var(--radius-lg, var(--radius-md, 12px))",
    padding: "var(--space-1) var(--space-4)",
    position: "relative",
    transition:
      "border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: {
      default: "var(--borderMuted, var(--borderLight))",
      ":focus-within":
        "color-mix(in srgb, var(--primary) 32%, var(--border, #e4e4e7))",
    },
    boxShadow: {
      default: agentThemeTokens.chatInputCardShadow,
      // 克制的聚焦反馈：1px 低透明度主色描边 + 极淡浮起阴影。
      // 早先用 0 0 0 2px 实色光环，用户反馈「active 效果太明显」。
      ":focus-within":
        "0 0 0 1px color-mix(in srgb, var(--primary) 18%, transparent), 0 2px 8px -4px color-mix(in srgb, var(--primary) 12%, transparent)",
    },
    overflow: "hidden",
    width: "100%",
    boxSizing: "border-box",
    "@media (max-width: 768px)": {
      padding: "var(--inputPadding, 8px 12px)",
      borderRadius: "var(--radius-md, 12px)",
    },
  },

  /**
   * 对话页输入卡片：胶囊形态（全圆角 + 贴边内边距）。
   * 与 card 叠加使用（stylex.props(card, cardCapsule)），
   * 首页 quick-chat 仍然只用 card，形态完全不变。
   */
  cardCapsule: {
    /* 固定大圆角而非 999px：单行 48px 高时视觉上仍是胶囊（≈半高），
       多行增高后变成正常的圆角矩形；999px 会把多行状态拉成一颗药丸。 */
    borderRadius: "var(--radius-xl)",
    padding: "4px 6px",
    minHeight: 48,
  },
});
