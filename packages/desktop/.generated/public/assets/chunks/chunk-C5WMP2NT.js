import {
  syncRecentAppVersions
} from "/public/assets/chunks/chunk-CJPHN6JB.js";
import {
  syncAppRecord
} from "/public/assets/chunks/chunk-2XKWBRFO.js";
import {
  useToken,
  useUserId
} from "/public/assets/chunks/chunk-4C6PJRJA.js";
import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  selectRemoteServer
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  asTrimmedString
} from "/public/assets/chunks/chunk-PN3BZAFX.js";
import {
  asTrimmedNonEmptyStringArray
} from "/public/assets/chunks/chunk-SM3EH4JD.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/hooks/useAppDetail.ts
var import_react = __toESM(require_react());
var normalizeCustomUrl = (customUrl, url) => {
  const normalizedCustomUrl = asTrimmedString(customUrl);
  const normalizedUrl = asTrimmedString(url);
  if (!normalizedCustomUrl) return void 0;
  return normalizedCustomUrl === normalizedUrl ? void 0 : normalizedCustomUrl;
};
var inferFallbackAppRecord = (detail, currentUserId) => {
  if (!currentUserId || !detail.appId || !detail.appKey) return null;
  if (!detail.appKey.startsWith(`app-${currentUserId}-`)) return null;
  const files = Array.isArray(detail.files) ? detail.files : void 0;
  const source = detail.framework === "react-spa" && files && files.length > 0 ? {
    kind: "react-spa",
    files,
    entryFile: files.find((file) => file.name === "main.tsx")?.name ?? files[0]?.name ?? "main.tsx",
    externalImports: Array.isArray(detail.externalImports) ? detail.externalImports : []
  } : files && files.length > 0 ? {
    kind: "worker-files",
    files
  } : {
    kind: "worker-code",
    code: detail.code ?? ""
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
    spaceId: detail.spaceId ?? void 0,
    icon: detail.icon ?? detail.appRecord?.icon ?? null,
    versionServerOrigin: detail.versionServerOrigin ?? detail.serverOrigin,
    updatedAt: detail.modifiedOn ? Date.parse(detail.modifiedOn) || Date.now() : Date.now(),
    createdAt: detail.createdAt ? Date.parse(detail.createdAt) || void 0 : void 0
  };
};
var resolveSyncRecord = (detail, currentUserId) => {
  if (detail.appRecord && typeof detail.appRecord === "object" && detail.appRecord.userId === currentUserId) {
    return detail.appRecord;
  }
  return inferFallbackAppRecord(detail, currentUserId);
};
function useAppDetail(appKey, options = {}) {
  const dispatch = useAppDispatch();
  const token = useToken();
  const currentUserId = useUserId();
  const server = useAppSelector(selectRemoteServer);
  const [app, setApp] = (0, import_react.useState)(null);
  const [loading, setLoading] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)(null);
  const fetchApp = (0, import_react.useCallback)(async () => {
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
        ...new Set(asTrimmedNonEmptyStringArray([server, options.serverOrigin]))
      ];
      let lastError = null;
      let fallbackApp = null;
      for (let index = 0; index < candidateServers.length; index += 1) {
        const targetServer = candidateServers[index];
        const res = await fetch(`${targetServer}${requestPath}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ appKey })
        });
        const json = await res.json().catch(() => null);
        if (res.ok && json?.success) {
          const detail = json;
          const shouldTryFallbackForEditableSource = options.prepareEdit === true && detail.editSafety !== "safe" && index < candidateServers.length - 1;
          if (shouldTryFallbackForEditableSource) {
            fallbackApp = detail;
            continue;
          }
          const syncRecord = index > 0 ? resolveSyncRecord(json, currentUserId) : null;
          if (index > 0 && json?.appKey && syncRecord) {
            try {
              await dispatch(
                syncAppRecord(json.appKey, syncRecord, {
                  includeCurrentServer: true
                })
              );
              if (detail.appId && detail.versionServerOrigin) {
                void syncRecentAppVersions({
                  currentServer: server,
                  sourceServer: detail.versionServerOrigin,
                  token,
                  appId: detail.appId
                });
              }
            } catch {
            }
          }
          setApp({
            ...detail,
            icon: detail.icon ?? detail.appRecord?.icon ?? null
          });
          return;
        }
        lastError = new Error(json?.message ?? `\u52A0\u8F7D\u5E94\u7528\u5931\u8D25 (${res.status})`);
        const isNotFound = res.status === 404 || json?.code === "NOT_FOUND";
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
      throw lastError ?? new Error("\u52A0\u8F7D\u5E94\u7528\u5931\u8D25");
    } catch (err) {
      setError(err?.message ?? "\u52A0\u8F7D\u5E94\u7528\u5931\u8D25");
    } finally {
      setLoading(false);
    }
  }, [appKey, currentUserId, dispatch, options.prepareEdit, options.serverOrigin, server, token]);
  (0, import_react.useEffect)(() => {
    void fetchApp();
  }, [fetchApp]);
  return { app, loading, error, refetch: fetchApp };
}

export {
  useAppDetail
};
