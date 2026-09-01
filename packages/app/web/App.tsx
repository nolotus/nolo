// 文件路径：app/web/App.tsx

import React, { useEffect, useMemo, useRef } from "react";
import type { RouteObject, Location as RouterLocation } from "app/routing";
import { useRoutes, useLocation } from "app/routing";
import { MyToastRegion as Toaster } from "render/web/ui/Toast";

import { useAppDispatch, useAppSelector } from "app/store";
import { initializeAuth } from "identity/actions";
import { useIdentity } from "identity";
import i18n from "app/i18n/client";
import { addHostToCurrentServer, getSettings } from "app/settings/settingSlice";
import {
  fetchUserSpaceMemberships,
} from "create/space/member/memberThunks";
import {
  fetchSpace,
  fetchSpaceSidebarState,
} from "create/space/spaceThunks";
import {
  selectCurrentSpaceId,
} from "create/space/spaceCurrentSelectors";
import { isSpaceMembershipRemoteUnavailableError } from "create/space/member/isSpaceMembershipRemoteUnavailableError";
import { useSystemTheme } from "app/theme/useSystemTheme";
import GlobalThemeController from "app/theme/GlobalThemeController";
import GlobalBaseStyles from "app/theme/GlobalBaseStyles";
import { legacySettingRoutes, settingRoutes } from "app/settings/routes";
import { isDesktopApp } from "app/utils/env";
import { useDesktopLocalConnectorAutostart } from "app/hooks/useDesktopLocalConnectorAutostart";
import {
  decideSpaceInitialization,
  resolveSpaceBootActorId,
} from "./spaceInitGuard";

// ✅ 收藏相关
import {
  initFavorites,
  useFavoritesInitialized,
  useFavoriteDeps,
} from "app/favorite/favoriteStore";
import { useCurrentSpaceId } from "create/space/spaceCurrentStore";

const dateUrl = "date.nolo.chat";
const crmUrl = "crm.nolo.chat";
const RECENT_SHARE_FOREGROUND_SYNC_SKIP_MS = 4000;

interface AppProps {
  hostname: string;
  lng?: string;
  initialRoutes: RouteObject[];
}

type BackgroundState = {
  backgroundLocation?: RouterLocation;
};

