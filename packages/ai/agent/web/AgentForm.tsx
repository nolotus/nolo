// 路径: ai/agent/web/AgentForm.tsx

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "app/routing";
import { toast } from "app/utils/toast"

import useModelPricing from "../../llm/hooks/useModelPricing";
import {
  resolveAgentEditIdentity,
  useAgentValidation,
} from "../hooks/useAgentFormValidation";
import { normalizeReferences } from "../createAgentSchema";
import { isVoiceModel } from "../isVoiceModel";
import { isCliProvider } from "../cliProviders";
import { type ApiSourceType } from "./PersonaSection";
import PersonaSection from "./PersonaSection";
import KnowledgeToolsSection from "./KnowledgeToolsSection";
import AdvancedSettingsTab from "./AdvancedSettingsTab";
import AgentCreateSourceStep, {
  CREATE_RUN_MODE_LABELS,
  PLATFORM_QUICK_CREATE_MODEL,
  type AgentCreateQuickDraft,
  type CreateRunMode,
} from "./AgentCreateSourceStep";
import {
  buildSubmitPayload as buildSubmitPayloadAction,
  handleAdvancedEdit as handleAdvancedEditAction,
  handleQuickCreate as handleQuickCreateAction,
} from "./agentFormActions";

import Button from "render/web/ui/Button";
import { ConfirmModal } from "render/web/ui/modal/ConfirmModal";
import { deleteDbKey } from "app/hooks/deleteDbKey";
import FormTitle from "render/web/form/FormTitle";
import TabsNav from "render/web/ui/TabsNav";
import { VersionHistoryPanel } from "create/version/VersionHistoryPanel";
import { useAppDispatch, useAppSelector } from "app/store";
import { selectCurrentServer } from "app/settings/settingSlice";
import { useToken } from "identity";
import { read } from "database/dbSlice";
import type { Agent } from "app/types";

import { LuPlus, LuRefreshCw, LuHistory, LuTrash2 } from "react-icons/lu";
import * as stylex from "@stylexjs/stylex";
import { agentFormStyles as afs } from "./agentFormStyles";
import "./agentCreateStylexEscapeHatch.css";

const TABS = [
  { id: 0, key: "tabs.basicInfo" },
  { id: 1, key: "tabs.advancedSettings" },
  { id: 2, key: "tabs.knowledgeTools" },
];

type AgentFormProps = {
  mode?: "create" | "edit";
  initialValues?: any;
  onClose?: () => void;
  readOnly?: boolean;
};

