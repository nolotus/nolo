import "./SpaceHomeFeaturedAgent.css";
import React, { useMemo } from "react";
import { useNavigate } from "app/routing";
import { useTranslation } from "react-i18next";
import { LuBot, LuArrowRight, LuSparkles, LuPlus } from "react-icons/lu";
import { Agent, SpaceContent, ContentType } from "app/types";
import AgentCard from "ai/agent/web/AgentCard";

const FEATURED_AGENT_LIMIT = 3;

interface SpaceHomeFeaturedAgentProps {
  spaceId: string;
  contents: Record<string, SpaceContent | null> | null | undefined;
  agentsMap: Map<string, Agent>;
}

const isAgentItem = (item: SpaceContent) => {
  const type = item.type?.toLowerCase();
  const key = item.contentKey;
  return type === ContentType.AGENT || key.startsWith("agent-");
};

const SpaceHomeFeaturedAgent: React.FC<SpaceHomeFeaturedAgentProps> = ({
  spaceId,
  contents,
  agentsMap,
}) => {
  const { t } = useTranslation("space");
  const navigate = useNavigate();

  const featuredAgents = useMemo(() => {
    if (!contents) return [];
    const items = Object.values(contents).filter(
      (item): item is SpaceContent => !!item && isAgentItem(item)
    );
    if (items.length === 0) return [];

    items.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    const resolved: Agent[] = [];
    for (const item of items) {
      const agent = agentsMap.get(item.contentKey);
      if (agent) {
        resolved.push(agent);
        if (resolved.length >= FEATURED_AGENT_LIMIT) break;
      }
    }
    return resolved;
  }, [contents, agentsMap]);

  const hasAgents = featuredAgents.length > 0;

  const handleViewMore = () => {
    navigate(`/space/${spaceId}/ai`);
  };

  const handleCreateAgent = () => {
    navigate("/create/agent");
  };

  return (
    <section
      className="SpaceHomeFeaturedAgent"
      aria-label={t("spaceAgentSection", "空间的智能体")}
    >
      <div className="SpaceHomeFeaturedAgent__header">
        <div className="SpaceHomeFeaturedAgent__title">
          <LuBot size={16} className="SpaceHomeFeaturedAgent__title-icon" aria-hidden="true" />
          <span>{t("spaceAgentSection", "空间的智能体")}</span>
        </div>
        {hasAgents && (
          <button
            type="button"
            className="SpaceHomeFeaturedAgent__more"
            onClick={handleViewMore}
          >
            <span>{t("viewMore", "更多")}</span>
            <LuArrowRight size={14} aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="SpaceHomeFeaturedAgent__body">
        {hasAgents ? (
          <div className="SpaceHomeFeaturedAgent__grid">
            {featuredAgents.map((agent) => (
              <AgentCard key={agent.dbKey || agent.id} item={agent} />
            ))}
          </div>
        ) : (
          <div className="SpaceHomeFeaturedAgent__empty" role="status">
            <div className="SpaceHomeFeaturedAgent__empty-icon" aria-hidden="true">
              <LuSparkles size={24} aria-hidden="true" />
            </div>
            <div className="SpaceHomeFeaturedAgent__empty-text">
              <h3 className="SpaceHomeFeaturedAgent__empty-title">
                {t("noAgentInSpaceTitle", "该空间下还没有 Agent")}
              </h3>
              <p className="SpaceHomeFeaturedAgent__empty-desc">
                {t(
                  "noAgentInSpaceDesc",
                  "给空间添加几个 Agent，它就能在空间里起草文档、回答问题、或者被任意对话引用。最新的 3 个会显示在这里。"
                )}
              </p>
            </div>
            <div className="SpaceHomeFeaturedAgent__empty-actions">
              <button
                type="button"
                className="SpaceHomeFeaturedAgent__primary"
                onClick={handleCreateAgent}
              >
                <LuPlus size={14} aria-hidden="true" />
                <span>{t("createAgent", "创建 AI")}</span>
              </button>
              <span className="SpaceHomeFeaturedAgent__empty-hint">
                {t("createAgentHint", "创建后前 3 个会显示在这里。")}
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default SpaceHomeFeaturedAgent;
