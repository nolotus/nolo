// render/web/ui/PageLoading.tsx
import * as stylex from "@stylexjs/stylex";
import React from "react";

import { pageLoadingStyles } from "./pageLoading.styles";
import StreamingIndicator from "render/web/ui/StreamingIndicator";

export interface PageLoadingProps {
  /**
   * 加载中的提示文案，例如：
   * - "正在打开页面，为你准备内容…"
   * - "正在为你准备编辑体验…"
   */
  message?: string;
  /**
   * 是否占满可用高度（用于整页加载）
   */
  fullHeight?: boolean;
}

/**
 * 通用页面加载状态组件：
 * - 居中展示 StreamingIndicator（bare 裸形态，原为后代选择器覆盖）
 * - 支持自定义提示文案
 * - 可选是否占满可用高度
 * - 不对外暴露 style，避免破坏统一布局
 */
const PageLoading: React.FC<PageLoadingProps> = ({
  message,
  fullHeight = true,
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      {...stylex.props(
        pageLoadingStyles.page,
        fullHeight && pageLoadingStyles.full,
      )}
    >
      <div {...stylex.props(pageLoadingStyles.indicatorWrap)}>
        <StreamingIndicator bare />
      </div>

      {message && (
        <span {...stylex.props(pageLoadingStyles.text)}>{message}</span>
      )}
    </div>
  );
};

export default PageLoading;
