import React, { Suspense, useEffect } from "react";
import { Outlet, useParams } from "app/routing";
import SpaceNavigation from "./SpaceNavigation";
import { useTheme } from "app/theme";
import { useAppDispatch, useAppSelector } from "app/store";
import { selectSidebarWidth } from "app/settings/settingSlice";
import { changeSpace } from "create/space/spaceSlice";
import { normalizeSpaceId } from "create/space/spaceKeys";
import { useCurrentSpaceId } from "create/space/spaceCurrentStore";

const SpaceLayout: React.FC = () => {
  const { spaceId, pageKey } = useParams<"spaceId" | "pageKey">();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const sidebarWidth = useAppSelector(selectSidebarWidth);
  const currentSpaceId = useCurrentSpaceId();
  const isContentRoute = typeof pageKey === "string" && pageKey.length > 0;
  const shellMaxWidth = sidebarWidth > 0
    ? Math.max(1360, 1600 - Math.round(sidebarWidth * 0.6))
    : 1600;

  useEffect(() => {
    if (!spaceId) return;
    const normalizedRouteSpaceId = normalizeSpaceId(spaceId);
    if (normalizedRouteSpaceId === currentSpaceId) return;
    void (dispatch as any)(changeSpace(normalizedRouteSpaceId));
  }, [currentSpaceId, dispatch, spaceId]);

  if (isContentRoute) {
    return (
      <div className="space-content-route-shell">
        <Suspense fallback={<div className="loading">加载中...</div>}>
          <Outlet />
        </Suspense>

        <style>{`
          .space-content-route-shell {
            width: 100%;
            min-width: 0;
            min-height: 0;
            height: 100%;
            display: flex;
            flex-direction: column;
          }

          .loading {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 400px;
            color: ${theme.textTertiary};
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="space-layout">
      <SpaceNavigation />

      <div className="space-content">
        <Suspense fallback={<div className="loading">加载中...</div>}>
          <Outlet />
        </Suspense>
      </div>

      <style>{`
        .space-layout {
          --space-shell-max-width: ${shellMaxWidth}px;
          --space-shell-padding-x: 24px;
          width: 100%;
          max-width: var(--space-shell-max-width);
          margin: 0 auto;
          padding: 0 var(--space-shell-padding-x) 40px;
          box-sizing: border-box;
          display: grid;
          grid-template-columns: 1fr;
          gap: ${theme.space[5]};
        }

        .space-content {
          border-radius: var(--radius-md);
          min-height: 600px;
          min-width: 0;
        }

        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 400px;
          color: ${theme.textTertiary};
        }

        @media (max-width: 768px) {
          .space-layout {
            --space-shell-padding-x: ${theme.space[3]};
          }

          .space-content {
            min-height: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default SpaceLayout;
