// 文件: render/web/ui/InlineEditInput.tsx

import "../ui.css";
import React from "react";


export interface InlineEditInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  inputRef: React.RefObject<HTMLInputElement | null>;
}

const InlineEditInput: React.FC<InlineEditInputProps> = (props) => {
  const { inputRef, className, style, type = "text", ...restProps } = props;

  const mergedClassName = ["inline-edit-input", className]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <input
        ref={inputRef}
        type={type}
        className={mergedClassName}
        style={style}
        {...restProps}
      />
    </>
  );
};

export default InlineEditInput;
