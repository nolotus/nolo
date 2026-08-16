import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { NavLink, useNavigate } from "app/routing";
import { useAppDispatch, useAppSelector } from "app/store";
import { getMyRoutePathForTab } from "app/constants/mySections";
import {
  changeSpace,
  fetchUserSpaceMemberships,
  selectAllMemberSpaces,
  selectCurrentSpace,
  selectMemberSpacesLoaded,
  selectMembershipStatus,
  selectSpaceLoading,
  selectViewMode,
  setViewMode,
} from "create/space/spaceSlice";
import { useUserId } from "identity";
import { useClickOutside } from "app/hooks/useClickOutside";
import {
  ListBox,
  ListBoxItem,
  ListBoxSection,
  type Selection,
} from "react-aria-components";
import { LuChevronDown, LuCheck, LuLoader, LuLayoutGrid, LuPlus } from "react-icons/lu";
import { Dialog } from "render/web/ui/modal/Dialog";
import { CreateSpaceForm } from "create/space/CreateSpaceForm";
import { zIndex } from "render/styles/zIndex";
import "./layout.css";

interface SpaceItemData {
  spaceId: string;
  spaceName?: string;
  dbKey?: string;
}

/** Synthetic list key for the "All spaces" view option. */
const ALL_VIEW_KEY = "__all__";
const RETRY_KEY = "__retry__";

/** 精选调色板：饱和适中、无紫色，匹配深色/浅色主题均好看 */
const SPACE_PALETTE = [
  "hsl(158 55% 40%)", // 翠绿
  "hsl(210 65% 50%)", // 蓝
  "hsl(27  85% 50%)", // 橙
  "hsl(346 65% 50%)", // 玫红
  "hsl(187 55% 40%)", // 青
  "hsl(38  80% 48%)", // 琥珀
  "hsl(325 55% 50%)", // 粉
  "hsl(195 65% 42%)", // 天蓝
  "hsl(14  75% 50%)", // 砖红
  "hsl(155 50% 38%)", // 深绿
];

/** 根据空间名稳定地映射到调色板颜色 */
function nameToColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SPACE_PALETTE[Math.abs(hash) % SPACE_PALETTE.length];
}

interface TopbarSpaceSwitcherProps {
  placement?: "topbar" | "sidebar";
}

