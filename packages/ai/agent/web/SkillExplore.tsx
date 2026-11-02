import React, {
  useId,
  useMemo,
  useState,
  useLayoutEffect,
  useRef,
  useCallback,
  useEffect,
} from "react";
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
  LuLayers,
  LuShieldCheck,
  LuFileText,
} from "react-icons/lu";
import { useAppDispatch, useAppSelector } from "app/store";
import { selectIdentityUserId } from "identity/selectors";
import {
  selectEnabledSkills,
  selectLastWriteFailure,
  setSettings,
} from "app/settings/settingSlice";
import type { BuiltinSkillEntry } from "ai/skills/builtinSkillRegistry";
import {
  filterBuiltinSkills,
  getBuiltinSkillDirectory,
  getRecommendedPromptSkillEntries,
  getVisibleSkillDirectory,
  getSkillDependencies,
  getContainedSkillEntries,
  isCompositeSkill,
  isRecommendedPromptSkill,
  isUserSkillToggleable,
  type SkillDependencies,
} from "./skillExploreDirectory";
// 复用仓库既有模态焦点陷阱原语（与 render/web/ui/modal 同源），避免另造一套
import {
  getFocusableElements,
  handleTabKey,
  restoreFocus,
} from "render/web/ui/modal/focusTrap";
import "./SkillExplore.css";

// 纯提示推荐 Skill 来源映射（按通用规范提供上游链接，在详情面板展示）
const RECOMMENDED_PROMPT_SKILL_META: Record<
  string,
  {
    upstreamSourceUrl: string;
    upstreamSourceLabel: string;
    upstreamRefLabel: string;
    upstreamRefUrl: string;
    noticeSummary?: string;
  }
> = {
  "ub-mode": {
    upstreamSourceUrl: "https://github.com/unclebob/ub-mode",
    upstreamSourceLabel: "unclebob/ub-mode",
    upstreamRefUrl: "https://github.com/unclebob/ub-mode/blob/master/SKILL.md",
    upstreamRefLabel: "上游参考 SKILL.md",
    noticeSummary: "Nolo 适配版：遵循 TDD 极客原则的智能体编程指导规范",
  },
};

/**
 * 技能工具汇总结果。
 * - direct：父项自身直接声明的工具；
 * - fromRequiredChildren：必需子技能（含其递归依赖）带入的工具；
 * - fromRecommendedChildren：推荐子技能（含其递归依赖）带入的工具。
 */
export interface SkillToolAggregation {
  direct: string[];
  fromRequiredChildren: string[];
  fromRecommendedChildren: string[];
  /** 参与汇总的子技能条目（去重、循环安全） */
  childSources: Array<{
    slug: string;
    kind: "required" | "recommended";
    tools: string[];
  }>;
}

const uniqueStrings = (values: readonly string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
};

/**
 * 按注册表依赖关系递归汇总技能实际可用的工具。
 * 规则：
 * - 父项自身声明的工具归入 direct；
 * - 必需子技能及其递归依赖带入的工具归入 fromRequiredChildren；
 * - 推荐子技能及其递归依赖带入的工具归入 fromRecommendedChildren；
 * - 同一技能同时以「必需」和「推荐」身份出现时按「必需」计入（强依赖优先）；
 * - 循环依赖按访问路径截断，不做无限递归。
 * 不依赖任何硬编码技能名。
 */
export function aggregateSkillTools(
  entry: BuiltinSkillEntry | null | undefined,
  skills?: readonly BuiltinSkillEntry[],
): SkillToolAggregation {
  const direct = uniqueStrings(entry?.config?.toolNames ?? []);
  const empty: SkillToolAggregation = {
    direct,
    fromRequiredChildren: [],
    fromRecommendedChildren: [],
    childSources: [],
  };
  if (!entry) return empty;

  const list = skills ?? getBuiltinSkillDirectory();
  // slug -> 最强依赖强度（required 优先于 recommended）
  const strongest = new Map<string, "required" | "recommended">();
  const toolsBySlug = new Map<string, string[]>();

  const visit = (
    node: BuiltinSkillEntry,
    kind: "required" | "recommended",
    ancestors: Set<string>,
  ): void => {
    // 循环依赖保护：命中祖先即停止展开
    if (ancestors.has(node.slug)) return;
    const previous = strongest.get(node.slug);
    // 已以同等或更强强度计入，无需重复展开
    if (previous === kind || previous === "required") return;

    strongest.set(node.slug, kind);
    toolsBySlug.set(node.slug, uniqueStrings(node.config?.toolNames ?? []));

    const nextAncestors = new Set(ancestors);
    nextAncestors.add(node.slug);

    const deps = getSkillDependencies(node, list);
    for (const item of deps.required) {
      if (!item.entry) continue;
      visit(
        item.entry,
        kind === "required" ? "required" : "recommended",
        nextAncestors,
      );
    }
    for (const item of deps.recommended) {
      if (!item.entry) continue;
      visit(item.entry, "recommended", nextAncestors);
    }
  };

  const rootAncestors = new Set<string>([entry.slug]);
  const rootDeps = getSkillDependencies(entry, list);
  for (const item of rootDeps.required) {
    if (!item.entry) continue;
    visit(item.entry, "required", rootAncestors);
  }
  for (const item of rootDeps.recommended) {
    if (!item.entry) continue;
    visit(item.entry, "recommended", rootAncestors);
  }

  const requiredTools: string[] = [];
  const recommendedTools: string[] = [];
  const childSources: SkillToolAggregation["childSources"] = [];
  for (const [slug, kind] of strongest) {
    const tools = toolsBySlug.get(slug) ?? [];
    childSources.push({ slug, kind, tools });
    if (kind === "required") {
      requiredTools.push(...tools);
    } else {
      recommendedTools.push(...tools);
    }
  }

  return {
    direct,
    fromRequiredChildren: uniqueStrings(requiredTools),
    fromRecommendedChildren: uniqueStrings(recommendedTools),
    childSources,
  };
}

