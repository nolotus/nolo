/**
 * 人设与提示词区——从 BasicInfoTab 重构。
 *
 * 设计变更（三方 Agent 咨询共识）：
 * - 提示词（system prompt）是 Agent 的"源代码"，提升为视觉主角
 * - 头像 + 名称 + handle 压缩成顶部一行，不再和提示词同级
 * - 问候语保留在提示词下方
 *
 * 自研 useForm：value/onChange 直连，无 Controller/useWatch。
 */

import React, { useRef, useState, useEffect } from "react";
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
import type { FormData } from "../createAgentSchema";

type GreetingValue =
  | string
  | { text?: string; menu?: GreetingMenuItem[];[key: string]: any };

export type ApiSourceType = "platform" | "custom" | "cli";

interface PersonaSectionProps {
  errors: Record<string, string>;
  values: FormData;
  set: (name: string, value: any) => void;
  readOnly?: boolean;
}

const PersonaSection: React.FC<PersonaSectionProps> = ({
  errors,
  values,
  set,
  readOnly,
}) => {
  const { t } = useTranslation("ai");
  const dispatch = useAppDispatch();
  const userId = useUserId();
  const server = useAppSelector(selectCurrentServer);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const avatarFileId = values.avatarFileId as string | undefined;

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
        set("avatarFileId", metadata.id);
        toast.success(t("form.avatarUploaded", "头像已上传"));
      }
    } catch {
      toast.error(t("form.avatarUploadFailed", "头像上传失败"));
    }
  };

  // greeting 的 value 可能是 string 或 { text, menu } 对象
  const greetingValue = values.greeting as GreetingValue | null | undefined;
  const greetingText =
    typeof greetingValue === "string" ? greetingValue
      : isRecord(greetingValue) ? (greetingValue.text as string) ?? ""
        : "";
  const greetingMenu: GreetingMenuItem[] =
    isRecord(greetingValue) && Array.isArray(greetingValue.menu)
      ? (greetingValue.menu as GreetingMenuItem[])
      : [];

  const handleGreetingTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextText = e.target.value;
    if (greetingMenu.length === 0 && (typeof greetingValue === "string" || greetingValue == null)) {
      set("greeting", nextText);
      return;
    }
    set("greeting", { ...asRecordOrEmpty(greetingValue), text: nextText, menu: greetingMenu } as GreetingValue);
  };
  const handleGreetingMenuChange = (nextMenu: GreetingMenuItem[]) => {
    set("greeting", { ...asRecordOrEmpty(greetingValue), text: greetingText, menu: nextMenu } as GreetingValue);
  };

  return (
    <div className="persona-section">
      {/* ── 顶部：头像 + 名称一行 ── */}
      <div className="persona-section__identity">
        {/* 头像 */}
        <div className="persona-section__avatar">
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

        {/* 名称 */}
        <div className="persona-section__name-field">
          <Input
            value={values.name ?? ""}
            onChange={(e) => set("name", e.target.value)}
            label={t("form.name")}
            placeholder={t("form.namePlaceholder")}
            error={!!errors.name}
            disabled={readOnly}
          />
          {errors.name && (
            <p className="error-message">{errors.name}</p>
          )}
        </div>
      </div>

      {/* ── 提示词：主角，大编辑区 ── */}
      {!readOnly && (
        <div className="persona-section__prompt">
          <FormField
            label={t("form.prompt")}
            error={errors.prompt}
            helperText={t("help.promptAutomation")}
            horizontal={false}
          >
            <TextArea
              value={values.prompt ?? ""}
              onChange={(e) => set("prompt", e.target.value)}
              placeholder={t("form.promptPlaceholder")}
              rows={12}
              autoResize
            />
          </FormField>
        </div>
      )}

      {/* ── 问候语 ── */}
      <FormField
        label={t("form.greeting")}
        error={errors.greeting}
        horizontal={false}
      >
        <TextArea
          value={greetingText}
          onChange={handleGreetingTextChange}
          placeholder={t("form.defaults.greeting")}
          rows={3}
          disabled={readOnly}
        />
        {!readOnly && <GreetingMenuEditor items={greetingMenu} onChange={handleGreetingMenuChange} />}
      </FormField>

      <style>{`
        .persona-section {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }

        .persona-section__identity {
          display: flex;
          align-items: flex-start;
          gap: var(--space-4);
        }

        .persona-section__avatar {
          flex-shrink: 0;
        }

        .persona-section__name-field {
          flex: 1;
          min-width: 0;
        }

        .persona-section__name-field .error-message {
          margin-top: var(--space-1);
          font-size: var(--fontSize-sm);
          color: var(--error);
        }

        .persona-section__prompt {
          min-height: 300px;
        }

        .persona-section__prompt textarea {
          min-height: 280px;
          font-size: var(--fontSize-md);
          line-height: 1.6;
        }

        @media (max-width: 768px) {
          .persona-section__identity {
            flex-direction: column;
            align-items: center;
          }
        }
      `}</style>
    </div>
  );
};

export default PersonaSection;