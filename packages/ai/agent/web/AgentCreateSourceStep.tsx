// 路径: ai/agent/web/AgentCreateSourceStep.tsx
// Web 手动创建：三张主卡与次级 CLI 入口（平台 / 订阅 / API / CLI）。

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { subscriptionFootnoteProviders } from "./agentSourceFootnote";
import { useNavigate, Link } from "app/routing";
import Button from "render/web/ui/Button";
import { Select, SelectItem } from "render/web/ui/Select";
import { SelectGroup, SelectGroupLabel } from "render/web/ui/Select";
import { ModelOptionLabel } from "./ModelOptionLabel";
import { ProviderPresetOptionLabel } from "./ProviderPresetOptionLabel";
import { PasswordInput } from "render/web/form/Input";
import { Checkbox } from "render/web/form/Checkbox";
import { MANUAL_PROVIDER_PRESET_ID } from "../providerPresetApply";
import { CLI_PROVIDER_GROUPS, CREATABLE_CLI_PROVIDERS } from "ai/agent/cliProviders";
import {
  CREATE_RUN_MODE_LABELS,
  PLATFORM_QUICK_CREATE_MODEL,
  deriveAgentNameFromPrompt,
  useAgentCreateSourceState,
  type AgentCreateQuickDraft,
  type CreateRunMode,
  type QuickCreateAttempt,
} from "./useAgentCreateSourceState";
import type { SubscriptionOAuthConnection } from "./useSubscriptionOAuthConnection";
import { getIsDesktopApp } from "app/utils/env";
import ThinkingControlField from "./ThinkingControlField";
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
  onQuickCreate: (draft: AgentCreateQuickDraft, attempt?: QuickCreateAttempt) => boolean | void | Promise<boolean | void>;
  isSubmitting?: boolean;
  disabled?: boolean;
};

const CREATABLE_CLI_GROUPS = CLI_PROVIDER_GROUPS.map((group) => ({
  ...group,
  items: group.items.filter((item) => CREATABLE_CLI_PROVIDERS.includes(item.value)),
})).filter((group) => group.items.length > 0);

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
    titleDefault: "我的订阅",
    descKey: "createAgent.runMode.subscription.desc",
    descDefault: "使用已有订阅，无需按量付费。",
    footnoteKey: "createAgent.runMode.subscription.footnote",
    // 静态文案里不再写死支持名单（会随 registry 漂移）；名单由
    // `subscriptionFootnoteProviders` 从 registry 派生后覆盖，空名单时保持这句中性说明。
    footnoteDefault: "使用已有订阅，无需按量付费。",
  },
  {
    id: "api",
    titleKey: "createAgent.runMode.api.title",
    titleDefault: "自带 API",
    descKey: "createAgent.runMode.api.desc",
    descDefault: "填写 API Key，按上游用量计费。",
    footnoteKey: "createAgent.runMode.api.footnote",
    footnoteDefault: "支持 OpenAI、Anthropic 等兼容接口。",
  },
];


const AgentCreateIntro: React.FC = () => {
  const { t } = useTranslation("ai");
  return (
    <div {...stylex.props(afs.createSourceStepIntro)}>
      <h2 {...stylex.props(afs.createSourceStepHeading)}>
        {t("createAgent.runMode.heading", "运行方式")}
      </h2>
    </div>
  );
};

const CREATE_MODE_ORDER: readonly CreateRunMode[] = [...CARD_DEFS.map(({ id }) => id), "cli"];

