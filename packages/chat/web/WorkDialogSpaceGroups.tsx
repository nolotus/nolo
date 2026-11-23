import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "app/routing";
import { AppRoutePaths } from "app/constants/routePaths";
import {
  LuChevronRight,
  LuMessageCircle,
  LuEllipsis,
  LuFolderPlus,
  LuLayoutGrid,
  LuPlus,
  LuSettings,
  LuUsers,
} from "react-icons/lu";
import CreateMenuButtonContainer from "render/layout/CreateMenuButtonContainer";
import { Menu, MenuItem, Separator } from "render/web/ui/Menu";
import { MenuPopover } from "render/web/ui/MenuPopover";
import React, { useRef, useState } from "react";
import { useAddCategory } from "create/space/hooks/useSpaceData";
import { AddCategoryModal } from "create/space/category/AddCategoryModal";
import CategoryHeader from "create/space/category/CategoryHeader";
import { UNCATEGORIZED_ID } from "create/space/constants";
import { normalizeSpaceId } from "database-engine/spaceLinkAccess";
import { sidebarStyles } from "./sidebarStyles";
import { withLiteralClass } from "./withLiteralClass";
import {
  setWorkSpacePreference,
  useWorkSpacePreferences,
} from "./sidebar/workSpaceUiStore";
import type { HomeScope } from "./homeScopeProjection";
import {
  OTHER_SPACES_GROUP,
  canManageSpaceCategories,
  isWorkDialogSpaceGroupExpanded,
  projectWorkDialogSpacePreferences,
  realSpaceOrdinalAt,
  type WorkCategoryGroup,
  type WorkDialogSpaceGroup,
  type WorkSpaceRecord,
} from "./sidebar/workDialogSpaceGroups";

