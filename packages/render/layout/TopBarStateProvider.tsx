import React from "react";
import { useTopBarState } from "./useTopBarState.tsx";
import { TopBarStateContext } from "./TopBarStateContext";

/**
 * 内容区共享的唯一一份 useTopBarState。
 * 只有这个模块在运行时持有 hook（其余模块只 import 类型），
 * 避免把 identity/database 链静态拉进只渲染 UI 的模块。
 */
export const TopBarStateProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const state = useTopBarState();
  return (
    <TopBarStateContext.Provider value={state}>
      {children}
    </TopBarStateContext.Provider>
  );
};

export default TopBarStateProvider;
