import React, { useId, useMemo, useState, useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  LuSearch,
  LuLightbulb,
  LuX,
  LuWrench,
  LuStar,
  LuExternalLink,
  LuInfo,
  LuRefreshCw,
  LuCheck,
} from "react-icons/lu";
import { useAppDispatch, useAppSelector } from "app/store";
import { selectIdentityUserId } from "identity/selectors";
import {
  selectEnabledPromptSkills,
  selectLastWriteFailure,
  setSettings,
} from "app/settings/settingSlice";
import type { BuiltinSkillEntry } from "ai/skills/builtinSkillRegistry";
import {
  filterBuiltinSkills,
  getBuiltinSkillDirectory,
  getRecommendedPromptSkillEntries,
  isRecommendedPromptSkill,
} from "./skillExploreDirectory";
import "./SkillExplore.css";

// 纯提示推荐 Skill 来源映射（按通用规范提供上游链接，收拢在详情内）
const RECOMMENDED_PROMPT_SKILL_META: Record<
  string,
  {
    upstreamSourceUrl: string;
    upstreamSourceLabel: string;
    upstreamRefLabel: string;
    upstreamRefUrl: string;
  }
> = {
  "ub-mode": {
    upstreamSourceUrl: "https://github.com/unclebob/ub-mode",
    upstreamSourceLabel: "unclebob/ub-mode",
    upstreamRefUrl: "https://github.com/unclebob/ub-mode/blob/master/SKILL.md",
    upstreamRefLabel: "上游参考 SKILL.md",
  },
};

interface SkillCardProps {
  entry: BuiltinSkillEntry;
  isEnabled?: boolean;
  isRecommended?: boolean;
  userId?: string | null;
  onTogglePromptSkill?: (slug: string, enable: boolean) => Promise<void>;
  isSaving?: boolean;
  isWriteFailed?: boolean;
  saveError?: string | null;
  onRetrySave?: () => void;
}

