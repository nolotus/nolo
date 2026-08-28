// 文件路径: ai/agent/web/PublicAgentsList.tsx

import type { Agent } from "app/types";
import "./PublicAgentsList.css";
import { memo, useEffect, useMemo } from "react";
import { useStore } from "react-redux";
import { useTranslation } from "react-i18next";
import { LuRefreshCw, LuLayoutGrid } from "react-icons/lu";
import {
  GridList,
  GridListItem,
  GridListLoadMoreItem,
} from "react-aria-components";
import { useAppDispatch, type RootState } from "app/store";
import AgentBlock from "ai/agent/web/AgentBlock";
import AgentGrid from "ai/agent/web/AgentGrid";
import EmptyState from "ai/agent/web/EmptyState";
import { useAgentCardNavigation } from "./useAgentCardNavigation";
import { isInteractiveAgentCardTarget } from "./agentCardUtils";
import {
  seedAgentPreviewsInStore,
} from "./seedAgentPreview";

const SKELETON_COUNT = 6;

interface PublicAgentsListProps {
  loading: boolean;
  error?: Error | null;
  data?: Agent[];
  reload: () => void | Promise<void>;
  keepGridHeight?: boolean;
}

const PublicAgentsSkeleton = memo(() => {
  const items = useMemo(() => Array.from({ length: SKELETON_COUNT }), []);

  return (
    <AgentGrid>
      {items.map((_, index) => (
        <div key={index} className="public-agents__skeleton-card">
          <div className="public-agents__skeleton-header">
            <div className="public-agents__skeleton-avatar public-agents__shimmer" />
            <div className="public-agents__skeleton-header-text">
              <div className="public-agents__skeleton-line public-agents__skeleton-line--title public-agents__shimmer" />
              <div className="public-agents__skeleton-line public-agents__skeleton-line--subtitle public-agents__shimmer" />
            </div>
          </div>
          <div className="public-agents__skeleton-body">
            <div className="public-agents__skeleton-line public-agents__shimmer" />
            <div className="public-agents__skeleton-line public-agents__shimmer" />
            <div className="public-agents__skeleton-line public-agents__skeleton-line--short public-agents__shimmer" />
          </div>
          <div className="public-agents__skeleton-footer">
            <div className="public-agents__skeleton-pill public-agents__shimmer" />
            <div className="public-agents__skeleton-pill public-agents__skeleton-pill--small public-agents__shimmer" />
          </div>
        </div>
      ))}
    </AgentGrid>
  );
});
PublicAgentsSkeleton.displayName = "PublicAgentsSkeleton";

const PublicAgentsList = memo(
  ({
    loading,
    error = null,
    data,
    reload,
    keepGridHeight = false,
  }: PublicAgentsListProps) => {
    const { t } = useTranslation(["ai"]);
    const dispatch = useAppDispatch();
    const store = useStore<RootState>();
    const hasData = !!data && data.length > 0;
    const { openAgent, prefetchAgent } = useAgentCardNavigation();

    // Soft-seed list cards into Redux (skip records that already look full).
    useEffect(() => {
      if (!data?.length) return;
      seedAgentPreviewsInStore(dispatch, store.getState, data);
    }, [data, dispatch, store]);

    return (
      <div
        className="public-agents__list-wrapper"
        style={keepGridHeight && hasData ? { minHeight: "350px" } : undefined}
      >
        {/* First load only: skeleton. Refresh with data keeps the grid. */}
        {loading && !hasData && !error && <PublicAgentsSkeleton />}

        {hasData && (
          <GridList
            className="agents-grid public-agents__grid"
            aria-label={t("aiPlaza", "AI 广场")}
            layout="grid"
            selectionMode="none"
          >
            {data.map((item) => {
              const agentPath = `/${item.dbKey || item.id}`;
              return (
                <GridListItem
                  key={item.id}
                  id={item.id}
                  textValue={item.name || ""}
                  onAction={() => openAgent(item)}
                  onHoverStart={() => prefetchAgent(item)}
                  onKeyDown={(e: any) => {
                    // Cmd/Ctrl+Enter → new tab (keyboard parity with links)
                    if (
                      e.key === "Enter" &&
                      (e.metaKey || e.ctrlKey) &&
                      !isInteractiveAgentCardTarget(e.target)
                    ) {
                      e.preventDefault();
                      openAgent(item, { newTab: true });
                    }
                  }}
                  {...{
                    onAuxClick: (e: any) => {
                      if (e.button !== 1) return;
                      if (isInteractiveAgentCardTarget(e.target)) return;
                      e.preventDefault();
                      openAgent(item, { newTab: true });
                    },
                  } as any}
                >
                  <div
                    onPointerEnter={() => prefetchAgent(item)}
                    data-agent-path={agentPath}
                    onClickCapture={(e) => {
                      // Cmd/Ctrl+click → new tab (GridListItem omits native href)
                      if (!(e.metaKey || e.ctrlKey)) return;
                      if (isInteractiveAgentCardTarget(e.target)) return;
                      e.preventDefault();
                      e.stopPropagation();
                      openAgent(item, { newTab: true });
                    }}
                    onKeyDownCapture={(e) => {
                      if (!(e.metaKey || e.ctrlKey)) return;
                      if (e.key !== "Enter") return;
                      if (isInteractiveAgentCardTarget(e.target)) return;
                      e.preventDefault();
                      e.stopPropagation();
                      openAgent(item, { newTab: true });
                    }}
                  >
                    <AgentBlock item={item} reload={reload} />
                  </div>
                </GridListItem>
              );
            })}
            {loading && (
              <GridListLoadMoreItem>
                <div className="public-agents__loading-more">
                  <LuRefreshCw className="public-agents__icon--spin" size={16} aria-hidden="true" />
                  <span>加载中...</span>
                </div>
              </GridListLoadMoreItem>
            )}
          </GridList>
        )}

        {!loading && !hasData && error && (
          <EmptyState
            icon={<LuLayoutGrid size={32} />}
            title={t("aiPlazaLoadError", "加载失败")}
            subtitle={
              error.message ||
              t("aiPlazaLoadErrorHint", "请检查网络后重试")
            }
            action={
              <button
                type="button"
                className="public-agents__retry-btn"
                onClick={() => void reload()}
              >
                {t("retry", "重试")}
              </button>
            }
          />
        )}

        {!loading && !hasData && !error && (
          <EmptyState
            icon={<LuLayoutGrid size={32} />}
            title="暂无可展示的智能体"
            subtitle="创作者还没有发布智能体，敬请期待"
          />
        )}
      </div>
    );
  }
);

PublicAgentsList.displayName = "PublicAgentsList";

export default PublicAgentsList;
