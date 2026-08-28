// packages/app/hooks/useUnifiedStore.ts
import { useSelector, useDispatch, TypedUseSelectorHook } from "react-redux";
import type { RootState, AppDispatch } from "app/store";

// Web 和 Native 的 RootState 结构虽然略有不同（Web多了table/plan，Native目前还没加），
// 但 settings/db/auth 等核心 slice 是一致的。
// 在这里统一导出 hooks，供业务组件使用。
// 注意：Native 端目前需要确保它的 RootState 类型兼容 Web 端，或者在这里定义一个交集类型。

export const useUnifiedSelector: TypedUseSelectorHook<RootState> = useSelector;
export const useUnifiedDispatch = () => useDispatch<AppDispatch>();
