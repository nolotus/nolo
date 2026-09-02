import * as stylex from "@stylexjs/stylex";
import type React from "react";

/**
 * 保留字面 className 作 DOM/测试/EscapeHatch CSS 锚点，同时叠加 StyleX 原子类。
 * 对应 packages/chat/messages/web/toolMessageShared.tsx 的 withLiteralClass。
 */
export const withLiteralClass = (
  literal: string,
  ...styles: Array<stylex.StyleXStyles | false | null | undefined>
): { className: string; style?: React.CSSProperties } => {
  const active = styles.filter(Boolean) as stylex.StyleXStyles[];
  if (active.length === 0) return { className: literal };
  const props = stylex.props(...active) as { className?: string; style?: React.CSSProperties };
  return {
    className: props.className ? `${literal} ${props.className}` : literal,
    ...(props.style ? { style: props.style } : {}),
  };
};
