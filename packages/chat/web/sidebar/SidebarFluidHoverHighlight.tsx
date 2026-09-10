// SidebarFluidHoverHighlight: the shared hover bar for the virtualized
// sidebar list. Pure visual — position / size / opacity only (styles live in
// SidebarFluidHoverStyles.ts per the repo's *Styles.ts StyleX convention).
// Owns no business state and intercepts no pointer events.

import React from "react";
import * as stylex from "@stylexjs/stylex";
import { sidebarFluidHoverHighlightStyles as styles } from "./SidebarFluidHoverStyles";

export interface SidebarFluidHoverHighlightProps {
  /** Content-space Y of the active row's slot top (index * rowSize). */
  top: number;
  /** Visual row height in px (the highlighted bar's height). */
  height: number;
  /** False while suspended / after pointerleave → fades out in place. */
  visible: boolean;
}

/**
 * Shared highlight layer for the virtualized sidebar list. Rendered through
 * a portal into the list's RAC content layer by SidebarFluidHoverLayer.
 */
export function SidebarFluidHoverHighlight({
  top,
  height,
  visible,
}: SidebarFluidHoverHighlightProps) {
  return (
    <div
      aria-hidden="true"
      role="presentation"
      data-hook="sidebar-fluid-hover-highlight"
      {...stylex.props(styles.highlight)}
      style={{
        height: `${height}px`,
        transform: `translate3d(0, ${top}px, 0)`,
        opacity: visible ? 1 : 0,
      }}
    />
  );
}