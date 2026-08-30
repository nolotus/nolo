import * as stylex from "@stylexjs/stylex";

/**
 * 截断提示（finish_reason: length）—— StyleX 迁移
 * （自原 MessageContentFinishReason.css 1:1 迁出）
 */
export const messageContentFinishReasonStyles = stylex.create({
  lengthNotice: {
    marginTop: 6,
    fontSize: "var(--fontSize-sm)",
    color: "var(--textTertiary)",
    lineHeight: "var(--leading-normal)",
  },
});
