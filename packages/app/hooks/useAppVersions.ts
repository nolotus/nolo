import { useCallback, useEffect, useState } from "react";
import { useAppSelector } from "app/store";
import { selectRemoteServer } from "app/settings/settingSlice";
import { useToken } from "identity";
import { fetchAppVersionsCurrentServerFirst } from "create/version/appVersionReplication";

export interface AppVersionEntry {
  versionId: string;
  entityId: string;
  type: "app";
  snapshot: any;
  label?: string;
  pinned?: boolean;
  createdAt: string;
}

export function useAppVersions(appId?: string, sourceServerOrigin?: string | null) {
  const server = useAppSelector(selectRemoteServer);
  const token = useToken();
  const [versions, setVersions] = useState<AppVersionEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVersions = useCallback(async () => {
    if (!appId || !token) {
      setVersions([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchAppVersionsCurrentServerFirst({
        currentServer: server,
        sourceServer: sourceServerOrigin,
        token,
        appId,
      });
      setVersions(Array.isArray(data) ? (data as AppVersionEntry[]) : []);
    } catch (err: any) {
      setError(err?.message ?? "加载版本失败");
    } finally {
      setLoading(false);
    }
  }, [appId, server, sourceServerOrigin, token]);

  useEffect(() => {
    void fetchVersions();
  }, [fetchVersions]);

  return { versions, loading, error, refetch: fetchVersions };
}
