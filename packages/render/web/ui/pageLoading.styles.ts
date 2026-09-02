// 文件: render/web/ui/pageLoading.styles.ts
import * as stylex from "@stylexjs/stylex";

/**
 * PageLoading 样式 —— StyleX 迁移
 * （自原 ui.css「PageLoading」分区 1:1 迁出，迁出后该分区已删除）
 *
 * 原 `.loading-indicator-wrap .streaming-indicator` 后代覆盖由
 * StreamingIndicator 的 bare 变体承接（见 streamingIndicator.styles.ts）；
 * 三层 `.loading-spinner` 覆盖为死规则，未迁移。
 */
export const pageLoadingStyles = stylex.create({
  // .page-loading
  page: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    boxSizing: "border-box",
    gap: 10,
  },
  // .page-loading--full
  full: {
    height: "100%",
    flex: 1,
    minHeight: 200,
  },
  // .loading-indicator-wrap
  indicatorWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 42,
    height: 42,
  },
  // .loading-text
  text: {
    fontSize: "var(--fontSize-sm)",
    fontWeight: 500,
    color: "var(--textTertiary)",
    letterSpacing: "0.01em",
    opacity: 0.92,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial',
  },
});
