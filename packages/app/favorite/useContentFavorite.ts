import { useCallback } from "react";
import type React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "app/utils/toast"

import {
  useIsContentFavorited,
  toggleContentFavorite,
  useFavoriteDeps,
} from "app/favorite/favoriteStore";

export function useContentFavorite(contentKey: string) {
  const { t } = useTranslation("ai");
  const deps = useFavoriteDeps();

  const isFavorited = useIsContentFavorited(contentKey);

  const handleToggleFavorite = useCallback(
    async (e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (!deps) return;
      try {
        await toggleContentFavorite(deps, contentKey);
      } catch (err) {
        console.error(err);
        toast.error(
          t("toggleFavoriteError", {
            defaultValue: "操作失败，请稍后重试",
          })
        );
      }
    },
    [contentKey, deps, t]
  );

  return { isFavorited, toggleFavorite: handleToggleFavorite };
}
