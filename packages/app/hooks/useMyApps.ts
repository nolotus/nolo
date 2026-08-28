import { useState, useCallback, useEffect, type Dispatch, type SetStateAction } from "react";
import { useAppDispatch, useAppSelector } from "app/store";
import { useToken, useUserId } from "identity";
import {
  selectRemoteServer,
  selectRemoteServers,
} from "app/settings/settingSlice";
import { resolveAppRouteKey } from "app/utils/appKeys";
import { fetchOwnedApps } from "app/fetchOwnedApps";
import type { AppSummary, AppVisibility, CustomDomain } from "app/types/appSummary";

type AccessibleAppListResponse = {
  workers?: Array<{
    userFriendlyName?: string;
    name?: string;
    url?: string | null;
    appId?: string;
    appKey?: string;
    spaceId?: string | null;
    customUrl?: string;
    modifiedOn?: string;
    visibility?: AppVisibility;
  }>;
};

type DomainMutationResponse = {
  url?: string;
  mode?: string;
  pendingDns?: boolean;
  aRecords?: string[];
  error?: {
    message?: string;
    code?: string;
  };
};

type DomainListResponse = {
  domains?: CustomDomain[];
};

export function useMyAppListData(
  spaceId?: string | null,
  options: { enabled?: boolean } = {}
) {
  const dispatch = useAppDispatch();
  const userId = useUserId();
  const currentToken = useToken();
  const server = useAppSelector(selectRemoteServer);
  const servers = useAppSelector(selectRemoteServers);

  const [apps, setApps] = useState<AppSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enabled = options.enabled ?? true;

  const fetchApps = useCallback(async () => {
    if (!enabled || !userId) return;
    setLoading(true);
    setError(null);
    try {
      if (!spaceId) {
        const ownedApps = (await dispatch(
          fetchOwnedApps({
            userId,
            server,
            servers,
            limit: 200,
            authToken: currentToken,
          })
        ).unwrap()) as AppSummary[];
        setApps(ownedApps);
        return;
      }
      const res = await fetch(`${server}/api/app/list`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${currentToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ spaceId }),
      });
      if (!res.ok) throw new Error(`获取应用列表失败 (${res.status})`);
      const json = (await res.json()) as AccessibleAppListResponse;
      const workers: AppSummary[] = (json.workers ?? []).map((w: any) => ({
        name: w.userFriendlyName ?? w.name ?? w.appId ?? w.appKey ?? "Untitled App",
        url: w.url ?? null,
        appId: w.appId,
        appKey: w.appKey ?? resolveAppRouteKey(undefined, w.appId) ?? undefined,
        spaceId: w.spaceId ?? null,
        customUrl: w.customUrl,
        modifiedOn: w.modifiedOn,
        visibility: w.visibility ?? "private",
        deployMode: "platform",
      }));
      setApps(workers);
    } catch (err: any) {
      setError(err?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }, [dispatch, enabled, userId, currentToken, server, servers, spaceId]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    void fetchApps();
  }, [enabled, fetchApps]);

  return {
    apps,
    setApps,
    loading,
    error,
    fetchApps,
  };
}

interface UseMyAppActionsOptions {
  setApps: Dispatch<SetStateAction<AppSummary[]>>;
}

