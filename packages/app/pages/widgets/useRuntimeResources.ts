// packages/app/pages/widgets/useRuntimeResources.ts
// 首页「运行时资源」Widget 数据 Hook：Cloudflare Containers 包含额度 / 用量观测。
//
// 数据来源分两层，杜绝硬编码假数据：
// 1) 本地纯计算层（首个渲染即时可用）：复用服务端同一个纯函数 `resolveRuntimeResources`
//    没有任何快照时是「官方包含额度 + 未观测到用量」，且被显式标记 estimated/非权威。
// 2) 真实读取层：只有拿到服务端来源（redux 里的 remoteServer，或显式注入 serverOrigin/fetcher）时，
//    才请求 `/api/runtime/resources?kind=cloudflare&source=live` 触发服务端真实读取；
//    服务端明确回「未配置」（凭证缺失/读取失败）时如实透出 error，绝不显示假用量。
//
// 卸载 AbortController 取消、请求序号防迟到响应覆盖、零自动轮询（只有显式 refresh）。
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ReactReduxContext } from "react-redux";
import { selectRemoteServer } from "app/settings/settingSlice";
import type { CloudflareContainersQuotaSnapshot } from "../../../agent-runtime/cloudflareContainersQuota";
import {
  resolveRuntimeResources,
  type CloudflareResourceQuota,
  type RuntimeResourcePayload,
} from "../../../agent-runtime/runtimeResources";

/** 服务端真实读取端点；`source=live` 表示要实读而不是要官方静态额度视图。 */
export const RUNTIME_RESOURCES_PATH = "/api/runtime/resources";
export const RUNTIME_RESOURCES_LIVE_QUERY = "kind=cloudflare&source=live";

export interface UseRuntimeResourcesOptions {
  /** 显式指定服务端来源；缺省时读 redux 里的 remoteServer（没有 store 就不发请求）。 */
  serverOrigin?: string;
  /** 便于测试或宿主注入的 fetch 实现。 */
  fetcher?: typeof fetch;
}

export interface UseRuntimeResourcesResult {
  resources: CloudflareResourceQuota | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

function toCloudflareQuota(
  payload: RuntimeResourcePayload,
): CloudflareResourceQuota | null {
  return payload.kind === "cloudflare" ? payload : null;
}

function pickServerOrigin(state: unknown): string {
  if (!state) return "";
  try {
    return selectRemoteServer(state as never) ?? "";
  } catch {
    // store 形状不认识时按「没有服务端来源」处理：只用本地纯计算视图，不猜数据。
    return "";
  }
}

function unconfiguredMessage(payload: RuntimeResourcePayload): string {
  if (payload.kind === "unconfigured" && payload.message) return payload.message;
  return "Cloudflare runtime resources are unconfigured";
}

export function useRuntimeResources(
  kind: string = "cloudflare",
  quotaSnapshot: CloudflareContainersQuotaSnapshot | null = null,
  options: UseRuntimeResourcesOptions = {},
): UseRuntimeResourcesResult {
  const reduxContext = useContext(ReactReduxContext);
  const storeState = reduxContext?.store
    ? reduxContext.store.getState()
    : undefined;

  const serverOrigin = (
    options.serverOrigin ??
    pickServerOrigin(storeState) ??
    ""
  )
    .trim()
    .replace(/\/+$/, "");
  const customFetch =
    options.fetcher ?? (typeof fetch !== "undefined" ? fetch : undefined);

  const localPayload = useMemo(
    () => resolveRuntimeResources(kind, quotaSnapshot),
    [kind, quotaSnapshot],
  );

  const [payload, setPayload] = useState<RuntimeResourcePayload>(localPayload);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);
  const requestSeqRef = useRef(0);

  // 传入的快照 / kind 变化时立即回到本地纯计算结果（不留上一次的旧数据）。
  useEffect(() => {
    setPayload(localPayload);
    setError(null);
  }, [localPayload]);

  const refresh = useCallback(() => {
    setTick((value) => value + 1);
  }, []);

  useEffect(() => {
    // 没有服务端来源就只用本地额度视图，不发请求（本地优先/SSR/离线都成立）。
    if (!serverOrigin || !customFetch) return;

    const controller = new AbortController();
    const requestId = ++requestSeqRef.current;

    const runLiveRead = async () => {
      try {
        const res = await customFetch(
          `${serverOrigin}${RUNTIME_RESOURCES_PATH}?${RUNTIME_RESOURCES_LIVE_QUERY}`,
          { signal: controller.signal, headers: { Accept: "application/json" } },
        );
        if (controller.signal.aborted || requestId !== requestSeqRef.current) return;
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: runtime resources unavailable`);
        }

        const body = (await res.json()) as RuntimeResourcePayload;
        if (controller.signal.aborted || requestId !== requestSeqRef.current) return;

        if (body && body.kind === "cloudflare") {
          setPayload(body);
          setError(null);
        } else {
          setError(new Error(unconfiguredMessage(body)));
        }
      } catch (err) {
        if (controller.signal.aborted || requestId !== requestSeqRef.current) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    };

    void runLiveRead();

    return () => {
      controller.abort();
    };
  }, [serverOrigin, customFetch, tick]);

  const resources = useMemo(() => toCloudflareQuota(payload), [payload]);

  return {
    // 实读失败（含服务端明确未配置）时不再兜出本地估算卡，避免把估算当真实用量展示。
    resources: error ? null : resources,
    loading: false,
    error,
    refresh,
  };
}

export default useRuntimeResources;
