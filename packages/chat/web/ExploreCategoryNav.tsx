import React from "react";
import { NavLink, useLocation } from "app/routing";
import { useTranslation } from "react-i18next";
import {
  EXPLORE_CATEGORIES,
  exploreCategoryPath,
  resolveExploreCategory,
  type ExploreCategory,
} from "app/navigation/exploreCategory";

const FALLBACK: Record<ExploreCategory, string> = {
  agent: "Agent",
  dialog: "对话",
  article: "文章",
  user: "用户",
  plugin: "插件",
  skill: "Skill",
  "my-shares": "我的分享",
};

/**
 * Where the category switcher is rendered.
 * - `column`（默认）：Navigation V2 Context 列里的纵向列表；
 * - `bar`：内容区顶部的横向滚动条，窄视口下替代被折叠的 Context 列。
 * 两者是同一份分类真值，只有排布方式不同（见 AgentExplore.css）。
 */
export type ExploreCategoryNavVariant = "column" | "bar";

/** Explore category switcher rendered in the Navigation V2 Context column. */
export function ExploreCategoryNav({
  variant = "column",
}: {
  variant?: ExploreCategoryNavVariant;
} = {}) {
  const { t } = useTranslation("space");
  const location = useLocation();
  const current = resolveExploreCategory(location.search);

  return (
    <nav
      aria-label={t("explorePage.categories", "探索分类")}
      className={
        variant === "bar"
          ? "navigation-v2-explore-categories navigation-v2-explore-categories--bar"
          : "navigation-v2-explore-categories"
      }
    >
      {EXPLORE_CATEGORIES.map((category) => (
        <NavLink
          key={category}
          to={exploreCategoryPath(category)}
          aria-current={current === category ? "page" : undefined}
          data-active={current === category ? "true" : undefined}
          className="navigation-v2-explore-category"
        >
          {t(`explorePage.category.${category}`, FALLBACK[category])}
        </NavLink>
      ))}
    </nav>
  );
}

export default ExploreCategoryNav;
