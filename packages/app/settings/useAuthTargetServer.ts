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
 * 它本身只依赖运行期状态与 `app/settings/*`，是 app 层胶水，放在 auth 里才是错位。
 *
 * Redux 冻结边界（白名单归位，见 reduxBoundaryGuard.ts）：
 * 本文件**不是**新消费面 —— 搬目录前它是 `packages/auth/web/useAuthTargetServer.ts`，
 * 本来就在 `WHITELISTED_APP_REDUX_CONSUMER_FILES` 里。`4754d96fc`（2026-11-12，
 * 「把越界的 auth 模块搬到公开侧」）搬文件时把新路径错写进了 react-redux 白名单
 * （本文件 import 的是 `app/store`，不是 react-redux），旧路径从消费白名单删掉却
 * 没补新路径 → 守卫误报 + react-redux 表 30→31 超上限。2026-11-14 归位：本文件
 * 回到消费白名单，react-redux 表里的错条目删除。
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
