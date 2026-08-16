import { useCallback } from "react";
import type React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "app/utils/toast"

import { useAppDispatch } from "app/store";
import {
  useIsContentFavorited,
  toggleContentFavorite,
} from "app/favorite/favoriteStore";

export function useContentFavorite(contentKey: string) {
  const { t } = useTranslation("ai");
  const dispatch = useAppDispatch();

  const isFavorited = useIsContentFavorited(contentKey);

  const handleToggleFavorite = useCallback(
    async (e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      try {
        await dispatch(toggleContentFavorite(contentKey)).unwrap();
      } catch (err) {
        console.error(err);
        toast.error(
          t("toggleFavoriteError", {
            defaultValue: "操作失败，请稍后重试",
          })
        );
      }
    },
    [contentKey, dispatch, t]
  );

  return { isFavorited, toggleFavorite: handleToggleFavorite };
}
