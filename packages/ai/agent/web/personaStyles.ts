import * as stylex from "@stylexjs/stylex";

/**
 * Agent 头像上传区（PersonaSection.tsx）的 StyleX 样式 ——
 * 自原 BasicInfoTab 样式的 "Agent Avatar Upload" 段 1:1 迁出。
 *
 * 原文件中 upload 包装类无消费者、placeholder 图标类无样式定义，
 * 均未迁移。父级 hover 显示 overlay 的规则无法用 StyleX 表达，保留
 * 在 agentCreateStylexEscapeHatch.css（hook 类名 agent-create-esc-avatar-*）。
 */
export const personaStyles = stylex.create({
  avatarPreview: {
    position: "relative",
    width: "72px",
    height: "72px",
    borderRadius: "var(--radius-sm)",
    backgroundColor: "var(--backgroundSecondary)",
    borderWidth: "2px",
    borderStyle: "dashed",
    borderColor: "var(--borderLight)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    color: "var(--textTertiary)",
    transition: "border-color 0.2s, background 0.2s",
    margin: 0,
    padding: 0,
    font: "inherit",
  },
  // 原预览图 img 规则 → 直接挂在 <img> 上
  avatarPreviewImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  avatarPreviewClickable: {
    cursor: "pointer",
    ":hover": {
      borderColor: "var(--primary)",
      backgroundColor:
        "var(--primaryGhost, color-mix(in srgb, var(--primary) 8%, transparent))",
    },
  },
  avatarOverlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    opacity: 0,
    transition: "opacity 0.2s",
    borderRadius: "var(--radius-sm)",
  },
  avatarInput: {
    display: "none",
  },
});
