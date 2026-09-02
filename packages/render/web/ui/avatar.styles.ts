// 文件: render/web/ui/avatar.styles.ts
import * as stylex from "@stylexjs/stylex";

/**
 * Avatar 样式 —— StyleX 迁移（自原 ui.css「Avatar」分区 1:1 迁出，迁出后该分区已删除）
 * type（agent/user）覆盖基类背景/文字/描边，因此定义顺序在 base 之后；
 * clickable:hover 的阴影需要压过 type 的 inset 描边，故 clickable 定义在最后。
 */
export const avatarStyles = stylex.create({
  // .avatar
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    flexShrink: 0,
    overflow: "hidden",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    backgroundColor: "var(--backgroundTertiary)",
    color: "var(--textSecondary)",
    boxShadow: "inset 0 0 0 1px var(--borderLight)",
  },
  // .avatar-image
  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: "inherit",
  },
  // .avatar--small
  small: {
    width: "var(--control-sm)",
    height: "var(--control-sm)",
    fontSize: "var(--fontSize-xs)",
  },
  // .avatar--medium
  medium: {
    width: "var(--control-md)",
    height: "var(--control-md)",
    fontSize: "var(--fontSize-lg)",
  },
  // .avatar--large
  large: {
    width: "var(--control-xl)",
    height: "var(--control-xl)",
    fontSize: "var(--fontSize-xl)",
  },
  // .avatar--xlarge
  xlarge: {
    width: 64,
    height: 64,
    fontSize: "var(--fontSize-2xl)",
  },
  // .avatar--xxlarge
  xxlarge: {
    width: 80,
    height: 80,
    fontSize: "2rem",
  },
  // .avatar--shape-rounded
  shapeRounded: {
    borderRadius: "var(--space-3)",
  },
  // .avatar--shape-full
  shapeFull: {
    borderRadius: "50%",
  },
  // .avatar--agent
  agent: {
    backgroundColor: "var(--primaryBg)",
    color: "var(--primary)",
    boxShadow: "inset 0 0 0 1px var(--primaryBorder, var(--primaryBg))",
  },
  // .avatar--user
  user: {
    backgroundColor: "var(--backgroundTertiary)",
    color: "var(--textSecondary)",
    boxShadow: "inset 0 0 0 1px var(--border)",
  },
  // .avatar--clickable / .avatar--clickable:hover
  clickable: {
    cursor: "pointer",
    ":hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 4px 12px var(--shadowMedium)",
    },
  },
});
