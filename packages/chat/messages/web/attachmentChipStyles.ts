import * as stylex from "@stylexjs/stylex";

/**
 * AttachmentChip 的 StyleX 样式 —— 与 FileItem 共用 fileItemStyles 的骨架，
 * 这里只放卡片独有的信息区/提示/不可用态。
 *
 * 注意：必须是 `*Styles.ts` 载体文件。bun test 的 StyleX 编译通道
 * （scripts/public-build/stylexBunPlugin.ts）只编译 `*Styles.ts` / `*.stylex.ts`，
 * 组件 TSX 里裸调 stylex.create 会在运行时直接 throw。
 */
export const attachmentChipStyles = stylex.create({
  info: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    overflow: "hidden",
  },
  metaRow: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-1)",
  },
  hint: {
    marginTop: "var(--space-1)",
    color: "var(--textMuted, var(--textTertiary))",
    fontSize: "var(--fontSize-xs)",
    maxWidth: 200,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  unavailable: {
    borderColor: "var(--error)",
    backgroundColor: "var(--errorGhost)",
  },
});
