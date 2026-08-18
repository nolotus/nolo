import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "app/routing";

import { useAppDispatch } from "app/store";
import { resolveReferenceAssets } from "ai/agent/referenceUtils";
import { summarizeSkillReferences } from "ai/skills/skillReferenceSummary";
import { toolDescriptions } from "ai/tools";
import ToolSelector from "ai/tools/ToolSelector";
import CapabilityPackSelector from "ai/tools/CapabilityPackSelector";
import { FormField } from "render/web/form/FormField";
import Button from "render/web/ui/Button";
import { Dialog } from "render/web/ui/modal/Dialog";
import ReferencesSelector from "./ReferencesSelector";
import { LuBot, LuBrain, LuInfo, LuLightbulb, LuSparkles, LuWrench, LuX } from "react-icons/lu";
import type { FormData } from "../createAgentSchema";
import {
  buildAgentSkillConfigPatch,
  resolveAgentSkillConfig,
  type AgentSkillConfig,
} from "ai/tools/agentSkillConfig";

type ReferenceItem = {
  dbKey: string;
  title?: string;
  type: "knowledge" | "instruction";
};

type ToolsTabFieldProps = {
  value: string[];
  onChange: (nextValue: string[]) => void;
  references: ReferenceItem[];
  referencesError?: string | null;
  setValue: (name: string, value: unknown) => void;
  disabledTools?: string[];
  onDisabledToolsChange?: (disabledTools: string[]) => void;
  enabledPacks?: string[];
  skills?: Record<string, "required" | "recommended">;
  /** 三态写入：内部做 skills + enabledPacks 双写。 */
  onSkillConfigChange?: (next: AgentSkillConfig) => void;
};

type SkillModeState = {
  loading: boolean;
  skillSummaries: ReturnType<typeof summarizeSkillReferences>;
  referencedTools: string[];
  recommendedSkillHints: string[];
  skillPromptPatches: string[];
};

const EMPTY_SKILL_MODE_STATE: SkillModeState = {
  loading: false,
  skillSummaries: [],
  referencedTools: [],
  recommendedSkillHints: [],
  skillPromptPatches: [],
};

const getToolDisplayLabel = (
  toolId: string,
  t: ReturnType<typeof useTranslation>["t"]
) => {
  const translationKey = toolDescriptions[toolId]?.name;
  if (!translationKey) return toolId;
  const translated = t(translationKey as any);
  return typeof translated === "string" ? translated : toolId;
};

