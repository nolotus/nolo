import * as stylex from "@stylexjs/stylex";

/**
 * ChildRunObserverPanel.css → StyleX 1:1 迁出（2026-08-30）。
 * 覆盖三个消费方共享的同一份原 CSS 文件：
 * - ChildRunObserverPanel.tsx（cro* 命名空间键）
 * - ChildRunDetailModal.tsx（modal* 命名空间键）
 * - AppendInstructionControl.tsx（aic* 命名空间键）
 * 与原 CSS 保持 1:1：同一元素、同一声明、同值。
 *
 * 逃生舱（dialogStylexEscapeHatch.css，hook: dialog-esc-cro-* /
 * dialog-esc-cdm-* / dialog-esc-aic-*）：collapsedRail:hover、
 * iconButton hover/disabled、state--error、retry:hover、item:hover/
 * :focus-visible、modal state--error、messageBody--empty、
 * aic input focus/disabled、submit hover/disabled、--continue submit
 * 阶梯、spin keyframes —— 均为同名属性竞争或 StyleX 不支持的
 * 选择器/关键帧，按基线源码顺序下沉 unlayered 保持级联。
 * status 变体与基础无同名属性，无竞争，留在 StyleX 条件组合。
 */
export const croStyles = stylex.create({
  // ── ChildRunObserverPanel ──
  panel: {
    background: "var(--background, #ffffff)",
    borderLeft:
      "1px solid var(--borderMuted, var(--borderLight, var(--border, #e5e7eb)))",
    display: "flex",
    flex: "0 0 300px",
    flexDirection: "column",
    minHeight: 0,
    width: "300px",
    "@media (max-width: 960px)": {
      borderLeft: "none",
      borderTop:
        "1px solid var(--borderMuted, var(--borderLight, var(--border, #e5e7eb)))",
      flex: "0 0 auto",
      maxHeight: "42vh",
      width: "100%",
    },
  },
  /* Slim edge when collapsed — does not eat a full 300px rail. */
  collapsedRail: {
    alignItems: "center",
    alignSelf: "stretch",
    background: "var(--background, #ffffff)",
    border: 0,
    borderLeft:
      "1px solid var(--borderMuted, var(--borderLight, var(--border, #e5e7eb)))",
    color: "var(--textSecondary, #6b7280)",
    cursor: "pointer",
    display: "flex",
    flex: "0 0 44px",
    flexDirection: "column",
    gap: "8px",
    justifyContent: "flex-start",
    minHeight: 0,
    padding: "14px 6px",
    width: "44px",
    "@media (max-width: 960px)": {
      borderLeft: "none",
      borderTop:
        "1px solid var(--borderMuted, var(--borderLight, var(--border, #e5e7eb)))",
      flex: "0 0 auto",
      flexDirection: "row",
      gap: "8px",
      justifyContent: "center",
      minHeight: "40px",
      padding: "8px 12px",
      width: "100%",
    },
  },
  collapsedLabel: {
    fontSize: "11px",
    fontWeight: 650,
    letterSpacing: "0.04em",
    lineHeight: 1.2,
    writingMode: "vertical-rl",
    "@media (max-width: 960px)": {
      writingMode: "horizontal-tb",
    },
  },
  collapsedCount: {
    background: "color-mix(in srgb, var(--primary, #2563eb) 14%, transparent)",
    borderRadius: "999px",
    color: "var(--primary, #1d4ed8)",
    fontSize: "11px",
    fontWeight: 700,
    lineHeight: 1,
    minWidth: "18px",
    padding: "3px 5px",
    textAlign: "center",
  },
  header: {
    alignItems: "center",
    borderBottom:
      "1px solid var(--borderMuted, var(--borderLight, var(--border, #e5e7eb)))",
    display: "flex",
    justifyContent: "space-between",
    minHeight: "48px",
    padding: "0 12px",
  },
  headerActions: {
    alignItems: "center",
    display: "flex",
    flexShrink: 0,
    gap: "2px",
  },
  titleWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    minWidth: 0,
  },
  title: {
    alignItems: "center",
    color: "var(--text, #111827)",
    display: "flex",
    fontSize: "13px",
    fontWeight: 650,
    gap: "6px",
  },
  subtitle: {
    color: "var(--textSecondary, #6b7280)",
    fontSize: "11px",
    fontWeight: 500,
    lineHeight: 1.2,
  },
  iconButton: {
    alignItems: "center",
    background: "transparent",
    border: 0,
    borderRadius: "var(--radius-xs, 6px)",
    color: "var(--textSecondary, #6b7280)",
    cursor: "pointer",
    display: "inline-flex",
    height: "28px",
    justifyContent: "center",
    width: "28px",
  },
  body: {
    display: "flex",
    flex: "1 1 auto",
    flexDirection: "column",
    gap: "8px",
    minHeight: 0,
    overflow: "auto",
    padding: "10px",
  },
  state: {
    color: "var(--textSecondary, #6b7280)",
    fontSize: "12px",
    lineHeight: 1.45,
    padding: "12px 6px",
    textAlign: "left",
  },
  retry: {
    alignSelf: "flex-start",
    background: "transparent",
    border: "1px solid var(--borderMuted, var(--borderLight, #d1d5db))",
    borderRadius: "var(--radius-xs, 6px)",
    color: "var(--text, #111827)",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 600,
    marginTop: "4px",
    padding: "5px 10px",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  item: {
    background: "var(--surfaceInset, var(--backgroundSecondary, #f9fafb))",
    border: "1px solid var(--borderMuted, var(--borderLight, #e5e7eb))",
    borderRadius: "var(--radius-sm, 8px)",
    color: "inherit",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "9px 10px",
    textAlign: "left",
    width: "100%",
  },
  itemMain: {
    alignItems: "flex-start",
    display: "flex",
    gap: "8px",
    justifyContent: "space-between",
  },
  itemTitle: {
    color: "var(--text, #111827)",
    fontSize: "12px",
    fontWeight: 650,
    lineHeight: 1.35,
    minWidth: 0,
    overflowWrap: "anywhere",
  },
  status: {
    borderRadius: "999px",
    flexShrink: 0,
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.01em",
    lineHeight: 1,
    padding: "4px 7px",
  },
  /* __status 变体：仅设置基础规则没有的 background/color，
   * 与基础无同名属性竞争，可安全作为条件 StyleX 样式组合 */
  statusRunning: {
    background: "rgba(37, 99, 235, 0.12)",
    color: "var(--primary, #1d4ed8)",
  },
  statusPending: {
    background: "rgba(37, 99, 235, 0.12)",
    color: "var(--primary, #1d4ed8)",
  },
  statusDone: {
    background: "rgba(22, 163, 74, 0.12)",
    color: "var(--success, #15803d)",
  },
  statusFailed: {
    background: "rgba(220, 38, 38, 0.12)",
    color: "var(--errorText, #b91c1c)",
  },
  statusCancelled: {
    background: "var(--backgroundSecondary, #f3f4f6)",
    color: "var(--textSecondary, #6b7280)",
  },
  agent: {
    color: "var(--textSecondary, #6b7280)",
    fontSize: "11px",
    fontWeight: 500,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  evidence: {
    color: "var(--textSecondary, #4b5563)",
    fontSize: "11px",
    lineHeight: 1.4,
    overflowWrap: "anywhere",
  },
  badges: {
    alignItems: "center",
    display: "flex",
    flexShrink: 0,
    gap: "4px",
  },
  queuedPill: {
    background: "rgba(234, 88, 12, 0.12)",
    borderRadius: "999px",
    color: "#ea580c",
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.01em",
    lineHeight: 1,
    padding: "4px 7px",
    whiteSpace: "nowrap",
  },

  // ── ChildRunDetailModal ──
  modalMeta: {
    color: "var(--textSecondary, #6b7280)",
    display: "flex",
    flexWrap: "wrap",
    fontSize: "12px",
    gap: "8px 12px",
    marginBottom: "12px",
  },
  /* __meta strong */
  modalMetaStrong: {
    color: "var(--text, #111827)",
    fontWeight: 650,
  },
  modalEvidence: {
    background: "var(--surfaceInset, var(--backgroundSecondary, #f9fafb))",
    border: "1px solid var(--borderMuted, var(--borderLight, #e5e7eb))",
    borderRadius: "var(--radius-xs, 6px)",
    color: "var(--textSecondary, #4b5563)",
    fontSize: "12px",
    lineHeight: 1.45,
    marginBottom: "14px",
    padding: "10px 12px",
  },
  modalState: {
    color: "var(--textSecondary, #6b7280)",
    fontSize: "13px",
    padding: "16px 4px",
  },
  modalMessages: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    maxHeight: "min(55vh, 480px)",
    overflow: "auto",
  },
  modalMessage: {
    border: "1px solid var(--borderMuted, var(--borderLight, #e5e7eb))",
    borderRadius: "var(--radius-sm, 8px)",
    padding: "10px 12px",
  },
  modalMessageRole: {
    color: "var(--textSecondary, #6b7280)",
    fontSize: "11px",
    fontWeight: 700,
    marginBottom: "6px",
    textTransform: "uppercase",
  },
  modalMessageBody: {
    color: "var(--text, #111827)",
    fontSize: "13px",
    lineHeight: 1.5,
    overflowWrap: "anywhere",
    whiteSpace: "pre-wrap",
  },
  modalFooter: {
    borderTop: "1px solid var(--borderMuted, var(--borderLight, #e5e7eb))",
    marginTop: "14px",
    paddingTop: "12px",
  },

  // ── AppendInstructionControl ──
  aic: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    width: "100%",
  },
  aicHeader: {
    alignItems: "center",
    display: "flex",
    justifyContent: "space-between",
  },
  aicLabel: {
    alignItems: "center",
    color: "var(--textSecondary, #4b5563)",
    display: "flex",
    fontSize: "12px",
    fontWeight: 650,
    gap: "5px",
  },
  aicQueuedBadge: {
    alignItems: "center",
    background: "rgba(234, 88, 12, 0.12)",
    borderRadius: "999px",
    color: "#c2410c",
    display: "inline-flex",
    fontSize: "11px",
    fontWeight: 650,
    gap: "4px",
    padding: "2px 8px",
  },
  aicInputRow: {
    alignItems: "center",
    display: "flex",
    gap: "8px",
  },
  aicInput: {
    background: "var(--surfaceInset, var(--backgroundSecondary, #f9fafb))",
    border: "1px solid var(--borderMuted, var(--borderLight, #d1d5db))",
    borderRadius: "var(--radius-sm, 8px)",
    color: "var(--text, #111827)",
    flex: "1 1 auto",
    fontSize: "13px",
    lineHeight: 1.4,
    minWidth: 0,
    padding: "8px 12px",
    transition: "border-color 0.15s ease",
  },
  aicSubmit: {
    alignItems: "center",
    background: "var(--primary, #2563eb)",
    border: "none",
    borderRadius: "var(--radius-sm, 8px)",
    color: "#ffffff",
    cursor: "pointer",
    display: "inline-flex",
    flexShrink: 0,
    fontSize: "12px",
    fontWeight: 650,
    gap: "5px",
    height: "36px",
    justifyContent: "center",
    padding: "0 14px",
    transition: "background-color 0.15s ease, opacity 0.15s ease",
    whiteSpace: "nowrap",
  },
  /* __spinner：keyframes 定义在 dialogStylexEscapeHatch.css */
  aicSpinner: {
    animation: "AppendInstructionControl-spin 0.8s linear infinite",
  },
  aicError: {
    background: "rgba(220, 38, 38, 0.08)",
    border: "1px solid rgba(220, 38, 38, 0.25)",
    borderRadius: "var(--radius-xs, 6px)",
    color: "var(--errorText, #b91c1c)",
    fontSize: "12px",
    lineHeight: 1.4,
    padding: "6px 10px",
  },
  aicSuccess: {
    alignItems: "center",
    background: "rgba(22, 163, 74, 0.08)",
    border: "1px solid rgba(22, 163, 74, 0.25)",
    borderRadius: "var(--radius-xs, 6px)",
    color: "var(--success, #15803d)",
    display: "flex",
    fontSize: "12px",
    fontWeight: 600,
    gap: "5px",
    lineHeight: 1.4,
    padding: "6px 10px",
  },
});
