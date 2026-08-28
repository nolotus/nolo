import "./SpaceNavigation.css";
import React from "react";
import { useParams, useNavigate, useLocation } from "app/routing";
import {
  LuSettings,
  LuUsers,
  LuHouse,
} from "react-icons/lu";
import { useAppSelector } from "app/store";
import { useHasMounted } from "app/hooks/useHasMounted";
import { useSpaceLoading } from "../spaceMembershipStore";
import TabsNav from "render/web/ui/TabsNav";
import { useCurrentSpaceFromEntity } from "create/space/spaceCurrentSelectors";

const SpaceNavigation: React.FC = () => {
  const { spaceId } = useParams<"spaceId">();
  const navigate = useNavigate();
  const location = useLocation();
  const hasMounted = useHasMounted();
  const currentSpace = useCurrentSpaceFromEntity();
  const loading = useSpaceLoading();
  const currentPath = location.pathname;
  const showResolvedStats = hasMounted && !loading;

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

  const getActiveTab = () => {
    const currentPathWithoutBase = currentPath.replace(`/space/${spaceId}`, "");
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
