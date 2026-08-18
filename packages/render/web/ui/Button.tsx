// 文件: render/web/ui/Button.tsx

import "../ui.css";
import React from "react";
import { Link } from "app/routing";

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

  const classes = [
    "btn",
    `btn-${variant}`,
    `btn-${size}`,
    block && "btn-block",
    loading && "btn-loading",
    isDisabled && "btn-disabled",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const commonProps: any = {
    className: classes,
    onClick: handleClick,
    // 显式设置 aria-label 和 title
    "aria-label": finalAriaLabel,
    title: title,
    ...(isNativeButton ? { disabled: isDisabled, type } : {}),
    ...(isLink
      ? {
        to: to || "#",
        style: {
          textDecoration: "none",
          ...(rest as any).style,
        },
      }
      : {}),
    ...rest,
  };

  return (
    <>
      {React.createElement(
        Component as any,
        commonProps as any,
        <span className={`btn-content${loading ? " btn-content--loading" : ""}`}>
          {loading ? (
            <span className="btn-spinner-wrap" aria-hidden="true" />
          ) : (
            icon && (
              <span className="btn-leading" aria-hidden="true">
                <span className="btn-icon">{icon}</span>
              </span>
            )
          )}
          {shouldRenderText && <span className="btn-text">{children}</span>}
        </span>
      )}
    </>
  );
};


Button.displayName = "Button";

export default Button;
