import "./SpaceNavigation.css";
import React from "react";
import { useParams, useNavigate, useLocation } from "app/routing";
import {
  LuSettings,
  LuUsers,
  LuHouse,
  LuLayoutGrid,
} from "react-icons/lu";
import { useAppSelector } from "app/store";
import { useHasMounted } from "app/hooks/useHasMounted";
import { useSpaceLoading } from "../spaceMembershipStore";
import TabsNav from "render/web/ui/TabsNav";
import { useCurrentSpaceFromEntity } from "create/space/useCurrentSpaceFromEntity";
import { getCurrentSpaceIdRaw } from "create/space/spaceCurrentStore";
import { normalizeSpaceId } from "create/space/spaceKeys";
import { isTombstoneRecord } from "database/tombstones";

export interface SpaceNavigationProps {
  /**
   * Explicit Space scope for the navigation.
   *
   * `SpaceLayout` renders under `/space/:spaceId` and can rely on the route
   * param (the default). Surfaces that live outside `/space/*` — the Space
   * home, which is `/chat?spaceId=…` — carry the Space in the query string
   * instead, so they pass it here; the nav must never invent a Space id from
   * the residual global current Space.
   */
  spaceId?: string;
}

const SpaceNavigation: React.FC<SpaceNavigationProps> = ({
  spaceId: spaceIdProp,
}) => {
  const params = useParams<"spaceId">();
  const routeSpaceId = params?.spaceId;
  // An explicit prop wins; `SpaceLayout` (no prop) keeps using the route param.
  const spaceId = spaceIdProp ?? routeSpaceId;
  const navigate = useNavigate();
  const location = useLocation();
  const hasMounted = useHasMounted();
  const currentSpace = useCurrentSpaceFromEntity();
  const loading = useSpaceLoading();
  const currentPath = location.pathname;
  const currentSpaceIdRaw = getCurrentSpaceIdRaw();
  // The member count can only come from the resolved global current Space. When
  // the nav is pinned to an explicit `spaceId` (the `/chat?spaceId=` home) that
  // differs from it, the number belongs to another Space — showing it would
  // paint a wrong count, so it is withheld instead of invented.
  const propSpaceMatchesCurrent =
    !spaceIdProp ||
    normalizeSpaceId(currentSpaceIdRaw ?? "") === normalizeSpaceId(spaceIdProp);
  const showResolvedStats =
    hasMounted && !loading && propSpaceMatchesCurrent;

  const contentCount = showResolvedStats && spaceId && currentSpace?.id &&
    normalizeSpaceId(currentSpace.id) === normalizeSpaceId(spaceId) &&
    !isTombstoneRecord(currentSpace) && currentSpace.contents
    ? Object.values(currentSpace.contents).filter((item) => item && !isTombstoneRecord(item)).length
    : null;

  // 导航项配置
  const navItems = [
    {
      id: "home",
      path: `/space/${spaceId}`,
      label: (
        <span className="nav-item-content">
          <LuHouse size={16} className="nav-icon" aria-hidden="true" />
          首页
        </span>
      ),
    },
    {
      id: "contents",
      path: `/space/${spaceId}/contents`,
      label: (
        <span className="nav-item-content">
          <LuLayoutGrid size={16} className="nav-icon" aria-hidden="true" />
          全部内容
          {contentCount !== null && <span className="nav-badge">{contentCount}</span>}
        </span>
      ),
    },
    {
      id: "members",
      path: `/space/${spaceId}/members`,
      label: (
        <span className="nav-item-content">
          <span className="nav-icon-wrap">
            <LuUsers size={16} className="nav-icon" aria-hidden="true" />
            {showResolvedStats && (
              <span className="nav-badge nav-badge--corner">
                {currentSpace?.members?.length || 0}
              </span>
            )}
          </span>
          成员
        </span>
      ),
    },
    {
      id: "settings",
      path: `/space/${spaceId}/settings`,
      label: (
        <span className="nav-item-content">
          <LuSettings size={16} className="nav-icon" aria-hidden="true" />
          设置
        </span>
      ),
    },
  ];

  const spaceBasePath = spaceId ? `/space/${spaceId}` : null;
  // `/space/:spaceId` 之外（空间首页 = `/chat?spaceId=…`）没有子路径可解析，
  // 那里的落点就是「首页」（空间首页即该空间的对话），因此按 home 高亮。
  const isInsideSpaceRoute =
    !!spaceBasePath &&
    (currentPath === spaceBasePath ||
      currentPath.startsWith(`${spaceBasePath}/`));

  const getActiveTab = () => {
    if (!spaceBasePath) return "home";
    if (!isInsideSpaceRoute) return "home";
    const currentPathWithoutBase = currentPath.slice(spaceBasePath.length);
    if (currentPathWithoutBase === "" || currentPathWithoutBase === "/") {
      return "home";
    }
    const pathParts = currentPathWithoutBase.split("/").filter(Boolean);
    return pathParts[0] || "home";
  };

  const activeTab = getActiveTab();

  const handleTabChange = (tabId: string) => {
    const tab = navItems.find((item) => item.id === tabId);
    if (tab) {
      navigate(tab.path);
    }
  };

  return (
    <div className="space-navigation">
      <div className="space-header">

        <div className="space-header__right">
          <TabsNav
            tabs={navItems.map((item) => ({
              id: item.id,
              label: item.label,
              disabled: false,
            }))}
            activeTab={activeTab}
            onChange={handleTabChange as (tabId: string | number) => void}
            className="space-tabs-nav"
          />
        </div>
      </div>
    </div>
  );
};

export default SpaceNavigation;
