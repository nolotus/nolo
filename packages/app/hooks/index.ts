import { useAccountSession } from "identity/useAccountSession";
import { useAppSelector, type AppDispatch } from "app/store";
import { useDispatch } from "react-redux";
import { selectUiPlugins } from "app/settings/fieldSelectors";
import type { UiPlugins } from "app/plugins/uiPlugins";

export const useAppDispatch: () => AppDispatch = useDispatch;

/**
 * UI 插件启用状态（已按归属账号校验的 fail-closed 快照）。
 *
 * 放在这个文件而不是 `app/settings/fieldSelectors` 里直接取 `useAppSelector`：
 * `app/store` → `reducer` → `settingSlice` → `editorConfigSelectors` →
 * `fieldSelectors` 是既有的**值**依赖链，`fieldSelectors` 反向值导入
 * `app/store` 会成环并触发 TDZ
 * （实测 `Cannot access 'selectEditorDefaultMode' before initialization`）。
 * 本文件是既有的 `app/store` 消费方（已在 reduxBoundaryGuard 白名单里），
 * 且不在那条链上，因此不成环、也不需要新增白名单条目。
 */
export const useUiPlugins = (): UiPlugins => {
  const session = useAccountSession();
  return useAppSelector(state => selectUiPlugins(state, session));
};
