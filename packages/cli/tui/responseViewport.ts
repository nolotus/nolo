/**
 * TUI 的展示能力 —— 单一来源（窄屏终端 → narrow：localLoop 据此注入窄屏排版段）。
 *
 * 单独成模块是为了零 import（叶子模块），避免 `session ↔ tuiTurnRunner` 方向上的循环依赖。
 *
 * 约定：runtime 调用点与全部估算调用点共用这一个绑定，改值或删引用都必须同步改。
 */
export const TUI_RESPONSE_VIEWPORT = "narrow" as const;
