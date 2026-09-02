// render/web/ui/Avatar.tsx
import * as stylex from "@stylexjs/stylex";
import React, { useCallback, useMemo } from "react";
import { LuUser, LuBot } from "react-icons/lu";
import { useImageLoadFallback } from "app/hooks/useImageLoadFallback";

import { avatarStyles } from "./avatar.styles";

interface AvatarProps {
  name?: string;
  type?: 'user' | 'agent' | 'auto';
  size?: 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge';
  shape?: 'rounded' | 'full';
  src?: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}

/**
 * 通用头像组件
 */
export const Avatar: React.FC<AvatarProps> = ({
  name = "",
  type = "auto",
  size = "medium",
  shape = "rounded",
  src,
  className = "",
  onClick,
  style = {},
  ...props
}) => {
  const { shouldRenderImage, handleImageError } = useImageLoadFallback(src);

  const avatarType = useMemo(() => {
    if (type === "auto") {
      return name === "robot" ? "agent" : "user";
    }
    return type;
  }, [type, name]);

  const getIconSize = () => {
    switch (size) {
      case "small": return 16;
      case "large": return 24;
      case "xlarge": return 32;
      case "xxlarge": return 48;
      case "medium":
      default: return 20;
    }
  };

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!onClick) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onClick(event as unknown as React.MouseEvent);
      }
    },
    [onClick]
  );

  const renderContent = () => {
    if (shouldRenderImage) {
      return (
        <img
          src={src!}
          alt={name}
          {...stylex.props(avatarStyles.image)}
          onError={handleImageError}
        />
      );
    }

    const iconSize = getIconSize();

    switch (avatarType) {
      case "agent":
        return <LuBot size={iconSize} aria-hidden="true" />;
      case "user":
      default: {
        const initial = name ? name.trim().charAt(0).toUpperCase() : "";
        return initial ? (
          <span className="avatar-text">{initial}</span>
        ) : (
          <LuUser size={iconSize} aria-hidden="true" />
        );
      }
    }
  };

  const accessibleName =
    name.trim() || (avatarType === "agent" ? "Agent" : "User");

  const { className: sxClassName } = stylex.props(
    avatarStyles.base,
    avatarStyles[size],
    avatarType === "agent" ? avatarStyles.agent : avatarStyles.user,
    shape === "full" ? avatarStyles.shapeFull : avatarStyles.shapeRounded,
    onClick && avatarStyles.clickable,
  );
  const classes = [sxClassName, className].filter(Boolean).join(" ");

  return (
    <div
      className={classes}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? accessibleName : undefined}
      style={style}
      {...props}
    >
      {renderContent()}
    </div>
  );
};

export default Avatar;