export function WorkDialogSpaceGroups({
  groups,
  userId,
  memberSpaces = [],
  records,
  homeScope,
  onSelectHomeScope,
  onSpaceRecordUpdate,
  activeRowKey,
  children,
}: {
  groups: readonly WorkDialogSpaceGroup[];
  userId: string;
  memberSpaces?: readonly {
    spaceId: string;
    userId?: string;
    role?: string;
    ownerId?: string;
  }[];
  records?: ReadonlyMap<string, WorkSpaceRecord>;
  homeScope?: HomeScope;
  onSelectHomeScope?: (scope: HomeScope) => void;
  onSpaceRecordUpdate?: (
    spaceId: string,
    newCategoryId?: string,
    newCategory?: { name: string; order: number },
  ) => void;
  /** 当前路由上打开的内容键；用于把「空间外」分组按需自动展开。 */
  activeRowKey?: string | null;
  children: (group: WorkDialogSpaceGroup) => React.ReactNode;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation("space");
  const addCategoryInSpace = useAddCategory();
  const [activeAddCategorySpaceId, setActiveAddCategorySpaceId] = useState<
    string | null
  >(null);
  // 标题行的轻量更多菜单（全部内容 / 成员 / 设置 / 新建分类）。锚点取自被点的
  // 那个按钮，浮层用仓库既有的 MenuPopover，不自造 popover。
  const [moreMenuSpaceId, setMoreMenuSpaceId] = useState<string | null>(null);
  const moreMenuAnchorRef = useRef<HTMLElement | null>(null);
  const preferences = useWorkSpacePreferences(userId, "spaces");
  const activePreferences = projectWorkDialogSpacePreferences(
    preferences,
    groups,
  );
  const toggle = (key: string, expanded: boolean) => {
    setWorkSpacePreference(userId, "spaces", key, !expanded);
  };
  // 更多菜单只对当前打开的那个空间负责：权限按同一谓词现算，不缓存。
  const moreMenuGroup = groups.find(
    (group) => group.spaceId !== undefined && group.spaceId === moreMenuSpaceId,
  );
  const moreMenuCanManage = moreMenuGroup?.spaceId
    ? canManageSpaceCategories({
        spaceId: moreMenuGroup.spaceId,
        userId,
        memberSpaces,
        record: records?.get(moreMenuGroup.spaceId),
      })
    : false;
  const normalizedMemberSpaceCount = React.useMemo(() => {
    const ids = new Set<string>();
    for (const member of memberSpaces) {
      const id = normalizeSpaceId(member.spaceId);
      if (id) ids.add(id);
    }
    return ids.size;
  }, [memberSpaces]);
  const isRealSpaceGroup = (candidate: WorkDialogSpaceGroup) =>
    Boolean(candidate.spaceId) && candidate.spaceId !== OTHER_SPACES_GROUP;
  return (
    <div
      aria-label={t("workspace_workspaces", "空间工作区")}
      data-hook="space-workspaces-scroll"
      tabIndex={0}
      {...withLiteralClass(
        "WorkSpaceGroup__workSpaceGroups",
        sidebarStyles.workSpaceGroups,
      )}
    >
      {groups.map((group, index) => {
        const key = JSON.stringify(group.spaceId);
        const defaultExpanded =
          group.spaceId === null && homeScope?.kind === "noSpace";
        // Keep unassociated content reachable without inventing a second workspace.
        // 仅当存在**排在它前面**的成员空间标题行（可承载更多菜单内的「空间外」切换入口）时，
        // 才隐藏空间外独立标题条；「空间外」分区排在第一位时没有更早的标题行可依附，
        // 必须保留自己的标题条，不能让顶部内容变成「无标题展开」。
        // 若单成员空间因无名称被忽略未渲染，同样必须保留「空间外」标题条中的可见切换入口，
        // 绝不只留不可点状态。
        const ungrouped =
          group.spaceId === null &&
          normalizedMemberSpaceCount === 1 &&
          groups.slice(0, index).some(isRealSpaceGroup);
        // 当前打开的内容已确认在空间外时自动展开该分组：否则置顶的空间外内容默认折叠、
        // 当前打开的行反而不可见。显式的手动折叠仍优先（见 isWorkDialogSpaceGroupExpanded）。
        const holdsActiveRow =
          group.spaceId === null &&
          activeRowKey != null &&
          group.rows.some((row) => row.key === activeRowKey);
        const expanded =
          ungrouped ||
          isWorkDialogSpaceGroupExpanded(
            group.spaceId,
            realSpaceOrdinalAt(groups, index),
            activePreferences[key] ??
              (defaultExpanded || holdsActiveRow ? true : undefined),
          );
        const record = group.spaceId ? records?.get(group.spaceId) : undefined;
        const canManage = canManageSpaceCategories({
          spaceId: group.spaceId,
          userId,
          memberSpaces,
          record,
        });
        return (
          <section
            key={key}
            data-hook="work-dialog-space-group"
            data-space-id={group.spaceId ?? ""}
          >
            {!ungrouped && (
              <div
                data-hook="space-workspace-header"
                {...withLiteralClass(
                  "WorkSpaceGroup__header",
                  sidebarStyles.workSpaceHeader,
                )}
              >
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => toggle(key, expanded)}
                  aria-label={t("workspace_toggle", {
                    name: group.label,
                    defaultValue: "折叠或展开{{name}}",
                  })}
                  {...withLiteralClass(
                    "WorkSpaceGroup__workSpaceToggle",
                    sidebarStyles.workSpaceToggle,
                  )}
                >
                  <LuChevronRight
                    aria-hidden="true"
                    size={16}
                    {...withLiteralClass(
                      "WorkSpaceGroup__chevron",
                      sidebarStyles.workSpaceChevron,
                      expanded && sidebarStyles.workSpaceChevronExpanded,
                    )}
                  />
                </button>
                {group.spaceId && group.spaceId !== OTHER_SPACES_GROUP ? (
                  <a
                    data-hook="space-workspace-chat"
                    data-workspace-navigation="true"
                    href={`${AppRoutePaths.CHAT}?spaceId=${encodeURIComponent(group.spaceId)}`}
                    onClick={(event) => {
                      if (
                        !event.metaKey &&
                        !event.ctrlKey &&
                        !event.shiftKey &&
                        !event.altKey
                      ) {
                        event.preventDefault();
                        navigate(
                          `${AppRoutePaths.CHAT}?spaceId=${encodeURIComponent(group.spaceId!)}`,
                        );
                      }
                    }}
                    {...withLiteralClass(
                      "WorkSpaceGroup__workSpaceLabel",
                      sidebarStyles.workSpaceLabel,
                    )}
                    title={t("workspace_enter_space_chat", {
                      name: group.label,
                      defaultValue: "{{name}}（进入空间对话）",
                    })}
                  >
                    {group.label}
                  </a>
                ) : group.spaceId === null ? (
                  <button
                    type="button"
                    data-hook="space-workspace-no-space"
                    data-workspace-navigation="true"
                    aria-current={
                      homeScope?.kind === "noSpace" ? "true" : undefined
                    }
                    onClick={() => {
                      const nextScope: HomeScope =
                        homeScope?.kind === "noSpace"
                          ? { kind: "all" }
                          : { kind: "noSpace" };
                      onSelectHomeScope?.(nextScope);
                      if (nextScope.kind === "noSpace") {
                        if (
                          location?.pathname?.startsWith("/space") ||
                          location?.search?.includes("spaceId=")
                        ) {
                          navigate(AppRoutePaths.CHAT);
                        }
                      }
                    }}
                    {...withLiteralClass(
                      "WorkSpaceGroup__workSpaceLabel",
                      sidebarStyles.workSpaceLabel,
                      sidebarStyles.workSpaceFilterLabel,
                      homeScope?.kind === "noSpace" &&
                        sidebarStyles.workSpaceFilterLabelActive,
                    )}
                    title={t(
                      "workspace_filter_unassociated",
                      "筛选仅看空间外内容",
                    )}
                  >
                    {group.label}
                  </button>
                ) : (
                  <span
                    {...withLiteralClass(
                      "WorkSpaceGroup__workSpaceLabel",
                      sidebarStyles.workSpaceLabel,
                    )}
                    title={group.label}
                  >
                    {group.label}
                  </span>
                )}
                {(!group.spaceId || group.spaceId === OTHER_SPACES_GROUP) && group.rows.length > 0 && (
                  <span
                    {...withLiteralClass(
                      "WorkSpaceGroup__badge",
                      sidebarStyles.workSpaceBadge,
                    )}
                  >
                    {group.rows.length}
                  </span>
                )}
                {group.spaceId &&
                  group.spaceId !== OTHER_SPACES_GROUP &&
                  canManage && (
                    // 只有真实可写空间提供本地「新建」：scopeSpace 锁定本行空间，
                    // 与当前路由所在空间无关；空间外 / 其他空间没有确定的目标空间。
                    <CreateMenuButtonContainer
                      variant="header"
                      showLabel={false}
                      scopeSpace={{ id: group.spaceId, name: group.label }}
                      title={t("workspace_create_in_space", {
                        name: group.label,
                        defaultValue: "在{{name}}中新建",
                      })}
                      {...withLiteralClass(
                        "WorkSpaceGroup__create",
                        sidebarStyles.workSpaceRowAction,
                      )}
                    />
                  )}
                {group.spaceId && group.spaceId !== OTHER_SPACES_GROUP && (
                  <button
                    type="button"
                    data-hook="space-workspace-more"
                    aria-haspopup="menu"
                    aria-expanded={moreMenuSpaceId === group.spaceId}
                    aria-label={t("workspace_more", {
                      name: group.label,
                      defaultValue: "空间更多操作：{{name}}",
                    })}
                    title={t("workspace_more", {
                      name: group.label,
                      defaultValue: "空间更多操作：{{name}}",
                    })}
                    onClick={(event) => {
                      moreMenuAnchorRef.current = event.currentTarget;
                      setMoreMenuSpaceId(group.spaceId!);
                    }}
                    {...withLiteralClass(
                      "WorkSpaceGroup__more",
                      sidebarStyles.workSpaceRowAction,
                    )}
                  >
                    <LuEllipsis size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            )}
            {expanded && children(group)}
          </section>
        );
      })}
      {moreMenuSpaceId && (
        <MenuPopover
          triggerRef={moreMenuAnchorRef}
          isOpen
          onOpenChange={(open) => {
            if (!open) setMoreMenuSpaceId(null);
          }}
          placement="bottom end"
        >
          <Menu
            aria-label={t("workspace_more_menu", "空间操作")}
            onAction={(action) => {
              const targetSpaceId = moreMenuSpaceId;
              const spaceBasePath = `/space/${encodeURIComponent(targetSpaceId ?? "")}`;
              setMoreMenuSpaceId(null);
              if (action === "chat")
                navigate(
                  `${AppRoutePaths.CHAT}?spaceId=${encodeURIComponent(targetSpaceId ?? "")}`,
                );
              else if (action === "contents")
                navigate(`${spaceBasePath}/contents`);
              else if (action === "members")
                navigate(`${spaceBasePath}/members`);
              else if (action === "settings")
                navigate(`${spaceBasePath}/settings`);
              // 没有分类的空间不渲染列表底部的「新建分类」按钮，这里保留同一入口。
              else if (action === "new-category" && targetSpaceId)
                setActiveAddCategorySpaceId(targetSpaceId);
              else if (action === "no-space") {
                const nextScope: HomeScope =
                  homeScope?.kind === "noSpace"
                    ? { kind: "all" }
                    : { kind: "noSpace" };
                onSelectHomeScope?.(nextScope);
                if (nextScope.kind === "noSpace") {
                  if (
                    location?.pathname?.startsWith("/space") ||
                    location?.search?.includes("spaceId=")
                  ) {
                    navigate(AppRoutePaths.CHAT);
                  }
                }
              }
            }}
          >
            <MenuItem
              id="chat"
              textValue={t("workspace_start_chat", "在此空间发起对话")}
            >
              <LuMessageCircle size={16} aria-hidden="true" />
              <span slot="label">
                {t("workspace_start_chat", "在此空间发起对话")}
              </span>
            </MenuItem>
            <Separator />
            <MenuItem
              id="contents"
              textValue={t("workspace_contents", "全部内容")}
            >
              <LuLayoutGrid size={16} aria-hidden="true" />
              <span slot="label">{t("workspace_contents", "全部内容")}</span>
            </MenuItem>
            <MenuItem id="members" textValue={t("members", "成员")}>
              <LuUsers size={16} aria-hidden="true" />
              <span slot="label">{t("members", "成员")}</span>
            </MenuItem>
            <MenuItem id="settings" textValue={t("space_settings", "空间设置")}>
              <LuSettings size={16} aria-hidden="true" />
              <span slot="label">{t("space_settings", "空间设置")}</span>
            </MenuItem>
            {normalizedMemberSpaceCount === 1 && (
              <MenuItem
                id="no-space"
                textValue={t("workspace_unassociated", "空间外")}
              >
                <LuFolderPlus size={16} aria-hidden="true" />
                <span slot="label" data-hook="space-workspace-no-space">
                  {t("workspace_unassociated", "空间外")}
                </span>
              </MenuItem>
            )}
            {moreMenuCanManage && <Separator />}
            {moreMenuCanManage && (
              <MenuItem
                id="new-category"
                textValue={t("create_new_category", "新建分类")}
              >
                <LuFolderPlus size={16} aria-hidden="true" />
                <span slot="label" data-hook="space-workspace-new-category">
                  {t("create_new_category", "新建分类")}
                </span>
              </MenuItem>
            )}
          </Menu>
        </MenuPopover>
      )}
      {activeAddCategorySpaceId && (
        <AddCategoryModal
          isOpen={Boolean(activeAddCategorySpaceId)}
          onClose={() => setActiveAddCategorySpaceId(null)}
          onAddCategory={async (name) => {
            const target = activeAddCategorySpaceId;
            if (!target) return;
            // Re-validate at submit time: the account/membership may have changed while the
            // modal was open. Reuse the upstream predicate instead of a second rule.
            const allowed = canManageSpaceCategories({
              spaceId: target,
              userId,
              memberSpaces,
              record: records?.get(target),
            });
            if (!allowed) {
              throw new Error("当前账号已无权在此空间添加分类。");
            }
            const res = await addCategoryInSpace({ spaceId: target, name });
            const createdCategory =
              res.updatedSpaceData?.categories?.[res.newCategoryId];
            if (createdCategory) {
              onSpaceRecordUpdate?.(target, res.newCategoryId, createdCategory);
            }
            setWorkSpacePreference(
              userId,
              "spaces",
              JSON.stringify(target),
              true,
            );
            setActiveAddCategorySpaceId(null);
          }}
        />
      )}
    </div>
  );
}

/** Per-space category folding and management with explicit spaceId and permissions. */
export function WorkDialogCategoryGroups({
  groups,
  spaceId,
  userId,
  canEdit = false,
  onCategoryRenamed,
  onCategoryDeleted,
  children,
}: {
  groups: readonly WorkCategoryGroup[];
  spaceId: string;
  userId: string;
  canEdit?: boolean;
  onCategoryRenamed?: (
    spaceId: string,
    categoryId: string,
    name: string,
  ) => void;
  onCategoryDeleted?: (spaceId: string, categoryId: string) => void;
  children: (rows: WorkCategoryGroup["rows"], categoryId?: string | null) => React.ReactNode;
}) {
  const { t } = useTranslation("space");
  const collapsed = useWorkSpacePreferences(userId, "categories");
  // 同一入口已收敛到空间标题行的更多菜单，列表底部重复入口多余。
  return (
    <div
      data-hook="work-dialog-categories"
      className="WorkSpaceGroup__categories"
    >
      {groups.map((group) => {
        const key = JSON.stringify([userId, spaceId, group.id]);
        const closed = collapsed[key] ?? false;
        const isUncategorized = !group.id || group.id === UNCATEGORIZED_ID;
        return (
          <section
            key={key}
            data-hook="work-dialog-category"
            data-category-id={group.id ?? ""}
          >
            <CategoryHeader
              categoryId={group.id ?? UNCATEGORIZED_ID}
              categoryName={
                group.label || t("workspace_uncategorized", "未分类")
              }
              itemCount={group.rows.length}
              spaceId={spaceId}
              canEdit={canEdit && !isUncategorized}
              isCollapsed={closed}
              onToggleCollapse={() =>
                setWorkSpacePreference(userId, "categories", key, !closed)
              }
              onCategoryRenamed={onCategoryRenamed}
              onCategoryDeleted={onCategoryDeleted}
            />
            {!closed && (
              <div
                {...withLiteralClass(
                  "WorkSpaceGroup__workCategoryContents",
                  sidebarStyles.workCategoryContents,
                )}
              >
                {children(group.rows, group.id)}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
