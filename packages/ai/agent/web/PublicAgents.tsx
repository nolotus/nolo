import { memo, useState, useEffect } from "react";
import { LuArrowUp, LuArrowDown, LuSparkles, LuStar, LuImage } from "react-icons/lu";
import {
  usePublicAgents,
  UsePublicAgentsOptions,
} from "ai/agent/hooks/usePublicAgents";
import type { Agent } from "app/types";
import { toast } from "app/utils/toast"
import SearchInput from "render/web/ui/SearchInput";
import { useSearchParams } from "app/routing";
import PublicAgentsList from "./PublicAgentsList";
import { useTranslation } from "react-i18next";
import "./PublicAgents.css";

interface PublicAgentsProps {
  limit?: number;
  initialData?: Agent[];
  reloadMode?: "preview" | "catalog";
  summary?: boolean;
}

const DEBOUNCE_DELAY = 300; // 搜索防抖时间（ms）

const PublicAgents = memo(
  ({
    limit = 20,
    initialData,
    reloadMode = "catalog",
    summary = false,
  }: PublicAgentsProps) => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // 1) sortBy 完全从 URL 读
  const sortBy =
    (searchParams.get("sort") as UsePublicAgentsOptions["sortBy"]) || "recommended";
  const visualOutputOnly = searchParams.get("visualOutput") === "1";

  // 2) search 从 URL 初始化
  const urlSearch = searchParams.get("q") || "";

  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(urlSearch);

  /**
   * 当浏览器前进/后退或外部修改 URL 时，同步输入框内容
   */
  useEffect(() => {
    if (urlSearch !== searchTerm) {
      setSearchTerm(urlSearch);
      setDebouncedSearchTerm(urlSearch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSearch]);

  /**
   * 搜索关键字防抖 + 同步到 URL (?q=xxx)
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);

      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (searchTerm) next.set("q", searchTerm);
        else next.delete("q");
        return next;
      });
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timer);
  }, [searchTerm, setSearchParams]);

  const { loading, error, data, retry } = usePublicAgents({
    limit,
    sortBy,
    searchName: debouncedSearchTerm,
    imageOutputOnly: visualOutputOnly,
    summary,
    initialData,
    reloadMode,
  });

  /**
   * 切换为「推荐」 -> 等价于移除 sort 参数
   */
  const handleRecommendedSortClick = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("sort"); // 默认 recommended
      return next;
    });
  };

  /**
   * 切换为「最新发布」
   */
  const handleNewestSortClick = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("sort", "newest");
      return next;
    });
  };

  /**
   * 切换价格排序：升序 <-> 降序，并写入 URL (?sort=outputPriceAsc/Desc)
   */
  const handlePriceSortClick = () => {
    const nextSort =
      sortBy === "outputPriceAsc" ? "outputPriceDesc" : "outputPriceAsc";

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("sort", nextSort);
      return next;
    });
  };

  /**
   * 切换「按收藏排序」
   */
  const handleFavoriteSortClick = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (sortBy === "favorite") {
        next.delete("sort");
      } else {
        next.set("sort", "favorite");
      }
      return next;
    });
  };

  const handleVisualOutputFilterClick = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (visualOutputOnly) {
        next.delete("visualOutput");
      } else {
        next.set("visualOutput", "1");
      }
      return next;
    });
  };

  const handleSearchClear = () => {
    setSearchTerm("");
    setDebouncedSearchTerm("");

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("q");
      return next;
    });
  };

  const handleSearchSubmit = () => {
    setDebouncedSearchTerm(searchTerm);

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (searchTerm) next.set("q", searchTerm);
      else next.delete("q");
      return next;
    });
  };

  if (error && (!data || data.length === 0)) {
    // 远程失败且无已渲染数据：显示错误态 + 重试（替代静默白屏/静默 fallback 旧缓存）
    return (
      <div className="public-agents__error" role="alert">
        <p>{t("publicAgents.loadFailed", "加载列表失败，请检查网络后重试")}</p>
        <button type="button" className="public-agents__retry" onClick={() => void retry()}>
          {t("publicAgents.retry", "重试")}
        </button>
      </div>
    );
  }
  // error 但已有数据：保留列表展示（避免错误态隐藏已渲染内容），下方列表照常渲染

  return (
    <div className="public-agents">
      {/* 顶部控制栏 */}
      <div className="public-agents__controls">
        <div className="public-agents__left">
          {/* 搜索框区域 */}
          <div className="public-agents__search">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              onSearch={handleSearchSubmit}
              onClear={handleSearchClear}
              placeholder={t("publicAgents.searchPlaceholder", "搜索 AI 助手...")}
              className="public-agents__search-input"
            />
          </div>

          <button
            type="button"
            className={
              "public-agents__filter-chip" +
              (visualOutputOnly ? " public-agents__filter-chip--active" : "")
            }
            onClick={handleVisualOutputFilterClick}
            aria-pressed={visualOutputOnly}
          >
            <LuImage size={14} aria-hidden="true" />
            <span>{t("publicAgents.filterImageGeneration", "可生成图片")}</span>
          </button>

        </div>

        {/* 排序区域 */}
        <div className="public-agents__sort">
          <span className="public-agents__sort-label">
            {t("publicAgents.sortLabel", "排序:")}
          </span>



          <button
            type="button"
            className={
              "public-agents__sort-pill" +
              (sortBy === "recommended" ? " public-agents__sort-pill--active" : "")
            }
            onClick={handleRecommendedSortClick}
            aria-pressed={sortBy === "recommended"}
          >
            <span>{t("publicAgents.sortRecommended", "推荐")}</span>
            <span className="public-agents__sort-icon" aria-hidden="true">
              <LuSparkles size={14} />
            </span>
          </button>

          {/* 最新 */}
          <button
            type="button"
            className={
              "public-agents__sort-pill" +
              (sortBy === "newest" ? " public-agents__sort-pill--active" : "")
            }
            onClick={handleNewestSortClick}
            aria-pressed={sortBy === "newest"}
          >
            {t("publicAgents.sortNewest", "最新发布")}
          </button>

          {/* 价格 */}
          <button
            type="button"
            className={
              "public-agents__sort-pill" +
              (sortBy?.includes("Price")
                ? " public-agents__sort-pill--active"
                : "")
            }
            onClick={handlePriceSortClick}
            aria-pressed={Boolean(sortBy?.includes("Price"))}
          >
            <span>{t("publicAgents.sortPrice", "价格")}</span>
            <span className="public-agents__sort-icon" aria-hidden="true">
              {sortBy === "outputPriceAsc" && <LuArrowUp size={14} />}
              {sortBy === "outputPriceDesc" && <LuArrowDown size={14} />}
              {!sortBy?.includes("Price") && (
                <LuArrowUp size={14} style={{ opacity: 0.3 }} />
              )}
            </span>
          </button>

          {/* 收藏 */}
          <button
            type="button"
            className={
              "public-agents__sort-pill" +
              (sortBy === "favorite" ? " public-agents__sort-pill--active" : "")
            }
            onClick={handleFavoriteSortClick}
            aria-pressed={sortBy === "favorite"}
          >
            <span>{t("publicAgents.sortFavorite", "收藏")}</span>
            <span className="public-agents__sort-icon" aria-hidden="true">
              <LuStar size={14} style={{ fill: sortBy === "favorite" ? "currentColor" : "none" }} />
            </span>
          </button>
        </div>
      </div>

      {/* 列表区域 */}
      <PublicAgentsList
        loading={loading}
        error={error}
        data={data}
        reload={retry}
      />

    </div>
  );
});
PublicAgents.displayName = "PublicAgents";

export default PublicAgents;
