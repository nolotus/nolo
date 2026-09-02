import * as stylex from "@stylexjs/stylex";
import React, { memo } from "react";
import { imageGenerationCardStyles as styles } from "./imageGenerationCardStyles";

/**
 * ImageGenerationCard —— 图片生成等待卡（AICSS ImageGeneration 移植）
 *
 * 设计手法参考 AICSS (aicss.dev) ImageGeneration 组件：
 * - 方形 canvas 内点阵底 + 双层 mask 呼吸光斑（ig-morph 游走 + ig-breathe 呼吸）
 * - 右上角等宽字体徽章（当前生成阶段）
 * - 下方 label shimmer 流光 + 提示文案
 * - prefers-reduced-motion：光斑/闪烁关、落为静态可读
 *
 * 数据：由 MessageContent 传入 imageGenerationState
 * （stage: submitted | generating | saving；waitHint；profileLabel）。
 */
export const ImageGenerationCard = memo(function ImageGenerationCard({
  stageLabel,
  elapsedSeconds,
  waitHint,
  profileLabel,
}: {
  stageLabel?: string;
  elapsedSeconds?: number;
  waitHint?: string;
  profileLabel?: string;
}) {
  return (
    <div aria-live="polite" {...stylex.props(styles.wrap)}>
      <div
        role="img"
        aria-label="图片生成进度画布"
        {...stylex.props(styles.canvas)}
      >
        <span aria-hidden="true" {...stylex.props(styles.dots)} />
        <span aria-hidden="true" {...stylex.props(styles.glow)} />
        <span aria-hidden="true" {...stylex.props(styles.glowBreathe)} />
        {stageLabel && (
          <span {...stylex.props(styles.res)}>
            {stageLabel}
            {typeof elapsedSeconds === "number" && elapsedSeconds > 0
              ? ` · ${elapsedSeconds}s`
              : ""}
          </span>
        )}
      </div>
      <div {...stylex.props(styles.meta)}>
        <span {...stylex.props(styles.label)}>
          正在生成图片
        </span>
        {typeof elapsedSeconds === "number" && elapsedSeconds > 0 && (
          <span {...stylex.props(styles.hint)}>
            已等待 {elapsedSeconds} 秒
          </span>
        )}
        {profileLabel && (
          <span {...stylex.props(styles.hint)}>
            {profileLabel}
          </span>
        )}
        {waitHint && (
          <span {...stylex.props(styles.hint)}>
            {waitHint}
          </span>
        )}
      </div>
    </div>
  );
});

export default ImageGenerationCard;