export default function App({ hostname, lng = "en", initialRoutes }: AppProps) {
  const dispatch = useAppDispatch();
  // useIdentity().userId 是 SSR-safe（mount 前返回 undefined，与 SSR 一致），
  // 避免 hydrate 首帧 userId 不匹配导致 React 丢弃 SSR DOM → 白屏。
  const { userId } = useIdentity();
  const initializedRef = useRef(false);
  const spaceInitUserRef = useRef<string | null>(null);
  const readyForegroundSyncUserRef = useRef<string | null>(null);
  const lastForegroundSyncAt = useRef(0);
  useSystemTheme();
  useDesktopLocalConnectorAutostart();

  const location = useLocation();
  const state = location.state as BackgroundState | undefined;

  // 收藏是否已经初始化过
  const favoritesInitialized = useFavoritesInitialized();
  const favoriteDeps = useFavoriteDeps();
  const currentSpaceId = useCurrentSpaceId();
  const foregroundSyncRef = useRef({ inFlight: false, lastStartedAt: 0 });
  const recentShareCreatedAtRef = useRef(0);
  const runtimeOrigin =
    typeof window !== "undefined" && typeof window.location?.origin === "string"
      ? window.location.origin
      : hostname;

  // ✅ 主内容：使用 backgroundLocation 渲染“背景页”
  const mainElement = useRoutes(
    initialRoutes,
    state?.backgroundLocation || location,
  );

  // 给 modal 路由树补一个空兜底，避免首页等普通路径触发
  // “No routes matched location” 警告。
  const modalRoutes = useMemo(
    () => [settingRoutes, legacySettingRoutes, { path: "*", element: null }],
    [],
  );
  const modalElement = useRoutes(modalRoutes, location);

  useEffect(() => {
    if (lng) i18n.changeLanguage(lng);
    if (hostname === dateUrl || hostname === crmUrl) return;

    // 一次性初始化 Auth
    if (!initializedRef.current) {
      initializedRef.current = true;
      (async () => {
        try {
          if (!isDesktopApp) {
            dispatch(addHostToCurrentServer(runtimeOrigin));
          }
          await dispatch(initializeAuth()).unwrap();
        } catch (e) {
          console.error("系统初始化失败:", e);
        }
      })();
    }

    // Device-local Space B1: guest/blank → effective actor "local";
    // account → that userId. Membership hydrate + default selection are actor-scoped.
    const accountUserId = userId;
    const { shouldInitialize, nextInitializedUserId } =
      decideSpaceInitialization(spaceInitUserRef.current, accountUserId);
    const spaceActorId = nextInitializedUserId;
    spaceInitUserRef.current = spaceActorId;
    if (!shouldInitialize || !spaceActorId) return;

    // 用户信息 + 空间初始化（不包含收藏，避免 favoritesInitialized 变化触发重复执行）
    (async () => {
      let __initPerf: { start(l: string): void; end(l: string): void } | null = null;
      if (typeof window !== "undefined" && localStorage.getItem("debugPerf") === "1") {
        const w = window as unknown as Record<string, unknown>;
        if (!w.__appInitPerf) {
          const marks: Record<string, number> = {};
          w.__appInitPerf = {
            start(l: string) { marks[l] = performance.now(); },
            end(l: string) { const t = marks[l]; if (t !== undefined) { console.debug(`[APP-INIT-PERF] ${l}: ${(performance.now() - t).toFixed(1)}ms`); delete marks[l]; } },
          };
        }
        __initPerf = w.__appInitPerf as { start(l: string): void; end(l: string): void };
      }
      __initPerf?.start("space_initialization");
      try {
        // Settings failure aborts boot. Membership remote-unavailable is
        // recoverable: keep actor-local preview (no sticky default space).
        const [settingsResult, membershipResult] = await Promise.allSettled([
          dispatch(getSettings()).unwrap(),
          dispatch(fetchUserSpaceMemberships(spaceActorId)).unwrap(),
        ]);
        if (settingsResult.status === "rejected") {
          throw settingsResult.reason;
        }
        if (membershipResult.status === "rejected") {
          if (
            !isSpaceMembershipRemoteUnavailableError(membershipResult.reason)
          ) {
            throw membershipResult.reason;
          }
          console.warn(
            `[App] membership remote unavailable for ${spaceActorId}; continuing offline from local cache`
          );
        }
        __initPerf?.end("settings+memberships");
        // Ignore stale boot completions when actor switched mid-flight (local↔account).
        if (spaceInitUserRef.current === spaceActorId) {
          readyForegroundSyncUserRef.current = spaceActorId;
        }
      } catch (e) {
        if (spaceInitUserRef.current === spaceActorId) {
          readyForegroundSyncUserRef.current = null;
          spaceInitUserRef.current = null;
        }
        console.error(`用户数据初始化失败 for ${spaceActorId}:`, e);
      }
      __initPerf?.end("space_initialization");
    })();
  }, [dispatch, hostname, lng, userId, runtimeOrigin]);

  useEffect(() => {
    if (!userId || favoritesInitialized || !favoriteDeps?.token) return;

    let __favPerf: { start(l: string): void; end(l: string): void } | null = null;
    if (typeof window !== "undefined") {
      __favPerf = window.__appInitPerf ?? null;
      if (__favPerf) __favPerf.start("favorites_initialization");
    }

    void initFavorites(favoriteDeps).then(() => {
      __favPerf?.end("favorites_initialization");
    });
  }, [userId, favoritesInitialized, favoriteDeps]);

  useEffect(() => {
    if (hostname === dateUrl || hostname === crmUrl) return;
    // Guest included: actor "local" so local Space can foreground-refresh without remote.
    const spaceActorId = resolveSpaceBootActorId(userId);
    if (readyForegroundSyncUserRef.current !== spaceActorId) return;

    const lastCompletedSyncAt = lastForegroundSyncAt;

    const refreshForegroundData = async (options?: {
      skipRecentShare?: boolean;
    }) => {
      const syncState = foregroundSyncRef.current;
      const now = Date.now();
      if (
        options?.skipRecentShare &&
        now - recentShareCreatedAtRef.current <
          RECENT_SHARE_FOREGROUND_SYNC_SKIP_MS
      ) {
        return;
      }
      if (syncState.inFlight || now - syncState.lastStartedAt < 1000) return;

      // 30s 内刚完成过同步就直接跳过
      if (now - lastCompletedSyncAt.current < 30_000) return;

      syncState.inFlight = true;
      syncState.lastStartedAt = now;

      let __fgPerf: { start(l: string): void; end(l: string): void } | null = null;
      if (typeof window !== "undefined") {
        __fgPerf = window.__appInitPerf ?? null;
        if (__fgPerf) __fgPerf.start("foreground_sync");
      }

      try {
        // Same recoverable rule as boot: only remote-unavailable membership
        // failure continues; do not stamp remote-sync cooldown on offline.
        const [settingsResult, membershipResult] = await Promise.allSettled([
          dispatch(getSettings()).unwrap(),
          dispatch(fetchUserSpaceMemberships(spaceActorId)).unwrap(),
        ]);
        if (settingsResult.status === "rejected") {
          throw settingsResult.reason;
        }
        const membershipOffline =
          membershipResult.status === "rejected" &&
          isSpaceMembershipRemoteUnavailableError(membershipResult.reason);
        if (
          membershipResult.status === "rejected" &&
          !membershipOffline
        ) {
          throw membershipResult.reason;
        }
        if (membershipOffline) {
          console.warn(
            `[App] foreground membership remote unavailable for ${spaceActorId}; continuing offline`
          );
        }
        __fgPerf?.end("fg_sync:settings+memberships");

        if (!currentSpaceId) {
          // Stay on "all spaces" view — no sticky default space to open.
          // Offline membership refresh must stay retryable (no success cooldown).
          if (!membershipOffline) {
            lastCompletedSyncAt.current = Date.now();
          }
          return;
        }

        await Promise.allSettled([
          dispatch(
            fetchSpace({ spaceId: currentSpaceId, fresh: true }),
          ).unwrap(),
          dispatch(fetchSpaceSidebarState(currentSpaceId)).unwrap(),
        ]);
        __fgPerf?.end("fg_sync:refetch_space+sidebar");
        if (!membershipOffline) {
          lastCompletedSyncAt.current = Date.now();
        }
      } catch (e) {
        console.warn("[App] 前台恢复同步失败:", e);
      } finally {
        syncState.inFlight = false;
        __fgPerf?.end("foreground_sync");
      }
    };

    const handleFocus = () => {
      void refreshForegroundData({ skipRecentShare: true });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshForegroundData({ skipRecentShare: true });
      }
    };
    const handleShareCreated = () => {
      recentShareCreatedAtRef.current = Date.now();
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("nolo:share-created", handleShareCreated);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("nolo:share-created", handleShareCreated);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [dispatch, hostname, userId, currentSpaceId]);

  return (
    <>
      <GlobalThemeController />
      <GlobalBaseStyles />
      <Toaster />

      {/* 背景主内容 */}
      {mainElement}

      {/* 只有有 backgroundLocation 时，才叠加 settings 弹窗 */}
      {state?.backgroundLocation && modalElement}
    </>
  );
}