const ToolsTabField: React.FC<ToolsTabFieldProps> = ({
  value,
  onChange,
  references,
  referencesError,
  setValue,
  disabledTools,
  onDisabledToolsChange,
  enabledPacks,
  skills,
  onSkillConfigChange,
}) => {
  const { t } = useTranslation("ai");
  const dispatch = useAppDispatch();
  const [skillPickerOpen, setSkillPickerOpen] = useState(false);
  const [manualToolsExpanded, setManualToolsExpanded] = useState(false);
  const [activeDetailKey, setActiveDetailKey] = useState<string | null>(null);
  const [skillState, setSkillState] = useState<SkillModeState>(EMPTY_SKILL_MODE_STATE);
  const referencesSignature = JSON.stringify(
    references.map((reference) => [reference.dbKey, reference.type, reference.title ?? ""])
  );

  useEffect(() => {
    let cancelled = false;

    const loadSkillState = async () => {
      if (!Array.isArray(references) || references.length === 0) {
        if (!cancelled) {
          setSkillState(EMPTY_SKILL_MODE_STATE);
        }
        return;
      }

      setSkillState((prev) => ({ ...prev, loading: true }));

      try {
        const resolved = await resolveReferenceAssets(references as any, dispatch);
        if (cancelled) return;

        setSkillState({
          loading: false,
          skillSummaries: summarizeSkillReferences(
            resolved.references,
            resolved.contentByKey
          ),
          referencedTools: resolved.referencedTools,
          recommendedSkillHints: resolved.recommendedSkillHints,
          skillPromptPatches: resolved.skillPromptPatches,
        });
      } catch {
        if (!cancelled) {
          setSkillState(EMPTY_SKILL_MODE_STATE);
        }
      }
    };

    void loadSkillState();

    return () => {
      cancelled = true;
    };
  }, [dispatch, referencesSignature]);

  const runtimeToolIds = useMemo(
    () => Array.from(new Set([...value, ...skillState.referencedTools])),
    [skillState.referencedTools, value]
  );

  const runtimeToolLabels = useMemo(
    () =>
      runtimeToolIds.map((toolId) => ({
        id: toolId,
        label: getToolDisplayLabel(toolId, t),
      })),
    [runtimeToolIds, t]
  );

  const updateReferences = (nextReferences: ReferenceItem[]) => {
    setValue("references", nextReferences);
  };

  const removeSkillReference = (dbKey: string) => {
    updateReferences(references.filter((reference) => reference.dbKey !== dbKey));
  };

  const activeDetail =
    activeDetailKey != null
      ? (skillState.skillSummaries.find((s) => s.dbKey === activeDetailKey) ?? null)
      : null;

  return (
    <div className="tools-tab-panel">
      <section className="tools-tab-hero">
        <div className="tools-tab-hero__copy">
          <h3 className="tools-tab-hero__title">{t("toolsTab.title")}</h3>
          <p className="tools-tab-hero__description">{t("toolsTab.description")}</p>
        </div>
      </section>

      <section className="tools-tab-skills">
        <div className="tools-tab-section-heading tools-tab-section-heading--withActions">
          <div>
            <h4>{t("toolsTab.skillModeTitle")}</h4>
            <p>{t("toolsTab.skillModeDescription")}</p>
          </div>

          <div className="tools-tab-skill-actions">
            <Button type="button" variant="secondary" onClick={() => setSkillPickerOpen(true)}>
              {t("references.addSkill")}
            </Button>
            <Button
              as={Link}
              to="/share/community"
              type="button"
              variant="ghost"
            >
              {t("references.exploreCommunitySkills")}
            </Button>
          </div>
        </div>

        {skillState.loading ? (
          <div className="tools-tab-summary__empty">{t("loading")}</div>
        ) : skillState.skillSummaries.length > 0 ? (
          <>
            <div className="tools-tab-skills__grid">
              {skillState.skillSummaries.map((skill) => (
                <article
                  key={skill.dbKey}
                  className="tools-tab-skill-card tools-tab-skill-card--selected"
                >
                  <div className="tools-tab-skill-card__header">
                    <span className="tools-tab-skill-card__icon" aria-hidden="true">
                      {skill.referenceType === "instruction" ? (
                        <LuLightbulb size={18} />
                      ) : (
                        <LuBrain size={18} />
                      )}
                    </span>
                    <div className="tools-tab-skill-card__meta">
                      <span className="tools-tab-skill-card__title">{skill.skillName}</span>
                      <span className="tools-tab-skill-card__state tools-tab-skill-card__state--selected">
                        {skill.referenceType === "instruction"
                          ? t("references.instruction")
                          : t("references.knowledge")}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="tools-tab-skill-card__info"
                      onClick={() => setActiveDetailKey(skill.dbKey)}
                      aria-label={t("toolsTab.viewSkillDetail")}
                    >
                      <LuInfo size={15} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="tools-tab-skill-card__remove"
                      onClick={() => removeSkillReference(skill.dbKey)}
                      aria-label={t("toolsTab.removeSkill")}
                    >
                      <LuX size={14} aria-hidden="true" />
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <Dialog
              isOpen={activeDetail != null}
              onClose={() => setActiveDetailKey(null)}
              title={activeDetail?.skillName}
              size="small"
            >
              {activeDetail ? (
                <div className="tools-tab-skill-detail">
                  {activeDetail.description ? (
                    <p className="tools-tab-skill-detail__description">{activeDetail.description}</p>
                  ) : null}

                  {activeDetail.toolNames.length > 0 ? (
                    <div className="tools-tab-skill-card__block">
                      <div className="tools-tab-skill-card__label">{t("toolsTab.boundTools")}</div>
                      <div className="tools-tab-skill-card__tools">
                        {activeDetail.toolNames.map((toolId) => (
                          <span key={toolId} className="tools-tab-skill-card__tool-chip">
                            {getToolDisplayLabel(toolId, t)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {activeDetail.requiredSkills.length > 0 ? (
                    <div className="tools-tab-skill-card__block">
                      <div className="tools-tab-skill-card__label">{t("toolsTab.requiredSkills")}</div>
                      <div className="tools-tab-skill-card__tools">
                        {activeDetail.requiredSkills.map((skillId) => (
                          <span key={skillId} className="tools-tab-skill-card__tool-chip">
                            {skillId}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {activeDetail.recommendedSkills.length > 0 ? (
                    <div className="tools-tab-skill-card__block">
                      <div className="tools-tab-skill-card__label">{t("toolsTab.recommendedSkills")}</div>
                      <div className="tools-tab-skill-card__tools">
                        {activeDetail.recommendedSkills.map((skillId) => (
                          <span key={skillId} className="tools-tab-skill-card__tool-chip">
                            {skillId}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {activeDetail.promptPatch ? (
                    <div className="tools-tab-skill-card__patch">
                      <LuBot size={15} aria-hidden="true" />
                      <span>{activeDetail.promptPatch}</span>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </Dialog>
          </>
        ) : (
          <div className="tools-tab-empty-state">
            <div className="tools-tab-summary__empty">{t("toolsTab.noSkillsSelected")}</div>
            <div className="tools-tab-skill-actions">
              <Button type="button" variant="secondary" onClick={() => setSkillPickerOpen(true)}>
                {t("references.addSkill")}
              </Button>
            </div>
          </div>
        )}
      </section>

      <section className="tools-tab-capability-packs">
        <div className="tools-tab-section-heading">
          <h4>能力</h4>
          <p>开启 agent 需要的能力包，每个包包含一组协同的工具。</p>
        </div>
        <CapabilityPackSelector
          // 读时兼容：有 skills 用 skills，没有则从 enabledPacks 派生
          // （勾过的 = 完整启用），存量 agent 打开表单不需要迁移。
          value={resolveAgentSkillConfig({ skills, enabledPacks })}
          onChange={onSkillConfigChange || (() => {})}
          disabledTools={disabledTools}
          onDisabledToolsChange={onDisabledToolsChange}
        />
      </section>

      <section className="tools-tab-raw-tools">
        <div className="tools-tab-section-heading tools-tab-section-heading--withActions">
          <div>
            <h4>{t("toolsTab.toolModeTitle")}</h4>
            <p>{t("toolsTab.toolModeDescription")}</p>
          </div>

          <Button
            type="button"
            variant="ghost"
            onClick={() => setManualToolsExpanded((prev) => !prev)}
          >
            {manualToolsExpanded
              ? t("toolsTab.hideManualTools")
              : t("toolsTab.showManualTools")}
          </Button>
        </div>

        {manualToolsExpanded ? (
          <>
            <div className="tools-tab-skill-banner tools-tab-skill-banner--subtle">
              <span className="tools-tab-skill-banner__icon" aria-hidden="true">
                <LuWrench size={16} />
              </span>
              <div className="tools-tab-skill-banner__copy">
                <strong>{t("toolsTab.manualToolsTitle")}</strong>
                <span>{t("toolsTab.manualToolsDescription")}</span>
              </div>
            </div>

            <ToolSelector
              value={value}
              onChange={onChange}
              disabledTools={disabledTools}
              onDisabledToolsChange={onDisabledToolsChange}
            />
          </>
        ) : (
          <div className="tools-tab-collapsed-note">
            {t("toolsTab.manualToolsCollapsed", { count: value.length })}
          </div>
        )}
      </section>

      <section className="tools-tab-summary">
        <div className="tools-tab-section-heading">
          <h4>{t("toolsTab.summaryTitle")}</h4>
          <p>
            {t("toolsTab.summaryDescription", {
              skillCount: skillState.skillSummaries.length,
              toolCount: runtimeToolIds.length,
            })}
          </p>
        </div>

        {skillState.recommendedSkillHints.length > 0 ? (
          <div className="tools-tab-summary__subsection">
            <div className="tools-tab-skill-card__label">{t("toolsTab.recommendedHints")}</div>
            <div className="tools-tab-summary__chips">
              {skillState.recommendedSkillHints.map((hint) => (
                <span key={hint} className="tools-tab-summary__chip">
                  {hint}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {skillState.skillPromptPatches.length > 0 ? (
          <div className="tools-tab-summary__subsection">
            <div className="tools-tab-skill-card__label">{t("toolsTab.runtimeGuidance")}</div>
            <div className="tools-tab-summary__guidance">
              {skillState.skillPromptPatches.map((patch) => (
                <div key={patch} className="tools-tab-skill-card__patch">
                  <LuSparkles size={15} aria-hidden="true" />
                  <span>{patch}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {runtimeToolLabels.length > 0 ? (
          <div className="tools-tab-summary__chips">
            {runtimeToolLabels.map((tool) => (
              <span key={tool.id} className="tools-tab-summary__chip">
                {tool.label}
              </span>
            ))}
          </div>
        ) : (
          <div className="tools-tab-summary__empty">{t("toolsTab.noToolsSelected")}</div>
        )}
      </section>

      <Dialog
        isOpen={skillPickerOpen}
        onClose={() => setSkillPickerOpen(false)}
        title={t("references.addSkill")}
        size="large"
      >
        <div className="tools-tab-dialogBody">
          <div className="tools-tab-dialogHelp">{t("references.skillsHelp")}</div>
          {referencesError ? (
            <div className="tools-tab-dialogError">{referencesError}</div>
          ) : null}
          <ReferencesSelector
            value={references}
            onChange={updateReferences}
            pickerMode="skill"
          />
        </div>
      </Dialog>
    </div>
  );
};

const ToolsTab = ({
  errors,
  values,
  set,
  initialValues,
}: {
  errors: Record<string, string>;
  values: FormData;
  set: (name: string, value: unknown) => void;
  initialValues?: any;
}) => {
  const commonProps = { horizontal: false };
  const references = (values.references || []) as ReferenceItem[];
  const referencesError = errors.references;

  const skills = (values.skills || {}) as Record<string, "required" | "recommended">;
  const enabledPacks = (values.enabledPacks || []) as string[];

  return (
    <div className="tools-tab-container">
      <section className="tools-selection-card">
        <FormField error={errors.tools} {...commonProps}>
          <ToolsTabField
            value={(values.tools || []) as string[]}
            onChange={(v) => set("tools", v)}
            references={references}
            referencesError={referencesError}
            setValue={set}
            disabledTools={(values.disabledTools || []) as string[]}
            onDisabledToolsChange={(v) => set("disabledTools", v)}
            enabledPacks={enabledPacks}
            skills={skills}
            onSkillConfigChange={(next) => {
              // 双写：新字段是真相源，enabledPacks 是给尚未迁移的
              // 读取方与旧客户端的降级。降级有损（recommended 无
              // 对应物），所以两个都必须写——只写 enabledPacks 的话
              // 「启用」档下次读取会退化成「禁用」。
              const patch = buildAgentSkillConfigPatch(
                next,
                resolveAgentSkillConfig({
                  skills,
                  enabledPacks,
                }),
              );
              set("skills", patch.skills);
              set("enabledPacks", patch.enabledPacks);
            }}
          />
        </FormField>
      </section>
    </div>
  );
};

export default ToolsTab;