interface SkillCardProps {
  entry: BuiltinSkillEntry;
  isEnabled?: boolean;
  isRecommended?: boolean;
  isComposite?: boolean;
  isToggleable?: boolean;
  userId?: string | null;
  onToggleSkill?: (slug: string, enable: boolean) => Promise<void>;
  isSaving?: boolean;
  isWriteFailed?: boolean;
  saveError?: string | null;
  onRetrySave?: () => void;
  onOpenDetail: (entry: BuiltinSkillEntry, triggerEl: HTMLElement | null) => void;
}

const SkillCard: React.FC<SkillCardProps> = ({
  entry,
  isEnabled = false,
  isRecommended = false,
  isComposite = false,
  isToggleable = false,
  userId,
  onToggleSkill,
  isSaving = false,
  isWriteFailed = false,
  saveError = null,
  onRetrySave,
  onOpenDetail,
}) => {
  const { t } = useTranslation();
  const toggleSwitchId = useId();
  const cardRef = useRef<HTMLElement>(null);
  const detailBtnRef = useRef<HTMLButtonElement>(null);

  const title = entry.title || entry.config?.name || entry.slug;
  const description = entry.config?.description || title;
  const tools = entry.config?.toolNames ?? [];
  const meta = RECOMMENDED_PROMPT_SKILL_META[entry.slug];
  const isUnsavedOrFailed = Boolean(saveError || isWriteFailed);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onToggleSkill || isSaving || !isToggleable) return;
    void onToggleSkill(entry.slug, !isEnabled);
  };

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRetrySave) {
      onRetrySave();
    }
  };

  const handleOpenDetailClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenDetail(entry, detailBtnRef.current || cardRef.current);
  };

  const handleCardClick = () => {
    onOpenDetail(entry, detailBtnRef.current || cardRef.current);
  };

  return (
    <article
      ref={cardRef}
      className={`skill-card ${isRecommended ? "skill-card--recommended" : ""} ${
        isComposite ? "skill-card--composite" : ""
      }`}
      data-testid={`skill-card-${entry.slug}`}
      onClick={handleCardClick}
      role="region"
      aria-label={title}
    >
      <header className="skill-card__header">
        <div className="skill-card__header-left">
          <div
            className={`skill-card__icon ${
              isRecommended
                ? "skill-card__icon--recommended"
                : isComposite
                ? "skill-card__icon--composite"
                : tools.length > 0
                ? "skill-card__icon--tools"
                : "skill-card__icon--prompt"
            }`}
            aria-hidden="true"
          >
            {isRecommended ? (
              <LuStar size={18} />
            ) : isComposite ? (
              <LuLayers size={18} />
            ) : tools.length > 0 ? (
              <LuWrench size={18} />
            ) : (
              <LuLightbulb size={18} />
            )}
          </div>
          <div className="skill-card__title-group">
            <div className="skill-card__title-row">
              <h3 className="skill-card__title">{title}</h3>
            </div>
            <span className="skill-card__slug">{entry.slug}</span>
          </div>
        </div>

        <div className="skill-card__header-badges">
          <span className="skill-badge skill-badge--builtin">
            {t("explorePage.skill.builtinBadge", "内置")}
          </span>
          {isRecommended && (
            <span className="skill-badge skill-badge--recommended">
              <LuStar size={12} aria-hidden="true" />
              {t("explorePage.skill.recommendedBadge", "推荐")}
            </span>
          )}
          {isComposite && (
            <span className="skill-badge skill-badge--composite">
              <LuLayers size={12} aria-hidden="true" />
              {t("explorePage.skill.compositeBadge", "组合")}
            </span>
          )}
          {isToggleable && (
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
                t("explorePage.skill.statusAnonymous", "未登录")
              ) : isSaving ? (
                t("explorePage.skill.statusSaving", "保存中...")
              ) : isUnsavedOrFailed ? (
                t("explorePage.skill.statusSaveFailed", "保存失败")
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

      {/* 两行内用途说明，带省略号与原生 title 提示 */}
      <p className="skill-card__desc" title={description}>
        {description}
      </p>

      {/* 若有适配说明摘要，紧凑呈现 */}
      {meta?.noticeSummary && (
        <div
          className="skill-card__notice-summary"
          data-testid={`skill-notice-summary-${entry.slug}`}
        >
          {meta.noticeSummary}
        </div>
      )}

      {/* 底部精简操作栏：启停控件与查看详情 */}
      <footer className="skill-card__footer">
        <div className="skill-card__footer-actions">
          {isToggleable && (
            <div className="skill-card__action-switch-wrap">
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
                  isEnabled
                    ? "skill-toggle-button--active"
                    : "skill-toggle-button--inactive"
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

              {isUnsavedOrFailed && onRetrySave && (
                <button
                  type="button"
                  className="skill-retry-button"
                  onClick={handleRetry}
                  disabled={isSaving}
                  aria-label={t("explorePage.skill.retrySave", "重试保存")}
                  data-testid={`skill-retry-button-${entry.slug}`}
                >
                  <LuRefreshCw
                    size={14}
                    className={isSaving ? "skill-spin" : ""}
                    aria-hidden="true"
                  />
                  <span>{t("explorePage.skill.retry", "重试")}</span>
                </button>
              )}
            </div>
          )}

          <button
            ref={detailBtnRef}
            type="button"
            className="skill-detail-open-btn"
            onClick={handleOpenDetailClick}
            aria-haspopup="dialog"
            aria-label={`${t("explorePage.skill.viewDetail", "查看详情")}: ${title}`}
            data-testid={`skill-card-details-button-${entry.slug}`}
          >
            <LuInfo size={14} aria-hidden="true" />
            <span>{t("explorePage.skill.viewDetail", "查看详情")}</span>
          </button>
        </div>

        {saveError && (
          <div
            className="skill-card__error-banner"
            role="alert"
            data-testid={`skill-save-error-${entry.slug}`}
          >
            {saveError}
          </div>
        )}
      </footer>
    </article>
  );
};

interface SkillDetailModalProps {
  entry: BuiltinSkillEntry | null;
  allSkills: readonly BuiltinSkillEntry[];
  isEnabled: boolean;
  isRecommended: boolean;
  isComposite: boolean;
  isToggleable: boolean;
  userId?: string | null;
  onToggleSkill?: (slug: string, enable: boolean) => Promise<void>;
  isSaving?: boolean;
  isWriteFailed?: boolean;
  saveError?: string | null;
  onRetrySave?: () => void;
  onClose: () => void;
  onSelectAnotherSkill?: (entry: BuiltinSkillEntry) => void;
}

const SkillDetailModal: React.FC<SkillDetailModalProps> = ({
  entry,
  allSkills,
  isEnabled,
  isRecommended,
  isComposite,
  isToggleable,
  userId,
  onToggleSkill,
  isSaving = false,
  isWriteFailed = false,
  saveError = null,
  onRetrySave,
  onClose,
  onSelectAnotherSkill,
}) => {
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const isOpen = Boolean(entry);

  // 依赖与包含子项推导
  const dependencies: SkillDependencies = useMemo(() => {
    if (!entry) return { required: [], recommended: [] };
    return getSkillDependencies(entry, allSkills);
  }, [entry, allSkills]);

  const containedEntries = useMemo(() => {
    if (!entry) return [];
    return getContainedSkillEntries(entry, allSkills);
  }, [entry, allSkills]);

  // 工具汇总：父项直接声明 + 子技能递归带入（必需 / 推荐分开）
  const toolAggregation = useMemo(
    () => aggregateSkillTools(entry, allSkills),
    [entry, allSkills],
  );
  const hasAnyTools =
    toolAggregation.direct.length > 0 ||
    toolAggregation.fromRequiredChildren.length > 0 ||
    toolAggregation.fromRecommendedChildren.length > 0;

  // 键盘 Esc 关闭 + Tab 焦点限制（复用仓库既有 focusTrap 原语）
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const content = modalRef.current;
      if (!content) return;
      handleTabKey(e, content);
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  // 打开时：把焦点移入对话框（首个可聚焦元素，缺失时退回对话框本身）
  useEffect(() => {
    if (!isOpen) return;
    const content = modalRef.current;
    if (!content) return;
    const focusables = getFocusableElements(content);
    const target = focusables[0] ?? content;
    try {
      target.focus({ preventScroll: true });
    } catch {
      // ignore
    }
  }, [isOpen]);

  // 切换到子技能后原触发按钮已卸载：把焦点交还对话框标题，避免焦点掉到背景
  useEffect(() => {
    if (!entry) return;
    const content = modalRef.current;
    if (!content) return;
    const active = document.activeElement;
    if (active && content.contains(active)) return;
    const title = content.querySelector<HTMLElement>("#skill-detail-title");
    if (!title) return;
    const timer = window.setTimeout(() => {
      try {
        title.focus({ preventScroll: true });
      } catch {
        // ignore
      }
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [entry]);

  if (!entry) return null;

  const title = entry.title || entry.config?.name || entry.slug;
  const description = entry.config?.description || title;
  const meta = RECOMMENDED_PROMPT_SKILL_META[entry.slug];
  const isUnsavedOrFailed = Boolean(saveError || isWriteFailed);

  return (
    <div
      className="skill-detail-overlay"
      onClick={onClose}
      role="presentation"
      data-testid="skill-detail-overlay"
    >
      <div
        ref={modalRef}
        className="skill-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="skill-detail-title"
        onClick={(e) => e.stopPropagation()}
        data-testid="skill-detail-dialog"
      >
        <header className="skill-detail-modal__header">
          <div className="skill-detail-modal__header-left">
            <div
              className={`skill-detail-modal__icon ${
                isRecommended
                  ? "skill-card__icon--recommended"
                  : isComposite
                  ? "skill-card__icon--composite"
                  : hasAnyTools
                  ? "skill-card__icon--tools"
                  : "skill-card__icon--prompt"
              }`}
              aria-hidden="true"
            >
              {isRecommended ? (
                <LuStar size={20} />
              ) : isComposite ? (
                <LuLayers size={20} />
              ) : hasAnyTools ? (
                <LuWrench size={20} />
              ) : (
                <LuLightbulb size={20} />
              )}
            </div>
            <div>
              <div className="skill-detail-modal__title-row">
                <h2
                  id="skill-detail-title"
                  className="skill-detail-modal__title"
                  tabIndex={-1}
                >
                  {title}
                </h2>
              </div>
              <div className="skill-detail-modal__slug-row">
                <span className="skill-detail-modal__slug">{entry.slug}</span>
                <span className="skill-badge skill-badge--builtin">
                  {t("explorePage.skill.builtinBadge", "内置")}
                </span>
                {isRecommended && (
                  <span className="skill-badge skill-badge--recommended">
                    <LuStar size={12} aria-hidden="true" />
                    {t("explorePage.skill.recommendedBadge", "推荐")}
                  </span>
                )}
                {isComposite && (
                  <span className="skill-badge skill-badge--composite">
                    <LuLayers size={12} aria-hidden="true" />
                    {t("explorePage.skill.compositeBadge", "组合")}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            className="skill-detail-modal__close-btn"
            onClick={onClose}
            aria-label={t("explorePage.skill.closeDetail", "关闭详情")}
            data-testid="skill-detail-close"
          >
            <LuX size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="skill-detail-modal__body">
          {/* 账号启用状态与生效范围 */}
          <section className="skill-detail-section skill-detail-section--status">
            <h3 className="skill-detail-section__title">
              <LuShieldCheck size={16} aria-hidden="true" />
              <span>{t("explorePage.skill.accountStatusSection", "账号启用状态与生效范围")}</span>
            </h3>
            <div className="skill-detail-status-card">
              <div className="skill-detail-status-card__info">
                <span className="skill-detail-status-card__badge-wrap">
                  {isToggleable ? (
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
                  ) : (
                    <span className="skill-badge skill-badge--builtin">
                      {t("explorePage.skill.permanentBuiltin", "系统内置（不可关闭）")}
                    </span>
                  )}
                </span>
                <p className="skill-detail-status-card__desc">
                  {!isToggleable
                    ? t(
                        "explorePage.skill.permanentBuiltinDesc",
                        "系统底层内置能力：无需账号级开关，智能体在处理相关工作区任务时按规则调度。",
                      )
                    : !userId
                    ? t(
                        "explorePage.skill.guestHint",
                        "需登录账号后持久化保存。未登录状态下的变更不会同步至云端偏好。",
                      )
                    : isEnabled
                    ? t(
                        "explorePage.skill.accountEnabledDescFull",
                        "账号级偏好已生效：新轮次对话中创建的执行计划和智能体会自动继承挂载该技能规则。",
                      )
                    : t(
                        "explorePage.skill.accountDisabledDescFull",
                        "当前账号未启用该技能：智能体默认不自动加载，除非在特定的任务或策略中显式指定。",
                      )}
                </p>
              </div>

              {isToggleable && (
                <div className="skill-detail-status-card__actions">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isEnabled}
                    disabled={isSaving}
                    className={`skill-toggle-button ${
                      isEnabled
                        ? "skill-toggle-button--active"
                        : "skill-toggle-button--inactive"
                    } ${isSaving ? "skill-toggle-button--saving" : ""}`}
                    onClick={() => onToggleSkill && onToggleSkill(entry.slug, !isEnabled)}
                    data-testid={`skill-detail-toggle-${entry.slug}`}
                  >
                    <span className="skill-toggle-button__switch" aria-hidden="true">
                      <span className="skill-toggle-button__thumb" />
                    </span>
                    <span className="skill-toggle-button__text">
                      {isSaving
                        ? t("explorePage.skill.saving", "保存中...")
                        : isEnabled
                        ? t("explorePage.skill.actionDisable", "停用此技能")
                        : t("explorePage.skill.actionEnable", "启用此技能")}
                    </span>
                  </button>

                  {isUnsavedOrFailed && onRetrySave && (
                    <button
                      type="button"
                      className="skill-retry-button"
                      onClick={onRetrySave}
                      disabled={isSaving}
                      data-testid={`skill-detail-retry-${entry.slug}`}
                    >
                      <LuRefreshCw size={14} className={isSaving ? "skill-spin" : ""} />
                      <span>{t("explorePage.skill.retry", "重试同步")}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {saveError && (
              <div className="skill-card__error-banner" role="alert">
                {saveError}
              </div>
            )}
          </section>

          {/* 用途与何时使用 */}
          <section className="skill-detail-section">
            <h3 className="skill-detail-section__title">
              <LuLightbulb size={16} aria-hidden="true" />
              <span>{t("explorePage.skill.usageSection", "用途与适用场景")}</span>
            </h3>
            <p className="skill-detail-desc">{description}</p>
            {entry.config?.triggerMode && (
              <div className="skill-detail-meta-line">
                <span className="skill-detail-meta-label">
                  {t("explorePage.skill.triggerModeLabel", "触发机制")}:
                </span>
                <span className="skill-chip">{entry.config.triggerMode}</span>
              </div>
            )}
          </section>

          {/* 包含子技能（针对组合项） */}
          {containedEntries.length > 0 && (
            <section
              className="skill-detail-section"
              data-testid="skill-detail-contained-section"
            >
              <h3 className="skill-detail-section__title">
                <LuLayers size={16} aria-hidden="true" />
                <span>
                  {t("explorePage.skill.containedSkillsSection", "包含子技能（组合内聚）")}
                </span>
              </h3>
              <div className="skill-detail-contained-grid">
                {containedEntries.map((child) => (
                  <button
                    key={child.slug}
                    type="button"
                    className="skill-detail-subitem"
                    onClick={() => onSelectAnotherSkill && onSelectAnotherSkill(child)}
                    onKeyDown={(e) => {
                      // 原生 button 在真实浏览器里会自行激活；此处显式处理，
                      // 让 Enter / Space 在不实现激活行为的环境（如 JSDOM）下同样可用，
                      // 并通过 preventDefault 保证只触发一次。
                      if (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") {
                        return;
                      }
                      e.preventDefault();
                      if (onSelectAnotherSkill) onSelectAnotherSkill(child);
                    }}
                    disabled={!onSelectAnotherSkill}
                    data-testid={`skill-detail-child-${child.slug}`}
                  >
                    <div className="skill-detail-subitem__title">
                      {child.title || child.config?.name || child.slug}
                    </div>
                    <div className="skill-detail-subitem__slug">{child.slug}</div>
                    {child.config?.toolNames && child.config.toolNames.length > 0 && (
                      <div className="skill-detail-subitem__tools">
                        {t("explorePage.skill.toolsCount", {
                          count: child.config.toolNames.length,
                          defaultValue: `含 ${child.config.toolNames.length} 个工具`,
                        })}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* 依赖项与推荐搭配（展示可读名） */}
          {(dependencies.required.length > 0 || dependencies.recommended.length > 0) && (
            <section
              className="skill-detail-section"
              data-testid="skill-detail-dependencies"
            >
              <h3 className="skill-detail-section__title">
                <LuLayers size={16} aria-hidden="true" />
                <span>{t("explorePage.skill.dependenciesSection", "依赖关系与推荐搭配")}</span>
              </h3>
              {dependencies.required.length > 0 && (
                <div className="skill-detail-dep-block">
                  <span className="skill-detail-meta-label">
                    {t("explorePage.skill.requiredDeps", "前置强依赖（必需）")}:
                  </span>
                  <div className="skill-chips">
                    {dependencies.required.map(({ reference, entry: depEntry }) => (
                      <button
                        key={reference}
                        type="button"
                        className="skill-chip skill-chip--dep"
                        title={reference}
                        onClick={() => depEntry && onSelectAnotherSkill?.(depEntry)}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") {
                            return;
                          }
                          e.preventDefault();
                          if (depEntry) onSelectAnotherSkill?.(depEntry);
                        }}
                        disabled={!depEntry}
                        data-testid={`skill-detail-dep-required-${reference}`}
                      >
                        {depEntry
                          ? depEntry.title || depEntry.config?.name || depEntry.slug
                          : reference}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {dependencies.recommended.length > 0 && (
                <div className="skill-detail-dep-block">
                  <span className="skill-detail-meta-label">
                    {t("explorePage.skill.recommendedDeps", "推荐协同搭配")}:
                  </span>
                  <div className="skill-chips">
                    {dependencies.recommended.map(({ reference, entry: depEntry }) => (
                      <button
                        key={reference}
                        type="button"
                        className="skill-chip"
                        title={reference}
                        onClick={() => depEntry && onSelectAnotherSkill?.(depEntry)}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") {
                            return;
                          }
                          e.preventDefault();
                          if (depEntry) onSelectAnotherSkill?.(depEntry);
                        }}
                        disabled={!depEntry}
                        data-testid={`skill-detail-dep-recommended-${reference}`}
                      >
                        {depEntry
                          ? depEntry.title || depEntry.config?.name || depEntry.slug
                          : reference}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 所需工具 */}
          <section className="skill-detail-section" data-testid="skill-detail-tools">
            <h3 className="skill-detail-section__title">
              <LuWrench size={16} aria-hidden="true" />
              <span>{t("explorePage.skill.toolsSection", "所需工具支持")}</span>
            </h3>
            {hasAnyTools ? (
              <div
                className="skill-detail-tool-groups"
                data-testid="skill-detail-tool-groups"
              >
                {toolAggregation.direct.length > 0 && (
                  <div
                    className="skill-detail-tool-group"
                    data-testid="skill-detail-tools-direct"
                  >
                    <span className="skill-detail-meta-label">
                      {t(
                        "explorePage.skill.toolsDirectLabel",
                        "本技能直接声明的工具:",
                      )}
                    </span>
                    <div className="skill-chips">
                      {toolAggregation.direct.map((tool) => (
                        <span
                          key={tool}
                          className="skill-chip skill-chip--tool"
                          data-tool={tool}
                          data-testid="skill-detail-tool-direct"
                        >
                          <LuWrench size={12} aria-hidden="true" />
                          <span>{tool}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {toolAggregation.fromRequiredChildren.length > 0 && (
                  <div
                    className="skill-detail-tool-group"
                    data-testid="skill-detail-tools-required-children"
                  >
                    <span className="skill-detail-meta-label">
                      {t(
                        "explorePage.skill.toolsRequiredChildrenLabel",
                        "来自必需子技能的工具:",
                      )}
                    </span>
                    <div className="skill-chips">
                      {toolAggregation.fromRequiredChildren.map((tool) => (
                        <span
                          key={tool}
                          className="skill-chip skill-chip--tool"
                          data-tool={tool}
                          data-testid="skill-detail-tool-required-child"
                        >
                          <LuWrench size={12} aria-hidden="true" />
                          <span>{tool}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {toolAggregation.fromRecommendedChildren.length > 0 && (
                  <div
                    className="skill-detail-tool-group"
                    data-testid="skill-detail-tools-recommended-children"
                  >
                    <span className="skill-detail-meta-label">
                      {t(
                        "explorePage.skill.toolsRecommendedChildrenLabel",
                        "来自推荐子技能的工具:",
                      )}
                    </span>
                    <div className="skill-chips">
                      {toolAggregation.fromRecommendedChildren.map((tool) => (
                        <span
                          key={tool}
                          className="skill-chip skill-chip--tool"
                          data-tool={tool}
                          data-testid="skill-detail-tool-recommended-child"
                        >
                          <LuWrench size={12} aria-hidden="true" />
                          <span>{tool}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="skill-detail-empty-text" data-testid="skill-detail-no-tools">
                {t(
                  "explorePage.skill.noToolsRequired",
                  "无需额外工具（纯提示型指导原则，通过 prompt 注入规范智能体行为）。",
                )}
              </p>
            )}
          </section>

          {/* 权限边界与生效方式 */}
          <section className="skill-detail-section">
            <h3 className="skill-detail-section__title">
              <LuShieldCheck size={16} aria-hidden="true" />
              <span>{t("explorePage.skill.boundarySection", "权限边界与安全约束")}</span>
            </h3>
            <p className="skill-detail-desc">
              {hasAnyTools
                ? t(
                    "explorePage.skill.toolsBoundaryDesc",
                    "智能体在挂载本技能时可访问声明的工具集；所有写操作与高危文件变更受平台统一权限系统守卫，不突破当前账号的工作区授权。",
                  )
                : t(
                    "explorePage.skill.promptBoundaryDesc",
                    "纯提示型原则不引入任何额外工具调用权限，不访问本地文件系统或网络端点，仅提供决策参考与流程规范。",
                  )}
            </p>
          </section>

          {/* 来源与参考 */}
          <section className="skill-detail-section" data-testid="skill-detail-upstream">
            <h3 className="skill-detail-section__title">
              <LuExternalLink size={16} aria-hidden="true" />
              <span>{t("explorePage.skill.sourceSection", "来源与参考")}</span>
            </h3>
            {meta ? (
              <div className="skill-card__links">
                <a
                  href={meta.upstreamSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="skill-card__external-link"
                >
                  <span>
                    {t("explorePage.skill.upstreamSource", "项目来源")}: {meta.upstreamSourceLabel}
                  </span>
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
            ) : (
              <p className="skill-detail-empty-text">
                {t(
                  "explorePage.skill.platformBuiltinSource",
                  "平台原生内置实现（内置于平台注册表，随平台版本更新）。",
                )}
              </p>
            )}
          </section>

          {/* 技能正文 / 协议预览 */}
          {Boolean(entry.content) && (
            <section
              className="skill-detail-section"
              data-testid="skill-detail-content"
            >
              <h3 className="skill-detail-section__title">
                <LuFileText size={16} aria-hidden="true" />
                <span>{t("explorePage.skill.contentSection", "技能定义与协议正文")}</span>
              </h3>
              <pre className="skill-detail-content-preview">{entry.content}</pre>
            </section>
          )}
        </div>

        <footer className="skill-detail-modal__footer">
          <button
            type="button"
            className="skill-detail-close-action-btn"
            onClick={onClose}
          >
            {t("common.close", "关闭")}
          </button>
        </footer>
      </div>
    </div>
  );
};

export const SkillExplore: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [query, setQuery] = useState("");

  // 用户登录状态与持久化状态
  const userId = useAppSelector(selectIdentityUserId);
  const enabledSkills = useAppSelector(selectEnabledSkills);
  const lastWriteFailure = useAppSelector(selectLastWriteFailure);

  // 跨账号异步守卫：useRef 记录当前账号 ID 与 epoch
  const currentAccountRef = useRef<string | null>(userId ?? null);
  const accountEpochRef = useRef(0);
  const pendingRef = useRef(false);

  // 保存中的状态与错误状态追踪
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});
  // 记录失败时的目标期望 boolean，避免失败后 Redux 保留乐观值导致重试反向
  const [failedTargets, setFailedTargets] = useState<Record<string, boolean>>({});

  // 详情弹窗状态
  const [activeDetailEntry, setActiveDetailEntry] = useState<BuiltinSkillEntry | null>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);
  // 背景区域（弹窗之外的内容）：打开详情时隔离
  const backgroundRef = useRef<HTMLDivElement>(null);
  const isDetailOpen = Boolean(activeDetailEntry);

  useLayoutEffect(() => {
    currentAccountRef.current = userId ?? null;
    accountEpochRef.current += 1;
    pendingRef.current = false;
    setPendingSlug(null);
    setSaveErrors({});
    setFailedTargets({});
  }, [userId]);

  // 判断 enabledSkills / enabledPromptSkills 是否处于已知的写失败未对账状态
  const isSkillsWriteFailed = Boolean(
    lastWriteFailure &&
      userId &&
      lastWriteFailure.accountId === userId &&
      (lastWriteFailure.keys.includes("enabledSkills") ||
        lastWriteFailure.unresolvedKeys.includes("enabledSkills") ||
        lastWriteFailure.keys.includes("enabledPromptSkills") ||
        lastWriteFailure.unresolvedKeys.includes("enabledPromptSkills")),
  );

  // 全部真实内置技能
  const allSkills = useMemo(() => getBuiltinSkillDirectory(), []);

  // 推荐技能（仅用于展示与排序，不决定可启用性）
  const recommendedSkills = useMemo(
    () => getRecommendedPromptSkillEntries(allSkills),
    [allSkills],
  );

  // 可见目录（无搜索时隐藏已被父项收拢的子项，搜索时全部可见）
  const visibleSkills = useMemo(
    () => getVisibleSkillDirectory(allSkills, query),
    [allSkills, query],
  );

  // 全目录区技能条目：无搜索时排除推荐区已展示的条目，避免 ub-mode 卡片在两处重复出现
  const catalogSkills = useMemo(() => {
    if (query.trim()) return visibleSkills;
    return visibleSkills.filter((s) => !isRecommendedPromptSkill(s.slug));
  }, [visibleSkills, query]);

  // 切换 Skill 启用/停用状态
  const handleToggleSkill = async (slug: string, enable: boolean) => {
    if (pendingRef.current) return;
    const capturedUserId = userId;
    const capturedEpoch = accountEpochRef.current;
    if (!capturedUserId) {
      // 匿名用户：不假称已保存
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

    const currentList = Array.isArray(enabledSkills) ? enabledSkills : [];
    const nextList = enable
      ? Array.from(new Set([...currentList, slug]))
      : currentList.filter((item) => item !== slug);

    try {
      // 乐观更新 + dispatch unwrap
      const result = await dispatch(
        setSettings({ enabledSkills: nextList }),
      ).unwrap();

      // 异步返回守卫：若用户已登出或切换账号，旧异步结果不得污染新账号状态
      if (
        currentAccountRef.current !== capturedUserId ||
        accountEpochRef.current !== capturedEpoch
      ) {
        return;
      }

      if (!result) {
        throw new Error(
          t("explorePage.skill.saveFailedEmpty", "保存未确认完成，请重试"),
        );
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
      if (
        currentAccountRef.current !== capturedUserId ||
        accountEpochRef.current !== capturedEpoch
      ) {
        return;
      }

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
      if (
        currentAccountRef.current === capturedUserId &&
        accountEpochRef.current === capturedEpoch
      ) {
        pendingRef.current = false;
        setPendingSlug(null);
      }
    }
  };

  const isSkillSaving = (slug: string) => pendingSlug === slug;

  const handleOpenDetail = useCallback(
    (entry: BuiltinSkillEntry, triggerEl: HTMLElement | null) => {
      triggerElementRef.current = triggerEl;
      setActiveDetailEntry(entry);
    },
    [],
  );

  const handleCloseDetail = useCallback(() => {
    setActiveDetailEntry(null);
    // Esc / 关闭后焦点真实回到触发元素（复用仓库既有 restoreFocus 原语）
    setTimeout(() => {
      restoreFocus(triggerElementRef.current);
    }, 0);
  }, []);

  // 背景隔离：详情弹窗打开时，背景区域置为 inert + aria-hidden 并禁用指针事件，
  // 使背景内容对辅助技术与指针都不可达（弹窗本身不在该区域内，不受影响）。
  useEffect(() => {
    const el = backgroundRef.current;
    if (!el) return;
    if (isDetailOpen) {
      el.setAttribute("inert", "");
      el.setAttribute("aria-hidden", "true");
      el.style.pointerEvents = "none";
    } else {
      el.removeAttribute("inert");
      el.removeAttribute("aria-hidden");
      el.style.pointerEvents = "";
    }
  }, [isDetailOpen]);

  return (
    <section className="skill-explore" data-testid="skill-explore">
      {/* 详情弹窗打开时，本区域被置为 inert + aria-hidden，完成背景隔离 */}
      <div
        className="skill-explore__content"
        data-testid="skill-explore-background"
        ref={backgroundRef}
      >
      <div className="skill-explore__header">
        <div className="skill-explore__title-row">
          <h2 className="skill-explore__title">
            {t("explorePage.skill.title", "内置技能")}
          </h2>
          <span className="skill-badge skill-badge--count">
            {t("explorePage.skill.totalCount", {
              count: allSkills.length,
              defaultValue: `共 ${allSkills.length} 项内置技能`,
            })}
          </span>
        </div>
        <p className="skill-explore__subtitle">
          {t(
            "explorePage.skill.subtitle",
            "平台开箱即用的工程能力与提示规范。推荐项展示常用原则；在需要时可对具备账号偏好资格的技能进行启停，新对话将按配置生效。",
          )}
        </p>
      </div>

      {/* 搜索控制栏 */}
      <div className="skill-explore__controls">
        <div className="skill-explore__search-wrap">
          <LuSearch
            className="skill-explore__search-icon"
            size={16}
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(
              "explorePage.skill.searchPlaceholder",
              "搜索技能名称、描述、标识或工具...",
            )}
            className="skill-explore__search-input"
            aria-label={t("explorePage.skill.searchAria", "搜索内置技能")}
          />
          {query && (
            <button
              type="button"
              className="skill-explore__search-clear"
              onClick={() => setQuery("")}
              aria-label={t("explorePage.skill.clearSearch", "清除搜索")}
            >
              <LuX size={14} aria-hidden="true" />
            </button>
          )}
        </div>

        {query && (
          <div className="skill-explore__search-status" role="status">
            {t("explorePage.skill.searchResultCount", {
              count: visibleSkills.length,
              defaultValue: `找到 ${visibleSkills.length} 项匹配技能`,
            })}
          </div>
        )}
      </div>

      {/* 推荐区域：仅在无搜索词时作为快捷发现呈现 */}
      {!query && recommendedSkills.length > 0 && (
        <div
          className="skill-explore__recommended-section"
          data-testid="skill-explore-recommended-section"
        >
          <div className="skill-explore__section-header">
            <div className="skill-explore__section-title-wrap">
              <LuStar
                className="skill-explore__section-icon"
                size={16}
                aria-hidden="true"
              />
              <h3 className="skill-explore__section-title">
                {t("explorePage.skill.recommendedSectionTitle", "精选推荐")}
              </h3>
            </div>
            <span className="skill-explore__section-hint">
              {t(
                "explorePage.skill.recommendedSectionHint",
                "开箱即用的优质工作原则，账号级启用后自动注入新会话上下文",
              )}
            </span>
          </div>

          <div className="skill-explore__grid">
            {recommendedSkills.map((entry) => {
              const isEnabled = enabledSkills.includes(entry.slug);
              // 重试语义：重新持久化界面当前显示的目标，不得取反；remount 后仍从 Redux 乐观值恢复同一目标
              const targetOnRetry =
                failedTargets[entry.slug] !== undefined
                  ? failedTargets[entry.slug]
                  : isEnabled;
              return (
                <SkillCard
                  key={entry.slug}
                  entry={entry}
                  isRecommended={true}
                  isComposite={isCompositeSkill(entry, allSkills)}
                  isToggleable={isUserSkillToggleable(entry.slug)}
                  isEnabled={isEnabled}
                  userId={userId}
                  onToggleSkill={handleToggleSkill}
                  isSaving={isSkillSaving(entry.slug)}
                  isWriteFailed={isSkillsWriteFailed}
                  saveError={saveErrors[entry.slug] ?? null}
                  onRetrySave={() =>
                    handleToggleSkill(entry.slug, targetOnRetry)
                  }
                  onOpenDetail={handleOpenDetail}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* 目录全量网格 */}
      <div
        className="skill-explore__catalog-section"
        data-testid="skill-explore-catalog-section"
      >
        <div className="skill-explore__section-header">
          <h3 className="skill-explore__section-title">
            {query
              ? t("explorePage.skill.searchResultsTitle", "检索结果")
              : t("explorePage.skill.allSkillsTitle", "技能目录")}
          </h3>
          <span className="skill-explore__section-hint">
            {query
              ? t("explorePage.skill.searchResultsHint", "包含匹配条件的全部顶层技能与组合子项")
              : t(
                  "explorePage.skill.allSkillsHint",
                  "包含工程编码、调查定位、环境隔离等能力，子技能已收拢至组合项内",
                )}
          </span>
        </div>

        <div className="skill-explore__grid">
          {catalogSkills.length > 0 ? (
            catalogSkills.map((entry) => {
              const isRecommended = isRecommendedPromptSkill(entry.slug);
              const isToggleable = isUserSkillToggleable(entry.slug);
              const isEnabled = enabledSkills.includes(entry.slug);
              // 重试语义：重新持久化界面当前显示的目标，不得取反；remount 后仍从 Redux 乐观值恢复同一目标
              const targetOnRetry =
                failedTargets[entry.slug] !== undefined
                  ? failedTargets[entry.slug]
                  : isEnabled;
              return (
                <SkillCard
                  key={entry.slug}
                  entry={entry}
                  isRecommended={isRecommended}
                  isComposite={isCompositeSkill(entry, allSkills)}
                  isToggleable={isToggleable}
                  isEnabled={isEnabled}
                  userId={userId}
                  onToggleSkill={isToggleable ? handleToggleSkill : undefined}
                  isSaving={isSkillSaving(entry.slug)}
                  isWriteFailed={isSkillsWriteFailed}
                  saveError={saveErrors[entry.slug] ?? null}
                  onRetrySave={() =>
                    handleToggleSkill(entry.slug, targetOnRetry)
                  }
                  onOpenDetail={handleOpenDetail}
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
      </div>

      {/* 详情弹窗 */}
      <SkillDetailModal
        entry={activeDetailEntry}
        allSkills={allSkills}
        isEnabled={
          activeDetailEntry ? enabledSkills.includes(activeDetailEntry.slug) : false
        }
        isRecommended={
          activeDetailEntry ? isRecommendedPromptSkill(activeDetailEntry.slug) : false
        }
        isComposite={
          activeDetailEntry ? isCompositeSkill(activeDetailEntry, allSkills) : false
        }
        isToggleable={
          activeDetailEntry ? isUserSkillToggleable(activeDetailEntry.slug) : false
        }
        userId={userId}
        onToggleSkill={handleToggleSkill}
        isSaving={activeDetailEntry ? isSkillSaving(activeDetailEntry.slug) : false}
        isWriteFailed={isSkillsWriteFailed}
        saveError={
          activeDetailEntry ? saveErrors[activeDetailEntry.slug] ?? null : null
        }
        onRetrySave={
          activeDetailEntry
            ? () => {
                const target =
                  failedTargets[activeDetailEntry.slug] !== undefined
                    ? failedTargets[activeDetailEntry.slug]
                    : enabledSkills.includes(activeDetailEntry.slug);
                return handleToggleSkill(activeDetailEntry.slug, target);
              }
            : undefined
        }
        onClose={handleCloseDetail}
        onSelectAnotherSkill={(next) => setActiveDetailEntry(next)}
      />
    </section>
  );
};

export default SkillExplore;
