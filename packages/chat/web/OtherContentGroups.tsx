import React, { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "app/routing";
import type { MyContentListItem } from "app/utils/myContentItems";
import { isRoutableContentActive } from "create/space/contentKeyUtils";
import { useCurrentSpaceId } from "create/space/spaceCurrentStore";
import SidebarItemRow from "create/space/SidebarItemRow";
import { SidebarItemMoreMenu } from "create/space/SidebarItemMoreMenu";
import { MenuPopover } from "render/web/ui/MenuPopover";

/**
 * Work 视图里的「其他内容」：对话之外的内容按类型分组。
 *
 * 原「分类」主页视图（Navigation V2 之前的类型筛选 + 全部内容列表）并入 Work
 * 之后，Home 只剩「工作 / 项目」两视图；对话由「工作」的三个状态分组表达，
 * 这里只列出非对话内容，避免同一批对话在两个地方出现两次。
 */

/** 图片 / 文档 / 视频 / 音频 / 文件统一归入「附件」。 */
const ATTACHMENT_TYPES = ["image", "document", "video", "audio", "file"] as const;

/**
 * 分组顺序与侧栏类型筛选条一致（去掉「对话」）。
 *
 * label 是兜底文案（与 SidebarTypeFilter 的 fallback 相同）；labelKey 复用该筛选条
 * 已有的 i18n key，i18n 未初始化时 `t(key, label)` 仍返回中文。
 */
const CONTENT_GROUPS: ReadonlyArray<{
  key: string;
  label: string;
  labelKey: string;
  types: readonly string[];
}> = [
  { key: "agent", label: "AI", labelKey: "sidebarTypes.agent", types: ["agent"] },
  { key: "page", label: "页面", labelKey: "sidebarTypes.page", types: ["page"] },
  { key: "table", label: "表格", labelKey: "sidebarTypes.table", types: ["table"] },
  {
    key: "attachment",
    label: "附件",
    labelKey: "attachments_toggle",
    types: ATTACHMENT_TYPES,
  },
  { key: "app", label: "应用", labelKey: "sidebarTypes.app", types: ["app"] },
];

type ContentGroup = {
  key: string;
  label: string;
  /** 已知类型的翻译 key；未知类型组没有它，直接显示原始类型名。 */
  labelKey?: string;
  rows: MyContentListItem[];
};

const typeOf = (item: MyContentListItem): string =>
  ((item as { type?: unknown }).type as string | undefined)?.toLowerCase() ?? "";

function groupByType(items: readonly MyContentListItem[]): ContentGroup[] {
  const groups = new Map<string, ContentGroup>();
  for (const spec of CONTENT_GROUPS) {
    groups.set(spec.key, {
      key: spec.key,
      label: spec.label,
      labelKey: spec.labelKey,
      rows: [],
    });
  }
  for (const item of items) {
    const type = typeOf(item);
    // 对话已在「工作」的三个状态分组里，这里不重复。
    if (type === "dialog") continue;
    const spec = CONTENT_GROUPS.find((group) => group.types.includes(type));
    const key = spec ? spec.key : `type:${type}`;
    let group = groups.get(key);
    if (!group) {
      // 未知类型不丢内容：按原始类型名单独成组，排在已知分组之后。
      group = { key, label: type || "其他", rows: [] };
      groups.set(key, group);
    }
    group.rows.push(item);
  }
  // 空组不渲染。
  return [...groups.values()].filter((group) => group.rows.length > 0);
}

export function OtherContentGroups({
  items, userId,
}: { items: readonly MyContentListItem[]; userId: string }) {
  const { t } = useTranslation();
  if (!userId) return null;
  if (!items.some((item) => typeOf(item) !== "dialog")) return null;
  return (
    <section
      aria-label={t("allView.otherContent", "其他内容")}
      data-hook="other-content-groups"
    >
      <OtherContentGroupsList items={items} userId={userId} />
    </section>
  );
}

function OtherContentGroupsList({
  items, userId,
}: { items: readonly MyContentListItem[]; userId: string }) {
  const location = useLocation();
  const currentSpaceId = useCurrentSpaceId();
  const { t } = useTranslation();
  const groups = useMemo(() => groupByType(items), [items]);
  const itemsByKey = useMemo(
    () => new Map(items.map((item) => [item.contentKey, item])),
    [items],
  );

  // 「更多」菜单挂在 row 之外（RAC Menu 不能嵌在 ListBox 里），与
  // WorkDialogGroupsPreview / CategorySection 同一套约定：row 上报锚点，
  // 这里渲染 MenuPopover。
  const [activeMenuKey, setActiveMenuKey] = useState<string | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const menuAnchorKeyRef = useRef<string | null>(null);
  const [editRequest, setEditRequest] = useState<{ key: string; nonce: number } | null>(null);

  const handleMenuAnchorChange = useCallback((key: string, el: HTMLElement | null) => {
    if (el) {
      menuAnchorKeyRef.current = key;
      setMenuAnchorEl(el);
      return;
    }
    if (menuAnchorKeyRef.current === key) {
      menuAnchorKeyRef.current = null;
      setMenuAnchorEl(null);
    }
  }, []);

  const closeMenu = useCallback(() => {
    setActiveMenuKey(null);
    menuAnchorKeyRef.current = null;
    setMenuAnchorEl(null);
  }, []);

  const activeItem = activeMenuKey ? itemsByKey.get(activeMenuKey) : undefined;

  return (
    <div data-hook="other-content-groups-list">
      {groups.map((group) => {
        const groupLabel = group.labelKey ? t(group.labelKey, group.label) : group.label;
        return (
          <div key={group.key}>
            <h3>{`${groupLabel} (${group.rows.length})`}</h3>
          {group.rows.map((item) => {
            const type = typeOf(item);
            const isActive = isRoutableContentActive({
              contentKey: item.contentKey,
              type,
              userId,
              spaceId: currentSpaceId,
              currentPath: location.pathname,
            });
            return (
              <div key={item.contentKey}>
                <SidebarItemRow
                  contentKey={item.contentKey}
                  type={type}
                  title={item.title || item.contentKey}
                  isActive={isActive}
                  isMenuOpen={activeMenuKey === item.contentKey}
                  onToggleMenu={setActiveMenuKey}
                  onMenuAnchorChange={handleMenuAnchorChange}
                  editSignal={
                    editRequest?.key === item.contentKey ? editRequest.nonce : undefined
                  }
                  pinned={Boolean(item.pinned)}
                />
              </div>
            );
          })}
          </div>
        );
      })}
      {activeMenuKey && menuAnchorEl && activeItem && (
        <MenuPopover
          triggerRef={{ current: menuAnchorEl }}
          isOpen
          onOpenChange={(open) => {
            if (!open) closeMenu();
          }}
          placement="bottom end"
        >
          <SidebarItemMoreMenu
            contentKey={activeItem.contentKey}
            title={activeItem.title || activeItem.contentKey}
            type={typeOf(activeItem)}
            spaceId={currentSpaceId}
            fileCategory={(activeItem as { fileCategory?: string | null }).fileCategory ?? null}
            canEditInSpace={Boolean(currentSpaceId)}
            canMoveToSpace
            showDownloadAction={false}
            menuAnchorEl={menuAnchorEl}
            sourceServerOrigin={activeItem.serverOrigin}
            onEditTitle={() => {
              setEditRequest({ key: activeItem.contentKey, nonce: Date.now() });
              closeMenu();
            }}
            onClose={closeMenu}
          />
        </MenuPopover>
      )}
    </div>
  );
}
