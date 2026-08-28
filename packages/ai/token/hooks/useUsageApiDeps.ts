// 从会话快照桥解析 usage API 依赖（server/token）——不依赖 redux API。
// 快照由 createAppStore 挂载（attachSessionSnapshot）；未来写端剥离 redux 时
// 读端零改动。
//
// 注意：返回对象必须 useMemo 稳定（server/token 值不变则引用不变）——
// 否则下游 hook 的 useEffect/useCallback 依赖每次 render 重建 → 无限重复请求
//（W1 实测踩坑，2026-08-21）。快照本身引用稳定（useSyncExternalStore），
// 这里只是把两个字段收敛成 deps 对象。
import { useMemo } from "react";
import { useSessionSnapshot } from "app/sessionSnapshot";
import type { UsageApiDeps } from "ai/token/usageApi";

export const useUsageApiDeps = (): UsageApiDeps => {
  const { server, token } = useSessionSnapshot();
  return useMemo(() => ({ server, token }), [server, token]);
};
