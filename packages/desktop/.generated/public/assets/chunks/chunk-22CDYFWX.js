import {
  useAppDispatch
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  toast,
  toggleContentFavorite,
  useIsContentFavorited
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/favorite/useContentFavorite.ts
var import_react = __toESM(require_react());
function useContentFavorite(contentKey) {
  const { t } = useTranslation("ai");
  const dispatch = useAppDispatch();
  const isFavorited = useIsContentFavorited(contentKey);
  const handleToggleFavorite = (0, import_react.useCallback)(
    async (e) => {
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
            defaultValue: "\u64CD\u4F5C\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5"
          })
        );
      }
    },
    [contentKey, dispatch, t]
  );
  return { isFavorited, toggleFavorite: handleToggleFavorite };
}

export {
  useContentFavorite
};
