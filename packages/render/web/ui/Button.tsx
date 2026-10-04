// 文件: render/web/ui/Button.tsx

import React from "react";
import * as stylex from "@stylexjs/stylex";
import { Link } from "app/routing";

import {
  buttonStyles,
  buttonActiveStyles,
  buttonContentGapStyles,
  buttonHoverStyles,
  buttonLeadingStyles,
  buttonSizeStyles,
  buttonVariantStyles,
} from "./button.styles";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "small" | "medium" | "large";
  icon?: React.ReactNode;
  loading?: boolean;
  block?: boolean;
  type?: "button" | "submit" | "reset";
  as?: React.ElementType;
  to?: string;
}

const Button = ({
  variant = "primary",
  size = "medium",
  icon,
  loading,
  disabled,
  block,
  type = "button",
  className = "",
  children,
  onClick,
  as: Component = "button",
  to,
  // 从 rest 中提取 title 和 aria-label 以便处理逻辑
  title,
  "aria-label": ariaLabel,
  ...rest
}: ButtonProps) => {
  const isDisabled = disabled || loading;
  const isLink = Component === Link;
  const isNativeButton = Component === "button";
  const hasText =
    children !== undefined &&
    children !== null &&
    children !== false;
  const shouldRenderText = hasText && !loading;

  // 优化：如果没有显式提供 aria-label，但有 title，则使用 title 作为 aria-label
  // 这对于纯图标按钮的无障碍访问非常重要
  const finalAriaLabel = ariaLabel || title;

  const handleClick = (e: React.MouseEvent<any>) => {
    if (isDisabled) {
      e.preventDefault();
      return;
    }
    onClick?.(e as any);
  };

  // 根元素样式：variant 静态样式始终挂载；hover/active/focusRing 仅在非
  // disabled 时挂载，等价于原 `:hover:not(.btn-disabled)` / `:active:not(...)`。
  const { className: rootClassName } = stylex.props(
    buttonStyles.base,
    buttonSizeStyles[size],
    block && buttonStyles.block,
    buttonVariantStyles[variant],
    !isDisabled && buttonHoverStyles[variant],
    !isDisabled && buttonActiveStyles[variant],
    isDisabled && buttonStyles.disabled,
    !isDisabled && buttonStyles.focusRing,
  );

  const incomingStyle = (rest as any).style as
    | React.CSSProperties
    | undefined;
  const { style: _incomingStyle, ...restProps } = rest as any;
  const inlineStyle: React.CSSProperties | undefined = isLink
    ? { textDecoration: "none", ...incomingStyle }
    : incomingStyle;

  // 外部 className 保留透传（追加在 StyleX 类之后，行为与原实现一致）
  const classes = [rootClassName, className].filter(Boolean).join(" ");

  const commonProps: any = {
    ...restProps,
    className: classes,
    style: inlineStyle,
    onClick: handleClick,
    // 显式设置 aria-label 和 title
    "aria-label": finalAriaLabel,
    title: title,
    ...(isNativeButton ? { disabled: isDisabled, type } : {}),
    ...(isLink ? { to: to || "#" } : {}),
  };

  return (
    <>
      {React.createElement(
        Component as any,
        commonProps as any,
        <span
          {...stylex.props(
            buttonStyles.contentBase,
            buttonContentGapStyles[size],
            loading && buttonStyles.contentLoading,
          )}
        >
          {loading ? (
            <span {...stylex.props(buttonStyles.spinnerWrap)} aria-hidden="true" />
          ) : (
            icon && (
              <span
                {...stylex.props(buttonStyles.leadingBase, buttonLeadingStyles[size])}
                aria-hidden="true"
              >
                <span {...stylex.props(buttonStyles.icon)}>{icon}</span>
              </span>
            )
          )}
          {shouldRenderText && (
            <span {...stylex.props(buttonStyles.text)}>{children}</span>
          )}
        </span>
      )}
    </>
  );
};


Button.displayName = "Button";

export default Button;
