// packages/create/editor/floatingSurface.styles.ts
//
// Slate 编辑器浮层（MentionList / LinkEditorPopover / TableContextMenu /
// HoveringToolbar）的静态容器样式 —— 迁出内联 style 对象至 StyleX，
// 仅保留 runtime geometry（position / top / left / transformOrigin / enter travel）在内联。
import * as stylex from "@stylexjs/stylex";

export const editorFloatingStyles = stylex.create({
  mentionList: {
    zIndex: 10000,
    backgroundColor: "var(--backgroundSecondary)",
    borderRadius: "var(--radius-md)",
    boxShadow: "0 4px 12px var(--shadowMedium)",
    display: "flex",
    flexDirection: "column",
    width: "280px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--border)",
    overflow: "hidden",
  },
  linkPopover: {
    zIndex: 9999,
    backgroundColor: "var(--backgroundSecondary)",
    borderRadius: "var(--radius-md)",
    boxShadow: "0 3px 12px var(--shadowMedium)",
    padding: "8px",
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  linkInput: {
    backgroundColor: "var(--backgroundTertiary)",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--border)",
    color: "var(--text)",
    borderRadius: "var(--radius-sm)",
    paddingBlock: "6px",
    paddingInline: "10px",
    fontSize: "var(--fontSize-base)",
    width: "240px",
    outline: "none",
  },
  tableContextMenu: {
    zIndex: 20,
    backgroundColor: "var(--background)",
    borderRadius: "var(--space-2)",
    boxShadow: "0 4px 12px var(--shadowHeavy)",
    padding: "var(--space-2)",
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-2)",
  },
  tableButtonGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-1)",
  },
  tableDivider: {
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "var(--border)",
    marginBlock: "var(--space-1)",
    marginInline: 0,
  },
  hoveringToolbar: {
    paddingBlock: "6px",
    paddingInline: "8px",
    zIndex: 9998,
    backgroundColor: "#222",
    borderRadius: "6px",
    display: "flex",
    gap: "4px",
  },
});
