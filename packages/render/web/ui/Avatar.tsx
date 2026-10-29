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
 * 名字 → 稳定色相（0..359）。
 *
 * 为什么需要：agent 头像在没有自定义图时统一回退成 `<LuBot>`，同一个 provider 的
 * 几个 agent 长得一模一样，侧边栏里分不出谁是谁（2026-10-29 实测：7 个收藏 agent
 * 全是同一个机器人图标）。改用名字首字 + 稳定配色，名字相同则颜色相同。
 */
/** 取首个完整字符（emoji / 生僻字不会被切成半个代理对） */
export function firstGrapheme(name: string | undefined): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "";
  return Array.from(trimmed)[0] ?? "";
}

export function avatarHueOf(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
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
      case "agent": {
        // 有名字就画首字，没有才用机器人图标。
        // 必须用 Array.from 取**完整字符**：charAt(0) 按 UTF-16 code unit 切，
        // emoji（代理对）会变成孤立高位代理，渲染成 �（如 "🤖 代码助手"）。
        const agentInitial = firstGrapheme(name).toUpperCase();
        return agentInitial ? (
          <span className="avatar-text">{agentInitial}</span>
        ) : (
          <LuBot size={iconSize} aria-hidden="true" />
        );
      }
      case "user":
      default: {
        const initial = firstGrapheme(name).toUpperCase();
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
  // agent 且有名字时按名字取稳定色相，让同 provider 的多个 agent 可区分。
  const agentTint: React.CSSProperties =
    avatarType === "agent" && name.trim() && !shouldRenderImage
      ? {
          backgroundColor: `hsl(${avatarHueOf(name.trim())} 42% 38%)`,
          // 38% 亮度的深底上，继承来的 var(--primary) 可能几乎看不清，显式给白字。
          color: "#fff",
        }
      : {};
  const classes = [sxClassName, className].filter(Boolean).join(" ");

  return (
    <div
      className={classes}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? accessibleName : undefined}
      style={{ ...agentTint, ...style }}
      {...props}
    >
      {renderContent()}
    </div>
  );
};

export default Avatar;
