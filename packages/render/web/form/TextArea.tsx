// render/web/form/TextArea.tsx
import type React from "react";
import { useState, useEffect, useCallback } from "react";
import {
  TextField,
  TextArea as AriaTextArea,
  Label,
  Text,
} from "react-aria-components";
import "./TextField.css";
import { BaseInputProps } from "./Input";

export interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    BaseInputProps {
  autoResize?: boolean;
  ref?: React.Ref<HTMLTextAreaElement>;
}

export const TextArea = ({
  icon,
  error,
  helperText,
  label,
  variant = "default",
  autoResize = false,
  className = "",
  style,
  rows = 4,
  ref,
  ...props
}: TextAreaProps) => {
  const [internalRef, setInternalRef] = useState<HTMLTextAreaElement | null>(
    null
  );

  const textareaRef = useCallback(
    (node: HTMLTextAreaElement | null) => {
      setInternalRef(node);
      if (typeof ref === "function") {
        ref(node);
      } else if (ref && "current" in ref) {
        (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current =
          node;
      }
    },
    [ref]
  );

  useEffect(() => {
    if (autoResize && internalRef) {
      const adjustHeight = () => {
        internalRef.style.height = "auto";
        internalRef.style.height = `${internalRef.scrollHeight}px`;
      };

      adjustHeight();
      internalRef.addEventListener("input", adjustHeight);
      return () => internalRef.removeEventListener("input", adjustHeight);
    }
  }, [autoResize, internalRef, props.value]);

  return (
    <TextField
      isInvalid={error}
      isDisabled={props.disabled}
      className={`react-aria-TextField ${className}`}
      style={style}
      value={props.value != null ? String(props.value) : undefined}
      onChange={(v) => {
        // react-aria 的 TextField onChange 签名是 (value: string) => void，
        // 转成原生 event 形式，让调用方继续用 e.target.value。
        props.onChange?.({ target: { value: v } } as React.ChangeEvent<HTMLTextAreaElement>);
      }}
    >
      {label && (
        <Label className={`react-aria-Label ${error ? "is-invalid" : ""}`}>
          {label}
        </Label>
      )}
      <div className={`textarea-wrapper ${icon ? "has-icon" : ""}`}>
        <AriaTextArea
          ref={textareaRef}
          rows={rows}
          className={`react-aria-TextArea variant-${variant} ${
            autoResize ? "auto-resize" : ""
          } ${error ? "is-invalid" : ""} ${icon ? "has-icon" : ""}`}
          // value/onChange 已提到 TextField 层，不能重复传
          {...(props as Omit<typeof props, "value" | "onChange">)}
        />
        {icon && (
          <div className={`input-icon ${error ? "error" : ""}`}>{icon}</div>
        )}
      </div>
      {helperText && (
        <Text
          slot={error ? "errorMessage" : "description"}
          className={`input-helper ${error ? "is-invalid" : ""}`}
        >
          {helperText}
        </Text>
      )}
    </TextField>
  );
};

TextArea.displayName = "TextArea";