export const TopbarSpaceSwitcher: React.FC<TopbarSpaceSwitcherProps> = ({
  placement = "topbar",
}) => {
  const { t } = useTranslation("space");
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const spaces = useAppSelector(selectAllMemberSpaces) || [];
  const space = useAppSelector(selectCurrentSpace);
  const loading = useAppSelector(selectSpaceLoading);
  const membershipStatus = useAppSelector(selectMembershipStatus);
  const memberSpacesLoaded = useAppSelector(selectMemberSpacesLoaded);
  const userId = useUserId();
  // 列表的空态要看列表自己的状态。space.loading 是切换空间/新建空间共用的标志，
  // 用它会让一次无关的操作把列表说成「加载中」，失败时又会说成「没有空间」。
  const isSpaceListLoading = !memberSpacesLoaded && membershipStatus === "loading";
  const isSpaceListFailed = !memberSpacesLoaded && membershipStatus === "offline";
  const viewMode = useAppSelector(selectViewMode);
  const isAllView = viewMode === "all";
  const isMembershipOffline = membershipStatus === "offline";

  const [isOpen, setIsOpen] = useState(false);
  const [isCreateSpaceOpen, setIsCreateSpaceOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleOpenCreateSpace = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsCreateSpaceOpen(true);
    setIsOpen(false);
  }, []);
  const buttonGroupRef = useRef<HTMLDivElement>(null);
  const chevronBtnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const menuId = useId();

  useClickOutside(containerRef as any, (event) => {
    // The dropdown is portaled to <body> to escape topbar overflow clipping, so
    // "outside" must treat the trigger area and the portaled panel as one surface.
    if (panelRef.current?.contains(event.target as Node)) {
      return;
    }
    setIsOpen(false);
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleResize = () => setIsOpen(false);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen]);

  // "全部" is the cross-space My Content scope (/content), not the marketing home (/).
  const allViewPath = getMyRoutePathForTab("all");

  const handleSelectAll = useCallback(() => {
    dispatch(setViewMode("all"));
    navigate(allViewPath);
    setIsOpen(false);
  }, [allViewPath, dispatch, navigate]);

  const handleSelect = useCallback(
    (spaceId: string) => {
      dispatch(setViewMode("categories"));
      (dispatch as any)((changeSpace as any)(spaceId));
      navigate(`/space/${spaceId}`);
      setIsOpen(false);
    },
    [dispatch, navigate]
  );

  const handleRetryMemberships = useCallback(() => {
    if (!userId) return;
    (dispatch as any)((fetchUserSpaceMemberships as any)(userId));
  }, [dispatch, userId]);

  const handleSelectionChange = useCallback(
    (keys: Selection) => {
      if (keys === "all") return;
      const key = [...keys][0];
      if (key == null) return;
      const id = String(key);
      if (id === ALL_VIEW_KEY) {
        handleSelectAll();
        return;
      }
      if (id === RETRY_KEY) {
        handleRetryMemberships();
        return;
      }
      handleSelect(id);
    },
    [handleRetryMemberships, handleSelect, handleSelectAll]
  );

  const handleTogglePanel = useCallback(() => {
    const trigger = buttonGroupRef.current ?? chevronBtnRef.current;
    if (!isOpen && trigger) {
      const triggerRect = trigger.getBoundingClientRect();
      const containerRect = containerRef.current?.getBoundingClientRect();
      const rect =
        placement === "sidebar" && triggerRect.width <= 0 && containerRect
          ? containerRect
          : triggerRect;
      const chevronRect = chevronBtnRef.current?.getBoundingClientRect() ?? rect;
      // Keep the switcher panel on a fixed layer. Rendering this as an absolutely
      // positioned child under the topbar regresses quickly because parent shells
      // use overflow clipping and the menu becomes "unclickable but invisible".
      const panelWidth =
        placement === "sidebar"
          ? Math.max(200, Math.min(rect.width, window.innerWidth - 16))
          : undefined;
      const panelLeft =
        placement === "sidebar"
          ? Math.max(8, Math.min(rect.left, window.innerWidth - (panelWidth ?? 248) - 8))
          : chevronRect.left - 180;
      setPanelStyle({
        position: "fixed",
        top: (placement === "sidebar" ? rect.bottom : chevronRect.bottom) + 8,
        left: Math.max(8, Math.min(panelLeft, window.innerWidth - (panelWidth ?? 248))),
        ...(panelWidth ? { width: panelWidth } : null),
        zIndex: zIndex.dropdown ?? 1000,
      });
    }
    setIsOpen((prev) => !prev);
  }, [isOpen, placement]);

  const allColor = "hsl(220 60% 50%)";
  // No space selected → treat as "全部", never show empty "选择空间" / "?" .
  const treatAsAll = isAllView || !space?.id;
  const selectedKey = treatAsAll ? ALL_VIEW_KEY : space?.id ?? ALL_VIEW_KEY;
  const selectedKeys = useMemo(() => new Set<React.Key>([selectedKey]), [selectedKey]);
  const color = treatAsAll
    ? allColor
    : space?.name
      ? nameToColor(space.name)
      : allColor;
  const displayName = treatAsAll ? t("all") : space?.name || t("all");
  const isSpaceResolving = loading && !treatAsAll;
  const displayInitial = treatAsAll
    ? ""
    : space?.name?.[0]?.toUpperCase() ?? "";
  const placementClass =
    placement === "topbar" ? "TpSw--topbar" : `TpSw--${placement}`;
  const createLabel = t("create_new_space", "新建空间");

  return (
    <>
      <div
        className={`TpSw TpSw--multi ${placementClass}`}
        ref={containerRef}
      >
        {/* 触发区：左边点击直接跳转，右边箭头开/关切换面板 */}
        <div className="TpSw__btnGroup" ref={buttonGroupRef}>
          <NavLink
            to={treatAsAll ? allViewPath : `/space/${space?.id ?? ""}`}
            className="TpSw__spaceLink"
            onClick={(e) => {
              if (e.button === 1 || e.ctrlKey || e.metaKey) return;
              if (treatAsAll) {
                e.preventDefault();
                handleSelectAll();
              } else if (space?.id) {
                e.preventDefault();
                handleSelect(space.id);
              }
            }}
          >
            <span className="TpSw__icon" style={{ background: color }} aria-hidden="true">
              {treatAsAll ? (
                <LuLayoutGrid size={11} aria-hidden="true" />
              ) : loading ? (
                <LuLoader className="TpSw__spinIcon" size={10} aria-hidden="true" />
              ) : (
                displayInitial
              )}
            </span>
            <span className="TpSw__name">
              {isSpaceResolving ? t("loading") : displayName}
            </span>
          </NavLink>

          <button
            ref={chevronBtnRef}
            type="button"
            className="TpSw__chevronBtn"
            onClick={handleTogglePanel}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-controls={menuId}
            aria-label={t("switch_space")}
          >
            <LuChevronDown size={14} className="TpSw__arrow" aria-hidden="true" />
          </button>
        </div>

        {/* Portaled on purpose: topbar containers clip overflow. Do not move this
            back under the local layout tree unless the topbar overflow model changes. */}
        {isOpen && typeof document !== "undefined" && createPortal(
          <div
            ref={panelRef}
            id={menuId}
            className={`TpSw__panel ${placement === "sidebar" ? "TpSw__panel--sidebar" : ""}`}
            style={panelStyle}
            // Panel is a chrome shell; the real listbox role lives on RAC ListBox.
          >
            <div className="TpSw__panelHeader">
              <span className="TpSw__panelTitle">
                {t("switch_space")}
              </span>
              {isMembershipOffline && (
                <span
                  className="TpSw__offlineBadge"
                  title={t("offline_local_cache")}
                >
                  {t("offline_local_cache")}
                </span>
              )}
            </div>

            <ListBox
              aria-label={t("switch_space")}
              className="TpSw__list"
              selectionMode="single"
              selectionBehavior="replace"
              selectedKeys={selectedKeys as any}
              onSelectionChange={handleSelectionChange}
              autoFocus
              // Dependencies keep selected styling fresh when the current space
              // resolves after the panel opens (RAC caches collection nodes).
              dependencies={[selectedKey, treatAsAll]}
            >
              <ListBoxItem
                id={ALL_VIEW_KEY}
                textValue={t("all")}
                className="TpSw__item"
              >
                {({ isSelected }) => (
                  <>
                    <span
                      className="TpSw__itemIcon"
                      style={{ background: allColor }}
                      aria-hidden="true"
                    >
                      <LuLayoutGrid size={10} aria-hidden="true" />
                    </span>
                    <span className="TpSw__itemName">{t("all")}</span>
                    {isSelected && (
                      <LuCheck size={13} className="TpSw__itemCheck" aria-hidden="true" />
                    )}
                  </>
                )}
              </ListBoxItem>

              {spaces.length > 0 ? (
                <ListBoxSection className="TpSw__section" aria-label={t("space_list")}>
                  {spaces.map((s: SpaceItemData) => {
                    const itemColor = s.spaceName
                      ? nameToColor(s.spaceName)
                      : "hsl(210 65% 50%)";
                    const label = s.spaceName || s.spaceId;
                    return (
                      <ListBoxItem
                        key={s.dbKey || s.spaceId}
                        id={s.spaceId}
                        textValue={label}
                        className="TpSw__item"
                      >
                        {({ isSelected }) => (
                          <>
                            <span
                              className="TpSw__itemIcon"
                              style={{ background: itemColor }}
                              aria-hidden="true"
                            >
                              {s.spaceName?.[0]?.toUpperCase() ?? "?"}
                            </span>
                            <span className="TpSw__itemName" title={label}>
                              {label}
                            </span>
                            {isSelected && (
                              <LuCheck
                                size={13}
                                className="TpSw__itemCheck"
                                aria-hidden="true"
                              />
                            )}
                          </>
                        )}
                      </ListBoxItem>
                    );
                  })}
                </ListBoxSection>
              ) : isSpaceListLoading ? (
                <ListBoxItem
                  id="__loading__"
                  textValue={t("loading")}
                  className="TpSw__emptyItem"
                  isDisabled
                >
                  <div className="TpSw__empty">{t("loading")}</div>
                </ListBoxItem>
              ) : isSpaceListFailed ? (
                <ListBoxItem
                  id={RETRY_KEY}
                  textValue={t("space_list_failed", "空间列表加载失败，点击重试")}
                  className="TpSw__emptyItem"
                >
                  <div className="TpSw__empty">
                    {t("space_list_failed", "空间列表加载失败，点击重试")}
                  </div>
                </ListBoxItem>
              ) : (
                <ListBoxItem
                  id="__empty__"
                  textValue={t("no_spaces")}
                  className="TpSw__emptyItem"
                  isDisabled
                >
                  <div className="TpSw__empty">{t("no_spaces")}</div>
                </ListBoxItem>
              )}
            </ListBox>

            {/* Sticky footer: create is an action, not a list option. Keep outside ListBox. */}
            <div className="TpSw__footer">
              <button
                type="button"
                className="TpSw__createBtn"
                onClick={handleOpenCreateSpace}
                title={createLabel}
                aria-label={createLabel}
              >
                <span className="TpSw__createIcon" aria-hidden="true">
                  <LuPlus size={14} aria-hidden="true" />
                </span>
                <span className="TpSw__createLabel">{createLabel}</span>
              </button>
            </div>
          </div>,
          document.body
        )}
      </div>

      <Dialog
        isOpen={isCreateSpaceOpen}
        onClose={() => setIsCreateSpaceOpen(false)}
      >
        <CreateSpaceForm onClose={() => setIsCreateSpaceOpen(false)} />
      </Dialog>
    </>
  );
};

export default TopbarSpaceSwitcher;
