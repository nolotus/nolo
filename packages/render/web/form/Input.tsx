// web/form/Input.tsx
import { TextField, Input as AriaInput, Label, Text } from "react-aria-components";
import "./TextField.css";
import { LuEye, LuEyeOff } from "react-icons/lu";
import type React from "react";
import { useState, useEffect, useCallback } from "react";

export interface BaseInputProps {
  icon?: React.ReactNode;
  error?: boolean;
  helperText?: string;
  label?: string;
  variant?: "default" | "filled" | "ghost";
  /** 尺寸密度：md 为默认尺寸，sm 为更紧凑的小号尺寸 */
  size?: "md" | "sm";
}
export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
  BaseInputProps {
  password?: boolean;
  // React 19: ref 作为普通 prop
  ref?: React.Ref<HTMLInputElement>;
}

export interface NumberInputProps
  extends Omit<InputProps, "onChange" | "type" | "value"> {
  value?: number;
  onChange: (value: number) => void;
  decimal?: number;
  ref?: React.Ref<HTMLInputElement>;
}

export const Input = ({
  icon,
  error,
  helperText,
  label,
  variant = "default",
  size = "md",
  password = false,
  type: propType,
  className = "",
  style,
  id,
  ref,
  ...props
}: InputProps) => {
  const [showPassword, setShowPassword] = useState(false);

  const inputType = password ? (showPassword ? "text" : "password") : propType;

  return (
    <TextField
      isInvalid={error}
      isDisabled={props.disabled}
      className={`react-aria-TextField ${className}`}
      style={style}
      id={id}
      value={props.value}
      onChange={(v) => {
        // react-aria 的 TextField onChange 签名是 (value: string) => void，
        // 而非原生 (e: ChangeEvent) => void。
        // 转成原生 event 形式，让调用方继续用 e.target.value。
        props.onChange?.({ target: { value: v } } as React.ChangeEvent<HTMLInputElement>);
      }}
    >
      {label && (
        <Label className={`react-aria-Label ${error ? "is-invalid" : ""}`}>
          {label}
        </Label>
      )}

      <div className={`input-wrapper ${icon ? "has-icon" : ""} ${password ? "has-password" : ""}`}>
        <AriaInput
          ref={ref}
          type={inputType}
          className={`react-aria-Input variant-${variant} size-${size} ${error ? "is-invalid" : ""} ${icon ? "has-icon" : ""} ${password ? "has-password" : ""}`}
          // value/onChange 已提到 TextField 层（react-aria 受控模式），
          // 这里不能重复传，否则 AriaInput 的 DOM onChange 会覆盖 TextField 的 controlled onChange。
          {...(props as Omit<typeof props, "value" | "onChange">)}
        />

        {icon && (
          <div className={`input-icon ${error ? "error" : ""}`} aria-hidden="true">
            {icon}
          </div>
        )}

        {password && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={`password-toggle ${error ? "error" : ""}`}
            aria-label={showPassword ? "隐藏密码" : "显示密码"}
            disabled={props.disabled}
          >
            {showPassword ? (
              <LuEyeOff size={16} aria-hidden="true" />
            ) : (
              <LuEye size={16} aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      {helperText && (
        <Text
          slot={error ? "errorMessage" : "description"}
          className={`input-helper ${error ? "error" : "normal"}`}
        >
          {helperText}
        </Text>
      )}
    </TextField>
  );
};

export const NumberInput = ({
  value,
  onChange,
  decimal = 0,
  placeholder = "",
  ref,
  ...props
}: NumberInputProps) => {
  const [displayValue, setDisplayValue] = useState("");

  useEffect(() => {
    if (value === undefined || value === 0) {
      setDisplayValue("");
    } else {
      const formatted =
        decimal > 0
          ? value.toFixed(decimal).replace(/\.?0+$/, "")
          : value.toString();
      setDisplayValue(formatted);
    }
  }, [value, decimal]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const pattern = new RegExp(
        `^${raw.startsWith("-") ? "-?" : ""}\\d*(\\.\\d{0,${decimal}})?$`
      );

      if (raw === "" || pattern.test(raw)) {
        setDisplayValue(raw);
        const numericValue = parseFloat(raw) || 0;
        onChange(numericValue);
      }
    },
    [onChange, decimal]
  );

  return (
    <Input
      {...props}
      ref={ref}
      type="text"
      value={displayValue}
      onChange={handleChange}
      placeholder={value === undefined || value === 0 ? placeholder : ""}
      inputMode={decimal > 0 ? "decimal" : "numeric"}
    />
  );
};

export const PasswordInput = (
  props: Omit<InputProps, "password">
) => {
  return <Input {...props} password />;
};


Input.displayName = "Input";
NumberInput.displayName = "NumberInput";
PasswordInput.displayName = "PasswordInput";
