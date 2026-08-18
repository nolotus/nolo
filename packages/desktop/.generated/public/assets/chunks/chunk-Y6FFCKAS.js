import {
  useAppDetail
} from "/public/assets/chunks/chunk-C5WMP2NT.js";
import {
  ChatArea,
  useCurrentDialogConfig
} from "/public/assets/chunks/chunk-KGUJJRDS.js";
import {
  ChatDisplayContext
} from "/public/assets/chunks/chunk-W5JSORLZ.js";
import {
  resolvePreferredAppRuntimeUrl
} from "/public/assets/chunks/chunk-II3ADNT6.js";
import {
  useAppSelectedNode
} from "/public/assets/chunks/chunk-F6NU5WEW.js";
import {
  OBJECT_ASSISTANT_TO_SKILL,
  buildBuiltinObjectAssistantAgent,
  buildObjectAssistantRuntimeOptions,
  buildObjectAssistantSidebarId,
  getObjectAssistantUiConfig,
  getPreferredObjectAssistantKey
} from "/public/assets/chunks/chunk-FCIRSLPG.js";
import {
  buildBuiltinObjectSkillReference,
  ensureBuiltinObjectSkills
} from "/public/assets/chunks/chunk-SSBU25HK.js";
import {
  useDocState
} from "/public/assets/chunks/chunk-VPSYWRNH.js";
import {
  StreamingIndicator_default
} from "/public/assets/chunks/chunk-2IJLPAOU.js";
import {
  useCurrentUser,
  useIsLoggedIn
} from "/public/assets/chunks/chunk-4C6PJRJA.js";
import {
  useNavigate
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  clearDialogState,
  createDialog,
  getPrimaryDialogAgentId,
  initDialog,
  initMsgs,
  readAndWait,
  resetMsgs,
  selectById,
  selectCurrentTable,
  selectTableFocusContext,
  selectTableRows,
  setPrimaryDialogAgent,
  toast,
  useFavoriteAgentIds,
  useFavoritesError,
  useFavoritesInitialized,
  useFavoritesLoading,
  useIsLoadingInitial,
  useMessageSessionError,
  write
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  LuBot
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import {
  readAppServerOrigin
} from "/public/assets/chunks/chunk-TBNFSVJC.js";
import {
  extractCustomId
} from "/public/assets/chunks/chunk-JOOBQBMM.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/chat/dialog/ObjectAssistantPanel.tsx
var import_react2 = __toESM(require_react());

// packages/chat/dialog/PageAssistantPanel.tsx
var import_react = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var EmptyState = (0, import_react.memo)(
  ({ message, actionText, onAction }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "empty-state", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "empty-state__icon", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuBot, { size: 40, "aria-hidden": "true" }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "empty-state__text", children: message }),
    actionText && onAction && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { type: "button", className: "empty-state__btn", onClick: onAction, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuBot, { size: 16, "aria-hidden": "true" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: actionText })
    ] })
  ] })
);
var useFavoriteAgentsLogic = (isLoggedIn, preferredAgentKeys = []) => {
  const { t } = useTranslation();
  const favoriteAgentKeys = useFavoriteAgentIds();
  const loading = useFavoritesLoading();
  const initialized = useFavoritesInitialized();
  const error = useFavoritesError();
  (0, import_react.useEffect)(() => {
    if (isLoggedIn && error) {
      toast.error(t("loadFavoriteError", "\u52A0\u8F7D\u6536\u85CF\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5"));
    }
  }, [isLoggedIn, error, t]);
  const isLoading = isLoggedIn && (!initialized || loading && favoriteAgentKeys.length === 0);
  const agentKeys = import_react.default.useMemo(() => {
    const merged = [];
    const seen = /* @__PURE__ */ new Set();
    for (const key of [...preferredAgentKeys, ...favoriteAgentKeys]) {
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(key);
    }
    return merged;
  }, [favoriteAgentKeys, preferredAgentKeys]);
  const isEmpty = isLoggedIn && initialized && !loading && agentKeys.length === 0;
  return {
    agentKeys,
    favoriteAgentKeys,
    isLoading,
    isEmpty
  };
};
var ArtifactAssistantPanel = (0, import_react.memo)(
  ({
    panelTitle,
    activePanelTitle,
    loginMessage,
    emptyMessage,
    runtimeOptions,
    preferredAgentKeys = [],
    extraReferences
  }) => {
    const { t } = useTranslation(["ai", "chat"]);
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const isLoggedIn = useIsLoggedIn();
    const [selectedAgentKey, setSelectedAgentKey] = (0, import_react.useState)(null);
    const [sideDialogKey, setSideDialogKey] = (0, import_react.useState)(null);
    const [isCreatingDialog, setIsCreatingDialog] = (0, import_react.useState)(false);
    const hasAutoStartedRef = (0, import_react.useRef)(false);
    const dialogId = sideDialogKey ? extractCustomId(sideDialogKey) : null;
    const isLoadingInitial = useIsLoadingInitial(dialogId);
    const messageError = useMessageSessionError(dialogId);
    const currentDialogConfig = useCurrentDialogConfig();
    const { agentKeys, favoriteAgentKeys, isLoading, isEmpty } = useFavoriteAgentsLogic(
      isLoggedIn,
      preferredAgentKeys
    );
    const isChatActive = !!dialogId && !!selectedAgentKey && !!currentDialogConfig && currentDialogConfig.dbKey === sideDialogKey;
    const handleSelectAgent = (0, import_react.useCallback)(
      async (agentKey) => {
        if (!isLoggedIn) {
          toast.error(t("chat:loginToUseAssistants", "\u767B\u5F55\u540E\u624D\u80FD\u4F7F\u7528\u9875\u9762\u52A9\u624B"));
          return;
        }
        dispatch(clearDialogState());
        dispatch(resetMsgs(dialogId ? { dialogId } : void 0));
        setIsCreatingDialog(true);
        try {
          const result = await dispatch(
            createDialog({
              cybots: [agentKey],
              ...extraReferences?.length ? { extraReferences } : {}
            })
          ).unwrap();
          const newDialogKey = result?.dbKey;
          if (!newDialogKey) {
            throw new Error("Missing dialog key from createDialog result");
          }
          setSelectedAgentKey(agentKey);
          setSideDialogKey(newDialogKey);
          isNewlyCreatedRef.current = true;
        } catch (error) {
          console.error("Failed to create side dialog:", error);
          toast.error(
            t("chat:createSideDialogFailed", "\u521B\u5EFA\u5BF9\u8BDD\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5")
          );
          setSelectedAgentKey(null);
          setSideDialogKey(null);
        } finally {
          setIsCreatingDialog(false);
        }
      },
      [dialogId, dispatch, extraReferences, isLoggedIn, t]
    );
    const handleSwitchAgent = (0, import_react.useCallback)(
      async (agentKey) => {
        try {
          await dispatch(setPrimaryDialogAgent(agentKey)).unwrap();
        } catch (error) {
          console.error("Failed to switch side dialog agent:", error);
          toast.error(
            t("chat:switchAssistantFailed", "\u5207\u6362\u52A9\u624B\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5")
          );
        }
      },
      [dispatch, t]
    );
    const isNewlyCreatedRef = (0, import_react.useRef)(false);
    (0, import_react.useEffect)(() => {
      if (hasAutoStartedRef.current || !isLoggedIn || isLoading || isCreatingDialog || selectedAgentKey || sideDialogKey || agentKeys.length === 0) {
        return;
      }
      hasAutoStartedRef.current = true;
      void handleSelectAgent(agentKeys[0]);
    }, [
      agentKeys,
      handleSelectAgent,
      isCreatingDialog,
      isLoading,
      isLoggedIn,
      selectedAgentKey,
      sideDialogKey
    ]);
    (0, import_react.useEffect)(() => {
      if (!sideDialogKey || !dialogId) return;
      const initDialogPromise = dispatch(initDialog(sideDialogKey));
      const initMsgsPromise = dispatch(
        initMsgs({
          dialogId,
          dialogKey: sideDialogKey,
          isNew: isNewlyCreatedRef.current
        })
      );
      isNewlyCreatedRef.current = false;
      return () => {
        initDialogPromise.abort?.();
        initMsgsPromise.abort?.();
      };
    }, [sideDialogKey, dialogId, dispatch]);
    (0, import_react.useEffect)(
      () => () => {
        dispatch(clearDialogState());
        dispatch(resetMsgs(dialogId ? { dialogId } : void 0));
      },
      [dialogId, dispatch]
    );
    const goExplore = () => navigate("/explore");
    const goLogin = () => navigate("/login");
    const isShowingChat = !!selectedAgentKey && !!sideDialogKey;
    const activeAgentKey = getPrimaryDialogAgentId(currentDialogConfig) ?? selectedAgentKey;
    let body;
    if (!isLoggedIn) {
      body = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        EmptyState,
        {
          message: t(
            "chat:loginToUseAssistants",
            loginMessage ?? "\u767B\u5F55\u540E\u53EF\u5728\u4FA7\u8FB9\u680F\u4F7F\u7528\u4F60\u7684\u5E38\u7528 AI \u52A9\u624B"
          ),
          actionText: t("chat:goLogin", "\u53BB\u767B\u5F55"),
          onAction: goLogin
        }
      );
    } else if (!isShowingChat) {
      if (isEmpty) {
        body = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          EmptyState,
          {
            message: t(
              "chat:noFavoriteAgents",
              emptyMessage ?? "\u8FD8\u6CA1\u6709\u6536\u85CF\u4EFB\u4F55 AI \u52A9\u624B\uFF0C\u5148\u53BB\u901B\u901B\u5427"
            ),
            actionText: t("chat:goExplore", "\u53BB AI \u5E7F\u573A\u901B\u901B"),
            onAction: goExplore
          }
        );
      } else {
        body = /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "page-assistant-panel__loading", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StreamingIndicator_default, {}) });
      }
    } else {
      if (isCreatingDialog || isLoadingInitial || !isChatActive) {
        body = /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "page-assistant-panel__loading", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StreamingIndicator_default, {}) });
      } else if (messageError) {
        body = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          EmptyState,
          {
            message: t(
              "chat:loadSideDialogError",
              "\u52A0\u8F7D\u5BF9\u8BDD\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5"
            )
          }
        );
      } else if (!dialogId) {
        body = null;
      } else {
        body = /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "page-assistant-panel__chat", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatDisplayContext.Provider, { value: { compactDeployCards: true }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          ChatArea,
          {
            dialogId,
            scrollContainerSelector: ".page-assistant-panel__chat-messages",
            runtimeOptions,
            messagesClassName: "page-assistant-panel__chat-messages",
            agentPicker: {
              candidates: agentKeys.map((key) => ({
                key,
                isFavorite: favoriteAgentKeys.includes(key),
                // preferredAgentKeys 是侧栏传入的偏好/技能 agent，
                // 不等于"用户自己创建"，不标 isOwned 以免 👤 badge 语义错。
                isOwned: false,
                isPublic: !preferredAgentKeys.includes(key)
              })),
              activeAgentKey,
              onSelect: handleSwitchAgent
            }
          }
        ) }) });
      }
    }
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", { className: "page-assistant-panel", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", { className: "page-assistant-panel__header", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "page-assistant-panel__title", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "page-assistant-panel__title-icon", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuBot, { size: 14, "aria-hidden": "true" }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: isShowingChat ? activePanelTitle ?? t("chat:pageAssistant", "\u9875\u9762\u52A9\u624B") : panelTitle ?? t("chat:favoriteAssistants", "\u5E38\u7528\u52A9\u624B") })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "page-assistant-panel__body", children: body })
    ] });
  }
);
var PageAssistantPanelBase = () => {
  const currentTable = useAppSelector(selectCurrentTable);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ObjectAssistantPanel_default, { kind: currentTable ? "table" : "page", contentKey: currentTable?.dbKey });
};
var PageAssistantPanel = (0, import_react.memo)(PageAssistantPanelBase);

