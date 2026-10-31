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
  resolveAgentSubmitErrorMessage,
  loadAuthoritativeAgentRecord,
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
  // 编辑模式必须以打开时服务端的完整记录为权威基线（HIGH-2 修法）：
  // 仅检查 name/model/provider 非空无法排除旧缓存陈旧的问题，因此编辑模式一律要求权威读取
  const needsHydration = !isCreate && Boolean(agentKey);
  // 权威基线就绪状态：新建模式默认为 true；编辑模式需与服务端权威记录绑定的身份（agentKey + server）严格匹配且不在 loading 状态（HIGH-1）
  const [readyBaselineIdentity, setReadyBaselineIdentity] = useState<{
    isCreate: boolean;
    agentKey: string;
    server: string;
  } | null>(isCreate ? { isCreate: true, agentKey: "", server: "" } : null);
  const [baselineLoadError, setBaselineLoadError] = useState<string | null>(null);

  const isBaselineReady = isCreate
    ? readyBaselineIdentity?.isCreate === true
    : Boolean(
        readyBaselineIdentity &&
        !readyBaselineIdentity.isCreate &&
        readyBaselineIdentity.agentKey === agentKey &&
        readyBaselineIdentity.server === server &&
        !isHydratingInitialValues,
      );

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
    setProgrammatic,
    getValue,
    submit,
    reset,
    hydrate,
  } = form;
  // buildSubmitPayload 需要 Record<string, boolean> 的 dirtyFields；自研 useForm 用 Set<string>，转换。
  const dirtyFields = Object.fromEntries([...dirty].map((k) => [k, true]));
  (setAny as any).programmatic = setProgrammatic;

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

  const tRef = useRef(t);
  tRef.current = t;
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;
  const hydrateRef = useRef(hydrate);
  hydrateRef.current = hydrate;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    if (isCreate) {
      setReadyBaselineIdentity({ isCreate: true, agentKey: "", server: "" });
      setIsHydratingInitialValues(false);
      return;
    }

    if (!agentKey) {
      // 编辑模式必须有明确的 agentKey 身份标识；缺少身份信息无法定位权威记录，严禁置 ready！
      setReadyBaselineIdentity(null);
      setIsHydratingInitialValues(false);
      setBaselineLoadError("missing_identity");
      return;
    }

    let cancelled = false;
    // 开始新读取时立即清除权威就绪身份并置 loading，杜绝切换或重读期间放行提交（HIGH-1）
    setReadyBaselineIdentity(null);
    setIsHydratingInitialValues(true);
    setBaselineLoadError(null);

    void (async () => {
      try {
        // 权威基线必须通过 loadAuthoritativeAgentRecord 获取：
        // 对于非本地 agent，直接向远端服务器发起校验，绕过 database/actions/read 的 local-first 缓存；
        // 远端失败时坚决抛错阻止提交，绝不退回本地旧缓存标记 ready。
        const fullAgent = (await loadAuthoritativeAgentRecord({
          agentKey,
          server,
          token,
          fallbackLocalReader: async () => {
            return dispatchRef.current(read({ dbKey: agentKey })).unwrap();
          },
        })) as Agent | null;

        if (cancelled) return;
        // 权威读取失败或返回空记录时，绝对不允许用不完整/陈旧基线放行提交（HIGH-1）
        if (!fullAgent || typeof fullAgent !== "object") {
          setBaselineLoadError("empty_record");
          setReadyBaselineIdentity(null);
          toast.error(tRef.current("agentForm.baselineNotFound", "未找到该 Agent 的最新配置，请刷新重试"));
          return;
        }

        const normRefs = normalizeReferences(fullAgent.references || []);
        const normalizedAuthoritative: any = {
          ...fullAgent,
          dbKey: agentKey,
          references: normRefs,
          tags: Array.isArray(fullAgent.tags)
            ? fullAgent.tags.join(", ")
            : (fullAgent.tags as any) || "",
          defaultInteractionMode: isVoiceModel(
            fullAgent.model,
            fullAgent.provider,
          )
            ? "live_audio"
            : "text",
        };

        setHydratedInitialValues(normalizedAuthoritative);

        // 迟到的 hydration 绝不得 reset 掉用户已编辑的字段！仅 hydrate 用户没动过的字段（HIGH-2）
        hydrateRef.current(normalizedAuthoritative);

        // 若用户未手动改动过 apiSource，根据权威记录推导
        if (!dirtyRef.current.has("apiSource")) {
          const savedApiSource = fullAgent.apiSource as ApiSourceType | undefined;
          if (savedApiSource === "cli") {
            setApiSource("cli");
          } else {
            const shouldUseCustom =
              Boolean(fullAgent.apiKey) ||
              Boolean(fullAgent.customProviderUrl);
            setApiSource(shouldUseCustom ? "custom" : "platform");
          }
        }

        // 权威基线就绪必须与本次读取身份绑定（HIGH-1）
        setReadyBaselineIdentity({
          isCreate: false,
          agentKey,
          server,
        });
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load authoritative agent baseline:", err);
          setBaselineLoadError("read_failed");
          setReadyBaselineIdentity(null);
          toast.error(tRef.current("agentForm.baselineReadFailed", "加载最新 Agent 配置失败，请检查网络或重试"));
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
  }, [agentKey, isCreate, server, token]);

  // 将本地 apiSource 程序化同步到表单字段 apiSource（走 setProgrammatic，不标记为 dirty）
  useEffect(() => {
    if (getValue("apiSource") !== apiSource) {
      setProgrammatic("apiSource", apiSource);
    }
  }, [apiSource, getValue, setProgrammatic]);

  // HIGH-2 修复：模型加载后的定价自动写入属于程序派生同步，使用 setProgrammatic 不标 dirty；
  // 用户在高级设置或 UI 交互中主动调整价格时，通过包装的 setInputPrice/setOutputPrice 显式标 dirty。
  const handleModelPricingAutoSet = useCallback(
    (name: string, value: number) => {
      setProgrammatic(name, value);
    },
    [setProgrammatic]
  );

  const {
    inputPrice,
    outputPrice,
    setInputPrice: baseSetInputPrice,
    setOutputPrice: baseSetOutputPrice,
  } = useModelPricing(
    provider as string,
    formValues.model as string,
    handleModelPricingAutoSet as any
  );

  const setInputPrice = useCallback(
    (val: number) => {
      baseSetInputPrice(val);
      setAny("inputPrice", val);
    },
    [baseSetInputPrice, setAny]
  );

  const setOutputPrice = useCallback(
    (val: number) => {
      baseSetOutputPrice(val);
      setAny("outputPrice", val);
    },
    [baseSetOutputPrice, setAny]
  );

  // 编辑模式挂载/切换 Agent 时初始化表单：仅在首次装载或切换 agentKey/server 身份时 reset，避免后续同一记录权威基线到达时冲掉用户草稿（HIGH-2）
  const lastLoadedIdentityRef = useRef<string | null>(null);
  useEffect(() => {
    const identityKey = `${agentKey}@${server}`;
    if (!isCreate && agentKey && lastLoadedIdentityRef.current !== identityKey) {
      lastLoadedIdentityRef.current = identityKey;
      setHydratedInitialValues(initialValues);
      const normRefs = normalizeReferences(initialValues.references || []);
      reset({
        ...initialValues,
        references: normRefs,
        // tags 在 DB 中可能存为 array（如内置 agent），schema 要求 string
        tags: Array.isArray(initialValues.tags)
          ? initialValues.tags.join(", ")
          : (initialValues.tags as any) || "",
        // 交互模式由模型倒推：保证历史记录与当前模型保持一致
        defaultInteractionMode: isVoiceModel(
          initialValues.model,
          initialValues.provider,
        )
          ? "live_audio"
          : "text",
      });

      // 根据初始数据推导 apiSource
      const savedApiSource = initialValues.apiSource as ApiSourceType | undefined;
      if (savedApiSource === "cli") {
        setApiSource("cli");
      } else {
        const shouldUseCustom =
          Boolean(initialValues.apiKey) ||
          Boolean(initialValues.customProviderUrl);
        setApiSource(shouldUseCustom ? "custom" : "platform");
      }
    }
  }, [agentKey, server, isCreate, initialValues, reset]);

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
    buildSubmitPayloadAction(data, {
      isCreate,
      dirtyFields,
      initialValues: hydratedInitialValues,
    });

  // 权威基线就绪守卫（HIGH-1 修法）：
  // 编辑模式未取得权威服务端记录之前，或读取中，或读取失败，或身份不匹配（例如同一组件切换 agent 或 server），或缺少 agentKey 身份信息时，坚决拦截提交入口并给予明确用户提示
  const checkBaselineReady = useCallback((): boolean => {
    if (isCreate) return true;
    if (!agentKey || baselineLoadError === "missing_identity") {
      toast.error(t("agentForm.missingIdentity", "Agent 身份信息不足，无法保存"));
      return false;
    }
    const isIdentityMatch =
      Boolean(readyBaselineIdentity) &&
      !readyBaselineIdentity!.isCreate &&
      readyBaselineIdentity!.agentKey === agentKey &&
      readyBaselineIdentity!.server === server;

    if (isHydratingInitialValues || !isIdentityMatch || !isBaselineReady) {
      if (baselineLoadError) {
        toast.error(t("agentForm.baselineFailedPrompt", "最新配置加载失败，请刷新或重试后再保存"));
      } else {
        toast.error(t("agentForm.baselineLoadingPrompt", "正在加载最新配置，请稍候再保存"));
      }
      return false;
    }
    return true;
  }, [
    isCreate,
    agentKey,
    server,
    readyBaselineIdentity,
    isHydratingInitialValues,
    isBaselineReady,
    baselineLoadError,
    t,
  ]);

  const handleFormSubmit = async (data: any) => {
    if (!checkBaselineReady()) return;
    try {
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
    } catch (err: any) {
      // 提交失败时，给用户恰好一个分类错误提示（403 权限不足 / 409 冲突 / 网络或超时未确认 / 其它给安全说明）
      // 保留草稿（不重置表单）、不关对话框（不调 onClose）、不发成功后的快照请求
      const message = resolveAgentSubmitErrorMessage(err, t);
      toast.error(message);
    }
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
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!checkBaselineReady()) return;
              submit(handleFormSubmit, handleFormSubmitError)(e);
            }}
            noValidate
          >
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
                    disabled={
                      isSubmitting ||
                      isHydratingInitialValues ||
                      (!isCreate && !isBaselineReady)
                    }
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
