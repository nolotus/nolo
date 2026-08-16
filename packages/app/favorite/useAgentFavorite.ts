// 文件路径: app/favorite/useAgentFavorite.ts

import { useCallback } from "react";
import type React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "app/utils/toast"

import { useAppDispatch } from "app/store";
import {
  useIsAgentFavorited,
  toggleFavorite,
} from "app/favorite/favoriteStore";

export function useAgentFavorite(agentKey: string) {
  const { t } = useTranslation("ai");
  const dispatch = useAppDispatch();

  const isFavorited = useIsAgentFavorited(agentKey);

  const handleToggleFavorite = useCallback(
    async (e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      try {
        await dispatch(toggleFavorite(agentKey)).unwrap();
      } catch (err) {
        console.error(err);
        toast.error(
          t("toggleFavoriteError", {
            defaultValue: "操作失败，请稍后重试",
          })
        );
      }
    },
    [agentKey, dispatch, t]
  );

  return { isFavorited, toggleFavorite: handleToggleFavorite };
}
