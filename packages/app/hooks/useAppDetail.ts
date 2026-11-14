import { useCallback, useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "app/store";
import { useToken, useUserId } from "identity";
import { getAllServers } from "database/actions/common";
import { selectRemoteSyncServers } from "app/settings/serverSelectors";
import { selectRemoteServer } from "app/settings/settingSlice";
import type { AppVisibility } from "app/types/appSummary";
import { syncAppRecord } from "app/actions/syncAppRecord";
import { asTrimmedNonEmptyStringArray } from "core/stringArray";
import { asTrimmedString } from "core/trimmedString";
import { syncRecentAppVersions } from "create/version/appVersionReplication";
import type { ContentIcon } from "render/contentIcon/types";

export interface AppSourceFile {
  name: string;
  code: string;
}

export interface AppDetail {
  success: boolean;
  appId: string;
  appKey?: string;
  serverOrigin?: string;
  versionServerOrigin?: string;
  userFriendlyName: string;
  url: string;
  customUrl?: string;
  code: string;
  files?: AppSourceFile[];
  framework?: "worker" | "react-spa" | "nolo-react";
  externalImports?: string[];
  sourceStatus?: "ready" | "missing" | "artifact-only";
  editSafety?: "safe" | "rebuild-risk";
  prepared?: boolean;
  spaceId?: string | null;
  visibility?: AppVisibility;
  modifiedOn?: string;
  createdAt?: string;
  appRecord?: Record<string, any>;
  /**
   * 服务端下发的真实 owner（review C1）。以前客户端把「当前用户」当成 owner，
   * 空间只读成员因此也能看到「分享/发布」按钮。
   */
  ownerUserId?: string;
  /** 只有 owner 为 true：分享/发布到社区的唯一门控信号（服务端派生）。 */
  canShare?: boolean;
  /** 谁能打开这个应用（产品真值 A 轴）：分享面板文案按它分档，不在客户端重新推。 */
  reachability?: "owner" | "space" | "link" | "public";
  icon?: ContentIcon | null;
}

interface UseAppDetailOptions {
  prepareEdit?: boolean;
  serverOrigin?: string | null;
}

const normalizeCustomUrl = (customUrl?: string | null, url?: string | null) => {
  const normalizedCustomUrl = asTrimmedString(customUrl);
  const normalizedUrl = asTrimmedString(url);
  if (!normalizedCustomUrl) return undefined;
  return normalizedCustomUrl === normalizedUrl ? undefined : normalizedCustomUrl;
};

const inferFallbackAppRecord = (
  detail: AppDetail,
  currentUserId?: string | null
): Record<string, any> | null => {
  if (!currentUserId || !detail.appId || !detail.appKey) return null;
  // owner 只认服务端真值（review C1）：服务端**明确**给出别的 owner 时，绝不重建记录
  // —— 那会让本地记录/后续写操作以为自己拥有别人的 app。
  // 但「没给」不等于「不是 owner」：legacy 载荷（老版本 /api/app/get 与跨域回退）
  // 根本没有 ownerUserId 字段，此时唯一可用的所有权信号是服务端签发的 appKey 前缀
  // `app-<ownerUserId>-`（见下一行）。把缺字段也当成「不是 owner」会让 legacy 回退
  // 整条重建 + dispatch 静默丢失（见 useAppDetail.test.tsx 的 legacy fallback 用例）。
  if (detail.ownerUserId && detail.ownerUserId !== currentUserId) return null;
  if (!detail.appKey.startsWith(`app-${currentUserId}-`)) return null;

  const files = Array.isArray(detail.files) ? detail.files : undefined;
  const source =
    detail.framework === "react-spa" && files && files.length > 0
      ? {
          kind: "react-spa",
          files,
          entryFile: files.find((file) => file.name === "main.tsx")?.name ?? files[0]?.name ?? "main.tsx",
          externalImports: Array.isArray(detail.externalImports) ? detail.externalImports : [],
        }
      : files && files.length > 0
        ? {
            kind: "worker-files",
            files,
          }
        : {
            kind: "worker-code",
            code: detail.code ?? "",
          };

  return {
    appId: detail.appId,
    appKey: detail.appKey,
    userId: detail.ownerUserId ?? currentUserId,
    name: detail.userFriendlyName,
    code: detail.code ?? "",
    framework: detail.framework ?? "worker",
    source,
    customUrl: normalizeCustomUrl(detail.customUrl, detail.url),
    visibility: detail.visibility ?? "private",
    spaceId: detail.spaceId ?? undefined,
    icon: detail.icon ?? detail.appRecord?.icon ?? null,
    versionServerOrigin: detail.versionServerOrigin ?? detail.serverOrigin,
    updatedAt: detail.modifiedOn ? Date.parse(detail.modifiedOn) || Date.now() : Date.now(),
    createdAt: detail.createdAt ? Date.parse(detail.createdAt) || undefined : undefined,
  };
};

const resolveSyncRecord = (
  detail: AppDetail,
  currentUserId?: string | null
): Record<string, any> | null => {
  if (
    detail.appRecord &&
    typeof detail.appRecord === "object" &&
    detail.appRecord.userId === currentUserId
  ) {
    return detail.appRecord;
  }
  return inferFallbackAppRecord(detail, currentUserId);
};

interface AppDetailState {
  /** 下面这份 app / error 属于哪个 appKey（null 表示「没有 appKey 或还没加载」）。 */
  appKey: string | null;
  app: AppDetail | null;
  error: string | null;
}

export function useAppDetail(appKey?: string, options: UseAppDetailOptions = {}) {
  const dispatch = useAppDispatch();
  const token = useToken();
  const currentUserId = useUserId();
  const server = useAppSelector(selectRemoteServer);
  const syncServers = useAppSelector(selectRemoteSyncServers);
  const readServersKey = JSON.stringify(getAllServers(server, syncServers));
  // app 与 error 绑定在它们所属的 appKey 上：切换 appKey 后，新请求落地前调用方
  // 只能看到「还没加载」，不会看到上一个应用的数据。
  // 否则详情页会拿上一个应用的 appKey 去做 URL 归一化，把地址栏 replace 回
  // 上一个 app（侧栏连续点两个 app 时地址栏来回跳）。
  const [detail, setDetail] = useState<AppDetailState>({
    appKey: null,
    app: null,
    error: null,
  });
  const [loading, setLoading] = useState(false);
  // 请求代号：每次发起请求自增，旧请求（切换 appKey / 并发 refetch）的应答一律丢弃，
  // 不允许它覆盖当前 appKey 的状态。
  const requestSeqRef = useRef(0);
  const requestedAppKey = appKey ?? null;

  const fetchApp = useCallback(async () => {
    const requestAppKey = appKey ?? null;
    const requestSeq = ++requestSeqRef.current;
    const isCurrentRequest = () => requestSeq === requestSeqRef.current;

    if (!requestAppKey || !token) {
      setDetail({ appKey: requestAppKey, app: null, error: null });
      setLoading(false);
      return;
    }

    setLoading(true);
    // 同一个 appKey 的 refetch 保留已加载内容，只把上一次的错误清掉。
    setDetail((current) =>
      current.appKey === requestAppKey ? { ...current, error: null } : current
    );

    try {
      const requestPath = options.prepareEdit ? "/api/app/prepare-edit" : "/api/app/get";
      const candidateServers = [
        ...new Set(asTrimmedNonEmptyStringArray([server, options.serverOrigin, ...JSON.parse(readServersKey)])),
      ];

      let lastError: Error | null = null;
      let fallbackApp: AppDetail | null = null;
      for (let index = 0; index < candidateServers.length; index += 1) {
        const targetServer = candidateServers[index];
        const res = await fetch(`${targetServer}${requestPath}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ appKey }),
        });

        const json = await res.json().catch(() => null);
        if (res.ok && json?.success) {
          const detail = json as AppDetail;
          const shouldTryFallbackForEditableSource =
            options.prepareEdit === true &&
            detail.editSafety !== "safe" &&
            index < candidateServers.length - 1;
          if (shouldTryFallbackForEditableSource) {
            fallbackApp = detail;
            continue;
          }
          // Explicit source hints retain the existing repair behavior; automatic
          // discovery is read-only and must not fan out remote records.
          const syncRecord = index > 0 && targetServer === options.serverOrigin
            ? resolveSyncRecord(json as AppDetail, currentUserId) : null;
          if (index > 0 && json?.appKey && syncRecord) {
            try {
              await dispatch(
                syncAppRecord(json.appKey, syncRecord, {
                  includeCurrentServer: true,
                })
              );
              if (detail.appId && detail.versionServerOrigin) {
                void syncRecentAppVersions({
                  currentServer: server,
                  sourceServer: detail.versionServerOrigin,
                  token,
                  appId: detail.appId,
                });
              }
            } catch {
              // Keep remote detail usable even if current-server self-heal fails.
            }
          }
          if (!isCurrentRequest()) return;
          setDetail({
            appKey: requestAppKey,
            app: {
              ...detail,
              icon: detail.icon ?? detail.appRecord?.icon ?? null,
            },
            error: null,
          });
          return;
        }

        lastError = new Error(json?.message ?? `加载应用失败 (${res.status})`);
        const isNotFound =
          res.status === 404 || json?.code === "NOT_FOUND";
        const hasFallback = index < candidateServers.length - 1;
        if (isNotFound && hasFallback) {
          continue;
        }
        throw lastError;
      }
      if (fallbackApp) {
        if (!isCurrentRequest()) return;
        setDetail({ appKey: requestAppKey, app: fallbackApp, error: null });
        return;
      }
      throw lastError ?? new Error("加载应用失败");
    } catch (err: any) {
      if (!isCurrentRequest()) return;
      setDetail({
        appKey: requestAppKey,
        app: null,
        error: err?.message ?? "加载应用失败",
      });
    } finally {
      if (isCurrentRequest()) setLoading(false);
    }
  }, [appKey, currentUserId, dispatch, options.prepareEdit, options.serverOrigin, readServersKey, server, token]);

  useEffect(() => {
    void fetchApp();
  }, [fetchApp]);

  const detailForRequestedAppKey = detail.appKey === requestedAppKey ? detail : null;
  return {
    app: detailForRequestedAppKey?.app ?? null,
    // 数据还没落到当前 appKey 上（刚切换 / 首个请求在途）：按加载中呈现，
    // 不要把一个空预览当作新 app 的结论。
    loading: loading || !detailForRequestedAppKey,
    error: detailForRequestedAppKey?.error ?? null,
    refetch: fetchApp,
  };
}
