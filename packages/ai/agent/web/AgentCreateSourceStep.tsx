// 路径: ai/agent/web/AgentCreateSourceStep.tsx
// Web 手动创建：四卡内联快速创建（平台 / 订阅 / API / CLI）。

import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "app/routing";
import Button from "render/web/ui/Button";
import { Select, SelectItem } from "render/web/ui/Select";
import { ModelOptionLabel } from "./ModelOptionLabel";
import { PasswordInput } from "render/web/form/Input";
import { Checkbox } from "render/web/form/Checkbox";
import { MANUAL_PROVIDER_PRESET_ID } from "../providerPresetApply";
import {
  CREATE_RUN_MODE_LABELS,
  PLATFORM_QUICK_CREATE_MODEL,
  deriveAgentNameFromPrompt,
  useAgentCreateSourceState,
  type AgentCreateQuickDraft,
  type CreateRunMode,
} from "./useAgentCreateSourceState";
import type { SubscriptionOAuthConnection } from "./useSubscriptionOAuthConnection";
import { useIsLoggedIn, useUserId } from "identity";
import type { ReasoningEffort } from "../createAgentSchema";
import { getAvailableReasoningEfforts } from "../createAgentSchema";
import * as stylex from "@stylexjs/stylex";
import { agentFormStyles as afs } from "./agentFormStyles";
import { withLiteralClass } from "./withLiteralClass";

export type { CreateRunMode, AgentCreateQuickDraft };
export {
  CREATE_RUN_MODE_LABELS,
  PLATFORM_QUICK_CREATE_MODEL,
  deriveAgentNameFromPrompt,
};

export type AgentCreateSourceStepProps = {
  selected: CreateRunMode | null;
  onSelect: (mode: CreateRunMode) => void;
  /** Open full AgentForm with draft applied. */
  onAdvancedEdit: (draft: AgentCreateQuickDraft) => void;
  /** Minimal create → dialog. */
  onQuickCreate: (draft: AgentCreateQuickDraft) => void | Promise<void>;
  isSubmitting?: boolean;
  disabled?: boolean;
};

const CARD_DEFS: {
  id: CreateRunMode;
  titleKey: string;
  titleDefault: string;
  descKey: string;
  descDefault: string;
  footnoteKey: string;
  footnoteDefault: string;
  recommended?: boolean;
}[] = [
  {
    id: "platform",
    titleKey: "createAgent.runMode.platform.title",
    titleDefault: "平台内置",
    descKey: "createAgent.runMode.platform.desc",
    descDefault: "使用 nolo 模型，无需配置 Key。",
    footnoteKey: "createAgent.runMode.platform.footnote",
    footnoteDefault: "平台统一计费。",
    recommended: true,
  },
  {
    id: "subscription",
    titleKey: "createAgent.runMode.subscription.title",
    titleDefault: "订阅会员",
    descKey: "createAgent.runMode.subscription.desc",
    descDefault: "使用已有订阅，无需按量付费。",
    footnoteKey: "createAgent.runMode.subscription.footnote",
    footnoteDefault: "支持 ChatGPT、SuperGrok、Token Plan、Ollama Cloud。",
  },
  {
    id: "api",
    titleKey: "createAgent.runMode.api.title",
    titleDefault: "API 用量计费",
    descKey: "createAgent.runMode.api.desc",
    descDefault: "填写 API Key，按上游用量计费。",
    footnoteKey: "createAgent.runMode.api.footnote",
    footnoteDefault: "支持 OpenAI、Anthropic 等兼容接口。",
  },
  {
    id: "cli",
    titleKey: "createAgent.runMode.cli.title",
    titleDefault: "本机 CLI",
    descKey: "createAgent.runMode.cli.desc",
    descDefault: "使用本机的 Claude Code、Codex、Gemini CLI。",
    footnoteKey: "createAgent.runMode.cli.footnote",
    footnoteDefault: "需桌面端绑定本机；未绑定也可先创建。",
  },
];

/**
 * 推理强度下拉选项。label 通过 i18n 渲染，id 用作 reasoning_effort 存储值。
 */
function getReasoningEffortSelectOptions(
  t: (key: string) => string,
): { id: ReasoningEffort; label: string }[] {
  const prefix = "createAgent.quickCreate.reasoningEffortOptions.";
  return [
    { id: "none", label: t(`${prefix}none`) },
    { id: "minimal", label: t(`${prefix}minimal`) },
    { id: "low", label: t(`${prefix}low`) },
    { id: "medium", label: t(`${prefix}medium`) },
    { id: "high", label: t(`${prefix}high`) },
    { id: "xhigh", label: t(`${prefix}xhigh`) },
    { id: "max", label: t(`${prefix}max`) },
  ];
}


const AgentCreateIntro: React.FC = () => {
  const { t } = useTranslation("ai");
  return (
    <div {...stylex.props(afs.createSourceStepIntro)}>
      <h2 {...stylex.props(afs.createSourceStepHeading)}>
        {t("createAgent.runMode.heading", "运行方式")}
      </h2>
      <p {...stylex.props(afs.createSourceStepSub)}>
        {t(
          "createAgent.runMode.subheading",
          "先选择模型从哪里来。平台路径填提示词即可创建；需要知识、工具、发布时用高级编辑。"
        )}
      </p>
    </div>
  );
};

