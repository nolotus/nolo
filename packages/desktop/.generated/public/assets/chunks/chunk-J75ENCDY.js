import {
  QuickChatModeSelector_default,
  resolveQuickChatLaunchSpecialist,
  resolveQuickChatPlaceholderMeta,
  useQuickChatMode
} from "/public/assets/chunks/chunk-6SCCZZZJ.js";
import {
  shouldDeferEnterForIme
} from "/public/assets/chunks/chunk-JUT5AJQ2.js";
import {
  $b8dcdc58eeae0d40$export$2c73285ae9390cec,
  $bd263d78e9bf3c56$export$f5c9f3c2c4054eec
} from "/public/assets/chunks/chunk-DIU2H7DW.js";
import {
  QUICK_CHAT_COMPOSER_VT_NAME,
  useNavigate,
  viewTransitionStyle
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  SYSTEM_DEFAULT_AGENT_ID,
  noloAgentId,
  read,
  selectDefaultAgentId,
  selectDefaultAgentPreference,
  toast
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  asTrimmedString
} from "/public/assets/chunks/chunk-PN3BZAFX.js";
import {
  LuArrowUp,
  LuBot,
  LuLayoutGrid,
  LuMessageCircle,
  LuMic,
  LuPaperclip
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import {
  BUILTIN_AGENT_CREATOR_AGENT_KEY,
  BUILTIN_APP_BUILDER_AGENT_KEY
} from "/public/assets/chunks/chunk-TBNFSVJC.js";
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

// packages/app/pages/QuickChat.tsx
var import_react = __toESM(require_react());
var import_jsx_runtime = __toESM(require_jsx_runtime());
var quickChatRuntimeImport = () => import("/public/assets/chunks/QuickChatRuntime-C62QOI3R.js");
var QuickChatRuntime = (0, import_react.lazy)(quickChatRuntimeImport);
var QUICK_CHAT_IDLE_PRELOAD_TIMEOUT_MS = 500;
var QUICK_CHAT_FALLBACK_PRELOAD_DELAY_MS = 250;
var QUICK_CHAT_PERF_PREFIX = "[QuickChatPerf]";
var quickChatPreloadPromise = null;
var quickChatPreloadScheduled = false;
var quickChatPreloadSettled = false;
var quickChatRuntimeReadyCallbacks = /* @__PURE__ */ new Set();
var logQuickChatPreloadStage = (stage, details = {}) => {
  if (typeof window === "undefined") return;
  console.info(QUICK_CHAT_PERF_PREFIX, {
    stage,
    atMs: performance.now(),
    ...details
  });
};
var preloadQuickChatRuntimeDependencies = () => {
  if (!quickChatPreloadPromise) {
    logQuickChatPreloadStage("quick-chat-preload-started");
    quickChatPreloadPromise = Promise.allSettled([
      quickChatRuntimeImport(),
      import("/public/assets/chunks/PageLoader-KX7EDTU5.js"),
      import("/public/assets/chunks/createDialogAction-VUWJATZ5.js"),
      import("/public/assets/chunks/handleSendMessageAction-YNKWEF2B.js"),
      import("/public/assets/chunks/streamAgentChatTurn-SQ6QMWEX.js")
    ]);
    void quickChatPreloadPromise.then((results) => {
      quickChatPreloadSettled = true;
      logQuickChatPreloadStage("quick-chat-preload-settled", {
        rejectedCount: results.filter((result) => result.status === "rejected").length
      });
      for (const callback of quickChatRuntimeReadyCallbacks) {
        callback();
      }
      quickChatRuntimeReadyCallbacks.clear();
    });
  }
  return quickChatPreloadPromise;
};
var onQuickChatRuntimeReady = (callback) => {
  if (quickChatPreloadSettled) {
    callback();
    return () => {
    };
  }
  quickChatRuntimeReadyCallbacks.add(callback);
  return () => {
    quickChatRuntimeReadyCallbacks.delete(callback);
  };
};
var scheduleQuickChatRuntimeDependencyPreload = (trigger) => {
  if (quickChatPreloadScheduled || typeof window === "undefined") {
    return () => {
    };
  }
  quickChatPreloadScheduled = true;
  logQuickChatPreloadStage("quick-chat-preload-scheduled", {
    trigger,
    idleTimeoutMs: QUICK_CHAT_IDLE_PRELOAD_TIMEOUT_MS,
    fallbackDelayMs: QUICK_CHAT_FALLBACK_PRELOAD_DELAY_MS
  });
  const preload = () => {
    void preloadQuickChatRuntimeDependencies();
  };
  const idleWindow = window;
  if (typeof idleWindow.requestIdleCallback === "function") {
    const idleId = idleWindow.requestIdleCallback(preload, {
      timeout: QUICK_CHAT_IDLE_PRELOAD_TIMEOUT_MS
    });
    return () => {
      idleWindow.cancelIdleCallback?.(idleId);
    };
  }
  const timeoutId = window.setTimeout(
    preload,
    QUICK_CHAT_FALLBACK_PRELOAD_DELAY_MS
  );
  return () => {
    window.clearTimeout(timeoutId);
  };
};
scheduleQuickChatRuntimeDependencyPreload("module");
var QuickChat = ({
  surface = "default",
  isEmptyState = false,
  spaceId,
  launch = null
}) => {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const defaultAgentId = useAppSelector(selectDefaultAgentId);
  const defaultAgentPreference = useAppSelector(selectDefaultAgentPreference);
  const allDbEntities = useAppSelector((state) => state.db?.entities ?? {});
  const [isRuntimeActive, setRuntimeActive] = (0, import_react.useState)(false);
  const [draft, setDraft] = (0, import_react.useState)("");
  const [autoSend, setAutoSend] = (0, import_react.useState)(false);
  const [initialAgentId, setInitialAgentId] = (0, import_react.useState)(null);
  const [quickChatMode, handleModeChange] = useQuickChatMode();
  const isCompact = surface === "space-home-compact";
  const startPersonalization = (0, import_react.useCallback)(async () => {
    try {
      const { startPersonalizationDialog } = await import("/public/assets/chunks/personalizationDialog-4X4D6WEP.js");
      await startPersonalizationDialog({
        dispatch,
        navigate,
        language: i18n.language,
        source: "home"
      });
    } catch (error) {
      console.error("Failed to start personalization dialog:", error);
      toast.error(t("homeActions.personalizationFailed", "\u542F\u52A8\u4E2A\u6027\u5316\u8BBE\u7F6E\u5931\u8D25"));
    }
  }, [dispatch, i18n.language, navigate, t]);
  const handleChipClick = (0, import_react.useCallback)(
    (chip) => {
      if (chip.action === "personalization") {
        void startPersonalization();
        return;
      }
      if (chip.action === "specialist") {
        setDraft(chip.prompt);
        setInitialAgentId(chip.agentKey);
        setAutoSend(true);
        void preloadQuickChatRuntimeDependencies();
        setRuntimeActive(true);
        return;
      }
      setDraft(chip.prompt);
      setInitialAgentId(null);
      setAutoSend(true);
      void preloadQuickChatRuntimeDependencies();
      setRuntimeActive(true);
    },
    [startPersonalization]
  );
  const launchSpecialist = (0, import_react.useMemo)(
    () => resolveQuickChatLaunchSpecialist(launch),
    [launch]
  );
  const hasLaunchedRef = (0, import_react.useRef)(false);
  (0, import_react.useEffect)(() => {
    if (!launchSpecialist || hasLaunchedRef.current) return;
    hasLaunchedRef.current = true;
    handleChipClick({
      action: "specialist",
      agentKey: launchSpecialist.agentKey,
      prompt: t(launchSpecialist.promptKey, launchSpecialist.promptFallback)
    });
  }, [handleChipClick, launchSpecialist, t]);
  (0, import_react.useEffect)(() => {
    if (isRuntimeActive) return;
    const cancelPreload = scheduleQuickChatRuntimeDependencyPreload("effect");
    const cancelRuntimeReady = onQuickChatRuntimeReady(() => {
      setRuntimeActive(true);
    });
    return () => {
      cancelPreload();
      cancelRuntimeReady();
    };
  }, [isRuntimeActive]);
  (0, import_react.useEffect)(() => {
    if (!defaultAgentId) return;
    logQuickChatPreloadStage("quick-chat-agent-prewarm-started", {
      defaultAgentId
    });
    void Promise.resolve(dispatch(read({ dbKey: defaultAgentId }))).then(() => {
      logQuickChatPreloadStage("quick-chat-agent-prewarm-settled", {
        defaultAgentId
      });
    }).catch((error) => {
      logQuickChatPreloadStage("quick-chat-agent-prewarm-failed", {
        defaultAgentId,
        error: toErrorMessage(error)
      });
    });
  }, [defaultAgentId, dispatch]);
  const activateRuntime = (0, import_react.useCallback)(() => {
    void preloadQuickChatRuntimeDependencies();
    setRuntimeActive(true);
  }, []);
  const handleShellChange = (0, import_react.useCallback)((event) => {
    void preloadQuickChatRuntimeDependencies();
    setDraft(event.target.value);
    setRuntimeActive(true);
  }, []);
  const handleShellKeyDown = (0, import_react.useCallback)(
    (event) => {
      if (event.key === "Enter" && !event.shiftKey && !shouldDeferEnterForIme({
        event,
        isComposing: false,
        lastCompositionEndAt: 0
      })) {
        event.preventDefault();
        if (!isRuntimeActive) {
          setAutoSend(true);
          setRuntimeActive(true);
        }
      }
    },
    [isRuntimeActive]
  );
  const resolveAgentDisplayName = (0, import_react.useCallback)(
    (agentId) => {
      if (agentId === SYSTEM_DEFAULT_AGENT_ID || agentId === noloAgentId) {
        return t("quickChat.defaultAgentName", "nolo");
      }
      const entity = allDbEntities[agentId];
      const candidate = asTrimmedString(entity?.name);
      return candidate || t("quickChat.defaultAgentName", "nolo");
    },
    [allDbEntities, t]
  );
  const agentName = (() => {
    if (!defaultAgentPreference || defaultAgentPreference === SYSTEM_DEFAULT_AGENT_ID || defaultAgentId === noloAgentId) {
      return t("quickChat.defaultAgentName", "nolo");
    }
    return resolveAgentDisplayName(defaultAgentPreference);
  })();
  const placeholderMeta = resolveQuickChatPlaceholderMeta(
    quickChatMode.mode,
    isEmptyState
  );
  const placeholder = t(placeholderMeta.key, placeholderMeta.defaultValue);
  const isSendDisabled = (0, import_react.useMemo)(() => !draft.trim(), [draft]);
  const wrapperClassName = [
    "quick-chat-wrapper",
    isEmptyState ? "is-empty-state" : "",
    isCompact ? "is-compact" : ""
  ].filter(Boolean).join(" ");
  const showGreeting = !isCompact && surface !== "home-primary";
  if (isRuntimeActive) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: wrapperClassName, "data-surface": surface, children: [
      showGreeting && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "quick-chat-greeting", children: t("quickChat.greeting", "\u4ECA\u5929\u4E00\u8D77\u505A\u4EC0\u4E48\uFF1F") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, { fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        QuickChatShell,
        {
          draft,
          placeholder,
          disabled: true,
          isEmptyState,
          surface,
          quickChatMode,
          onModeChange: handleModeChange
        }
      ), children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        QuickChatRuntime,
        {
          initialText: draft,
          initialAgentId,
          surface,
          spaceId,
          autoSend,
          isEmptyState,
          onPersonalizationClick: isCompact ? void 0 : startPersonalization,
          quickChatMode,
          onModeChange: handleModeChange
        }
      ) }),
      !isCompact && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuickChatChips, { onChipClick: handleChipClick })
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: wrapperClassName, "data-surface": surface, children: [
    showGreeting && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "quick-chat-greeting", children: t("quickChat.greeting", "\u4ECA\u5929\u4E00\u8D77\u505A\u4EC0\u4E48\uFF1F") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      QuickChatShell,
      {
        draft,
        placeholder,
        disabled: isSendDisabled,
        surface,
        isEmptyState,
        onActivate: activateRuntime,
        onChange: handleShellChange,
        onKeyDown: handleShellKeyDown,
        quickChatMode,
        onModeChange: handleModeChange
      }
    ),
    !isCompact && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuickChatChips, { onChipClick: handleChipClick })
  ] });
};
var QuickChatShell = ({
  draft,
  placeholder,
  disabled = true,
  surface = "default",
  isEmptyState = false,
  onActivate,
  onChange,
  onKeyDown,
  quickChatMode,
  onModeChange
}) => {
  const vtStyle = viewTransitionStyle(QUICK_CHAT_COMPOSER_VT_NAME, {
    enabled: surface === "home-primary"
  });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "quick-chat-container", "data-surface": surface, "data-testid": "quick-chat-shell", style: vtStyle, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "quick-chat-box chat-input-card", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)($b8dcdc58eeae0d40$export$2c73285ae9390cec, { className: "message-input__textarea-wrap", "aria-label": placeholder || "Quick chat", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      $bd263d78e9bf3c56$export$f5c9f3c2c4054eec,
      {
        className: "message-input__textarea",
        "data-testid": "quick-chat-input",
        placeholder,
        value: draft,
        rows: 1,
        readOnly: !onChange,
        onFocus: onActivate,
        onChange,
        onKeyDown
      }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "message-input__controls", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "message-input__controls-left", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: "upload-button",
            onFocus: onActivate,
            onClick: onActivate,
            "aria-label": "Upload",
            children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuPaperclip, { size: 18, "aria-hidden": "true" })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuickChatModeSelector_default, { mode: quickChatMode, onModeChange, surface })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "message-input__controls-right", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          className: `send-button ${disabled ? "voice-mode" : "send-mode"}`,
          "data-testid": "quick-chat-send",
          "aria-disabled": disabled,
          onFocus: onActivate,
          onClick: onActivate,
          "aria-label": "Send",
          children: disabled ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuMic, { size: 18, "aria-hidden": "true" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            LuArrowUp,
            {
              size: 20,
              strokeWidth: 1.75,
              className: "send-icon",
              "aria-hidden": "true"
            }
          )
        }
      ) })
    ] })
  ] }) });
};
var QuickChatChips = ({ onChipClick }) => {
  const { t } = useTranslation();
  const chips = (0, import_react.useMemo)(
    () => [
      {
        key: "brainstorm",
        label: t("quickChat.chipBrainstorm", "\u5934\u8111\u98CE\u66B4"),
        icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuMessageCircle, { size: 16, "aria-hidden": "true" }),
        action: { action: "prompt", prompt: t("quickChat.chipBrainstormPrompt", "\u5E2E\u6211\u505A\u4E00\u6B21\u5934\u8111\u98CE\u66B4") }
      },
      {
        key: "createAgent",
        label: t("quickChat.chipCreateAgent", "\u521B\u5EFAagent"),
        icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuBot, { size: 16, "aria-hidden": "true" }),
        action: {
          action: "specialist",
          agentKey: BUILTIN_AGENT_CREATOR_AGENT_KEY,
          prompt: t("quickChat.chipCreateAgentPrompt", "\u5E2E\u6211\u521B\u5EFA\u4E00\u4E2AAgent")
        }
      },
      {
        key: "createApp",
        label: t("quickChat.chipCreateApp", "\u521B\u5EFA\u5E94\u7528"),
        icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuLayoutGrid, { size: 16, "aria-hidden": "true" }),
        action: {
          action: "specialist",
          agentKey: BUILTIN_APP_BUILDER_AGENT_KEY,
          prompt: t("quickChat.chipCreateAppPrompt", "\u5E2E\u6211\u521B\u5EFA\u4E00\u4E2A\u5E94\u7528")
        }
      }
    ],
    [t]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "quick-chat-chips", children: chips.map((chip) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "button",
    {
      type: "button",
      className: "quick-chat-chip",
      onClick: () => onChipClick(chip.action),
      children: [
        chip.icon,
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: chip.label })
      ]
    },
    chip.key
  )) });
};
var QuickChat_default = QuickChat;

export {
  QuickChat_default
};
