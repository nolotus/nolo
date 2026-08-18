import { useCallback, useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "app/store";
import { useToken, useUserId } from "identity";
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
    userId: currentUserId,
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

export function useAppDetail(appKey?: string, options: UseAppDetailOptions = {}) {
  const dispatch = useAppDispatch();
  const token = useToken();
  const currentUserId = useUserId();
  const server = useAppSelector(selectRemoteServer);
  const [app, setApp] = useState<AppDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApp = useCallback(async () => {
    if (!appKey || !token) {
      setApp(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const requestPath = options.prepareEdit ? "/api/app/prepare-edit" : "/api/app/get";
      const candidateServers = [
        ...new Set(asTrimmedNonEmptyStringArray([server, options.serverOrigin])),
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
          const syncRecord = index > 0 ? resolveSyncRecord(json as AppDetail, currentUserId) : null;
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
          setApp({
            ...detail,
            icon: detail.icon ?? detail.appRecord?.icon ?? null,
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
        setApp(fallbackApp);
        return;
      }
      throw lastError ?? new Error("加载应用失败");
    } catch (err: any) {
      setError(err?.message ?? "加载应用失败");
    } finally {
      setLoading(false);
    }
  }, [appKey, currentUserId, dispatch, options.prepareEdit, options.serverOrigin, server, token]);

  useEffect(() => {
    void fetchApp();
  }, [fetchApp]);

  return { app, loading, error, refetch: fetchApp };
}
