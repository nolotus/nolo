// File: app/favorite/useFavoriteDeps.ts
// Web-only hook: 组件内获取 favorite API 依赖（settings/auth 尚未剥离 redux，仍走 selector）。
// 从 app/favorite/favoriteStore.ts 拆出：favoriteStore 是 module store，会被 headless CLI
// 静态图引用（cli/index.ts → tools → appTools → app/hooks/deleteDbKey），不得再引入
// app/store（react-redux / settingSlice）等 Web 运行时依赖。

import { useMemo } from "react";
import { useAppSelector } from "app/store";
import { selectIdentityToken } from "identity/selectors";
import { selectRemoteServers } from "app/settings/serverSelectors";
// FavoriteDeps 是纯数据接口，定义在 module store（favoriteStore.ts）一侧；
// 这里只做类型引入，不会给 favoriteStore 反向注入本文件的运行时依赖。
import type { FavoriteDeps } from "./favoriteStore";

// 保持既有对外类型导出面不变：
// `import type { FavoriteDeps } from "app/favorite/useFavoriteDeps"` 依旧可用。
export type { FavoriteDeps };

export function useFavoriteDeps(): FavoriteDeps | null {
    const token = useAppSelector(selectIdentityToken) ?? "";
    const servers = useAppSelector(selectRemoteServers) ?? [];
    return useMemo(() => ({ token, servers }), [token, servers]);
}
