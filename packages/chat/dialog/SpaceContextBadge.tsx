import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { LuFolder, LuFolderOpen } from "react-icons/lu";
import * as stylex from "@stylexjs/stylex";
import { useUserId } from "identity";
import { useAllMemberSpaces } from "create/space/spaceMembershipStore";
import {
  readSpaceWorkspaceFolder,
  subscribeSpaceWorkspaces,
} from "chat/web/spaceWorkspaces";
import { projectSpaceContextView } from "./spaceContextBadgeView";
import { spaceContextBadgeStyles } from "./spaceContextBadgeStyles";

export interface SpaceContextBadgeProps {
  /**
   * Explicit Space scope for this surface: the route `spaceId` for a new
   * dialog, or the dialog record's own `spaceId` for an existing one. Never
   * the residual global current Space — an absent value renders nothing.
   */
  spaceId?: string | null;
  /** The dialog's actual execution cwd, when known. */
  cwd?: string | null;
  /**
   * True when `cwd` is an explicit per-dialog override (a bound Project), not
   * the Space binding. Only then is it projected as a separate segment.
   */
  cwdIsOverride?: boolean;
}

/**
 * Dialog-level Space context badge.
 *
 * Shows which Space the surface belongs to, plus the Space's device-local
 * bound folder (basename + folder icon, title = full path). The Space name is
 * resolved from the membership store for the *explicit* `spaceId` only, so a
 * name is never invented and a stale global current Space can never be painted
 * next to a different Space's id. While the name for the given id is unknown
 * (loading / not a member) the badge renders nothing.
 *
 * Identity invariant: the folder segment is the Space's binding, not the
 * execution cwd. When the dialog has an explicit cwd override that differs, it
 * is rendered as a separate, visually distinct segment instead of being
 * silently conflated with the Space folder.
 */
export const SpaceContextBadge: React.FC<SpaceContextBadgeProps> = ({
  spaceId,
  cwd = null,
  cwdIsOverride = false,
}) => {
  const { t } = useTranslation("chat");
  const memberSpaces = useAllMemberSpaces();
  const userId = useUserId();
  // Device-local bindings can change while the page is open; re-read on change.
  const [workspaceRevision, refreshWorkspace] = useState(0);
  useEffect(
    () => subscribeSpaceWorkspaces(() => refreshWorkspace((r) => r + 1)),
    [],
  );

  const spaceName = useMemo(() => {
    if (!spaceId) return null;
    const found = memberSpaces.find((space) => space.spaceId === spaceId);
    const name = found?.spaceName?.trim();
    return name || null;
  }, [memberSpaces, spaceId]);

  const spaceFolder = useMemo(() => {
    if (!spaceId || typeof window === "undefined") return null;
    try {
      return readSpaceWorkspaceFolder(window.localStorage, spaceId, userId);
    } catch {
      return null;
    }
  }, [spaceId, userId, workspaceRevision]);

  const view = useMemo(
    () => projectSpaceContextView(spaceName, spaceFolder, cwd, cwdIsOverride),
    [spaceName, spaceFolder, cwd, cwdIsOverride],
  );

  if (!view.spaceName) return null;

  return (
    <div
      data-hook="space-context-badge"
      role="status"
      aria-label={t("spaceContext.badge", "空间上下文")}
      {...stylex.props(spaceContextBadgeStyles.badge)}
    >
      <span
        {...stylex.props(spaceContextBadgeStyles.spaceName)}
        title={view.spaceName}
      >
        {view.spaceName}
      </span>
      {view.spaceFolder && (
        <span
          data-hook="space-context-folder"
          {...stylex.props(spaceContextBadgeStyles.segment)}
          title={t("spaceContext.spaceFolderTitle", "空间文件夹：{{path}}", {
            path: view.spaceFolder.path,
          })}
        >
          <LuFolder size={12} aria-hidden="true" />
          <span {...stylex.props(spaceContextBadgeStyles.segmentText)}>
            {view.spaceFolder.name}
          </span>
        </span>
      )}
      {view.cwdFolder && (
        <span
          data-hook="space-context-cwd"
          {...stylex.props(
            spaceContextBadgeStyles.segment,
            spaceContextBadgeStyles.cwdSegment,
          )}
          title={t("spaceContext.cwdTitle", "实际工作目录：{{path}}", {
            path: view.cwdFolder.path,
          })}
        >
          <LuFolderOpen size={12} aria-hidden="true" />
          <span {...stylex.props(spaceContextBadgeStyles.segmentText)}>
            {view.cwdFolder.name}
          </span>
        </span>
      )}
    </div>
  );
};

export default SpaceContextBadge;
