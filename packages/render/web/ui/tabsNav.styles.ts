// 文件: render/web/ui/tabsNav.styles.ts
import * as stylex from "@stylexjs/stylex";

/**
 * TabsNav 样式 —— StyleX 迁移
 * （自原 ui.css「TabsNav」分区 1:1 迁出，迁出后该分区已删除）
 *
 * 结构转换：
 * - 原 `.tabs::after` 滑块改为真实 DOM 元素（slider 类）；原
 *   `.tabs:focus-within::after` 祖先伪类组合由 nav 的 React focus
 *   （onFocus/onBlur 冒泡，等价 focus-within）驱动的 sliderFocusOutline 承接。
 * - 原 `[data-active="true"]` / `[disabled]` / `:not([disabled]):hover`：
 *   data-active 用属性变体键；disabled 用 :disabled 伪类；hover 仅在
 *   非 disabled 时挂载（tabItemHover，见 TabsNav.tsx）。
 * - 原 .tabs 的 --tabs-* 局部变量已内联（radius 999/997、height 40、
 *   speed 0.3s、--ease linear() 曲线直接内联进 transition）。
 * - 例外：`[data-theme='dark'] .tabs::after` 祖先主题选择器已迁至
 *   theme-ui.css（slider 保留语义类名 tabs-slider 命中）。
 * - 滑块 left/width 仍由 TabsNav.tsx 通过 --sliderLeft/--sliderWidth
 *   CSS 变量驱动（JS 测量）。
 */

const tabsSpeed = 0.3;

const tabsEase =
  "linear(0, 0.1641 3.52%, 0.311 7.18%, 0.4413 10.99%, 0.5553 14.96%, 0.6539 19.12%, 0.738 23.5%, 0.8086 28.15%, 0.8662 33.12%, 0.9078 37.92%, 0.9405 43.12%, 0.965 48.84%, 0.9821 55.28%, 0.992 61.97%, 0.9976 70.09%, 1)";

export const tabsNavStyles = stylex.create({
  // .tabs-nav
  nav: {
    paddingInline: "var(--space-1)",
    overflowX: "auto",
    scrollbarWidth: "none",
    "::-webkit-scrollbar": {
      display: "none",
    },
  },
  // .tabs
  tabs: {
    height: 40,
    display: "inline-grid",
    gridAutoFlow: "column",
    gridAutoColumns: "max-content",
    position: "relative",
    borderRadius: 999,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "color-mix(in srgb, var(--borderLight) 92%, transparent)",
    backgroundColor: "var(--surfaceInteractive, var(--backgroundSecondary))",
    padding: 2,
    alignItems: "stretch",
  },
  // .tabs::after（滑块，真实 DOM；宽度/位移由 --sliderWidth/--sliderLeft 驱动）
  slider: {
    position: "absolute",
    top: 2,
    left: 0,
    height: "calc(100% - 4px)",
    width: "var(--sliderWidth, 0px)",
    borderRadius: 997,
    backgroundColor: "var(--surfaceRaised, var(--background))",
    boxShadow:
      "0 1px 2px var(--shadowLight), 0 8px 18px -20px var(--shadowMedium)",
    transform: "translateX(var(--sliderLeft, 0px))",
    transition: `transform ${tabsSpeed}s ${tabsEase}, width ${tabsSpeed} ${tabsEase}`,
    willChange: "transform, width",
    zIndex: 0,
  },
  // .tabs:focus-within::after（键盘 focus 描边，由 React focus 态挂载）
  sliderFocusOutline: {
    outline: "1px solid var(--primaryGhost)",
  },
  // .tab-item（含 [data-active] / [disabled] 状态变体）
  tabItem: {
    borderWidth: 0,
    borderStyle: "none",
    outline: "none",
    margin: 0,
    paddingInline: "clamp(0.7rem, 1.6vw + 0.2rem, 1.5rem)",
    cursor: "pointer",
    textAlign: "center",
    height: "100%",
    display: "grid",
    placeItems: "center",
    backgroundColor: "transparent",
    borderRadius: 997,
    minWidth: 64,
    color: "var(--textSecondary)",
    fontSize: "var(--fontSize-sm)",
    fontWeight: 500,
    whiteSpace: "nowrap",
    lineHeight: "var(--leading-tight)",
    position: "relative",
    zIndex: 1,
    transition: `color ${tabsSpeed}s ${tabsEase}, background-color ${tabsSpeed}s ${tabsEase}`,
    "[data-active=true]": {
      color: "var(--primary)",
      fontWeight: 600,
    },
    ":disabled": {
      opacity: 0.4,
      cursor: "not-allowed",
    },
  },
  // .tab-item:not([disabled]):hover（仅非 disabled 时挂载）
  tabItemHover: {
    ":hover": {
      color: "var(--text)",
    },
  },
});