const SkillCard: React.FC<SkillCardProps> = ({
  entry,
  isEnabled = false,
  isRecommended = false,
  userId,
  onTogglePromptSkill,
  isSaving = false,
  isWriteFailed = false,
  saveError = null,
  onRetrySave,
}) => {
  const { t } = useTranslation();
  const toggleSwitchId = useId();
  const title = entry.title || entry.config.name || entry.slug;
  const description = entry.config.description || title;
  const tools = entry.config.toolNames ?? [];
  const requiredSkills = entry.config.requiredSkills ?? [];
  const recommendedSkills = entry.config.recommendedSkills ?? [];

  const meta = isRecommended ? RECOMMENDED_PROMPT_SKILL_META[entry.slug] : undefined;
  const isUnsavedOrFailed = Boolean(saveError || isWriteFailed);

  const handleToggle = () => {
    if (!onTogglePromptSkill || isSaving) return;
    void onTogglePromptSkill(entry.slug, !isEnabled);
  };

  return (
    <article
      className={`skill-card ${isRecommended ? "skill-card--recommended" : ""}`}
      data-testid={`skill-card-${entry.slug}`}
    >
      <header className="skill-card__header">
        <div className="skill-card__header-left">
          <div
            className={`skill-card__icon ${isRecommended ? "skill-card__icon--recommended" : ""}`}
            aria-hidden="true"
          >
            {isRecommended ? (
              <LuStar size={18} />
            ) : tools.length > 0 ? (
              <LuWrench size={18} />
            ) : (
              <LuLightbulb size={18} />
            )}
          </div>
          <div className="skill-card__title-wrap">
            <div className="skill-card__title-line">
              <h3 className="skill-card__title">{title}</h3>
              {isRecommended && (
                <span
                  className="skill-badge skill-badge--featured"
                  data-testid={`skill-featured-badge-${entry.slug}`}
                >
                  <LuStar size={12} aria-hidden="true" />
                  {t("explorePage.skill.recommendedBadge", "推荐")}
                </span>
              )}
            </div>
            <span className="skill-card__slug">{entry.slug}</span>
          </div>
        </div>
        <div className="skill-card__header-badges">
          <span className="skill-badge skill-badge--builtin">
            {t("explorePage.skill.builtinBadge", "内置")}
          </span>
          {isRecommended && (
            <span
              className={`skill-badge ${
                !userId
                  ? "skill-badge--disabled"
                  : isSaving
                  ? "skill-badge--saving"
                  : isUnsavedOrFailed
                  ? "skill-badge--error"
                  : isEnabled
                  ? "skill-badge--enabled"
                  : "skill-badge--disabled"
              }`}
              data-testid={`skill-status-badge-${entry.slug}`}
            >
              {!userId ? (
                t("explorePage.skill.statusAnonymous", "未登录（无法保存）")
              ) : isSaving ? (
                t("explorePage.skill.statusSaving", "保存中...")
              ) : isUnsavedOrFailed ? (
                t("explorePage.skill.statusSaveFailed", "保存失败（未同步至账号）")
              ) : isEnabled ? (
                <>
                  <LuCheck size={12} aria-hidden="true" />
                  {t("explorePage.skill.statusEnabled", "已在当前账号启用")}
                </>
              ) : (
                t("explorePage.skill.statusDisabled", "未启用")
              )}
            </span>
          )}
        </div>
      </header>

      <p className="skill-card__desc">{description}</p>

      {/* 推荐纯提示技能控制与紧凑边界说明 */}
      {isRecommended && (
        <div
          className="skill-card__recommendation-panel"
          data-testid={`skill-recommendation-panel-${entry.slug}`}
        >
          <div className="skill-card__action-row">
            <div className="skill-card__action-info">
              <span className="skill-card__action-label">
                {t("explorePage.skill.accountLevelLabel", "账号级偏好")}
              </span>
              <span className="skill-card__action-hint">
                {!userId
                  ? t("explorePage.skill.guestHint", "需登录账号后持久化保存")
                  : isSaving
                  ? t("explorePage.skill.savingHint", "正在同步至云端账号配置...")
                  : isUnsavedOrFailed
                  ? t("explorePage.skill.errorHint", "配置同步未完成，请重试保存")
                  : isEnabled
                  ? t("explorePage.skill.accountEnabledDesc", "新轮次对话将自动挂载该原则")
                  : t("explorePage.skill.accountDisabledDesc", "当前账号未启用")}
              </span>
            </div>
            <div className="skill-card__action-control">
              <button
                id={toggleSwitchId}
                type="button"
                role="switch"
                aria-checked={isEnabled}
                aria-label={
                  isEnabled
                    ? t("explorePage.skill.actionDisable", "停用此技能")
                    : t("explorePage.skill.actionEnable", "启用此技能")
                }
                disabled={isSaving}
                className={`skill-toggle-button ${
                  isEnabled ? "skill-toggle-button--active" : "skill-toggle-button--inactive"
                } ${isSaving ? "skill-toggle-button--saving" : ""} ${
                  isUnsavedOrFailed ? "skill-toggle-button--failed" : ""
                }`}
                onClick={handleToggle}
                data-testid={`skill-toggle-${entry.slug}`}
              >
                <span className="skill-toggle-button__switch" aria-hidden="true">
                  <span className="skill-toggle-button__thumb" />
                </span>
                <span className="skill-toggle-button__text">
                  {isSaving
                    ? t("explorePage.skill.saving", "保存中...")
                    : isUnsavedOrFailed
                    ? t("explorePage.skill.failedText", "未同步")
                    : isEnabled
                    ? t("explorePage.skill.enabledText", "已启用")
                    : t("explorePage.skill.enableText", "启用")}
                </span>
              </button>
            </div>
          </div>

          {(saveError || isWriteFailed) && (
            <div
              className="skill-card__error-banner"
              role="alert"
              data-testid={`skill-save-error-${entry.slug}`}
            >
              <span className="skill-card__error-text">
                {saveError ||
                  t(
                    "explorePage.skill.writeFailureUnsynced",
                    "设置同步到云端失败，当前仅在本地生效。请检查网络后重试。",
                  )}
              </span>
              {onRetrySave && (
                <button
                  type="button"
                  className="skill-card__retry-button"
                  onClick={onRetrySave}
                  data-testid={`skill-retry-button-${entry.slug}`}
                >
                  <LuRefreshCw size={12} aria-hidden="true" />
                  {t("common.retry", "重试")}
                </button>
              )}
            </div>
          )}

          {/* 压成简短范围一句说明 */}
          <div className="skill-card__notice-summary" data-testid={`skill-notice-summary-${entry.slug}`}>
            <LuInfo className="skill-card__notice-icon" size={14} aria-hidden="true" />
            <span>
              {t(
                "explorePage.skill.conciseNotice",
                "Nolo 适配版（非上游原文）；后续轮次生效；Agent 显式禁用优先；不自动安装外部工具。",
              )}
            </span>
          </div>
        </div>
      )}

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

      {/* 原生 details：来源与技能正文预览合入此处，保持主卡片轻量 */}
      {(Boolean(entry.content) || meta) && (
        <details className="skill-card__details">
          <summary className="skill-card__summary">
            <span>
              {meta
                ? t("explorePage.skill.viewDetailsAndContent", "查看来源、适配说明与正文")
                : t("explorePage.skill.viewContent", "查看技能正文")}
            </span>
          </summary>
          {meta && (
            <div className="skill-card__details-meta">
              <div className="skill-card__links">
                <a
                  href={meta.upstreamSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="skill-card__external-link"
                >
                  <span>{t("explorePage.skill.upstreamSource", "项目来源")}: {meta.upstreamSourceLabel}</span>
                  <LuExternalLink size={12} aria-hidden="true" />
                </a>
                <a
                  href={meta.upstreamRefUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="skill-card__external-link"
                >
                  <span>{meta.upstreamRefLabel}</span>
                  <LuExternalLink size={12} aria-hidden="true" />
                </a>
              </div>
            </div>
          )}
          {Boolean(entry.content) && (
            <pre className="skill-card__preview">{entry.content}</pre>
          )}
        </details>
      )}
    </article>
  );
};

export const SkillExplore: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [query, setQuery] = useState("");

  // 用户登录状态与持久化状态
  const userId = useAppSelector(selectIdentityUserId);
  const enabledPromptSkills = useAppSelector(selectEnabledPromptSkills);
  const lastWriteFailure = useAppSelector(selectLastWriteFailure);

  // 跨账号异步守卫：useRef 记录当前账号 ID，异步返回时与 capturedUserId 比对
  const currentAccountRef = useRef<string | null>(userId ?? null);
  const accountEpochRef = useRef(0);
  const pendingRef = useRef(false);

  // 保存中的状态与错误状态追踪
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});
  // 记录失败时的目标期望 boolean，避免失败后 Redux 保留乐观值导致重试反向
  const [failedTargets, setFailedTargets] = useState<Record<string, boolean>>({});

  useLayoutEffect(() => {
    currentAccountRef.current = userId ?? null;
    accountEpochRef.current += 1;
    pendingRef.current = false;
    setPendingSlug(null);
    setSaveErrors({});
    setFailedTargets({});
  }, [userId]);

  // 判断 enabledPromptSkills 是否处于已知的云端写失败未对账状态
  const isPromptSkillsWriteFailed = Boolean(
    lastWriteFailure &&
      userId &&
      lastWriteFailure.accountId === userId &&
      (lastWriteFailure.keys.includes("enabledPromptSkills") ||
        lastWriteFailure.unresolvedKeys.includes("enabledPromptSkills")),
  );

  // 全部真实内置技能
  const allSkills = useMemo(() => getBuiltinSkillDirectory(), []);

  // 推荐纯提示技能
  const recommendedSkills = useMemo(
    () => getRecommendedPromptSkillEntries(allSkills),
    [allSkills],
  );

  // 过滤后的技能列表
  const filteredSkills = useMemo(
    () => filterBuiltinSkills(allSkills, { query }),
    [allSkills, query],
  );

  // 全目录区技能条目：无搜索时排除推荐区已展示的条目，避免 ub-mode 卡片在两处重复出现
  const catalogSkills = useMemo(() => {
    if (query) return filteredSkills;
    return filteredSkills.filter((s) => !isRecommendedPromptSkill(s.slug));
  }, [filteredSkills, query]);

  // 切换纯提示技能开关
  const handleTogglePromptSkill = async (slug: string, enable: boolean) => {
    if (pendingRef.current) return;
    const capturedUserId = userId;
    const capturedEpoch = accountEpochRef.current;
    if (!capturedUserId) {
      // 匿名用户：不声称已保存
      setSaveErrors((prev) => ({
        ...prev,
        [slug]: t(
          "explorePage.skill.anonymousSaveDenied",
          "未登录账号：无法保存账号级偏好，请登录后操作。",
        ),
      }));
      return;
    }

    pendingRef.current = true;
    setPendingSlug(slug);
    setSaveErrors((prev) => {
      const copy = { ...prev };
      delete copy[slug];
      return copy;
    });

    const currentList = Array.isArray(enabledPromptSkills) ? enabledPromptSkills : [];
    const nextList = enable
      ? Array.from(new Set([...currentList, slug]))
      : currentList.filter((item) => item !== slug);

    try {
      // 乐观更新 + dispatch unwrap，核对实际写结果与 lastWriteFailure
      const result = await dispatch(
        setSettings({ enabledPromptSkills: nextList }),
      ).unwrap();

      // 异步返回守卫：若用户已登出或切换账号，旧异步结果不得污染新账号状态
      if (currentAccountRef.current !== capturedUserId || accountEpochRef.current !== capturedEpoch) return;

      if (!result) {
        throw new Error(t("explorePage.skill.saveFailedEmpty", "保存未确认完成，请重试"));
      }

      // 成功：清除错误与记录的目标
      setSaveErrors((prev) => {
        const copy = { ...prev };
        delete copy[slug];
        return copy;
      });
      setFailedTargets((prev) => {
        const copy = { ...prev };
        delete copy[slug];
        return copy;
      });
    } catch (err: unknown) {
      // 异步返回守卫
      if (currentAccountRef.current !== capturedUserId || accountEpochRef.current !== capturedEpoch) return;

      // 记录失败时的目标期望值，重试时保证按相同目标执行
      setFailedTargets((prev) => ({
        ...prev,
        [slug]: enable,
      }));

      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : t("explorePage.skill.saveFailed", "保存失败，请检查网络后重试");
      setSaveErrors((prev) => ({
        ...prev,
        [slug]: message,
      }));
    } finally {
      if (currentAccountRef.current === capturedUserId && accountEpochRef.current === capturedEpoch) {
        pendingRef.current = false;
        setPendingSlug(null);
      }
    }
  };

  const isSkillSaving = (slug: string) => pendingSlug === slug;

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

      {/* 搜索控制栏 */}
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

      {/* 推荐专区：无搜索过滤时置顶突出展示，有搜索过滤时在全部网格中标记 */}
      {!query && recommendedSkills.length > 0 && (
        <div className="skill-explore__section" data-testid="skill-explore-recommended-section">
          <div className="skill-explore__section-header">
            <h3 className="skill-explore__section-title">
              <LuStar className="skill-explore__section-icon" size={18} aria-hidden="true" />
              {t("explorePage.skill.recommendedSectionTitle", "推荐技能")}
            </h3>
            <p className="skill-explore__section-desc">
              {t(
                "explorePage.skill.recommendedSectionSubtitle",
                "精心审定的工程实践与提示词规范，支持账号级一键启用/停用。",
              )}
            </p>
          </div>
          <div className="skill-explore__grid skill-explore__grid--recommended">
            {recommendedSkills.map((entry) => {
              const targetOnRetry =
                failedTargets[entry.slug] ??
                (isPromptSkillsWriteFailed
                  ? enabledPromptSkills.includes(entry.slug)
                  : !enabledPromptSkills.includes(entry.slug));
              return (
                <SkillCard
                  key={`rec-${entry.slug}`}
                  entry={entry}
                  isRecommended={true}
                  isEnabled={enabledPromptSkills.includes(entry.slug)}
                  userId={userId}
                  onTogglePromptSkill={handleTogglePromptSkill}
                  isSaving={isSkillSaving(entry.slug)}
                  isWriteFailed={isPromptSkillsWriteFailed}
                  saveError={saveErrors[entry.slug] ?? null}
                  onRetrySave={() =>
                    handleTogglePromptSkill(entry.slug, targetOnRetry)
                  }
                />
              );
            })}
          </div>
        </div>
      )}

      {/* 全部目录专区 */}
      <div className="skill-explore__section">
        {!query && recommendedSkills.length > 0 && (
          <div className="skill-explore__section-header">
            <h3 className="skill-explore__section-title">
              {t("explorePage.skill.allSkillsSectionTitle", "全部技能目录")}
            </h3>
          </div>
        )}

        <div className="skill-explore__grid">
          {catalogSkills.length > 0 ? (
            catalogSkills.map((entry) => {
              const isRecommended = isRecommendedPromptSkill(entry.slug);
              const targetOnRetry =
                failedTargets[entry.slug] ??
                (isPromptSkillsWriteFailed
                  ? enabledPromptSkills.includes(entry.slug)
                  : !enabledPromptSkills.includes(entry.slug));
              return (
                <SkillCard
                  key={entry.slug}
                  entry={entry}
                  isRecommended={isRecommended}
                  isEnabled={enabledPromptSkills.includes(entry.slug)}
                  userId={userId}
                  onTogglePromptSkill={
                    isRecommended ? handleTogglePromptSkill : undefined
                  }
                  isSaving={isSkillSaving(entry.slug)}
                  isWriteFailed={isPromptSkillsWriteFailed}
                  saveError={saveErrors[entry.slug] ?? null}
                  onRetrySave={() =>
                    handleTogglePromptSkill(entry.slug, targetOnRetry)
                  }
                />
              );
            })
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
      </div>
    </section>
  );
};

export default SkillExplore;
