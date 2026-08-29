// 路径: app/features/ai/components/PublishSettingsTab.tsx (自研 useForm 版)

import React from "react";
import { useTranslation } from "react-i18next";
import { FormField } from "render/web/form/FormField";
import { NumberInput } from "render/web/form/Input";
import { TextArea } from "render/web/form/TextArea";

import ToggleSwitch from "render/web/ui/ToggleSwitch";
import * as stylex from "@stylexjs/stylex";
import { publishSettingsTabStyles as styles } from "./publishSettingsTabStyles";
import WhitelistInput from "./WhitelistInput";

import type { FormData } from "../createAgentSchema";

const PublishSettingsTab = ({
  errors,
  values,
  set,
  apiSource,
}: {
  errors: Record<string, string>;
  values: FormData;
  set: (name: string, value: unknown) => void;
  apiSource: string;
}) => {
  const { t } = useTranslation("ai");

  const commonProps = { horizontal: true, labelWidth: "140px" };

  // 原 publish body 内对该包装类的 padding 覆盖（16px 0 0）：
  // 本组件只在该 publish body 内渲染，覆盖值并入为静态 key（见 styles 文件）。

  const isPublic = values.isPublic;

  const canBePublic = apiSource === "platform";

  return (
    <div
      {...stylex.props(
        styles.tabContentWrapper,
        styles.tabContentWrapperInPublishBody
      )}
    >
      {/* 1. isPublic 开关 */}
      <FormField
        label={t("form.isPublic", "公开到市场")}
        helperText={canBePublic ? t("help.isPublic") : t("help.isPublicCustomApi")}
        {...commonProps}
      >
        <ToggleSwitch
          checked={!!isPublic}
          onChange={(v) => set("isPublic", v)}
          disabled={!canBePublic}
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
        <ToggleSwitch
          checked={!!values.allowFork}
          onChange={(v) => set("allowFork", v)}
        />
      </FormField>

      {/* 2. 仅在 isPublic 为 true 时渲染公开设置容器 */}
      {isPublic && (
        <div className="agent-create-esc-public-settings-group" {...stylex.props(styles.publicSettingsGroup)}>
          <FormField
            label={t("publish.whitelist.label", "白名单")}
            helperText={t(
              "publish.whitelist.help",
              "留空则所有人都可用。添加用户ID后，将只有名单内用户可以使用此应用。"
            )}
            error={errors.whitelist}
            {...commonProps}
          >
            <WhitelistInput
              value={values.whitelist ?? []}
              onChange={(v) => set("whitelist", v)}
            />
          </FormField>

          <FormField
            label={t("form.introduction")}
            error={errors.introduction}
            {...commonProps}
          >
            <TextArea
              value={values.introduction ?? ""}
              onChange={(e) => set("introduction", e.target.value)}
              placeholder={t("form.introductionPlaceholder")}
              rows={4}
            />
          </FormField>

          <FormField label={t("form.inputPrice")} {...commonProps}>
            <NumberInput
              value={values.inputPrice}
              onChange={(v) => set("inputPrice", v)}
              decimal={4}
              placeholder={t("form.inputPricePlaceholder")}
            />
          </FormField>

          <FormField label={t("form.outputPrice")} {...commonProps}>
            <NumberInput
              value={values.outputPrice}
              onChange={(v) => set("outputPrice", v)}
              decimal={4}
              placeholder={t("form.outputPricePlaceholder")}
            />
          </FormField>
        </div>
      )}
    </div>
  );
};

export default PublishSettingsTab;
