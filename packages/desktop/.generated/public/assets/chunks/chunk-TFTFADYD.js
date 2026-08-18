import {
  CUSTOM_API_KEY_TEMPLATES,
  SUBSCRIPTION_OAUTH_PROVIDERS,
  findProviderById,
  useCreateDialog
} from "/public/assets/chunks/chunk-GGBHLXJC.js";
import {
  Slider
} from "/public/assets/chunks/chunk-B4HGU7PU.js";
import {
  Combobox_default
} from "/public/assets/chunks/chunk-J5AVP4KL.js";
import {
  SearchInput_default
} from "/public/assets/chunks/chunk-6RIRH2EC.js";
import {
  TabsNav_default
} from "/public/assets/chunks/chunk-Q3A7KJ5P.js";
import {
  t
} from "/public/assets/chunks/chunk-THM65O3R.js";
import {
  PUBLIC_CATALOG_SPACE_ID
} from "/public/assets/chunks/chunk-ZCACUALD.js";
import {
  resolveAvatarUrl
} from "/public/assets/chunks/chunk-NLX7YQL6.js";
import {
  FormTitle_default
} from "/public/assets/chunks/chunk-5X2YZ6P6.js";
import {
  Controller,
  useForm,
  useWatch
} from "/public/assets/chunks/chunk-Q66XOYF3.js";
import {
  buildVersionDeleteRequest,
  buildVersionLabelRequest,
  buildVersionListRequest,
  buildVersionPinRequest,
  buildVersionRestoreRequest,
  ensureSpecificAppVersionLocal,
  fetchAppVersionsCurrentServerFirst
} from "/public/assets/chunks/chunk-CJPHN6JB.js";
import {
  markRecentlyCreated
} from "/public/assets/chunks/chunk-HOEAUVHJ.js";
import {
  nanoid
} from "/public/assets/chunks/chunk-T73R6CXN.js";
import {
  Tooltip
} from "/public/assets/chunks/chunk-WZN2TP6C.js";
import {
  isToolVisibleInUi
} from "/public/assets/chunks/chunk-PE2BCPTN.js";
import {
  DocxPreviewDialog_default
} from "/public/assets/chunks/chunk-2NEHLYGB.js";
import {
  Input,
  PasswordInput
} from "/public/assets/chunks/chunk-XXYYZRCQ.js";
import {
  TextArea
} from "/public/assets/chunks/chunk-MDRAKVMH.js";
import {
  Switch
} from "/public/assets/chunks/chunk-FORT2GLR.js";
import {
  ConfirmModal
} from "/public/assets/chunks/chunk-EPKZ4DTY.js";
import {
  Dialog
} from "/public/assets/chunks/chunk-7HTHEFUV.js";
import {
  Button_default
} from "/public/assets/chunks/chunk-252FCKHS.js";
import {
  Select,
  SelectGroup,
  SelectGroupLabel,
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectList,
  SelectRoot,
  SelectTrigger,
  SelectValue
} from "/public/assets/chunks/chunk-5LT6KM4O.js";
import {
  Popover
} from "/public/assets/chunks/chunk-CXTRCW5J.js";
import {
  $1f3c3b1a70cec653$export$f551688fc98f2e09,
  $ed8ccb2e23e76301$export$6e7a18c0548f3129,
  $ed8ccb2e23e76301$export$94195a47b94ed396,
  $efe09c6d1c304b50$export$5f1af8db9871e1d6
} from "/public/assets/chunks/chunk-DIU2H7DW.js";
import {
  isVoiceModel
} from "/public/assets/chunks/chunk-VKQKRZVR.js";
import {
  resolveReferenceAssets
} from "/public/assets/chunks/chunk-IDOLQ4EL.js";
import {
  CAPABILITY_PACKS,
  CAPABILITY_PACK_BY_ID,
  FORCED_TOOLS,
  TOOL_GROUP_META,
  TOOL_PACKS,
  toolDefinitionsByName,
  toolDescriptions
} from "/public/assets/chunks/chunk-CJFHNPRU.js";
import {
  joinUniqueStrings
} from "/public/assets/chunks/chunk-LWXWW4DE.js";
import {
  markdownToSlate
} from "/public/assets/chunks/chunk-AWGGOX2H.js";
import {
  resolvePageSkillMetadata
} from "/public/assets/chunks/chunk-DFTLAEUX.js";
import {
  getDocState,
  initDocState,
  resetDocState,
  useDocState
} from "/public/assets/chunks/chunk-VPSYWRNH.js";
import {
  StreamingIndicator_default
} from "/public/assets/chunks/chunk-2IJLPAOU.js";
import {
  useAuth
} from "/public/assets/chunks/chunk-WT5G4HGZ.js";
import {
  useIsLoggedIn,
  useToken,
  useUserId
} from "/public/assets/chunks/chunk-4C6PJRJA.js";
import {
  Link,
  useNavigate,
  useSearchParams
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  useSelector
} from "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  CONTEXT_BUDGET,
  addContentToSpace,
  asRecordOrEmpty,
  createAgent,
  createAgentKey,
  deleteDbKey,
  fetchSpace,
  formatTokenCount,
  getModelContextWindow,
  isAbortError,
  read,
  readAndWait,
  selectAllMemberSpaces,
  selectCurrentServer,
  selectCurrentSpace,
  selectCurrentSpaceId,
  selectRuntimeSnapshot,
  selectViewMode,
  toast,
  updateAgent,
  updateContentTitle,
  upload
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  getIsDesktopApp
} from "/public/assets/chunks/chunk-CILBJ2I2.js";
import {
  LuBot,
  LuBrain,
  LuCamera,
  LuCheck,
  LuChevronDown,
  LuClock,
  LuDatabase,
  LuExternalLink,
  LuEye,
  LuFileText,
  LuFolder,
  LuGlobe,
  LuHistory,
  LuImage,
  LuInfo,
  LuLightbulb,
  LuPencil,
  LuPin,
  LuPinOff,
  LuPlus,
  LuRefreshCw,
  LuSettings,
  LuSparkles,
  LuTrash2,
  LuTriangle,
  LuWrench,
  LuX
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import {
  buildRoutableContentPath
} from "/public/assets/chunks/chunk-TBNFSVJC.js";
import {
  asOptionalTrimmedString
} from "/public/assets/chunks/chunk-SM3EH4JD.js";
import {
  ALL_MODELS,
  OLLAMA_CLOUD_GLM_52_MODEL
} from "/public/assets/chunks/chunk-NKT4VBPJ.js";
import {
  CLI_CAPABILITY_BY_PROVIDER,
  CLI_PROVIDER_DISPLAY_LABELS,
  CLI_PROVIDER_OPTIONS,
  CLI_PROVIDER_VALUES,
  DEFAULT_FREQUENCY_PENALTY,
  DEFAULT_MAX_TOKENS,
  DEFAULT_MODEL,
  DEFAULT_PRESENCE_PENALTY,
  DEFAULT_REASONING_EFFORT,
  DEFAULT_TEMPERATURE,
  DEFAULT_TOP_P,
  MAX_TOKENS_LIMIT,
  getAvailableReasoningEfforts,
  getCreateAgentSchema,
  getModelsByProvider,
  getProviderByModelName,
  isCliProvider,
  isLocalCustomProviderUrl,
  normalizeReferences,
  runtimePolicyAllowsHostedExec
} from "/public/assets/chunks/chunk-LPS7IE46.js";
import {
  normalizeServerOrigin
} from "/public/assets/chunks/chunk-XJRNNKKF.js";
import {
  isRecord
} from "/public/assets/chunks/chunk-IRTDRTXE.js";
import {
  PLATFORM_HOSTED_KIMI_K3_MODEL
} from "/public/assets/chunks/chunk-XDKHKMJ3.js";
import {
  asTrimmedLowercaseString
} from "/public/assets/chunks/chunk-VCXOIOLL.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  toErrorMessage
} from "/public/assets/chunks/chunk-3EHRYDZ6.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/ai/agent/web/AgentForm.tsx
var import_react18 = __toESM(require_react());

// packages/ai/llm/hooks/useModelPricing.ts
var import_react = __toESM(require_react());
var resolveModelPrice = (model) => {
  const price = model?.price ?? model?.pricing;
  return {
    input: typeof price?.input === "number" ? price.input : 0,
    output: typeof price?.output === "number" ? price.output : 0,
    cachingWrite: price?.cachingWrite,
    cachingRead: price?.cachingRead,
    inputCacheHit: price?.inputCacheHit
  };
};
var useModelPricing = (provider, modelName, setValue) => {
  const [models, setModels] = (0, import_react.useState)([]);
  const [inputPrice, setInputPrice] = (0, import_react.useState)(0);
  const [outputPrice, setOutputPrice] = (0, import_react.useState)(0);
  const setValueRef = (0, import_react.useRef)(setValue);
  (0, import_react.useEffect)(() => {
    setValueRef.current = setValue;
  }, [setValue]);
  (0, import_react.useEffect)(() => {
    const resolvedProvider = provider || getProviderByModelName(modelName);
    if (!resolvedProvider) return;
    setModels(getModelsByProvider(resolvedProvider));
  }, [provider, modelName]);
  (0, import_react.useEffect)(() => {
    const selectedModel = models.find((model) => model.name === modelName);
    if (selectedModel) {
      const price = resolveModelPrice(selectedModel);
      setInputPrice((current) => current === price.input ? current : price.input);
      setOutputPrice((current) => current === price.output ? current : price.output);
      if (setValueRef.current) {
        setValueRef.current("inputPrice", price.input);
        setValueRef.current("outputPrice", price.output);
      }
    }
  }, [models, modelName]);
  const updateInputPrice = (value) => {
    setInputPrice(value);
    if (setValue) setValue("inputPrice", value);
  };
  const updateOutputPrice = (value) => {
    setOutputPrice(value);
    if (setValue) setValue("outputPrice", value);
  };
  return {
    inputPrice,
    outputPrice,
    setInputPrice: updateInputPrice,
    setOutputPrice: updateOutputPrice
  };
};
var useModelPricing_default = useModelPricing;

// packages/ai/agent/hooks/useAgentFormValidation.ts
var import_react2 = __toESM(require_react());
var extractAgentId = (value) => {
  const raw = value.trim();
  if (raw.startsWith("agent-")) {
    const parts = raw.split("-");
    if (parts.length >= 3) return parts.slice(2).join("-");
  }
  return raw;
};
var resolveAgentEditIdentity = (initialValues) => {
  const rawAgentKey = asOptionalTrimmedString(initialValues?.dbKey) ?? asOptionalTrimmedString(initialValues?.contentKey);
  const rawAgentId = asOptionalTrimmedString(initialValues?.id) ?? rawAgentKey;
  const agentId = rawAgentId ? extractAgentId(rawAgentId) : void 0;
  return {
    agentKey: rawAgentKey,
    agentId,
    isEditing: Boolean(agentId)
  };
};
var useAgentValidation = (initialValues) => {
  const dispatch = useAppDispatch();
  const { createNewDialog } = useCreateDialog();
  const auth = useAuth();
  const { t: t2 } = useTranslation("ai");
  const currentSpaceId = useAppSelector(selectCurrentSpaceId);
  const currentSpace = useAppSelector(selectCurrentSpace);
  const { agentId: resolvedAgentId, isEditing } = resolveAgentEditIdentity(initialValues);
  const form = useForm({
    resolver: t(getCreateAgentSchema(t2)),
    defaultValues: isEditing && initialValues ? {
      ...initialValues,
      // 如果老数据里没有 apiSource，则默认 platform
      apiSource: initialValues.apiSource ?? "platform",
      machineId: initialValues.machineId ?? initialValues.runtimeBinding?.machineId ?? "",
      tags: Array.isArray(initialValues.tags) ? initialValues.tags.join(", ") : initialValues.tags || "",
      references: normalizeReferences(initialValues.references || []),
      whitelist: initialValues.whitelist || []
    } : {
      greeting: t2("form.defaults.greeting"),
      useServerProxy: true,
      isPublic: false,
      whitelist: [],
      // 新建时默认为平台 API
      apiSource: "platform",
      provider: DEFAULT_MODEL.provider,
      model: DEFAULT_MODEL.name,
      // avatarFileId 必须有初始值，否则 BasicInfoTab 用 setValue 写入后
      // RHF 不会把未注册字段放进 submit data，导致头像上传后保存丢失
      avatarFileId: null
    }
  });
  const { watch } = form;
  const onSubmit = (0, import_react2.useCallback)(
    async (data) => {
      const effectiveUserId = auth.user?.userId?.trim() ? auth.user.userId.trim() : "local";
      if (isEditing && resolvedAgentId && initialValues) {
        await dispatch(
          updateAgent({
            userId: effectiveUserId,
            agentId: resolvedAgentId,
            formData: data,
            previousAgent: initialValues
          })
        ).unwrap();
        const contentKey = initialValues.dbKey;
        const nextName = String(data.name ?? "").trim();
        const previousName = String(initialValues.name ?? "").trim();
        if (currentSpaceId && contentKey && currentSpace?.contents?.[contentKey] && nextName && nextName !== previousName) {
          const titleAction = updateContentTitle({
            spaceId: currentSpaceId,
            contentKey,
            title: nextName
          });
          await dispatch(titleAction);
        }
        return;
      }
      const createdAgent = await dispatch(
        createAgent({
          userId: effectiveUserId,
          formData: data,
          spaceId: currentSpaceId || void 0
          // 传入当前空间 ID
        })
      ).unwrap();
      const agentDbKey = createdAgent.isPublic ? createAgentKey.public(createdAgent.id) : createAgentKey.private(effectiveUserId, createdAgent.id);
      markRecentlyCreated(agentDbKey);
      if (currentSpaceId) {
        try {
          await dispatch(addContentToSpace({
            spaceId: currentSpaceId,
            title: createdAgent.name || "\u672A\u547D\u540D\u667A\u80FD\u4F53",
            type: "agent" /* AGENT */,
            contentKey: agentDbKey
          })).unwrap();
        } catch (error) {
          console.error("Failed to add agent to space sidebar:", error);
        }
      }
      await createNewDialog({
        agents: [agentDbKey]
      });
      return { agentDbKey, credentialRef: createdAgent.credentialRef };
    },
    [
      auth.user,
      isEditing,
      initialValues,
      resolvedAgentId,
      dispatch,
      createNewDialog,
      t2,
      currentSpaceId,
      currentSpace
    ]
  );
  return {
    form,
    provider: watch("provider"),
    useServerProxy: watch("useServerProxy"),
    isPublic: watch("isPublic"),
    onSubmit,
    isEditing
  };
};

// packages/ai/agent/web/BasicInfoTab.tsx
var import_react4 = __toESM(require_react());

// packages/render/web/form/FormField.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var Label = ({
  children,
  required,
  error,
  className = "",
  ...props
}) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
  "label",
  {
    className: `form-label ${error ? "has-error" : ""} ${className}`,
    ...props,
    children: [
      children,
      required && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "required", children: "*" })
    ]
  }
);
var FormField = ({
  children,
  className = "",
  label,
  required = false,
  error,
  helperText,
  horizontal = false,
  labelWidth = "140px",
  disabled = false,
  hideLabel = false,
  style,
  htmlFor
}) => {
  const hasError = Boolean(error);
  const fieldClasses = [
    "form-field",
    horizontal && "horizontal",
    disabled && "disabled",
    hasError && "error",
    className
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: fieldClasses, style, children: [
    !hideLabel && label && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      Label,
      {
        required,
        error: hasError,
        htmlFor,
        style: horizontal ? { "--label-width": labelWidth } : void 0,
        children: label
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "form-content", children: [
      children,
      helperText && !hasError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "form-help", children: helperText }),
      hasError && error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "form-error", role: "alert", children: error })
    ] })
  ] });
};
FormField.displayName = "FormField";
Label.displayName = "Label";

// packages/ai/agent/web/GreetingMenuEditor.tsx
var import_react3 = __toESM(require_react());
var import_jsx_runtime2 = __toESM(require_jsx_runtime());
var GreetingMenuEditor = ({
  items,
  onChange
}) => {
  const { t: t2 } = useTranslation("ai");
  const handleAdd = (0, import_react3.useCallback)(() => {
    const id = nanoid();
    const next = [
      ...items,
      {
        id,
        label: "",
        userMessage: ""
      }
    ];
    onChange(next);
  }, [items, onChange]);
  const handleRemove = (0, import_react3.useCallback)(
    (id) => {
      const next = items.filter((item) => item.id !== id);
      onChange(next);
    },
    [items, onChange]
  );
  const handleChangeItem = (0, import_react3.useCallback)(
    (id, patch) => {
      const next = items.map(
        (item) => item.id === id ? { ...item, ...patch } : item
      );
      onChange(next);
    },
    [items, onChange]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "greeting-menu", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "greeting-menu__header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "greeting-menu__title", children: t2("form.greetingMenuTitle", "\u95EE\u5019\u83DC\u5355\uFF08\u53EF\u9009\uFF09") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "greeting-menu__desc", children: t2(
        "form.greetingMenuDesc",
        "\u4F60\u53EF\u4EE5\u4E3A\u8FD9\u4E2A Agent \u914D\u7F6E\u82E5\u5E72\u5FEB\u6377\u5165\u53E3\uFF0C\u7528\u6237\u5728\u8FDB\u5165\u5BF9\u8BDD\u65F6\u4F1A\u770B\u5230\u8FD9\u4E9B\u6309\u94AE\u3002"
      ) })
    ] }),
    items.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "greeting-menu__list", children: items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "greeting-menu__item", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "greeting-menu__row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "greeting-menu__col greeting-menu__col--label", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "greeting-menu__field-label", children: t2("form.greetingMenuItemLabel", "\u6309\u94AE\u6587\u6848") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          Input,
          {
            className: "greeting-menu__input",
            size: "sm",
            value: item.label,
            onChange: (e) => handleChangeItem(item.id, { label: e.target.value }),
            placeholder: t2(
              "form.greetingMenuItemLabelPlaceholder",
              "\u4F8B\u5982\uFF1A\u751F\u6210\u4E00\u4EFD\u5468\u62A5"
            )
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "greeting-menu__col greeting-menu__col--message", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "greeting-menu__field-label", children: [
          t2("form.greetingMenuItemUserMessage", "\u7B49\u4EF7\u7528\u6237\u8BF7\u6C42"),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "greeting-menu__optional", children: t2("form.optional", "\uFF08\u53EF\u9009\uFF09") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          Input,
          {
            className: "greeting-menu__input",
            size: "sm",
            value: item.userMessage ?? "",
            onChange: (e) => handleChangeItem(item.id, {
              userMessage: e.target.value
            }),
            placeholder: t2(
              "form.greetingMenuItemUserMessagePlaceholder",
              "\u4F8B\u5982\uFF1A\u8BF7\u5E2E\u6211\u751F\u6210\u4E00\u4EFD\u672C\u5468\u7684\u5DE5\u4F5C\u5468\u62A5\uFF0C\u603B\u7ED3\u8FDB\u5C55\u548C\u4E0B\u5468\u8BA1\u5212"
            )
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "button",
        {
          type: "button",
          className: "greeting-menu__remove",
          onClick: () => handleRemove(item.id),
          "aria-label": t2("form.greetingMenuRemove", "\u5220\u9664\u83DC\u5355\u9879"),
          children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuTrash2, { size: 16, "aria-hidden": "true" })
        }
      )
    ] }) }, item.id)) }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
      "button",
      {
        type: "button",
        className: "greeting-menu__add",
        onClick: handleAdd,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuPlus, { size: 16, "aria-hidden": "true" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: items.length === 0 ? t2("form.greetingMenuAddFirst", "\u6DFB\u52A0\u4E00\u4E2A\u83DC\u5355\u9879") : t2("form.greetingMenuAddMore", "\u518D\u6DFB\u52A0\u4E00\u4E2A\u83DC\u5355\u9879") })
        ]
      }
    )
  ] });
};
var GreetingMenuEditor_default = GreetingMenuEditor;

// packages/ai/agent/web/BasicInfoTab.tsx
var import_jsx_runtime3 = __toESM(require_jsx_runtime());
var BasicInfoTab = ({
  errors,
  control,
  setValue,
  readOnly
}) => {
  const { t: t2 } = useTranslation("ai");
  const dispatch = useAppDispatch();
  const userId = useUserId();
  const server = useAppSelector(selectCurrentServer);
  const fileInputRef = (0, import_react4.useRef)(null);
  const [avatarPreview, setAvatarPreview] = (0, import_react4.useState)(null);
  const avatarFileId = useWatch({ control, name: "avatarFileId" });
  (0, import_react4.useEffect)(() => {
    setAvatarPreview(resolveAvatarUrl(avatarFileId, server));
  }, [avatarFileId, server]);
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setAvatarPreview(URL.createObjectURL(file));
    try {
      const metadata = await dispatch(upload({ file, customKey: `agent-avatar-${Date.now()}`, userId })).unwrap();
      if (metadata?.id) {
        setValue("avatarFileId", metadata.id, { shouldDirty: true });
        toast.success(t2("form.avatarUploaded", "\u5934\u50CF\u5DF2\u4E0A\u4F20"));
      }
    } catch {
      toast.error(t2("form.avatarUploadFailed", "\u5934\u50CF\u4E0A\u4F20\u5931\u8D25"));
    }
  };
  const commonProps = { horizontal: true, labelWidth: "140px" };
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "tab-content-wrapper", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(FormField, { label: t2("form.avatar", "\u5934\u50CF"), ...commonProps, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "agent-avatar-upload", children: [
      readOnly ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "agent-avatar-preview", children: avatarPreview ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("img", { src: avatarPreview, alt: "avatar" }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(LuCamera, { size: 22, className: "agent-avatar-placeholder", "aria-hidden": "true" }) }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
        "button",
        {
          type: "button",
          className: "agent-avatar-preview agent-avatar-preview--clickable",
          onClick: () => fileInputRef.current?.click(),
          "aria-label": t2("form.avatarUpload", "\u4E0A\u4F20\u5934\u50CF"),
          children: [
            avatarPreview ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("img", { src: avatarPreview, alt: "" }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(LuCamera, { size: 22, className: "agent-avatar-placeholder", "aria-hidden": "true" }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "agent-avatar-overlay", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(LuCamera, { size: 16, "aria-hidden": "true" }) })
          ]
        }
      ),
      !readOnly && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        "input",
        {
          ref: fileInputRef,
          type: "file",
          accept: "image/*",
          className: "agent-avatar-input",
          onChange: handleAvatarUpload
        }
      )
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(FormField, { label: t2("form.name"), required: true, error: errors.name?.message, ...commonProps, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      Controller,
      {
        name: "name",
        control,
        render: ({ field }) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Input, { ...field, placeholder: t2("form.namePlaceholder"), disabled: readOnly })
      }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(FormField, { label: t2("form.greeting"), error: errors.greeting?.message, ...commonProps, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      Controller,
      {
        name: "greeting",
        control,
        render: ({ field }) => {
          const { value, onChange, onBlur, ref, name } = field;
          const currentText = typeof value === "string" ? value : isRecord(value) ? value.text ?? "" : "";
          const currentMenu = isRecord(value) && Array.isArray(value.menu) ? value.menu : [];
          const handleTextChange = (e) => {
            const nextText = e.target.value;
            if (currentMenu.length === 0 && (typeof value === "string" || value == null)) {
              onChange(nextText);
              return;
            }
            onChange({ ...asRecordOrEmpty(value), text: nextText, menu: currentMenu });
          };
          const handleMenuChange = (nextMenu) => {
            onChange({ ...asRecordOrEmpty(value), text: currentText, menu: nextMenu });
          };
          return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
              TextArea,
              {
                name,
                ref,
                value: currentText,
                onChange: handleTextChange,
                onBlur,
                placeholder: t2("form.defaults.greeting"),
                rows: 3,
                disabled: readOnly
              }
            ),
            !readOnly && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(GreetingMenuEditor_default, { items: currentMenu, onChange: handleMenuChange })
          ] });
        }
      }
    ) }),
    !readOnly && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      FormField,
      {
        label: t2("form.prompt"),
        error: errors.prompt?.message,
        helperText: t2("help.promptAutomation"),
        ...commonProps,
        children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          Controller,
          {
            name: "prompt",
            control,
            render: ({ field }) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(TextArea, { ...field, placeholder: t2("form.promptPlaceholder"), rows: 6 })
          }
        )
      }
    )
  ] });
};
var BasicInfoTab_default = BasicInfoTab;

// packages/ai/agent/web/ReferencesTab.tsx
var import_react9 = __toESM(require_react());

// packages/ai/skills/skillReferenceSummary.ts
var summarizeSkillReferences = (references, contentByKey) => {
  if (!Array.isArray(references) || references.length === 0) {
    return [];
  }
  return references.flatMap((reference) => {
    const content = contentByKey.get(reference.dbKey);
    const meta = resolvePageSkillMetadata(content);
    const skillConfig = meta?.skillConfig;
    if (meta?.kind !== "skill" && !skillConfig) {
      return [];
    }
    const skillName = asOptionalTrimmedString(skillConfig?.name) ?? asOptionalTrimmedString(reference.title) ?? asOptionalTrimmedString(content?.title) ?? reference.dbKey;
    return [
      {
        dbKey: reference.dbKey,
        title: asOptionalTrimmedString(reference.title) ?? asOptionalTrimmedString(content?.title) ?? reference.dbKey,
        referenceType: reference.type,
        skillId: asOptionalTrimmedString(skillConfig?.id),
        skillName,
        description: asOptionalTrimmedString(skillConfig?.description),
        toolNames: skillConfig?.toolNames ?? [],
        requiredSkills: joinUniqueStrings(
          meta?.requiredSkills,
          skillConfig?.requiredSkills
        ),
        recommendedSkills: joinUniqueStrings(
          meta?.recommendedSkills,
          skillConfig?.recommendedSkills
        ),
        promptPatch: asOptionalTrimmedString(skillConfig?.promptPatch)
      }
    ];
  });
};

// packages/ai/agent/web/ReferencesSelector.tsx
var import_react5 = __toESM(require_react());

// packages/ai/agent/web/referencePickerUtils.ts
var ALL_SPACES_ID = "__all_spaces__";
var buildReferencePickerSpaceItems = ({
  currentSpace,
  allMemberSpaces,
  allSpacesLabel
}) => {
  const items = [
    {
      id: ALL_SPACES_ID,
      name: allSpacesLabel,
      isCurrent: false
    }
  ];
  const nameMap = /* @__PURE__ */ new Map();
  if (currentSpace) {
    items.push({
      id: currentSpace.id,
      name: currentSpace.name,
      isCurrent: true
    });
    nameMap.set(currentSpace.id, currentSpace.name);
  }
  const others = allMemberSpaces.filter((space) => space.spaceId !== currentSpace?.id).sort((a, b) => a.spaceName.localeCompare(b.spaceName)).map((space) => {
    nameMap.set(space.spaceId, space.spaceName);
    return {
      id: space.spaceId,
      name: space.spaceName,
      isCurrent: false
    };
  });
  items.push(...others);
  return { items, nameMap };
};
var buildReferencePickerContents = ({
  contentsObj,
  spaceId,
  spaceName,
  unnamedLabel
}) => Object.entries(contentsObj).flatMap(([dbKey, value]) => {
  if (dbKey.startsWith("dialog-") || !value) return [];
  return [
    {
      dbKey,
      title: value?.title || unnamedLabel,
      spaceId,
      spaceName,
      contentType: value?.type,
      skillSummary: value?.skillSummary ?? null
    }
  ];
});
var filterReferencePickerContents = ({
  spacesData,
  activeSpaceId,
  searchQuery,
  pickerMode,
  skillCandidateMap
}) => {
  const trimmedQuery = asTrimmedLowercaseString(searchQuery);
  const scopedContents = activeSpaceId === ALL_SPACES_ID ? Array.from(spacesData.values()).flat() : spacesData.get(activeSpaceId) || [];
  const searchedContents = trimmedQuery ? scopedContents.filter((item) => {
    const title = item.title.toLowerCase();
    const key = item.dbKey.toLowerCase();
    const space = item.spaceName.toLowerCase();
    return title.includes(trimmedQuery) || key.includes(trimmedQuery) || space.includes(trimmedQuery);
  }) : scopedContents;
  if (pickerMode !== "skill") {
    return searchedContents;
  }
  return searchedContents.filter(
    (item) => item.contentType === "page" && (item.skillSummary?.isSkill || skillCandidateMap.get(item.dbKey))
  );
};
var collectPendingSkillCandidates = ({
  contents,
  skillCandidateMap
}) => contents.filter(
  (item) => item.contentType === "page" && !item.skillSummary?.isSkill && !skillCandidateMap.has(item.dbKey)
);

