// SidebarFluidHoverStyles.ts
// StyleX styles for the sidebar fluid hover capability.
//
// 仓库惯例：stylex.keyframes 等 StyleX 静态 API 必须住在 *Styles.ts（bunfig
// 的 stylexBunPlugin 只对 *Styles.ts / *.stylex.ts 挂 Babel 编译通道；组件
// TSX 里的 stylex.props() 是运行时安全函数，无需编译）。
//
// Layering contract: the highlight renders with z-index:-1 inside the list
// scroller (the scroller is position:relative + z-index:0, see
// sidebarStyles.scroller), so it paints above the scroller background but
// BELOW the RAC row slots. Persistent row backgrounds (active / selected /
// open / flash / dragging) therefore naturally mask it — hover stays a
// transient preview and never covers persistent state, without any z-index
// stack beyond one negative key.
//
// Motion: ~100ms translate3d slide within one hover session + a short fade-in
// on each session start (the layer remounts it via key). Both snap under
// prefers-reduced-motion: feedback stays, movement goes.

import * as stylex from "@stylexjs/stylex";

const fadeIn = stylex.keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

export const sidebarFluidHoverHighlightStyles = stylex.create({
  highlight: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    // Below the row slots (see header): persistent rows mask the highlight.
    zIndex: -1,
    borderRadius: "var(--radius-sm, 6px)",
    backgroundColor: "color-mix(in srgb, var(--text) 6%, transparent)",
    pointerEvents: "none",
    animationName: {
      default: fadeIn,
      "@media (prefers-reduced-motion: reduce)": "none",
    },
    animationDuration: "0.1s",
    animationTimingFunction: "ease-out",
    transitionProperty: {
      default: "transform, opacity",
      "@media (prefers-reduced-motion: reduce)": "none",
    },
    transitionDuration: "0.1s",
    transitionTimingFunction: "ease-out",
  },
});