const AgentForm: React.FC<AgentFormProps> = ({
  mode = "create",
  initialValues = {},
  onClose,
  readOnly = false,
}) => {
  const { t } = useTranslation("ai");
  const isCreate = mode === "create";
  const dispatch = useAppDispatch();
  const server = useAppSelector(selectCurrentServer);
  const token = useToken();
  const [showVersionPanel, setShowVersionPanel] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeletingAgent, setIsDeletingAgent] = useState(false);
  const navigate = useNavigate();
  const [activeTabState, setActiveTabState] = useState(0);
  const [searchParams] = useSearchParams();
  const [hydratedInitialValues, setHydratedInitialValues] = useState(initialValues);
  const [isHydratingInitialValues, setIsHydratingInitialValues] = useState(false);
  const { agentKey, agentId } = resolveAgentEditIdentity(initialValues);
  const needsHydration =
    !isCreate &&
    Boolean(agentKey) &&
    (!initialValues?.name || !initialValues?.model || !initialValues?.provider);

  // 删除入口与 topbar「更多 → 删除」共用同一条 deleteDbKey 真值，不放第二份删除逻辑。
  const handleConfirmDeleteAgent = async () => {
    if (!agentKey || isDeletingAgent) return;
    setIsDeletingAgent(true);
    try {
      await dispatch(deleteDbKey(agentKey));
      toast.success(
        t("deleteMovedToTrash", {
          title: hydratedInitialValues?.name || initialValues?.name || agentKey,
          defaultValue: "已移到回收站",
        }),
      );
      setIsDeleteConfirmOpen(false);
      onClose?.();
      navigate(-1);
    } catch (err) {
      console.error("Failed to delete agent:", err);
      toast.error(t("deleteFailed", "删除失败"));
    } finally {
      setIsDeletingAgent(false);
    }
  };

  const { form, provider, useServerProxy, isPublic, onSubmit } =
    useAgentValidation(hydratedInitialValues);

  // 自研 useForm：values/errors/dirty/submitting + set/setAny/getValues/getValue/validate/submit/reset。
  // 不再有 register/control/watch/setValue/getValues/reset/handleSubmit/dirtyFields（RHF 退役）。
  const {
    values: formValues,
    errors,
    dirty,
    submitting: isSubmitting,
    set,
    setAny,
    getValue,
    submit,
    reset,
  } = form;
  // buildSubmitPayload 需要 Record<string, boolean> 的 dirtyFields；自研 useForm 用 Set<string>，转换。
  const dirtyFields = Object.fromEntries([...dirty].map((k) => [k, true]));

  // 本地管理 API 来源（平台 / 自定义）
  const [apiSource, setApiSource] = useState<ApiSourceType>("platform");

  // Create-mode: inline quick create (四卡) unless advanced form / CLI query.
  // Skip when URL already preselects CLI (machine path) → full form.
  const skipSourceStep =
    isCreate && searchParams.get("apiSource") === "cli";
  const [createSourceCommitted, setCreateSourceCommitted] = useState(skipSourceStep);
  const [selectedCreateSource, setSelectedCreateSource] =
    useState<CreateRunMode | null>("platform");
  const [committedCreateSource, setCommittedCreateSource] =
    useState<CreateRunMode | null>(null);
  const [isQuickCreating, setIsQuickCreating] = useState(false);
  const showSourceStep = isCreate && !createSourceCommitted && !skipSourceStep;

  // 只在挂载时同步一次 initialValues 到 hydratedInitialValues。
  // parent 可能每次 render 都传新对象引用，这里用 ref 避免死循环。
  const didSyncRef = useRef(false);
  useEffect(() => {
    if (didSyncRef.current) return;
    didSyncRef.current = true;
    setHydratedInitialValues(initialValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isCreate) return;
    const source = searchParams.get("apiSource");
    if (source !== "cli") return;

    const cliProvider = searchParams.get("cliProvider") || "copilot";
    const machineId = searchParams.get("machineId") || "";
    const machineName = searchParams.get("machineName") || "";
    const validCliProvider = isCliProvider(cliProvider) ? cliProvider : "copilot";

    setApiSource("cli");
    setCreateSourceCommitted(true);
    setAny("apiSource", "cli");
    setAny("cliProvider", validCliProvider);
    setAny("machineId", machineId);
    setAny("model", "");
    setAny("provider", "");
    if (machineName && !formValues.name) {
      setAny("name", `${machineName} ${validCliProvider}`);
    }
  }, [isCreate, searchParams, setAny, formValues.name]);

  /** Apply quick-create draft into form + open full AgentForm (高级编辑). */
  const handleAdvancedEdit = useCallback(
    (draft: AgentCreateQuickDraft) => {
      // Keep requiresDesktopOAuth gate in the wrapper for source contracts.
      if (draft.requiresDesktopOAuth && !draft.oauthConnected) return;
      handleAdvancedEditAction({
        draft,
        // 适配器：RHF 的 getValues(name) / setValue(name, value, options)
        // → 自研 useForm 的 getValue(name) / setAny(name, value)。
        // setValue 的 shouldValidate/shouldDirty options 忽略：自研 setAny 默认标记 dirty。
        getValues: (...args: any[]) =>
          args.length ? getValue(String(args[0])) : form.getValues(),
        setValue: (name: string, value: any) => setAny(name, value),
        setApiSource,
        setCommittedCreateSource,
        setCreateSourceCommitted,
        setActiveTabState,
        platformQuickCreateModel: PLATFORM_QUICK_CREATE_MODEL,
      });
    },
    [getValue, setAny, form],
  );

  const handleQuickCreate = useCallback(
    async (draft: AgentCreateQuickDraft) => {
      await handleQuickCreateAction({
        draft,
        onSubmit,
        t,
        setIsQuickCreating,
        platformQuickCreateModel: PLATFORM_QUICK_CREATE_MODEL,
      });
    },
    [onSubmit, t],
  );

  const handleChangeCreateSource = useCallback(() => {
    setCreateSourceCommitted(false);
  }, []);

  useEffect(() => {
    if (!needsHydration || !agentKey) {
      setIsHydratingInitialValues(false);
      return;
    }

    let cancelled = false;
    setIsHydratingInitialValues(true);

    void (async () => {
      try {
        const fullAgent = (await dispatch(read({ dbKey: agentKey })).unwrap()) as
          | Agent
          | null;
        if (cancelled || !fullAgent) return;
        setHydratedInitialValues({
          ...initialValues,
          ...fullAgent,
          dbKey: agentKey,
        });
      } catch {
        if (!cancelled) {
          setHydratedInitialValues(initialValues);
        }
      } finally {
        if (!cancelled) {
          setIsHydratingInitialValues(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dispatch, agentKey, initialValues, needsHydration]);

  // 将本地 apiSource 同步到表单字段 apiSource，保证 schema / 提交时能拿到
  useEffect(() => {
    if (getValue("apiSource") !== apiSource) {
      setAny("apiSource", apiSource);
    }
  }, [apiSource, getValue, setAny]);

  const { inputPrice, outputPrice, setInputPrice, setOutputPrice } =
    useModelPricing(provider as string, formValues.model as string, setAny as any);

  // 编辑模式初始化表单 & 推导 apiSource
  useEffect(() => {
    if (!isCreate && agentId) {
      const normRefs = normalizeReferences(hydratedInitialValues.references || []);
      reset({
        ...hydratedInitialValues,
        references: normRefs,
        // tags 在 DB 中可能存为 array（如内置 agent），schema 要求 string
        tags: Array.isArray(hydratedInitialValues.tags)
          ? hydratedInitialValues.tags.join(", ")
          : (hydratedInitialValues.tags as any) || "",
        // 交互模式由模型倒推：保证历史记录与当前模型保持一致
        defaultInteractionMode: isVoiceModel(
          hydratedInitialValues.model,
          hydratedInitialValues.provider,
        )
          ? "live_audio"
          : "text",
      });

      // 根据历史数据推导：有 apiKey 或 customProviderUrl 则视为自定义 API；有 apiSource=cli 则为 CLI
      const savedApiSource = hydratedInitialValues.apiSource as ApiSourceType | undefined;
      if (savedApiSource === "cli") {
        setApiSource("cli");
      } else {
        const shouldUseCustom =
          Boolean(hydratedInitialValues.apiKey) ||
          Boolean(hydratedInitialValues.customProviderUrl);
        setApiSource(shouldUseCustom ? "custom" : "platform");
      }
    }
  }, [
    agentId,
    isCreate,
    hydratedInitialValues,
    reset,
  ]);

  // 新建模式允许上游 guided creation 草稿预填，但仍由本表单提交 createAgent。
  useEffect(() => {
    if (!isCreate) return;
    if (!hydratedInitialValues || Object.keys(hydratedInitialValues).length === 0) return;

    const normRefs = normalizeReferences(hydratedInitialValues.references || []);
    reset({
      ...hydratedInitialValues,
      references: normRefs,
      whitelist: hydratedInitialValues.whitelist || [],
      apiSource: hydratedInitialValues.apiSource ?? "platform",
      useServerProxy: hydratedInitialValues.useServerProxy ?? true,
      isPublic: hydratedInitialValues.isPublic ?? false,
      allowFork: hydratedInitialValues.allowFork ?? false,
      // tags 在 DB 中可能存为 array（如内置 agent），schema 要求 string
      tags: Array.isArray(hydratedInitialValues.tags)
        ? hydratedInitialValues.tags.join(", ")
        : (hydratedInitialValues.tags as any) || "",
      // 交互模式由模型倒推
      defaultInteractionMode: isVoiceModel(
        hydratedInitialValues.model,
        hydratedInitialValues.provider,
      )
        ? "live_audio"
        : "text",
    });
    setApiSource((hydratedInitialValues.apiSource as ApiSourceType | undefined) ?? "platform");
  }, [hydratedInitialValues, isCreate, reset]);

  const buildSubmitPayload = (data: any) =>
    buildSubmitPayloadAction(data, { isCreate, dirtyFields });

  const handleFormSubmit = async (data: any) => {
    const finalData = buildSubmitPayload(data);
    await onSubmit(finalData);
    if (!isCreate && agentId) {
      // async version snapshot — non-blocking
      fetch(`${server}/api/version/save`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ type: "agent", entityId: agentId, snapshot: finalData }),
      }).catch(() => {});
    }
    if (!isCreate && onClose) onClose();
  };

  const handleFormSubmitError = (errors: Record<string, string>) => {
    console.error("AgentForm validation failed:", errors);
    const errorKeys = Object.keys(errors);
    if (errorKeys.length > 0) {
      const firstErrorKey = errorKeys[0];
      const message = errors[firstErrorKey] || "Validation failed";
      toast.error(`保存失败: ${message}`);
    }
  };

  // 过滤 Tabs：只读模式下仅展示“基础信息”，隐藏 Prompt/Tools/Knowledge 等敏感配置
  const allTabs = TABS;
  const tabs = allTabs.flatMap((tab) =>
    readOnly && tab.id !== 0
      ? []
      : [{ ...tab, label: t(tab.key) }],
  );
  const activeTab = activeTabState;
  const showVersionHistoryButton = !readOnly && !isCreate && initialValues?.id;
  const showCloseButton = Boolean(onClose);

  const sharedProps = {
    errors,
    values: formValues,
    set: setAny,
    initialValues,
  };

  const renderTabById = (id: number) => {
    switch (id) {
      case 0:
        return (
          <PersonaSection
            errors={errors}
            values={formValues}
            set={setAny as any}
            readOnly={readOnly}
          />
        );

      case 1:
        return (
          <AdvancedSettingsTab
            errors={errors}
            values={formValues}
            set={setAny}
            apiSource={apiSource}
            setApiSource={setApiSource}
            readOnly={readOnly}
          />
        );
      case 2:
        return <KnowledgeToolsSection {...sharedProps} />;
      default:
        return null;
    }
  };

  const runModeBannerLabel =
    committedCreateSource != null
      ? CREATE_RUN_MODE_LABELS[committedCreateSource]
      : apiSource === "cli"
        ? t("createAgent.runMode.cli", "本机 CLI")
        : apiSource === "custom"
          ? CREATE_RUN_MODE_LABELS.api
          : CREATE_RUN_MODE_LABELS.platform;

  return (
    <>
      <link rel="stylesheet" href="/public/route-styles/agent-form.css" />
      <div
        {...stylex.props(
          afs.container,
          isCreate ? afs.createContainer : afs.editContainer
        )}
      >
        {isCreate && !showSourceStep && (
          <FormTitle>{t("createAgent.title")}</FormTitle>
        )}

        {showSourceStep ? (
          <AgentCreateSourceStep
            selected={selectedCreateSource}
            onSelect={setSelectedCreateSource}
            onAdvancedEdit={handleAdvancedEdit}
            onQuickCreate={handleQuickCreate}
            isSubmitting={isQuickCreating}
            disabled={isHydratingInitialValues}
          />
        ) : (
          <form onSubmit={submit(handleFormSubmit, handleFormSubmitError)} noValidate>
            {isCreate && createSourceCommitted && !skipSourceStep && (
              <div {...stylex.props(afs.runModeBanner)}>
                <span>
                  {t("createAgent.runMode.heading", "运行方式")}：
                  <strong {...stylex.props(afs.runModeBannerLabel)}>{runModeBannerLabel}</strong>
                </span>
                <button
                  type="button"
                  {...stylex.props(afs.runModeBannerChange)}
                  onClick={handleChangeCreateSource}
                >
                  {t("createAgent.runMode.change", "更换")}
                </button>
              </div>
            )}

            <div
              {...stylex.props(afs.formHeader)}
            >
              <TabsNav
                tabs={tabs}
                activeTab={activeTab}
                onChange={(id) => {
                  setActiveTabState(Number(id));
                }}
              />
            </div>

            <div {...stylex.props(afs.formBody)}>
              <div {...stylex.props(afs.tabContent)}>
                <div {...stylex.props(afs.tabPanel)}>{renderTabById(activeTab)}</div>
              </div>
            </div>

            <div
              {...stylex.props(afs.formFooter)}
            >
              {isCreate && !readOnly && (
                <p {...stylex.props(afs.nextSteps)}>
                  创建后会直接进入对话。生成评估用例草稿、查看 AgentPage 高级证据都是可选专业步骤；不会自动跑 live eval，也不会自动花钱。
                </p>
              )}
              <div {...stylex.props(afs.footerActions)}>
                {!isCreate && !readOnly && agentKey && (
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    disabled={isSubmitting || isDeletingAgent}
                    size="small"
                    icon={<LuTrash2 />}
                    aria-label={t("agentForm.deleteAgent", "删除此 Agent")}
                    className={stylex.props(afs.footerActionButton).className}
                    style={{ marginRight: "auto" }}
                  >
                    {t("agentForm.deleteAgent", "删除此 Agent")}
                  </Button>
                )}
                {showVersionHistoryButton && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowVersionPanel(true)}
                    size="small"
                    icon={<LuHistory />}
                    title={t("version.history", { defaultValue: "Version History" })}
                    className={stylex.props(afs.footerActionButton).className}
                  />
                )}
                {showCloseButton && (
                  <Button
                    type="button"
                    variant={readOnly ? "primary" : "ghost"}
                    onClick={onClose}
                    disabled={isSubmitting || isHydratingInitialValues}
                    size="small"
                    className={stylex.props(afs.footerActionButton).className}
                  >
                    {readOnly ? t("close", "关闭") : t("cancel")}
                  </Button>
                )}
                {!readOnly && (
                  <Button
                    type="submit"
                    variant="primary"
                    size="small"
                    loading={isSubmitting || isHydratingInitialValues}
                    disabled={isSubmitting || isHydratingInitialValues}
                    icon={isCreate ? <LuPlus /> : <LuRefreshCw />}
                    className={stylex.props(afs.footerActionButton).className}
                  >
                    {isSubmitting || isHydratingInitialValues
                      ? t(isCreate ? "creating" : "updating")
                      : t(isCreate ? "create" : "update")}
                  </Button>
                )}
              </div>
            </div>
          </form>
        )}

        {showVersionPanel && !isCreate && agentId && (() => {
          return (
            <VersionHistoryPanel
              type="agent"
              entityId={agentId}
              onClose={() => setShowVersionPanel(false)}
            />
          );
        })()}

        <ConfirmModal
          isOpen={isDeleteConfirmOpen}
          onClose={() => setIsDeleteConfirmOpen(false)}
          onConfirm={handleConfirmDeleteAgent}
          title={t("agentForm.deleteAgent", "删除此 Agent")}
          message={t(
            "agentForm.deleteAgentConfirmation",
            "确定要删除这个 Agent 吗？删除后会移到回收站。",
          )}
          type="error"
          confirmText={t("delete", "删除")}
          cancelText={t("cancel", "取消")}
          loading={isDeletingAgent}
        />
      </div>
    </>
  );
};

export default AgentForm;
