import * as stylex from "@stylexjs/stylex";

/**
 * 发布设置（PublishSettingsTab.tsx）的 StyleX 样式 ——
 * 自原 PublishSettingsTab 样式文件 1:1 迁出。
 *
 * 说明：
 * - 原 BasicInfoTab 与 PublishSettingsTab 样式文件都定义了布局包装类；
 *   agent-form 样式捆绑包内后者后加载、完全覆盖前者，故这里保留的是
 *   实际生效值（gap: var(--space-5) 版本）。ReferencesTab.tsx 的根
 *   wrapper 也消费该生效值，从本文件导入。
 * - 原 publish body 内对该包装类的 padding 覆盖与 data-theme 暗色
 *   覆盖见 agentCreateStylexEscapeHatch.css。
 */
export const publishSettingsTabStyles = stylex.create({
  tabContentWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-5)",
    padding: "var(--space-2) 0",
  },
  // 原 publish body 内对该包装类的 padding 覆盖（16px 0 0）：
  // 本组件只在该 publish body 内渲染，覆盖值并入为静态 key。
  tabContentWrapperInPublishBody: {
    padding: "16px 0 0",
  },
  publicSettingsGroup: {
    marginTop: "var(--space-2)",
    padding: "var(--space-6)",
    backgroundColor: "var(--backgroundSecondary)",
    borderRadius: "var(--radius-lg, 14px)",
    border: "none",
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-6)",
    boxShadow:
      "0 1px 2px var(--shadowLight), 0 12px 28px -24px var(--shadowMedium)",
    animationName: stylex.keyframes({
      from: { opacity: 0, transform: "translateY(-2px)" },
      to: { opacity: 1, transform: "translateY(0)" },
    }),
    animationDuration: "0.3s",
    animationTimingFunction: "ease-out",
  },
});
