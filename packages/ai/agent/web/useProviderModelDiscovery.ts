// packages/ai/agent/web/useProviderModelDiscovery.ts
//
// 创建 Agent 表单的动态模型发现 hook（best-effort）：
// - 白名单 preset + 非空 key → debounce 后调服务端 discover 接口；
// - 成功 → 返回 live/static 模型列表（static 时调用方应与静态目录合并）；
// - 失败/不支持 → 返回 null，UI 保持纯静态渲染。
// 竞态处理：每次触发递增 generation，过期响应直接丢弃。

import { useEffect, useRef, useState } from "react";
import {
  fetchDiscoveredModels,
  isDiscoverablePreset,
  type ProviderDiscoveryClientResult,
} from "./providerModelDiscoveryClient";

// 最小长度门槛（与 providerModelDiscovery MIN_API_KEY_LENGTH 契约一致，测试锁定 8）。
const MIN_API_KEY_LENGTH = 8;
const DISCOVER_DEBOUNCE_MS = 500;

export type UseProviderModelDiscoveryArgs = {
  serverOrigin: string;
  token: string;
  presetId: string;
  apiKey: string;
};

export function useProviderModelDiscovery(args: UseProviderModelDiscoveryArgs): ProviderDiscoveryClientResult | null {
  const { serverOrigin, token, presetId, apiKey } = args;
  const [result, setResult] = useState<ProviderDiscoveryClientResult | null>(null);
  const generationRef = useRef(0);

  useEffect(() => {
    const generation = ++generationRef.current;
    // 不支持的 preset / 空 key / 过短 key：不发请求，直接清空结果。
    if (!isDiscoverablePreset(presetId) || apiKey.trim().length < MIN_API_KEY_LENGTH) {
      setResult(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        const r = await fetchDiscoveredModels({
          serverOrigin,
          token,
          presetId,
          apiKey,
        });
        if (!cancelled && generation === generationRef.current) {
          setResult(r);
        }
      })();
    }, DISCOVER_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [serverOrigin, token, presetId, apiKey]);

  return result;
}
