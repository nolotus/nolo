// 文件: render/web/ui/kbd.styles.ts
import * as stylex from "@stylexjs/stylex";

/**
 * Kbd 样式 —— StyleX 迁移（自原 ui.css「Kbd」分区 1:1 迁出，迁出后该分区已删除）
 *
 * 原 `.kbd svg`（后代选择器，作用于 lucide 图标）改为 icon 类直接挂在 svg 上：
 * color: currentColor 本就继承，实际生效的只有 display: block。
 */
export const kbdStyles = stylex.create({
  // .kbd
  kbd: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 20,
    height: 20,
    paddingInline: 6,
    marginInline: 1,
    borderRadius: 6,
    backgroundImage:
      "linear-gradient(180deg, color-mix(in srgb, var(--backgroundElevated, #fff) 96%, var(--textHeading, #000) 4%), var(--backgroundSecondary, #f3f4f6))",
    color: "var(--textSecondary, #4b5563)",
    boxShadow:
      "inset 0 1px 0 color-mix(in srgb, var(--background, #fff) 70%, transparent), inset 0 -1px 0 var(--borderLight, #e5e7eb), 0 1px 0 color-mix(in srgb, var(--shadowLight, rgba(0, 0, 0, 0.06)) 100%, transparent)",
    fontFamily:
      'system-ui, -apple-system, "SF Pro Text", "Inter", sans-serif',
    fontSize: 11,
    lineHeight: 1,
    fontWeight: 500,
    verticalAlign: "middle",
    userSelect: "none",
  },
  // .kbd svg
  icon: {
    display: "block",
  },
  // .kbd-sequence
  sequence: {
    display: "inline-flex",
    alignItems: "center",
    gap: 0,
  },
  // .kbd-sequence__sep
  sequenceSep: {
    marginInline: 3,
    color: "var(--textTertiary)",
    fontSize: 10,
    fontWeight: 400,
    lineHeight: 1,
    userSelect: "none",
  },
});