// packages/chat/dialog/ObjectAssistantPanel.tsx
var import_jsx_runtime2 = __toESM(require_jsx_runtime());
var ObjectAssistantShell = ({
  message,
  loading = false
}) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("aside", { className: "page-assistant-panel", children: [
  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("header", { className: "page-assistant-panel__header", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "page-assistant-panel__title", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "page-assistant-panel__title-icon", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LuBot, { size: 14, "aria-hidden": "true" }) }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: message })
  ] }) }),
  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "page-assistant-panel__body", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "page-assistant-panel__loading", children: loading ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(StreamingIndicator_default, {}) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: message }) }) })
] });
var ObjectAssistantPanelBase = ({
  kind,
  contentKey
}) => {
  const { t } = useTranslation(["chat"]);
  const dispatch = useAppDispatch();
  const currentUser = useCurrentUser();
  const doc = useDocState();
  const docTitle = doc.title;
  const docFocusContext = doc.focusContext;
  const table = useAppSelector(selectCurrentTable);
  const appSelectedNode = useAppSelectedNode();
  const tableFocusContext = useAppSelector(selectTableFocusContext);
  const tableRows = useAppSelector(selectTableRows);
  const entity = useAppSelector(
    (state) => contentKey ? selectById(state, contentKey) : null
  );
  const routeServerOrigin = typeof window !== "undefined" ? readAppServerOrigin(window.location.search) : void 0;
  const { app, loading: appLoading, error: appError } = useAppDetail(
    kind === "app" ? contentKey : void 0,
    {
      prepareEdit: kind === "app",
      serverOrigin: kind === "app" && typeof entity?.serverOrigin === "string" ? entity.serverOrigin : routeServerOrigin
    }
  );
  const [preferredAgentKeys, setPreferredAgentKeys] = (0, import_react2.useState)(
    kind === "app" ? getPreferredObjectAssistantKey(kind, currentUser?.userId) : []
  );
  const [isPreparingPreferredAgent, setIsPreparingPreferredAgent] = (0, import_react2.useState)(false);
  const ui = getObjectAssistantUiConfig(kind);
  const skillExtraReferences = (0, import_react2.useMemo)(() => {
    if (!currentUser?.userId || kind === "app") return void 0;
    return [buildBuiltinObjectSkillReference(OBJECT_ASSISTANT_TO_SKILL[kind], currentUser.userId)];
  }, [kind, currentUser?.userId]);
  (0, import_react2.useEffect)(() => {
    if (kind === "app") {
      setPreferredAgentKeys(getPreferredObjectAssistantKey(kind, currentUser?.userId));
      setIsPreparingPreferredAgent(false);
      return;
    }
    if (!currentUser?.userId) {
      setPreferredAgentKeys([]);
      setIsPreparingPreferredAgent(false);
      return;
    }
    const agent = buildBuiltinObjectAssistantAgent(kind, currentUser.userId);
    let cancelled = false;
    setIsPreparingPreferredAgent(true);
    void Promise.resolve(dispatch(ensureBuiltinObjectSkills(currentUser.userId))).catch(
      (error) => console.error("Failed to ensure builtin object skills:", error)
    );
    void (async () => {
      try {
        const existing = await dispatch(readAndWait(agent.dbKey)).unwrap().catch(() => null);
        if (!existing) {
          await dispatch(write({ data: agent, customKey: agent.dbKey })).unwrap();
        }
        if (!cancelled) {
          setPreferredAgentKeys([agent.dbKey]);
        }
      } catch (error) {
        console.error("Failed to prepare object assistant agent:", error);
        if (!cancelled) {
          setPreferredAgentKeys([]);
        }
      } finally {
        if (!cancelled) {
          setIsPreparingPreferredAgent(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.userId, dispatch, kind]);
  const runtimeOptions = (0, import_react2.useMemo)(() => {
    if (kind === "app") {
      if (!app) return void 0;
      return buildObjectAssistantRuntimeOptions({
        kind,
        contentKey: app.appId,
        title: app.userFriendlyName,
        summary: "\u5F53\u524D\u5E94\u7528\u53EF\u901A\u8FC7 AI \u7EE7\u7EED\u4FEE\u6539\u4E0E\u91CD\u65B0\u90E8\u7F72\u3002\u8BF7\u56F4\u7ED5\u5DF2\u6709\u5B9E\u73B0\u505A\u589E\u91CF\u8FED\u4EE3\uFF0C\u800C\u4E0D\u662F\u91CD\u5EFA\u4E00\u4E2A\u65B0\u5E94\u7528\u3002",
        metadata: {
          framework: app.framework ?? "worker",
          appUrl: resolvePreferredAppRuntimeUrl({
            appId: app.appId,
            customUrl: app.customUrl,
            url: app.url
          }),
          fileNames: Array.isArray(app.files) ? app.files.map((file) => file.name) : [],
          externalImports: Array.isArray(app.externalImports) ? app.externalImports : [],
          ...appSelectedNode ? { selectedNode: appSelectedNode } : {}
        }
      });
    }
    if (kind === "page") {
      return buildObjectAssistantRuntimeOptions({
        kind,
        contentKey: contentKey ?? doc?.pageKey ?? void 0,
        title: docTitle ?? entity?.title ?? "\u672A\u547D\u540D\u6587\u6863",
        metadata: {
          pageKey: contentKey ?? doc?.pageKey ?? void 0,
          docType: doc?.type ?? entity?.type ?? "page",
          hasSlateData: Array.isArray(doc?.slateData),
          tags: Array.isArray(doc?.tags) ? doc.tags : [],
          focusContext: docFocusContext
        }
      });
    }
    if (kind === "table") {
      return buildObjectAssistantRuntimeOptions({
        kind,
        contentKey: contentKey ?? table?.dbKey ?? void 0,
        title: table?.displayName ?? table?.tableId ?? entity?.title ?? "\u672A\u547D\u540D\u8868\u683C",
        metadata: {
          tenantId: table?.tenantId,
          tableId: table?.tableId,
          rowCount: Array.isArray(tableRows) ? tableRows.length : 0,
          columnNames: Array.isArray(table?.columns) ? table.columns.map((column) => column.name) : [],
          focusContext: tableFocusContext
        }
      });
    }
    if (kind === "image") {
      return buildObjectAssistantRuntimeOptions({
        kind,
        contentKey,
        title: entity?.title ?? "\u5F53\u524D\u56FE\u7247",
        metadata: {
          fileId: entity?.fileId ?? contentKey,
          type: entity?.type ?? "image",
          url: entity?.url
        }
      });
    }
    if (kind === "file") {
      return buildObjectAssistantRuntimeOptions({
        kind,
        contentKey,
        title: entity?.title ?? "\u5F53\u524D\u6587\u4EF6",
        metadata: {
          fileId: entity?.fileId ?? contentKey,
          type: entity?.type ?? "file",
          url: entity?.url,
          size: entity?.size
        }
      });
    }
    return void 0;
  }, [
    app,
    contentKey,
    doc,
    docFocusContext,
    docTitle,
    entity,
    kind,
    table,
    tableFocusContext,
    tableRows,
    appSelectedNode
  ]);
  if (kind === "app" && appLoading) {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      ObjectAssistantShell,
      {
        message: t("chat:appAssistantLoading", "\u6B63\u5728\u52A0\u8F7D\u5E94\u7528\u4E0A\u4E0B\u6587\u2026"),
        loading: true
      }
    );
  }
  if (kind === "app" && (appError || !app || !runtimeOptions)) {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      ObjectAssistantShell,
      {
        message: appError || t("chat:appAssistantLoadFailed", "\u52A0\u8F7D\u5E94\u7528\u4E0A\u4E0B\u6587\u5931\u8D25")
      }
    );
  }
  if (kind === "app" && app?.editSafety === "rebuild-risk") {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      ObjectAssistantShell,
      {
        message: t(
          "chat:appAssistantNeedsRecovery",
          "\u8FD9\u7248\u5E94\u7528\u76EE\u524D\u8FD8\u4E0D\u9002\u5408\u76F4\u63A5\u505A\u5C0F\u8303\u56F4\u4FEE\u6539\u3002\u6211\u53EF\u4EE5\u5148\u6309\u5F53\u524D\u9875\u9762\u6574\u7406\u6210\u53EF\u7EE7\u7EED\u7F16\u8F91\u7684\u7248\u672C\uFF0C\u518D\u7EE7\u7EED\u5E2E\u4F60\u6539\u3002"
        )
      }
    );
  }
  if (kind !== "app" && isPreparingPreferredAgent && preferredAgentKeys.length === 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      ObjectAssistantShell,
      {
        message: t(`chat:${kind}AssistantPreparing`, `\u6B63\u5728\u51C6\u5907${ui.panelTitle}\u2026`),
        loading: true
      }
    );
  }
  const effectiveContentKey = kind === "page" ? contentKey ?? doc?.pageKey ?? "current" : kind === "table" ? contentKey ?? table?.dbKey ?? "current" : contentKey ?? "current";
  return (
    // key 按内容维度隔离：切到另一篇文档/另一张表/另一个应用时强制重挂载，
    // 否则 React 复用组件实例，面板会继续显示上一个内容的侧栏对话。
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      ArtifactAssistantPanel,
      {
        panelTitle: t(`chat:${kind}AssistantPanelTitle`, ui.panelTitle),
        activePanelTitle: t(`chat:${kind}AssistantTitle`, ui.activePanelTitle),
        emptyMessage: t(`chat:${kind}AssistantEmpty`, ui.emptyMessage),
        loginMessage: t(`chat:${kind}AssistantLogin`, ui.loginMessage),
        preferredAgentKeys,
        extraReferences: skillExtraReferences,
        runtimeOptions
      },
      effectiveContentKey
    )
  );
};
var ObjectAssistantPanel = (0, import_react2.memo)(ObjectAssistantPanelBase);
var ObjectAssistantPanel_default = ObjectAssistantPanel;

// packages/chat/dialog/objectAssistantSidebar.tsx
var import_jsx_runtime3 = __toESM(require_jsx_runtime());
var openObjectAssistantSidebar = (open, {
  kind,
  contentKey,
  sidebarId,
  width = 360,
  closeOnRouteChange = true
}) => {
  open(/* @__PURE__ */ (0, import_jsx_runtime3.jsx)(ObjectAssistantPanel_default, { kind, contentKey }), {
    width,
    closeOnRouteChange,
    id: sidebarId ?? buildObjectAssistantSidebarId(kind, contentKey)
  });
};

export {
  openObjectAssistantSidebar
};
