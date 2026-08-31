import * as stylex from "@stylexjs/stylex";
import { sidebarItemStyles as styles } from "./sidebarItemStyles";
import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Autocomplete,
  Input,
  SearchField,
  useFilter,
} from "react-aria-components";
import { LuFolderSymlink, LuLoaderCircle } from "react-icons/lu";
import { useAppDispatch, useAppSelector } from "app/store";
import { toast } from "app/utils/toast";
import { useNavigate } from "app/routing";
import { toErrorMessage } from "core/errorMessage";
import {
  addContentToSpace,
  changeSpace,
  moveContentToSpace,
  selectCurrentSpaceId,
} from "create/space/spaceSlice";
import { useAllMemberSpaces } from "create/space/spaceMembershipStore";
import { Menu, MenuItem, SubmenuTrigger } from "render/web/ui/Menu";
import { useCurrentSpaceId } from "create/space/spaceCurrentStore";

type SidebarMoveToSubmenuProps = {
  contentKey: string;
  title: string;
  contentType: string;
  sourceSpaceIdOverride?: string | null;
  menuAnchorEl?: HTMLElement | null;
  onMove?: () => void;
};

const getSpaceLabel = (
  space: { spaceId: string; spaceName?: string },
  unnamed: string
) => space.spaceName || space.spaceId || unnamed;

const SidebarMoveToSubmenu: React.FC<SidebarMoveToSubmenuProps> = ({
  contentKey,
  title,
  contentType,
  sourceSpaceIdOverride,
  menuAnchorEl,
  onMove,
}) => {
  const { t } = useTranslation("space");
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const memberSpaces = useAllMemberSpaces();
  const currentSpaceId = useCurrentSpaceId();
  const sourceSpaceId =
    sourceSpaceIdOverride === undefined ? currentSpaceId : sourceSpaceIdOverride;
  const [movingSpaceId, setMovingSpaceId] = useState<string | null>(null);
  const { contains } = useFilter({ sensitivity: "base" });

  const availableSpaces = useMemo(() => {
    const unnamed = t("unnamedSpace");
    return (memberSpaces ?? [])
      .reduce<Array<{ id: string; label: string }>>((acc, space) => {
        if (space.spaceId === sourceSpaceId) return acc;
        acc.push({
          id: space.spaceId,
          label: getSpaceLabel(
            space as { spaceId: string; spaceName?: string },
            unnamed
          ),
        });
        return acc;
      }, [])
      .sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
      );
  }, [memberSpaces, sourceSpaceId, t]);

  const handleSpaceSelect = useCallback(
    async (targetSpaceId: string) => {
      if (!targetSpaceId || sourceSpaceId === targetSpaceId || movingSpaceId) {
        return;
      }

      setMovingSpaceId(targetSpaceId);
      try {
        if (sourceSpaceId) {
          await dispatch(
            (moveContentToSpace as any)({
              contentKey,
              sourceSpaceId,
              targetSpaceId,
              targetCategoryId: undefined,
            })
          ).unwrap();
        } else {
          await dispatch(
            (addContentToSpace as any)({
              spaceId: targetSpaceId,
              title,
              type: contentType,
              contentKey,
            })
          ).unwrap();
        }
        const rect = menuAnchorEl?.getBoundingClientRect();
        const targetLabel =
          availableSpaces.find((s) => s.id === targetSpaceId)?.label ?? targetSpaceId;
        // Clamp to viewport so the bubble (and its action button) stays on-screen
        // when the trigger sits at the bottom/right edge.
        const position = rect
          ? {
              x: Math.max(16, Math.min(rect.left, window.innerWidth - 256)),
              y: Math.max(16, Math.min(rect.bottom + 6, window.innerHeight - 90)),
            }
          : undefined;
        toast.success(t("contentMoved"), {
          description: t("movedToDesc", { space: targetLabel }),
          position,
          action: {
            label: t("switchToSpaceAction"),
            onClick: async () => {
              try {
                await dispatch((changeSpace as any)(targetSpaceId)).unwrap();
                navigate(`/space/${targetSpaceId}`);
              } catch {
                toast.error(t("switchSpaceFailed"));
              }
            },
          },
          timeout: 6000,
        });
        onMove?.();
      } catch (error) {
        const message = toErrorMessage(error) || t("unknownError");
        toast.error(t("moveFailed", { message }));
      } finally {
        setMovingSpaceId(null);
      }
    },
    [
      contentKey,
      contentType,
      dispatch,
      menuAnchorEl,
      movingSpaceId,
      navigate,
      onMove,
      sourceSpaceId,
      t,
      title,
      availableSpaces,
    ]
  );

  return (
    <SubmenuTrigger>
      <MenuItem textValue={t("moveToSpace")}>
        <LuFolderSymlink size={16} aria-hidden="true" />
        <span slot="label">{t("moveToSpace")}</span>
      </MenuItem>
      {availableSpaces.length === 0 ? (
        <Menu aria-label={t("moveToSpace")}>
          <MenuItem isDisabled textValue={t("noOtherSpaces")}>
            {t("noOtherSpaces")}
          </MenuItem>
        </Menu>
      ) : (
        <div {...stylex.props(styles.moveBody)}>
          <Autocomplete filter={contains}>
            <SearchField
              {...stylex.props(styles.moveSearch)}
              aria-label={t("search")}
              autoFocus
            >
              <Input
                {...stylex.props(styles.moveInput)}
                placeholder={t("search")}
              />
            </SearchField>
            <Menu
              {...stylex.props(styles.moveList)}
              aria-label={t("moveToSpace")}
              items={availableSpaces}
              onAction={(key) => handleSpaceSelect(String(key))}
              autoFocus={false}
            >
              {(space) => (
                <MenuItem
                  id={space.id}
                  textValue={space.label}
                  isDisabled={!!movingSpaceId}
                >
                  {movingSpaceId === space.id ? (
                    <LuLoaderCircle
                      size={14}
                      {...stylex.props(styles.spinner)}
                      aria-hidden="true"
                    />
                  ) : null}
                  <span slot="label" {...stylex.props(styles.moveLabel)}>
                    {space.label}
                  </span>
                </MenuItem>
              )}
            </Menu>
          </Autocomplete>
        </div>
      )}
    </SubmenuTrigger>
  );
};

export default SidebarMoveToSubmenu;
