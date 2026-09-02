// 文件: render/web/ui/popover.styles.ts
import * as stylex from "@stylexjs/stylex";

/**
 * Popover 样式 —— StyleX 迁移（自 popover.css 1:1 迁出，迁出后该文件已删除）
 *
 * 这是唯一的浮层 shell：菜单/下拉/空间切换器/用户菜单都经 <Popover> 渲染。
 * 形状、高度与动效全部读取 --popover-* 主题变量（app/settings/themeSelectors.ts
 * 的 popover 段），动效通过单个 --origin custom property 按方向变化——
 * 一个 transition 覆盖四边，而非每个表面一套 keyframe。
 *
 * 行为对应：
 * - data-placement 前缀匹配（^=）→ TSX 按 placement 首词挂 placement{Top,
 *   Bottom,Left,Right}（--origin + transform-origin）。
 * - [data-entering]/[data-exiting] → 属性变体键；transform 读 var(--origin)。
 * - OverlayArrow svg 的定位（原为祖先后代选择器）→ arrow 类直接挂 svg，
 *   各方向嵌 1px 修正由 arrowPlacement{Top,Bottom,Left,Right} 挂载。
 * - prefers-reduced-motion 变体与原 CSS 一致（transition 收敛 + transform 归零）。
 */
export const popoverStyles = stylex.create({
  // .app-popover
  popover: {
    boxSizing: "border-box",
    padding: "var(--popover-pad)",
    backgroundColor: "var(--popover-bg)",
    border: "1px solid var(--popover-border)",
    borderRadius: "var(--popover-radius)",
    boxShadow: "var(--popover-shadow)",
    backdropFilter: "blur(var(--popover-blur)) saturate(1.8)",
    WebkitBackdropFilter: "blur(var(--popover-blur)) saturate(1.8)",
    color: "var(--text)",
    zIndex: "var(--z-dropdown, 1000)",
    outline: "none",
    // 箭头在面板盒外；内部滚动容器自行裁剪
    overflow: "visible",
    transition: {
      default:
        "transform var(--popover-duration) var(--popover-ease), opacity var(--popover-duration) var(--popover-ease)",
      "@media (prefers-reduced-motion: reduce)": "opacity 0.1s linear",
    },
    // RAC 在这些 data 状态下保持节点挂载，从而让浮层能动画退场
    "[data-entering]": {
      transform: {
        default: "var(--origin)",
        "@media (prefers-reduced-motion: reduce)": "none",
      },
      opacity: 0,
    },
    "[data-exiting]": {
      transform: {
        default: "var(--origin)",
        "@media (prefers-reduced-motion: reduce)": "none",
      },
      opacity: 0,
      transitionDuration: {
        default: "var(--popover-durationExit)",
        "@media (prefers-reduced-motion: reduce)": "0.1s",
      },
    },
  },
  // [data-placement^="bottom"]
  placementBottom: {
    "--origin": "translateY(calc(-1 * var(--popover-travel))) scale(0.97)",
    transformOrigin: "top center",
  },
  // [data-placement^="top"]
  placementTop: {
    "--origin": "translateY(var(--popover-travel)) scale(0.97)",
    transformOrigin: "bottom center",
  },
  // [data-placement^="right"]
  placementRight: {
    "--origin": "translateX(calc(-1 * var(--popover-travel))) scale(0.97)",
    transformOrigin: "left center",
  },
  // [data-placement^="left"]
  placementLeft: {
    "--origin": "translateX(var(--popover-travel)) scale(0.97)",
    transformOrigin: "right center",
  },
  // .app-popover .react-aria-OverlayArrow svg（箭头：先描边后填充，接缝消失）
  arrow: {
    display: "block",
    fill: "var(--popover-bg)",
    stroke: "var(--popover-border)",
    paintOrder: "stroke",
    strokeWidth: "2px",
    overflow: "visible",
  },
  // [data-placement^="top"] .react-aria-OverlayArrow svg（箭头嵌 1px 盖住边框）
  arrowTop: {
    transform: "translateY(-1px)",
  },
  arrowBottom: {
    transform: "translateY(1px) rotate(180deg)",
  },
  arrowRight: {
    transform: "translateX(1px) rotate(90deg)",
  },
  arrowLeft: {
    transform: "translateX(-1px) rotate(-90deg)",
  },
});