// packages/ai/agent/web/ReferencesSelector.tsx
var import_jsx_runtime4 = __toESM(require_jsx_runtime());
var GLOBAL_RECOMMENDED_SKILL_FALLBACKS = [
  {
    dbKey: "page-0e95801d90-01KMADTHRRCHFVS884SGQXGADP",
    title: "Demo Root Skill",
    spaceId: PUBLIC_CATALOG_SPACE_ID,
    spaceName: "",
    contentType: "page",
    skillSummary: {
      isSkill: true,
      skillId: "demo-root-skill",
      name: "demo-root-skill",
      description: "Demo composition skill for required vs recommended loading.",
      toolNames: ["readPage"],
      triggerMode: "recommended"
    }
  },
  {
    dbKey: "page-0e95801d90-01KMADTHRGYJWRREW3BV2B55ED",
    title: "Demo Recommended Page Skill",
    spaceId: PUBLIC_CATALOG_SPACE_ID,
    spaceName: "",
    contentType: "page",
    skillSummary: {
      isSkill: true,
      skillId: "demo-recommended-page",
      name: "demo-recommended-page",
      description: "Recommended: inspect referenced local pages.",
      toolNames: ["readPage"],
      triggerMode: "recommended"
    }
  },
  {
    dbKey: "page-0e95801d90-01KMADTHQMSX5PT9WW4ZZD7Z7M",
    title: "Demo Must Web Skill",
    spaceId: PUBLIC_CATALOG_SPACE_ID,
    spaceName: "",
    contentType: "page",
    skillSummary: {
      isSkill: true,
      skillId: "demo-must-web",
      name: "demo-must-web",
      description: "Hard requirement: current web lookup.",
      toolNames: ["exa_search", "fetchWebpage"],
      triggerMode: "required"
    }
  }
];
function dedupeContentItems(items) {
  const seen = /* @__PURE__ */ new Set();
  return items.filter((item) => {
    if (seen.has(item.dbKey)) return false;
    seen.add(item.dbKey);
    return true;
  });
}
var ReferencesSelector = ({
  value = [],
  onChange,
  pickerMode = "knowledge",
  renderItemExtra
}) => {
  const { t: t2 } = useTranslation("ai");
  const dispatch = useAppDispatch();
  const currentSpace = useAppSelector(selectCurrentSpace);
  const allMemberSpaces = useAppSelector(selectAllMemberSpaces);
  const viewMode = useAppSelector(selectViewMode);
  const fetchedSpacesRef = (0, import_react5.useRef)(/* @__PURE__ */ new Set());
  const [activeSpaceId, setActiveSpaceId] = (0, import_react5.useState)("");
  const [searchQuery, setSearchQuery] = (0, import_react5.useState)("");
  const [spacesData, setSpacesData] = (0, import_react5.useState)(() => /* @__PURE__ */ new Map());
  const [spaceContentSources, setSpaceContentSources] = (0, import_react5.useState)(() => /* @__PURE__ */ new Map());
  const [loading, setLoading] = (0, import_react5.useState)(false);
  const [loadingSkillCandidates, setLoadingSkillCandidates] = (0, import_react5.useState)(false);
  const [loadingGlobalSkills, setLoadingGlobalSkills] = (0, import_react5.useState)(false);
  const [globalSkillsUnavailable, setGlobalSkillsUnavailable] = (0, import_react5.useState)(false);
  const [skillCandidateMap, setSkillCandidateMap] = (0, import_react5.useState)(
    () => /* @__PURE__ */ new Map()
  );
  const [globalSkillContents, setGlobalSkillContents] = (0, import_react5.useState)([]);
  const fetchedGlobalSkillsRef = (0, import_react5.useRef)(false);
  const [previewPageKey, setPreviewPageKey] = (0, import_react5.useState)(null);
  const [previewFileName, setPreviewFileName] = (0, import_react5.useState)("");
  const { items: spaceItems, nameMap: spaceNameMap } = (0, import_react5.useMemo)(
    () => buildReferencePickerSpaceItems({
      currentSpace,
      allMemberSpaces,
      allSpacesLabel: t2("references.allSpaces", "All Spaces")
    }),
    [currentSpace, allMemberSpaces, t2]
  );
  const cacheSpaceContents = (0, import_react5.useCallback)(
    (id, contentsObj) => {
      const list = buildReferencePickerContents({
        contentsObj,
        spaceId: id,
        spaceName: spaceNameMap.get(id) ?? "",
        unnamedLabel: t2("unnamed")
      });
      setSpacesData((prev) => {
        const next = new Map(prev);
        next.set(id, list);
        return next;
      });
      setSpaceContentSources((prev) => {
        const next = new Map(prev);
        next.set(id, contentsObj || {});
        return next;
      });
      fetchedSpacesRef.current.add(id);
    },
    [spaceNameMap, t2]
  );
  const cacheGlobalSkillContents = (0, import_react5.useCallback)(
    (contentsObj) => {
      const list = buildReferencePickerContents({
        contentsObj,
        spaceId: PUBLIC_CATALOG_SPACE_ID,
        spaceName: t2("references.globalRecommendedSkills"),
        unnamedLabel: t2("unnamed")
      });
      setGlobalSkillContents(
        list.length > 0 ? list : GLOBAL_RECOMMENDED_SKILL_FALLBACKS.map((item) => ({
          ...item,
          spaceName: t2("references.globalRecommendedSkills")
        }))
      );
      setGlobalSkillsUnavailable(false);
      setSpaceContentSources((prev) => {
        const next = new Map(prev);
        next.set(PUBLIC_CATALOG_SPACE_ID, contentsObj || {});
        return next;
      });
      fetchedGlobalSkillsRef.current = true;
    },
    [t2]
  );
  (0, import_react5.useEffect)(() => {
    if (!activeSpaceId) {
      setActiveSpaceId(viewMode === "all" ? ALL_SPACES_ID : currentSpace?.id || ALL_SPACES_ID);
    }
  }, [activeSpaceId, currentSpace?.id, viewMode]);
  const fetchSpacesData = async (id, callback) => {
    try {
      const res = await dispatch(fetchSpace({ spaceId: id })).unwrap();
      callback(id, res.contents || {});
    } catch (e) {
      console.error(e);
    }
  };
  (0, import_react5.useEffect)(() => {
    if (!activeSpaceId) return;
    if (activeSpaceId === ALL_SPACES_ID) {
      const loadAllSpaces = async () => {
        setLoading(true);
        const ids = Array.from(
          new Set(
            [currentSpace?.id, ...spaceItems.map((item) => item.id)].filter((id) => Boolean(id) && id !== ALL_SPACES_ID)
          )
        );
        if (currentSpace?.id && currentSpace?.contents) {
          cacheSpaceContents(currentSpace.id, currentSpace.contents);
        }
        await Promise.all(
          ids.filter((id) => id !== currentSpace?.id && !fetchedSpacesRef.current.has(id)).map((id) => fetchSpacesData(id, cacheSpaceContents))
        );
        setLoading(false);
      };
      void loadAllSpaces();
      return;
    }
    if (fetchedSpacesRef.current.has(activeSpaceId)) return;
    if (activeSpaceId === currentSpace?.id && currentSpace?.contents) {
      cacheSpaceContents(activeSpaceId, currentSpace.contents);
      return;
    }
    setLoading(true);
    void fetchSpacesData(activeSpaceId, cacheSpaceContents).finally(() => setLoading(false));
  }, [activeSpaceId, cacheSpaceContents, currentSpace, dispatch, spaceItems]);
  (0, import_react5.useEffect)(() => {
    if (pickerMode !== "skill") return;
    if (fetchedGlobalSkillsRef.current) return;
    if (currentSpace?.id === PUBLIC_CATALOG_SPACE_ID && currentSpace?.contents) {
      cacheGlobalSkillContents(currentSpace.contents);
      return;
    }
    let cancelled = false;
    setLoadingGlobalSkills(true);
    void dispatch(fetchSpace({ spaceId: PUBLIC_CATALOG_SPACE_ID, fresh: true })).unwrap().then((res) => {
      if (cancelled) return;
      cacheGlobalSkillContents(res.contents || {});
    }).catch(() => {
      if (cancelled) return;
      setGlobalSkillContents(
        GLOBAL_RECOMMENDED_SKILL_FALLBACKS.map((item) => ({
          ...item,
          spaceName: t2("references.globalRecommendedSkills")
        }))
      );
      setGlobalSkillsUnavailable(true);
      fetchedGlobalSkillsRef.current = true;
    }).finally(() => {
      if (!cancelled) setLoadingGlobalSkills(false);
    });
    return () => {
      cancelled = true;
    };
  }, [
    cacheGlobalSkillContents,
    currentSpace?.contents,
    currentSpace?.id,
    dispatch,
    pickerMode,
    t2
  ]);
  const baseContents = (0, import_react5.useMemo)(() => {
    return filterReferencePickerContents({
      spacesData,
      activeSpaceId,
      searchQuery,
      pickerMode: "knowledge",
      skillCandidateMap: /* @__PURE__ */ new Map()
    });
  }, [spacesData, activeSpaceId, searchQuery]);
  const globalBaseContents = (0, import_react5.useMemo)(() => {
    return filterReferencePickerContents({
      spacesData: /* @__PURE__ */ new Map([[PUBLIC_CATALOG_SPACE_ID, globalSkillContents]]),
      activeSpaceId: PUBLIC_CATALOG_SPACE_ID,
      searchQuery,
      pickerMode: "knowledge",
      skillCandidateMap: /* @__PURE__ */ new Map()
    });
  }, [globalSkillContents, searchQuery]);
  (0, import_react5.useEffect)(() => {
    if (pickerMode !== "skill") {
      setLoadingSkillCandidates(false);
      return;
    }
    const candidates = collectPendingSkillCandidates({
      contents: dedupeContentItems([...baseContents, ...globalBaseContents]),
      skillCandidateMap
    });
    if (candidates.length === 0) {
      setLoadingSkillCandidates(false);
      return;
    }
    let cancelled = false;
    setLoadingSkillCandidates(true);
    const loadSkillCandidates = async () => {
      const results = await Promise.all(
        candidates.map(async (item) => {
          try {
            const cachedPage = spaceContentSources.get(item.spaceId)?.[item.dbKey];
            const pageLike = cachedPage && (typeof cachedPage.content === "string" || cachedPage.meta || Array.isArray(cachedPage.tools)) ? cachedPage : await dispatch(readAndWait(item.dbKey)).unwrap();
            const meta = resolvePageSkillMetadata(pageLike);
            return [item.dbKey, Boolean(meta?.kind === "skill" || meta?.skillConfig)];
          } catch {
            return [item.dbKey, false];
          }
        })
      );
      if (cancelled) return;
      setSkillCandidateMap((prev) => {
        const next = new Map(prev);
        for (const [dbKey, isSkill] of results) {
          next.set(dbKey, isSkill);
        }
        return next;
      });
      setLoadingSkillCandidates(false);
    };
    void loadSkillCandidates();
    return () => {
      cancelled = true;
    };
  }, [
    baseContents,
    dispatch,
    globalBaseContents,
    pickerMode,
    skillCandidateMap,
    spaceContentSources
  ]);
  const filteredContents = (0, import_react5.useMemo)(() => {
    return filterReferencePickerContents({
      spacesData,
      activeSpaceId,
      searchQuery,
      pickerMode,
      skillCandidateMap
    });
  }, [spacesData, activeSpaceId, searchQuery, pickerMode, skillCandidateMap]);
  const filteredGlobalSkillContents = (0, import_react5.useMemo)(() => {
    if (pickerMode !== "skill") return [];
    return filterReferencePickerContents({
      spacesData: /* @__PURE__ */ new Map([[PUBLIC_CATALOG_SPACE_ID, globalSkillContents]]),
      activeSpaceId: PUBLIC_CATALOG_SPACE_ID,
      searchQuery,
      pickerMode: "skill",
      skillCandidateMap
    });
  }, [globalSkillContents, pickerMode, searchQuery, skillCandidateMap]);
  const globalSkillKeySet = (0, import_react5.useMemo)(
    () => new Set(filteredGlobalSkillContents.map((item) => item.dbKey)),
    [filteredGlobalSkillContents]
  );
  const filteredViewSkillContents = (0, import_react5.useMemo)(() => {
    if (pickerMode !== "skill") return [];
    return filteredContents.filter((item) => !globalSkillKeySet.has(item.dbKey));
  }, [filteredContents, globalSkillKeySet, pickerMode]);
  const toggleRef = (item) => {
    const exists = value.some((r) => r.dbKey === item.dbKey);
    const defaultType = pickerMode === "skill" ? "instruction" : pickerMode;
    onChange(
      exists ? value.filter((r) => r.dbKey !== item.dbKey) : [...value, { ...item, type: defaultType }]
    );
  };
  const toggleType = (e, dbKey) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(
      value.map(
        (r) => r.dbKey === dbKey ? {
          ...r,
          type: r.type === "instruction" ? "knowledge" : "instruction"
        } : r
      )
    );
  };
  const selectedSpaceItem = spaceItems.find((s) => s.id === activeSpaceId) ?? null;
  const handleOpenPreview = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    setPreviewPageKey(item.dbKey);
    setPreviewFileName(item.title || "");
  };
  const handleOpenInNewTab = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `/${encodeURIComponent(item.dbKey)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };
  const handleClosePreview = () => {
    setPreviewPageKey(null);
    setPreviewFileName("");
  };
  const skillListLoading = pickerMode === "skill" && (loadingSkillCandidates || loadingGlobalSkills && filteredGlobalSkillContents.length === 0 || loading && filteredViewSkillContents.length === 0);
  const showSkillEmpty = pickerMode === "skill" && !skillListLoading && filteredGlobalSkillContents.length === 0 && filteredViewSkillContents.length === 0;
  const renderItems = (items) => items.map((item) => {
    const selected = value.find((r) => r.dbKey === item.dbKey);
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("label", { className: "rs-item", "data-selected": !!selected, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "rs-item__check", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "input",
          {
            type: "checkbox",
            checked: !!selected,
            onChange: () => toggleRef(item)
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "rs-checkbox-ui" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "rs-item__body", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "rs-item__title", children: item.title }),
        (searchQuery || activeSpaceId === ALL_SPACES_ID) && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "rs-item__meta", children: t2("references.fromSpace", {
          spaceName: item.spaceName || ""
        }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "rs-item__actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Tooltip, { content: t2("references.previewDoc", "\u9884\u89C8\u6587\u6863"), delay: 200, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "button",
          {
            type: "button",
            className: "rs-icon-btn rs-icon-btn--ghost",
            onClick: (e) => handleOpenPreview(e, item),
            title: t2("references.previewDoc", "\u9884\u89C8\u6587\u6863"),
            "aria-label": t2("references.previewDoc", "\u9884\u89C8\u6587\u6863"),
            children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(LuEye, { size: 16, "aria-hidden": "true" })
          }
        ) }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          Tooltip,
          {
            content: t2("references.openInNewTab", "\u5728\u65B0\u6807\u7B7E\u9875\u6253\u5F00"),
            delay: 200,
            children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
              "button",
              {
                type: "button",
                className: "rs-icon-btn rs-icon-btn--ghost",
                onClick: (e) => handleOpenInNewTab(e, item),
                title: t2("references.openInNewTab", "\u5728\u65B0\u6807\u7B7E\u9875\u6253\u5F00"),
                "aria-label": t2("references.openInNewTab", "\u5728\u65B0\u6807\u7B7E\u9875\u6253\u5F00"),
                children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(LuExternalLink, { size: 16, "aria-hidden": "true" })
              }
            )
          }
        ),
        selected && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          Tooltip,
          {
            content: selected.type === "knowledge" ? t2("references.toInstruction") : t2("references.toKnowledge"),
            children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
              "button",
              {
                type: "button",
                className: "rs-icon-btn rs-icon-btn--type",
                "data-type": selected.type,
                onClick: (e) => toggleType(e, item.dbKey),
                title: selected.type === "knowledge" ? t2("references.toInstruction") : t2("references.toKnowledge"),
                "aria-label": selected.type === "knowledge" ? t2("references.toInstruction") : t2("references.toKnowledge"),
                children: selected.type === "knowledge" ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(LuBrain, { size: 16, "aria-hidden": "true" }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(LuLightbulb, { size: 16, "aria-hidden": "true" })
              }
            )
          }
        ),
        renderItemExtra && selected && renderItemExtra(selected)
      ] })
    ] }, item.dbKey);
  });
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "rs-container", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "rs-search", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      SearchInput_default,
      {
        value: searchQuery,
        onChange: setSearchQuery,
        onSearch: () => void 0,
        onClear: () => setSearchQuery(""),
        placeholder: activeSpaceId === ALL_SPACES_ID ? t2("references.searchAllSpaces") : t2("references.searchCurrentSpace")
      }
    ) }),
    spaceItems.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "rs-space-combobox", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      Combobox_default,
      {
        items: spaceItems,
        selectedItem: selectedSpaceItem,
        onChange: (item) => {
          if (!item) return;
          setActiveSpaceId(item.id);
        },
        labelField: "name",
        valueField: "id",
        placeholder: t2("references.selectSpace"),
        searchable: true,
        clearable: false,
        size: "small",
        variant: "filled"
      }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "rs-list", children: pickerMode === "skill" ? skillListLoading ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "rs-status", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "rs-spinner" }),
      t2("loading")
    ] }) : showSkillEmpty ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "rs-status", children: t2("references.noSkillContent") }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("section", { className: "rs-section", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("header", { className: "rs-section__header", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "rs-section__title", children: t2("references.globalRecommendedSkills") }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "rs-section__count", children: filteredGlobalSkillContents.length })
        ] }),
        filteredGlobalSkillContents.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { children: renderItems(filteredGlobalSkillContents) }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "rs-section__empty", children: t2("references.noGlobalRecommendedSkills") }),
        globalSkillsUnavailable ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "rs-section__hint", children: t2("references.globalRecommendedSkillsFallback") }) : null
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("section", { className: "rs-section", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("header", { className: "rs-section__header", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "rs-section__title", children: t2("references.currentViewSkills") }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "rs-section__count", children: filteredViewSkillContents.length })
        ] }),
        filteredViewSkillContents.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { children: renderItems(filteredViewSkillContents) }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "rs-section__empty", children: t2("references.noCurrentViewSkills") })
      ] })
    ] }) : loading || loadingSkillCandidates ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "rs-status", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "rs-spinner" }),
      t2("loading")
    ] }) : filteredContents.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "rs-status", children: t2(
      searchQuery ? "references.noResults" : "references.noContent"
    ) }) : renderItems(filteredContents) }),
    value.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "rs-summary", children: [
      t2("references.selected", { count: value.length }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: "rs-summary__detail", children: [
        "(K: ",
        value.filter((r) => r.type === "knowledge").length,
        ", I:",
        " ",
        value.filter((r) => r.type === "instruction").length,
        ")"
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      DocxPreviewDialog_default,
      {
        isOpen: !!previewPageKey,
        onClose: handleClosePreview,
        pageKey: previewPageKey || "",
        fileName: previewFileName || ""
      }
    )
  ] });
};
var ReferencesSelector_default = ReferencesSelector;

// packages/ai/agent/web/LinkedSpacesSelector.tsx
var import_react6 = __toESM(require_react());
var import_jsx_runtime5 = __toESM(require_jsx_runtime());
var styles = `
  .linked-spaces {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  .linked-spaces__list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .linked-spaces__item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    background: var(--background);
    border: none;
    border-radius: var(--radius-sm);
    transition: all 0.24s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
  }

  .linked-spaces__item:hover {
    background: var(--backgroundHover);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }
  
  .linked-spaces__item-icon {
    color: var(--primary);
    flex-shrink: 0;
    opacity: 0.9;
    display: flex;
    align-items: center;
  }
  
  .linked-spaces__item-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  
  .linked-spaces__item-name {
    font-size: var(--fontSize-base);
    font-weight: 500;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .linked-spaces__item-remove {
    width: 28px;
    height: var(--control-sm);
    border: none;
    background: transparent;
    color: var(--textQuaternary);
    cursor: pointer;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    flex-shrink: 0;
  }
  
  .linked-spaces__item-remove:hover {
    background: var(--dangerBackground, rgba(239, 68, 68, 0.1));
    color: var(--danger, #ef4444);
    transform: scale(1.05);
  }

  .linked-spaces__item-remove:active {
    transform: scale(0.95);
  }
  
  .linked-spaces__empty {
    text-align: center;
    padding: 24px;
    color: var(--textTertiary);
    font-size: var(--fontSize-base);
    background: var(--backgroundTertiary, color-mix(in srgb, var(--background) 95%, black 2%));
    border-radius: var(--radius-sm);
    border: none;
    transition: all 0.3s ease;
  }
  
  .linked-spaces__add-section {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-top: 4px;
  }
  
  .linked-spaces__combobox-wrapper {
    flex: 1;
    min-width: 0; 
  }

  /* Dark mode overrides */
  [data-theme="dark"] .linked-spaces__item {
    background: color-mix(in srgb, var(--background) 95%, white 3%);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  [data-theme="dark"] .linked-spaces__item:hover {
    background: color-mix(in srgb, var(--background) 92%, white 5%);
  }

  [data-theme="dark"] .linked-spaces__empty {
    background: rgba(255, 255, 255, 0.02);
  }
`;
var LinkedSpacesSelector = ({
  value = [],
  onChange
}) => {
  const { t: t2 } = useTranslation("ai");
  const [selectedSpace, setSelectedSpace] = (0, import_react6.useState)(null);
  const memberSpaces = useSelector(selectAllMemberSpaces);
  const availableSpaces = (0, import_react6.useMemo)(
    () => memberSpaces.map((ms) => ({
      id: ms.spaceId,
      name: ms.spaceName || ms.spaceId
    })).sort((a, b) => a.name.localeCompare(b.name)),
    [memberSpaces]
  );
  const unselectedSpaces = (0, import_react6.useMemo)(
    () => availableSpaces.filter((space) => !value.includes(space.id)),
    [availableSpaces, value]
  );
  const handleAdd = () => {
    if (selectedSpace && !value.includes(selectedSpace.id)) {
      onChange([...value, selectedSpace.id]);
      setSelectedSpace(null);
    }
  };
  const handleRemove = (spaceId) => {
    onChange(value.filter((id) => id !== spaceId));
  };
  const getSpaceInfo = (spaceId) => {
    return availableSpaces.find((s) => s.id === spaceId);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_jsx_runtime5.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("style", { children: styles }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "linked-spaces", children: [
      value.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "linked-spaces__list", children: value.map((spaceId) => {
        const space = getSpaceInfo(spaceId);
        return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "linked-spaces__item", children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(LuFolder, { size: 16, className: "linked-spaces__item-icon", "aria-hidden": "true" }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "linked-spaces__item-info", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "linked-spaces__item-name", children: space?.name || spaceId }) }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
            "button",
            {
              type: "button",
              className: "linked-spaces__item-remove",
              onClick: () => handleRemove(spaceId),
              title: t2("references.remove", "Remove"),
              "aria-label": t2("references.remove", "Remove"),
              children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(LuX, { size: 14, "aria-hidden": "true" })
            }
          )
        ] }, spaceId);
      }) }),
      value.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "linked-spaces__empty", children: t2("references.noLinkedSpaces", "No linked spaces yet.") }),
      unselectedSpaces.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "linked-spaces__add-section", children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "linked-spaces__combobox-wrapper", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
          Combobox_default,
          {
            items: unselectedSpaces,
            selectedItem: selectedSpace,
            onChange: setSelectedSpace,
            labelField: "name",
            valueField: "id",
            placeholder: t2("references.selectSpacePlaceholder", "Select a space to link..."),
            searchable: true,
            size: "small",
            variant: "filled",
            clearable: true
          }
        ) }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
          Button_default,
          {
            type: "button",
            variant: "secondary",
            size: "small",
            icon: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(LuPlus, {}),
            onClick: handleAdd,
            disabled: !selectedSpace,
            children: t2("references.add", "Add")
          }
        )
      ] }) : availableSpaces.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "linked-spaces__empty", children: t2("references.noAvailableSpaces", "No available spaces.") }) : null
    ] })
  ] });
};
var LinkedSpacesSelector_default = LinkedSpacesSelector;

// packages/ai/agent/web/ContextBudgetIndicator.tsx
var import_react7 = __toESM(require_react());
var import_jsx_runtime6 = __toESM(require_jsx_runtime());
var styles2 = `
  .context-budget {
    padding: 12px 16px;
    background: var(--surface);
    border-radius: var(--radius-md);
    border: 1px solid var(--borderLight);
    margin-top: 16px;
  }
  
  .context-budget__header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    font-size: var(--fontSize-base);
    color: var(--textSecondary);
  }
  
  .context-budget__progress-container {
    position: relative;
    height: 8px;
    background: var(--backgroundSecondary);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }
  
  .context-budget__progress-bar {
    height: 100%;
    border-radius: var(--radius-sm);
    transition: width 0.3s ease, background-color 0.3s ease;
  }
  
  .context-budget__progress-bar--normal {
    background: var(--primary);
  }
  
  .context-budget__progress-bar--warning {
    background: var(--warning, #f59e0b);
  }
  
  .context-budget__progress-bar--critical {
    background: var(--danger, #ef4444);
  }
  
  .context-budget__stats {
    display: flex;
    justify-content: space-between;
    margin-top: 8px;
    font-size: var(--fontSize-xs);
    color: var(--textSecondary);
  }
  
  .context-budget__stat {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .context-budget__warning {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
    padding: 8px 12px;
    background: var(--warningBackground, #fef3c7);
    border-radius: var(--radius-md);
    font-size: var(--fontSize-base);
    color: var(--warningText, #92400e);
  }
  
  .context-budget__warning-icon {
    flex-shrink: 0;
  }
`;
var ContextBudgetIndicator = ({
  modelName,
  referencesCount = 0,
  estimatedReferencesTokens = 0,
  linkedSpacesCount = 0
}) => {
  const { t: t2 } = useTranslation("ai");
  const budget = (0, import_react7.useMemo)(() => {
    const contextWindow = getModelContextWindow(modelName);
    const refsTokens = estimatedReferencesTokens || referencesCount * 2e3;
    const spacesTokens = linkedSpacesCount * 500;
    const totalPreAllocated = refsTokens + spacesTokens;
    const usedPercent = Math.min(100, Math.round(totalPreAllocated / contextWindow * 100));
    const isWarning = usedPercent > CONTEXT_BUDGET.REFERENCES_MAX_PERCENT;
    const isCritical = usedPercent > 60;
    return {
      contextWindow,
      refsTokens,
      spacesTokens,
      totalPreAllocated,
      usedPercent,
      isWarning,
      isCritical
    };
  }, [modelName, referencesCount, estimatedReferencesTokens, linkedSpacesCount]);
  const progressClass = budget.isCritical ? "context-budget__progress-bar--critical" : budget.isWarning ? "context-budget__progress-bar--warning" : "context-budget__progress-bar--normal";
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "context-budget", children: [
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("style", { children: styles2 }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "context-budget__header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(LuInfo, { size: 14, "aria-hidden": "true" }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { children: t2("references.contextBudget", "Context Budget (Pre-allocated)") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "context-budget__progress-container", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
      "div",
      {
        className: `context-budget__progress-bar ${progressClass}`,
        style: { width: `${budget.usedPercent}%` }
      }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "context-budget__stats", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "context-budget__stat", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { children: t2("references.refsTokens", "Refs: ~{{val}} tokens", { val: formatTokenCount(budget.refsTokens) }) }) }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "context-budget__stat", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { children: t2("references.spacesTokens", "Spaces: ~{{val}} tokens", { val: formatTokenCount(budget.spacesTokens) }) }) }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "context-budget__stat", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { children: [
        budget.usedPercent,
        "% / ",
        formatTokenCount(budget.contextWindow)
      ] }) })
    ] }),
    budget.isWarning && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "context-budget__warning", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(LuTriangle, { size: 16, className: "context-budget__warning-icon", "aria-hidden": "true" }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { children: t2("references.budgetWarning", "Pre-allocated context uses {{percent}}%. Recommended to keep under {{max}}% for conversation history.", {
        percent: budget.usedPercent,
        max: CONTEXT_BUDGET.REFERENCES_MAX_PERCENT
      }) })
    ] })
  ] });
};
var ContextBudgetIndicator_default = ContextBudgetIndicator;

// packages/render/web/ui/modal/PagePreviewDialog.tsx
var import_react8 = __toESM(require_react(), 1);
var import_jsx_runtime7 = __toESM(require_jsx_runtime(), 1);
var Editor = import_react8.default.lazy(() => import("/public/assets/chunks/Editor-D6LWDHBK.js"));
var PagePreviewDialog = ({
  isOpen,
  onClose,
  pageKey,
  pageTitle,
  onOpenPage
}) => {
  const { t: t2 } = useTranslation("space");
  const dispatch = useAppDispatch();
  const doc = useDocState();
  const isLoading = doc.isLoading;
  const isInitialized = doc.isInitialized;
  (0, import_react8.useEffect)(() => {
    if (isOpen && pageKey) {
      void initDocState(
        { pageKey, isReadOnly: true },
        { dispatch, getState: () => ({ doc: getDocState() }) }
      );
    }
    return () => {
      if (isOpen) {
        resetDocState();
      }
    };
  }, [dispatch, isOpen, pageKey]);
  const initialValue = (0, import_react8.useMemo)(() => {
    if (!isInitialized) {
      return [{ type: "paragraph", children: [{ text: "" }] }];
    }
    const slate = doc.slateData;
    if (Array.isArray(slate) && slate.length > 0) return slate;
    if (doc.content) {
      try {
        return markdownToSlate(doc.content);
      } catch {
        return [{ type: "paragraph", children: [{ text: "Parse Error" }] }];
      }
    }
    return [{ type: "paragraph", children: [{ text: "" }] }];
  }, [doc, isInitialized]);
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_jsx_runtime7.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
    Dialog,
    {
      isOpen,
      onClose,
      size: "xlarge",
      className: "page-preview-modal",
      title: /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "page-preview-title", children: [
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(LuFileText, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "page-preview-title-text", title: pageTitle, children: pageTitle })
      ] }),
      children: isOpen && /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "page-preview-body", children: [
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "page-preview-actions", children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
          Button_default,
          {
            variant: "secondary",
            size: "small",
            onClick: onOpenPage,
            icon: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(LuExternalLink, { size: 14 }),
            children: t2("open")
          }
        ) }),
        isLoading || !isInitialized ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "page-preview-loading", children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(StreamingIndicator_default, {}) }) : /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "page-preview-content", children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_react8.Suspense, { fallback: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(StreamingIndicator_default, {}), children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Editor, { initialValue, readOnly: true }) }) })
      ] })
    }
  ) });
};
var PagePreviewDialog_default = PagePreviewDialog;

// packages/ai/agent/web/ReferencesTab.tsx
var import_jsx_runtime8 = __toESM(require_jsx_runtime());
var ReferencesTab = ({ control, errors, watch }) => {
  const { t: t2 } = useTranslation("ai");
  const dispatch = useAppDispatch();
  const commonProps = { horizontal: true, labelWidth: "140px" };
  const model = watch("model");
  const references = watch("references") || [];
  const linkedSpaces = watch("linkedSpaces") || [];
  const [activePicker, setActivePicker] = (0, import_react9.useState)(null);
  const [skillSummaries, setSkillSummaries] = (0, import_react9.useState)([]);
  const [previewPage, setPreviewPage] = (0, import_react9.useState)(null);
  const buildPageLink = (ref) => {
    if (!ref.dbKey) return "";
    return buildRoutableContentPath({
      contentKey: ref.dbKey,
      type: ref.contentType || "page",
      spaceId: ref.spaceId
    });
  };
  const handleItemClick = (e, ref) => {
    if (e.metaKey || e.ctrlKey || e.button === 1) {
      return;
    }
    e.preventDefault();
    setPreviewPage({
      dbKey: ref.dbKey,
      title: ref.title || ref.dbKey,
      spaceId: ref.spaceId,
      contentType: ref.contentType
    });
  };
  const referencesError = errors.references?.message || (Array.isArray(errors.references) ? errors.references.find((err) => err?.message)?.message : null);
  (0, import_react9.useEffect)(() => {
    let cancelled = false;
    const loadSkillSummaries = async () => {
      if (!references.length) {
        if (!cancelled) setSkillSummaries([]);
        return;
      }
      try {
        const resolved = await resolveReferenceAssets(references, dispatch);
        if (cancelled) return;
        setSkillSummaries(
          summarizeSkillReferences(resolved.references, resolved.contentByKey)
        );
      } catch {
        if (!cancelled) setSkillSummaries([]);
      }
    };
    void loadSkillSummaries();
    return () => {
      cancelled = true;
    };
  }, [dispatch, JSON.stringify(references.map((ref) => [ref.dbKey, ref.type]))]);
  const skillKeySet = (0, import_react9.useMemo)(
    () => new Set(skillSummaries.map((skill) => skill.dbKey)),
    [skillSummaries]
  );
  const knowledgeRefs = references.filter(
    (reference) => reference.type === "knowledge" && !skillKeySet.has(reference.dbKey)
  );
  const instructionRefs = references.filter(
    (reference) => reference.type === "instruction" && !skillKeySet.has(reference.dbKey)
  );
  const pickerTitle = activePicker === "instruction" ? t2("references.addInstruction") : t2("references.addKnowledge");
  const pickerHelp = activePicker === "instruction" ? t2("references.instructionHelp") : t2("references.knowledgeHelp");
  const knowledgeCount = knowledgeRefs.length;
  const instructionCount = instructionRefs.length;
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "tab-content-wrapper", children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
      Controller,
      {
        name: "references",
        control,
        render: ({ field }) => /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ref-manager", children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ref-manager__grid", children: [
            /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("section", { className: "ref-manager__card ref-manager__card--knowledge", children: [
              /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("header", { className: "ref-manager__card-header", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ref-manager__card-headerTop", children: [
                /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ref-manager__card-heading", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ref-manager__card-titleWrap", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "ref-manager__card-icon", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LuBrain, { size: 16, "aria-hidden": "true" }) }),
                  /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ref-manager__card-titleBlock", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ref-manager__card-titleRow", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("h3", { className: "ref-manager__card-title", children: t2("references.knowledge") }),
                      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "ref-manager__card-count", children: knowledgeCount })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("p", { className: "ref-manager__card-subtitle", children: t2("references.knowledgeHelp") })
                  ] })
                ] }) }),
                /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
                  Button_default,
                  {
                    type: "button",
                    size: "small",
                    variant: "secondary",
                    onClick: () => setActivePicker((prev) => prev === "knowledge" ? null : "knowledge"),
                    children: t2("references.addKnowledge")
                  }
                )
              ] }) }),
              /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ref-manager__card-body", children: knowledgeRefs.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ref-manager__list", children: knowledgeRefs.map((ref) => /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ref-manager__item", children: [
                /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
                  "a",
                  {
                    href: buildPageLink(ref),
                    target: "_blank",
                    rel: "noopener noreferrer",
                    className: "ref-manager__item-main ref-manager__item-link",
                    onClick: (e) => handleItemClick(e, ref),
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ref-manager__item-title", children: ref.title || ref.dbKey }),
                      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ref-manager__item-meta", children: ref.dbKey })
                    ]
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
                  "button",
                  {
                    type: "button",
                    className: "ref-manager__remove",
                    onClick: () => field.onChange(
                      (field.value || []).filter(
                        (item) => item.dbKey !== ref.dbKey
                      )
                    ),
                    children: t2("references.remove")
                  }
                )
              ] }, ref.dbKey)) }) : /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ref-manager__empty", children: [
                /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ref-manager__empty-title", children: t2("references.noKnowledgeYet") }),
                /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ref-manager__empty-tip", children: t2("references.knowledgeEmptyHint") })
              ] }) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("section", { className: "ref-manager__card ref-manager__card--instruction", children: [
              /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("header", { className: "ref-manager__card-header", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ref-manager__card-headerTop", children: [
                /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ref-manager__card-heading", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ref-manager__card-titleWrap", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "ref-manager__card-icon", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LuLightbulb, { size: 16, "aria-hidden": "true" }) }),
                  /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ref-manager__card-titleBlock", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ref-manager__card-titleRow", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("h3", { className: "ref-manager__card-title", children: t2("references.instruction") }),
                      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "ref-manager__card-count", children: instructionCount })
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("p", { className: "ref-manager__card-subtitle", children: t2("references.instructionHelp") })
                  ] })
                ] }) }),
                /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
                  Button_default,
                  {
                    type: "button",
                    size: "small",
                    variant: "secondary",
                    onClick: () => setActivePicker(
                      (prev) => prev === "instruction" ? null : "instruction"
                    ),
                    children: t2("references.addInstruction")
                  }
                )
              ] }) }),
              /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ref-manager__card-body", children: instructionRefs.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ref-manager__list", children: instructionRefs.map((ref) => /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ref-manager__item", children: [
                /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
                  "a",
                  {
                    href: buildPageLink(ref),
                    target: "_blank",
                    rel: "noopener noreferrer",
                    className: "ref-manager__item-main ref-manager__item-link",
                    onClick: (e) => handleItemClick(e, ref),
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ref-manager__item-title", children: ref.title || ref.dbKey }),
                      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ref-manager__item-meta", children: ref.dbKey })
                    ]
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
                  "button",
                  {
                    type: "button",
                    className: "ref-manager__remove",
                    onClick: () => field.onChange(
                      (field.value || []).filter(
                        (item) => item.dbKey !== ref.dbKey
                      )
                    ),
                    children: t2("references.remove")
                  }
                )
              ] }, ref.dbKey)) }) : /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ref-manager__empty", children: [
                /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ref-manager__empty-title", children: t2("references.noInstructionsYet") }),
                /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ref-manager__empty-tip", children: t2("references.instructionEmptyHint") })
              ] }) })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
            Dialog,
            {
              isOpen: !!activePicker,
              onClose: () => setActivePicker(null),
              title: pickerTitle,
              size: "large",
              className: "ref-manager__dialog",
              children: /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "ref-manager__dialogBody", children: [
                /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ref-manager__dialogHelp", children: pickerHelp }),
                referencesError ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "ref-manager__dialogError", children: referencesError }) : null,
                /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
                  ReferencesSelector_default,
                  {
                    value: field.value || [],
                    onChange: field.onChange,
                    pickerMode: activePicker || "knowledge"
                  }
                )
              ] })
            }
          )
        ] })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
      FormField,
      {
        label: t2("references.linkedSpaces"),
        helperText: t2("references.linkedSpacesHelp"),
        ...commonProps,
        children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
          Controller,
          {
            name: "linkedSpaces",
            control,
            defaultValue: [],
            render: ({ field }) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
              LinkedSpacesSelector_default,
              {
                value: field.value || [],
                onChange: field.onChange
              }
            )
          }
        )
      }
    ),
    model && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
      ContextBudgetIndicator_default,
      {
        modelName: model,
        referencesCount: references.length,
        linkedSpacesCount: linkedSpaces.length
      }
    ),
    previewPage && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
      PagePreviewDialog_default,
      {
        isOpen: !!previewPage,
        onClose: () => setPreviewPage(null),
        pageKey: previewPage.dbKey,
        pageTitle: previewPage.title,
        onOpenPage: () => {
          window.open(buildPageLink(previewPage), "_blank", "noopener,noreferrer");
          setPreviewPage(null);
        }
      }
    )
  ] });
};
var ReferencesTab_default = ReferencesTab;

// packages/ai/agent/web/ToolsTab.tsx
var import_react12 = __toESM(require_react());

// packages/ai/tools/ToolSelector.tsx
var import_react11 = __toESM(require_react());

// packages/render/web/form/Checkbox.tsx
var import_react10 = __toESM(require_react(), 1);
var import_jsx_runtime9 = __toESM(require_jsx_runtime(), 1);
function useForwardedInputRef(forwardedRef) {
  const innerRef = (0, import_react10.useRef)(null);
  (0, import_react10.useEffect)(() => {
    if (!forwardedRef) return;
    if (typeof forwardedRef === "function") {
      forwardedRef(innerRef.current);
    } else {
      forwardedRef.current = innerRef.current;
    }
  }, [forwardedRef]);
  return innerRef;
}
var Checkbox = ({
  label,
  helperText,
  error = false,
  variant = "default",
  className = "",
  style,
  disabled,
  checked,
  defaultChecked,
  ref,
  indeterminate,
  onChange,
  value,
  name,
  form,
  autoFocus,
  required,
  readOnly,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  "aria-controls": ariaControls,
  "aria-errormessage": ariaErrorMessage,
  onFocus,
  onBlur,
  onKeyDown,
  onKeyUp,
  slot
}) => {
  return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
    $ed8ccb2e23e76301$export$94195a47b94ed396,
    {
      slot,
      inputRef: useForwardedInputRef(ref),
      className: `checkbox-container ${className}`,
      style,
      isInvalid: error,
      isDisabled: disabled,
      isReadOnly: readOnly,
      isRequired: required,
      isSelected: checked,
      defaultSelected: defaultChecked,
      isIndeterminate: indeterminate,
      onChange: (isSelected) => {
        onChange?.({
          target: { checked: isSelected },
          currentTarget: { checked: isSelected }
        });
      },
      value,
      name,
      form,
      autoFocus,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      "aria-describedby": ariaDescribedBy,
      "aria-controls": ariaControls,
      "aria-errormessage": ariaErrorMessage,
      onFocus,
      onBlur,
      onKeyDown,
      onKeyUp,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
          $ed8ccb2e23e76301$export$6e7a18c0548f3129,
          {
            className: ({ isDisabled, isInvalid }) => [
              "checkbox-wrapper",
              `variant-${variant}`,
              isDisabled ? "disabled" : "",
              isInvalid ? "error" : ""
            ].filter(Boolean).join(" "),
            children: ({ isIndeterminate }) => /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(import_jsx_runtime9.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "checkbox-box", children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
                "svg",
                {
                  className: "checkbox-checkmark",
                  viewBox: "0 0 18 18",
                  "aria-hidden": "true",
                  children: isIndeterminate ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("rect", { x: "1", y: "7.5", width: "16", height: "3" }) : /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("polyline", { points: "2 9 7 14 16 4" })
                }
              ) }),
              label && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "checkbox-label", children: label })
            ] })
          }
        ),
        helperText && (error ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)($1f3c3b1a70cec653$export$f551688fc98f2e09, { elementType: "div", className: "checkbox-helper error", children: helperText }) : /* @__PURE__ */ (0, import_jsx_runtime9.jsx)($efe09c6d1c304b50$export$5f1af8db9871e1d6, { elementType: "div", slot: "description", className: "checkbox-helper normal", children: helperText }))
      ]
    }
  );
};
Checkbox.displayName = "Checkbox";

// packages/ai/tools/ToolSelector.tsx
var import_jsx_runtime10 = __toESM(require_jsx_runtime());
var GROUP_ORDER = TOOL_GROUP_META.slice().sort((a, b) => a.order - b.order).map((g) => g.id);
var GROUP_LABEL = TOOL_GROUP_META.reduce(
  (acc, g) => {
    acc[g.id] = g.label;
    return acc;
  },
  {}
);
var GROUP_ICON = {
  general: LuSettings,
  agent: LuBot,
  content: LuFileText,
  media: LuImage,
  // 图片 / 视频统一归为多媒体
  data: LuDatabase,
  external: LuGlobe
};
var inferGroupFromCategory = (category) => {
  if (!category) return "general";
  const matched = TOOL_GROUP_META.find(
    (g) => g.fallbackCategories?.includes(category)
  );
  return matched?.id ?? "general";
};
var buildGroupedOptions = () => {
  const grouped = TOOL_GROUP_META.reduce(
    (acc, g) => {
      acc[g.id] = [];
      return acc;
    },
    {}
  );
  Object.entries(toolDescriptions).forEach(([id, info]) => {
    if (!isToolVisibleInUi(id)) return;
    const def = toolDefinitionsByName[id];
    const rawGroup = def?.uiGroup ?? inferGroupFromCategory(info.category);
    const safeGroup = grouped[rawGroup] ? rawGroup : "general";
    const option = {
      id,
      nameKey: info.name,
      descriptionKey: info.description,
      group: safeGroup
    };
    grouped[safeGroup].push(option);
  });
  GROUP_ORDER.forEach((group) => {
    grouped[group].sort(
      (a, b) => a.nameKey.localeCompare(b.nameKey, "zh-Hans")
    );
  });
  return grouped;
};
var DEFAULT_INJECTED_TOOLS = new Set([
  ...TOOL_PACKS.CORE,
  ...TOOL_PACKS.LIGHT_WEB
].filter((name) => !FORCED_TOOLS.includes(name)));
var FORCED_TOOL_SET = new Set(FORCED_TOOLS);
var ToolSelector = ({
  value = [],
  onChange,
  className = "",
  disabledTools = [],
  onDisabledToolsChange
}) => {
  const { t: t2 } = useTranslation();
  const groupedOptions = (0, import_react11.useMemo)(() => buildGroupedOptions(), []);
  const handleToolToggle = (toolId, isChecked) => {
    if (DEFAULT_INJECTED_TOOLS.has(toolId)) {
      if (isChecked) {
        onDisabledToolsChange?.(disabledTools.filter((id) => id !== toolId));
      } else {
        if (!disabledTools.includes(toolId)) {
          onDisabledToolsChange?.([...disabledTools, toolId]);
        }
      }
      return;
    }
    const newSelectedTools = isChecked ? [...value, toolId] : value.filter((id) => id !== toolId);
    onChange(newSelectedTools);
  };
  const isToolChecked = (toolId) => {
    if (FORCED_TOOL_SET.has(toolId)) return true;
    if (value.includes(toolId)) return true;
    if (DEFAULT_INJECTED_TOOLS.has(toolId) && !disabledTools.includes(toolId)) return true;
    return false;
  };
  return /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_jsx_runtime10.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className: `agent-tools ${className}`, children: GROUP_ORDER.map((group) => {
    const options = groupedOptions[group];
    if (!options.length) return null;
    const Icon = GROUP_ICON[group];
    return /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("section", { className: "agent-tools__group", children: [
      /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("header", { className: "agent-tools__group-header", children: [
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "agent-tools__group-icon", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(Icon, { size: 16 }) }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "agent-tools__group-title", children: GROUP_LABEL[group] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className: "agent-tools__group-body", children: options.map((tool) => {
        const isChecked = isToolChecked(tool.id);
        const isForced = FORCED_TOOL_SET.has(tool.id);
        const isDefault = DEFAULT_INJECTED_TOOLS.has(tool.id);
        return /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(
          "label",
          {
            className: "agent-tools__item" + (isChecked ? " agent-tools__item--selected" : "") + (isDefault ? " agent-tools__item--default" : ""),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "agent-tools__item-header", children: [
                /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
                  Checkbox,
                  {
                    id: `tool-${tool.id}`,
                    value: tool.id,
                    checked: isChecked,
                    disabled: isForced,
                    onChange: (e) => handleToolToggle(tool.id, e.target.checked)
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("span", { className: "agent-tools__item-name", children: [
                  t2(tool.nameKey),
                  (isDefault || isForced) && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "agent-tools__item-badge", children: isForced ? "\u5F3A\u5236" : "\u9ED8\u8BA4" })
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className: "agent-tools__item-description", children: t2(tool.descriptionKey) })
            ]
          },
          tool.id
        );
      }) })
    ] }, group);
  }) }) });
};
var ToolSelector_default = ToolSelector;

// packages/ai/tools/CapabilityPackSelector.tsx
var import_jsx_runtime11 = __toESM(require_jsx_runtime());
var RUNTIME_ENSURED_PACK_IDS = ["agent-orchestration", "skills"];
var CapabilityPackSelector = ({
  value = [],
  onChange,
  disabledTools = [],
  onDisabledToolsChange,
  className = ""
}) => {
  const handleToggle = (packId, isChecked) => {
    const pack = CAPABILITY_PACK_BY_ID[packId];
    const isEnsured = RUNTIME_ENSURED_PACK_IDS.includes(
      packId
    );
    if (isChecked) {
      const nextPacks = value.includes(packId) ? value : [...value, packId];
      onChange(nextPacks);
      if (isEnsured && pack && disabledTools.length > 0) {
        const nextDisabled = disabledTools.filter(
          (tool) => !pack.tools.includes(tool)
        );
        if (nextDisabled.length !== disabledTools.length) {
          onDisabledToolsChange?.(nextDisabled);
        }
      }
    } else {
      onChange(value.filter((id) => id !== packId));
      if (isEnsured && pack) {
        const nextDisabled = [
          .../* @__PURE__ */ new Set([...disabledTools, ...pack.tools])
        ];
        if (nextDisabled.length !== disabledTools.length) {
          onDisabledToolsChange?.(nextDisabled);
        }
      }
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { className: `capability-packs ${className}`, children: CAPABILITY_PACKS.map((pack) => {
    const isEnabled = value.includes(pack.id);
    return /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(
      "label",
      {
        className: "capability-packs__item" + (isEnabled ? " capability-packs__item--selected" : ""),
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "capability-packs__item-header", children: [
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
              Checkbox,
              {
                id: `pack-${pack.id}`,
                value: pack.id,
                checked: isEnabled,
                onChange: (e) => handleToggle(pack.id, e.target.checked)
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { className: "capability-packs__item-icon", "aria-hidden": "true", children: pack.icon }),
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { className: "capability-packs__item-name", children: pack.label })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { className: "capability-packs__item-description", children: pack.description })
        ]
      },
      pack.id
    );
  }) });
};
var CapabilityPackSelector_default = CapabilityPackSelector;

// packages/ai/agent/web/ToolsTab.tsx
var import_jsx_runtime12 = __toESM(require_jsx_runtime());
var EMPTY_SKILL_MODE_STATE = {
  loading: false,
  skillSummaries: [],
  referencedTools: [],
  recommendedSkillHints: [],
  skillPromptPatches: []
};
var getToolDisplayLabel = (toolId, t2) => {
  const translationKey = toolDescriptions[toolId]?.name;
  if (!translationKey) return toolId;
  const translated = t2(translationKey);
  return typeof translated === "string" ? translated : toolId;
};
var ToolsTabField = ({
  value,
  onChange,
  references,
  referencesError,
  setValue,
  disabledTools,
  onDisabledToolsChange,
  enabledPacks,
  onEnabledPacksChange
}) => {
  const { t: t2 } = useTranslation("ai");
  const dispatch = useAppDispatch();
  const [skillPickerOpen, setSkillPickerOpen] = (0, import_react12.useState)(false);
  const [manualToolsExpanded, setManualToolsExpanded] = (0, import_react12.useState)(false);
  const [activeDetailKey, setActiveDetailKey] = (0, import_react12.useState)(null);
  const [skillState, setSkillState] = (0, import_react12.useState)(EMPTY_SKILL_MODE_STATE);
  const referencesSignature = JSON.stringify(
    references.map((reference) => [reference.dbKey, reference.type, reference.title ?? ""])
  );
  (0, import_react12.useEffect)(() => {
    let cancelled = false;
    const loadSkillState = async () => {
      if (!Array.isArray(references) || references.length === 0) {
        if (!cancelled) {
          setSkillState(EMPTY_SKILL_MODE_STATE);
        }
        return;
      }
      setSkillState((prev) => ({ ...prev, loading: true }));
      try {
        const resolved = await resolveReferenceAssets(references, dispatch);
        if (cancelled) return;
        setSkillState({
          loading: false,
          skillSummaries: summarizeSkillReferences(
            resolved.references,
            resolved.contentByKey
          ),
          referencedTools: resolved.referencedTools,
          recommendedSkillHints: resolved.recommendedSkillHints,
          skillPromptPatches: resolved.skillPromptPatches
        });
      } catch {
        if (!cancelled) {
          setSkillState(EMPTY_SKILL_MODE_STATE);
        }
      }
    };
    void loadSkillState();
    return () => {
      cancelled = true;
    };
  }, [dispatch, referencesSignature]);
  const runtimeToolIds = (0, import_react12.useMemo)(
    () => Array.from(/* @__PURE__ */ new Set([...value, ...skillState.referencedTools])),
    [skillState.referencedTools, value]
  );
  const runtimeToolLabels = (0, import_react12.useMemo)(
    () => runtimeToolIds.map((toolId) => ({
      id: toolId,
      label: getToolDisplayLabel(toolId, t2)
    })),
    [runtimeToolIds, t2]
  );
  const updateReferences = (nextReferences) => {
    setValue("references", nextReferences, { shouldDirty: true });
  };
  const removeSkillReference = (dbKey) => {
    updateReferences(references.filter((reference) => reference.dbKey !== dbKey));
  };
  const activeDetail = activeDetailKey != null ? skillState.skillSummaries.find((s) => s.dbKey === activeDetailKey) ?? null : null;
  return /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "tools-tab-panel", children: [
    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("section", { className: "tools-tab-hero", children: /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "tools-tab-hero__copy", children: [
      /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("h3", { className: "tools-tab-hero__title", children: t2("toolsTab.title") }),
      /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("p", { className: "tools-tab-hero__description", children: t2("toolsTab.description") })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("section", { className: "tools-tab-skills", children: [
      /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "tools-tab-section-heading tools-tab-section-heading--withActions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("h4", { children: t2("toolsTab.skillModeTitle") }),
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("p", { children: t2("toolsTab.skillModeDescription") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "tools-tab-skill-actions", children: [
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(Button_default, { type: "button", variant: "secondary", onClick: () => setSkillPickerOpen(true), children: t2("references.addSkill") }),
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
            Button_default,
            {
              as: Link,
              to: "/share/community",
              type: "button",
              variant: "ghost",
              children: t2("references.exploreCommunitySkills")
            }
          )
        ] })
      ] }),
      skillState.loading ? /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "tools-tab-summary__empty", children: t2("loading") }) : skillState.skillSummaries.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(import_jsx_runtime12.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "tools-tab-skills__grid", children: skillState.skillSummaries.map((skill) => /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
          "article",
          {
            className: "tools-tab-skill-card tools-tab-skill-card--selected",
            children: /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "tools-tab-skill-card__header", children: [
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: "tools-tab-skill-card__icon", "aria-hidden": "true", children: skill.referenceType === "instruction" ? /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(LuLightbulb, { size: 18 }) : /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(LuBrain, { size: 18 }) }),
              /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "tools-tab-skill-card__meta", children: [
                /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: "tools-tab-skill-card__title", children: skill.skillName }),
                /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: "tools-tab-skill-card__state tools-tab-skill-card__state--selected", children: skill.referenceType === "instruction" ? t2("references.instruction") : t2("references.knowledge") })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                "button",
                {
                  type: "button",
                  className: "tools-tab-skill-card__info",
                  onClick: () => setActiveDetailKey(skill.dbKey),
                  "aria-label": t2("toolsTab.viewSkillDetail"),
                  children: /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(LuInfo, { size: 15, "aria-hidden": "true" })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                "button",
                {
                  type: "button",
                  className: "tools-tab-skill-card__remove",
                  onClick: () => removeSkillReference(skill.dbKey),
                  "aria-label": t2("toolsTab.removeSkill"),
                  children: /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(LuX, { size: 14, "aria-hidden": "true" })
                }
              )
            ] })
          },
          skill.dbKey
        )) }),
        /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
          Dialog,
          {
            isOpen: activeDetail != null,
            onClose: () => setActiveDetailKey(null),
            title: activeDetail?.skillName,
            size: "small",
            children: activeDetail ? /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "tools-tab-skill-detail", children: [
              activeDetail.description ? /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("p", { className: "tools-tab-skill-detail__description", children: activeDetail.description }) : null,
              activeDetail.toolNames.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "tools-tab-skill-card__block", children: [
                /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "tools-tab-skill-card__label", children: t2("toolsTab.boundTools") }),
                /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "tools-tab-skill-card__tools", children: activeDetail.toolNames.map((toolId) => /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: "tools-tab-skill-card__tool-chip", children: getToolDisplayLabel(toolId, t2) }, toolId)) })
              ] }) : null,
              activeDetail.requiredSkills.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "tools-tab-skill-card__block", children: [
                /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "tools-tab-skill-card__label", children: t2("toolsTab.requiredSkills") }),
                /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "tools-tab-skill-card__tools", children: activeDetail.requiredSkills.map((skillId) => /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: "tools-tab-skill-card__tool-chip", children: skillId }, skillId)) })
              ] }) : null,
              activeDetail.recommendedSkills.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "tools-tab-skill-card__block", children: [
                /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "tools-tab-skill-card__label", children: t2("toolsTab.recommendedSkills") }),
                /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "tools-tab-skill-card__tools", children: activeDetail.recommendedSkills.map((skillId) => /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: "tools-tab-skill-card__tool-chip", children: skillId }, skillId)) })
              ] }) : null,
              activeDetail.promptPatch ? /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "tools-tab-skill-card__patch", children: [
                /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(LuBot, { size: 15, "aria-hidden": "true" }),
                /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { children: activeDetail.promptPatch })
              ] }) : null
            ] }) : null
          }
        )
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "tools-tab-empty-state", children: [
        /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "tools-tab-summary__empty", children: t2("toolsTab.noSkillsSelected") }),
        /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "tools-tab-skill-actions", children: /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(Button_default, { type: "button", variant: "secondary", onClick: () => setSkillPickerOpen(true), children: t2("references.addSkill") }) })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("section", { className: "tools-tab-capability-packs", children: [
      /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "tools-tab-section-heading", children: [
        /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("h4", { children: "\u80FD\u529B" }),
        /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("p", { children: "\u5F00\u542F agent \u9700\u8981\u7684\u80FD\u529B\u5305\uFF0C\u6BCF\u4E2A\u5305\u5305\u542B\u4E00\u7EC4\u534F\u540C\u7684\u5DE5\u5177\u3002" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
        CapabilityPackSelector_default,
        {
          value: enabledPacks || [],
          onChange: onEnabledPacksChange || (() => {
          }),
          disabledTools,
          onDisabledToolsChange
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("section", { className: "tools-tab-raw-tools", children: [
      /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "tools-tab-section-heading tools-tab-section-heading--withActions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("h4", { children: t2("toolsTab.toolModeTitle") }),
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("p", { children: t2("toolsTab.toolModeDescription") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
          Button_default,
          {
            type: "button",
            variant: "ghost",
            onClick: () => setManualToolsExpanded((prev) => !prev),
            children: manualToolsExpanded ? t2("toolsTab.hideManualTools") : t2("toolsTab.showManualTools")
          }
        )
      ] }),
      manualToolsExpanded ? /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(import_jsx_runtime12.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "tools-tab-skill-banner tools-tab-skill-banner--subtle", children: [
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: "tools-tab-skill-banner__icon", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(LuWrench, { size: 16 }) }),
          /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "tools-tab-skill-banner__copy", children: [
            /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("strong", { children: t2("toolsTab.manualToolsTitle") }),
            /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { children: t2("toolsTab.manualToolsDescription") })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
          ToolSelector_default,
          {
            value,
            onChange,
            disabledTools,
            onDisabledToolsChange
          }
        )
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "tools-tab-collapsed-note", children: t2("toolsTab.manualToolsCollapsed", { count: value.length }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("section", { className: "tools-tab-summary", children: [
      /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "tools-tab-section-heading", children: [
        /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("h4", { children: t2("toolsTab.summaryTitle") }),
        /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("p", { children: t2("toolsTab.summaryDescription", {
          skillCount: skillState.skillSummaries.length,
          toolCount: runtimeToolIds.length
        }) })
      ] }),
      skillState.recommendedSkillHints.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "tools-tab-summary__subsection", children: [
        /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "tools-tab-skill-card__label", children: t2("toolsTab.recommendedHints") }),
        /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "tools-tab-summary__chips", children: skillState.recommendedSkillHints.map((hint) => /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: "tools-tab-summary__chip", children: hint }, hint)) })
      ] }) : null,
      skillState.skillPromptPatches.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "tools-tab-summary__subsection", children: [
        /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "tools-tab-skill-card__label", children: t2("toolsTab.runtimeGuidance") }),
        /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "tools-tab-summary__guidance", children: skillState.skillPromptPatches.map((patch) => /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "tools-tab-skill-card__patch", children: [
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(LuSparkles, { size: 15, "aria-hidden": "true" }),
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { children: patch })
        ] }, patch)) })
      ] }) : null,
      runtimeToolLabels.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "tools-tab-summary__chips", children: runtimeToolLabels.map((tool) => /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: "tools-tab-summary__chip", children: tool.label }, tool.id)) }) : /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "tools-tab-summary__empty", children: t2("toolsTab.noToolsSelected") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
      Dialog,
      {
        isOpen: skillPickerOpen,
        onClose: () => setSkillPickerOpen(false),
        title: t2("references.addSkill"),
        size: "large",
        children: /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "tools-tab-dialogBody", children: [
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "tools-tab-dialogHelp", children: t2("references.skillsHelp") }),
          referencesError ? /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "tools-tab-dialogError", children: referencesError }) : null,
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
            ReferencesSelector_default,
            {
              value: references,
              onChange: updateReferences,
              pickerMode: "skill"
            }
          )
        ] })
      }
    )
  ] });
};
var ToolsTab = ({
  errors,
  control,
  watch,
  setValue
}) => {
  const commonProps = { horizontal: false };
  const references = watch("references") || [];
  const referencesError = errors.references?.message || (Array.isArray(errors.references) ? errors.references.find((err) => err?.message)?.message : null);
  return /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "tools-tab-container", children: /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("section", { className: "tools-selection-card", children: /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(FormField, { error: errors.tools?.message, ...commonProps, children: /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
    Controller,
    {
      name: "tools",
      control,
      render: ({ field }) => /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
        Controller,
        {
          name: "disabledTools",
          control,
          render: ({ field: disabledField }) => /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
            Controller,
            {
              name: "enabledPacks",
              control,
              render: ({ field: packsField }) => /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
                ToolsTabField,
                {
                  value: field.value || [],
                  onChange: field.onChange,
                  references,
                  referencesError,
                  setValue,
                  disabledTools: disabledField.value || [],
                  onDisabledToolsChange: disabledField.onChange,
                  enabledPacks: packsField.value || [],
                  onEnabledPacksChange: packsField.onChange
                }
              )
            }
          )
        }
      )
    }
  ) }) }) });
};
var ToolsTab_default = ToolsTab;

// packages/ai/agent/web/AdvancedSettingsTab.tsx
var import_react14 = __toESM(require_react());

// packages/render/web/form/RadioGroup.tsx
var import_jsx_runtime13 = __toESM(require_jsx_runtime(), 1);
var RadioGroup = ({
  options,
  value,
  onChange,
  name = "rg",
  label,
  disabled,
  direction = "column",
  className = ""
}) => {
  return /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
    "div",
    {
      className: `radio-group ${className}`,
      "data-direction": direction,
      role: "radiogroup",
      children: [
        label && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { className: "group-label", children: label }),
        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "group-options", children: options.map((opt) => /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
          "label",
          {
            className: `radio-label ${opt.disabled || disabled ? "disabled" : ""} ${value === opt.value ? "selected" : ""}`,
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
                "input",
                {
                  type: "radio",
                  name,
                  value: opt.value,
                  disabled: opt.disabled || disabled,
                  checked: value === opt.value,
                  onChange: () => !disabled && !opt.disabled && onChange?.(opt.value)
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "radio-surface", children: [
                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "radio-dot-container", children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { className: "radio-dot" }) }),
                /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { className: "radio-text", children: opt.label })
              ] })
            ]
          },
          opt.value
        )) })
      ]
    }
  );
};
var RadioGroup_default = RadioGroup;

// packages/ai/llm/AllModelsSelector.tsx
var import_jsx_runtime14 = __toESM(require_jsx_runtime());
var styles3 = `
  /* \u4EC5\u4FDD\u7559\u5217\u8868\u9879\u5185\u90E8\u7684\u5185\u5BB9\u5E03\u5C40\u6837\u5F0F */
  .model-selector__content {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    /* \u79FB\u9664\u6240\u6709 padding \u548C\u80CC\u666F\u8272\uFF0C\u7531 Combobox \u7EDF\u4E00\u7BA1\u7406 */
  }

  .model-selector__details {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;
  }

  .model-selector__name {
    font-size: 0.875rem;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .model-selector__vision-icon {
    color: var(--textSecondary); 
    flex-shrink: 0;
    opacity: 0.6;
  }
  
  /* \u5F53\u7236\u7EA7 item \u88AB\u9009\u4E2D\u6216\u9AD8\u4EAE\u65F6\uFF0C\u8C03\u6574\u5185\u90E8\u56FE\u6807\u989C\u8272 */
  [data-highlighted] .model-selector__vision-icon,
  [data-selected] .model-selector__vision-icon {
    color: var(--primary);
    opacity: 1;
  }

  .model-selector__check-icon {
    color: var(--primary);
    flex-shrink: 0;
    margin-left: auto;
  }
`;
var AllModelsSelector = ({
  value,
  onChange,
  label,
  helperText,
  error = false,
  size = "medium",
  disabled = false
}) => {
  const { t: t2 } = useTranslation("ai");
  const selectedItem = ALL_MODELS.find((model) => model.name === value) ?? null;
  return /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(import_jsx_runtime14.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("style", { children: styles3 }),
    /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
      Combobox_default,
      {
        items: ALL_MODELS,
        selectedItem,
        onChange,
        labelField: "displayName",
        valueField: "name",
        placeholder: t2("form.selectModel"),
        label,
        helperText,
        error,
        size,
        disabled,
        searchable: true,
        clearable: true,
        renderOptionContent: (item, isHighlighted, isSelected) => /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "model-selector__content", children: [
          /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "model-selector__details", children: [
            /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "model-selector__name", children: item.displayName ?? item.name }),
            item.hasVision && /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
              LuImage,
              {
                size: 14,
                className: "model-selector__vision-icon",
                title: "Vision Supported",
                "aria-hidden": "true"
              }
            )
          ] }),
          isSelected && /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(LuCheck, { size: 16, className: "model-selector__check-icon", "aria-hidden": "true" })
        ] })
      }
    )
  ] });
};
var AllModelsSelector_default = AllModelsSelector;

// packages/ai/agent/web/ModelOptionLabel.tsx
var import_jsx_runtime15 = __toESM(require_jsx_runtime());
var STYLE_ID = "nolo-model-option-label-style";
var css = `
.model-option-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-width: 0;
}
.model-option-label__text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.model-option-label__vision {
  flex-shrink: 0;
  color: var(--textSecondary);
  opacity: 0.7;
}
[data-highlighted] .model-option-label__vision,
[data-selected] .model-option-label__vision {
  color: var(--primary);
  opacity: 1;
}
`;
function ensureStyle() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = css;
  document.head.appendChild(el);
}
var ModelOptionLabel = ({
  label,
  hasVision
}) => {
  ensureStyle();
  return /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("span", { className: "model-option-label", children: [
    /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { className: "model-option-label__text", children: label }),
    hasVision ? /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
      LuImage,
      {
        size: 14,
        className: "model-option-label__vision",
        title: "Vision Supported",
        "aria-hidden": "true"
      }
    ) : null
  ] });
};

// packages/ai/agent/web/OAuthStatusBox.tsx
var import_react13 = __toESM(require_react());
var import_jsx_runtime16 = __toESM(require_jsx_runtime());
var POLL_INTERVAL_MS = 2e3;
var POLL_MAX_TICKS = 15;
var STATUS_TIMEOUT_MS = 5e3;
var EXPIRING_SOON_MINUTES = 5;
var OAuthStatusBox = ({
  providerId,
  serverOrigin,
  authToken
}) => {
  const { t: t2 } = useTranslation("ai");
  const isDesktop = getIsDesktopApp();
  const [state, setState] = (0, import_react13.useState)({ kind: "loading" });
  const [showModal, setShowModal] = (0, import_react13.useState)(false);
  const [pollAbort, setPollAbort] = (0, import_react13.useState)(null);
  const stateRef = (0, import_react13.useRef)(state);
  (0, import_react13.useEffect)(() => {
    stateRef.current = state;
  }, [state]);
  const fetchStatus = (0, import_react13.useCallback)(
    async (signal) => {
      if (!isDesktop && !serverOrigin) {
        setState({ kind: "error", message: "Server origin not configured" });
        return;
      }
      if (!isDesktop && !authToken) {
        setState({ kind: "error", message: "Not signed in" });
        return;
      }
      try {
        const res = await fetch(
          isDesktop ? `/api/desktop/oauth/${providerId}/status` : `${serverOrigin}/api/oauth/${providerId}/status`,
          {
            headers: isDesktop ? void 0 : { Authorization: `Bearer ${authToken}` },
            signal: signal ?? AbortSignal.timeout(STATUS_TIMEOUT_MS)
          }
        );
        if (res.status === 404) {
          setState({ kind: "not_connected" });
          return;
        }
        if (!res.ok) {
          setState({ kind: "error", message: `Status ${res.status}` });
          return;
        }
        const data = await res.json();
        if (data.connected) {
          setState({
            kind: "connected",
            email: data.email,
            accountId: data.accountId,
            expiresAt: data.expiresAt
          });
        } else {
          setState({ kind: "not_connected" });
        }
      } catch (err) {
        if (isAbortError(err)) return;
        setState({
          kind: "error",
          message: toErrorMessage(err)
        });
      }
    },
    [providerId, serverOrigin, authToken, isDesktop]
  );
  (0, import_react13.useEffect)(() => {
    const ctrl = new AbortController();
    fetchStatus(ctrl.signal);
    return () => ctrl.abort();
  }, [providerId, serverOrigin, authToken]);
  const startPolling = (0, import_react13.useCallback)(() => {
    if (pollAbort) pollAbort.abort();
    const ctrl = new AbortController();
    setPollAbort(ctrl);
    let ticks = 0;
    const tick = () => {
      if (ctrl.signal.aborted) return;
      fetchStatus(ctrl.signal).then(() => {
        if (ctrl.signal.aborted) return;
        if (stateRef.current.kind === "connected") {
          setShowModal(false);
          ctrl.abort();
          return;
        }
        ticks += 1;
        if (ticks >= POLL_MAX_TICKS) {
          ctrl.abort();
          setState({
            kind: "error",
            message: "Still not connected. Make sure you ran the command and try again."
          });
          return;
        }
        setTimeout(tick, POLL_INTERVAL_MS);
      });
    };
    tick();
  }, [fetchStatus, pollAbort]);
  (0, import_react13.useEffect)(() => {
    return () => {
      if (pollAbort) pollAbort.abort();
    };
  }, [pollAbort]);
  const disconnect = (0, import_react13.useCallback)(async () => {
    if (!isDesktop && (!serverOrigin || !authToken)) return;
    try {
      await fetch(isDesktop ? `/api/desktop/oauth/${providerId}` : `${serverOrigin}/api/oauth/${providerId}`, {
        method: "DELETE",
        headers: isDesktop ? void 0 : { Authorization: `Bearer ${authToken}` },
        signal: AbortSignal.timeout(STATUS_TIMEOUT_MS)
      });
      setState({ kind: "not_connected" });
    } catch (err) {
      setState({
        kind: "error",
        message: toErrorMessage(err)
      });
    }
  }, [providerId, serverOrigin, authToken, isDesktop]);
  const startDesktopLogin = (0, import_react13.useCallback)(async () => {
    setState({ kind: "loading" });
    try {
      const response = await fetch(`/api/desktop/oauth/${providerId}/start`, {
        method: "POST"
      });
      if (!response.ok) {
        setState({ kind: "error", message: `OAuth ${response.status}` });
        return;
      }
      await fetchStatus();
    } catch (err) {
      if (isAbortError(err)) return;
      setState({ kind: "error", message: toErrorMessage(err) });
    }
  }, [fetchStatus, providerId]);
  if (state.kind === "loading") {
    return /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { className: "cli-info-box", children: /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("p", { className: "cli-info-box__hint", children: "Checking connection\u2026" }) });
  }
  if (state.kind === "connected") {
    const expiresIn = state.expiresAt ? Math.max(0, Math.round((state.expiresAt - Date.now()) / 6e4)) : void 0;
    const expiringSoon = expiresIn !== void 0 && expiresIn <= EXPIRING_SOON_MINUTES;
    const label = state.email || state.accountId || providerId;
    return /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { className: "cli-info-box", children: [
      /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("p", { className: "cli-info-box__title", children: [
        "Signed in as ",
        label
      ] }),
      expiresIn !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("p", { className: "cli-info-box__hint", children: expiringSoon ? `\u26A0\uFE0F Token expires in ${expiresIn} min \u2014 re-authorize to refresh.` : `Token expires in ${expiresIn} min.` }),
      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("p", { children: /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
        "a",
        {
          href: "#",
          onClick: (e) => {
            e.preventDefault();
            void disconnect();
          },
          style: { fontSize: 12 },
          children: "Disconnect"
        }
      ) })
    ] });
  }
  const errorMessage = state.kind === "error" ? state.message : null;
  if (isDesktop) {
    return /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { className: "cli-info-box", children: [
      errorMessage ? /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("p", { className: "cli-info-box__hint", children: errorMessage }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("p", { className: "cli-info-box__hint", children: "OAuth \u5C06\u5728\u7CFB\u7EDF\u6D4F\u89C8\u5668\u4E2D\u5B8C\u6210\uFF0C\u51ED\u636E\u7531 Nolo Desktop \u4FDD\u5B58\u5728\u672C\u673A\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(Button_default, { onClick: () => void startDesktopLogin(), size: "small", children: [
        "Sign in with ",
        providerId
      ] })
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(import_jsx_runtime16.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { className: "cli-info-box", children: [
      errorMessage && /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
        "p",
        {
          className: "cli-info-box__hint",
          style: { color: "var(--color-error, #d20f39)" },
          children: errorMessage
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("p", { className: "cli-info-box__hint", children: [
        "Run",
        " ",
        /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("code", { className: "cli-info-box__code", children: [
          "nolo auth ",
          providerId,
          " --sync-to-server"
        ] }),
        " ",
        `on a machine where you've completed OAuth, then click "I've run it".`
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("p", { children: /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(Button_default, { onClick: () => setShowModal(true), size: "small", children: "Sign in on this device" }) })
    ] }),
    showModal && /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
      "div",
      {
        style: {
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
            "button",
            {
              type: "button",
              "aria-label": "Close dialog",
              onClick: () => setShowModal(false),
              style: {
                position: "absolute",
                inset: 0,
                margin: 0,
                padding: 0,
                border: "none",
                background: "rgba(0,0,0,0.5)",
                cursor: "pointer"
              }
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
            "dialog",
            {
              open: true,
              role: "dialog",
              "aria-modal": "true",
              "aria-label": `Sign in to ${providerId}`,
              style: {
                position: "relative",
                background: "var(--surface-card, #fff)",
                padding: 24,
                borderRadius: 8,
                maxWidth: 560,
                width: "90%",
                margin: 0,
                border: "none"
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("h3", { children: [
                  "Sign in to ",
                  providerId
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("p", { children: "Run this command in a terminal:" }),
                /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
                  "pre",
                  {
                    style: {
                      background: "var(--surface-code, #f4f4f4)",
                      padding: 12,
                      borderRadius: 4,
                      overflowX: "auto",
                      userSelect: "all"
                    },
                    children: /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("code", { children: [
                      "nolo auth ",
                      providerId,
                      " --sync-to-server"
                    ] })
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("p", { style: { fontSize: 12, color: "var(--text-muted, #666)" }, children: "It opens a browser, completes the OAuth flow, then uploads the token to this server." }),
                /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { style: { display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(Button_default, { onClick: () => setShowModal(false), children: "Close" }),
                  /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(Button_default, { onClick: () => startPolling(), children: "I've run it" })
                ] })
              ]
            }
          )
        ]
      }
    )
  ] });
};

// packages/ai/agent/providerPresetApply.ts
var MANUAL_PROVIDER_PRESET_ID = "manual";
function formatProviderPresetLabel(entry) {
  if (entry.kind === "oauth") {
    return entry.description ? `${entry.label} (${entry.description})` : entry.label;
  }
  return entry.label;
}
function resolveProviderPresetFields(presetId) {
  if (!presetId || presetId === MANUAL_PROVIDER_PRESET_ID) {
    return {
      presetId: MANUAL_PROVIDER_PRESET_ID,
      kind: "manual",
      provider: "custom",
      model: "",
      customProviderUrl: "",
      apiKeyRef: "",
      apiKeyHeader: "",
      clearApiKey: false,
      lockCustomProviderUrl: false,
      requiresDesktopOAuth: false,
      label: "Manual / Other",
      modelOptions: [],
      defaultReasoningEffort: DEFAULT_REASONING_EFFORT
    };
  }
  const preset = findProviderById(presetId);
  if (!preset) {
    return resolveProviderPresetFields(MANUAL_PROVIDER_PRESET_ID);
  }
  if (preset.kind === "oauth") {
    return {
      presetId: preset.id,
      kind: "oauth",
      provider: preset.provider,
      model: preset.defaultModel ?? "",
      customProviderUrl: preset.cloudCodeBaseUrl ?? "",
      apiKeyRef: preset.apiKeyRef,
      apiKeyHeader: "",
      clearApiKey: true,
      lockCustomProviderUrl: Boolean(preset.cloudCodeBaseUrl),
      requiresDesktopOAuth: true,
      label: formatProviderPresetLabel(preset),
      description: preset.description,
      modelOptions: preset.modelOptions,
      defaultReasoningEffort: preset.defaultReasoningEffort ?? DEFAULT_REASONING_EFFORT
    };
  }
  return {
    presetId: preset.id,
    kind: "api_key_template",
    provider: preset.provider,
    model: preset.defaultModel ?? "",
    customProviderUrl: preset.baseUrl,
    apiKeyRef: "",
    apiKeyHeader: preset.apiKeyHeader ?? "",
    clearApiKey: false,
    lockCustomProviderUrl: true,
    requiresDesktopOAuth: false,
    label: formatProviderPresetLabel(preset),
    description: preset.description,
    modelOptions: preset.modelOptions ?? [],
    defaultReasoningEffort: preset.defaultReasoningEffort ?? DEFAULT_REASONING_EFFORT
  };
}
function applyProviderPresetFields(fields, setValue) {
  setValue("provider", fields.provider);
  setValue("model", fields.model);
  setValue("customProviderUrl", fields.customProviderUrl);
  setValue("apiKeyRef", fields.apiKeyRef);
  setValue("apiKeyHeader", fields.apiKeyHeader);
  if (fields.clearApiKey) {
    setValue("apiKey", "");
  }
}
function listProviderPresetGroups() {
  return [
    {
      id: "subscription_oauth",
      label: "Subscription OAuth",
      items: SUBSCRIPTION_OAUTH_PROVIDERS.map((p) => ({
        id: p.id,
        label: p.label,
        description: p.description
      }))
    },
    {
      id: "metered_api",
      label: "Custom API Key",
      items: CUSTOM_API_KEY_TEMPLATES.map((p) => ({
        id: p.id,
        label: p.label,
        description: p.description
      }))
    },
    {
      id: "manual",
      label: "Manual",
      items: [{ id: MANUAL_PROVIDER_PRESET_ID, label: "Manual / Other" }]
    }
  ];
}
function listMeteredApiPresetOptions() {
  return [
    ...CUSTOM_API_KEY_TEMPLATES.filter((p) => p.accessVariant === "metered_key").map(
      (p) => ({
        id: p.id,
        label: p.label,
        description: p.description
      })
    ),
    { id: MANUAL_PROVIDER_PRESET_ID, label: "Manual / Other" }
  ];
}
function listSubscriptionPresetOptions() {
  const tokenPlans = CUSTOM_API_KEY_TEMPLATES.filter(
    (p) => p.commercialKind === "subscription" || p.accessVariant === "token_plan_endpoint"
  ).map((p) => ({
    id: p.id,
    label: p.label,
    description: p.description,
    requiresDesktopOAuth: false
  }));
  const oauth = SUBSCRIPTION_OAUTH_PROVIDERS.map((p) => ({
    id: p.id,
    label: p.label,
    description: p.description,
    requiresDesktopOAuth: true
  }));
  return [...tokenPlans, ...oauth];
}
function isOAuthProviderPresetId(id) {
  if (!id) return false;
  return SUBSCRIPTION_OAUTH_PROVIDERS.some((p) => p.id === id);
}
function findOAuthProviderPresetIdByApiKeyRef(apiKeyRef) {
  const normalized = apiKeyRef?.trim().toLowerCase();
  if (!normalized) return void 0;
  return SUBSCRIPTION_OAUTH_PROVIDERS.find(
    (provider) => provider.apiKeyRef.toLowerCase() === normalized
  )?.id;
}
function isApiKeyTemplatePresetId(id) {
  if (!id) return false;
  return CUSTOM_API_KEY_TEMPLATES.some((p) => p.id === id);
}
function getProviderPresetDisplayLabel(presetId) {
  if (presetId === MANUAL_PROVIDER_PRESET_ID) return "Manual / Other";
  const entry = findProviderById(presetId);
  if (!entry) return presetId;
  return formatProviderPresetLabel(entry);
}

// packages/ai/agent/web/AdvancedSettingsTab.tsx
var import_jsx_runtime17 = __toESM(require_jsx_runtime());
var PARAM_CONFIGS = [
  { key: "temperature", min: 0, max: 2, step: 0.01, default: DEFAULT_TEMPERATURE },
  { key: "topP", min: 0, max: 1, step: 0.01, default: DEFAULT_TOP_P },
  { key: "maxTokens", min: 1, max: MAX_TOKENS_LIMIT, step: 1, default: DEFAULT_MAX_TOKENS },
  { key: "frequencyPenalty", min: -2, max: 2, step: 0.01, default: DEFAULT_FREQUENCY_PENALTY },
  { key: "presencePenalty", min: -2, max: 2, step: 0.01, default: DEFAULT_PRESENCE_PENALTY },
  { key: "reasoningEffort", options: ["low", "medium", "high"], default: DEFAULT_REASONING_EFFORT }
];
var FORM_MAP = {
  temperature: "temperature",
  topP: "top_p",
  maxTokens: "max_tokens",
  frequencyPenalty: "frequency_penalty",
  presencePenalty: "presence_penalty",
  reasoningEffort: "reasoning_effort"
};
var COPILOT_CLI_MODELS = [
  { value: "", label: "\u9ED8\u8BA4 (claude-sonnet-5)" },
  { value: "claude-sonnet-5", label: "Claude Sonnet 5\uFF081x\uFF09" },
  { value: "claude-sonnet-4.6", label: "Claude Sonnet 4.6\uFF081x\uFF09" },
  { value: "claude-sonnet-4.5", label: "Claude Sonnet 4.5\uFF081x\uFF09" },
  { value: "claude-haiku-4.5", label: "Claude Haiku 4.5\uFF080.33x\uFF09" },
  { value: "claude-opus-4.6", label: "Claude Opus 4.6\uFF083x\uFF09" },
  { value: "claude-opus-4.6-fast", label: "Claude Opus 4.6 Fast\uFF0830x\uFF09" },
  { value: "claude-opus-4.5", label: "Claude Opus 4.5\uFF083x\uFF09" },
  { value: "claude-sonnet-4", label: "Claude Sonnet 4\uFF081x\uFF09" },
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
  { value: "gpt-4.1", label: "GPT-4.1" }
];
var GEMINI_CLI_MODELS = [
  { value: "", label: "\u9ED8\u8BA4 (gemini-3.6-flash)" },
  { value: "gemini-3.6-flash", label: "Gemini 3.6 Flash" }
];
var CODEX_CLI_MODELS = [
  { value: "", label: "\u9ED8\u8BA4" },
  { value: "gpt-5.6-sol", label: "GPT-5.6 Sol" },
  { value: "gpt-5.6-terra", label: "GPT-5.6 Terra" },
  { value: "gpt-5.6-luna", label: "GPT-5.6 Luna" },
  { value: "gpt-5.3-codex", label: "GPT-5.3 Codex" },
  { value: "gpt-5.2", label: "GPT-5.2" }
];
var CLAUDE_CLI_MODELS = [
  { value: "", label: "\u9ED8\u8BA4" },
  { value: "claude-sonnet-5", label: "Claude Sonnet 5" },
  { value: "claude-sonnet-4.6", label: "Claude Sonnet 4.6" },
  { value: "claude-sonnet-4.5", label: "Claude Sonnet 4.5" },
  { value: "claude-haiku-4.5", label: "Claude Haiku 4.5" },
  { value: "claude-opus-4.6", label: "Claude Opus 4.6" }
];
var AGY_CLI_MODELS = [
  { value: "", label: "\u9ED8\u8BA4" }
];
var API_SOURCE_LABELS = {
  platform: "\u5E73\u53F0 API",
  custom: "\u81EA\u5B9A\u4E49 API",
  cli: "CLI\uFF08\u7EC8\u7AEF\uFF09"
};
var HOSTED_EXEC_RUNTIME_POLICY = {
  version: 1,
  runtimeTools: ["execShell"],
  workspace: { mode: "lease" }
};
var removeHostedExecRuntimePolicy = (value) => {
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
var AdvancedSettingsTab = ({
  errors,
  control,
  setValue,
  apiSource,
  setApiSource,
  readOnly = false
}) => {
  const { t: t2 } = useTranslation("ai");
  const currentServer = useAppSelector(selectCurrentServer);
  const currentToken = useToken();
  const serverOrigin = normalizeServerOrigin(currentServer) || (typeof window !== "undefined" ? window.location.origin : "");
  const authToken = currentToken ?? "";
  const [machines, setMachines] = (0, import_react14.useState)([]);
  const [selectedPresetId, setSelectedPresetId] = (0, import_react14.useState)("manual");
  const [machinesError, setMachinesError] = (0, import_react14.useState)(null);
  const [paramsOpen, setParamsOpen] = (0, import_react14.useState)(false);
  const [maxTokensExpanded, setMaxTokensExpanded] = (0, import_react14.useState)(false);
  const common = { horizontal: true, labelWidth: "160px" };
  const isCustomApi = apiSource === "custom";
  const isCliApi = apiSource === "cli";
  const isPlatformApi = apiSource === "platform";
  const selectedCliProvider = useWatch({ control, name: "cliProvider" }) || "copilot";
  const selectedMachineId = useWatch({ control, name: "machineId" }) || "";
  const modelValue = useWatch({ control, name: "model" });
  const apiKeyRefValue = useWatch({ control, name: "apiKeyRef" });
  const customProviderUrl = useWatch({ control, name: "customProviderUrl" });
  const runtimeToolPolicy = useWatch({ control, name: "runtimeToolPolicy" });
  const allowHostedExec = runtimePolicyAllowsHostedExec(runtimeToolPolicy);
  const isMachineBoundLocalCustomProvider = isCustomApi && isLocalCustomProviderUrl(customProviderUrl);
  const showHostedExecRuntimeControl = !isCliApi && !isMachineBoundLocalCustomProvider;
  const cliModels = selectedCliProvider === "gemini" ? GEMINI_CLI_MODELS : selectedCliProvider === "codex" ? CODEX_CLI_MODELS : selectedCliProvider === "claude" ? CLAUDE_CLI_MODELS : selectedCliProvider === "agy" ? AGY_CLI_MODELS : selectedCliProvider === "qoder" || selectedCliProvider === "opencode" || selectedCliProvider === "grok" || selectedCliProvider === "kimi" ? [] : COPILOT_CLI_MODELS;
  const selectedCliModelLabel = cliModels.find((m) => m.value === (modelValue || ""))?.label || modelValue || "\u9ED8\u8BA4";
  const cliProviderLabel = CLI_PROVIDER_DISPLAY_LABELS[selectedCliProvider];
  const serverBase = (0, import_react14.useMemo)(() => {
    const configured = normalizeServerOrigin(currentServer);
    if (configured) return configured;
    return typeof window !== "undefined" ? window.location.origin : "";
  }, [currentServer]);
  const machineOptions = (0, import_react14.useMemo)(() => {
    if (isMachineBoundLocalCustomProvider) {
      return machines.filter(
        (machine) => machine.status === "online" && machine.connectorStatus === "connected"
      );
    }
    const requiredCapability = CLI_CAPABILITY_BY_PROVIDER[selectedCliProvider];
    return machines.filter(
      (machine) => machine.status === "online" && machine.connectorStatus === "connected" && machine.capabilities.includes(requiredCapability)
    );
  }, [isMachineBoundLocalCustomProvider, machines, selectedCliProvider]);
  const selectedMachine = machines.find((machine) => machine.machineId === selectedMachineId);
  const selectedMachineOption = (0, import_react14.useMemo)(() => {
    if (!selectedMachineId) return null;
    if (machineOptions.some((machine) => machine.machineId === selectedMachineId)) return null;
    return selectedMachine ?? {
      machineId: selectedMachineId,
      name: "\u9884\u9009\u7535\u8111",
      platform: "",
      arch: "",
      capabilities: [],
      connectorStatus: "disconnected",
      status: "offline"
    };
  }, [machineOptions, selectedMachine, selectedMachineId]);
  const machineOptionsWithSelection = (0, import_react14.useMemo)(
    () => selectedMachineOption ? [selectedMachineOption, ...machineOptions] : machineOptions,
    [machineOptions, selectedMachineOption]
  );
  (0, import_react14.useEffect)(() => {
    if (!isCliApi && !isMachineBoundLocalCustomProvider || selectedMachineId || machineOptions.length !== 1) {
      return;
    }
    setValue("machineId", machineOptions[0].machineId, { shouldDirty: true });
  }, [
    isCliApi,
    isMachineBoundLocalCustomProvider,
    machineOptions,
    selectedMachineId,
    setValue
  ]);
  (0, import_react14.useEffect)(() => {
    if (!isCliApi && !isMachineBoundLocalCustomProvider || !currentToken || !serverBase) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`${serverBase}/api/machines`, {
          method: "GET",
          cache: "no-store",
          headers: { Authorization: `Bearer ${currentToken}` }
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Failed to load machines");
        if (!cancelled) {
          setMachines(Array.isArray(data.machines) ? data.machines : []);
          setMachinesError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setMachines([]);
          setMachinesError(toErrorMessage(error));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    currentToken,
    isCliApi,
    isMachineBoundLocalCustomProvider,
    serverBase
  ]);
  (0, import_react14.useEffect)(() => {
    if (!isCustomApi || isMachineBoundLocalCustomProvider || !selectedMachineId) return;
    setValue("machineId", "", { shouldDirty: true });
  }, [
    isCustomApi,
    isMachineBoundLocalCustomProvider,
    selectedMachineId,
    setValue
  ]);
  (0, import_react14.useEffect)(() => {
    if (showHostedExecRuntimeControl || !allowHostedExec) return;
    const cleaned = removeHostedExecRuntimePolicy(runtimeToolPolicy);
    if (cleaned === null && (runtimeToolPolicy === null || runtimeToolPolicy === void 0)) {
      return;
    }
    if (cleaned !== null && JSON.stringify(cleaned) === JSON.stringify(runtimeToolPolicy)) {
      return;
    }
    setValue("runtimeToolPolicy", cleaned, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true
    });
  }, [allowHostedExec, runtimeToolPolicy, setValue, showHostedExecRuntimeControl]);
  const onReset = (0, import_react14.useCallback)(() => {
    PARAM_CONFIGS.forEach((c) => {
      const field = FORM_MAP[c.key];
      setValue(field, void 0, { shouldDirty: true });
    });
  }, [setValue]);
  const handleApiSourceChange = (next) => {
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
  const handlePresetChange = (0, import_react14.useCallback)(
    (id) => {
      setSelectedPresetId(id);
      const fields = resolveProviderPresetFields(id);
      applyProviderPresetFields(fields, (key, value) => {
        setValue(key, value, { shouldValidate: true });
      });
    },
    [setValue]
  );
  (0, import_react14.useEffect)(() => {
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
  return /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { className: "adv-settings", children: [
    /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("section", { className: "adv-settings__model", children: readOnly ? /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(import_jsx_runtime17.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(FormField, { label: t2("form.apiSource"), ...common, children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { className: "readonly-value", children: API_SOURCE_LABELS[apiSource] }) }),
      isPlatformApi && /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(FormField, { label: t2("form.model"), required: true, error: errors.model?.message, ...common, children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
        Controller,
        {
          name: "model",
          control,
          render: ({ field }) => /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
            AllModelsSelector_default,
            {
              value: field.value ?? null,
              onChange: (selected) => {
                if (selected) {
                  field.onChange(selected.name);
                  setValue("provider", selected.provider, { shouldValidate: true });
                  setValue("hasVision", Boolean(selected.hasVision), {
                    shouldValidate: true
                  });
                  setValue(
                    "defaultInteractionMode",
                    isVoiceModel(selected.name, selected.provider) ? "live_audio" : "text",
                    { shouldValidate: true }
                  );
                } else {
                  field.onChange("");
                  setValue("provider", "", { shouldValidate: true });
                  setValue("hasVision", false, { shouldValidate: true });
                  setValue("defaultInteractionMode", "text", {
                    shouldValidate: true
                  });
                }
              },
              error: !!errors.model,
              disabled: true
            }
          )
        }
      ) }),
      isCustomApi && /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { className: "custom-api-box", children: [
        /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(FormField, { label: t2("form.model"), required: true, error: errors.model?.message, ...common, children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { className: "readonly-value", children: modelValue || "-" }) }),
        /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(FormField, { label: t2("form.customProviderUrl"), error: errors.customProviderUrl?.message, ...common, children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { className: "readonly-value readonly-value--break", children: customProviderUrl || "-" }) })
      ] }),
      isCliApi && /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { className: "custom-api-box", children: [
        /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(FormField, { label: "CLI \u5DE5\u5177", ...common, children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { className: "readonly-value", children: cliProviderLabel }) }),
        /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(FormField, { label: t2("form.model"), ...common, children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { className: "readonly-value", children: selectedCliModelLabel }) }),
        /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(FormField, { label: "\u8FD0\u884C\u4F4D\u7F6E", ...common, children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { className: "readonly-value", children: selectedMachine ? `${selectedMachine.name} (${selectedMachine.platform}/${selectedMachine.arch})` : "\u672C\u5730/\u670D\u52A1\u5668\u9ED8\u8BA4 CLI \u73AF\u5883" }) })
      ] })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(import_jsx_runtime17.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(FormField, { label: t2("form.apiSource"), ...common, children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
        Controller,
        {
          name: "apiSource",
          control,
          render: () => /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { className: "api-source-selector", children: [
            { value: "platform", label: "\u5E73\u53F0 API", desc: "\u4F7F\u7528\u5E73\u53F0\u5BC6\u94A5" },
            { value: "custom", label: "\u81EA\u5B9A\u4E49 API", desc: "\u81EA\u5DF1\u7684\u5BC6\u94A5" },
            { value: "cli", label: "CLI\uFF08\u7EC8\u7AEF\uFF09", desc: "gh copilot \u7B49" }
          ].map((opt) => /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(
            "button",
            {
              type: "button",
              className: `api-source-btn ${apiSource === opt.value ? "is-active" : ""}`,
              onClick: () => handleApiSourceChange(opt.value),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("span", { className: "api-source-btn__label", children: opt.label }),
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("span", { className: "api-source-btn__desc", children: opt.desc })
              ]
            },
            opt.value
          )) })
        }
      ) }),
      !isCustomApi && /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(FormField, { label: t2("form.model"), required: true, error: errors.model?.message, ...common, children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
        Controller,
        {
          name: "model",
          control,
          render: ({ field }) => isCliApi ? /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
            Select,
            {
              className: "cli-select",
              selectedKey: field.value || "",
              onSelectionChange: (key) => field.onChange(String(key ?? "")),
              children: cliModels.map((opt) => /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
                SelectItem,
                {
                  id: opt.value,
                  textValue: opt.label,
                  children: opt.label
                },
                opt.value
              ))
            }
          ) : /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
            AllModelsSelector_default,
            {
              value: field.value ?? null,
              onChange: (selected) => {
                if (selected) {
                  field.onChange(selected.name);
                  setValue("provider", selected.provider, { shouldValidate: true });
                  setValue("hasVision", Boolean(selected.hasVision), {
                    shouldValidate: true
                  });
                  setValue(
                    "defaultInteractionMode",
                    isVoiceModel(selected.name, selected.provider) ? "live_audio" : "text",
                    { shouldValidate: true }
                  );
                } else {
                  field.onChange("");
                  setValue("provider", "", { shouldValidate: true });
                  setValue("hasVision", false, { shouldValidate: true });
                  setValue("defaultInteractionMode", "text", {
                    shouldValidate: true
                  });
                }
              },
              error: !!errors.model
            }
          )
        }
      ) }),
      isCustomApi && /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { className: "custom-api-box", children: [
        /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(FormField, { label: "Provider", required: true, ...common, children: /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(
          SelectRoot,
          {
            selectedKey: selectedPresetId,
            onSelectionChange: (v) => handlePresetChange(v),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(SelectTrigger, { className: "cli-select nolo-select-trigger", children: [
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(SelectValue, { children: () => {
                  const v = selectedPresetId;
                  if (!v) return "\u9009\u62E9 Provider";
                  return getProviderPresetDisplayLabel(v);
                } }),
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(SelectIcon, { children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(LuChevronDown, { size: 16 }) })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(Popover, { hideArrow: true, className: "nolo-select-popup select-popover", children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(SelectList, { className: "nolo-select-list", children: providerPresetGroups.map((group) => /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(SelectGroup, { children: [
                group.id !== "manual" ? /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(SelectGroupLabel, { className: "nolo-select-group-label", children: group.label }) : null,
                group.items.map((item) => {
                  const textValue = item.description ? `${item.label} (${item.description})` : item.label;
                  return /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(
                    SelectItem,
                    {
                      id: item.id,
                      textValue,
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(SelectItemText, { className: "nolo-select-item-text", children: textValue }),
                        /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(SelectItemIndicator, { className: "nolo-select-item-indicator", children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(LuCheck, { size: 14 }) })
                      ]
                    },
                    item.id
                  );
                })
              ] }, group.id)) }) })
            ]
          }
        ) }),
        isOAuthPreset && /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
          OAuthStatusBox,
          {
            providerId: selectedPresetFields.apiKeyRef,
            serverOrigin,
            authToken
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(FormField, { label: t2("form.model"), required: true, error: errors.model?.message, ...common, children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
          Controller,
          {
            name: "model",
            control,
            render: ({ field }) => selectedModelOptions.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(
              Select,
              {
                className: "cli-select",
                selectedKey: field.value || selectedPresetFields.model,
                onSelectionChange: (key) => {
                  const id = String(key ?? "");
                  field.onChange(id);
                  const opt = selectedModelOptions.find((m) => m.id === id);
                  setValue("hasVision", Boolean(opt?.hasVision), {
                    shouldValidate: true
                  });
                },
                children: [
                  field.value && !selectedModelOptions.some((model) => model.id === field.value) ? /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(SelectItem, { id: field.value, textValue: field.value, children: field.value }) : null,
                  selectedModelOptions.map((model) => {
                    const label = `${model.label}${model.recommended ? "\uFF08\u63A8\u8350\uFF09" : ""}`;
                    return /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(SelectItem, { id: model.id, textValue: label, children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(ModelOptionLabel, { label, hasVision: model.hasVision }) }, model.id);
                  })
                ]
              }
            ) : /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(Input, { ...field, value: field.value ?? "", placeholder: t2("form.customModelNamePlaceholder") })
          }
        ) }),
        /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(FormField, { label: t2("form.customProviderUrl"), error: errors.customProviderUrl?.message, ...common, children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
          Controller,
          {
            name: "customProviderUrl",
            control,
            render: ({ field }) => /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
              Input,
              {
                ...field,
                value: field.value ?? "",
                type: "url",
                placeholder: t2("form.customProviderUrlPlaceholder"),
                disabled: isTemplatePreset
              }
            )
          }
        ) }),
        !isOAuthPreset && /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(FormField, { label: t2("form.apiKey"), error: errors.apiKey?.message, ...common, children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
          Controller,
          {
            name: "apiKey",
            control,
            render: ({ field }) => /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(PasswordInput, { ...field, value: field.value ?? "", placeholder: t2("form.apiKeyPlaceholder") })
          }
        ) }),
        isMachineBoundLocalCustomProvider && /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(import_jsx_runtime17.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(FormField, { label: "\u8FD0\u884C\u4F4D\u7F6E", ...common, children: [
            /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
              Controller,
              {
                name: "machineId",
                control,
                render: ({ field }) => /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(
                  Select,
                  {
                    className: "cli-select",
                    selectedKey: field.value || "",
                    onSelectionChange: (key) => field.onChange(String(key ?? "")),
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(SelectItem, { id: "", textValue: "\u5F53\u524D\u8BBE\u5907\u672C\u5730\u76F4\u8FDE", children: "\u5F53\u524D\u8BBE\u5907\u672C\u5730\u76F4\u8FDE" }),
                      machineOptionsWithSelection.map((machine) => {
                        const label = machine.platform && machine.arch ? `${machine.name} (${machine.platform}/${machine.arch})` : `${machine.name} (${machine.machineId})`;
                        return /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
                          SelectItem,
                          {
                            id: machine.machineId,
                            textValue: label,
                            children: label
                          },
                          machine.machineId
                        );
                      })
                    ]
                  }
                )
              }
            ),
            machinesError ? /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("p", { className: "cli-info-box__hint", children: machinesError }) : machineOptions.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("p", { className: "cli-info-box__hint", children: "\u5F53\u524D\u6CA1\u6709\u53EF\u7ED1\u5B9A\u7684\u5728\u7EBF\u7535\u8111\u3002\u4FDD\u7559\u4E3A\u7A7A\u65F6\u8868\u793A\u53EA\u5728\u5F53\u524D\u8BBE\u5907\u672C\u5730\u76F4\u8FDE\u8FD9\u4E2A 127.0.0.1 \u5730\u5740\u3002" }) : /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("p", { className: "cli-info-box__hint", children: "\u9009\u62E9\u7535\u8111\u540E\uFF0C\u8FDC\u7A0B web / \u624B\u673A\u7AEF\u4F1A\u901A\u8FC7\u8FD9\u4E2A Agent \u4F7F\u7528\u76EE\u6807\u673A\u5668\u81EA\u5DF1\u7684 127.0.0.1\uFF1B\u8FDC\u7A0B\u7AEF\u4E0D\u4F1A\u76F4\u63A5\u8BBF\u95EE\u8FD9\u4E2A\u5730\u5740\u3002" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { className: "cli-info-box", children: [
            /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("p", { className: "cli-info-box__title", children: "\u2139\uFE0F \u672C\u5730\u6A21\u578B\u7ED1\u5B9A\u8BF4\u660E" }),
            /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("ul", { className: "cli-info-box__list", children: [
              /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("li", { children: "\u8FD9\u91CC\u7684 `127.0.0.1` \u53EA\u5BF9\u7ED1\u5B9A\u7684\u90A3\u53F0\u673A\u5668\u81EA\u5DF1\u6709\u6548\u3002" }),
              /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("li", { children: "\u8FDC\u7A0B\u7AEF\u5E94\u901A\u8FC7 Agent \u4F7F\u7528\u6A21\u578B\uFF0C\u800C\u4E0D\u662F\u76F4\u63A5\u8BBF\u95EE `127.0.0.1`\u3002" }),
              /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("li", { children: "\u8FD9\u662F machine binding \u8DEF\u5F84\uFF0C\u4E0D\u9700\u8981\u516C\u5F00\u6A21\u578B\u57DF\u540D\u3002" })
            ] })
          ] })
        ] })
      ] }),
      isCliApi && /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { className: "custom-api-box", children: [
        /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(FormField, { label: "CLI \u5DE5\u5177", ...common, children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
          Controller,
          {
            name: "cliProvider",
            control,
            render: ({ field }) => /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
              Select,
              {
                className: "cli-select",
                selectedKey: field.value || "copilot",
                onSelectionChange: (key) => {
                  const v = String(key ?? "");
                  field.onChange(v);
                  setValue("cliProvider", v);
                  setValue("machineId", "");
                  setValue("model", "");
                },
                children: [
                  {
                    value: "copilot",
                    label: "GitHub Copilot CLI\uFF08gh copilot\uFF09"
                  },
                  { value: "gemini", label: "Gemini CLI\uFF08gemini\uFF09" },
                  {
                    value: "codex",
                    label: "OpenAI Codex CLI\uFF08codex exec\uFF09"
                  },
                  { value: "claude", label: "Claude CLI\uFF08claude\uFF09" },
                  {
                    value: "agy",
                    label: "Google Antigravity CLI\uFF08agy\uFF09"
                  },
                  { value: "qoder", label: "Qoder CLI\uFF08qoder\uFF09" },
                  {
                    value: "opencode",
                    label: "OpenCode CLI\uFF08opencode\uFF09"
                  },
                  { value: "grok", label: "Grok CLI\uFF08grok\uFF09" },
                  { value: "kimi", label: "Kimi Code CLI\uFF08kimi\uFF09" }
                ].map((opt) => /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
                  SelectItem,
                  {
                    id: opt.value,
                    textValue: opt.label,
                    children: opt.label
                  },
                  opt.value
                ))
              }
            )
          }
        ) }),
        /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(FormField, { label: "\u8FD0\u884C\u4F4D\u7F6E", ...common, children: [
          /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
            Controller,
            {
              name: "machineId",
              control,
              render: ({ field }) => /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(
                Select,
                {
                  className: "cli-select",
                  selectedKey: field.value || "",
                  onSelectionChange: (key) => field.onChange(String(key ?? "")),
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(SelectItem, { id: "", textValue: "\u672C\u5730/\u670D\u52A1\u5668\u9ED8\u8BA4 CLI \u73AF\u5883", children: "\u672C\u5730/\u670D\u52A1\u5668\u9ED8\u8BA4 CLI \u73AF\u5883" }),
                    machineOptionsWithSelection.map((machine) => {
                      const label = machine.platform && machine.arch ? `${machine.name} (${machine.platform}/${machine.arch})` : `${machine.name} (${machine.machineId})`;
                      return /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
                        SelectItem,
                        {
                          id: machine.machineId,
                          textValue: label,
                          children: label
                        },
                        machine.machineId
                      );
                    })
                  ]
                }
              )
            }
          ),
          machinesError ? /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("p", { className: "cli-info-box__hint", children: machinesError }) : machineOptions.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("p", { className: "cli-info-box__hint", children: "\u6CA1\u6709\u68C0\u6D4B\u5230\u652F\u6301\u5F53\u524D CLI \u7684\u5728\u7EBF\u7535\u8111\u3002\u53EF\u4EE5\u5148\u5230\u8BBE\u7F6E\u91CC\u7684\u201C\u7535\u8111\u201D\u8FDE\u63A5\uFF0C\u6216\u7EE7\u7EED\u4F7F\u7528\u9ED8\u8BA4 CLI \u73AF\u5883\u3002" }) : /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("p", { className: "cli-info-box__hint", children: "\u9009\u62E9\u7535\u8111\u540E\uFF0C\u8FD9\u4E2A Agent \u4F1A\u901A\u8FC7\u90A3\u53F0\u7535\u8111\u4E0A\u7684 CLI \u6267\u884C\u3002" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { className: "cli-info-box", children: [
          /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("p", { className: "cli-info-box__title", children: "\u2139\uFE0F \u4F7F\u7528\u524D\u63D0" }),
          /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("ul", { className: "cli-info-box__list", children: [
            selectedCliProvider === "agy" ? /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(import_jsx_runtime17.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("li", { children: [
                "\u5DF2\u5B89\u88C5 ",
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("code", { children: "agy" }),
                " CLI \u5E76\u5B8C\u6210\u672C\u673A\u767B\u5F55"
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("li", { children: [
                "\u9ED8\u8BA4\u4F7F\u7528 ",
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("code", { children: "agy --print" }),
                " \u6267\u884C\u4EFB\u52A1\uFF1B\u6A21\u578B\u548C\u6743\u9650\u4EE5\u5F53\u524D Antigravity \u8D26\u53F7\u914D\u7F6E\u4E3A\u51C6"
              ] })
            ] }) : selectedCliProvider === "gemini" ? /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(import_jsx_runtime17.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("li", { children: [
                "\u5DF2\u5B89\u88C5 ",
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("code", { children: "gemini" }),
                " CLI \u5E76\u5B8C\u6210\u672C\u673A\u767B\u5F55"
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("li", { children: [
                "\u6A21\u578B\u53EF\u7528\u6027\u4E0E\u6743\u9650\u4EE5\u5F53\u524D ",
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("code", { children: "gemini --help" }),
                " \u548C\u8D26\u53F7\u914D\u7F6E\u4E3A\u51C6"
              ] })
            ] }) : selectedCliProvider === "codex" ? /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(import_jsx_runtime17.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("li", { children: [
                "\u5DF2\u5B89\u88C5 ",
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("code", { children: "codex" }),
                " CLI \u5E76\u5B8C\u6210\u672C\u673A\u767B\u5F55"
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("li", { children: [
                "\u9ED8\u8BA4\u4F7F\u7528 ",
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("code", { children: "codex exec" }),
                " \u6267\u884C\u4EFB\u52A1\uFF1B\u6A21\u578B\u53EF\u7528\u6027\u4EE5\u5F53\u524D\u8D26\u53F7\u548C",
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("code", { children: "codex exec --help" }),
                " \u4E3A\u51C6"
              ] })
            ] }) : selectedCliProvider === "claude" ? /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(import_jsx_runtime17.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("li", { children: [
                "\u5DF2\u5B89\u88C5 ",
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("code", { children: "claude" }),
                " CLI \u5E76\u5B8C\u6210\u672C\u673A\u767B\u5F55"
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("li", { children: [
                "\u9ED8\u8BA4\u4F7F\u7528 ",
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("code", { children: "claude -p" }),
                " \u6267\u884C\u4EFB\u52A1\uFF1B\u6A21\u578B\u53EF\u7528\u6027\u4EE5\u5F53\u524D\u8D26\u53F7\u548C",
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("code", { children: "claude --help" }),
                " \u4E3A\u51C6"
              ] })
            ] }) : selectedCliProvider === "qoder" ? /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(import_jsx_runtime17.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("li", { children: [
                "\u5DF2\u5B89\u88C5 ",
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("code", { children: "qoder" }),
                " CLI \u5E76\u5B8C\u6210\u672C\u673A\u767B\u5F55"
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("li", { children: [
                "\u9ED8\u8BA4\u4F7F\u7528 ",
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("code", { children: "qoder -p" }),
                " \u6267\u884C\u4EFB\u52A1\uFF1B\u6A21\u578B\u53EF\u7528\u6027\u4EE5\u5F53\u524D\u8D26\u53F7\u548C",
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("code", { children: "qoder --help" }),
                " \u4E3A\u51C6"
              ] })
            ] }) : selectedCliProvider === "opencode" ? /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(import_jsx_runtime17.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("li", { children: [
                "\u5DF2\u5B89\u88C5 ",
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("code", { children: "opencode" }),
                " CLI \u5E76\u5B8C\u6210\u672C\u673A\u767B\u5F55"
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("li", { children: [
                "\u9ED8\u8BA4\u4F7F\u7528 ",
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("code", { children: "opencode run --format json" }),
                " \u6267\u884C\u4EFB\u52A1\uFF1B\u6A21\u578B\u53EF\u7528\u6027\u4EE5\u5F53\u524D\u8D26\u53F7\u548C",
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("code", { children: "opencode --help" }),
                " \u4E3A\u51C6"
              ] })
            ] }) : selectedCliProvider === "grok" ? /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(import_jsx_runtime17.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("li", { children: [
                "\u5DF2\u5B89\u88C5 ",
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("code", { children: "grok" }),
                " CLI \u5E76\u5B8C\u6210\u672C\u673A\u767B\u5F55\u6216\u914D\u7F6E ",
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("code", { children: "XAI_API_KEY" })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("li", { children: [
                "\u9ED8\u8BA4\u4F7F\u7528 ",
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("code", { children: "grok -p --output-format json --yolo" }),
                " \u6267\u884C\u4EFB\u52A1\uFF1B\u6A21\u578B\u53EF\u7528\u6027\u4EE5\u5F53\u524D\u8D26\u53F7\u548C",
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("code", { children: "grok --help" }),
                " \u4E3A\u51C6"
              ] })
            ] }) : selectedCliProvider === "kimi" ? /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(import_jsx_runtime17.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("li", { children: [
                "\u5DF2\u5B89\u88C5 ",
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("code", { children: "kimi" }),
                "\uFF08Kimi Code CLI\uFF09\u5E76\u5B8C\u6210\u672C\u673A\u767B\u5F55"
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("li", { children: [
                "\u9ED8\u8BA4\u4F7F\u7528 ",
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("code", { children: "kimi -p --output-format stream-json" }),
                " \u6267\u884C\u4EFB\u52A1\uFF1B\u6A21\u578B\u53EF\u7528\u6027\u4EE5\u5F53\u524D\u8D26\u53F7\u548C",
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("code", { children: "kimi --help" }),
                " \u4E3A\u51C6"
              ] })
            ] }) : /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(import_jsx_runtime17.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("li", { children: [
                "\u5DF2\u5B89\u88C5 ",
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("code", { children: "gh" }),
                "\uFF08GitHub CLI\uFF09\u5E76\u767B\u5F55"
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("li", { children: [
                "\u5DF2\u5B89\u88C5 Copilot \u6269\u5C55\uFF1A",
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("code", { children: "gh extension install github/gh-copilot" })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("li", { children: [
                "\u6A21\u578B\u53EF\u7528\u6027\u4E0E\u8BA1\u8D39\u4EE5\u5F53\u524D ",
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("code", { children: "gh copilot -- --help" }),
                " \u548C\u8D26\u53F7\u914D\u989D\u4E3A\u51C6"
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("li", { children: '\u7CFB\u7EDF\u63D0\u793A\u8BCD\u4F1A\u81EA\u52A8\u4F5C\u4E3A"\u89D2\u8272\u8BBE\u5B9A"\u6CE8\u5165\u4EFB\u52A1' }),
            /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("li", { children: "CLI agent \u4F1A\u590D\u7528\u6A21\u578B\u9009\u62E9\u3001\u63D0\u793A\u8BCD\u548C\u6700\u8FD1\u6587\u672C\u5386\u53F2\uFF0C\u4F46\u4E0D\u8D70\u672C\u5730\u5DE5\u5177\u8C03\u7528\u534F\u8BAE" })
          ] })
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("section", { className: "adv-settings__group", children: [
      /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
        FormField,
        {
          label: t2("form.useServerProxy"),
          helperText: t2("help.proxy"),
          ...common,
          children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
            Controller,
            {
              name: "useServerProxy",
              control,
              render: ({ field }) => /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
                Switch,
                {
                  checked: field.value,
                  onChange: field.onChange
                }
              )
            }
          )
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
        FormField,
        {
          label: t2("form.enableThinking"),
          helperText: t2("help.enableThinking"),
          ...common,
          children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
            Controller,
            {
              name: "enableThinking",
              control,
              render: ({ field }) => /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
                Switch,
                {
                  checked: !!field.value,
                  onChange: field.onChange
                }
              )
            }
          )
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
        Controller,
        {
          name: "enableThinking",
          control,
          render: ({ field: thinkField }) => thinkField.value ? /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
            FormField,
            {
              label: t2("form.thinkingBudget"),
              helperText: t2("help.thinkingBudget"),
              ...common,
              children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
                Controller,
                {
                  name: "thinkingBudget",
                  control,
                  render: ({ field }) => /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
                    Slider,
                    {
                      value: field.value ?? 8e3,
                      onChange: field.onChange,
                      min: 1024,
                      max: 32e3,
                      step: 512,
                      showValue: true
                    }
                  )
                }
              )
            }
          ) : /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(import_jsx_runtime17.Fragment, {})
        }
      ),
      showHostedExecRuntimeControl && /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(
        FormField,
        {
          label: "Alpha \u6258\u7BA1\u6267\u884C\u6388\u6743",
          helperText: "\u666E\u901A\u7528\u6237\u4FDD\u6301\u5173\u95ED\u4E5F\u4E0D\u5F71\u54CD\u804A\u5929\uFF1B\u5F53\u4F60\u60F3\u628A\u91CD\u590D\u4EFB\u52A1\u56FA\u5316\u6210\u811A\u672C/\u547D\u4EE4\u80FD\u529B\u65F6\u518D\u5F00\u542F\u3002",
          ...common,
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
              Switch,
              {
                checked: allowHostedExec,
                onChange: (checked) => {
                  setValue(
                    "runtimeToolPolicy",
                    checked ? HOSTED_EXEC_RUNTIME_POLICY : removeHostedExecRuntimePolicy(runtimeToolPolicy),
                    {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true
                    }
                  );
                }
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("p", { className: "cli-info-box__hint", children: "\u5F00\u542F\u540E\uFF0C\u8FD9\u4E2A Web/server Agent \u53EF\u5728\u6258\u7BA1\u4E34\u65F6\u5DE5\u4F5C\u533A\u4F7F\u7528 execShell\uFF1B\u552F\u4E00\u6388\u6743\u6765\u6E90\u662F runtimeToolPolicy\u3002 \u53EA\u5728 alpha \u6267\u884C\u73AF\u5883\u5F00\u542F\u4E14\u672C\u6B21\u8FD0\u884C\u8BF7\u6C42 execShell \u65F6\u751F\u6548\uFF1B\u4E0D\u4F1A\u81EA\u52A8\u521B\u5EFA skill\u3002\u5173\u95ED\u540E\u53EA\u6E05\u9664\u8FD9\u9879\u6388\u6743\u3002 \u8FD9\u4E0D\u662F\u5B8C\u6574\u751F\u4EA7\u6C99\u7BB1\u3002\u6267\u884C\u8BC1\u636E\u4F1A\u5199\u5165\u5BF9\u8BDD\uFF0C\u5E76\u5728 AgentPage \u9AD8\u7EA7\u8BC1\u636E\u91CC\u5C55\u793A\u6458\u8981\u3002" })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("section", { className: `adv-settings__params${paramsOpen ? " is-open" : ""}`, children: [
      /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("header", { className: "adv-settings__params-header", children: [
        /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(
          "button",
          {
            type: "button",
            className: "adv-settings__params-toggle",
            onClick: () => setParamsOpen((open) => !open),
            "aria-expanded": paramsOpen,
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("h3", { className: "adv-settings__title", children: t2("form.modelParameters") }),
              /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
                LuChevronDown,
                {
                  className: `adv-settings__params-chevron${paramsOpen ? " is-open" : ""}`,
                  size: 18,
                  "aria-hidden": true
                }
              )
            ]
          }
        ),
        paramsOpen ? /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
          Button_default,
          {
            variant: "ghost",
            size: "small",
            onClick: onReset,
            icon: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(LuRefreshCw, { className: "reset-icon", size: 14 }),
            children: t2("resetToDefaults")
          }
        ) : null
      ] }),
      paramsOpen ? /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { className: "adv-settings__grid", children: PARAM_CONFIGS.map(
        (c) => c.key === "maxTokens" ? /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { className: "adv-settings__item", children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
          FormField,
          {
            label: t2(`form.${c.key}`),
            helperText: t2(`help.${c.key}`),
            horizontal: false,
            children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
              Controller,
              {
                name: FORM_MAP[c.key],
                control,
                render: ({ field }) => {
                  const rawValue = field.value;
                  const isUnset = rawValue === null || rawValue === void 0;
                  const isExpanded = maxTokensExpanded || !isUnset;
                  const sliderValue = field.value ?? c.default;
                  const inputValue = isUnset ? "" : String(field.value);
                  return /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { className: "adv-settings__max-tokens", children: [
                    isExpanded ? /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(import_jsx_runtime17.Fragment, { children: [
                      /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
                        Slider,
                        {
                          value: sliderValue,
                          onChange: field.onChange,
                          min: c.min,
                          max: c.max,
                          step: c.step,
                          showValue: true
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
                        Input,
                        {
                          type: "number",
                          inputMode: "numeric",
                          size: "sm",
                          value: inputValue,
                          placeholder: isUnset ? t2("form.maxTokensInputPlaceholder") : "",
                          min: c.min,
                          max: c.max,
                          error: !isUnset && (Number(field.value) < (c.min ?? 1) || Number(field.value) > (c.max ?? MAX_TOKENS_LIMIT)),
                          helperText: !isUnset && (Number(field.value) < (c.min ?? 1) || Number(field.value) > (c.max ?? MAX_TOKENS_LIMIT)) ? t2("validation.maxTokensRange", {
                            min: c.min ?? 1,
                            max: c.max ?? MAX_TOKENS_LIMIT
                          }) : void 0,
                          onChange: (e) => {
                            const raw = e.target.value;
                            if (raw === "") {
                              field.onChange(null);
                              return;
                            }
                            const n = Number(raw);
                            if (!Number.isNaN(n)) {
                              field.onChange(n);
                            }
                          }
                        }
                      )
                    ] }) : /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("span", { className: "adv-settings__max-tokens-unset", children: t2("form.maxTokensFollowModelDefault") }),
                    isUnset && !isExpanded ? /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
                      Button_default,
                      {
                        variant: "ghost",
                        size: "small",
                        type: "button",
                        onClick: () => {
                          setMaxTokensExpanded(true);
                        },
                        children: t2("form.maxTokensSetCustom")
                      }
                    ) : /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
                      Button_default,
                      {
                        variant: "ghost",
                        size: "small",
                        type: "button",
                        onClick: () => {
                          field.onChange(null);
                          field.onBlur();
                          setMaxTokensExpanded(false);
                        },
                        children: t2("form.maxTokensClearToDefault")
                      }
                    )
                  ] });
                }
              }
            )
          }
        ) }, c.key) : /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { className: "adv-settings__item", children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
          FormField,
          {
            label: t2(`form.${c.key}`),
            helperText: t2(`help.${c.key}`),
            horizontal: false,
            children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
              Controller,
              {
                name: FORM_MAP[c.key],
                control,
                render: ({ field }) => c.options ? /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
                  RadioGroup_default,
                  {
                    value: field.value ?? c.default,
                    onChange: field.onChange,
                    options: c.options.map((o) => ({
                      label: o,
                      value: o
                    }))
                  }
                ) : /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
                  Slider,
                  {
                    value: field.value ?? c.default,
                    onChange: field.onChange,
                    min: c.min,
                    max: c.max,
                    step: c.step,
                    showValue: true
                  }
                )
              }
            )
          }
        ) }, c.key)
      ) }) : null
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("style", { children: `
        .adv-settings {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
          animation: fadeInDown 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .adv-settings__model {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          padding: 0 var(--space-2);
        }

        .adv-settings__group {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          padding: 0 var(--space-2);
        }

        .adv-settings__params {
          padding: var(--space-8);
          background: var(--backgroundSecondary);
          border-radius: var(--radius-md);
          border: none;
          box-shadow: 0 4px 20px var(--shadowLight);
          transition: all 0.3s ease;
        }

        [data-theme='dark'] .adv-settings__params {
          background: var(--backgroundTertiary);
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
        }

        .adv-settings__params-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: var(--space-3);
          margin-bottom: 0;
        }

        .adv-settings__params.is-open .adv-settings__params-header {
          margin-bottom: var(--space-10);
        }

        .adv-settings__params-toggle {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          padding: 0;
          border: none;
          background: transparent;
          color: inherit;
          cursor: pointer;
          text-align: left;
          min-width: 0;
        }

        .adv-settings__params-toggle:hover .adv-settings__title {
          color: var(--primary);
        }

        .adv-settings__params-chevron {
          flex-shrink: 0;
          color: var(--textSecondary);
          transition: transform 0.2s ease;
        }

        .adv-settings__params-chevron.is-open {
          transform: rotate(180deg);
        }

        .adv-settings__title {
          font-size: var(--fontSize-lg);
          font-weight: 600;
          color: var(--text);
          margin: 0;
          letter-spacing: -0.01em;
        }

        .adv-settings__grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: var(--space-10) var(--space-8);
        }

        .adv-settings__item {
          transition: transform 0.2s ease;
        }

        .adv-settings__max-tokens {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          flex-wrap: wrap;
        }

        .adv-settings__max-tokens-unset {
          color: var(--textSecondary);
          font-size: var(--fontSize-sm);
        }

        .adv-settings__max-tokens .slider-container {
          flex: 1 1 220px;
          min-width: 220px;
        }

        :global(.reset-icon) {
          transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        :global(button:hover .reset-icon) {
          transform: rotate(180deg);
        }
        
        :global(button:active .reset-icon) {
          transform: rotate(360deg);
          transition: transform 0.3s ease;
        }

        :global(.cli-info-box__hint) {
          margin: var(--space-2) 0 0;
          color: var(--textSecondary);
          font-size: var(--fontSize-sm);
          line-height: 1.5;
        }

        @media (max-width: 768px) {
          .adv-settings__params {
            padding: var(--space-6);
            border-radius: var(--radius-md);
          }
          
          .adv-settings__grid {
            grid-template-columns: 1fr;
            gap: var(--space-8);
          }
          
          .adv-settings__params-header {
            margin-bottom: var(--space-8);
          }
        }
      ` })
  ] });
};
var AdvancedSettingsTab_default = AdvancedSettingsTab;

// packages/ai/agent/web/useAgentCreateSourceState.ts
var import_react16 = __toESM(require_react());

// packages/ai/agent/web/useSubscriptionOAuthConnection.ts
var import_react15 = __toESM(require_react());
function useSubscriptionOAuthConnection(provider) {
  const isDesktop = getIsDesktopApp();
  const [connection, setConnection] = (0, import_react15.useState)({
    kind: provider ? "loading" : "idle"
  });
  const readStatus = (0, import_react15.useCallback)(async () => {
    if (!provider) {
      setConnection({ kind: "idle" });
      return;
    }
    if (!isDesktop) {
      setConnection({ kind: "not_connected" });
      return;
    }
    setConnection(
      (current) => current.kind === "connecting" ? current : { kind: "loading" }
    );
    const path = `/api/desktop/oauth/${encodeURIComponent(provider)}/status`;
    try {
      const response = await fetch(path, { cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setConnection({ kind: "error", message: body.error || `Status ${response.status}` });
        return;
      }
      setConnection(
        body.connected ? {
          kind: "connected",
          email: body.email,
          accountId: body.accountId,
          expiresAt: body.expiresAt
        } : { kind: "not_connected" }
      );
    } catch {
      setConnection({ kind: "error", message: "\u65E0\u6CD5\u67E5\u8BE2 OAuth \u767B\u5F55\u72B6\u6001" });
    }
  }, [isDesktop, provider]);
  (0, import_react15.useEffect)(() => {
    void readStatus();
  }, [readStatus]);
  const startLogin = (0, import_react15.useCallback)(async () => {
    if (!provider || !isDesktop) return;
    setConnection({ kind: "connecting" });
    try {
      const response = await fetch(
        `/api/desktop/oauth/${encodeURIComponent(provider)}/start`,
        { method: "POST" }
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.connected) {
        setConnection({ kind: "error", message: body.error || "OAuth \u767B\u5F55\u5931\u8D25" });
        return;
      }
      setConnection({
        kind: "connected",
        email: body.email,
        accountId: body.accountId,
        expiresAt: body.expiresAt
      });
    } catch {
      setConnection({ kind: "error", message: "OAuth \u767B\u5F55\u5931\u8D25" });
    }
  }, [isDesktop, provider]);
  return { isDesktop, connection, refresh: readStatus, startLogin };
}

// packages/ai/agent/web/useAgentCreateSourceState.ts
var PLATFORM_QUICK_CREATE_MODEL = {
  provider: "nolo",
  name: OLLAMA_CLOUD_GLM_52_MODEL,
  displayName: "GLM 5.2"
};
var CREATE_RUN_MODE_LABELS = {
  platform: "\u5E73\u53F0\u5185\u7F6E",
  api: "API \u7528\u91CF\u8BA1\u8D39",
  subscription: "\u8BA2\u9605\u4F1A\u5458",
  cli: "\u672C\u673A CLI"
};
function deriveAgentNameFromPrompt(prompt, fallback = "\u65B0 AI") {
  const line = prompt.trim().split(/\n/)[0]?.trim() ?? "";
  if (!line) return fallback;
  return line.slice(0, 50);
}
function resolveModelLabel(modelId, modelOptions) {
  const hit = modelOptions.find((m) => m.id === modelId || m.value === modelId);
  return hit?.label ?? "";
}
function resolveModelHasVision(modelId, modelOptions) {
  const hit = modelOptions.find((m) => m.id === modelId || m.value === modelId);
  return Boolean(hit?.hasVision);
}
function useAgentCreateSourceState({
  selected,
  onAdvancedEdit,
  onQuickCreate,
  isSubmitting = false,
  disabled = false
}) {
  const { t: t2 } = useTranslation("ai");
  const platformModelOptions = (0, import_react16.useMemo)(() => {
    const models = getModelsByProvider(PLATFORM_QUICK_CREATE_MODEL.provider);
    return models.map((m) => ({
      value: m.name,
      label: m.displayName || m.name,
      hasVision: Boolean(m.hasVision)
    }));
  }, []);
  const meteredPresets = (0, import_react16.useMemo)(() => listMeteredApiPresetOptions(), []);
  const subscriptionPresets = (0, import_react16.useMemo)(() => listSubscriptionPresetOptions(), []);
  const meteredPresetOptions = (0, import_react16.useMemo)(
    () => meteredPresets.map((p) => ({
      value: p.id,
      label: p.label
    })),
    [meteredPresets]
  );
  const subscriptionPresetOptions = (0, import_react16.useMemo)(
    () => subscriptionPresets.map((p) => ({
      value: p.id,
      label: `${p.label}${p.requiresDesktopOAuth ? " \xB7 OAuth" : ""}`
    })),
    [subscriptionPresets]
  );
  const defaultApiPresetId = meteredPresets.find((p) => p.id === "openai-api")?.id ?? meteredPresets[0]?.id ?? MANUAL_PROVIDER_PRESET_ID;
  const defaultSubPresetId = subscriptionPresets.find((p) => p.id === "token-plan")?.id ?? subscriptionPresets[0]?.id ?? "token-plan";
  const [prompt, setPrompt] = (0, import_react16.useState)("");
  const [platformModel, setPlatformModel] = (0, import_react16.useState)(
    PLATFORM_QUICK_CREATE_MODEL.name
  );
  const [apiPresetId, setApiPresetId] = (0, import_react16.useState)(defaultApiPresetId);
  const [subPresetId, setSubPresetId] = (0, import_react16.useState)(defaultSubPresetId);
  const [customProviderUrl, setCustomProviderUrl] = (0, import_react16.useState)(() => {
    const f = resolveProviderPresetFields(defaultApiPresetId);
    return f.customProviderUrl;
  });
  const [apiKey, setApiKey] = (0, import_react16.useState)("");
  const [model, setModel] = (0, import_react16.useState)(() => {
    const f = resolveProviderPresetFields(defaultApiPresetId);
    return f.model;
  });
  const [subCustomProviderUrl, setSubCustomProviderUrl] = (0, import_react16.useState)(() => {
    const f = resolveProviderPresetFields(defaultSubPresetId);
    return f.customProviderUrl;
  });
  const [subApiKey, setSubApiKey] = (0, import_react16.useState)("");
  const [credentialSynced, setCredentialSynced] = (0, import_react16.useState)(false);
  const [subModel, setSubModel] = (0, import_react16.useState)(() => {
    const f = resolveProviderPresetFields(defaultSubPresetId);
    return f.model;
  });
  const [subReasoningEffort, setSubReasoningEffort] = (0, import_react16.useState)(
    () => {
      const f = resolveProviderPresetFields(defaultSubPresetId);
      return f.defaultReasoningEffort;
    }
  );
  const [apiReasoningEffort, setApiReasoningEffort] = (0, import_react16.useState)(DEFAULT_REASONING_EFFORT);
  const [cliProvider, setCliProvider] = (0, import_react16.useState)(
    () => CLI_PROVIDER_VALUES[0]
  );
  const [cliMachineId, setCliMachineId] = (0, import_react16.useState)("");
  const [cliMachines, setCliMachines] = (0, import_react16.useState)([]);
  const [cliMachinesError, setCliMachinesError] = (0, import_react16.useState)(null);
  const currentServer = useAppSelector(selectCurrentServer);
  const cliAuthToken = useToken() ?? "";
  const cliLoggedIn = useIsLoggedIn();
  const cliServerBase = (0, import_react16.useMemo)(() => {
    const configured = normalizeServerOrigin(currentServer);
    if (configured) return configured;
    return typeof window !== "undefined" ? window.location.origin : "";
  }, [currentServer]);
  const cliMachineOptions = (0, import_react16.useMemo)(() => {
    const required = CLI_CAPABILITY_BY_PROVIDER[cliProvider];
    return cliMachines.filter(
      (m) => m.status === "online" && m.connectorStatus === "connected" && m.capabilities.includes(required)
    );
  }, [cliMachines, cliProvider]);
  (0, import_react16.useEffect)(() => {
    if (selected !== "cli" || !cliServerBase) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`${cliServerBase}/api/machines`, {
          method: "GET",
          cache: "no-store",
          headers: cliAuthToken ? { Authorization: `Bearer ${cliAuthToken}` } : {}
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Failed to load machines");
        if (!cancelled) {
          setCliMachines(Array.isArray(data.machines) ? data.machines : []);
          setCliMachinesError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setCliMachines([]);
          setCliMachinesError(toErrorMessage(error));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected, cliServerBase, cliAuthToken]);
  const activePresetId = selected === "subscription" ? subPresetId : selected === "api" ? apiPresetId : MANUAL_PROVIDER_PRESET_ID;
  const activePresetFields = (0, import_react16.useMemo)(
    () => resolveProviderPresetFields(activePresetId),
    [activePresetId]
  );
  const oauthProvider = selected === "subscription" && activePresetFields.requiresDesktopOAuth ? activePresetFields.apiKeyRef : null;
  const oauth = useSubscriptionOAuthConnection(oauthProvider);
  const oauthConnected = oauth.connection.kind === "connected";
  const draft = (0, import_react16.useMemo)(() => {
    const defaultName = t2("createAgent.quickCreate.defaultName", "\u65B0 AI");
    if (selected === "platform") {
      const modelLabel2 = resolveModelLabel(platformModel, platformModelOptions);
      const name2 = deriveAgentNameFromPrompt(prompt, modelLabel2 || defaultName);
      return {
        mode: "platform",
        prompt,
        name: name2,
        provider: PLATFORM_QUICK_CREATE_MODEL.provider,
        model: platformModel,
        hasVision: resolveModelHasVision(platformModel, platformModelOptions),
        customProviderUrl: "",
        apiKey: "",
        apiKeyRef: "",
        apiKeyHeader: "",
        requiresDesktopOAuth: false,
        oauthConnected: false,
        credentialSynced: false,
        presetId: "",
        // Kimi K3 (crof upstream) defaults to high reasoning for stronger output;
        // other platform models keep the schema default (medium).
        reasoningEffort: platformModel === PLATFORM_HOSTED_KIMI_K3_MODEL ? "high" : DEFAULT_REASONING_EFFORT,
        cliProvider: "",
        machineId: "",
        machineName: ""
      };
    }
    if (selected === "subscription") {
      const fields2 = resolveProviderPresetFields(subPresetId);
      const modelId2 = subModel || fields2.model;
      const modelLabel2 = resolveModelLabel(modelId2, fields2.modelOptions);
      const name2 = deriveAgentNameFromPrompt(prompt, modelLabel2 || defaultName);
      return {
        mode: "subscription",
        prompt,
        name: name2,
        provider: fields2.provider,
        model: modelId2,
        hasVision: resolveModelHasVision(modelId2, fields2.modelOptions),
        customProviderUrl: subCustomProviderUrl,
        apiKey: subApiKey,
        apiKeyRef: fields2.apiKeyRef,
        apiKeyHeader: fields2.apiKeyHeader,
        presetId: subPresetId,
        requiresDesktopOAuth: fields2.requiresDesktopOAuth,
        oauthConnected,
        credentialSynced,
        reasoningEffort: subReasoningEffort,
        cliProvider: "",
        machineId: "",
        machineName: ""
      };
    }
    if (selected === "cli") {
      const name2 = deriveAgentNameFromPrompt(prompt, defaultName);
      const machine = cliMachineOptions.find((m) => m.machineId === cliMachineId);
      return {
        mode: "cli",
        prompt,
        name: name2,
        provider: "",
        model: "",
        hasVision: false,
        customProviderUrl: "",
        apiKey: "",
        apiKeyRef: "",
        apiKeyHeader: "",
        presetId: "",
        requiresDesktopOAuth: false,
        oauthConnected: false,
        credentialSynced: false,
        reasoningEffort: DEFAULT_REASONING_EFFORT,
        cliProvider,
        machineId: cliMachineId,
        machineName: machine?.name ?? ""
      };
    }
    const fields = resolveProviderPresetFields(apiPresetId);
    const modelId = model || fields.model;
    const modelLabel = resolveModelLabel(modelId, fields.modelOptions);
    const name = deriveAgentNameFromPrompt(prompt, modelLabel || defaultName);
    return {
      mode: "api",
      prompt,
      name,
      provider: fields.provider,
      model: modelId,
      hasVision: resolveModelHasVision(modelId, fields.modelOptions),
      customProviderUrl,
      apiKey,
      apiKeyRef: fields.apiKeyRef,
      apiKeyHeader: fields.apiKeyHeader,
      presetId: apiPresetId,
      requiresDesktopOAuth: false,
      oauthConnected: false,
      credentialSynced,
      reasoningEffort: apiReasoningEffort,
      cliProvider: "",
      machineId: "",
      machineName: ""
    };
  }, [
    selected,
    prompt,
    platformModel,
    platformModelOptions,
    apiPresetId,
    subPresetId,
    customProviderUrl,
    apiKey,
    model,
    subCustomProviderUrl,
    subApiKey,
    subModel,
    subReasoningEffort,
    apiReasoningEffort,
    oauthConnected,
    credentialSynced,
    cliProvider,
    cliMachineId,
    cliMachineOptions,
    t2
  ]);
  const busy = disabled || isSubmitting;
  const canCreatePlatform = selected === "platform" && !!platformModel;
  const canCreateApi = selected === "api" && customProviderUrl.trim().length > 0;
  const canCreateSubscription = selected === "subscription" && (draft.requiresDesktopOAuth ? oauthConnected : subCustomProviderUrl.trim().length > 0);
  const canCreateCli = selected === "cli";
  const canCreate = canCreatePlatform || canCreateApi || canCreateSubscription || canCreateCli;
  const canAdvanced = selected === "platform" || selected === "api" || selected === "cli" || selected === "subscription" && (!draft.requiresDesktopOAuth || oauthConnected);
  const applyApiPreset = (id) => {
    setApiPresetId(id);
    const fields = resolveProviderPresetFields(id);
    setCustomProviderUrl(fields.customProviderUrl);
    setModel(fields.model || model);
    if (id === MANUAL_PROVIDER_PRESET_ID) setApiReasoningEffort(DEFAULT_REASONING_EFFORT);
    if (fields.clearApiKey) setApiKey("");
  };
  const applySubPreset = (id) => {
    const changed = id !== subPresetId;
    setSubPresetId(id);
    const fields = resolveProviderPresetFields(id);
    setSubCustomProviderUrl(fields.customProviderUrl);
    setSubModel(fields.model);
    if (changed) setSubReasoningEffort(fields.defaultReasoningEffort);
    if (fields.clearApiKey) setSubApiKey("");
  };
  const applyCliProvider = (id) => {
    setCliProvider(id);
    setCliMachineId("");
  };
  const handleCreate = () => {
    if (!selected || !canCreate) return;
    void onQuickCreate(draft);
  };
  const handleAdvanced = () => {
    if (!selected || !canAdvanced) return;
    onAdvancedEdit(draft);
  };
  return {
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
    canCreate,
    canAdvanced,
    handleCreate,
    handleAdvanced,
    oauth,
    cliProvider,
    setCliProvider: applyCliProvider,
    cliMachineId,
    setCliMachineId,
    cliMachineOptions,
    cliMachinesError,
    cliMachines,
    cliLoggedIn,
    cliProviderOptions: CLI_PROVIDER_OPTIONS
  };
}

// packages/ai/agent/web/AgentCreateSourceStep.tsx
var import_jsx_runtime18 = __toESM(require_jsx_runtime());
var CARD_DEFS = [
  {
    id: "platform",
    titleKey: "createAgent.runMode.platform.title",
    titleDefault: "\u5E73\u53F0\u5185\u7F6E",
    descKey: "createAgent.runMode.platform.desc",
    descDefault: "\u7528 nolo \u63D0\u4F9B\u7684\u6A21\u578B\uFF0C\u65E0\u9700\u81EA\u5DF1\u7684 Key\u3002",
    footnoteKey: "createAgent.runMode.platform.footnote",
    footnoteDefault: "\u6309\u5E73\u53F0\u7528\u91CF\u8BA1\u8D39\u3002",
    recommended: true
  },
  {
    id: "api",
    titleKey: "createAgent.runMode.api.title",
    titleDefault: "API \u7528\u91CF\u8BA1\u8D39",
    descKey: "createAgent.runMode.api.desc",
    descDefault: "\u586B API Key\uFF0C\u76F4\u8FDE OpenAI / Anthropic / \u517C\u5BB9\u63A5\u53E3\u7B49\uFF0C\u6309\u4E0A\u6E38\u7528\u91CF\u8BA1\u8D39\u3002",
    footnoteKey: "createAgent.runMode.api.footnote",
    footnoteDefault: "\u8D39\u7528\u5728\u4E0A\u6E38\u8D26\u5355\u3002"
  },
  {
    id: "subscription",
    titleKey: "createAgent.runMode.subscription.title",
    titleDefault: "\u8BA2\u9605\u4F1A\u5458",
    descKey: "createAgent.runMode.subscription.desc",
    descDefault: "\u7528 ChatGPT Plus\u3001SuperGrok\u3001Token Plan \u7B49\u5DF2\u6709\u8BA2\u9605\u3002",
    footnoteKey: "createAgent.runMode.subscription.footnote",
    footnoteDefault: "Token Plan \u53EF\u5728 Web \u586B\u5199\uFF1BOAuth \u8BF7\u5230\u684C\u9762\u7AEF\u7ED1\u5B9A\u3002"
  },
  {
    id: "cli",
    titleKey: "createAgent.runMode.cli.title",
    titleDefault: "\u672C\u673A CLI",
    descKey: "createAgent.runMode.cli.desc",
    descDefault: "\u7528\u672C\u673A\u5B89\u88C5\u7684 Claude Code\u3001Codex\u3001Gemini CLI \u7B49\u8FD0\u884C\uFF0C\u65E0\u9700\u5E73\u53F0 API Key\u3002",
    footnoteKey: "createAgent.runMode.cli.footnote",
    footnoteDefault: "\u9700\u684C\u9762\u7AEF\u7ED1\u5B9A\u672C\u673A\uFF1B\u672A\u7ED1\u5B9A\u4E5F\u53EF\u5148\u521B\u5EFA\u3002"
  }
];
function getReasoningEffortSelectOptions(t2) {
  const prefix = "createAgent.quickCreate.reasoningEffortOptions.";
  return [
    { id: "none", label: t2(`${prefix}none`) },
    { id: "minimal", label: t2(`${prefix}minimal`) },
    { id: "low", label: t2(`${prefix}low`) },
    { id: "medium", label: t2(`${prefix}medium`) },
    { id: "high", label: t2(`${prefix}high`) },
    { id: "xhigh", label: t2(`${prefix}xhigh`) },
    { id: "max", label: t2(`${prefix}max`) }
  ];
}
var AgentCreateIntro = () => {
  const { t: t2 } = useTranslation("ai");
  return /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: "agent-create-source-step__intro", children: [
    /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("h2", { className: "agent-create-source-step__heading", children: t2("createAgent.runMode.heading", "\u8FD0\u884C\u65B9\u5F0F") }),
    /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("p", { className: "agent-create-source-step__sub", children: t2(
      "createAgent.runMode.subheading",
      "\u5148\u9009\u62E9\u6A21\u578B\u4ECE\u54EA\u91CC\u6765\u3002\u5E73\u53F0\u8DEF\u5F84\u586B\u63D0\u793A\u8BCD\u5373\u53EF\u521B\u5EFA\uFF1B\u9700\u8981\u77E5\u8BC6\u3001\u5DE5\u5177\u3001\u53D1\u5E03\u65F6\u7528\u9AD8\u7EA7\u7F16\u8F91\u3002"
    ) })
  ] });
};
var AgentCreateModeCards = ({ selected, busy, onSelect }) => {
  const { t: t2 } = useTranslation("ai");
  return /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
    "div",
    {
      className: "agent-create-source-step__cards",
      role: "radiogroup",
      "aria-label": t2("createAgent.runMode.heading", "\u8FD0\u884C\u65B9\u5F0F"),
      children: CARD_DEFS.map((card) => {
        const isActive = selected === card.id;
        return /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
          "button",
          {
            type: "button",
            role: "radio",
            "aria-checked": isActive,
            disabled: busy,
            className: `agent-create-source-card${isActive ? " is-active" : ""}`,
            onClick: () => onSelect(card.id),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: "agent-create-source-card__top", children: [
                /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { className: "agent-create-source-card__title", children: t2(card.titleKey, card.titleDefault) }),
                card.recommended ? /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { className: "agent-create-source-card__badge", children: t2("createAgent.runMode.recommended", "\u63A8\u8350") }) : null
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("p", { className: "agent-create-source-card__desc", children: t2(card.descKey, card.descDefault) }),
              /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("p", { className: "agent-create-source-card__footnote", children: t2(card.footnoteKey, card.footnoteDefault) })
            ]
          },
          card.id
        );
      })
    }
  );
};
var AgentCreateSourceActionRow = ({ busy, isSubmitting, canCreate, onAdvancedEdit, onCreate }) => {
  const { t: t2 } = useTranslation("ai");
  return /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: "agent-create-source-panel__actions", children: [
    /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
      Button_default,
      {
        type: "button",
        variant: "ghost",
        size: "medium",
        disabled: busy,
        onClick: onAdvancedEdit,
        children: t2("createAgent.quickCreate.advancedEdit", "\u9AD8\u7EA7\u7F16\u8F91")
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
      Button_default,
      {
        type: "button",
        variant: "primary",
        size: "medium",
        loading: isSubmitting,
        disabled: busy || !canCreate,
        onClick: onCreate,
        children: t2("create", "\u521B\u5EFA")
      }
    )
  ] });
};
var AgentCreatePlatformPanel = ({
  prompt,
  setPrompt,
  platformModel,
  setPlatformModel,
  platformModelOptions,
  busy,
  isSubmitting,
  canCreate,
  onAdvancedEdit,
  onCreate
}) => {
  const { t: t2 } = useTranslation("ai");
  return /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: "agent-create-source-panel", "data-mode": "platform", children: [
    /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("label", { className: "agent-create-source-field", children: [
      /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { className: "agent-create-source-field__label", children: t2("createAgent.quickCreate.prompt", "\u7CFB\u7EDF\u63D0\u793A\u8BCD") }),
      /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
        "textarea",
        {
          className: "agent-create-source-field__textarea",
          value: prompt,
          disabled: busy,
          rows: 6,
          placeholder: t2(
            "createAgent.quickCreate.promptPlaceholder",
            "\u5B9A\u4E49 AI \u7684\u884C\u4E3A\u3001\u89D2\u8272\u548C\u4E2A\u6027\u2026"
          ),
          onChange: (e) => setPrompt(e.target.value)
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { className: "agent-create-source-field", children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
      Select,
      {
        className: "agent-create-source-select",
        label: t2("createAgent.quickCreate.modelLabel", "\u6A21\u578B"),
        selectedKey: platformModel,
        isDisabled: busy,
        placeholder: t2("createAgent.quickCreate.modelPlaceholder", "\u9009\u62E9\u6A21\u578B"),
        onSelectionChange: (key) => setPlatformModel(
          key != null ? String(key) : PLATFORM_QUICK_CREATE_MODEL.name
        ),
        description: t2(
          "createAgent.quickCreate.platformModelHint",
          "\u5E73\u53F0\u6A21\u578B \xB7 \u9ED8\u8BA4 GLM 5.2\uFF0C\u53EF\u66F4\u6362"
        ),
        children: platformModelOptions.map((m) => /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(SelectItem, { id: m.value, textValue: m.label, children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(ModelOptionLabel, { label: m.label, hasVision: m.hasVision }) }, m.value))
      }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
      AgentCreateSourceActionRow,
      {
        busy,
        isSubmitting,
        canCreate,
        onAdvancedEdit,
        onCreate
      }
    )
  ] });
};
var CredentialSyncCheckbox = ({ show, checked, onChange, busy }) => {
  const { t: t2 } = useTranslation("ai");
  if (!show) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
    Checkbox,
    {
      label: t2("form.crossDeviceKey", "\u8DE8\u8BBE\u5907\u4F7F\u7528\u6B64\u5BC6\u94A5"),
      checked,
      disabled: busy,
      onChange: (e) => onChange(e.target.checked)
    }
  );
};
var AgentCreateApiPanel = ({
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
  onCreate
}) => {
  const { t: t2 } = useTranslation("ai");
  return /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: "agent-create-source-panel", "data-mode": "api", children: [
    /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { className: "agent-create-source-field", children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
      Select,
      {
        className: "agent-create-source-select",
        label: t2("form.provider", "Provider \u6A21\u677F"),
        selectedKey: apiPresetId,
        isDisabled: busy,
        placeholder: t2(
          "createAgent.quickCreate.providerPlaceholder",
          "\u9009\u62E9 Provider"
        ),
        onSelectionChange: (key) => {
          if (key != null) applyApiPreset(String(key));
        },
        children: meteredPresetOptions.map((p) => /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(SelectItem, { id: p.value, textValue: p.label, children: p.label }, p.value))
      }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("label", { className: "agent-create-source-field", children: [
      /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { className: "agent-create-source-field__label", children: t2("form.customProviderUrl", "\u670D\u52A1\u5546 URL") }),
      /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
        "input",
        {
          type: "url",
          className: "agent-create-source-field__input",
          value: customProviderUrl,
          disabled: busy,
          readOnly: apiPresetId !== MANUAL_PROVIDER_PRESET_ID && !!activePresetFields.lockCustomProviderUrl,
          placeholder: "https://api.openai.com/v1",
          onChange: (e) => setCustomProviderUrl(e.target.value),
          autoComplete: "off"
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("label", { className: "agent-create-source-field", children: [
      /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { className: "agent-create-source-field__label", children: t2("form.apiKey", "API \u5BC6\u94A5") }),
      /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
        PasswordInput,
        {
          value: apiKey,
          disabled: busy,
          placeholder: "sk-\u2026",
          onChange: (e) => setApiKey(e.target.value),
          autoComplete: "off"
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
      CredentialSyncCheckbox,
      {
        show: showCredentialSync,
        checked: credentialSynced,
        onChange: setCredentialSynced,
        busy
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("label", { className: "agent-create-source-field", children: [
      /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { className: "agent-create-source-field__label", children: t2("form.model", "\u6A21\u578B") }),
      activePresetFields.modelOptions.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
        Select,
        {
          className: "agent-create-source-select",
          label: t2("form.model", "\u6A21\u578B"),
          selectedKey: model,
          isDisabled: busy,
          onSelectionChange: (key) => setModel(String(key ?? "")),
          children: [
            model && !activePresetFields.modelOptions.some((m) => m.id === model) ? /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(SelectItem, { id: model, textValue: model, children: model }) : null,
            activePresetFields.modelOptions.map((m) => {
              const label = `${m.label}${m.recommended ? "\uFF08\u63A8\u8350\uFF09" : ""}`;
              return /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(SelectItem, { id: m.id, textValue: label, children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(ModelOptionLabel, { label, hasVision: m.hasVision }) }, m.id);
            })
          ]
        }
      ) : /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
        "input",
        {
          type: "text",
          className: "agent-create-source-field__input",
          value: model,
          disabled: busy,
          placeholder: "gpt-5.6-sol",
          onChange: (e) => setModel(e.target.value),
          autoComplete: "off"
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("label", { className: "agent-create-source-field", children: [
      /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { className: "agent-create-source-field__label", children: t2("createAgent.quickCreate.reasoningEffort", "\u63A8\u7406\u5F3A\u5EA6") }),
      (() => {
        const available = getAvailableReasoningEfforts(activePresetFields.provider);
        if (available.length === 0) {
          return /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { className: "agent-create-source-field__hint", children: activePresetFields.provider === "anthropic" || activePresetFields.provider === "google" || activePresetFields.provider === "qwen" ? "\u6B64\u670D\u52A1\u5546\u4F7F\u7528 Thinking \u673A\u5236\uFF0C\u65E0\u9700\u8BBE\u7F6E\u63A8\u7406\u5F3A\u5EA6" : activePresetFields.provider === "cursor" ? "Cursor \u63A8\u7406\u5F3A\u5EA6\u7531\u6A21\u578B\u540D\u79F0\u540E\u7F00\u51B3\u5B9A\uFF08\u5982 -high\uFF09" : "\u6B64\u670D\u52A1\u5546\u4E0D\u652F\u6301\u63A8\u7406\u5F3A\u5EA6\u8BBE\u7F6E" });
        }
        return /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
          Select,
          {
            className: "agent-create-source-select",
            label: t2("createAgent.quickCreate.reasoningEffort", "\u63A8\u7406\u5F3A\u5EA6"),
            selectedKey: reasoningEffort,
            isDisabled: busy,
            onSelectionChange: (key) => {
              const v = String(key ?? "medium");
              setReasoningEffort(v);
            },
            children: getReasoningEffortSelectOptions(t2).filter((o) => available.includes(o.id)).map((o) => /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(SelectItem, { id: o.id, textValue: o.label, children: o.label }, o.id))
          }
        );
      })()
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("label", { className: "agent-create-source-field", children: [
      /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { className: "agent-create-source-field__label", children: t2("createAgent.quickCreate.prompt", "\u7CFB\u7EDF\u63D0\u793A\u8BCD") }),
      /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
        "textarea",
        {
          className: "agent-create-source-field__textarea",
          value: prompt,
          disabled: busy,
          rows: 4,
          placeholder: t2(
            "createAgent.quickCreate.promptPlaceholder",
            "\u5B9A\u4E49 AI \u7684\u884C\u4E3A\u3001\u89D2\u8272\u548C\u4E2A\u6027\u2026"
          ),
          onChange: (e) => setPrompt(e.target.value)
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
      AgentCreateSourceActionRow,
      {
        busy,
        isSubmitting,
        canCreate,
        onAdvancedEdit,
        onCreate
      }
    )
  ] });
};
var AgentCreateSubscriptionPanel = ({
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
  onCreate
}) => {
  const { t: t2 } = useTranslation("ai");
  return /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: "agent-create-source-panel", "data-mode": "subscription", children: [
    /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { className: "agent-create-source-field", children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
      Select,
      {
        className: "agent-create-source-select",
        label: t2("createAgent.quickCreate.subscriptionBrand", "\u8BA2\u9605 / \u65B9\u6848"),
        selectedKey: subPresetId,
        isDisabled: busy,
        placeholder: t2(
          "createAgent.quickCreate.subscriptionPlaceholder",
          "\u9009\u62E9\u8BA2\u9605\u65B9\u6848"
        ),
        onSelectionChange: (key) => {
          if (key != null) applySubPreset(String(key));
        },
        children: subscriptionPresetOptions.map((p) => /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(SelectItem, { id: p.value, textValue: p.label, children: p.label }, p.value))
      }
    ) }),
    draftRequiresDesktopOAuth ? /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(import_jsx_runtime18.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("p", { className: "agent-create-source-panel__desktop-title", children: oauth.connection.kind === "connected" ? t2("createAgent.quickCreate.oauthConnected", "OAuth \u5DF2\u8FDE\u63A5") : oauth.isDesktop ? t2("createAgent.quickCreate.oauthDesktopTitle", "\u5728 Nolo Desktop \u767B\u5F55\u8BA2\u9605\u8D26\u53F7") : t2("createAgent.quickCreate.subscriptionDesktopTitle", "\u8BE5\u8BA2\u9605\u9700\u5728\u684C\u9762\u7AEF\u5B8C\u6210 OAuth \u767B\u5F55") }),
      /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("p", { className: "agent-create-source-panel__desktop-body", children: oauth.connection.kind === "connected" ? t2(
        "createAgent.quickCreate.oauthConnectedAs",
        "\u5DF2\u8FDE\u63A5\u8D26\u53F7\uFF1A{{account}}\u3002\u51ED\u636E\u4FDD\u5B58\u5728\u672C\u673A\uFF0C\u4E0D\u4F1A\u4F20\u7ED9\u9875\u9762\u3002",
        {
          account: oauth.connection.email || oauth.connection.accountId || subPresetId
        }
      ) : oauth.connection.kind === "connecting" ? t2("createAgent.quickCreate.oauthWaiting", "\u6D4F\u89C8\u5668\u5DF2\u6253\u5F00\uFF0C\u5B8C\u6210\u6388\u6743\u540E\u6B64\u5904\u4F1A\u81EA\u52A8\u66F4\u65B0\u3002") : oauth.isDesktop ? t2("createAgent.quickCreate.oauthDesktopBody", "\u70B9\u51FB\u767B\u5F55\u540E\u4F1A\u6253\u5F00\u7CFB\u7EDF\u6D4F\u89C8\u5668\uFF1B\u6388\u6743\u51ED\u636E\u7531\u684C\u9762\u7AEF\u5B89\u5168\u4FDD\u5B58\u3002") : t2(
        "createAgent.quickCreate.subscriptionDesktopBody",
        "\u8BF7\u5728 Nolo Desktop \u5B8C\u6210 OAuth \u767B\u5F55\u540E\u521B\u5EFA\u548C\u4F7F\u7528\u8BE5\u8BA2\u9605 Agent\u3002"
      ) }),
      oauth.connection.kind === "error" ? /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("p", { className: "agent-create-source-panel__desktop-body", role: "alert", children: oauth.connection.message }) : null,
      oauth.connection.kind === "connected" ? /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(import_jsx_runtime18.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { className: "agent-create-source-field", children: /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
          Select,
          {
            className: "agent-create-source-select",
            label: t2("form.model", "\u6A21\u578B"),
            selectedKey: subModel,
            isDisabled: busy,
            onSelectionChange: (key) => setSubModel(String(key ?? "")),
            description: t2(
              "createAgent.quickCreate.recommendedModelHint",
              "\u5DF2\u6309\u5F53\u524D\u8BA2\u9605\u63A8\u8350\u6700\u65B0\u6A21\u578B\uFF0C\u53EF\u968F\u65F6\u66F4\u6362"
            ),
            children: [
              subModel && !activePresetFields.modelOptions.some((model) => model.id === subModel) ? /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(SelectItem, { id: subModel, textValue: subModel, children: subModel }) : null,
              activePresetFields.modelOptions.map((model) => {
                const label = `${model.label}${model.recommended ? "\uFF08\u63A8\u8350\uFF09" : ""}`;
                return /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(SelectItem, { id: model.id, textValue: label, children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(ModelOptionLabel, { label, hasVision: model.hasVision }) }, model.id);
              })
            ]
          }
        ) }),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("label", { className: "agent-create-source-field", children: [
          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { className: "agent-create-source-field__label", children: t2("createAgent.quickCreate.reasoningEffort", "\u63A8\u7406\u5F3A\u5EA6") }),
          (() => {
            const available = getAvailableReasoningEfforts(activePresetFields.provider);
            if (available.length === 0) {
              return /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { className: "agent-create-source-field__hint", children: activePresetFields.provider === "anthropic" || activePresetFields.provider === "google" || activePresetFields.provider === "qwen" ? "\u6B64\u670D\u52A1\u5546\u4F7F\u7528 Thinking \u673A\u5236\uFF0C\u65E0\u9700\u8BBE\u7F6E\u63A8\u7406\u5F3A\u5EA6" : activePresetFields.provider === "cursor" ? "Cursor \u63A8\u7406\u5F3A\u5EA6\u7531\u6A21\u578B\u540D\u79F0\u540E\u7F00\u51B3\u5B9A\uFF08\u5982 -high\uFF09" : "\u6B64\u670D\u52A1\u5546\u4E0D\u652F\u6301\u63A8\u7406\u5F3A\u5EA6\u8BBE\u7F6E" });
            }
            return /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
              Select,
              {
                className: "agent-create-source-select",
                label: t2("createAgent.quickCreate.reasoningEffort", "\u63A8\u7406\u5F3A\u5EA6"),
                selectedKey: reasoningEffort,
                isDisabled: busy,
                onSelectionChange: (key) => {
                  const v = String(key ?? "medium");
                  setReasoningEffort(v);
                },
                children: getReasoningEffortSelectOptions(t2).filter((o) => available.includes(o.id)).map((o) => /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(SelectItem, { id: o.id, textValue: o.label, children: o.label }, o.id))
              }
            );
          })()
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("label", { className: "agent-create-source-field", children: [
          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { className: "agent-create-source-field__label", children: t2("createAgent.quickCreate.prompt", "\u7CFB\u7EDF\u63D0\u793A\u8BCD") }),
          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
            "textarea",
            {
              className: "agent-create-source-field__textarea",
              value: prompt,
              disabled: busy,
              rows: 4,
              placeholder: t2("createAgent.quickCreate.promptPlaceholder", "\u5B9A\u4E49 AI \u7684\u884C\u4E3A\u3001\u89D2\u8272\u548C\u4E2A\u6027\u2026"),
              onChange: (e) => setPrompt(e.target.value)
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
          AgentCreateSourceActionRow,
          {
            busy,
            isSubmitting,
            canCreate,
            onAdvancedEdit,
            onCreate
          }
        )
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: "agent-create-source-panel__actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
          Button_default,
          {
            type: "button",
            variant: "primary",
            size: "medium",
            loading: oauth.connection.kind === "connecting",
            disabled: oauth.connection.kind === "loading" || oauth.connection.kind === "connecting",
            onClick: () => {
              if (oauth.isDesktop) void oauth.startLogin();
              else navigate("/downloads");
            },
            children: oauth.isDesktop ? t2("createAgent.quickCreate.signInOAuth", "\u767B\u5F55\u8BA2\u9605\u8D26\u53F7") : t2("createAgent.quickCreate.openDesktop", "\u6253\u5F00\u6216\u4E0B\u8F7D Nolo Desktop")
          }
        ),
        oauth.connection.kind === "error" ? /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(Button_default, { type: "button", variant: "ghost", size: "medium", onClick: () => void oauth.refresh(), children: t2("retry", "\u91CD\u8BD5") }) : null
      ] })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(import_jsx_runtime18.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("label", { className: "agent-create-source-field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { className: "agent-create-source-field__label", children: t2("form.customProviderUrl", "\u670D\u52A1\u5546 URL") }),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
          "input",
          {
            type: "url",
            className: "agent-create-source-field__input",
            value: subCustomProviderUrl,
            disabled: busy,
            readOnly: !!activePresetFields.lockCustomProviderUrl,
            onChange: (e) => setSubCustomProviderUrl(e.target.value),
            autoComplete: "off"
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("label", { className: "agent-create-source-field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { className: "agent-create-source-field__label", children: t2("form.apiKey", "API \u5BC6\u94A5") }),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
          PasswordInput,
          {
            value: subApiKey,
            disabled: busy,
            placeholder: "sk-\u2026",
            onChange: (e) => setSubApiKey(e.target.value),
            autoComplete: "off"
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
        CredentialSyncCheckbox,
        {
          show: showCredentialSync,
          checked: credentialSynced,
          onChange: setCredentialSynced,
          busy
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("label", { className: "agent-create-source-field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { className: "agent-create-source-field__label", children: t2("form.model", "\u6A21\u578B") }),
        activePresetFields.modelOptions.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
          Select,
          {
            className: "agent-create-source-select",
            label: t2("form.model", "\u6A21\u578B"),
            selectedKey: subModel,
            isDisabled: busy,
            onSelectionChange: (key) => setSubModel(String(key ?? "")),
            description: t2(
              "createAgent.quickCreate.recommendedModelHint",
              "\u5DF2\u6309\u5F53\u524D\u8BA2\u9605\u63A8\u8350\u6700\u65B0\u6A21\u578B\uFF0C\u53EF\u968F\u65F6\u66F4\u6362"
            ),
            children: [
              subModel && !activePresetFields.modelOptions.some((m) => m.id === subModel) ? /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(SelectItem, { id: subModel, textValue: subModel, children: subModel }) : null,
              activePresetFields.modelOptions.map((m) => {
                const label = `${m.label}${m.recommended ? "\uFF08\u63A8\u8350\uFF09" : ""}`;
                return /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(SelectItem, { id: m.id, textValue: label, children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(ModelOptionLabel, { label, hasVision: m.hasVision }) }, m.id);
              })
            ]
          }
        ) : /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
          "input",
          {
            type: "text",
            className: "agent-create-source-field__input",
            value: subModel,
            disabled: busy,
            onChange: (e) => setSubModel(e.target.value),
            autoComplete: "off"
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("label", { className: "agent-create-source-field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { className: "agent-create-source-field__label", children: t2("createAgent.quickCreate.reasoningEffort", "\u63A8\u7406\u5F3A\u5EA6") }),
        (() => {
          const availableEfforts = getAvailableReasoningEfforts(activePresetFields.provider);
          if (availableEfforts.length === 0) {
            return /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { className: "agent-create-source-field__hint", children: activePresetFields.provider === "anthropic" || activePresetFields.provider === "google" || activePresetFields.provider === "qwen" ? "\u6B64\u670D\u52A1\u5546\u4F7F\u7528 Thinking \u673A\u5236\uFF0C\u65E0\u9700\u8BBE\u7F6E\u63A8\u7406\u5F3A\u5EA6" : activePresetFields.provider === "cursor" ? "Cursor \u63A8\u7406\u5F3A\u5EA6\u7531\u6A21\u578B\u540D\u79F0\u540E\u7F00\u51B3\u5B9A\uFF08\u5982 -high\uFF09" : "\u6B64\u670D\u52A1\u5546\u4E0D\u652F\u6301\u63A8\u7406\u5F3A\u5EA6\u8BBE\u7F6E" });
          }
          return /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
            Select,
            {
              className: "agent-create-source-select",
              label: t2("createAgent.quickCreate.reasoningEffort", "\u63A8\u7406\u5F3A\u5EA6"),
              selectedKey: reasoningEffort,
              isDisabled: busy,
              onSelectionChange: (key) => {
                const v = String(key ?? "medium");
                setReasoningEffort(v);
              },
              children: getReasoningEffortSelectOptions(t2).filter((o) => availableEfforts.includes(o.id)).map((o) => /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(SelectItem, { id: o.id, textValue: o.label, children: o.label }, o.id))
            }
          );
        })()
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("label", { className: "agent-create-source-field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { className: "agent-create-source-field__label", children: t2("createAgent.quickCreate.prompt", "\u7CFB\u7EDF\u63D0\u793A\u8BCD") }),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
          "textarea",
          {
            className: "agent-create-source-field__textarea",
            value: prompt,
            disabled: busy,
            rows: 4,
            placeholder: t2(
              "createAgent.quickCreate.promptPlaceholder",
              "\u5B9A\u4E49 AI \u7684\u884C\u4E3A\u3001\u89D2\u8272\u548C\u4E2A\u6027\u2026"
            ),
            onChange: (e) => setPrompt(e.target.value)
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
        AgentCreateSourceActionRow,
        {
          busy,
          isSubmitting,
          canCreate,
          onAdvancedEdit,
          onCreate
        }
      )
    ] })
  ] });
};
var AgentCreateCliPanel = ({
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
  onCreate
}) => {
  const { t: t2 } = useTranslation("ai");
  return /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: "agent-create-source-panel", "data-mode": "cli", children: [
    /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { className: "agent-create-source-field", children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
      Select,
      {
        className: "agent-create-source-select",
        label: t2("createAgent.quickCreate.cliProvider", "CLI \u5DE5\u5177"),
        selectedKey: cliProvider,
        isDisabled: busy,
        onSelectionChange: (key) => setCliProvider(String(key ?? "")),
        children: cliProviderOptions.map((opt) => /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(SelectItem, { id: opt.value, textValue: opt.label, children: opt.label }, opt.value))
      }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: "agent-create-source-field", children: [
      /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(
        Select,
        {
          className: "agent-create-source-select",
          label: t2("createAgent.quickCreate.runLocation", "\u8FD0\u884C\u4F4D\u7F6E"),
          selectedKey: cliMachineId,
          isDisabled: busy,
          onSelectionChange: (key) => setCliMachineId(String(key ?? "")),
          description: t2(
            "createAgent.quickCreate.cliMachineHint",
            "\u7559\u7A7A\u4F7F\u7528\u672C\u5730/\u670D\u52A1\u5668\u9ED8\u8BA4 CLI \u73AF\u5883\uFF1B\u9009\u62E9\u7535\u8111\u540E\u901A\u8FC7\u8BE5\u7535\u8111\u8FD0\u884C"
          ),
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(SelectItem, { id: "", textValue: t2("createAgent.quickCreate.cliDefaultMachine", "\u9ED8\u8BA4\u73AF\u5883\uFF08\u4E0D\u7ED1\u5B9A\u7535\u8111\uFF09"), children: t2("createAgent.quickCreate.cliDefaultMachine", "\u9ED8\u8BA4\u73AF\u5883\uFF08\u4E0D\u7ED1\u5B9A\u7535\u8111\uFF09") }),
            cliMachineOptions.map((machine) => {
              const label = machine.platform && machine.arch ? `${machine.name} (${machine.platform}/${machine.arch})` : `${machine.name} (${machine.machineId})`;
              return /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(SelectItem, { id: machine.machineId, textValue: label, children: label }, machine.machineId);
            })
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("p", { className: "agent-create-source-field__hint", children: cliMachinesError ? cliMachinesError : cliMachineOptions.length === 0 ? t2(
        "createAgent.quickCreate.cliNoMachine",
        "\u6CA1\u6709\u68C0\u6D4B\u5230\u652F\u6301\u5F53\u524D CLI \u7684\u5728\u7EBF\u7535\u8111\u3002\u53EF\u5148\u5230\u8BBE\u7F6E-\u7535\u8111\u8FDE\u63A5\uFF0C\u6216\u4F7F\u7528\u9ED8\u8BA4 CLI \u73AF\u5883\u3002"
      ) : t2(
        "createAgent.quickCreate.cliMachineSelectedHint",
        "\u9009\u62E9\u7535\u8111\u540E\uFF0C\u8FD9\u4E2A Agent \u4F1A\u901A\u8FC7\u90A3\u53F0\u7535\u8111\u4E0A\u7684 CLI \u6267\u884C\u3002"
      ) }),
      !cliLoggedIn ? /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
        "button",
        {
          type: "button",
          className: "agent-create-source-step__more-link",
          onClick: () => navigate("/downloads"),
          children: t2("createAgent.quickCreate.openDownloads", "\u6253\u5F00\u684C\u9762\u7AEF\u4E0B\u8F7D")
        }
      ) : null
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("label", { className: "agent-create-source-field", children: [
      /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { className: "agent-create-source-field__label", children: t2("createAgent.quickCreate.prompt", "\u7CFB\u7EDF\u63D0\u793A\u8BCD") }),
      /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
        "textarea",
        {
          className: "agent-create-source-field__textarea",
          value: prompt,
          disabled: busy,
          rows: 4,
          placeholder: t2("createAgent.quickCreate.promptPlaceholder", "\u5B9A\u4E49 AI \u7684\u884C\u4E3A\u3001\u89D2\u8272\u548C\u4E2A\u6027\u2026"),
          onChange: (e) => setPrompt(e.target.value)
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
      AgentCreateSourceActionRow,
      {
        busy,
        isSubmitting,
        canCreate,
        onAdvancedEdit,
        onCreate
      }
    )
  ] });
};
var AgentCreateSourceStep = ({
  selected,
  onSelect,
  onAdvancedEdit,
  onQuickCreate,
  isSubmitting = false,
  disabled = false
}) => {
  const { t: t2 } = useTranslation("ai");
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
    cliProviderOptions
  } = useAgentCreateSourceState({
    selected,
    onAdvancedEdit,
    onQuickCreate,
    isSubmitting,
    disabled
  });
  const loggedInUserId = useUserId();
  const isLoggedIn = useIsLoggedIn();
  const showCredentialSync = isLoggedIn && !!loggedInUserId && loggedInUserId !== "local";
  return /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: "agent-create-source-step", children: [
    /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(AgentCreateIntro, {}),
    /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(AgentCreateModeCards, { selected, busy, onSelect }),
    selected === "platform" ? /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
      AgentCreatePlatformPanel,
      {
        prompt,
        setPrompt,
        platformModel,
        setPlatformModel,
        platformModelOptions,
        busy,
        isSubmitting,
        canCreate: canCreatePlatform,
        onAdvancedEdit: handleAdvanced,
        onCreate: handleCreate
      }
    ) : null,
    selected === "api" ? /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
      AgentCreateApiPanel,
      {
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
        reasoningEffort: apiReasoningEffort,
        setReasoningEffort: setApiReasoningEffort,
        busy,
        isSubmitting,
        canCreate: canCreateApi,
        onAdvancedEdit: handleAdvanced,
        onCreate: handleCreate
      }
    ) : null,
    selected === "subscription" ? /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
      AgentCreateSubscriptionPanel,
      {
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
        showCredentialSync,
        subModel,
        setSubModel,
        activePresetFields,
        reasoningEffort: subReasoningEffort,
        setReasoningEffort: setSubReasoningEffort,
        draftRequiresDesktopOAuth: draft.requiresDesktopOAuth,
        oauth,
        navigate,
        busy,
        isSubmitting,
        canCreate: canCreateSubscription,
        onAdvancedEdit: handleAdvanced,
        onCreate: handleCreate
      }
    ) : null,
    selected === "cli" ? /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
      AgentCreateCliPanel,
      {
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
        canCreate: canCreateCli,
        onAdvancedEdit: handleAdvanced,
        onCreate: handleCreate
      }
    ) : null,
    /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("details", { className: "agent-create-source-step__more", children: [
      /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("summary", { children: t2("createAgent.runMode.more", "\u66F4\u591A") }),
      /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className: "agent-create-source-step__more-body", children: [
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("p", { children: t2(
          "createAgent.quickCreate.cliDesktopBody",
          "\u672C\u673A CLI\uFF08Claude Code\u3001Codex\u3001Gemini CLI \u7B49\uFF09\u8BF7\u5728\u684C\u9762\u7AEF\u7ED1\u5B9A\u540E\u4F7F\u7528\u3002"
        ) }),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
          "button",
          {
            type: "button",
            className: "agent-create-source-step__more-link",
            onClick: () => navigate("/downloads"),
            children: t2("createAgent.quickCreate.openDownloads", "\u6253\u5F00\u684C\u9762\u7AEF\u4E0B\u8F7D")
          }
        )
      ] })
    ] })
  ] });
};
var AgentCreateSourceStep_default = AgentCreateSourceStep;

// packages/ai/agent/web/agentFormActions.ts
var ADVANCED_FIELD_NAMES = [
  "temperature",
  "top_p",
  "max_tokens",
  "frequency_penalty",
  "presence_penalty",
  "reasoning_effort"
];
function buildSubmitPayload(data, {
  isCreate,
  dirtyFields,
  advancedFieldNames = ADVANCED_FIELD_NAMES
}) {
  const cloned = { ...data };
  cloned.tags = "";
  advancedFieldNames.forEach((field) => {
    const isDirty = dirtyFields?.[field];
    const value = cloned[field];
    if (!isDirty) {
      delete cloned[field];
      return;
    }
    if (isCreate && (value === null || value === void 0)) {
      delete cloned[field];
      return;
    }
    if (!isCreate && value === void 0) {
      delete cloned[field];
    }
  });
  return cloned;
}
function handleAdvancedEdit({
  draft,
  getValues,
  setValue,
  setApiSource,
  setCommittedCreateSource,
  setCreateSourceCommitted,
  setActiveTabState,
  platformQuickCreateModel
}) {
  if (draft.requiresDesktopOAuth && !draft.oauthConnected) return;
  const name = draft.name.trim() || (typeof getValues("name") === "string" ? String(getValues("name")) : "") || "\u65B0 AI";
  if (draft.mode === "platform") {
    setApiSource("platform");
    setValue("apiSource", "platform", { shouldValidate: true });
    setValue("useServerProxy", true, { shouldValidate: true });
    setValue("provider", draft.provider || platformQuickCreateModel.provider, {
      shouldValidate: true
    });
    setValue("model", draft.model || platformQuickCreateModel.name, {
      shouldValidate: true
    });
    setValue("customProviderUrl", "", { shouldValidate: true });
    setValue("apiKey", "", { shouldValidate: true });
    setValue("apiKeyRef", "", { shouldValidate: true });
    setValue("apiKeyHeader", "", { shouldValidate: true });
    setValue("cliProvider", "", { shouldValidate: true });
    setValue("machineId", "", { shouldValidate: true });
  } else if (draft.mode === "cli") {
    setApiSource("cli");
    setValue("apiSource", "cli", { shouldValidate: true });
    setValue("useServerProxy", false, { shouldValidate: true });
    setValue("provider", "", { shouldValidate: true });
    setValue("model", "", { shouldValidate: true });
    setValue("customProviderUrl", "", { shouldValidate: true });
    setValue("apiKey", "", { shouldValidate: true });
    setValue("apiKeyRef", "", { shouldValidate: true });
    setValue("apiKeyHeader", "", { shouldValidate: true });
    setValue("cliProvider", draft.cliProvider || "", { shouldValidate: true });
    setValue("machineId", draft.machineId || "", { shouldValidate: true });
  } else {
    setApiSource("custom");
    setValue("apiSource", "custom", { shouldValidate: true });
    setValue("useServerProxy", false, { shouldValidate: true });
    setValue("provider", draft.provider || "custom", { shouldValidate: true });
    setValue("model", draft.model.trim(), { shouldValidate: true });
    setValue("customProviderUrl", draft.customProviderUrl.trim(), {
      shouldValidate: true
    });
    setValue("apiKey", draft.apiKey.trim(), { shouldValidate: true });
    setValue("apiKeyRef", draft.apiKeyRef || "", { shouldValidate: true });
    setValue("apiKeyHeader", draft.apiKeyHeader || "", { shouldValidate: true });
    setValue("cliProvider", "", { shouldValidate: true });
    setValue("machineId", "", { shouldValidate: true });
  }
  setValue("hasVision", draft.hasVision, { shouldValidate: true });
  setValue("reasoning_effort", draft.reasoningEffort, {
    shouldValidate: true,
    shouldDirty: true
  });
  setValue("name", name.slice(0, 50), { shouldValidate: true });
  setValue("prompt", draft.prompt.trim(), { shouldValidate: true });
  setCommittedCreateSource(draft.mode);
  setCreateSourceCommitted(true);
  setActiveTabState(0);
}
async function handleQuickCreate({
  draft,
  onSubmit,
  t: t2,
  setIsQuickCreating,
  platformQuickCreateModel,
  onPushCredential
}) {
  if (draft.requiresDesktopOAuth && !draft.oauthConnected) {
    toast.error(
      t2(
        "createAgent.quickCreate.desktopOnly",
        "\u8BE5\u8BA2\u9605\u8BF7\u5728\u684C\u9762\u7AEF\u5B8C\u6210 OAuth \u540E\u518D\u521B\u5EFA"
      )
    );
    return;
  }
  const name = draft.name.trim().slice(0, 50) || "\u65B0 AI";
  const prompt = draft.prompt.trim();
  const base = {
    name,
    prompt,
    isPublic: false,
    tools: [],
    references: [],
    whitelist: [],
    tags: "",
    greeting: t2("form.defaults.greeting"),
    defaultInteractionMode: "text",
    hasVision: draft.hasVision,
    inputPrice: 0,
    outputPrice: 0,
    enableThinking: false,
    // 推理强度：快速创建面板的可选值，platform 走 schema 默认 medium，
    // subscription/api 走 draft（订阅按 preset 差异化，api 走 medium）。
    reasoning_effort: draft.reasoningEffort,
    cliProvider: "",
    machineId: ""
  };
  const formData = draft.mode === "platform" ? {
    ...base,
    apiSource: "platform",
    provider: draft.provider || platformQuickCreateModel.provider,
    model: draft.model || platformQuickCreateModel.name,
    useServerProxy: true,
    customProviderUrl: "",
    apiKey: "",
    apiKeyRef: "",
    apiKeyHeader: ""
  } : draft.mode === "cli" ? {
    ...base,
    apiSource: "cli",
    provider: "",
    model: "",
    useServerProxy: false,
    customProviderUrl: "",
    apiKey: "",
    apiKeyRef: "",
    apiKeyHeader: "",
    cliProvider: draft.cliProvider,
    machineId: draft.machineId
  } : {
    ...base,
    apiSource: "custom",
    provider: draft.provider || "custom",
    model: draft.model.trim() || "gpt-5.6-sol",
    useServerProxy: false,
    customProviderUrl: draft.customProviderUrl.trim(),
    apiKey: draft.apiKey.trim(),
    apiKeyRef: draft.apiKeyRef || "",
    apiKeyHeader: draft.apiKeyHeader || "",
    credentialSynced: draft.credentialSynced
  };
  formData.defaultInteractionMode = isVoiceModel(formData.model, formData.provider) ? "live_audio" : "text";
  if (draft.mode === "api" && !formData.customProviderUrl && !formData.apiKeyRef) {
    toast.error(t2("validation.invalidUrl", "\u8BF7\u586B\u5199\u6709\u6548\u7684\u670D\u52A1\u5546 URL"));
    return;
  }
  setIsQuickCreating(true);
  try {
    const created = await onSubmit(formData);
  } catch (err) {
    console.error("Quick create agent failed:", err);
    toast.error(t2("createAgent.quickCreate.failed", "\u521B\u5EFA\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5"));
  } finally {
    setIsQuickCreating(false);
  }
}

// packages/create/version/VersionHistoryPanel.tsx
var import_react17 = __toESM(require_react(), 1);
var import_jsx_runtime19 = __toESM(require_jsx_runtime(), 1);
function timeAgo(iso, t2) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 6e4);
  if (mins < 1) return t2("version.justNow", { defaultValue: "just now" });
  if (mins < 60)
    return t2("version.minsAgo", { count: mins, defaultValue: `${mins}m ago` });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)
    return t2("version.hrsAgo", { count: hrs, defaultValue: `${hrs}h ago` });
  const days = Math.floor(hrs / 24);
  return t2("version.daysAgo", { count: days, defaultValue: `${days}d ago` });
}
function VersionHistoryPanel({
  type,
  entityId,
  sourceServerOrigin,
  onRestore,
  onClose
}) {
  const { t: t2 } = useTranslation();
  const { currentServer: server, currentToken: token } = useAppSelector(selectRuntimeSnapshot);
  const [versions, setVersions] = (0, import_react17.useState)([]);
  const [loading, setLoading] = (0, import_react17.useState)(true);
  const [editingId, setEditingId] = (0, import_react17.useState)(null);
  const [editLabel, setEditLabel] = (0, import_react17.useState)("");
  const [restoring, setRestoring] = (0, import_react17.useState)(null);
  const [deleting, setDeleting] = (0, import_react17.useState)(null);
  const fetchVersions = (0, import_react17.useCallback)(async () => {
    setLoading(true);
    try {
      if (type === "app") {
        const data = await fetchAppVersionsCurrentServerFirst({
          currentServer: server,
          sourceServer: sourceServerOrigin,
          token,
          appId: entityId
        });
        setVersions(data);
        return;
      }
      const request = buildVersionListRequest(server, token, type, entityId);
      const res = await fetch(request.url, request.init);
      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [entityId, server, sourceServerOrigin, token, type]);
  const ensureLocalVersion = (0, import_react17.useCallback)(
    async (versionId) => {
      if (type !== "app" || !sourceServerOrigin) return true;
      return ensureSpecificAppVersionLocal({
        currentServer: server,
        sourceServer: sourceServerOrigin,
        token,
        appId: entityId,
        versionId
      });
    },
    [entityId, server, sourceServerOrigin, token, type]
  );
  (0, import_react17.useEffect)(() => {
    fetchVersions();
  }, [fetchVersions]);
  const handlePin = async (v) => {
    if (!await ensureLocalVersion(v.versionId)) return;
    const request = buildVersionPinRequest(
      server,
      token,
      type,
      entityId,
      v.versionId,
      !v.pinned
    );
    const res = await fetch(request.url, request.init);
    if (res.ok) fetchVersions();
  };
  const handleRestore = async (v) => {
    setRestoring(v.versionId);
    try {
      if (!await ensureLocalVersion(v.versionId)) return;
      const request = buildVersionRestoreRequest(
        server,
        token,
        type,
        entityId,
        v.versionId,
        type === "app" ? { restoreMode: "source_only" } : void 0
      );
      const res = await fetch(request.url, request.init);
      if (res.ok) {
        onRestore?.();
        onClose();
      }
    } finally {
      setRestoring(null);
    }
  };
  const handleDelete = async (v) => {
    setDeleting(v.versionId);
    try {
      if (!await ensureLocalVersion(v.versionId)) return;
      const request = buildVersionDeleteRequest(
        server,
        token,
        type,
        entityId,
        v.versionId
      );
      const res = await fetch(request.url, request.init);
      if (res.ok) fetchVersions();
    } finally {
      setDeleting(null);
    }
  };
  const handleLabelSave = async (v) => {
    if (!await ensureLocalVersion(v.versionId)) return;
    const request = buildVersionLabelRequest(
      server,
      token,
      type,
      entityId,
      v.versionId,
      editLabel
    );
    const res = await fetch(request.url, request.init);
    if (res.ok) {
      setEditingId(null);
      fetchVersions();
    }
  };
  const pinned = versions.filter((v) => v.pinned);
  const unpinned = versions.filter((v) => !v.pinned);
  return /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(import_jsx_runtime19.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
      "button",
      {
        type: "button",
        className: "vhp-overlay",
        "aria-label": t2("close", { defaultValue: "Close" }),
        onClick: onClose
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { className: "vhp-panel", children: [
      /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { className: "vhp-header", children: [
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { className: "vhp-header-icon", children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(LuHistory, { size: 15, "aria-hidden": "true" }) }),
        t2("version.history", { defaultValue: "Version History" }),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { className: "vhp-stats", children: [
          /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { className: "vhp-stat-badge", children: t2("version.pinCount", { count: pinned.length, defaultValue: `${pinned.length}/10 pinned` }) }),
          /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { className: "vhp-stat-badge", children: t2("version.totalCount", { count: unpinned.length, defaultValue: `${unpinned.length}/50 auto` }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
          "button",
          {
            type: "button",
            className: "vhp-close",
            onClick: onClose,
            title: t2("close", { defaultValue: "Close" }),
            "aria-label": t2("close", { defaultValue: "Close" }),
            children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(LuX, { size: 15, "aria-hidden": "true" })
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { className: "vhp-body", children: loading ? /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { className: "vhp-loading", children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(LuRefreshCw, { size: 18, className: "vhp-spin", "aria-hidden": "true" }) }) : versions.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { className: "vhp-empty", children: [
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { className: "vhp-empty-icon", children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(LuHistory, { size: 28, "aria-hidden": "true" }) }),
        t2("version.empty", { defaultValue: "No version history yet." })
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(import_jsx_runtime19.Fragment, { children: [
        pinned.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(import_jsx_runtime19.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { className: "vhp-section-label", children: t2("version.pinned", { defaultValue: "Pinned" }) }),
          pinned.map((v) => /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
            VersionItem,
            {
              v,
              editingId,
              editLabel,
              restoring,
              deleting,
              onPin: handlePin,
              onRestore: handleRestore,
              onDelete: handleDelete,
              onEditStart: (id, lbl) => {
                setEditingId(id);
                setEditLabel(lbl || "");
              },
              onEditCancel: () => setEditingId(null),
              onEditSave: handleLabelSave,
              onEditLabelChange: setEditLabel,
              t: t2
            },
            v.versionId
          ))
        ] }),
        unpinned.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(import_jsx_runtime19.Fragment, { children: [
          pinned.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { className: "vhp-section-label", children: t2("version.auto", { defaultValue: "Auto-saved" }) }),
          unpinned.map((v) => /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
            VersionItem,
            {
              v,
              editingId,
              editLabel,
              restoring,
              deleting,
              onPin: handlePin,
              onRestore: handleRestore,
              onDelete: handleDelete,
              onEditStart: (id, lbl) => {
                setEditingId(id);
                setEditLabel(lbl || "");
              },
              onEditCancel: () => setEditingId(null),
              onEditSave: handleLabelSave,
              onEditLabelChange: setEditLabel,
              t: t2
            },
            v.versionId
          ))
        ] })
      ] }) })
    ] })
  ] });
}
function VersionItem({
  v,
  editingId,
  editLabel,
  restoring,
  deleting,
  onPin,
  onRestore,
  onDelete,
  onEditStart,
  onEditCancel,
  onEditSave,
  onEditLabelChange,
  t: t2
}) {
  const isEditing = editingId === v.versionId;
  const defaultLabel = v.label || t2("version.autoSave", { defaultValue: "Auto-save" });
  return /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { className: "vhp-item", children: [
    /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { className: `vhp-item-icon${v.pinned ? " pinned" : ""}`, children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(LuClock, { size: 14, "aria-hidden": "true" }) }),
    /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { className: "vhp-item-main", children: [
      isEditing ? /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { className: "vhp-label-edit", children: [
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
          "input",
          {
            className: "vhp-label-input",
            value: editLabel,
            onChange: (e) => onEditLabelChange(e.target.value),
            autoFocus: true,
            "aria-label": t2("version.editLabel", { defaultValue: "Edit label" }),
            onKeyDown: (e) => {
              if (e.key === "Enter") onEditSave(v);
              if (e.key === "Escape") onEditCancel();
            }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
          "button",
          {
            type: "button",
            className: "vhp-btn",
            onClick: () => onEditSave(v),
            title: t2("save", { defaultValue: "Save" }),
            "aria-label": t2("save", { defaultValue: "Save" }),
            children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(LuCheck, { size: 13, "aria-hidden": "true" })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
          "button",
          {
            type: "button",
            className: "vhp-btn",
            onClick: onEditCancel,
            title: t2("cancel", { defaultValue: "Cancel" }),
            "aria-label": t2("cancel", { defaultValue: "Cancel" }),
            children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(LuX, { size: 13, "aria-hidden": "true" })
          }
        )
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { className: "vhp-item-label", children: defaultLabel }),
      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { className: "vhp-item-time", children: timeAgo(v.createdAt, t2) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { className: "vhp-actions", children: [
      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
        "button",
        {
          type: "button",
          className: `vhp-btn${v.pinned ? " pin-active" : ""}`,
          onClick: () => onPin(v),
          title: v.pinned ? t2("version.unpin", { defaultValue: "Unpin" }) : t2("version.pin", { defaultValue: "Pin" }),
          "aria-label": v.pinned ? t2("version.unpin", { defaultValue: "Unpin" }) : t2("version.pin", { defaultValue: "Pin" }),
          children: v.pinned ? /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(LuPinOff, { size: 13, "aria-hidden": "true" }) : /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(LuPin, { size: 13, "aria-hidden": "true" })
        }
      ),
      !isEditing && /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
        "button",
        {
          type: "button",
          className: "vhp-btn",
          onClick: () => onEditStart(v.versionId, v.label),
          title: t2("version.editLabel", { defaultValue: "Edit label" }),
          "aria-label": t2("version.editLabel", { defaultValue: "Edit label" }),
          children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(LuPencil, { size: 13, "aria-hidden": "true" })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
        "button",
        {
          type: "button",
          className: "vhp-btn restore",
          onClick: () => onRestore(v),
          disabled: restoring === v.versionId,
          title: t2("version.restore", { defaultValue: "Restore" }),
          "aria-label": t2("version.restore", { defaultValue: "Restore" }),
          children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
            LuRefreshCw,
            {
              size: 13,
              className: restoring === v.versionId ? "vhp-spin" : void 0,
              "aria-hidden": "true"
            }
          )
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
        "button",
        {
          type: "button",
          className: "vhp-btn delete",
          onClick: () => onDelete(v),
          disabled: deleting === v.versionId || !!v.pinned,
          title: v.pinned ? t2("version.cannotDeletePinned", { defaultValue: "Unpin first to delete" }) : t2("delete", { defaultValue: "Delete" }),
          "aria-label": v.pinned ? t2("version.cannotDeletePinned", { defaultValue: "Unpin first to delete" }) : t2("delete", { defaultValue: "Delete" }),
          children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(LuTrash2, { size: 13, "aria-hidden": "true" })
        }
      )
    ] })
  ] });
}

// packages/ai/agent/web/AgentForm.tsx
var import_jsx_runtime20 = __toESM(require_jsx_runtime());
var TABS = [
  { id: 0, key: "tabs.basicInfo" },
  { id: 1, key: "tabs.references" },
  { id: 2, key: "tabs.toolSelection" },
  { id: 4, key: "tabs.advancedSettings" }
];
var AgentForm = ({
  mode = "create",
  initialValues = {},
  onClose,
  readOnly = false
}) => {
  const { t: t2 } = useTranslation("ai");
  const isCreate = mode === "create";
  const dispatch = useAppDispatch();
  const server = useAppSelector(selectCurrentServer);
  const token = useToken();
  const [showVersionPanel, setShowVersionPanel] = (0, import_react18.useState)(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = (0, import_react18.useState)(false);
  const [isDeletingAgent, setIsDeletingAgent] = (0, import_react18.useState)(false);
  const navigate = useNavigate();
  const [activeTabState, setActiveTabState] = (0, import_react18.useState)(0);
  const [searchParams] = useSearchParams();
  const [hydratedInitialValues, setHydratedInitialValues] = (0, import_react18.useState)(initialValues);
  const [isHydratingInitialValues, setIsHydratingInitialValues] = (0, import_react18.useState)(false);
  const { agentKey, agentId } = resolveAgentEditIdentity(initialValues);
  const needsHydration = !isCreate && Boolean(agentKey) && (!initialValues?.name || !initialValues?.model || !initialValues?.provider);
  const handleConfirmDeleteAgent = async () => {
    if (!agentKey || isDeletingAgent) return;
    setIsDeletingAgent(true);
    try {
      await dispatch(deleteDbKey(agentKey));
      toast.success(
        t2("deleteMovedToTrash", {
          title: hydratedInitialValues?.name || initialValues?.name || agentKey,
          defaultValue: "\u5DF2\u79FB\u5230\u56DE\u6536\u7AD9"
        })
      );
      setIsDeleteConfirmOpen(false);
      onClose?.();
      navigate(-1);
    } catch (err) {
      console.error("Failed to delete agent:", err);
      toast.error(t2("deleteFailed", "\u5220\u9664\u5931\u8D25"));
    } finally {
      setIsDeletingAgent(false);
    }
  };
  const { form, provider, useServerProxy, isPublic, onSubmit } = useAgentValidation(hydratedInitialValues);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    control,
    formState: { errors, isSubmitting, dirtyFields }
  } = form;
  const setValueRef = (0, import_react18.useRef)(setValue);
  const getValuesRef = (0, import_react18.useRef)(getValues);
  const [apiSource, setApiSource] = (0, import_react18.useState)("platform");
  const skipSourceStep = isCreate && searchParams.get("apiSource") === "cli";
  const [createSourceCommitted, setCreateSourceCommitted] = (0, import_react18.useState)(skipSourceStep);
  const [selectedCreateSource, setSelectedCreateSource] = (0, import_react18.useState)("platform");
  const [committedCreateSource, setCommittedCreateSource] = (0, import_react18.useState)(null);
  const [isQuickCreating, setIsQuickCreating] = (0, import_react18.useState)(false);
  const showSourceStep = isCreate && !createSourceCommitted && !skipSourceStep;
  (0, import_react18.useEffect)(() => {
    setValueRef.current = setValue;
    getValuesRef.current = getValues;
  }, [getValues, setValue]);
  const didSyncRef = (0, import_react18.useRef)(false);
  (0, import_react18.useEffect)(() => {
    if (didSyncRef.current) return;
    didSyncRef.current = true;
    setHydratedInitialValues(initialValues);
  }, []);
  (0, import_react18.useEffect)(() => {
    if (!isCreate) return;
    const source = searchParams.get("apiSource");
    if (source !== "cli") return;
    const cliProvider = searchParams.get("cliProvider") || "copilot";
    const machineId = searchParams.get("machineId") || "";
    const machineName = searchParams.get("machineName") || "";
    const validCliProvider = isCliProvider(cliProvider) ? cliProvider : "copilot";
    setApiSource("cli");
    setCreateSourceCommitted(true);
    setValue("apiSource", "cli");
    setValue("cliProvider", validCliProvider);
    setValue("machineId", machineId);
    setValue("model", "");
    setValue("provider", "");
    if (machineName && !watch("name")) {
      setValue("name", `${machineName} ${validCliProvider}`);
    }
  }, [isCreate, searchParams, setValue, watch]);
  const handleAdvancedEdit2 = (0, import_react18.useCallback)(
    (draft) => {
      if (draft.requiresDesktopOAuth && !draft.oauthConnected) return;
      handleAdvancedEdit({
        draft,
        getValues,
        setValue,
        setApiSource,
        setCommittedCreateSource,
        setCreateSourceCommitted,
        setActiveTabState,
        platformQuickCreateModel: PLATFORM_QUICK_CREATE_MODEL
      });
    },
    [getValues, setValue]
  );
  const handleQuickCreate2 = (0, import_react18.useCallback)(
    async (draft) => {
      await handleQuickCreate({
        draft,
        onSubmit,
        t: t2,
        setIsQuickCreating,
        platformQuickCreateModel: PLATFORM_QUICK_CREATE_MODEL
      });
    },
    [onSubmit, t2]
  );
  const handleChangeCreateSource = (0, import_react18.useCallback)(() => {
    setCreateSourceCommitted(false);
  }, []);
  (0, import_react18.useEffect)(() => {
    if (!needsHydration || !agentKey) {
      setIsHydratingInitialValues(false);
      return;
    }
    let cancelled = false;
    setIsHydratingInitialValues(true);
    void (async () => {
      try {
        const fullAgent = await dispatch(read({ dbKey: agentKey })).unwrap();
        if (cancelled || !fullAgent) return;
        setHydratedInitialValues({
          ...initialValues,
          ...fullAgent,
          dbKey: agentKey
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
  (0, import_react18.useEffect)(() => {
    if (getValuesRef.current("apiSource") !== apiSource) {
      setValueRef.current("apiSource", apiSource);
    }
  }, [apiSource]);
  const { inputPrice, outputPrice, setInputPrice, setOutputPrice } = useModelPricing_default(provider, watch("model"), setValue);
  (0, import_react18.useEffect)(() => {
    if (!isCreate && agentId) {
      const normRefs = normalizeReferences(hydratedInitialValues.references || []);
      reset({
        ...hydratedInitialValues,
        references: normRefs,
        // tags 在 DB 中可能存为 array（如内置 agent），schema 要求 string
        tags: Array.isArray(hydratedInitialValues.tags) ? hydratedInitialValues.tags.join(", ") : hydratedInitialValues.tags || "",
        // 交互模式由模型倒推：保证历史记录与当前模型保持一致
        defaultInteractionMode: isVoiceModel(
          hydratedInitialValues.model,
          hydratedInitialValues.provider
        ) ? "live_audio" : "text"
      });
      const savedApiSource = hydratedInitialValues.apiSource;
      if (savedApiSource === "cli") {
        setApiSource("cli");
      } else {
        const shouldUseCustom = Boolean(hydratedInitialValues.apiKey) || Boolean(hydratedInitialValues.customProviderUrl);
        setApiSource(shouldUseCustom ? "custom" : "platform");
      }
    }
  }, [
    agentId,
    isCreate,
    hydratedInitialValues,
    reset
  ]);
  (0, import_react18.useEffect)(() => {
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
      tags: Array.isArray(hydratedInitialValues.tags) ? hydratedInitialValues.tags.join(", ") : hydratedInitialValues.tags || "",
      // 交互模式由模型倒推
      defaultInteractionMode: isVoiceModel(
        hydratedInitialValues.model,
        hydratedInitialValues.provider
      ) ? "live_audio" : "text"
    });
    setApiSource(hydratedInitialValues.apiSource ?? "platform");
  }, [hydratedInitialValues, isCreate, reset]);
  const buildSubmitPayload2 = (data) => buildSubmitPayload(data, { isCreate, dirtyFields });
  const handleFormSubmit = async (data) => {
    const finalData = buildSubmitPayload2(data);
    await onSubmit(finalData);
    if (!isCreate && agentId) {
      fetch(`${server}/api/version/save`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ type: "agent", entityId: agentId, snapshot: finalData })
      }).catch(() => {
      });
    }
    if (!isCreate && onClose) onClose();
  };
  const handleFormSubmitError = (errors2) => {
    console.error("AgentForm validation failed:", errors2);
    const errorKeys = Object.keys(errors2);
    if (errorKeys.length > 0) {
      const firstErrorKey = errorKeys[0];
      const firstError = errors2[firstErrorKey];
      const message = firstError?.message || "Validation failed";
      toast.error(`\u4FDD\u5B58\u5931\u8D25: ${message}`);
    }
  };
  const allTabs = TABS;
  const tabs = allTabs.flatMap(
    (tab) => readOnly && tab.id !== 0 ? [] : [{ ...tab, label: t2(tab.key) }]
  );
  const activeTab = activeTabState;
  const showVersionHistoryButton = !readOnly && !isCreate && initialValues?.id;
  const showCloseButton = Boolean(onClose);
  const sharedProps = {
    errors,
    register,
    control,
    watch,
    setValue,
    initialValues
  };
  const renderTabById = (id) => {
    switch (id) {
      case 0:
        return /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
          BasicInfoTab_default,
          {
            errors,
            control,
            setValue,
            readOnly
          }
        );
      case 1:
        return /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(ReferencesTab_default, { control, errors, watch });
      case 2:
        return /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(ToolsTab_default, { ...sharedProps });
      case 4:
      default:
        return /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
          AdvancedSettingsTab_default,
          {
            errors,
            control,
            setValue,
            apiSource,
            setApiSource,
            readOnly
          }
        );
    }
  };
  const runModeBannerLabel = committedCreateSource != null ? CREATE_RUN_MODE_LABELS[committedCreateSource] : apiSource === "cli" ? t2("createAgent.runMode.cli", "\u672C\u673A CLI") : apiSource === "custom" ? CREATE_RUN_MODE_LABELS.api : CREATE_RUN_MODE_LABELS.platform;
  return /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(import_jsx_runtime20.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("link", { rel: "stylesheet", href: "/public/route-styles/agent-form.css" }),
    /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(
      "div",
      {
        className: isCreate ? "create-agent-container" : "edit-agent-container",
        children: [
          isCreate && !showSourceStep && /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(FormTitle_default, { children: t2("createAgent.title") }),
          showSourceStep ? /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
            AgentCreateSourceStep_default,
            {
              selected: selectedCreateSource,
              onSelect: setSelectedCreateSource,
              onAdvancedEdit: handleAdvancedEdit2,
              onQuickCreate: handleQuickCreate2,
              isSubmitting: isQuickCreating,
              disabled: isHydratingInitialValues
            }
          ) : /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("form", { onSubmit: handleSubmit(handleFormSubmit, handleFormSubmitError), noValidate: true, children: [
            isCreate && createSourceCommitted && !skipSourceStep && /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { className: "agent-form__run-mode-banner", children: [
              /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("span", { children: [
                t2("createAgent.runMode.heading", "\u8FD0\u884C\u65B9\u5F0F"),
                "\uFF1A",
                /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("strong", { children: runModeBannerLabel })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                "button",
                {
                  type: "button",
                  className: "agent-form__run-mode-banner-change",
                  onClick: handleChangeCreateSource,
                  children: t2("createAgent.runMode.change", "\u66F4\u6362")
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("div", { className: "form-header", children: /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
              TabsNav_default,
              {
                tabs,
                activeTab,
                onChange: (id) => {
                  setActiveTabState(Number(id));
                }
              }
            ) }),
            /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("div", { className: "form-body", children: /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("div", { className: "tab-content", children: /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("div", { className: "tab-panel", children: renderTabById(activeTab) }) }) }),
            /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { className: "form-footer", children: [
              isCreate && !readOnly && /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("p", { className: "agent-form__next-steps", children: "\u521B\u5EFA\u540E\u4F1A\u76F4\u63A5\u8FDB\u5165\u5BF9\u8BDD\u3002\u751F\u6210\u8BC4\u4F30\u7528\u4F8B\u8349\u7A3F\u3001\u67E5\u770B AgentPage \u9AD8\u7EA7\u8BC1\u636E\u90FD\u662F\u53EF\u9009\u4E13\u4E1A\u6B65\u9AA4\uFF1B\u4E0D\u4F1A\u81EA\u52A8\u8DD1 live eval\uFF0C\u4E5F\u4E0D\u4F1A\u81EA\u52A8\u82B1\u94B1\u3002" }),
              /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { className: "footer-actions", children: [
                !isCreate && !readOnly && agentKey && /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                  Button_default,
                  {
                    type: "button",
                    variant: "danger",
                    onClick: () => setIsDeleteConfirmOpen(true),
                    disabled: isSubmitting || isDeletingAgent,
                    size: "small",
                    icon: /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(LuTrash2, {}),
                    "aria-label": t2("agentForm.deleteAgent", "\u5220\u9664\u6B64 Agent"),
                    style: { marginRight: "auto" },
                    children: t2("agentForm.deleteAgent", "\u5220\u9664\u6B64 Agent")
                  }
                ),
                showVersionHistoryButton && /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                  Button_default,
                  {
                    type: "button",
                    variant: "ghost",
                    onClick: () => setShowVersionPanel(true),
                    size: "small",
                    icon: /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(LuHistory, {}),
                    title: t2("version.history", { defaultValue: "Version History" })
                  }
                ),
                showCloseButton && /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                  Button_default,
                  {
                    type: "button",
                    variant: readOnly ? "primary" : "ghost",
                    onClick: onClose,
                    disabled: isSubmitting || isHydratingInitialValues,
                    size: "small",
                    children: readOnly ? t2("close", "\u5173\u95ED") : t2("cancel")
                  }
                ),
                !readOnly && /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
                  Button_default,
                  {
                    type: "submit",
                    variant: "primary",
                    size: "small",
                    loading: isSubmitting || isHydratingInitialValues,
                    disabled: isSubmitting || isHydratingInitialValues,
                    icon: isCreate ? /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(LuPlus, {}) : /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(LuRefreshCw, {}),
                    children: isSubmitting || isHydratingInitialValues ? t2(isCreate ? "creating" : "updating") : t2(isCreate ? "create" : "update")
                  }
                )
              ] })
            ] })
          ] }),
          showVersionPanel && !isCreate && agentId && /* @__PURE__ */ (() => {
            return /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
              VersionHistoryPanel,
              {
                type: "agent",
                entityId: agentId,
                onClose: () => setShowVersionPanel(false)
              }
            );
          })(),
          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
            ConfirmModal,
            {
              isOpen: isDeleteConfirmOpen,
              onClose: () => setIsDeleteConfirmOpen(false),
              onConfirm: handleConfirmDeleteAgent,
              title: t2("agentForm.deleteAgent", "\u5220\u9664\u6B64 Agent"),
              message: t2(
                "agentForm.deleteAgentConfirmation",
                "\u786E\u5B9A\u8981\u5220\u9664\u8FD9\u4E2A Agent \u5417\uFF1F\u5220\u9664\u540E\u4F1A\u79FB\u5230\u56DE\u6536\u7AD9\u3002"
              ),
              type: "error",
              confirmText: t2("delete", "\u5220\u9664"),
              cancelText: t2("cancel", "\u53D6\u6D88"),
              loading: isDeletingAgent
            }
          )
        ]
      }
    )
  ] });
};
var AgentForm_default = AgentForm;

export {
  resolveAgentEditIdentity,
  PagePreviewDialog_default,
  OAuthStatusBox,
  VersionHistoryPanel,
  AgentForm_default
};
