import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "app/store";
import { selectCurrentServer } from "app/settings/serverSelectors";
import { addHostToCurrentServer } from "app/settings/settingSlice";

/**
 * Current auth target server + setter, as a domain hook so auth screens
 * (Login, useRegister) don't each reach into Redux directly.
 *
 * 2026-11-12 从 `packages/auth/web/useAuthTargetServer.ts` 迁到这里。
 * 原因：`packages/auth/web/**` 整个目录不进公开投影，而本 hook 被**公开侧**的
 * `chat/dialog/DialogRelation.tsx`、`app/settings/web/DataSourcePluginsConfig.tsx` 引用
 * —— 那次跨边界让投影安全门报 "Forbidden private import"（公开仓会指向不存在的模块）。
 * 它本身只依赖 `app/store` 与 `app/settings/*`，是 app 层胶水，放在 auth 里才是错位。
 */
export function useAuthTargetServer() {
  const dispatch = useAppDispatch();
  const currentServer = useAppSelector(selectCurrentServer);
  const setAuthTargetServer = useCallback(
    (server: string) => {
      dispatch(addHostToCurrentServer(server));
    },
    [dispatch]
  );
  return { currentServer, setAuthTargetServer };
}
