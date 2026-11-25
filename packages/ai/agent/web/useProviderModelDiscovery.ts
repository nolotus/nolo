// 创建 Agent 表单的动态模型发现 hook（best-effort）：
// - 白名单 preset + 已保存的账户凭据→ debounce 后调服务端 discover 接口；
// - 成功 → 透出 source/models/observedAt/fallbackReason；static 保留本地目录；
// - 失败/不支持 → 返回 null，UI 保持纯静态渲染。
// 竞态处理：每次触发递增 generation，过期响应直接丢弃。

import { useEffect, useRef, useState } from "react";
import {
  fetchDiscoveredModels,
  isDiscoverablePreset,
  isOAuthDiscoveryPreset,
  type ProviderDiscoveryClientResult,
} from "./providerModelDiscoveryClient";

const DISCOVER_DEBOUNCE_MS = 500;

export type UseProviderModelDiscoveryArgs = {
  serverOrigin: string;
  token: string;
  presetId: string;
  hasSharedProviderKey: boolean;
};

export function useProviderModelDiscovery(args: UseProviderModelDiscoveryArgs): ProviderDiscoveryClientResult | null {
  const { serverOrigin, token, presetId, hasSharedProviderKey } = args;
  const enabled = hasSharedProviderKey || isOAuthDiscoveryPreset(presetId);
  const [state, setState] = useState<{
    serverOrigin: string;
    token: string;
    presetId: string;
    result: ProviderDiscoveryClientResult | null;
  } | null>(null);
  const generationRef = useRef(0);

  useEffect(() => {
    const generation = ++generationRef.current;
    if (!serverOrigin || !token || !enabled || !isDiscoverablePreset(presetId)) {
      setState(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        const result = await fetchDiscoveredModels({
          serverOrigin,
          token,
          presetId,
        });
        if (!cancelled && generation === generationRef.current) {
          setState({ serverOrigin, token, presetId, result });
        }
      })();
    }, DISCOVER_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [serverOrigin, token, presetId, enabled]);

  // 切换 preset / 凭证时不能在 debounce 窗口把旧目录合入新通道。
  return enabled && state && state.serverOrigin === serverOrigin && state.token === token &&
    state.presetId === presetId ? state.result : null;
}
