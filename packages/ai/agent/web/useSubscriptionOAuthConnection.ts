import { useCallback, useEffect, useMemo, useState } from "react";
import { getIsDesktopApp } from "app/utils/env";
import { normalizeServerOrigin } from "core/serverOrigin";
import { selectCurrentServer } from "app/settings/settingSlice";
import { useAppSelector } from "app/store";
import { useToken } from "identity";

export type SubscriptionOAuthConnection =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "not_connected" }
  | { kind: "connecting" }
  | { kind: "connected"; email?: string; accountId?: string; expiresAt?: number }
  | { kind: "error"; message: string };

type StatusBody = {
  connected?: boolean;
  email?: string;
  accountId?: string;
  expiresAt?: number;
  error?: string;
};

export function useSubscriptionOAuthConnection(provider: string | null) {
  const isDesktop = getIsDesktopApp();
  const currentServer = useAppSelector(selectCurrentServer);
  const token = useToken() ?? "";
  const serverOrigin = useMemo(() => normalizeServerOrigin(currentServer) || (typeof window !== "undefined" ? window.location.origin : ""), [currentServer]);
  const [connection, setConnection] = useState<SubscriptionOAuthConnection>({
    kind: provider ? "loading" : "idle",
  });

  const readStatus = useCallback(async () => {
    if (!provider) {
      setConnection({ kind: "idle" });
      return;
    }
    setConnection(current =>
      current.kind === "connecting" ? current : { kind: "loading" },
    );
    const path = isDesktop
      ? `/api/desktop/oauth/${encodeURIComponent(provider)}/status`
      : `${serverOrigin}/api/oauth/${encodeURIComponent(provider)}/status`;
    if (!isDesktop && (!serverOrigin || !token)) {
      setConnection({ kind: "not_connected" });
      return;
    }
    try {
      const response = await fetch(path, {
        cache: "no-store",
        headers: isDesktop ? undefined : { Authorization: `Bearer ${token}` },
      });
      const body = (await response.json().catch(() => ({}))) as StatusBody;
      if (!response.ok) {
        setConnection({ kind: "error", message: body.error || `Status ${response.status}` });
        return;
      }
      setConnection(
        body.connected
          ? {
              kind: "connected",
              email: body.email,
              accountId: body.accountId,
              expiresAt: body.expiresAt,
            }
          : { kind: "not_connected" },
      );
    } catch {
      setConnection({ kind: "error", message: "无法查询 OAuth 登录状态" });
    }
  }, [isDesktop, provider, serverOrigin, token]);

  useEffect(() => {
    void readStatus();
  }, [readStatus]);

  const startLogin = useCallback(async () => {
    if (!provider || !isDesktop) return;
    setConnection({ kind: "connecting" });
    try {
      const response = await fetch(
        `/api/desktop/oauth/${encodeURIComponent(provider)}/start`,
        { method: "POST" },
      );
      const body = (await response.json().catch(() => ({}))) as StatusBody;
      if (!response.ok || !body.connected) {
        setConnection({ kind: "error", message: body.error || "OAuth 登录失败" });
        return;
      }
      setConnection({
        kind: "connected",
        email: body.email,
        accountId: body.accountId,
        expiresAt: body.expiresAt,
      });
    } catch {
      setConnection({ kind: "error", message: "OAuth 登录失败" });
    }
  }, [isDesktop, provider, serverOrigin, token]);

  return { isDesktop, connection, refresh: readStatus, startLogin };
}
