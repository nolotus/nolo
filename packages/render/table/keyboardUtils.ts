// packages/render/table/keyboardUtils.ts
//
// 表格键盘交互的共享守卫纯函数（无 React 依赖，便于单测）。

import type { KeyboardEvent as ReactKeyboardEvent } from "react";

/**
 * 是否为 IME 组合中的按键（中文/日文等输入法选字确认）。
 * 组合中的 Enter/Tab/Escape/Space 都属于输入法操作，不触发表格编辑指令：
 * - 标准路径读 nativeEvent.isComposing（Chrome/Firefox 在 composition 期间为 true）；
 * - 部分平台（旧 Safari 等）keydown 的 isComposing 不置位，用 keyCode 229 兜底。
 */
export const isImeComposingKeyEvent = (
    event: Pick<ReactKeyboardEvent, "nativeEvent" | "keyCode">
): boolean =>
    Boolean((event.nativeEvent as KeyboardEvent | undefined)?.isComposing) ||
    event.keyCode === 229;
