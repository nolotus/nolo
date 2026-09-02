import * as stylex from "@stylexjs/stylex";

/**
 * LiveVoicePanel.tsx 的 StyleX 样式 —— 自原 LiveVoicePanel.css 1:1 迁出
 * （2026-08-30）。与原 CSS 保持 1:1：同一元素、同一声明、同值；
 * 原 `.live-voice-panel .xxx` 后代选择器在本组件内等价于直接类
 *（StyleX 原子类名自带哈希命名空间，无泄漏风险）。
 *
 * 逃生舱（chatStylexEscapeHatch.css）：
 * - `.bar:nth-child(1..5)` 逐条高度/延迟（StyleX 不支持 :nth-child）；
 * - control-btn 的 hover/active/muted/hangup/hangup:hover 阶梯
 *   （与基础 background/color/transform 同名竞争，按源码顺序下沉
 *   unlayered 保持级联），hook: chat-esc-lv-*。
 */
const iconPulse = stylex.keyframes({
  "0%": { opacity: 1, transform: "scale(1)" },
  "50%": { opacity: 0.5, transform: "scale(1.1)" },
  "100%": { opacity: 1, transform: "scale(1)" },
});

const waveform = stylex.keyframes({
  "0%, 100%": { transform: "scaleY(0.3)" },
  "50%": { transform: "scaleY(1)" },
});

export const liveVoicePanelStyles = stylex.create({
  panel: {
    position: "absolute",
    top: "var(--space-4, 16px)",
    right: "var(--space-4, 16px)",
    width: "250px",
    backgroundColor:
      "var(--backgroundGhost, var(--surfaceElevated, rgba(20, 20, 25, 0.9)))",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--borderMuted, var(--borderLight, rgba(255, 255, 255, 0.1)))",
    borderRadius: "var(--radius-sm, var(--radius-xs))",
    padding: "var(--space-4, 16px)",
    color: "var(--text, white)",
    zIndex: "var(--z-dropdown, 1000)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    boxShadow: "var(--shadow3, var(--shadowHeavy, 0 4px 15px rgba(0, 0, 0, 0.3)))",
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-4, 16px)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-2, 8px)",
    fontSize: "var(--fontSize-base, 14px)",
    fontWeight: 500,
  },
  pulseIcon: {
    color: "var(--success, #4ade80)",
    animationName: iconPulse,
    animationDuration: "2s",
    animationIterationCount: "infinite",
  },
  waveformContainer: {
    height: "60px",
    borderRadius: "var(--radius-xs)",
    backgroundColor: "var(--surfaceInset, var(--hoverBg, rgba(255, 255, 255, 0.05)))",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  waveformAnimation: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-1, 4px)",
    height: "40px",
  },
  bar: {
    width: "4px",
    backgroundColor: "var(--success, #4ade80)",
    borderRadius: "2px",
    animationName: waveform,
    animationDuration: "1s",
    animationIterationCount: "infinite",
    animationTimingFunction: "ease-in-out",
  },
  waveformIdle: {
    width: "80%",
    height: "2px",
    backgroundColor: "var(--textMuted, var(--textTertiary, #555))",
  },
  controls: {
    display: "flex",
    justifyContent: "center",
    gap: "var(--space-4, 16px)",
  },
  error: {
    fontSize: "var(--fontSize-xs, 12px)",
    color: "var(--error, #fca5a5)",
    backgroundColor: "var(--errorGhost, rgba(239, 68, 68, 0.15))",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--borderMuted, var(--borderLight, rgba(239, 68, 68, 0.35)))",
    borderRadius: "var(--radius-xs)",
    padding: "var(--space-2) var(--space-3)",
    wordBreak: "break-word",
    maxHeight: "72px",
    overflow: "auto",
  },
  controlBtn: {
    width: "40px",
    height: "40px",
    borderRadius: "var(--radius-md)",
    borderWidth: 0,
    borderStyle: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    backgroundColor: "var(--activeBg, rgba(255, 255, 255, 0.12))",
    color: "var(--text, white)",
    transition: "all var(--motionDuration, 0.2s) var(--motionEase, ease)",
  },
});
