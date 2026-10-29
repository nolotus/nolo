import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { LuSearch, LuLightbulb, LuX, LuWrench, LuLayers } from "react-icons/lu";
import type { BuiltinSkillEntry } from "ai/skills/builtinSkillRegistry";
import { filterBuiltinSkills, getBuiltinSkillDirectory } from "./skillExploreDirectory";
import "./SkillExplore.css";

const SkillCard: React.FC<{ entry: BuiltinSkillEntry }> = ({ entry }) => {
  const { t } = useTranslation();
  const title = entry.title || entry.config.name || entry.slug;
  const description = entry.config.description || title;
  const tools = entry.config.toolNames ?? [];
  const requiredSkills = entry.config.requiredSkills ?? [];
  const recommendedSkills = entry.config.recommendedSkills ?? [];

  return (
    <article className="skill-card" data-testid={`skill-card-${entry.slug}`}>
      <header className="skill-card__header">
        <div className="skill-card__header-left">
          <div className="skill-card__icon" aria-hidden="true">
            {tools.length > 0 ? <LuWrench size={18} /> : <LuLightbulb size={18} />}
          </div>
          <div className="skill-card__title-wrap">
            <h3 className="skill-card__title">{title}</h3>
            <span className="skill-card__slug">{entry.slug}</span>
          </div>
        </div>
        <span className="skill-badge skill-badge--builtin">
          {t("explorePage.skill.builtinBadge", "内置")}
        </span>
      </header>

      <p className="skill-card__desc">{description}</p>

      {tools.length > 0 && (
        <div className="skill-card__section">
          <span className="skill-card__label">{t("explorePage.skill.tools", "工具")}</span>
          <div className="skill-chips">
            {tools.map((tool) => (
              <span key={tool} className="skill-chip skill-chip--tool">
                {tool}
              </span>
            ))}
          </div>
        </div>
      )}

      {requiredSkills.length > 0 && (
        <div className="skill-card__section">
          <span className="skill-card__label">
            {t("explorePage.skill.requiredSkills", "依赖技能")}
          </span>
          <div className="skill-chips">
            {requiredSkills.map((req) => (
              <span key={req} className="skill-chip skill-chip--dep">
                {req}
              </span>
            ))}
          </div>
        </div>
      )}

      {recommendedSkills.length > 0 && (
        <div className="skill-card__section">
          <span className="skill-card__label">
            {t("explorePage.skill.recommendedSkills", "推荐搭配")}
          </span>
          <div className="skill-chips">
            {recommendedSkills.map((rec) => (
              <span key={rec} className="skill-chip">
                {rec}
              </span>
            ))}
          </div>
        </div>
      )}

      {Boolean(entry.content) && (
        <details className="skill-card__details">
          <summary className="skill-card__summary">
            <span>{t("explorePage.skill.viewContent", "查看技能正文")}</span>
          </summary>
          <pre className="skill-card__preview">{entry.content}</pre>
        </details>
      )}
    </article>
  );
};

export const SkillExplore: React.FC = () => {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");

  // 只读取真实内置 Skill，保持匿名 SSR 可渲染，无 Redux / 网络副作用
  const allSkills = useMemo(() => getBuiltinSkillDirectory(), []);
  const filteredSkills = useMemo(
    () => filterBuiltinSkills(allSkills, { query }),
    [allSkills, query],
  );

  return (
    <section className="skill-explore" data-testid="skill-explore">
      <div className="skill-explore__header">
        <div className="skill-explore__title-row">
          <h2 className="skill-explore__title">
            {t("explorePage.skill.title", "内置技能")}
          </h2>
          <span className="skill-explore__count">
            {t("explorePage.skill.count", {
              count: filteredSkills.length,
              defaultValue: `共 ${filteredSkills.length} 个技能`,
            })}
          </span>
        </div>
        <p className="skill-explore__subtitle">
          {t(
            "explorePage.skill.subtitle",
            "平台内置可复用技能目录。每个 Skill 包含操作规范、纪律指南及关联工具；供 Agent 对话与流程引用。",
          )}
        </p>
      </div>

      <div className="skill-explore__controls">
        <div className="skill-explore__search-wrap" role="search">
          <LuSearch className="skill-explore__search-icon" size={16} aria-hidden="true" />
          <input
            type="search"
            className="skill-explore__search-input"
            placeholder={t(
              "explorePage.skill.searchPlaceholder",
              "搜索技能名称、描述、slug 或工具...",
            )}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t("explorePage.skill.searchAriaLabel", "搜索技能")}
          />
          {Boolean(query) && (
            <button
              type="button"
              className="skill-explore__search-clear"
              onClick={() => setQuery("")}
              aria-label={t("common.clear", "清空搜索")}
            >
              <LuX size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="skill-explore__grid">
        {filteredSkills.length > 0 ? (
          filteredSkills.map((entry) => <SkillCard key={entry.slug} entry={entry} />)
        ) : (
          <div className="skill-explore__empty" role="status">
            <p className="skill-explore__empty-title">
              {t("explorePage.skill.emptyTitle", "未找到匹配的技能")}
            </p>
            <p className="skill-explore__empty-desc">
              {t(
                "explorePage.skill.emptyDesc",
                "尝试使用其他关键词搜索名称、描述、slug 或工具名。",
              )}
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default SkillExplore;
