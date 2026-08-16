// 路径: app/features/ai/components/PublishSettingsTab.tsx (替换后的完整文件)

import React from "react";
import { useTranslation } from "react-i18next";
import { Controller, type Control, type FieldErrors, type UseFormWatch } from "react-hook-form";
import { FormField } from "render/web/form/FormField";
import { NumberInput } from "render/web/form/Input";
import { TextArea } from "render/web/form/TextArea";

import ToggleSwitch from "render/web/ui/ToggleSwitch";
import WhitelistInput from "./WhitelistInput";

import type { FormData } from "../createAgentSchema";

const PublishSettingsTab = ({
  errors,
  control,
  watch,
  apiSource,
}: {
  errors: FieldErrors<FormData>;
  control: Control<FormData>;
  watch: UseFormWatch<FormData>;
  apiSource: string;
}) => {
  const { t } = useTranslation("ai");

  const commonProps = { horizontal: true, labelWidth: "140px" };

  // 监控 isPublic 的值，以决定是否显示白名单和价格等设置
  const isPublic = watch("isPublic");

  // 这个逻辑保持不变
  const canBePublic = apiSource === "platform";

  return (
    <div className="tab-content-wrapper">
      {/* 1. isPublic 开关，这部分逻辑完全保留 */}
      <FormField
        label={t("form.isPublic", "公开到市场")}
        helperText={canBePublic ? t("help.isPublic") : t("help.isPublicCustomApi")}
        {...commonProps}
      >
        <Controller
          name="isPublic"
          control={control}
          render={({ field }) => (
            <ToggleSwitch
              checked={field.value}
              onChange={field.onChange}
              disabled={!canBePublic}
            />
          )}
        />
      </FormField>

      <FormField
        label={t("form.allowFork", "允许他人复制")}
        helperText={t(
          "help.allowForkAny",
          "开启后，能看到这个 AI 的人（公开市场访客，或该空间的成员）可以把它复制一份到自己的空间；复制件不含你的密钥、白名单和引用文档。"
        )}
        {...commonProps}
      >
        <Controller
          name="allowFork"
          control={control}
          render={({ field }) => (
            <ToggleSwitch
              checked={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </FormField>

      {/* 2. [核心改动] 仅在 isPublic 为 true 时，才渲染这个包含所有公开设置的容器 */}
      {isPublic && (
        <div className="public-settings-group">
          {/* 3. [新增] 白名单设置区域 */}
          <FormField
            label={t("publish.whitelist.label", "白名单")}
            helperText={t(
              "publish.whitelist.help",
              "留空则所有人都可用。添加用户ID后，将只有名单内用户可以使用此应用。"
            )}
            error={errors.whitelist?.message}
            {...commonProps}
          >
            <Controller
              name="whitelist"
              control={control}
              render={({ field }) => (
                <WhitelistInput value={field.value} onChange={field.onChange} />
              )}
            />
          </FormField>

          {/* 4. 您原有的其他公开设置字段保持不变，只是被包裹在了这个容器里 */}
          <FormField
            label={t("form.introduction")}
            error={errors.introduction?.message}
            {...commonProps}
          >
            <Controller
              name="introduction"
              control={control}
              render={({ field }) => (
                <TextArea
                  {...(field as any)}
                  placeholder={t("form.introductionPlaceholder")}
                  rows={4}
                />
              )}
            />
          </FormField>

          <FormField label={t("form.inputPrice")} {...commonProps}>
            <Controller
              name="inputPrice"
              control={control}
              render={({ field }) => (
                <NumberInput
                  {...field}
                  decimal={4}
                  placeholder={t("form.inputPricePlaceholder")}
                />
              )}
            />
          </FormField>

          <FormField label={t("form.outputPrice")} {...commonProps}>
            <Controller
              name="outputPrice"
              control={control}
              render={({ field }) => (
                <NumberInput
                  {...field}
                  decimal={4}
                  placeholder={t("form.outputPricePlaceholder")}
                />
              )}
            />
          </FormField>
        </div>
      )}

      
    </div>
  );
};

export default PublishSettingsTab;
