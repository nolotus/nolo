/**
 * 模型参数调优——从 AdvancedSettingsTab 拆出。
 *
 * 包含：temperature / top_p / max_tokens / frequency_penalty / presence_penalty
 * + reasoning_effort。默认折叠，90% 用户不关心。
 */

import React, { useState, useCallback } from "react";
import { Controller, type Control, type FieldErrors, type UseFormSetValue } from "react-hook-form";
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
  errors: FieldErrors<FormData>;
  control: Control<FormData>;
  setValue: UseFormSetValue<FormData>;
  readOnly?: boolean;
};

const ModelParamsSection: React.FC<ModelParamsSectionProps> = ({
  errors,
  control,
  setValue,
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
      const field = FORM_MAP[c.key];
      setValue(field, undefined as never, { shouldDirty: true });
    });
  }, [setValue]);

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
            {PARAM_CONFIGS.map((c) =>
              c.key === "maxTokens" ? (
                <div key={c.key} className="adv-settings__item">
                  <FormField
                    label={t(`form.${c.key}`)}
                    helperText={t(`help.${c.key}`)}
                    horizontal={false}
                  >
                    <Controller
                      name={FORM_MAP[c.key]}
                      control={control}
                      render={({ field }) => {
                        const rawValue = field.value;
                        const isUnset =
                          rawValue === null || rawValue === undefined;
                        // 展开态：字段已有值时默认展开，
                        // 或用户点过「自定义」切到本地展开态。
                        const isExpanded = maxTokensExpanded || !isUnset;
                        // 滑块显示值沿用既有「显示用默认」惯例：
                        // 未设置时停在 c.default 位置但不写表单。
                        // 输入框与滑块共享同一表单字段（field.value），
                        // 拖滑块 → 输入框跟着变；输入框改值 → 滑块跟着动。
                        const sliderValue = (field.value ?? c.default) as number;
                        const inputValue = isUnset
                          ? ""
                          : String(field.value as number);
                        return (
                          <div className="adv-settings__max-tokens">
                            {isExpanded ? (
                              <>
                                <Slider
                                  value={sliderValue}
                                  onChange={field.onChange}
                                  min={c.min}
                                  max={c.max}
                                  step={c.step}
                                  showValue
                                />
                                {/* 精确输入框：量程 50 万配 step 1 时滑块每像素跨数千
                                    token，常用值（如 8000）几乎拖不准。这里让用户能
                                    直接键入目标值精确落位。与滑块共享同一表单字段，
                                    双向同步。越界（<1 或 >MAX_TOKENS_LIMIT）给明确
                                    错误提示，不静默截断成别的值。
                                    空输入 = 未设置（跟随模型默认），走
                                    field.onChange(null as never)。 */}
                                <Input
                                  type="number"
                                  inputMode="numeric"
                                  size="sm"
                                  value={inputValue}
                                  placeholder={
                                    isUnset
                                      ? t("form.maxTokensInputPlaceholder")
                                      : ""
                                  }
                                  min={c.min}
                                  max={c.max}
                                  error={
                                    !isUnset &&
                                    (Number(field.value as number) <
                                      (c.min ?? 1) ||
                                      Number(field.value as number) >
                                        (c.max ?? MAX_TOKENS_LIMIT))
                                  }
                                  helperText={
                                    !isUnset &&
                                    (Number(field.value as number) <
                                      (c.min ?? 1) ||
                                      Number(field.value as number) >
                                        (c.max ?? MAX_TOKENS_LIMIT))
                                      ? t("validation.maxTokensRange", {
                                          min: c.min ?? 1,
                                          max: c.max ?? MAX_TOKENS_LIMIT,
                                        })
                                      : undefined
                                  }
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    if (raw === "") {
                                      // 空输入 = 未设置（跟随模型默认），
                                      // 与「跟随模型默认」按钮语义一致。
                                      // 走 null 而非 undefined：编辑模式下
                                      // undefined 会被 buildSubmitPayload 删出
                                      // payload 导致后端保留旧值。
                                      field.onChange(null as never);
                                      return;
                                    }
                                    const n = Number(raw);
                                    if (!Number.isNaN(n)) {
                                      // 受 min/max 约束（引用同一常量），
                                      // 但不在输入过程中强制截断，只在落值时夹紧，
                                      // 避免用户输入 "8000" 过程中被改成 "8"。
                                      // 越界时仍写值并标红，让用户看到自己输的数字
                                      // 与错误提示，而非静默截成别的值。
                                      field.onChange(n as never);
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
                                onClick={() => {
                                  // 只切本地展开态，不写表单值；
                                  // 滑块停在默认位置，未拖动时字段仍是未设置，
                                  // payload 不含 max_tokens，走 provider 默认。
                                  setMaxTokensExpanded(true);
                                }}
                              >
                                {t("form.maxTokensSetCustom")}
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="small"
                                type="button"
                                onClick={() => {
                                  // 编辑模式下 null 会保留进 payload，
                                  // 后端 patch 才会真正删掉字段；
                                  // undefined 会被 buildSubmitPayload 剔除，
                                  // 导致后端保留旧值，界面与存储不一致。
                                  field.onChange(null as never);
                                  field.onBlur();
                                  // 清空后收起，回到「跟随模型默认」态。
                                  setMaxTokensExpanded(false);
                                }}
                              >
                                {t("form.maxTokensClearToDefault")}
                              </Button>
                            )}
                          </div>
                        );
                      }}
                    />
                  </FormField>
                </div>
              ) : (
                <div key={c.key} className="adv-settings__item">
                  <FormField
                    label={t(`form.${c.key}`)}
                    helperText={t(`help.${c.key}`)}
                    horizontal={false}
                  >
                    <Controller
                      name={FORM_MAP[c.key]}
                      control={control}
                      // 这里不再使用 defaultValue 把默认值写进表单；
                      // 只在 UI 层用 ?? c.default 展示默认。
                      render={({ field }) =>
                        c.options ? (
                          <RadioGroup
                            value={(field.value ?? c.default) as any}
                            onChange={field.onChange}
                            options={c.options.map((o) => ({
                              label: o,
                              value: o,
                            }))}
                          />
                        ) : (
                          <Slider
                            value={(field.value ?? c.default) as any}
                            onChange={field.onChange}
                            min={c.min}
                            max={c.max}
                            step={c.step}
                            showValue
                          />
                        )
                      }
                    />
                  </FormField>
                </div>
              ),
            )}
          </div>
        ) : null}

    </section>
  );
};

export default ModelParamsSection;
