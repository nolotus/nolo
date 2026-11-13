import * as stylex from "@stylexjs/stylex";

/**
 * 消息内图片预览样式（StyleX 通道）。
 *
 * 语义：消息气泡里的图片是「缩略预览」，只用于提示内容并引导点击查看原图，
 * 不应按原图尺寸撑开消息区域。尺寸用 max-* 约束 → 大图等比缩小，
 * 小图保持原尺寸（不放大小图）；maxWidth 的 min(…, 100%) 保证窄容器/小屏
 * 下不溢出容器。
 */
export const imagePreviewStyles = stylex.create({
  wrap: {
    maxWidth: "100%",
  },
  image: {
    display: "block",
    width: "auto",
    height: "auto",
    maxWidth: "min(320px, 100%)",
    maxHeight: "280px",
    objectFit: "contain",
    cursor: "pointer",
  },
});
