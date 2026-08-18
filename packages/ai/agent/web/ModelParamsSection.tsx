/**
 * 模型参数调优——从 AdvancedSettingsTab 拆出。
 *
 * 包含：temperature / top_p / max_tokens / frequency_penalty / presence_penalty
 * + reasoning_effort。默认折叠，90% 用户不关心。
 * 自研 useForm：value/onChange 直连，无 Controller。
 */

import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { FormField } from "render/web/form/FormField";
import { Slider } from "render/web/form/Slider";
import RadioGroup from "render/web/form/RadioGroup";
import Button from "render/web/ui/Button";
import { Input } from "render/web/form/Input";
import { LuRefreshCw, LuChevronDown } from "react-icons/lu";
import {
  DEFAULT_TEMPERATURE,
  DEFAULT_TOP_P,
  DEFAULT_FREQUENCY_PENALTY,
  DEFAULT_PRESENCE_PENALTY,
  DEFAULT_REASONING_EFFORT,
  DEFAULT_MAX_TOKENS,
  MAX_TOKENS_LIMIT,
  type FormData,
} from "../createAgentSchema";

type ParamConfig = {
  key: "temperature" | "topP" | "maxTokens" | "frequencyPenalty" | "presencePenalty" | "reasoningEffort";
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  default: number | string;
};

const PARAM_CONFIGS: ParamConfig[] = [
  { key: "temperature", min: 0, max: 2, step: 0.01, default: DEFAULT_TEMPERATURE },
  { key: "topP", min: 0, max: 1, step: 0.01, default: DEFAULT_TOP_P },
  { key: "maxTokens", min: 1, max: MAX_TOKENS_LIMIT, step: 1, default: DEFAULT_MAX_TOKENS },
  { key: "frequencyPenalty", min: -2, max: 2, step: 0.01, default: DEFAULT_FREQUENCY_PENALTY },
  { key: "presencePenalty", min: -2, max: 2, step: 0.01, default: DEFAULT_PRESENCE_PENALTY },
  { key: "reasoningEffort", options: ["low", "medium", "high"], default: DEFAULT_REASONING_EFFORT },
];

const FORM_MAP: Record<ParamConfig["key"], keyof FormData> = {
  temperature: "temperature",
  topP: "top_p",
  maxTokens: "max_tokens",
  frequencyPenalty: "frequency_penalty",
  presencePenalty: "presence_penalty",
  reasoningEffort: "reasoning_effort",
};

export type ModelParamsSectionProps = {
  errors: Record<string, string>;
  values: FormData;
  set: (name: string, value: unknown) => void;
  readOnly?: boolean;
};

