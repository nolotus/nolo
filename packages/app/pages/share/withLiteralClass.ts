import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type React from "react";

/**
 * 保留字面 className 作 DOM/测试/EscapeHatch CSS 锚点，同时叠加 StyleX 原子类。
 * 对应 packages/chat/messages/web/toolMessageShared.tsx 的 withLiteralClass。
 *
 * styles 类型用 StyleXStyles 而非 Parameters<typeof stylex.props>[0]：
 * stylex 0.19 的 props() 是重载函数，Parameters 只能解析到最后一个重载，
 * 会让所有调用点报 TS2345（参数不 assignable to 'false'）。
 */
export const withLiteralClass = (
  literal: string,
  ...styles: Array<StyleXStyles | false | null | undefined>
): { className: string; style?: React.CSSProperties } => {
  const active = styles.filter(Boolean) as StyleXStyles[];
  if (active.length === 0) return { className: literal };
  const props = stylex.props(...active) as { className?: string; style?: React.CSSProperties };
  return {
    className: props.className ? `${literal} ${props.className}` : literal,
    ...(props.style ? { style: props.style } : {}),
  };
};
