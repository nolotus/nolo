/**
 * 模型与来源区——从 AdvancedSettingsTab 拆出。
 *
 * 包含：apiSource 三卡选择、模型选择、API Key/URL、运行位置、CLI 信息。
 * 按 apiSource 分三个分支：platform / custom / cli。
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useWatch, type Control, type FieldErrors, type UseFormSetValue } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Input, PasswordInput } from "render/web/form/Input";
import { FormField } from "render/web/form/FormField";
import AllModelsSelector from "ai/llm/AllModelsSelector";
import { ModelOptionLabel } from "./ModelOptionLabel";
import { isVoiceModel } from "ai/agent/isVoiceModel";
import {
  type CliProvider,
  CLI_CAPABILITY_BY_PROVIDER,
  CLI_PROVIDER_DISPLAY_LABELS,
  type MachineSummary,
} from "ai/agent/cliProviders";
import {
  Select,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectIcon,
  SelectList,
  SelectItem,
  SelectItemText,
  SelectItemIndicator,
  SelectGroup,
  SelectGroupLabel,
} from "render/web/ui/Select";
import { Popover } from "render/web/ui/Popover";
import { LuChevronDown, LuCheck } from "react-icons/lu";
import type { ApiSourceType } from "./BasicInfoTab";
import { OAuthStatusBox } from "./OAuthStatusBox";
import type { ModelWithProvider } from "ai/llm/models";
import {
  applyProviderPresetFields,
  findOAuthProviderPresetIdByApiKeyRef,
  getProviderPresetDisplayLabel,
  isApiKeyTemplatePresetId,
  isOAuthProviderPresetId,
  listProviderPresetGroups,
  resolveProviderPresetFields,
} from "../providerPresetApply";
import { isLocalCustomProviderUrl } from "../createAgentSchema";
import { useAppSelector } from "app/store";
import { selectCurrentServer } from "app/settings/settingSlice";
import { useToken } from "identity";
import { normalizeServerOrigin } from "core/serverOrigin";
import type { FormData } from "../createAgentSchema";

// CLI 模型列表（从 AdvancedSettingsTab 提取）
const COPILOT_CLI_MODELS = [
  { value: "", label: "默认 (claude-sonnet-5)" },
  { value: "claude-sonnet-5", label: "Claude Sonnet 5（1x）" },
  { value: "claude-sonnet-4.6", label: "Claude Sonnet 4.6（1x）" },
  { value: "claude-sonnet-4.5", label: "Claude Sonnet 4.5（1x）" },
  { value: "claude-haiku-4.5", label: "Claude Haiku 4.5（0.33x）" },
  { value: "claude-opus-4.6", label: "Claude Opus 4.6（3x）" },
  { value: "claude-opus-4.6-fast", label: "Claude Opus 4.6 Fast（30x）" },
  { value: "claude-opus-4.5", label: "Claude Opus 4.5（3x）" },
  { value: "claude-sonnet-4", label: "Claude Sonnet 4（1x）" },
  { value: "gemini-3.7-flash", label: "Gemini 3.7 Flash" },
  { value: "gemini-3.6-flash", label: "Gemini 3.6 Flash" },
  { value: "gpt-5.6-sol", label: "GPT-5.6 Sol" },
  { value: "gpt-5.6-terra", label: "GPT-5.6 Terra" },
  { value: "gpt-5.6-luna", label: "GPT-5.6 Luna" },
  { value: "gpt-5.3-codex", label: "GPT-5.3-Codex" },
  { value: "gpt-5.2-codex", label: "GPT-5.2-Codex" },
  { value: "gpt-5.2", label: "GPT-5.2" },
  { value: "gpt-5.1-codex-max", label: "GPT-5.1-Codex-Max" },
  { value: "gpt-5.1-codex", label: "GPT-5.1-Codex" },
  { value: "gpt-5.1", label: "GPT-5.1" },
  { value: "gpt-5.1-codex-mini", label: "GPT-5.1-Codex-Mini" },
  { value: "gpt-4.1", label: "GPT-4.1" },
];

const GEMINI_CLI_MODELS = [
  { value: "", label: "默认 (gemini-3.7-flash)" },
  { value: "gemini-3.7-flash", label: "Gemini 3.7 Flash" },
  { value: "gemini-3.6-flash", label: "Gemini 3.6 Flash" },
];

const CODEX_CLI_MODELS = [
  { value: "", label: "默认" },
  { value: "gpt-5.6-sol", label: "GPT-5.6 Sol" },
  { value: "gpt-5.6-terra", label: "GPT-5.6 Terra" },
  { value: "gpt-5.6-luna", label: "GPT-5.6 Luna" },
  { value: "gpt-5.3-codex", label: "GPT-5.3 Codex" },
  { value: "gpt-5.2", label: "GPT-5.2" },
];

const CLAUDE_CLI_MODELS = [
  { value: "", label: "默认" },
  { value: "claude-sonnet-5", label: "Claude Sonnet 5" },
  { value: "claude-sonnet-4.6", label: "Claude Sonnet 4.6" },
  { value: "claude-sonnet-4.5", label: "Claude Sonnet 4.5" },
  { value: "claude-haiku-4.5", label: "Claude Haiku 4.5" },
  { value: "claude-opus-4.6", label: "Claude Opus 4.6" },
];

const AGY_CLI_MODELS = [
  { value: "", label: "默认" },
];

const API_SOURCE_LABELS: Record<ApiSourceType, string> = {
  platform: "平台 API",
  custom: "自定义 API",
  cli: "CLI（终端）",
};

export type ModelSourceSectionProps = {
  errors: FieldErrors<FormData>;
  control: Control<FormData>;
  setValue: UseFormSetValue<FormData>;
  apiSource: ApiSourceType;
  setApiSource: (next: ApiSourceType) => void;
  readOnly?: boolean;
};

const ModelSourceSection: React.FC<ModelSourceSectionProps> = ({
  errors,
  control,
  setValue,
  apiSource,
  setApiSource,
  readOnly = false,
}) => {
  const { t } = useTranslation("ai");
  const currentServer = useAppSelector(selectCurrentServer);
  const currentToken = useToken();
  const serverOrigin =
    normalizeServerOrigin(currentServer) ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const authToken = currentToken ?? "";
  const [machines, setMachines] = useState<MachineSummary[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("manual");
  const [machinesError, setMachinesError] = useState<string | null>(null);
  const common = { horizontal: true, labelWidth: "160px" };
  const isCustomApi = apiSource === "custom";
  const isCliApi = apiSource === "cli";
  const isPlatformApi = apiSource === "platform";
  const selectedCliProvider =
    (useWatch({ control, name: "cliProvider" }) as CliProvider | "") ||
    "copilot";
  const selectedMachineId = (useWatch({ control, name: "machineId" }) as string | undefined) || "";
  const modelValue = useWatch({ control, name: "model" }) as string | undefined;
  const apiKeyRefValue = useWatch({ control, name: "apiKeyRef" }) as string | undefined;
  const customProviderUrl = useWatch({ control, name: "customProviderUrl" }) as string | undefined;
  const isMachineBoundLocalCustomProvider =
    isCustomApi && isLocalCustomProviderUrl(customProviderUrl);

  const cliModels =
    selectedCliProvider === "gemini"
      ? GEMINI_CLI_MODELS
      : selectedCliProvider === "codex"
        ? CODEX_CLI_MODELS
        : selectedCliProvider === "claude"
          ? CLAUDE_CLI_MODELS
          : selectedCliProvider === "agy"
            ? AGY_CLI_MODELS
            : selectedCliProvider === "qoder" ||
                selectedCliProvider === "opencode" ||
                selectedCliProvider === "grok" ||
                selectedCliProvider === "kimi"
              ? []
              : COPILOT_CLI_MODELS;

  const selectedCliModelLabel =
    cliModels.find((m) => m.value === (modelValue || ""))?.label || modelValue || "默认";
  const cliProviderLabel = CLI_PROVIDER_DISPLAY_LABELS[selectedCliProvider];

  const serverBase = useMemo(() => {
    const configured = normalizeServerOrigin(currentServer);
    if (configured) return configured;
    return typeof window !== "undefined" ? window.location.origin : "";
  }, [currentServer]);

  const machineOptions = useMemo(() => {
    if (isMachineBoundLocalCustomProvider) {
      return machines.filter(
        (machine) =>
          machine.status === "online" && machine.connectorStatus === "connected"
      );
    }
    const requiredCapability = CLI_CAPABILITY_BY_PROVIDER[selectedCliProvider];
    return machines.filter(
      (machine) =>
        machine.status === "online" &&
        machine.connectorStatus === "connected" &&
        machine.capabilities.includes(requiredCapability)
    );
  }, [isMachineBoundLocalCustomProvider, machines, selectedCliProvider]);

  const selectedMachine = machines.find((machine) => machine.machineId === selectedMachineId);
  const selectedMachineOption = useMemo(() => {
    if (!selectedMachineId) return null;
    if (machineOptions.some((machine) => machine.machineId === selectedMachineId)) return null;
    return selectedMachine ?? {
      machineId: selectedMachineId,
      name: "预选电脑",
      platform: "",
      arch: "",
      capabilities: [],
      connectorStatus: "disconnected" as const,
      status: "offline" as const,
    };
  }, [machineOptions, selectedMachine, selectedMachineId]);

  const machineOptionsWithSelection = useMemo(
    () => selectedMachineOption ? [selectedMachineOption, ...machineOptions] : machineOptions,
    [machineOptions, selectedMachineOption]
  );

  useEffect(() => {
    if (
      (!isCliApi && !isMachineBoundLocalCustomProvider) ||
      selectedMachineId ||
      machineOptions.length !== 1
    ) {
      return;
    }
    setValue("machineId", machineOptions[0].machineId, { shouldDirty: true });
  }, [isCliApi, isMachineBoundLocalCustomProvider, machineOptions, selectedMachineId, setValue]);

  useEffect(() => {
    if ((!isCliApi && !isMachineBoundLocalCustomProvider) || !currentToken || !serverBase) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`${serverBase}/api/machines`, {
          method: "GET",
          cache: "no-store",
          headers: { Authorization: `Bearer ${currentToken}` },
        });
        const data = await response.json().catch(() => ({})) as {
          machines?: MachineSummary[];
          error?: string;
        };
        if (cancelled) return;
        if (data.machines) {
          setMachines(data.machines);
          setMachinesError(null);
        } else if (data.error) {
          setMachinesError(data.error);
        }
      } catch {
        if (!cancelled) setMachinesError("无法获取在线电脑列表");
      }
    })();
    return () => { cancelled = true; };
  }, [isCliApi, isMachineBoundLocalCustomProvider, currentToken, serverBase]);

  const handleApiSourceChange = (next: ApiSourceType) => {
    setValue("apiSource", next);
    setApiSource(next);
    if (next === "custom") {
      setValue("useServerProxy", true);
    }
    if (next !== "custom") {
      setValue("customProviderUrl", "");
      setValue("apiKey", "");
    }
    if (next !== "cli") {
      setValue("cliProvider", "");
    }
    if (next === "cli" && !selectedCliProvider) {
      setValue("cliProvider", "copilot");
    }
    if (next === "platform") {
      setValue("model", "");
    }
  };

  const handlePresetChange = useCallback(
    (id: string) => {
      setSelectedPresetId(id);
      const fields = resolveProviderPresetFields(id);
      applyProviderPresetFields(fields, (key, value) => {
        setValue(key as keyof FormData, value as never, { shouldValidate: true });
      });
    },
    [setValue],
  );

  useEffect(() => {
    if (!isCustomApi) return;
    const oauthPresetId = findOAuthProviderPresetIdByApiKeyRef(apiKeyRefValue);
    if (oauthPresetId && oauthPresetId !== selectedPresetId) {
      setSelectedPresetId(oauthPresetId);
    }
  }, [apiKeyRefValue, isCustomApi, selectedPresetId]);

  const isOAuthPreset = isOAuthProviderPresetId(selectedPresetId);
  const isTemplatePreset = isApiKeyTemplatePresetId(selectedPresetId);
  const providerPresetGroups = listProviderPresetGroups();
  const selectedPresetFields = resolveProviderPresetFields(selectedPresetId);
  const selectedModelOptions = selectedPresetFields.modelOptions;

  return (
    <section className="adv-settings__model">
        {readOnly ? (
          <>
            <FormField label={t("form.apiSource")} {...common}>
              <div className="readonly-value">{API_SOURCE_LABELS[apiSource]}</div>
            </FormField>

            {isPlatformApi && (
              <FormField label={t("form.model")} required error={errors.model?.message} {...common}>
                <Controller
                  name="model"
                  control={control}
                  render={({ field }) => (
                    <AllModelsSelector
                      value={field.value ?? null}
                      onChange={(selected: ModelWithProvider | null) => {
                        if (selected) {
                          field.onChange(selected.name);
                          setValue("provider", selected.provider, { shouldValidate: true });
                          setValue("hasVision", Boolean(selected.hasVision), {
                            shouldValidate: true,
                          });
                          // 交互模式由模型倒推：语音模型 → live_audio，其余 → text
                          setValue(
                            "defaultInteractionMode",
                            isVoiceModel(selected.name, selected.provider)
                              ? "live_audio"
                              : "text",
                            { shouldValidate: true },
                          );
                        } else {
                          field.onChange("");
                          setValue("provider", "", { shouldValidate: true });
                          setValue("hasVision", false, { shouldValidate: true });
                          setValue("defaultInteractionMode", "text", {
                            shouldValidate: true,
                          });
                        }
                      }}
                      error={!!errors.model}
                      disabled={true}
                    />
                  )}
                />
              </FormField>
            )}

            {isCustomApi && (
              <div className="custom-api-box">
                <FormField label={t("form.model")} required error={errors.model?.message} {...common}>
                  <div className="readonly-value">{modelValue || "-"}</div>
                </FormField>

                <FormField label={t("form.customProviderUrl")} error={errors.customProviderUrl?.message} {...common}>
                  <div className="readonly-value readonly-value--break">{customProviderUrl || "-"}</div>
                </FormField>
              </div>
            )}

            {isCliApi && (
              <div className="custom-api-box">
                <FormField label="CLI 工具" {...common}>
                  <div className="readonly-value">{cliProviderLabel}</div>
                </FormField>

                <FormField label={t("form.model")} {...common}>
                  <div className="readonly-value">{selectedCliModelLabel}</div>
                </FormField>

                <FormField label="运行位置" {...common}>
                  <div className="readonly-value">
                    {selectedMachine
                      ? `${selectedMachine.name} (${selectedMachine.platform}/${selectedMachine.arch})`
                      : "本地/服务器默认 CLI 环境"}
                  </div>
                </FormField>
              </div>
            )}
          </>
        ) : (
          <>
            <FormField label={t("form.apiSource")} {...common}>
              <Controller
                name="apiSource"
                control={control}
                render={() => (
                  <div className="api-source-selector">
                    {[
                      { value: "platform" as ApiSourceType, label: "平台 API", desc: "使用平台密钥" },
                      { value: "custom" as ApiSourceType, label: "自定义 API", desc: "自己的密钥" },
                      { value: "cli" as ApiSourceType, label: "CLI（终端）", desc: "gh copilot 等" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`api-source-btn ${apiSource === opt.value ? "is-active" : ""}`}
                        onClick={() => handleApiSourceChange(opt.value)}
                      >
                        <span className="api-source-btn__label">{opt.label}</span>
                        <span className="api-source-btn__desc">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                )}
              />
            </FormField>

            {!isCustomApi && (
              <FormField label={t("form.model")} required error={errors.model?.message} {...common}>
                <Controller
                  name="model"
                  control={control}
                  render={({ field }) =>
                    isCliApi ? (
                      <Select
                        className="cli-select"
                        selectedKey={field.value || ""}
                        onSelectionChange={(key) =>
                          field.onChange(String(key ?? ""))
                        }
                      >
                        {cliModels.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            id={opt.value}
                            textValue={opt.label}
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </Select>
                    ) : (
                      <AllModelsSelector
                        value={field.value ?? null}
                        onChange={(selected: ModelWithProvider | null) => {
                          if (selected) {
                            field.onChange(selected.name);
                            setValue("provider", selected.provider, { shouldValidate: true });
                            setValue("hasVision", Boolean(selected.hasVision), {
                              shouldValidate: true,
                            });
                            // 交互模式由模型倒推：语音模型 → live_audio，其余 → text
                            setValue(
                              "defaultInteractionMode",
                              isVoiceModel(selected.name, selected.provider)
                                ? "live_audio"
                                : "text",
                              { shouldValidate: true },
                            );
                          } else {
                            field.onChange("");
                            setValue("provider", "", { shouldValidate: true });
                            setValue("hasVision", false, { shouldValidate: true });
                            setValue("defaultInteractionMode", "text", {
                              shouldValidate: true,
                            });
                          }
                        }}
                        error={!!errors.model}
                      />
                    )
                  }
                />
              </FormField>
            )}

            {isCustomApi && (
              <div className="custom-api-box">
                <FormField label="Provider" required {...common}>
                  <SelectRoot
                    selectedKey={selectedPresetId}
                    onSelectionChange={(v) => handlePresetChange(v as string)}
                  >
                    <SelectTrigger className="cli-select nolo-select-trigger">
                      <SelectValue>
                        {() => {
                          const v = selectedPresetId;
                          if (!v) return "选择 Provider";
                          return getProviderPresetDisplayLabel(v);
                        }}
                      </SelectValue>
                      <SelectIcon>
                        <LuChevronDown size={16} />
                      </SelectIcon>
                    </SelectTrigger>
                    <Popover hideArrow className="nolo-select-popup select-popover">
                      <SelectList className="nolo-select-list">
                        {providerPresetGroups.map((group) => (
                          <SelectGroup key={group.id}>
                            {group.id !== "manual" ? (
                              <SelectGroupLabel className="nolo-select-group-label">
                                {group.label}
                              </SelectGroupLabel>
                            ) : null}
                            {group.items.map((item) => {
                              const textValue = item.description
                                ? `${item.label} (${item.description})`
                                : item.label;
                              return (
                                <SelectItem
                                  key={item.id}
                                  id={item.id}
                                  textValue={textValue}
                                >
                                  <SelectItemText className="nolo-select-item-text">
                                    {textValue}
                                  </SelectItemText>
                                  <SelectItemIndicator className="nolo-select-item-indicator">
                                    <LuCheck size={14} />
                                  </SelectItemIndicator>
                                </SelectItem>
                              );
                            })}
                          </SelectGroup>
                        ))}
                      </SelectList>
                    </Popover>
                  </SelectRoot>
                </FormField>
                {isOAuthPreset && (
                  <OAuthStatusBox
                    providerId={selectedPresetFields.apiKeyRef}
                    serverOrigin={serverOrigin}
                    authToken={authToken}
                  />
                )}
                <FormField label={t("form.model")} required error={errors.model?.message} {...common}>
                  <Controller
                    name="model"
                    control={control}
                    render={({ field }) =>
                      selectedModelOptions.length > 0 ? (
                        <Select
                          className="cli-select"
                          selectedKey={field.value || selectedPresetFields.model}
                          onSelectionChange={(key) => {
                            const id = String(key ?? "");
                            field.onChange(id);
                            const opt = selectedModelOptions.find((m) => m.id === id);
                            setValue("hasVision", Boolean(opt?.hasVision), {
                              shouldValidate: true,
                            });
                          }}
                        >
                          {field.value && !selectedModelOptions.some((model) => model.id === field.value) ? (
                            <SelectItem id={field.value} textValue={field.value}>{field.value}</SelectItem>
                          ) : null}
                          {selectedModelOptions.map((model) => {
                            const label = `${model.label}${model.recommended ? "（推荐）" : ""}`;
                            return (
                              <SelectItem key={model.id} id={model.id} textValue={label}>
                                <ModelOptionLabel label={label} hasVision={model.hasVision} />
                              </SelectItem>
                            );
                          })}
                        </Select>
                      ) : (
                        <Input {...field} value={field.value ?? ""} placeholder={t("form.customModelNamePlaceholder")} />
                      )
                    }
                  />
                </FormField>

                <FormField label={t("form.customProviderUrl")} error={errors.customProviderUrl?.message} {...common}>
                  <Controller
                    name="customProviderUrl"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        type="url"
                        placeholder={t("form.customProviderUrlPlaceholder")}
                        disabled={isTemplatePreset}
                      />
                    )}
                  />
                </FormField>
                {!isOAuthPreset && (
                  <FormField label={t("form.apiKey")} error={errors.apiKey?.message} {...common}>
                    <Controller
                      name="apiKey"
                      control={control}
                      render={({ field }) => (
                        <PasswordInput {...field} value={field.value ?? ""} placeholder={t("form.apiKeyPlaceholder")} />
                      )}
                    />
                  </FormField>
                )}


                {isMachineBoundLocalCustomProvider && (
                  <>
                    <FormField label="运行位置" {...common}>
                      <Controller
                        name="machineId"
                        control={control}
                        render={({ field }) => (
                          <Select
                            className="cli-select"
                            selectedKey={field.value || ""}
                            onSelectionChange={(key) =>
                              field.onChange(String(key ?? ""))
                            }
                          >
                            <SelectItem id="" textValue="当前设备本地直连">
                              当前设备本地直连
                            </SelectItem>
                            {machineOptionsWithSelection.map((machine) => {
                              const label =
                                machine.platform && machine.arch
                                  ? `${machine.name} (${machine.platform}/${machine.arch})`
                                  : `${machine.name} (${machine.machineId})`;
                              return (
                                <SelectItem
                                  key={machine.machineId}
                                  id={machine.machineId}
                                  textValue={label}
                                >
                                  {label}
                                </SelectItem>
                              );
                            })}
                          </Select>
                        )}
                      />
                      {machinesError ? (
                        <p className="cli-info-box__hint">{machinesError}</p>
                      ) : machineOptions.length === 0 ? (
                        <p className="cli-info-box__hint">
                          当前没有可绑定的在线电脑。保留为空时表示只在当前设备本地直连这个 127.0.0.1 地址。
                        </p>
                      ) : (
                        <p className="cli-info-box__hint">
                          选择电脑后，远程 web / 手机端会通过这个 Agent 使用目标机器自己的 127.0.0.1；远程端不会直接访问这个地址。
                        </p>
                      )}
                    </FormField>

                    <div className="cli-info-box">
                      <p className="cli-info-box__title">ℹ️ 本地模型绑定说明</p>
                      <ul className="cli-info-box__list">
                        <li>这里的 `127.0.0.1` 只对绑定的那台机器自己有效。</li>
                        <li>远程端应通过 Agent 使用模型，而不是直接访问 `127.0.0.1`。</li>
                        <li>这是 machine binding 路径，不需要公开模型域名。</li>
                      </ul>
                    </div>
                  </>
                )}
              </div>
            )}

            {isCliApi && (
              <div className="custom-api-box">
                <FormField label="CLI 工具" {...common}>
                  <Controller
                    name="cliProvider"
                    control={control}
                    render={({ field }) => (
                      <Select
                        className="cli-select"
                        selectedKey={field.value || "copilot"}
                        onSelectionChange={(key) => {
                          const v = String(key ?? "");
                          field.onChange(v as any);
                          setValue("cliProvider", v as any);
                          setValue("machineId", "");
                          setValue("model", "");
                        }}
                      >
                        {(
                          [
                            {
                              value: "copilot",
                              label: "GitHub Copilot CLI（gh copilot）",
                            },
                            { value: "gemini", label: "Gemini CLI（gemini）" },
                            {
                              value: "codex",
                              label: "OpenAI Codex CLI（codex exec）",
                            },
                            { value: "claude", label: "Claude CLI（claude）" },
                            {
                              value: "agy",
                              label: "Google Antigravity CLI（agy）",
                            },
                            { value: "qoder", label: "Qoder CLI（qoder）" },
                            {
                              value: "opencode",
                              label: "OpenCode CLI（opencode）",
                            },
                            { value: "grok", label: "Grok CLI（grok）" },
                            { value: "kimi", label: "Kimi Code CLI（kimi）" },
                          ] as const
                        ).map((opt) => (
                          <SelectItem
                            key={opt.value}
                            id={opt.value}
                            textValue={opt.label}
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </Select>
                    )}
                  />
                </FormField>

                <FormField label="运行位置" {...common}>
                  <Controller
                    name="machineId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        className="cli-select"
                        selectedKey={field.value || ""}
                        onSelectionChange={(key) =>
                          field.onChange(String(key ?? ""))
                        }
                      >
                        <SelectItem id="" textValue="本地/服务器默认 CLI 环境">
                          本地/服务器默认 CLI 环境
                        </SelectItem>
                        {machineOptionsWithSelection.map((machine) => {
                          const label =
                            machine.platform && machine.arch
                              ? `${machine.name} (${machine.platform}/${machine.arch})`
                              : `${machine.name} (${machine.machineId})`;
                          return (
                            <SelectItem
                              key={machine.machineId}
                              id={machine.machineId}
                              textValue={label}
                            >
                              {label}
                            </SelectItem>
                          );
                        })}
                      </Select>
                    )}
                  />
                  {machinesError ? (
                    <p className="cli-info-box__hint">{machinesError}</p>
                  ) : machineOptions.length === 0 ? (
                    <p className="cli-info-box__hint">
                      没有检测到支持当前 CLI 的在线电脑。可以先到设置里的“电脑”连接，或继续使用默认 CLI 环境。
                    </p>
                  ) : (
                    <p className="cli-info-box__hint">
                      选择电脑后，这个 Agent 会通过那台电脑上的 CLI 执行。
                    </p>
                  )}
                </FormField>

                <div className="cli-info-box">
                  <p className="cli-info-box__title">ℹ️ 使用前提</p>
                  <ul className="cli-info-box__list">
                    {selectedCliProvider === "agy" ? (
                      <>
                        <li>已安装 <code>agy</code> CLI 并完成本机登录</li>
                        <li>
                          默认使用 <code>agy --print</code> 执行任务；模型和权限以当前 Antigravity 账号配置为准
                        </li>
                      </>
                    ) : selectedCliProvider === "gemini" ? (
                      <>
                        <li>已安装 <code>gemini</code> CLI 并完成本机登录</li>
                        <li>
                          模型可用性与权限以当前 <code>gemini --help</code> 和账号配置为准
                        </li>
                      </>
                    ) : selectedCliProvider === "codex" ? (
                      <>
                        <li>已安装 <code>codex</code> CLI 并完成本机登录</li>
                        <li>
                          默认使用 <code>codex exec</code> 执行任务；模型可用性以当前账号和
                          <code>codex exec --help</code> 为准
                        </li>
                      </>
                    ) : selectedCliProvider === "claude" ? (
                      <>
                        <li>已安装 <code>claude</code> CLI 并完成本机登录</li>
                        <li>
                          默认使用 <code>claude -p</code> 执行任务；模型可用性以当前账号和
                          <code>claude --help</code> 为准
                        </li>
                      </>
                    ) : selectedCliProvider === "qoder" ? (
                      <>
                        <li>已安装 <code>qoder</code> CLI 并完成本机登录</li>
                        <li>
                          默认使用 <code>qoder -p</code> 执行任务；模型可用性以当前账号和
                          <code>qoder --help</code> 为准
                        </li>
                      </>
                    ) : selectedCliProvider === "opencode" ? (
                      <>
                        <li>已安装 <code>opencode</code> CLI 并完成本机登录</li>
                        <li>
                          默认使用 <code>opencode run --format json</code> 执行任务；模型可用性以当前账号和
                          <code>opencode --help</code> 为准
                        </li>
                      </>
                    ) : selectedCliProvider === "grok" ? (
                      <>
                        <li>已安装 <code>grok</code> CLI 并完成本机登录或配置 <code>XAI_API_KEY</code></li>
                        <li>
                          默认使用 <code>grok -p --output-format json --yolo</code> 执行任务；模型可用性以当前账号和
                          <code>grok --help</code> 为准
                        </li>
                      </>
                    ) : selectedCliProvider === "kimi" ? (
                      <>
                        <li>已安装 <code>kimi</code>（Kimi Code CLI）并完成本机登录</li>
                        <li>
                          默认使用 <code>kimi -p --output-format stream-json</code> 执行任务；模型可用性以当前账号和
                          <code>kimi --help</code> 为准
                        </li>
                      </>
                    ) : (
                      <>
                        <li>已安装 <code>gh</code>（GitHub CLI）并登录</li>
                        <li>
                          已安装 Copilot 扩展：
                          <code>gh extension install github/gh-copilot</code>
                        </li>
                        <li>
                          模型可用性与计费以当前 <code>gh copilot -- --help</code> 和账号配额为准
                        </li>
                      </>
                    )}
                    <li>系统提示词会自动作为"角色设定"注入任务</li>
                    <li>CLI agent 会复用模型选择、提示词和最近文本历史，但不走本地工具调用协议</li>
                  </ul>
                </div>
              </div>
            )}
          </>
        )}
    </section>
  );
};

export default ModelSourceSection;