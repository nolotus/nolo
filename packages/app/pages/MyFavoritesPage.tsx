import "./MyFavoritesPage.css";
import React from "react";
import { useTranslation } from "react-i18next";

import RequireSignedIn from "identity/RequireSignedIn";

import FavoritesCollection from "ai/agent/web/FavoritesCollection";

const MyFavoritesPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <RequireSignedIn>
      <div className="MyFavoritesPage">
        <div className="MyFavoritesPage__header">
          <h1>{t("homeTabs.myFavorites", "我的收藏")}</h1>
          <p>
            {t(
              "homeTabs.myFavoritesPageSubtitle",
              "把你收藏的 AI 和内容集中放在一个页面，方便继续使用。"
            )}
          </p>
        </div>

        <FavoritesCollection />
      </div>

      
    </RequireSignedIn>
  );
};

export default MyFavoritesPage;
