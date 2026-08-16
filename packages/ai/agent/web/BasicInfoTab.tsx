// 路径: ai/agent/web/BasicInfoTab.tsx

import React, { useRef, useState, useEffect } from "react";
import { Controller, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "app/utils/toast"

import { FormField } from "render/web/form/FormField";
import { Input } from "render/web/form/Input";
import { TextArea } from "render/web/form/TextArea";
import GreetingMenuEditor, { type GreetingMenuItem } from "./GreetingMenuEditor";
import { useAppDispatch, useAppSelector } from "app/store";
import { upload } from "database/dbSlice";
import { useUserId } from "identity";
import { selectCurrentServer } from "app/settings/settingSlice";
import { resolveAvatarUrl } from "../avatarUtils";
import { LuCamera } from "react-icons/lu";
import { isRecord } from "core/isRecord";
import { asRecordOrEmpty } from "core/recordOrEmpty";

type GreetingValue =
  | string
  | { text?: string; menu?: GreetingMenuItem[];[key: string]: any };

export type ApiSourceType = "platform" | "custom" | "cli";

interface BasicInfoTabProps {
  errors: any;
  control: any;
  setValue: (name: string, value: any, options?: any) => void;
  readOnly?: boolean;
}

const BasicInfoTab: React.FC<BasicInfoTabProps> = ({
  errors,
  control,
  setValue,
  readOnly,
}) => {
  const { t } = useTranslation("ai");
  const dispatch = useAppDispatch();
  const userId = useUserId();
  const server = useAppSelector(selectCurrentServer);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const avatarFileId = useWatch({ control, name: "avatarFileId" }) as string | undefined;

  useEffect(() => {
    setAvatarPreview(resolveAvatarUrl(avatarFileId, server));
  }, [avatarFileId, server]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setAvatarPreview(URL.createObjectURL(file));
    try {
      const metadata = await dispatch(upload({ file, customKey: `agent-avatar-${Date.now()}`, userId }) as any).unwrap();
      if (metadata?.id) {
        setValue("avatarFileId", metadata.id, { shouldDirty: true });
        toast.success(t("form.avatarUploaded", "头像已上传"));
      }
    } catch {
      toast.error(t("form.avatarUploadFailed", "头像上传失败"));
    }
  };

  const commonProps = { horizontal: true, labelWidth: "140px" };

  return (
    <div className="tab-content-wrapper">
      {/* 头像 */}
      <FormField label={t("form.avatar", "头像")} {...commonProps}>
        <div className="agent-avatar-upload">
          {readOnly ? (
            <div className="agent-avatar-preview">
              {avatarPreview ? (
                <img src={avatarPreview} alt="avatar" />
              ) : (
                <LuCamera size={22} className="agent-avatar-placeholder" aria-hidden="true" />
              )}
            </div>
          ) : (
            <button
              type="button"
              className="agent-avatar-preview agent-avatar-preview--clickable"
              onClick={() => fileInputRef.current?.click()}
              aria-label={t("form.avatarUpload", "上传头像")}
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="" />
              ) : (
                <LuCamera size={22} className="agent-avatar-placeholder" aria-hidden="true" />
              )}
              <div className="agent-avatar-overlay" aria-hidden="true">
                <LuCamera size={16} aria-hidden="true" />
              </div>
            </button>
          )}
          {!readOnly && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="agent-avatar-input"
              onChange={handleAvatarUpload}
            />
          )}
        </div>
      </FormField>

      {/* 名称 */}
      <FormField label={t("form.name")} error={errors.name?.message} {...commonProps}>
        <Controller
          name="name"
          control={control}
          render={({ field }) => <Input {...field} placeholder={t("form.namePlaceholder")} disabled={readOnly} />}
        />
      </FormField>

      {/* 问候语 */}
      <FormField label={t("form.greeting")} error={errors.greeting?.message} {...commonProps}>
        <Controller
          name="greeting"
          control={control}
          render={({ field }) => {
            const { value, onChange, onBlur, ref, name } = field as {
              value: GreetingValue;
              onChange: (v: GreetingValue) => void;
              onBlur: () => void;
              ref: any;
              name: string;
            };
            const currentText =
              typeof value === "string" ? value
                : isRecord(value) ? (value.text as string) ?? ""
                  : "";
            const currentMenu: GreetingMenuItem[] =
              isRecord(value) && Array.isArray(value.menu)
                ? (value.menu as GreetingMenuItem[])
                : [];

            const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
              const nextText = e.target.value;
              if (currentMenu.length === 0 && (typeof value === "string" || value == null)) {
                onChange(nextText);
                return;
              }
              onChange({ ...asRecordOrEmpty(value), text: nextText, menu: currentMenu } as GreetingValue);
            };
            const handleMenuChange = (nextMenu: GreetingMenuItem[]) => {
              onChange({ ...asRecordOrEmpty(value), text: currentText, menu: nextMenu } as GreetingValue);
            };

            return (
              <>
                <TextArea 
                  name={name} 
                  ref={ref} 
                  value={currentText} 
                  onChange={handleTextChange} 
                  onBlur={onBlur} 
                  placeholder={t("form.defaults.greeting")} 
                  rows={3} 
                  disabled={readOnly}
                />
                {!readOnly && <GreetingMenuEditor items={currentMenu} onChange={handleMenuChange} />}
              </>
            );
          }}
        />
      </FormField>

      {/* 系统提示词 - 敏感信息，只读模式下隐藏 */}
      {!readOnly && (
        <FormField
          label={t("form.prompt")}
          error={errors.prompt?.message}
          helperText={t("help.promptAutomation")}
          {...commonProps}
        >
          <Controller
            name="prompt"
            control={control}
            render={({ field }) => (
              <TextArea {...field} placeholder={t("form.promptPlaceholder")} rows={6} />
            )}
          />
        </FormField>
      )}

      
    </div>
  );
};

export default BasicInfoTab;
