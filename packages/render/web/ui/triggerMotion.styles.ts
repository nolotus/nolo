// packages/render/web/ui/triggerMotion.styles.ts
//
// Shared trigger-anchored entrance animation for floating menus, dropdowns,
// and context menus that do not go through React Aria's [data-entering] state.
// Callers set inline `transformOrigin` (and optionally `--nolo-enter-x` /
// `--nolo-enter-y`) so every surface scales out of its trigger rather than center.
import * as stylex from "@stylexjs/stylex";

const triggerEnter = stylex.keyframes({
  from: {
    opacity: 0,
    transform:
      "translate3d(var(--nolo-enter-x, 0px), var(--nolo-enter-y, calc(var(--popover-travel, 6px) * -1)), 0) scale(0.96)",
  },
  to: {
    opacity: 1,
    transform: "translate3d(0, 0, 0) scale(1)",
  },
});

export const triggerMotionStyles = stylex.create({
  enter: {
    animationName: {
      default: triggerEnter,
      "@media (prefers-reduced-motion: reduce)": "none",
    },
    animationDuration: "var(--popover-duration, 0.18s)",
    animationTimingFunction:
      "var(--popover-ease, cubic-bezier(0.22, 1, 0.36, 1))",
    animationFillMode: "both",
  },
});
