// 文件路径: app/favorite/useAgentFavorite.ts

import { useCallback } from "react";
import type React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "app/utils/toast"

import {
  useIsAgentFavorited,
  toggleFavorite,
  useFavoriteDeps,
} from "app/favorite/favoriteStore";

export function useAgentFavorite(agentKey: string) {
  const { t } = useTranslation("ai");
  const deps = useFavoriteDeps();

  const isFavorited = useIsAgentFavorited(agentKey);

  const handleToggleFavorite = useCallback(
    async (e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (!deps) return;
      try {
        await toggleFavorite(deps, agentKey);
      } catch (err) {
        console.error(err);
        toast.error(
          t("toggleFavoriteError", {
            defaultValue: "操作失败，请稍后重试",
          })
        );
      }
    },
    [agentKey, deps, t]
  );

  return { isFavorited, toggleFavorite: handleToggleFavorite };
}
