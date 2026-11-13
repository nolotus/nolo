import { createContext, useContext } from "react";
import type { useTopBarState } from "./useTopBarState.tsx";

/**
 * 内容区共享的 `useTopBarState` 状态。
 *
 * 本文件**只依赖 React**：Provider 需要调用 hook，所以它单独放在
 * `TopBarStateProvider.tsx`。这样 `DialogPage` / `RenderPage` / `PageObjectHeader`
 * 引入 context 时不会被 `useTopBarState` 的运行时依赖（它 import 了 chat/dialog）
 * 拖进循环图——曾因此出现 `useTopBarStateContext is not defined` 的整页错误。
 */
export type TopBarState = ReturnType<typeof useTopBarState>;

export const TopBarStateContext = createContext<TopBarState | null>(null);

export const TopBarStateContextProvider = TopBarStateContext.Provider;

/** 未在 Provider 内时返回 null（例如独立渲染的对话壳）。 */
export const useTopBarStateContext = (): TopBarState | null =>
  useContext(TopBarStateContext);