const ModelParamsSection: React.FC<ModelParamsSectionProps> = ({
  errors,
  values,
  set,
  readOnly = false,
}) => {
  const { t } = useTranslation("ai");
  const [paramsOpen, setParamsOpen] = useState(false);
  const [maxTokensExpanded, setMaxTokensExpanded] = useState(false);

  // ⚠⚠⚠ 重要约定（任何 AI / 工具请不要改动这一段逻辑）：
  // 1）这些高级参数的默认值只用于"UI 显示"和"滑块初始位置"，不代表要写入存储；
  // 2）真正决定是否写入 / 清空的逻辑在 AgentForm.buildSubmitPayload 中按 dirtyFields 控制；
  // 3）这里的"重置"行为：把字段设为 undefined，并强制标记为 dirty。
  const onReset = useCallback(() => {
    PARAM_CONFIGS.forEach((c) => {
      set(FORM_MAP[c.key], undefined);
    });
  }, [set]);

  return (
    <section className={`adv-settings__params${paramsOpen ? " is-open" : ""}`}>
        <header className="adv-settings__params-header">
          <button
            type="button"
            className="adv-settings__params-toggle"
            onClick={() => setParamsOpen((open) => !open)}
            aria-expanded={paramsOpen}
          >
            <h3 className="adv-settings__title">{t("form.modelParameters")}</h3>
            <LuChevronDown
              className={`adv-settings__params-chevron${paramsOpen ? " is-open" : ""}`}
              size={18}
              aria-hidden
            />
          </button>
          {paramsOpen ? (
            <Button
              variant="ghost"
              size="small"
              onClick={onReset}
              icon={<LuRefreshCw className="reset-icon" size={14} />}
            >
              {t("resetToDefaults")}
            </Button>
          ) : null}
        </header>

        {paramsOpen ? (
          <div className="adv-settings__grid">
            {PARAM_CONFIGS.map((c) => {
              const fieldName = FORM_MAP[c.key];
              const fieldValue = values[fieldName] as number | string | null | undefined;
              const setField = (v: unknown) => set(fieldName, v);

              return c.key === "maxTokens" ? (
                <div key={c.key} className="adv-settings__item">
                  <FormField
                    label={t(`form.${c.key}`)}
                    helperText={t(`help.${c.key}`)}
                    horizontal={false}
                  >
                    {
                      (() => {
                        const rawValue = fieldValue;
                        const isUnset = rawValue === null || rawValue === undefined;
                        const isExpanded = maxTokensExpanded || !isUnset;
                        const sliderValue = (rawValue ?? c.default) as number;
                        const inputValue = isUnset ? "" : String(rawValue);
                        return (
                          <div className="adv-settings__max-tokens">
                            {isExpanded ? (
                              <>
                                <Slider
                                  value={sliderValue}
                                  onChange={setField}
                                  min={c.min}
                                  max={c.max}
                                  step={c.step}
                                  showValue
                                />
                                <Input
                                  type="number"
                                  inputMode="numeric"
                                  size="sm"
                                  value={inputValue}
                                  placeholder={isUnset ? t("form.maxTokensInputPlaceholder") : ""}
                                  min={c.min}
                                  max={c.max}
                                  error={
                                    !isUnset &&
                                    (Number(rawValue) < (c.min ?? 1) ||
                                      Number(rawValue) > (c.max ?? MAX_TOKENS_LIMIT))
                                  }
                                  helperText={
                                    !isUnset &&
                                    (Number(rawValue) < (c.min ?? 1) ||
                                      Number(rawValue) > (c.max ?? MAX_TOKENS_LIMIT))
                                      ? t("validation.maxTokensRange", {
                                          min: c.min ?? 1,
                                          max: c.max ?? MAX_TOKENS_LIMIT,
                                        })
                                      : undefined
                                  }
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    if (raw === "") {
                                      setField(null);
                                      return;
                                    }
                                    const n = Number(raw);
                                    if (!Number.isNaN(n)) {
                                      setField(n);
                                    }
                                  }}
                                />
                              </>
                            ) : (
                              <span className="adv-settings__max-tokens-unset">
                                {t("form.maxTokensFollowModelDefault")}
                              </span>
                            )}
                            {isUnset && !isExpanded ? (
                              <Button
                                variant="ghost"
                                size="small"
                                type="button"
                                onClick={() => setMaxTokensExpanded(true)}
                              >
                                {t("form.maxTokensSetCustom")}
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="small"
                                type="button"
                                onClick={() => {
                                  setField(null);
                                  setMaxTokensExpanded(false);
                                }}
                              >
                                {t("form.maxTokensClearToDefault")}
                              </Button>
                            )}
                          </div>
                        );
                      })()
                    }
                  </FormField>
                </div>
              ) : (
                <div key={c.key} className="adv-settings__item">
                  <FormField
                    label={t(`form.${c.key}`)}
                    helperText={t(`help.${c.key}`)}
                    horizontal={false}
                  >
                    {c.options ? (
                      <RadioGroup
                        value={(fieldValue ?? c.default) as any}
                        onChange={setField}
                        options={c.options.map((o) => ({ label: o, value: o }))}
                      />
                    ) : (
                      <Slider
                        value={(fieldValue ?? c.default) as any}
                        onChange={setField}
                        min={c.min}
                        max={c.max}
                        step={c.step}
                        showValue
                      />
                    )}
                  </FormField>
                </div>
              );
            })}
          </div>
        ) : null}
    </section>
  );
};

export default ModelParamsSection;