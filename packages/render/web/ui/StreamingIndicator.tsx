// render/web/ui/StreamingIndicator.tsx
import * as stylex from "@stylexjs/stylex";
import React, { memo } from "react";

import { indicatorStyles } from "./streamingIndicator.styles";

export interface StreamingIndicatorProps {
  /**
   * 裸形态（透明背景、无边框阴影、34px）：用于 PageLoading 等容器内。
   * 原为 PageLoading 通过后代选择器 + !important 覆盖，现改为显式 prop。
   */
  bare?: boolean;
}

const StreamingIndicator = memo(({ bare = false }: StreamingIndicatorProps) => {
  return (
    <div
      {...stylex.props(indicatorStyles.indicator, bare && indicatorStyles.bare)}
      aria-hidden="true"
    >
      <span {...stylex.props(indicatorStyles.dot, indicatorStyles.dotReducedMotion)} />
      <span
        {...stylex.props(
          indicatorStyles.dot,
          indicatorStyles.dotDelay1,
          indicatorStyles.dotReducedMotion,
        )}
      />
      <span
        {...stylex.props(
          indicatorStyles.dot,
          indicatorStyles.dotDelay2,
          indicatorStyles.dotReducedMotion,
        )}
      />
    </div>
  );
});

export default StreamingIndicator;
