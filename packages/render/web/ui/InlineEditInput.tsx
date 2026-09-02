// 文件: render/web/ui/InlineEditInput.tsx

import * as stylex from "@stylexjs/stylex";
import React from "react";

import { inlineEditStyles } from "./inlineEditInput.styles";

export interface InlineEditInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  inputRef: React.RefObject<HTMLInputElement | null>;
}

const InlineEditInput: React.FC<InlineEditInputProps> = (props) => {
  const { inputRef, className, style, type = "text", ...restProps } = props;

  const mergedClassName = [
    stylex.props(inlineEditStyles.input).className,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <input
      ref={inputRef}
      type={type}
      className={mergedClassName}
      style={style}
      {...restProps}
    />
  );
};

export default InlineEditInput;