const AgentCreateModeCards: React.FC<{
  selected: CreateRunMode | null;
  busy: boolean;
  onSelect: (mode: CreateRunMode) => void;
}> = ({ selected, busy, onSelect }) => {
  const { t } = useTranslation("ai");
  return (
    <div
      {...stylex.props(afs.createSourceStepCards)}
      role="radiogroup"
      aria-label={t("createAgent.runMode.heading", "运行方式")}
    >
      {CARD_DEFS.map((card) => {
        const isActive = selected === card.id;
        return (
          <button
            key={card.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={busy}
            {...withLiteralClass(
              "agent-create-esc-source-card",
              afs.createSourceCard,
              isActive && afs.createSourceCardActive
            )}
            onClick={() => onSelect(card.id)}
          >
            <div {...stylex.props(afs.createSourceCardTop)}>
              <span
                  {...stylex.props(
                    afs.createSourceCardTitle,
                    isActive && afs.createSourceCardTitleActive
                  )}
                >
                {t(card.titleKey, card.titleDefault)}
              </span>
              {card.recommended ? (
                <span {...stylex.props(afs.createSourceCardBadge)}>
                  {t("createAgent.runMode.recommended", "推荐")}
                </span>
              ) : null}
            </div>
            <p {...stylex.props(afs.createSourceCardDesc)}>
              {t(card.descKey, card.descDefault)}
            </p>
            <p {...stylex.props(afs.createSourceCardFootnote)}>
              {t(card.footnoteKey, card.footnoteDefault)}
            </p>
          </button>
        );
      })}
    </div>
  );
};

const AgentCreateSourceActionRow: React.FC<{
  busy: boolean;
  isSubmitting: boolean;
  canCreate: boolean;
  onAdvancedEdit: () => void;
  onCreate: () => void;
}> = ({ busy, isSubmitting, canCreate, onAdvancedEdit, onCreate }) => {
  const { t } = useTranslation("ai");
  return (
    <div {...stylex.props(afs.createSourcePanelActions)}>
      <Button
        type="button"
        variant="ghost"
        size="medium"
        disabled={busy}
        onClick={onAdvancedEdit}
        className={stylex.props(afs.createSourcePanelActionButton).className}
      >
        {t("createAgent.quickCreate.advancedEdit", "高级编辑")}
      </Button>
      <Button
        type="button"
        variant="primary"
        size="medium"
        loading={isSubmitting}
        disabled={busy || !canCreate}
        className={stylex.props(afs.createSourcePanelActionButton).className}
        onClick={onCreate}
      >
        {t("create", "创建")}
      </Button>
    </div>
  );
};

const AgentCreatePlatformPanel: React.FC<{
  prompt: string;
  setPrompt: (v: string) => void;
  platformModel: string;
  setPlatformModel: (v: string) => void;
  platformModelOptions: { value: string; label: string; hasVision?: boolean }[];
  busy: boolean;
  isSubmitting: boolean;
  canCreate: boolean;
  onAdvancedEdit: () => void;
  onCreate: () => void;
}> = ({
  prompt,
  setPrompt,
  platformModel,
  setPlatformModel,
  platformModelOptions,
  busy,
  isSubmitting,
  canCreate,
  onAdvancedEdit,
  onCreate,
}) => {
  const { t } = useTranslation("ai");
  return (
    <div {...stylex.props(afs.createSourcePanel)} data-mode="platform">
      <label {...withLiteralClass("agent-create-esc-source-field", afs.createSourceField)}>
        <span {...stylex.props(afs.createSourceFieldLabel)}>
          {t("createAgent.quickCreate.prompt", "系统提示词")}
        </span>
        <textarea
          {...stylex.props(afs.createSourceFieldTextarea)}
          value={prompt}
          disabled={busy}
          rows={6}
          placeholder={t(
            "createAgent.quickCreate.promptPlaceholder",
            "定义 AI 的行为、角色和个性…"
          )}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </label>
      <div {...withLiteralClass("agent-create-esc-source-field", afs.createSourceField)}>
        <Select
          className="agent-create-esc-source-select"
          label={t("createAgent.quickCreate.modelLabel", "模型")}
          selectedKey={platformModel}
          isDisabled={busy}
          placeholder={t("createAgent.quickCreate.modelPlaceholder", "选择模型")}
          onSelectionChange={(key) =>
            setPlatformModel(
              key != null
                ? String(key)
                : PLATFORM_QUICK_CREATE_MODEL.name
            )
          }
          description={t(
            "createAgent.quickCreate.platformModelHint",
            "平台模型 · 默认 DeepSeek V4 Flash，可更换"
          )}
        >
          {platformModelOptions.map((m) => (
            <SelectItem key={m.value} id={m.value} textValue={m.label}>
              <ModelOptionLabel label={m.label} hasVision={m.hasVision} />
            </SelectItem>
          ))}
        </Select>
      </div>
      <AgentCreateSourceActionRow
        busy={busy}
        isSubmitting={isSubmitting}
        canCreate={canCreate}
        onAdvancedEdit={onAdvancedEdit}
        onCreate={onCreate}
      />
    </div>
  );
};
/**
 * Shared "cross-device key" checkbox (compact form Checkbox).
 * Shown only for logged-in non-local accounts — Web/桌面 need server proxy for
 * CORS, which requires the key in the sync store. Local-only users have no
 * account to push, so the option is hidden.
 */
const CredentialSyncCheckbox: React.FC<{
  show: boolean;
  checked: boolean;
  onChange: (v: boolean) => void;
  busy: boolean;
  label?: string;
}> = ({ show, checked, onChange, busy, label }) => {
  const { t } = useTranslation("ai");
  if (!show) return null;
  return (
    <Checkbox
      label={label ?? t("form.crossDeviceKey", "跨设备使用此密钥")}
      checked={checked}
      disabled={busy}
      onChange={(e) => onChange(e.target.checked)}
    />
  );
};


const AgentCreateApiPanel: React.FC<{
  prompt: string;
  setPrompt: (v: string) => void;
  apiPresetId: string;
  applyApiPreset: (id: string) => void;
  meteredPresetOptions: { value: string; label: string }[];
  customProviderUrl: string;
  setCustomProviderUrl: (v: string) => void;
  apiKey: string;
  setApiKey: (v: string) => void;
  credentialSynced: boolean;
  setCredentialSynced: (v: boolean) => void;
  showCredentialSync: boolean;
  model: string;
  setModel: (v: string) => void;
  activePresetFields: {
    lockCustomProviderUrl?: boolean;
    keyFormatHint?: string;
    modelOptions: ReadonlyArray<{ id: string; label: string; recommended?: boolean; hasVision?: boolean }>;
    provider: string;
  };
  reasoningEffort: ReasoningEffort;
  setReasoningEffort: (v: ReasoningEffort) => void;
  busy: boolean;
  isSubmitting: boolean;
  canCreate: boolean;
  onAdvancedEdit: () => void;
  onCreate: () => void;
}> = ({
  prompt,
  setPrompt,
  apiPresetId,
  applyApiPreset,
  meteredPresetOptions,
  customProviderUrl,
  setCustomProviderUrl,
  apiKey,
  setApiKey,
  credentialSynced,
  setCredentialSynced,
  showCredentialSync,
  model,
  setModel,
  activePresetFields,
  reasoningEffort,
  setReasoningEffort,
  busy,
  isSubmitting,
  canCreate,
  onAdvancedEdit,
  onCreate,
}) => {
  const { t } = useTranslation("ai");
  return (
    <div {...stylex.props(afs.createSourcePanel)} data-mode="api">
      <div {...withLiteralClass("agent-create-esc-source-field", afs.createSourceField)}>
        <Select
          className="agent-create-esc-source-select"
          label={t("form.provider", "Provider 模板")}
          selectedKey={apiPresetId}
          isDisabled={busy}
          placeholder={t(
            "createAgent.quickCreate.providerPlaceholder",
            "选择 Provider"
          )}
          onSelectionChange={(key) => {
            if (key != null) applyApiPreset(String(key));
          }}
        >
          {meteredPresetOptions.map((p) => (
            <SelectItem key={p.value} id={p.value} textValue={p.label}>
              {p.label}
            </SelectItem>
          ))}
        </Select>
      </div>
      <label {...withLiteralClass("agent-create-esc-source-field", afs.createSourceField)}>
        <span {...stylex.props(afs.createSourceFieldLabel)}>
          {t("form.customProviderUrl", "服务商 URL")}
        </span>
        <input
          type="url"
          {...stylex.props(afs.createSourceFieldInput)}
          value={customProviderUrl}
          disabled={busy}
          readOnly={
            apiPresetId !== MANUAL_PROVIDER_PRESET_ID &&
            !!activePresetFields.lockCustomProviderUrl
          }
          placeholder="https://api.openai.com/v1"
          onChange={(e) => setCustomProviderUrl(e.target.value)}
          autoComplete="off"
        />
      </label>
      <label {...withLiteralClass("agent-create-esc-source-field", afs.createSourceField)}>
        <span {...stylex.props(afs.createSourceFieldLabel)}>
          {t("form.apiKey", "API 密钥")}
        </span>
        <PasswordInput
          value={apiKey}
          disabled={busy}
          placeholder="sk-…"
          onChange={(e) => setApiKey(e.target.value)}
          autoComplete="off"
        />
      </label>
      <CredentialSyncCheckbox
        show={showCredentialSync}
        checked={credentialSynced}
        onChange={setCredentialSynced}
        busy={busy}
      />
      <label {...withLiteralClass("agent-create-esc-source-field", afs.createSourceField)}>
        <span {...stylex.props(afs.createSourceFieldLabel)}>
          {t("form.model", "模型")}
        </span>
        {activePresetFields.modelOptions.length > 0 ? (
          <Select
            className="agent-create-esc-source-select"
            label={t("form.model", "模型")}
            selectedKey={model}
            isDisabled={busy}
            onSelectionChange={(key) => setModel(String(key ?? ""))}
          >
            {model && !activePresetFields.modelOptions.some((m) => m.id === model) ? (
              <SelectItem id={model} textValue={model}>{model}</SelectItem>
            ) : null}
            {activePresetFields.modelOptions.map((m) => {
              const label = `${m.label}${m.recommended ? "（推荐）" : ""}`;
              return (
                <SelectItem key={m.id} id={m.id} textValue={label}>
                  <ModelOptionLabel label={label} hasVision={m.hasVision} />
                </SelectItem>
              );
            })}
          </Select>
        ) : (
          <input
            type="text"
            {...stylex.props(afs.createSourceFieldInput)}
            value={model}
            disabled={busy}
            placeholder="gpt-5.6-sol"
            onChange={(e) => setModel(e.target.value)}
            autoComplete="off"
          />
        )}
      </label>
      <label {...withLiteralClass("agent-create-esc-source-field", afs.createSourceField)}>
        <span {...stylex.props(afs.createSourceFieldLabel)}>
          {t("createAgent.quickCreate.reasoningEffort", "推理强度")}
        </span>
        {(() => {
          const available = getAvailableReasoningEfforts(activePresetFields.provider);
          if (available.length === 0) {
            return (
              <span>
                {activePresetFields.provider === "anthropic" || activePresetFields.provider === "google" || activePresetFields.provider === "qwen"
                  ? "此服务商使用 Thinking 机制，无需设置推理强度"
                  : activePresetFields.provider === "cursor" ? "Cursor 推理强度由模型名称后缀决定（如 -high）" : "此服务商不支持推理强度设置"}
              </span>
            );
          }
          return (
            <Select
              className="agent-create-esc-source-select"
              label={t("createAgent.quickCreate.reasoningEffort", "推理强度")}
              selectedKey={reasoningEffort}
              isDisabled={busy}
              onSelectionChange={(key) => {
                const v = String(key ?? "medium");
                setReasoningEffort(v as ReasoningEffort);
              }}
            >
              {getReasoningEffortSelectOptions(t).filter((o) => (available as string[]).includes(o.id)).map((o) => (
                <SelectItem key={o.id} id={o.id} textValue={o.label}>
                  {o.label}
                </SelectItem>
              ))}
            </Select>
          );
        })()}
      </label>
      <label {...withLiteralClass("agent-create-esc-source-field", afs.createSourceField)}>
        <span {...stylex.props(afs.createSourceFieldLabel)}>
          {t("createAgent.quickCreate.prompt", "系统提示词")}
        </span>
        <textarea
          {...stylex.props(afs.createSourceFieldTextarea)}
          value={prompt}
          disabled={busy}
          rows={4}
          placeholder={t(
            "createAgent.quickCreate.promptPlaceholder",
            "定义 AI 的行为、角色和个性…"
          )}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </label>
      <AgentCreateSourceActionRow
        busy={busy}
        isSubmitting={isSubmitting}
        canCreate={canCreate}
        onAdvancedEdit={onAdvancedEdit}
        onCreate={onCreate}
      />
    </div>
  );
};

const AgentCreateSubscriptionPanel: React.FC<{
  prompt: string;
  setPrompt: (v: string) => void;
  subPresetId: string;
  applySubPreset: (id: string) => void;
  subscriptionPresetOptions: { value: string; label: string }[];
  subCustomProviderUrl: string;
  setSubCustomProviderUrl: (v: string) => void;
  subApiKey: string;
  setSubApiKey: (v: string) => void;
  credentialSynced: boolean;
  setCredentialSynced: (v: boolean) => void;
  providerKeyRemembered: boolean;
  setProviderKeyRemembered: (v: boolean) => void;
  providerKeyRef: string;
  showCredentialSync: boolean;
  subModel: string;
  setSubModel: (v: string) => void;
  activePresetFields: {
    lockCustomProviderUrl?: boolean;
    keyFormatHint?: string;
    modelOptions: ReadonlyArray<{ id: string; label: string; recommended?: boolean; hasVision?: boolean }>;
    provider: string;
  };
  reasoningEffort: ReasoningEffort;
  setReasoningEffort: (v: ReasoningEffort) => void;
  draftRequiresDesktopOAuth: boolean;
  oauth: {
    isDesktop: boolean;
    connection: SubscriptionOAuthConnection;
    refresh: () => Promise<void>;
    startLogin: () => Promise<void>;
  };
  navigate: ReturnType<typeof useNavigate>;
  busy: boolean;
  isSubmitting: boolean;
  canCreate: boolean;
  onAdvancedEdit: () => void;
  onCreate: () => void;
}> = ({
  prompt,
  setPrompt,
  subPresetId,
  applySubPreset,
  subscriptionPresetOptions,
  subCustomProviderUrl,
  setSubCustomProviderUrl,
  subApiKey,
  setSubApiKey,
  credentialSynced,
  setCredentialSynced,
  providerKeyRemembered,
  setProviderKeyRemembered,
  providerKeyRef,
  showCredentialSync,
  subModel,
  setSubModel,
  activePresetFields,
  reasoningEffort,
  setReasoningEffort,
  draftRequiresDesktopOAuth,
  oauth,
  navigate,
  busy,
  isSubmitting,
  canCreate,
  onAdvancedEdit,
  onCreate,
}) => {
  const { t } = useTranslation("ai");
  return (
    <div {...stylex.props(afs.createSourcePanel)} data-mode="subscription">
      <div {...withLiteralClass("agent-create-esc-source-field", afs.createSourceField)}>
        <Select
          className="agent-create-esc-source-select"
          label={t("createAgent.quickCreate.subscriptionBrand", "订阅 / 方案")}
          selectedKey={subPresetId}
          isDisabled={busy}
          placeholder={t(
            "createAgent.quickCreate.subscriptionPlaceholder",
            "选择订阅方案"
          )}
          onSelectionChange={(key) => {
            if (key != null) applySubPreset(String(key));
          }}
        >
          {subscriptionPresetOptions.map((p) => (
            <SelectItem key={p.value} id={p.value} textValue={p.label}>
              {p.label}
            </SelectItem>
          ))}
        </Select>
      </div>

      {draftRequiresDesktopOAuth ? (
        <>
          <p {...stylex.props(afs.createSourcePanelDesktopTitle)}>
            {oauth.connection.kind === "connected"
              ? t("createAgent.quickCreate.oauthConnected", "OAuth 已连接")
              : oauth.isDesktop
                ? t("createAgent.quickCreate.oauthDesktopTitle", "在 Nolo Desktop 登录订阅账号")
                : t("createAgent.quickCreate.subscriptionDesktopTitle", "该订阅需在桌面端完成 OAuth 登录")}
          </p>
          <p {...stylex.props(afs.createSourcePanelDesktopBody)}>
            {oauth.connection.kind === "connected"
              ? t(
                  "createAgent.quickCreate.oauthConnectedAs",
                  "已连接账号：{{account}}。凭据保存在本机，不会传给页面。",
                  {
                    account:
                      oauth.connection.email ||
                      oauth.connection.accountId ||
                      subPresetId,
                  },
                )
              : oauth.connection.kind === "connecting"
                ? t("createAgent.quickCreate.oauthWaiting", "浏览器已打开，完成授权后此处会自动更新。")
                : oauth.isDesktop
                  ? t("createAgent.quickCreate.oauthDesktopBody", "点击登录后会打开系统浏览器；授权凭据由桌面端安全保存。")
                  : t(
                      "createAgent.quickCreate.subscriptionDesktopBody",
                      "请在 Nolo Desktop 完成 OAuth 登录后创建和使用该订阅 Agent。",
                    )}
          </p>
          {oauth.connection.kind === "error" ? (
            <p role="alert" {...stylex.props(afs.createSourcePanelDesktopBody)}>
              {oauth.connection.message}
            </p>
          ) : null}
          {oauth.connection.kind === "connected" ? (
            <>
              <div {...withLiteralClass("agent-create-esc-source-field", afs.createSourceField)}>
                <Select
                  className="agent-create-esc-source-select"
                  label={t("form.model", "模型")}
                  selectedKey={subModel}
                  isDisabled={busy}
                  onSelectionChange={(key) => setSubModel(String(key ?? ""))}
                  description={t(
                    "createAgent.quickCreate.recommendedModelHint",
                    "已按当前订阅推荐最新模型，可随时更换",
                  )}
                >
                  {subModel && !activePresetFields.modelOptions.some((model) => model.id === subModel) ? (
                    <SelectItem id={subModel} textValue={subModel}>{subModel}</SelectItem>
                  ) : null}
                  {activePresetFields.modelOptions.map((model) => {
                    const label = `${model.label}${model.recommended ? "（推荐）" : ""}`;
                    return (
                      <SelectItem key={model.id} id={model.id} textValue={label}>
                        <ModelOptionLabel label={label} hasVision={model.hasVision} />
                      </SelectItem>
                    );
                  })}
                </Select>
              </div>
              <label {...withLiteralClass("agent-create-esc-source-field", afs.createSourceField)}>
                <span {...stylex.props(afs.createSourceFieldLabel)}>
                  {t("createAgent.quickCreate.reasoningEffort", "推理强度")}
                </span>
                {(() => {
                  const available = getAvailableReasoningEfforts(activePresetFields.provider);
                  if (available.length === 0) {
                    return (
                      <span>
                        {activePresetFields.provider === "anthropic" || activePresetFields.provider === "google" || activePresetFields.provider === "qwen"
                          ? "此服务商使用 Thinking 机制，无需设置推理强度"
                          : activePresetFields.provider === "cursor" ? "Cursor 推理强度由模型名称后缀决定（如 -high）" : "此服务商不支持推理强度设置"}
                      </span>
                    );
                  }
                  return (
                    <Select
                      className="agent-create-esc-source-select"
                      label={t("createAgent.quickCreate.reasoningEffort", "推理强度")}
                      selectedKey={reasoningEffort}
                      isDisabled={busy}
                      onSelectionChange={(key) => {
                        const v = String(key ?? "medium");
                        setReasoningEffort(v as ReasoningEffort);
                      }}
                    >
                      {getReasoningEffortSelectOptions(t).filter((o) => (available as string[]).includes(o.id)).map((o) => (
                        <SelectItem key={o.id} id={o.id} textValue={o.label}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </Select>
                  );
                })()}
              </label>
              <label {...withLiteralClass("agent-create-esc-source-field", afs.createSourceField)}>
                <span {...stylex.props(afs.createSourceFieldLabel)}>
                  {t("createAgent.quickCreate.prompt", "系统提示词")}
                </span>
                <textarea
                  {...stylex.props(afs.createSourceFieldTextarea)}
                  value={prompt}
                  disabled={busy}
                  rows={4}
                  placeholder={t("createAgent.quickCreate.promptPlaceholder", "定义 AI 的行为、角色和个性…")}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </label>
              <AgentCreateSourceActionRow
                busy={busy}
                isSubmitting={isSubmitting}
                canCreate={canCreate}
                onAdvancedEdit={onAdvancedEdit}
                onCreate={onCreate}
              />
            </>
          ) : (
            <div {...stylex.props(afs.createSourcePanelActions)}>
              <Button
                type="button"
                variant="primary"
                size="medium"
                loading={oauth.connection.kind === "connecting"}
                disabled={oauth.connection.kind === "loading" || oauth.connection.kind === "connecting"}
                onClick={() => {
                  if (oauth.isDesktop) void oauth.startLogin();
                  else navigate("/downloads");
                }}
              >
                {oauth.isDesktop
                  ? t("createAgent.quickCreate.signInOAuth", "登录订阅账号")
                  : t("createAgent.quickCreate.openDesktop", "打开或下载 Nolo Desktop")}
              </Button>
              {oauth.connection.kind === "error" ? (
                <Button type="button" variant="ghost" size="medium" onClick={() => void oauth.refresh()}>
                  {t("retry", "重试")}
                </Button>
              ) : null}
            </div>
          )}
        </>
      ) : (
        <>
          <label {...withLiteralClass("agent-create-esc-source-field", afs.createSourceField)}>
            <span {...stylex.props(afs.createSourceFieldLabel)}>
              {t("form.customProviderUrl", "服务商 URL")}
            </span>
            <input
              type="url"
              {...stylex.props(afs.createSourceFieldInput)}
              value={subCustomProviderUrl}
              disabled={busy}
              readOnly={!!activePresetFields.lockCustomProviderUrl}
              onChange={(e) => setSubCustomProviderUrl(e.target.value)}
              autoComplete="off"
            />
          </label>
          <label {...withLiteralClass("agent-create-esc-source-field", afs.createSourceField)}>
            <span {...stylex.props(afs.createSourceFieldLabel)}>
              {t("form.apiKey", "API 密钥")}
            </span>
            <PasswordInput
              value={subApiKey}
              disabled={busy}
              placeholder="sk-…"
              onChange={(e) => setSubApiKey(e.target.value)}
              autoComplete="off"
            />
            {activePresetFields?.keyFormatHint && (
              <span>
                {activePresetFields.keyFormatHint}
              </span>
            )}
          </label>
          <CredentialSyncCheckbox
            show={showCredentialSync}
            checked={credentialSynced}
            onChange={setCredentialSynced}
            busy={busy}
          />
          {!draftRequiresDesktopOAuth ? (
            <CredentialSyncCheckbox
              show={Boolean(providerKeyRef)}
              checked={providerKeyRemembered}
              onChange={setProviderKeyRemembered}
              busy={busy}
              label="记住此服务商密钥"
            />
          ) : null}
          <label {...withLiteralClass("agent-create-esc-source-field", afs.createSourceField)}>
            <span {...stylex.props(afs.createSourceFieldLabel)}>
              {t("form.model", "模型")}
            </span>
            {activePresetFields.modelOptions.length > 0 ? (
              <Select
                className="agent-create-esc-source-select"
                label={t("form.model", "模型")}
                selectedKey={subModel}
                isDisabled={busy}
                onSelectionChange={(key) => setSubModel(String(key ?? ""))}
                description={t(
                  "createAgent.quickCreate.recommendedModelHint",
                  "已按当前订阅推荐最新模型，可随时更换",
                )}
              >
                {subModel && !activePresetFields.modelOptions.some((m) => m.id === subModel) ? (
                  <SelectItem id={subModel} textValue={subModel}>{subModel}</SelectItem>
                ) : null}
                {activePresetFields.modelOptions.map((m) => {
                  const label = `${m.label}${m.recommended ? "（推荐）" : ""}`;
                  return (
                    <SelectItem key={m.id} id={m.id} textValue={label}>
                      <ModelOptionLabel label={label} hasVision={m.hasVision} />
                    </SelectItem>
                  );
                })}
              </Select>
            ) : (
              <input
                type="text"
                {...stylex.props(afs.createSourceFieldInput)}
                value={subModel}
                disabled={busy}
                onChange={(e) => setSubModel(e.target.value)}
                autoComplete="off"
              />
            )}
          </label>
          <label {...withLiteralClass("agent-create-esc-source-field", afs.createSourceField)}>
            <span {...stylex.props(afs.createSourceFieldLabel)}>
              {t("createAgent.quickCreate.reasoningEffort", "推理强度")}
            </span>
            {(() => {
              const availableEfforts = getAvailableReasoningEfforts(activePresetFields.provider);
              if (availableEfforts.length === 0) {
                return (
                  <span>
                    {activePresetFields.provider === "anthropic" || activePresetFields.provider === "google" || activePresetFields.provider === "qwen"
                      ? "此服务商使用 Thinking 机制，无需设置推理强度"
                      : activePresetFields.provider === "cursor" ? "Cursor 推理强度由模型名称后缀决定（如 -high）" : "此服务商不支持推理强度设置"}
                  </span>
                );
              }
              return (
                <Select
                  className="agent-create-esc-source-select"
                  label={t("createAgent.quickCreate.reasoningEffort", "推理强度")}
                  selectedKey={reasoningEffort}
                  isDisabled={busy}
                  onSelectionChange={(key) => {
                    const v = String(key ?? "medium");
                    setReasoningEffort(v as ReasoningEffort);
                  }}
                >
                  {getReasoningEffortSelectOptions(t).filter((o) => (availableEfforts as string[]).includes(o.id)).map((o) => (
                    <SelectItem key={o.id} id={o.id} textValue={o.label}>
                      {o.label}
                    </SelectItem>
                  ))}
                </Select>
              );
            })()}
          </label>
          <label {...withLiteralClass("agent-create-esc-source-field", afs.createSourceField)}>
            <span {...stylex.props(afs.createSourceFieldLabel)}>
              {t("createAgent.quickCreate.prompt", "系统提示词")}
            </span>
            <textarea
              {...stylex.props(afs.createSourceFieldTextarea)}
              value={prompt}
              disabled={busy}
              rows={4}
              placeholder={t(
                "createAgent.quickCreate.promptPlaceholder",
                "定义 AI 的行为、角色和个性…"
              )}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </label>
          <AgentCreateSourceActionRow
            busy={busy}
            isSubmitting={isSubmitting}
            canCreate={canCreate}
            onAdvancedEdit={onAdvancedEdit}
            onCreate={onCreate}
          />
        </>
      )}
    </div>
  );
};

const AgentCreateCliPanel: React.FC<{
  prompt: string;
  setPrompt: (v: string) => void;
  cliProvider: string;
  setCliProvider: (v: string) => void;
  cliProviderOptions: ReadonlyArray<{ value: string; label: string }>;
  cliMachineId: string;
  setCliMachineId: (v: string) => void;
  cliMachineOptions: ReadonlyArray<{
    machineId: string;
    name: string;
    platform: string;
    arch: string;
  }>;
  cliMachinesError: string | null;
  cliLoggedIn: boolean;
  navigate: (path: string) => void;
  busy: boolean;
  isSubmitting: boolean;
  canCreate: boolean;
  onAdvancedEdit: () => void;
  onCreate: () => void;
}> = ({
  prompt,
  setPrompt,
  cliProvider,
  setCliProvider,
  cliProviderOptions,
  cliMachineId,
  setCliMachineId,
  cliMachineOptions,
  cliMachinesError,
  cliLoggedIn,
  navigate,
  busy,
  isSubmitting,
  canCreate,
  onAdvancedEdit,
  onCreate,
}) => {
  const { t } = useTranslation("ai");
  return (
    <div {...stylex.props(afs.createSourcePanel)} data-mode="cli">
      <div {...withLiteralClass("agent-create-esc-source-field", afs.createSourceField)}>
        <Select
          className="agent-create-esc-source-select"
          label={t("createAgent.quickCreate.cliProvider", "CLI 工具")}
          selectedKey={cliProvider}
          isDisabled={busy}
          onSelectionChange={(key) => setCliProvider(String(key ?? ""))}
        >
          {cliProviderOptions.map((opt) => (
            <SelectItem key={opt.value} id={opt.value} textValue={opt.label}>
              {opt.label}
            </SelectItem>
          ))}
        </Select>
      </div>
      <div {...withLiteralClass("agent-create-esc-source-field", afs.createSourceField)}>
        <Select
          className="agent-create-esc-source-select"
          label={t("createAgent.quickCreate.runLocation", "运行位置")}
          selectedKey={cliMachineId}
          isDisabled={busy}
          onSelectionChange={(key) => setCliMachineId(String(key ?? ""))}
          description={t(
            "createAgent.quickCreate.cliMachineHint",
            "留空使用本地/服务器默认 CLI 环境；选择电脑后通过该电脑运行",
          )}
        >
          <SelectItem id="" textValue={t("createAgent.quickCreate.cliDefaultMachine", "默认环境（不绑定电脑）")}>
            {t("createAgent.quickCreate.cliDefaultMachine", "默认环境（不绑定电脑）")}
          </SelectItem>
          {cliMachineOptions.map((machine) => {
            const label =
              machine.platform && machine.arch
                ? `${machine.name} (${machine.platform}/${machine.arch})`
                : `${machine.name} (${machine.machineId})`;
            return (
              <SelectItem key={machine.machineId} id={machine.machineId} textValue={label}>
                {label}
              </SelectItem>
            );
          })}
        </Select>
        <p>
          {cliMachinesError ? (
            cliMachinesError
          ) : cliMachineOptions.length === 0 ? (
            t(
              "createAgent.quickCreate.cliNoMachine",
              "没有检测到支持当前 CLI 的在线电脑。可先到设置-电脑连接，或使用默认 CLI 环境。",
            )
          ) : (
            t(
              "createAgent.quickCreate.cliMachineSelectedHint",
              "选择电脑后，这个 Agent 会通过那台电脑上的 CLI 执行。",
            )
          )}
        </p>
        {!cliLoggedIn ? (
          <button
            type="button"
            {...stylex.props(afs.createSourceStepMoreLink)}
            onClick={() => navigate("/downloads")}
          >
            {t("createAgent.quickCreate.openDownloads", "打开桌面端下载")}
          </button>
        ) : null}
      </div>
      <label {...withLiteralClass("agent-create-esc-source-field", afs.createSourceField)}>
        <span {...stylex.props(afs.createSourceFieldLabel)}>
          {t("createAgent.quickCreate.prompt", "系统提示词")}
        </span>
        <textarea
          {...stylex.props(afs.createSourceFieldTextarea)}
          value={prompt}
          disabled={busy}
          rows={4}
          placeholder={t("createAgent.quickCreate.promptPlaceholder", "定义 AI 的行为、角色和个性…")}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </label>
      <AgentCreateSourceActionRow
        busy={busy}
        isSubmitting={isSubmitting}
        canCreate={canCreate}
        onAdvancedEdit={onAdvancedEdit}
        onCreate={onCreate}
      />
    </div>
  );
};

const AgentCreateSourceStep: React.FC<AgentCreateSourceStepProps> = ({
  selected,
  onSelect,
  onAdvancedEdit,
  onQuickCreate,
  isSubmitting = false,
  disabled = false,
}) => {
  const { t } = useTranslation("ai");
  const navigate = useNavigate();

  const {
    draft,
    busy,
    prompt,
    setPrompt,
    platformModel,
    setPlatformModel,
    platformModelOptions,
    apiPresetId,
    applyApiPreset,
    meteredPresetOptions,
    customProviderUrl,
    setCustomProviderUrl,
    apiKey,
    setApiKey,
    model,
    setModel,
    activePresetFields,
    subPresetId,
    applySubPreset,
    subscriptionPresetOptions,
    subCustomProviderUrl,
    setSubCustomProviderUrl,
    subApiKey,
    setSubApiKey,
    credentialSynced,
    setCredentialSynced,
    providerKeyRemembered,
    setProviderKeyRemembered,
    providerKeyRef,
    subModel,
    setSubModel,
    subReasoningEffort,
    setSubReasoningEffort,
    apiReasoningEffort,
    setApiReasoningEffort,
    canCreatePlatform,
    canCreateApi,
    canCreateSubscription,
    canCreateCli,
    handleCreate,
    handleAdvanced,
    oauth,
    cliProvider,
    setCliProvider,
    cliMachineId,
    setCliMachineId,
    cliMachineOptions,
    cliMachinesError,
    cliMachines,
    cliLoggedIn,
    cliProviderOptions,
  } = useAgentCreateSourceState({
    selected,
    onAdvancedEdit,
    onQuickCreate,
    isSubmitting,
    disabled,
  });

  // Cross-device key sync is only meaningful for logged-in accounts (non-local);
  // local-only users have no account to push to.
  const loggedInUserId = useUserId();
  const isLoggedIn = useIsLoggedIn();
  const showCredentialSync =
    isLoggedIn && !!loggedInUserId && loggedInUserId !== "local";

  return (
    <div {...stylex.props(afs.createSourceStep)}>
      <AgentCreateIntro />
      <AgentCreateModeCards selected={selected} busy={busy} onSelect={onSelect} />

      {selected === "platform" ? (
        <AgentCreatePlatformPanel
          prompt={prompt}
          setPrompt={setPrompt}
          platformModel={platformModel}
          setPlatformModel={setPlatformModel as (v: string) => void}
          platformModelOptions={platformModelOptions}
          busy={busy}
          isSubmitting={isSubmitting}
          canCreate={canCreatePlatform}
          onAdvancedEdit={handleAdvanced}
          onCreate={handleCreate}
        />
      ) : null}

      {selected === "api" ? (
        <AgentCreateApiPanel
          prompt={prompt}
          setPrompt={setPrompt}
          apiPresetId={apiPresetId}
          applyApiPreset={applyApiPreset}
          meteredPresetOptions={meteredPresetOptions}
          customProviderUrl={customProviderUrl}
          setCustomProviderUrl={setCustomProviderUrl}
          apiKey={apiKey}
          setApiKey={setApiKey}
          credentialSynced={credentialSynced}
          setCredentialSynced={setCredentialSynced}
          showCredentialSync={showCredentialSync}
          model={model}
          setModel={setModel}
          activePresetFields={activePresetFields}
          reasoningEffort={apiReasoningEffort}
          setReasoningEffort={setApiReasoningEffort}
          busy={busy}
          isSubmitting={isSubmitting}
          canCreate={canCreateApi}
          onAdvancedEdit={handleAdvanced}
          onCreate={handleCreate}
        />
      ) : null}

      {selected === "subscription" ? (
        <AgentCreateSubscriptionPanel
          prompt={prompt}
          setPrompt={setPrompt}
          subPresetId={subPresetId}
          applySubPreset={applySubPreset}
          subscriptionPresetOptions={subscriptionPresetOptions}
          subCustomProviderUrl={subCustomProviderUrl}
          setSubCustomProviderUrl={setSubCustomProviderUrl}
          subApiKey={subApiKey}
          setSubApiKey={setSubApiKey}
          credentialSynced={credentialSynced}
          setCredentialSynced={setCredentialSynced}
          providerKeyRef={providerKeyRef}
          providerKeyRemembered={providerKeyRemembered}
          setProviderKeyRemembered={setProviderKeyRemembered}
          showCredentialSync={showCredentialSync}
          subModel={subModel}
          setSubModel={setSubModel}
          activePresetFields={activePresetFields}
          reasoningEffort={subReasoningEffort}
          setReasoningEffort={setSubReasoningEffort}
          draftRequiresDesktopOAuth={draft.requiresDesktopOAuth}
          oauth={oauth}
          navigate={navigate}
          busy={busy}
          isSubmitting={isSubmitting}
          canCreate={canCreateSubscription}
          onAdvancedEdit={handleAdvanced}
          onCreate={handleCreate}
        />
      ) : null}

      {selected === "cli" ? (
        <AgentCreateCliPanel
          prompt={prompt}
          setPrompt={setPrompt}
          cliProvider={cliProvider}
          setCliProvider={setCliProvider}
          cliProviderOptions={cliProviderOptions}
          cliMachineId={cliMachineId}
          setCliMachineId={setCliMachineId}
          cliMachineOptions={cliMachineOptions}
          cliMachinesError={cliMachinesError}
          cliLoggedIn={cliLoggedIn}
          navigate={navigate}
          busy={busy}
          isSubmitting={isSubmitting}
          canCreate={canCreateCli}
          onAdvancedEdit={handleAdvanced}
          onCreate={handleCreate}
        />
      ) : null}

      <details {...stylex.props(afs.createSourceStepMore)}>
        <summary {...stylex.props(afs.createSourceStepMoreSummary)}>{t("createAgent.runMode.more", "更多")}</summary>
        <div {...stylex.props(afs.createSourceStepMoreBody)}>
          <p {...stylex.props(afs.createSourceStepMoreBodyParagraph)}>
            {t(
              "createAgent.quickCreate.cliDesktopBody",
              "本机 CLI（Claude Code、Codex、Gemini CLI 等）请在桌面端绑定后使用。"
            )}
          </p>
          <button
            type="button"
            {...stylex.props(afs.createSourceStepMoreLink)}
            onClick={() => navigate("/downloads")}
          >
            {t("createAgent.quickCreate.openDownloads", "打开桌面端下载")}
          </button>
        </div>
      </details>
    </div>
  );
};

export default AgentCreateSourceStep;