const AgentCreateModeCards: React.FC<{
  selected: CreateRunMode | null;
  busy: boolean;
  onSelect: (mode: CreateRunMode) => void;
  /**
   * 卡片脚注覆盖项。订阅模式的支持名单来自 registry（见
   * `subscriptionFootnoteProviders`），不再依赖手写的默认文案。
   */
  footnotes?: Partial<Record<CreateRunMode, React.ReactNode>>;
}> = ({ selected, busy, onSelect, footnotes }) => {
  const { t } = useTranslation("ai");
  const tabStop = selected ?? CREATE_MODE_ORDER[0];

  const handleModeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1
      : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!direction || busy || !(event.target instanceof HTMLElement)) return;

    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button[role="radio"]'));
    const index = buttons.findIndex((button) => button === event.target);
    if (index < 0) return;
    event.preventDefault();
    const nextIndex = (index + direction + buttons.length) % buttons.length;
    buttons[nextIndex]?.focus();
    const nextMode = CREATE_MODE_ORDER[nextIndex];
    if (nextMode) onSelect(nextMode);
  };
  return (
    <div
      {...stylex.props(afs.createSourceModeChoices)}
      role="radiogroup"
      onKeyDown={handleModeKeyDown}
      aria-label={t("createAgent.runMode.heading", "运行方式")}
    >
      <div {...stylex.props(afs.createSourceStepCards)}>
        {CARD_DEFS.map((card) => {
          const isActive = selected === card.id;
          return (
            <button
              key={card.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              tabIndex={tabStop === card.id ? 0 : -1}
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
                {footnotes?.[card.id] ?? t(card.footnoteKey, card.footnoteDefault)}
              </p>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        role="radio"
        aria-checked={selected === "cli"}
        tabIndex={tabStop === "cli" ? 0 : -1}
        disabled={busy}
        onClick={() => onSelect("cli")}
        {...stylex.props(
          afs.createSourceCliEntry,
          selected === "cli" && afs.createSourceCliEntryActive,
        )}
      >
        {t("createAgent.runMode.cli.entry", "已有本机 Claude Code / Codex 等 CLI？桥接本机终端")}
      </button>
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
  thinkingField: React.ReactNode;
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
  thinkingField,
  onAdvancedEdit,
  onCreate,
}) => {
  const { t } = useTranslation("ai");
  return (
    <div {...stylex.props(afs.createSourcePanel)} data-mode="platform">
      {thinkingField}
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
      <div {...withLiteralClass("agent-create-esc-source-field", afs.createSourceModelRow)}>
        <div {...stylex.props(afs.createSourceModelRowMain)}>
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
        {/* 平台模型的积分单价随模型不同，选完就地可查，避免为看价格跳出创建流程。 */}
        <Button as={Link} to="/pricing" variant="ghost" size="small">
          {t("createAgent.quickCreate.viewPricing", "查看价格")}
        </Button>
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
/** The cross-device option is hidden for users without a sync account. */
const CredentialSyncCheckbox: React.FC<{
  show: boolean;
  checked: boolean;
  onChange: (v: boolean) => void;
  busy: boolean;
}> = ({ show, checked, onChange, busy }) => {
  const { t } = useTranslation("ai");
  if (!show) return null;
  return (
    <Checkbox
      label={t("form.crossDeviceKey", "跨设备使用此密钥")}
      helperText={checked ? undefined : [
        t("form.crossDeviceKeyOffHint", "关闭后，本次不再上传密钥；此前已同步的副本不会被删除。"),
        ...(!getIsDesktopApp() ? [t(
          "form.crossDeviceKeyOffWebHint",
          "浏览器会尝试直接请求服务商；请求可能被服务商的跨域限制（CORS）拦截。"
        )] : []),
      ].join(" ")}
      checked={checked}
      disabled={busy}
      onChange={(e) => onChange(e.target.checked)}
    />
  );
};


function PresetEndpointHint({ url }: { url: string }) {
  const { t } = useTranslation("ai");
  let host: string;
  try {
    host = new URL(url).host;
  } catch {
    return null;
  }
  if (!host) return null;
  return (
    <p {...stylex.props(afs.createSourceEndpointHint)}>
      {t("createAgent.quickCreate.endpointHost", "服务商端点：{{host}}", { host })}
    </p>
  );
}

const AgentCreateApiPanel: React.FC<{
  prompt: string;
  setPrompt: (v: string) => void;
  apiPresetId: string;
  applyApiPreset: (id: string) => void;
  meteredPresetOptions: { value: string; label: string; provider?: string }[];
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
    keyFormatHint?: string;
    modelOptions: ReadonlyArray<{ id: string; label: string; recommended?: boolean; hasVision?: boolean }>;
    provider: string;
  };
  busy: boolean;
  isSubmitting: boolean;
  canCreate: boolean;
  thinkingField: React.ReactNode;
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
  busy,
  isSubmitting,
  canCreate,
  thinkingField,
  onAdvancedEdit,
  onCreate,
}) => {
  const { t } = useTranslation("ai");


  return (
    <div {...stylex.props(afs.createSourcePanel)} data-mode="api">
      {thinkingField}
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
              <ProviderPresetOptionLabel label={p.label} provider={p.provider} />
            </SelectItem>
          ))}
        </Select>
      </div>
      {apiPresetId === MANUAL_PROVIDER_PRESET_ID ? (
        <label {...withLiteralClass("agent-create-esc-source-field", afs.createSourceField)}>
          <span {...stylex.props(afs.createSourceFieldLabel)}>
            {t("form.customProviderUrl", "服务商 URL")}
          </span>
          <input
            type="url"
            {...stylex.props(afs.createSourceFieldInput)}
            value={customProviderUrl}
            disabled={busy}
            placeholder="https://api.openai.com/v1"
            onChange={(e) => setCustomProviderUrl(e.target.value)}
            autoComplete="off"
          />
        </label>
      ) : (
        <PresetEndpointHint url={customProviderUrl} />
      )}
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
      <div {...withLiteralClass("agent-create-esc-source-field", afs.createSourceField)}>
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
              const label = m.recommended ? t("form.modelRecommendedLabel", "{{label}}（推荐）", { label: m.label }) : m.label;
              return (
                <SelectItem key={m.id} id={m.id} textValue={label}>
                  <ModelOptionLabel label={label} hasVision={m.hasVision} />
                </SelectItem>
              );
            })}
          </Select>
        ) : (
          <label {...stylex.props(afs.createSourceField)}>
            <span {...stylex.props(afs.createSourceFieldLabel)}>{t("form.model", "模型")}</span>
            <input
              type="text"
              {...stylex.props(afs.createSourceFieldInput)}
              value={model}
              disabled={busy}
              placeholder="gpt-5.6-sol"
              onChange={(e) => setModel(e.target.value)}
              autoComplete="off"
            />
          </label>
        )}
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
  subscriptionPresetOptions: {
    value: string;
    label: string;
    provider?: string;
  }[];
  subCustomProviderUrl: string;
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
    keyFormatHint?: string;
    modelOptions: ReadonlyArray<{ id: string; label: string; recommended?: boolean; hasVision?: boolean }>;
    provider: string;
  };
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
  thinkingField: React.ReactNode;
  onAdvancedEdit: () => void;
  onCreate: () => void;
}> = ({
  prompt,
  setPrompt,
  subPresetId,
  applySubPreset,
  subscriptionPresetOptions,
  subCustomProviderUrl,
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
  draftRequiresDesktopOAuth,
  oauth,
  navigate,
  busy,
  isSubmitting,
  canCreate,
  thinkingField,
  onAdvancedEdit,
  onCreate,
}) => {
  const { t } = useTranslation("ai");

  // 订阅面板同样按 (provider, model) 解析真实推理能力：
  // 命中模型级 override（如 grok-3-mini 仅 low/high）时过滤档位并自动校准。

  return (
    <div {...stylex.props(afs.createSourcePanel)} data-mode="subscription">
      {thinkingField}
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
              <ProviderPresetOptionLabel label={p.label} provider={p.provider} />
            </SelectItem>
          ))}
        </Select>
      </div>

      <PresetEndpointHint url={subCustomProviderUrl} />

      {draftRequiresDesktopOAuth ? (
        <>
          <p {...stylex.props(afs.createSourcePanelDesktopTitle)}>
            {oauth.connection.kind === "connected"
              ? t("createAgent.quickCreate.oauthConnected", "凭据：已连接")
              : oauth.isDesktop
                ? t("createAgent.quickCreate.oauthDesktopTitle", "凭据：未连接（在 Nolo Desktop 登录订阅账号）")
                : t("createAgent.quickCreate.subscriptionDesktopTitle", "凭据：未连接（该订阅需在桌面端完成 OAuth 登录）")}
          </p>
          <p {...stylex.props(afs.createSourcePanelDesktopBody)}>
            {oauth.connection.kind === "connected"
              ? oauth.isDesktop
                ? t(
                    "createAgent.quickCreate.oauthConnectedAs",
                    "已连接账号：{{account}}。如需在网页端使用，请在终端运行 nolo auth {{provider}} --sync-to-server 同步到服务端。",
                    {
                      account:
                        oauth.connection.email ||
                        oauth.connection.accountId ||
                        subPresetId,
                      provider: activePresetFields.provider || subPresetId,
                    },
                  )
                : t(
                    "createAgent.quickCreate.oauthConnectedAs",
                    "已连接账号：{{account}}。",
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
                      "请在 Nolo Desktop 完成 OAuth 登录，或在终端运行 nolo auth {{provider}} --sync-to-server 同步至云端后使用。",
                      { provider: activePresetFields.provider || subPresetId },
                    )}
          </p>
          {oauth.connection.kind === "error" ? (
            <p role="alert" {...stylex.props(afs.createSourcePanelDesktopBody, afs.createSourcePanelError)}>
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
                    "createAgent.quickCreate.subscriptionModelHint",
                    "模型来自所选方案的目录，可随时更换。",
                  )}
                >
                  {subModel && !activePresetFields.modelOptions.some((model) => model.id === subModel) ? (
                    <SelectItem id={subModel} textValue={subModel}>{subModel}</SelectItem>
                  ) : null}
                  {activePresetFields.modelOptions.map((model) => {
                    const label = model.recommended ? t("form.modelRecommendedLabel", "{{label}}（推荐）", { label: model.label }) : model.label;
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
              {t("form.apiKey", "API 密钥")}
            </span>
            <PasswordInput
              value={subApiKey}
              disabled={busy}
              placeholder="sk-…"
              onChange={(e) => setSubApiKey(e.target.value)}
              autoComplete="off"
            />
            <span {...stylex.props(afs.createSourceEndpointHint)}>
              {t("createAgent.quickCreate.subscriptionKeyRequired", "需要所选订阅方案的专用 Key。")}
            </span>
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
            providerKeyRef && <Checkbox
              checked={providerKeyRemembered}
              onChange={(e) => setProviderKeyRemembered(e.target.checked)}
              disabled={busy}
              label={t("form.rememberProviderKey", "记住此服务商密钥")}
            />
          ) : null}
          <div {...withLiteralClass("agent-create-esc-source-field", afs.createSourceField)}>
            {activePresetFields.modelOptions.length > 0 ? (
              <Select
                className="agent-create-esc-source-select"
                label={t("form.model", "模型")}
                selectedKey={subModel}
                isDisabled={busy}
                onSelectionChange={(key) => setSubModel(String(key ?? ""))}
                description={t(
                  "createAgent.quickCreate.subscriptionModelHint",
                  "模型来自所选方案的目录，可随时更换。",
                )}
              >
                {subModel && !activePresetFields.modelOptions.some((m) => m.id === subModel) ? (
                  <SelectItem id={subModel} textValue={subModel}>{subModel}</SelectItem>
                ) : null}
                {activePresetFields.modelOptions.map((m) => {
                  const label = m.recommended ? t("form.modelRecommendedLabel", "{{label}}（推荐）", { label: m.label }) : m.label;
                  return (
                    <SelectItem key={m.id} id={m.id} textValue={label}>
                      <ModelOptionLabel label={label} hasVision={m.hasVision} />
                    </SelectItem>
                  );
                })}
              </Select>
            ) : (
              <label {...stylex.props(afs.createSourceField)}>
                <span {...stylex.props(afs.createSourceFieldLabel)}>{t("form.model", "模型")}</span>
                <input
                  type="text"
                  {...stylex.props(afs.createSourceFieldInput)}
                  value={subModel}
                  disabled={busy}
                  onChange={(e) => setSubModel(e.target.value)}
                  autoComplete="off"
                />
              </label>
            )}
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

export const AgentCreateCliPanel: React.FC<{
  prompt: string;
  setPrompt: (v: string) => void;
  cliProvider: string;
  setCliProvider: (v: string) => void;
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
  // React 19 不支持 <details defaultOpen>；用本地 state 复现"仅初始展开"语义：
  // 初始值由 cliMachineId 派生，之后只跟随用户的折叠/展开。
  const [cliMachineOpen, setCliMachineOpen] = useState(Boolean(cliMachineId));

  return (
    <div {...stylex.props(afs.createSourcePanel)} data-mode="cli">
      <div {...withLiteralClass("agent-create-esc-source-field", afs.createSourceField)}>
        <Select
          className="agent-create-esc-source-select"
          label={t("createAgent.quickCreate.cliProvider", "CLI 工具")}
          description={t(
            "createAgent.quickCreate.cliSignInHint",
            "机器在线具备执行能力不等于 CLI 已认证。请确保在目标机器终端已运行对应登录命令。",
          )}
          selectedKey={cliProvider}
          isDisabled={busy}
          onSelectionChange={(key) => setCliProvider(String(key ?? ""))}
        >
          {CREATABLE_CLI_GROUPS.map((group) => (
            <SelectGroup key={group.id}>
              <SelectGroupLabel className="nolo-select-group-label">
                {group.label}
              </SelectGroupLabel>
              {group.items.map((opt) => (
                <SelectItem key={opt.value} id={opt.value} textValue={opt.label}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </Select>
      </div>

      <details
        open={cliMachineOpen}
        style={{
          border: "1px solid var(--borderLight, var(--border))",
          borderRadius: "var(--radius-sm)",
          padding: "8px 12px",
          backgroundColor: "var(--backgroundSecondary)",
        }}
      >
        <summary
                    onClick={(event) => {
                      // 不依赖 <details> 原生折叠：受控 open + 自己翻转，真实浏览器与测试 DOM 行为一致。
                      event.preventDefault();
                      setCliMachineOpen((v) => !v);
                    }}
          style={{
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "var(--fontSize-sm)",
            color: "var(--textSecondary)",
            userSelect: "none",
            marginBottom: 8,
          }}
        >
          {cliMachineId
            ? t("createAgent.quickCreate.runLocationBound", "高级选项：已绑定运行电脑")
            : t("createAgent.quickCreate.runLocationAdvanced", "高级选项：指定运行机器（默认使用本地/默认环境）")}
        </summary>
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
      </details>
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
  const { t, i18n } = useTranslation("ai");
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
    subscriptionPlans,
    subCustomProviderUrl,
    subApiKey,
    setSubApiKey,
    credentialSynced,
    setCredentialSynced,
    showCredentialSync,
    providerKeyRemembered,
    setProviderKeyRemembered,
    providerKeyRef,
    subModel,
    setSubModel,
    thinkingControl,
    thinkingSelection,
    setThinking,
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
  } = useAgentCreateSourceState({
    selected,
    onAdvancedEdit,
    onQuickCreate,
    isSubmitting,
    disabled,
  });

  // Cross-device key sync is only meaningful for logged-in accounts (non-local);
  // local-only users have no account to push to.
  const { preview, total } = subscriptionFootnoteProviders(subscriptionPlans);
  const remaining = total - preview.length;
  const language = i18n.resolvedLanguage ?? i18n.language;
  // Some locales format unit lists without separators; provider names need a visible boundary.
  const providerPreview = /^(zh|ja)(-|$)/i.test(language ?? "")
    ? preview.join("、")
    : preview.join(", ");
  const previewLabel = t("createAgent.runMode.subscription.footnotePreview", "支持 {{providers}}", {
    providers: providerPreview,
  });

  const thinkingField = <ThinkingControlField control={thinkingControl} selection={thinkingSelection} onChange={setThinking} readOnly={busy} />;

  return (
    <div {...stylex.props(afs.createSourceStep)}>
      <AgentCreateIntro />
      <AgentCreateModeCards
        selected={selected}
        busy={busy}
        onSelect={onSelect}
        footnotes={total > 0 ? {
          subscription: (
            <span {...stylex.props(afs.createSourceSubscriptionFootnote)}>
              <span title={previewLabel} {...stylex.props(afs.createSourceSubscriptionPreview)}>
                {previewLabel}
              </span>
              {remaining > 0 && (
                <span {...stylex.props(afs.createSourceSubscriptionCount)}>
                  {t("createAgent.runMode.subscription.footnoteRemaining", "等 {{count}} 个", { count: remaining })}
                </span>
              )}
            </span>
          ),
        } : undefined}
      />

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
          thinkingField={thinkingField}
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
          busy={busy}
          isSubmitting={isSubmitting}
          canCreate={canCreateApi}
          thinkingField={thinkingField}
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
          draftRequiresDesktopOAuth={draft.requiresDesktopOAuth}
          oauth={oauth}
          navigate={navigate}
          busy={busy}
          isSubmitting={isSubmitting}
          canCreate={canCreateSubscription}
          thinkingField={thinkingField}
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
