import * as stylex from "@stylexjs/stylex";

/**
 * HTML 成品结果卡片的样式。
 *
 * 必须放在独立 *Styles.ts 文件里：仓库的 StyleX 编译通道只处理纯 TS 样式载体
 * （scripts/public-build/stylexBunPlugin.ts 的 STYLEX_FILE_FILTER），
 * 组件 .tsx 内的 stylex.create 在裸 bun 进程（含 bun test）会直接 throw，
 * 连带打挂所有加载 ToolMessageContent 的既有测试。
 */
export const htmlArtifactCardStyles = stylex.create({
  card: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: "10px 14px",
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--border-subtle, rgba(255, 255, 255, 0.1))",
    backgroundColor: "var(--surface-subtle, rgba(255, 255, 255, 0.03))",
    maxWidth: 480,
    marginTop: 4,
    marginBottom: 4,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
    flex: 1,
  },
  icon: {
    color: "var(--brand-accent, #3b82f6)",
    flexShrink: 0,
  },
  title: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text-primary, #ffffff)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11,
    color: "var(--color-success, #10b981)",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    padding: "2px 6px",
    borderRadius: 4,
    flexShrink: 0,
  },
  metaRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    fontSize: 11,
    color: "var(--text-tertiary, rgba(255, 255, 255, 0.5))",
    fontFamily: "monospace",
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  actionButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    padding: "4px 10px",
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--brand-accent, #3b82f6)",
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    color: "var(--text-primary, #ffffff)",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
});
