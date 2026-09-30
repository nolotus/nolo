import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "app/utils/toast"

import { useAppDispatch, useAppSelector } from "app/store";
import { useToken, useUserId } from "identity";
import { DataType } from "create/types";
import { share } from "database/dbSlice";
import { createWebSharePath } from "share/link";
import {
  loadTableShareState,
  type TableShareState,
} from "share/tableShareState";
import { selectCurrentServer, selectRemoteServers } from "app/settings/settingSlice";

import type { TableMeta } from "./types";
import { getTableShareErrorMessage } from "./tableShareError";

/**
 * Table 域 dispatch seam（2026-09-17 事故的类型层防线）。
 *
 * useTable 本不该再直接 import `app/store`（redux 冻结边界），但表格命令仍要
 * 真 dispatch 才能驱动 dbSlice 的 readAndWait/patch。这里在已白名单的本文件里
 * 集中提供 dispatch，useTable 通过它消费，自身不再漏 Redux import。
 *
 * 类型保持「严格」收窄：命令必须是返回 Promise 的 thunk（`command(args)` 的
 * 返回值形态 `(dispatch,getState,extra)=>Promise`），把「dispatch 模块 store 的
 * void setter」这类误用继续挡在编译期，且不依赖 @reduxjs/toolkit 的类型 import。
 */
type TableThunk<T = unknown> = (
  dispatch: TableDispatch,
  getState: () => unknown,
  extra: unknown
) => Promise<T> | T;

export interface TableDispatch {
  <R>(thunk: TableThunk<R>): Promise<R> & { unwrap(): Promise<R> };
  <A extends { type: string }>(action: A): A;
}

export function useTableDispatch(): TableDispatch {
  return useAppDispatch() as unknown as TableDispatch;
}

type UseTableShareActionsArgs = {
  tableMeta: TableMeta | null | undefined;
  tableKey: string;
  tenantId: string | undefined;
};

export function useTableShareActions({
  tableMeta,
  tableKey,
  tenantId,
}: UseTableShareActionsArgs) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const userId = useUserId();
  const currentToken = useToken();
  const currentServer = useAppSelector(selectCurrentServer);
  const remoteServers = useAppSelector(selectRemoteServers);

  const [tableShareState, setTableShareState] = useState<TableShareState | null>(
    null,
  );
  const [isShareStateLoading, setIsShareStateLoading] = useState(false);
  const [shareStateError, setShareStateError] = useState<string | null>(null);
  const [isPublishingShare, setIsPublishingShare] = useState(false);

  const shareServers = useMemo(() => {
    const seen = new Set<string>();
    const servers: string[] = [];
    for (const server of [currentServer, ...remoteServers]) {
      if (typeof server !== "string" || server.trim().length === 0) continue;
      if (seen.has(server)) continue;
      seen.add(server);
      servers.push(server);
    }
    return servers;
  }, [currentServer, remoteServers]);

  const refreshTableShareState = useCallback(async () => {
    if (!tableMeta?.dbKey || !userId || !currentToken || shareServers.length === 0) {
      setTableShareState(null);
      setShareStateError(null);
      setIsShareStateLoading(false);
      return null;
    }

    setIsShareStateLoading(true);
    setShareStateError(null);
    try {
      const nextState = await loadTableShareState({
        servers: shareServers,
        userId,
        token: currentToken,
        tableDbKey: tableMeta.dbKey,
      });
      setTableShareState(nextState);
      return nextState;
    } catch (error) {
      setTableShareState(null);
      setShareStateError(getTableShareErrorMessage(error));
      return null;
    } finally {
      setIsShareStateLoading(false);
    }
  }, [currentToken, shareServers, tableMeta?.dbKey, userId]);

  useEffect(() => {
    void refreshTableShareState();
  }, [refreshTableShareState]);

  const handleCommunityShare = useCallback(
    async (onAfterAction?: () => void) => {
      if (!tableMeta) return;

      const sharePayload = {
        ...tableMeta,
        dbKey:
          typeof tableMeta.dbKey === "string" && tableMeta.dbKey.trim().length > 0
            ? tableMeta.dbKey
            : tableKey,
        tenantId:
          typeof tableMeta.tenantId === "string" &&
          tableMeta.tenantId.trim().length > 0
            ? tableMeta.tenantId
            : tenantId,
      };

      setIsPublishingShare(true);
      try {
        await dispatch(
          share({
            type: DataType.TABLE,
            data: sharePayload,
            title: tableMeta.displayName ?? tableMeta.tableId ?? t("tableShare"),
            visibility: "community",
          }),
        ).unwrap();

        toast.success(t("tableSharePublished"));
        onAfterAction?.();
        await refreshTableShareState();
      } catch (error) {
        const detail = getTableShareErrorMessage(error);
        toast.error(
          detail
            ? `${t("tableSharePublishFailed")}: ${detail}`
            : t("tableSharePublishFailed"),
        );
      } finally {
        setIsPublishingShare(false);
      }
    },
    [dispatch, refreshTableShareState, t, tableKey, tableMeta, tenantId],
  );

  const handleOpenSharePage = useCallback(
    (onAfterAction?: () => void) => {
      const token =
        tableShareState?.communityShare?.token ??
        tableShareState?.currentShare?.token;
      if (!token || typeof window === "undefined") return;
      window.open(createWebSharePath(token), "_blank", "noopener,noreferrer");
      onAfterAction?.();
    },
    [tableShareState],
  );

  const shareStatusText = isShareStateLoading
    ? t("tableShareLoading")
    : !userId || !currentToken
      ? t("tableShareSignInRequired")
      : tableShareState?.isCommunityShared
        ? t("tableSharePublishedStatus")
        : t("tableShareNotPublished");

  const shareWarningText = shareStateError
    ? `${t("tableShareLoadFailed")}: ${shareStateError}`
    : tableShareState?.communityShare?.lastReplicationError
      ? `${t("tableShareReplicationIssue")}: ${
          tableShareState.communityShare.lastReplicationError
        }`
      : tableShareState?.communityShare?.replicationDirtyAt
        ? t("tableShareReplicationLag")
        : null;

  const canPublishCommunityShare =
    !isPublishingShare &&
    !!userId &&
    !!currentToken &&
    !!tableMeta?.dbKey;

  return {
    tableShareState,
    isPublishingShare,
    shareStatusText,
    shareWarningText,
    canPublishCommunityShare,
    handleCommunityShare,
    handleOpenSharePage,
    refreshTableShareState,
  };
}