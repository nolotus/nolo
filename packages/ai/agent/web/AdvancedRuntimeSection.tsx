/**
 * 运行时高级设置——从 AdvancedSettingsTab 拆出。
 *
 * 包含：服务器代理、思考模式 + thinkingBudget、托管执行授权。
 */

import React from "react";
import { Controller, useWatch, type Control, type FieldErrors, type UseFormSetValue } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FormField } from "render/web/form/FormField";
import { Slider } from "render/web/form/Slider";
import ToggleSwitch from "render/web/ui/ToggleSwitch";
import { isRecord } from "core/isRecord";
import { isLocalCustomProviderUrl, runtimePolicyAllowsHostedExec } from "../createAgentSchema";
import type { ApiSourceType } from "./BasicInfoTab";
import type { FormData } from "../createAgentSchema";

const HOSTED_EXEC_RUNTIME_POLICY = {
  version: 1,
  runtimeTools: ["execShell"],
  workspace: { mode: "lease" },
} as const;

const removeHostedExecRuntimePolicy = (value: unknown) => {
  if (!isRecord(value)) return null;
  const next = { ...value };
  if (Array.isArray(next.runtimeTools)) {
    const runtimeTools = next.runtimeTools.filter((tool) => tool !== "execShell");
    if (runtimeTools.length > 0) {
      next.runtimeTools = runtimeTools;
    } else {
      delete next.runtimeTools;
    }
  }
  if (isRecord(next.workspace) && next.workspace.mode === "lease") {
    const workspace = { ...next.workspace };
    delete workspace.mode;
    if (Object.keys(workspace).length > 0) {
      next.workspace = workspace;
    } else {
      delete next.workspace;
    }
  }
  return Object.keys(next).length > 0 ? next : null;
};

export type AdvancedRuntimeSectionProps = {
  errors: FieldErrors<FormData>;
  control: Control<FormData>;
  setValue: UseFormSetValue<FormData>;
  apiSource: ApiSourceType;
  readOnly?: boolean;
};

const AdvancedRuntimeSection: React.FC<AdvancedRuntimeSectionProps> = ({
  errors,
  control,
  setValue,
  apiSource,
  readOnly = false,
}) => {
  const { t } = useTranslation("ai");
  const common = { horizontal: true, labelWidth: "160px" };
  const isCustomApi = apiSource === "custom";
  const isCliApi = apiSource === "cli";
  const customProviderUrl = useWatch({ control, name: "customProviderUrl" }) as string | undefined;
  const runtimeToolPolicy = useWatch({ control, name: "runtimeToolPolicy" });
  const allowHostedExec = runtimePolicyAllowsHostedExec(runtimeToolPolicy);
  const isMachineBoundLocalCustomProvider =
    isCustomApi && isLocalCustomProviderUrl(customProviderUrl);
  const showHostedExecRuntimeControl = !isCliApi && !isMachineBoundLocalCustomProvider;

  return (
    <section className="adv-settings__group">
      <FormField
        label={t("form.useServerProxy")}
        helperText={t("help.proxy")}
        {...common}
      >
        <Controller
          name="useServerProxy"
          control={control}
          render={({ field }) => (
            <ToggleSwitch
              checked={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </FormField>

      <FormField
        label={t("form.enableThinking")}
        helperText={t("help.enableThinking")}
        {...common}
      >
        <Controller
          name="enableThinking"
          control={control}
          render={({ field }) => (
            <ToggleSwitch
              checked={!!field.value}
              onChange={field.onChange}
            />
          )}
        />
      </FormField>

      <Controller
        name="enableThinking"
        control={control}
        render={({ field: thinkField }) =>
          thinkField.value ? (
            <FormField
              label={t("form.thinkingBudget")}
              helperText={t("help.thinkingBudget")}
              {...common}
            >
              <Controller
                name="thinkingBudget"
                control={control}
                render={({ field }) => (
                  <Slider
                    value={field.value ?? 8000}
                    onChange={field.onChange}
                    min={1024}
                    max={32000}
                    step={512}
                    showValue
                  />
                )}
              />
            </FormField>
          ) : (
            <></>
          )
        }
      />

      {showHostedExecRuntimeControl && (
        <FormField
          label="Alpha 托管执行授权"
          helperText="普通用户保持关闭也不影响聊天；当你想把重复任务固化成脚本/命令能力时再开启。"
          {...common}
        >
          <ToggleSwitch
            checked={allowHostedExec}
            onChange={(checked) => {
              setValue(
                "runtimeToolPolicy",
                checked
                  ? (HOSTED_EXEC_RUNTIME_POLICY as any)
                  : (removeHostedExecRuntimePolicy(runtimeToolPolicy) as any),
                {
                  shouldDirty: true,
                  shouldTouch: true,
                  shouldValidate: true,
                }
              );
            }}
          />
          <p className="cli-info-box__hint">
            开启后，这个 Web/server Agent 可在托管临时工作区使用 execShell；唯一授权来源是 runtimeToolPolicy。
            只在 alpha 执行环境开启且本次运行请求 execShell 时生效；不会自动创建 skill。关闭后只清除这项授权。
            这不是完整生产沙箱。执行证据会写入对话，并在 AgentPage 高级证据里展示摘要。
          </p>
        </FormField>
      )}
    </section>
  );
};

export default AdvancedRuntimeSection;