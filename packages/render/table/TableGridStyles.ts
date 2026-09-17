// packages/render/table/TableGridStyles.ts
// TableGridSection 的 StyleX 样式载体。
//
// 为什么必须独立成 *Styles.ts：`stylex.create` 是编译期 API，bun test 的 StyleX
// 编译通道（scripts/public-build/stylexBunPlugin.ts）按约定只编译 *Styles.ts /
// *.stylex.ts；写进组件 TSX 会在测试里运行时 throw
// （"Unexpected 'stylex.create' call at runtime"），该组件的页面级挂载测试因此
// 直接不可用（2026-09-17 抽出）。
import * as stylex from "@stylexjs/stylex";

// Grid 滚动视口与占位行样式。
// 滚动容器 flex 撑满 .table-page 剩余高度，表体区域直达页面底部；
// 遗留 hook class "table-page__grid-scroll" 仍保留在 className 上，
// 供 table.css 对 BaseTable 内部 .table-container / .data-table 做后代覆盖
// （StyleX 不支持后代选择器）。
export const tableGridStyles = stylex.create({
    scrollViewport: {
        flex: "1 1 auto",
        minHeight: 0,
        overflow: "auto",
        WebkitOverflowScrolling: "touch",
        overscrollBehavior: "contain",
        margin: 0,
    },
    spacerCell: {
        padding: 0,
        borderWidth: 0,
    },
});

// stylex.props() 返回 { className }，若在 handwritten hook class 之后展开会覆盖它；
// 参照 QuickChatRuntime 的既有模式显式合并。
export const gridScrollStyleProps = stylex.props(tableGridStyles.scrollViewport);
export const spacerCellStyleProps = stylex.props(tableGridStyles.spacerCell);