export function useMyAppActions({ setApps }: UseMyAppActionsOptions) {
  const currentToken = useToken();
  const server = useAppSelector(selectRemoteServer);
  const servers = useAppSelector(selectRemoteServers);
  const resolveAppServer = useCallback(
    (app: Pick<AppSummary, "serverOrigin"> | null | undefined) =>
      app?.serverOrigin?.trim() || server,
    [server]
  );
  const resolveAppServers = useCallback(
    (app: Pick<AppSummary, "serverOrigin"> | null | undefined) => {
      const ordered = [resolveAppServer(app), ...servers];
      return [
        ...new Set(
          ordered.filter(
            (value): value is string =>
              typeof value === "string" && value.trim().length > 0
          )
        ),
      ];
    },
    [resolveAppServer, servers]
  );

  const postAppMutation = useCallback(
    async <TResponse>(
      app: Pick<AppSummary, "serverOrigin"> | null | undefined,
      path: string,
      body: Record<string, unknown>,
      options?: { treat404AsOk?: boolean }
    ) => {
      if (!currentToken) {
        return [];
      }
      const targetServers = resolveAppServers(app);
      return Promise.all(
        targetServers.map(async (targetServer, index) => {
          try {
            const res = await fetch(`${targetServer}${path}`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${currentToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(body),
            });
            const data = (await res.json().catch(() => ({}))) as TResponse;
            return {
              server: targetServer,
              required: index === 0,
              ok: res.ok || (options?.treat404AsOk === true && res.status === 404),
              status: res.status,
              data,
            };
          } catch {
            return {
              server: targetServer,
              required: index === 0,
              ok: false,
              status: null,
              data: {} as TResponse,
            };
          }
        })
      );
    },
    [currentToken, resolveAppServers]
  );

  const hasReplicaFailure = useCallback(
    (results: Array<{ ok: boolean; required: boolean; server: string; status: number | null }>) => {
      const replicaFailures = results.filter((result) => !result.required && !result.ok);
      if (replicaFailures.length > 0) {
        console.warn("[useMyApps] skipped failed replica servers", replicaFailures);
      }
    },
    []
  );

  const deleteApp = useCallback(
    async (app: Pick<AppSummary, "name" | "appId" | "appKey" | "serverOrigin">): Promise<boolean> => {
      const name = app.name;
      const appId = app.appId;
      if (!currentToken || (!appId && !name)) return false;
      try {
        const results = await postAppMutation<Record<string, unknown>>(
          app,
          "/api/app/delete",
          appId ? { appId, name } : { name },
          { treat404AsOk: true }
        );
        if (!results.some((result) => result.required && result.ok)) return false;
        hasReplicaFailure(results);
        setApps((prev) =>
          prev.filter((app) =>
            appId ? app.appId !== appId : app.name !== name
          )
        );
        return true;
      } catch {
        return false;
      }
    },
    [currentToken, hasReplicaFailure, postAppMutation, setApps]
  );

  const shareApp = useCallback(
    async (
      app: Pick<AppSummary, "appId" | "serverOrigin">,
      visibility: AppVisibility
    ): Promise<boolean> => {
      const appId = app.appId;
      if (!currentToken || !appId) return false;
      try {
        const results = await postAppMutation<Record<string, unknown>>(
          app,
          "/api/app/share",
          { appId, visibility }
        );
        if (!results.some((result) => result.required && result.ok)) return false;
        hasReplicaFailure(results);
        setApps((prev) =>
          prev.map((a) => (a.appId === appId ? { ...a, visibility } : a))
        );
        return true;
      } catch {
        return false;
      }
    },
    [currentToken, hasReplicaFailure, postAppMutation, setApps]
  );

  const bindDomain = useCallback(
    async (
      app: Pick<AppSummary, "appId" | "serverOrigin">,
      hostname: string
    ): Promise<{
      ok: boolean;
      url?: string;
      error?: string;
      code?: string;
      mode?: string;
      pendingDns?: boolean;
      aRecords?: string[];
    }> => {
      const appId = app.appId;
      if (!currentToken || !appId) return { ok: false, error: "未登录" };
      try {
        const results = await postAppMutation<DomainMutationResponse>(
          app,
          "/api/app/domain/bind",
          { appId, hostname }
        );
        const primary = results.find((result) => result.required);
        const data = primary?.data as DomainMutationResponse | undefined;
        if (!primary?.ok) {
          return {
            ok: false,
            error: data?.error?.message || `绑定失败 (${primary?.status ?? "network"})`,
            code: data?.error?.code,
          };
        }
        hasReplicaFailure(results);
        const domainData = data ?? {};
        setApps((prev) =>
          prev.map((app) =>
            app.appId === appId && !domainData.pendingDns
              ? { ...app, customUrl: domainData.url ?? app.customUrl }
              : app
          )
        );
        return {
          ok: true,
          url: domainData.url,
          mode: domainData.mode,
          pendingDns: domainData.pendingDns,
          aRecords: Array.isArray(domainData.aRecords) ? domainData.aRecords : [],
        };
      } catch (error: any) {
        return { ok: false, error: error?.message || "绑定失败" };
      }
    },
    [currentToken, hasReplicaFailure, postAppMutation, setApps]
  );

  const unbindDomain = useCallback(
    async (
      app: Pick<AppSummary, "appId" | "serverOrigin">,
      hostname: string
    ): Promise<{ ok: boolean; error?: string }> => {
      const appId = app.appId;
      if (!currentToken || !appId) return { ok: false, error: "未登录" };
      try {
        const results = await postAppMutation<DomainMutationResponse>(
          app,
          "/api/app/domain/unbind",
          { appId, hostname }
        );
        const primary = results.find((result) => result.required);
        const data = primary?.data as DomainMutationResponse | undefined;
        if (!primary?.ok) {
          return {
            ok: false,
            error: data?.error?.message || `解绑失败 (${primary?.status ?? "network"})`,
          };
        }
        hasReplicaFailure(results);
        setApps((prev) =>
          prev.map((app) =>
            app.appId === appId && app.customUrl === `https://${hostname}`
              ? { ...app, customUrl: app.url ?? undefined }
              : app
          )
        );
        return { ok: true };
      } catch (error: any) {
        return { ok: false, error: error?.message || "解绑失败" };
      }
    },
    [currentToken, hasReplicaFailure, postAppMutation, setApps]
  );

  const listDomains = useCallback(
    async (app: Pick<AppSummary, "appId" | "serverOrigin">): Promise<CustomDomain[]> => {
      const appId = app.appId;
      if (!currentToken || !appId) return [];
      try {
        const res = await fetch(`${resolveAppServer(app)}/api/app/domain/list`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${currentToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ appId }),
        });
        const data = (await res.json().catch(() => ({}))) as DomainListResponse;
        if (!res.ok) return [];
        const domains = Array.isArray(data?.domains) ? data.domains : [];
        const activeDomain = domains.find((domain: CustomDomain) => !domain.pendingDns);
        if (activeDomain?.url) {
          setApps((prev) =>
            prev.map((app) =>
              app.appId === appId ? { ...app, customUrl: activeDomain.url } : app
            )
          );
        }
        return domains;
      } catch {
        return [];
      }
    },
    [currentToken, resolveAppServer, setApps]
  );

  return {
    deleteApp,
    shareApp,
    bindDomain,
    unbindDomain,
    listDomains,
  };
}
